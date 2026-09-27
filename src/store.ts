import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Etiqueta, Meta, Prioridade, Status, Subtarefa } from './types';
import type { Tabela } from './lib/mapeamento';
import { ETIQUETAS_SEED, PRIORIDADES_SEED, metasDemo, metasSeed } from './data/seed';
import { hojeISO } from './lib/dates';

export type Vista = 'hoje' | 'agenda' | 'metas' | 'revisao' | 'foco' | 'progresso' | 'ajustes';

export interface Lapide {
  tabela: Tabela;
  id: string;
  em: string; // ISO
}

export interface Sujos {
  metas: string[];
  etiquetas: string[];
  prioridades: string[];
  config: boolean;
}

/**
 * O que um push acabou de enviar: para cada id, o `atualizadoEm` que foi ao
 * servidor. Guardamos o carimbo (e não só o id) porque o usuário pode editar o
 * mesmo item durante o envio — nesse caso o item precisa continuar pendente.
 */
export interface Enviados {
  metas?: [string, string | undefined][];
  etiquetas?: [string, string | undefined][];
  prioridades?: [string, string | undefined][];
  config?: string;
}

export interface DadosExportados {
  versao: number;
  exportadoEm: string;
  metas: Meta[];
  etiquetas: Etiqueta[];
  prioridades: Prioridade[];
  limiteFoco: number;
}

interface Estado {
  // ── dados ──
  metas: Meta[];
  etiquetas: Etiqueta[];
  prioridades: Prioridade[];
  limiteFoco: number;
  configAtualizadaEm: string;

  // ── controle de sincronização (persistido junto: é a fila offline) ──
  usuarioId: string | null;
  sujos: Sujos;
  lapides: Lapide[];
  cursorPull: string | null;
  semeado: boolean;

  // ── ações de metas ──
  adicionarMeta: (m: Omit<Meta, 'id' | 'criadaEm' | 'historico' | 'atualizadoEm'>) => void;
  atualizarMeta: (id: string, patch: Partial<Meta>) => void;
  removerMeta: (id: string) => void;
  definirStatus: (id: string, status: Status) => void;
  alternarCumprido: (id: string, data?: string) => void;
  definirProgresso: (id: string, progresso: number) => void;
  agendarPara: (id: string, dataISO: string | undefined) => void;

  // ── subtarefas ──
  adicionarSubtarefa: (metaId: string, titulo: string) => void;
  alternarSubtarefa: (metaId: string, subId: string) => void;
  atualizarSubtarefa: (metaId: string, subId: string, titulo: string) => void;
  removerSubtarefa: (metaId: string, subId: string) => void;

  // ── etiquetas ──
  adicionarEtiqueta: (nome: string, cor: string) => void;
  atualizarEtiqueta: (id: string, patch: Partial<Etiqueta>) => void;
  removerEtiqueta: (id: string) => void;

  // ── prioridades ──
  atualizarPrioridade: (id: string, patch: Partial<Prioridade>) => void;
  moverPrioridade: (id: string, direcao: -1 | 1) => void;

  // ── config / dados ──
  definirLimiteFoco: (n: number) => void;
  importarDados: (dados: Partial<DadosExportados>) => void;
  exportarDados: () => DadosExportados;
  resetar: () => void;
  semear: () => void;

  // ── usadas pela camada de sincronização ──
  aplicarRemoto: (dados: {
    metas?: Meta[];
    etiquetas?: Etiqueta[];
    prioridades?: Prioridade[];
    limiteFoco?: number;
    configAtualizadaEm?: string;
    removidos?: { tabela: Tabela; id: string }[];
  }) => void;
  limparSujos: (enviados: Enviados, lapidesEnviadas: Lapide[]) => void;
  definirCursorPull: (cursor: string) => void;
  marcarSemeado: (v: boolean) => void;
  substituirTudo: (dados: Partial<DadosExportados>, marcarTudoSujo: boolean) => void;
}

export const gerarId = () => Math.random().toString(36).slice(2, 10);
const agora = () => new Date().toISOString();

const SUJOS_VAZIOS: Sujos = { metas: [], etiquetas: [], prioridades: [], config: false };

