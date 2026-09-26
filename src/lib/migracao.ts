import type { Etiqueta, Horizonte, Meta, Prioridade } from '../types';
import type { DadosExportados } from '../store';
import { diasRestantes } from './dates';

/**
 * Migração da era "só localStorage" para a era com nuvem.
 *
 * Antes desta versão os dados viviam apenas na chave `agenda-metas-v1` do
 * navegador — cada aparelho com a sua cópia, sem sincronizar. Aqui lemos essa
 * cópia antiga, convertemos para o modelo novo e mesclamos sem perder nada.
 */

export const CHAVE_ANTIGA = 'agenda-metas-v1';

/** Horizonte de metas antigas, que só tinham 'curto' | 'longo'. */
function inferirHorizonte(m: any): Horizonte {
  if (m.horizonte === 'curto' || m.horizonte === 'medio' || m.horizonte === 'longo') {
    if (m.horizonte !== 'longo') return m.horizonte;
  }
  if (m.categoria === 'todo') return 'curto';

  const dias = diasRestantes(m.dataAlvo);
  if (dias !== undefined) {
    if (dias <= 30) return 'curto';
    if (dias <= 180) return 'medio';
    return 'longo';
  }

  if (m.cadencia === 'pontual') return 'curto';
  if (m.cadencia === 'projeto') return 'medio';
  return 'longo';
}

/** Converte uma meta de qualquer versão anterior para o formato atual. */
export function normalizarMeta(m: any): Meta {
  const criadaEm = typeof m.criadaEm === 'string' ? m.criadaEm : new Date().toISOString();
  return {
    id: String(m.id),
    titulo: String(m.titulo ?? 'Sem título'),
    descricao: m.descricao || undefined,
    categoria: m.categoria ?? 'todo',
    horizonte: inferirHorizonte(m),
    cadencia: m.cadencia ?? 'pontual',
    diasSemana: Array.isArray(m.diasSemana) ? m.diasSemana : [],
    diaDoMes: typeof m.diaDoMes === 'number' ? m.diaDoMes : undefined,
    prioridadeId: m.prioridadeId ?? 'p3',
    etiquetas: Array.isArray(m.etiquetas) ? m.etiquetas : [],
    status: m.status ?? 'fila',
    minutosPorDia: typeof m.minutosPorDia === 'number' ? m.minutosPorDia : undefined,
    estimativaTexto: m.estimativaTexto || undefined,
    dataAlvo: m.dataAlvo || undefined,
    agendadaPara: m.agendadaPara || undefined,
    notas: m.notas || undefined,
    subtarefas: Array.isArray(m.subtarefas) ? m.subtarefas : [],
    criadaEm,
    historico: Array.isArray(m.historico) ? [...new Set(m.historico as string[])].sort() : [],
    progresso: typeof m.progresso === 'number' ? m.progresso : undefined,
    atualizadoEm: m.atualizadoEm ?? criadaEm,
  };
}

export function normalizarDados(bruto: any): DadosExportados {
  const dados = bruto?.state ?? bruto ?? {};
  return {
    versao: 2,
    exportadoEm: new Date().toISOString(),
    metas: Array.isArray(dados.metas) ? dados.metas.map(normalizarMeta) : [],
    etiquetas: (Array.isArray(dados.etiquetas) ? dados.etiquetas : []).map(
      (e: any): Etiqueta => ({
        id: String(e.id),
        nome: String(e.nome ?? ''),
        cor: e.cor ?? '#8b5cf6',
        atualizadoEm: e.atualizadoEm ?? new Date().toISOString(),
      }),
    ),
    prioridades: (Array.isArray(dados.prioridades) ? dados.prioridades : []).map(
      (p: any): Prioridade => ({
        id: String(p.id),
        nome: String(p.nome ?? ''),
        cor: p.cor ?? '#64748b',
        ordem: typeof p.ordem === 'number' ? p.ordem : 99,
        atualizadoEm: p.atualizadoEm ?? new Date().toISOString(),
      }),
    ),
    limiteFoco: typeof dados.limiteFoco === 'number' ? dados.limiteFoco : 6,
  };
}

/** Lê a cópia antiga deste navegador, se ainda existir. */
export function lerDadosAntigos(): DadosExportados | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ANTIGA);
    if (!bruto) return null;
    const dados = normalizarDados(JSON.parse(bruto));
    if (!dados.metas.length && !dados.etiquetas.length) return null;
    return dados;
  } catch {
    return null;
  }
}

export function descartarDadosAntigos() {
  try {
    localStorage.removeItem(CHAVE_ANTIGA);
  } catch {
    /* navegador com storage bloqueado — nada a fazer */
  }
}

/** Marca que a cópia antiga deste navegador já foi tratada. */
export const CHAVE_MIGRADO = 'agenda-migracao-v1-feita';

export function migracaoJaFeita(): boolean {
  try {
    return localStorage.getItem(CHAVE_MIGRADO) === '1';
  } catch {
    return true;
  }
}

export function marcarMigracaoFeita() {
  try {
    localStorage.setItem(CHAVE_MIGRADO, '1');
  } catch {
    /* ignora */
  }
}

/**
 * Une dois conjuntos de dados. Em colisão de id vence o `atualizadoEm` mais
 * recente — exceto o `historico`, que é sempre a união dos dias dos dois lados:
 * dia cumprido não pode ser perdido por uma corrida entre aparelhos.
 */
export function mesclarDados(base: DadosExportados, extra: DadosExportados): DadosExportados {
  const maisNovo = <T extends { atualizadoEm?: string }>(a: T, b: T): T =>
    (a.atualizadoEm ?? '') >= (b.atualizadoEm ?? '') ? a : b;

  const metas = new Map(base.metas.map((m) => [m.id, m]));
  for (const m of extra.metas) {
    const atual = metas.get(m.id);
    if (!atual) {
      metas.set(m.id, m);
    } else {
      const vencedora = maisNovo(atual, m);
      metas.set(m.id, {
        ...vencedora,
        historico: [...new Set([...atual.historico, ...m.historico])].sort(),
        subtarefas: vencedora.subtarefas?.length
          ? vencedora.subtarefas
          : (atual.subtarefas ?? m.subtarefas ?? []),
      });
    }
  }

  const etiquetas = new Map(base.etiquetas.map((e) => [e.id, e]));
  for (const e of extra.etiquetas) {
    const atual = etiquetas.get(e.id);
    etiquetas.set(e.id, atual ? maisNovo(atual, e) : e);
  }

  const prioridades = new Map(base.prioridades.map((p) => [p.id, p]));
  for (const p of extra.prioridades) {
    const atual = prioridades.get(p.id);
    prioridades.set(p.id, atual ? maisNovo(atual, p) : p);
  }

  return {
    versao: 2,
    exportadoEm: new Date().toISOString(),
    metas: [...metas.values()],
    etiquetas: [...etiquetas.values()],
    prioridades: [...prioridades.values()],
    limiteFoco: base.limiteFoco || extra.limiteFoco || 6,
  };
}