function comSujo(sujos: Sujos, tabela: Tabela, ...ids: string[]): Sujos {
  const set = new Set(sujos[tabela]);
  for (const id of ids) set.add(id);
  return { ...sujos, [tabela]: [...set] };
}

/**
 * Estado de um aparelho novo: vazio.
 *
 * As metas iniciais NÃO são plantadas aqui. Antes da nuvem isso fazia sentido;
 * agora duplicaria tudo a cada navegador novo. O seed roda uma vez por conta,
 * via `semear()`, quando o servidor diz que a conta nunca foi inicializada.
 */
function estadoVazio() {
  return {
    metas: [] as Meta[],
    etiquetas: [] as Etiqueta[],
    prioridades: [] as Prioridade[],
    limiteFoco: 6,
    configAtualizadaEm: agora(),
    sujos: SUJOS_VAZIOS,
    lapides: [] as Lapide[],
    cursorPull: null as string | null,
    semeado: false,
  };
}

export const CHAVE_ANONIMA = 'agenda-anon';
export const CHAVE_DEMO = 'agenda-demo';
export const chaveDoUsuario = (userId: string) => `agenda-u-${userId}`;

export const useStore = create<Estado>()(
  persist(
    (set, get) => ({
      ...estadoVazio(),
      usuarioId: null,

      // ── metas ───────────────────────────────────────────────────────────

      adicionarMeta: (m) =>
        set((s) => {
          const id = gerarId();
          const nova: Meta = {
            ...m,
            id,
            criadaEm: agora(),
            historico: [],
            atualizadoEm: agora(),
          };
          return { metas: [...s.metas, nova], sujos: comSujo(s.sujos, 'metas', id) };
        }),

      atualizarMeta: (id, patch) =>
        set((s) => ({
          metas: s.metas.map((m) => (m.id === id ? { ...m, ...patch, atualizadoEm: agora() } : m)),
          sujos: comSujo(s.sujos, 'metas', id),
        })),

      removerMeta: (id) =>
        set((s) => ({
          metas: s.metas.filter((m) => m.id !== id),
          lapides: [...s.lapides, { tabela: 'metas' as const, id, em: agora() }],
          sujos: { ...s.sujos, metas: s.sujos.metas.filter((x) => x !== id) },
        })),

      definirStatus: (id, status) =>
        set((s) => ({
          metas: s.metas.map((m) =>
            m.id === id
              ? {
                  ...m,
                  status,
                  progresso: status === 'concluida' ? 100 : m.progresso,
                  atualizadoEm: agora(),
                }
              : m,
          ),
          sujos: comSujo(s.sujos, 'metas', id),
        })),

      alternarCumprido: (id, data = hojeISO()) =>
        set((s) => ({
          metas: s.metas.map((m) => {
            if (m.id !== id) return m;
            const feito = m.historico.includes(data);
            return {
              ...m,
              historico: feito
                ? m.historico.filter((d) => d !== data)
                : [...m.historico, data].sort(),
              atualizadoEm: agora(),
            };
          }),
          sujos: comSujo(s.sujos, 'metas', id),
        })),

      definirProgresso: (id, progresso) =>
        set((s) => ({
          metas: s.metas.map((m) =>
            m.id === id
              ? {
                  ...m,
                  progresso,
                  status:
                    progresso >= 100 ? 'concluida' : m.status === 'concluida' ? 'ativa' : m.status,
                  atualizadoEm: agora(),
                }
              : m,
          ),
          sujos: comSujo(s.sujos, 'metas', id),
        })),

      agendarPara: (id, dataISO) =>
        set((s) => ({
          metas: s.metas.map((m) =>
            m.id === id ? { ...m, agendadaPara: dataISO, atualizadoEm: agora() } : m,
          ),
          sujos: comSujo(s.sujos, 'metas', id),
        })),

      // ── subtarefas ──────────────────────────────────────────────────────

      adicionarSubtarefa: (metaId, titulo) =>
        set((s) => ({
          metas: s.metas.map((m) =>
            m.id === metaId
              ? {
                  ...m,
                  subtarefas: [
                    ...(m.subtarefas ?? []),
                    { id: gerarId(), titulo, feita: false } as Subtarefa,
                  ],
                  atualizadoEm: agora(),
                }
              : m,
          ),
          sujos: comSujo(s.sujos, 'metas', metaId),
        })),

      alternarSubtarefa: (metaId, subId) =>
        set((s) => ({
          metas: s.metas.map((m) =>
            m.id === metaId
              ? {
                  ...m,
                  subtarefas: (m.subtarefas ?? []).map((sub) =>
                    sub.id === subId ? { ...sub, feita: !sub.feita } : sub,
                  ),
                  atualizadoEm: agora(),
                }
              : m,
          ),
          sujos: comSujo(s.sujos, 'metas', metaId),
        })),

      atualizarSubtarefa: (metaId, subId, titulo) =>
        set((s) => ({
          metas: s.metas.map((m) =>
            m.id === metaId
              ? {
                  ...m,
                  subtarefas: (m.subtarefas ?? []).map((sub) =>
                    sub.id === subId ? { ...sub, titulo } : sub,
                  ),
                  atualizadoEm: agora(),
                }
              : m,
          ),
          sujos: comSujo(s.sujos, 'metas', metaId),
        })),

      removerSubtarefa: (metaId, subId) =>
        set((s) => ({
          metas: s.metas.map((m) =>
            m.id === metaId
              ? {
                  ...m,
                  subtarefas: (m.subtarefas ?? []).filter((sub) => sub.id !== subId),
                  atualizadoEm: agora(),
                }
              : m,
          ),
          sujos: comSujo(s.sujos, 'metas', metaId),
        })),

      // ── etiquetas ───────────────────────────────────────────────────────

      adicionarEtiqueta: (nome, cor) =>
        set((s) => {
          const id = gerarId();
          return {
            etiquetas: [...s.etiquetas, { id, nome, cor, atualizadoEm: agora() }],
            sujos: comSujo(s.sujos, 'etiquetas', id),
          };
        }),

      atualizarEtiqueta: (id, patch) =>
        set((s) => ({
          etiquetas: s.etiquetas.map((e) =>
            e.id === id ? { ...e, ...patch, atualizadoEm: agora() } : e,
          ),
          sujos: comSujo(s.sujos, 'etiquetas', id),
        })),

      removerEtiqueta: (id) =>
        set((s) => {
          const afetadas = s.metas.filter((m) => m.etiquetas.includes(id)).map((m) => m.id);
          return {
            etiquetas: s.etiquetas.filter((e) => e.id !== id),
            lapides: [...s.lapides, { tabela: 'etiquetas' as const, id, em: agora() }],
            metas: s.metas.map((m) =>
              m.etiquetas.includes(id)
                ? {
                    ...m,
                    etiquetas: m.etiquetas.filter((eid) => eid !== id),
                    atualizadoEm: agora(),
                  }
                : m,
            ),
            sujos: comSujo(
              { ...s.sujos, etiquetas: s.sujos.etiquetas.filter((x) => x !== id) },
              'metas',
              ...afetadas,
            ),
          };
        }),

      // ── prioridades ─────────────────────────────────────────────────────

      atualizarPrioridade: (id, patch) =>
        set((s) => ({
          prioridades: s.prioridades.map((p) =>
            p.id === id ? { ...p, ...patch, atualizadoEm: agora() } : p,
          ),
          sujos: comSujo(s.sujos, 'prioridades', id),
        })),

      moverPrioridade: (id, direcao) =>
        set((s) => {
          const ordenadas = [...s.prioridades].sort((a, b) => a.ordem - b.ordem);
          const idx = ordenadas.findIndex((p) => p.id === id);
          const alvo = idx + direcao;
          if (idx < 0 || alvo < 0 || alvo >= ordenadas.length) return {};
          const a = ordenadas[idx];
          const b = ordenadas[alvo];
          const trocadas = s.prioridades.map((p) => {
            if (p.id === a.id) return { ...p, ordem: b.ordem, atualizadoEm: agora() };
            if (p.id === b.id) return { ...p, ordem: a.ordem, atualizadoEm: agora() };
            return p;
          });
          return { prioridades: trocadas, sujos: comSujo(s.sujos, 'prioridades', a.id, b.id) };
        }),

      // ── config / dados ───────────────────────────────────────────────────

      definirLimiteFoco: (n) =>
        set((s) => ({
          limiteFoco: Math.max(1, n),
          configAtualizadaEm: agora(),
          sujos: { ...s.sujos, config: true },
        })),

      exportarDados: () => {
        const s = get();
        return {
          versao: 2,
          exportadoEm: agora(),
          metas: s.metas,
          etiquetas: s.etiquetas,
          prioridades: s.prioridades,
          limiteFoco: s.limiteFoco,
        };
      },

      importarDados: (dados) => get().substituirTudo(dados, true),

      substituirTudo: (dados, marcarTudoSujo) =>
        set((s) => {
          const metas = dados.metas ?? s.metas;
          const etiquetas = dados.etiquetas ?? s.etiquetas;
          const prioridades = dados.prioridades ?? s.prioridades;
          return {
            metas,
            etiquetas,
            prioridades,
            limiteFoco: dados.limiteFoco ?? s.limiteFoco,
            configAtualizadaEm: agora(),
            sujos: marcarTudoSujo
              ? {
                  metas: metas.map((m) => m.id),
                  etiquetas: etiquetas.map((e) => e.id),
                  prioridades: prioridades.map((p) => p.id),
                  config: true,
                }
              : s.sujos,
          };
        }),

      semear: () =>
        set(() => {
          const metas = metasSeed().map((m) => ({ ...m, atualizadoEm: agora() }));
          const etiquetas = ETIQUETAS_SEED.map((e) => ({ ...e, atualizadoEm: agora() }));
          const prioridades = PRIORIDADES_SEED.map((p) => ({ ...p, atualizadoEm: agora() }));
          return {
            metas,
            etiquetas,
            prioridades,
            limiteFoco: 6,
            configAtualizadaEm: agora(),
            semeado: true,
            sujos: {
              metas: metas.map((m) => m.id),
              etiquetas: etiquetas.map((e) => e.id),
              prioridades: prioridades.map((p) => p.id),
              config: true,
            },
          };
        }),

      resetar: () =>
        set((s) => ({
          ...estadoVazio(),
          semeado: s.semeado,
          cursorPull: s.cursorPull,
          // Lápides para que a exclusão se propague, em vez de os outros
          // aparelhos devolverem tudo no próximo pull.
          lapides: [
            ...s.lapides,
            ...s.metas.map((m) => ({ tabela: 'metas' as const, id: m.id, em: agora() })),
            ...s.etiquetas.map((e) => ({ tabela: 'etiquetas' as const, id: e.id, em: agora() })),
            ...s.prioridades.map((p) => ({
              tabela: 'prioridades' as const,
              id: p.id,
              em: agora(),
            })),
          ],
        })),

      // ── sincronização ───────────────────────────────────────────────────

      aplicarRemoto: (dados) =>
        set((s) => {
          const removidosDe = (t: Tabela) =>
            new Set((dados.removidos ?? []).filter((r) => r.tabela === t).map((r) => r.id));

          const fundir = <T extends { id: string }>(
            atuais: T[],
            novos: T[] | undefined,
            removidos: Set<string>,
          ): T[] => {
            const mapa = new Map(atuais.map((x) => [x.id, x]));
            for (const n of novos ?? []) mapa.set(n.id, n);
            for (const id of removidos) mapa.delete(id);
            return [...mapa.values()];
          };

          return {
            metas: fundir(s.metas, dados.metas, removidosDe('metas')),
            etiquetas: fundir(s.etiquetas, dados.etiquetas, removidosDe('etiquetas')),
            prioridades: fundir(s.prioridades, dados.prioridades, removidosDe('prioridades')),
            limiteFoco: dados.limiteFoco ?? s.limiteFoco,
            configAtualizadaEm: dados.configAtualizadaEm ?? s.configAtualizadaEm,
          };
        }),

      limparSujos: (enviados, lapidesEnviadas) =>
        set((s) => {
          const chavesEnviadas = new Set(lapidesEnviadas.map((l) => `${l.tabela}:${l.id}`));

          /**
           * Só deixa de estar pendente o item cujo `atualizadoEm` ainda é o que
           * foi enviado. Se o usuário editou durante o push, o item continua na
           * fila e sobe no próximo ciclo.
           */
          const limpar = <T extends { id: string; atualizadoEm?: string }>(
            pendentes: string[],
            enviadosDaTabela: [string, string | undefined][] | undefined,
            itens: T[],
          ) => {
            if (!enviadosDaTabela) return pendentes;
            const carimbos = new Map(enviadosDaTabela);
            return pendentes.filter((id) => {
              if (!carimbos.has(id)) return true;
              const item = itens.find((x) => x.id === id);
              return item !== undefined && item.atualizadoEm !== carimbos.get(id);
            });
          };

          return {
            sujos: {
              metas: limpar(s.sujos.metas, enviados.metas, s.metas),
              etiquetas: limpar(s.sujos.etiquetas, enviados.etiquetas, s.etiquetas),
              prioridades: limpar(s.sujos.prioridades, enviados.prioridades, s.prioridades),
              config:
                enviados.config !== undefined && s.configAtualizadaEm === enviados.config
                  ? false
                  : s.sujos.config,
            },
            lapides: s.lapides.filter((l) => !chavesEnviadas.has(`${l.tabela}:${l.id}`)),
          };
        }),

      definirCursorPull: (cursor) => set({ cursorPull: cursor }),

      marcarSemeado: (v) => set({ semeado: v }),
    }),
    {
      name: CHAVE_ANONIMA,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        metas: s.metas,
        etiquetas: s.etiquetas,
        prioridades: s.prioridades,
        limiteFoco: s.limiteFoco,
        configAtualizadaEm: s.configAtualizadaEm,
        sujos: s.sujos,
        lapides: s.lapides,
        cursorPull: s.cursorPull,
        semeado: s.semeado,
      }),
    },
  ),
);

/**
 * Troca o cache local para o do usuário logado. Sem isso, duas contas no mesmo
 * navegador escreveriam na mesma chave do localStorage e misturariam dados.
 */
export async function prepararStoreParaUsuario(userId: string) {
  useStore.setState({ ...estadoVazio(), usuarioId: userId });
  useStore.persist.setOptions({ name: chaveDoUsuario(userId) });
  await useStore.persist.rehydrate();
  useStore.setState({ usuarioId: userId });
}

/**
 * Demonstração pública: cache próprio neste navegador, metas de exemplo com
 * passado inventado, e nenhuma sincronização. Nada daqui chega à nuvem.
 */
export async function prepararStoreParaDemo() {
  useStore.setState({ ...estadoVazio(), usuarioId: null });
  useStore.persist.setOptions({ name: CHAVE_DEMO });
  await useStore.persist.rehydrate();
  if (!useStore.getState().semeado) {
    useStore.getState().semear();
    useStore.setState((s) => ({ metas: metasDemo(s.metas), sujos: SUJOS_VAZIOS }));
  }
}

/** Limpa a memória ao sair, sem apagar o cache em disco (o próximo login volta rápido). */
export function limparStoreDaSessao() {
  useStore.persist.setOptions({ name: CHAVE_ANONIMA });
  useStore.setState({ ...estadoVazio(), usuarioId: null });
}

// ── seletores derivados ──

export function prioridadeDe(id: string, prioridades: Prioridade[]): Prioridade {
  const ordenadas = prioridades.slice().sort((a, b) => a.ordem - b.ordem);
  return (
    prioridades.find((p) => p.id === id) ??
    ordenadas[ordenadas.length - 1] ?? { id: 'p?', nome: '—', cor: '#64748b', ordem: 99 }
  );
}

export function etiquetasDe(ids: string[], etiquetas: Etiqueta[]): Etiqueta[] {
  return ids.map((id) => etiquetas.find((e) => e.id === id)).filter(Boolean) as Etiqueta[];
}
