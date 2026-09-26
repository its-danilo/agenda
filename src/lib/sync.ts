import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Etiqueta, Meta, Prioridade } from '../types';
import { useStore, type Enviados, type Lapide } from '../store';
import { exigirSupabase } from './supabase';
import {
  etiquetaDeLinha,
  linhaDeEtiqueta,
  linhaDeMeta,
  linhaDePrioridade,
  metaDeLinha,
  prioridadeDeLinha,
  type Tabela,
} from './mapeamento';

/**
 * Sincronização offline-first.
 *
 * O localStorage é o cache de trabalho: o app continua 100% usável sem rede.
 * Cada registro carrega `atualizadoEm`; conflitos se resolvem por
 * last-write-wins, com uma exceção importante — o `historico` de dias
 * cumpridos é sempre unido, nunca sobrescrito, para não perder streak quando
 * dois aparelhos marcam hábitos diferentes offline.
 */

// ── estado visível na UI ────────────────────────────────────────────────────

export type SituacaoSync = 'ocioso' | 'sincronizando' | 'pendente' | 'offline' | 'erro';

interface EstadoSync {
  situacao: SituacaoSync;
  ultimoSync: string | null;
  erro: string | null;
  definir: (p: Partial<Omit<EstadoSync, 'definir'>>) => void;
}

export const useSyncStore = create<EstadoSync>((set) => ({
  situacao: 'ocioso',
  ultimoSync: null,
  erro: null,
  definir: (p) => set(p),
}));

const situacao = (s: SituacaoSync, erro: string | null = null) =>
  useSyncStore.getState().definir({ situacao: s, erro });

// ── ciclo de vida ───────────────────────────────────────────────────────────

let usuarioAtual: string | null = null;
let canal: RealtimeChannel | null = null;
let timerPush: ReturnType<typeof setTimeout> | null = null;
let timerPull: ReturnType<typeof setTimeout> | null = null;
let desinscreverStore: (() => void) | null = null;
let sincronizando = false;

export interface ResumoInicial {
  contaSemeada: boolean;
  metasNaNuvem: number;
}

/** Sobe a sincronização para o usuário logado. Retorna o estado da conta. */
export async function iniciarSync(userId: string): Promise<ResumoInicial> {
  pararSync();
  usuarioAtual = userId;

  const resumo = await primeiroContato(userId);

  canal = assinarRealtime(userId);
  desinscreverStore = useStore.subscribe((estado, anterior) => {
    if (
      estado.sujos !== anterior.sujos ||
      estado.lapides !== anterior.lapides
    ) {
      agendarPush();
    }
  });

  window.addEventListener('online', aoVoltarOnline);
  window.addEventListener('offline', aoFicarOffline);
  document.addEventListener('visibilitychange', aoMudarVisibilidade);

  if (!navigator.onLine) situacao('offline');
  agendarPush();

  return resumo;
}

export function pararSync() {
  usuarioAtual = null;
  if (canal) {
    exigirSupabase().removeChannel(canal);
    canal = null;
  }
  if (timerPush) clearTimeout(timerPush);
  if (timerPull) clearTimeout(timerPull);
  timerPush = null;
  timerPull = null;
  desinscreverStore?.();
  desinscreverStore = null;
  window.removeEventListener('online', aoVoltarOnline);
  window.removeEventListener('offline', aoFicarOffline);
  document.removeEventListener('visibilitychange', aoMudarVisibilidade);
  useSyncStore.getState().definir({ situacao: 'ocioso', erro: null });
}

function aoVoltarOnline() {
  situacao('pendente');
  void sincronizarAgora();
}

function aoFicarOffline() {
  situacao('offline');
}

function aoMudarVisibilidade() {
  if (document.visibilityState === 'visible') void sincronizarAgora();
}

function agendarPush(atraso = 800) {
  if (timerPush) clearTimeout(timerPush);
  timerPush = setTimeout(() => void sincronizarAgora(), atraso);
}

function agendarPull(atraso = 300) {
  if (timerPull) clearTimeout(timerPull);
  timerPull = setTimeout(() => void sincronizarAgora(), atraso);
}

/** Empurra o que está pendente e puxa o que mudou no servidor. */
export async function sincronizarAgora(): Promise<void> {
  if (!usuarioAtual) return;
  if (sincronizando) return;
  if (!navigator.onLine) {
    situacao('offline');
    return;
  }

  sincronizando = true;
  situacao('sincronizando');
  try {
    await push(usuarioAtual);
    await pull(usuarioAtual);
    useSyncStore.getState().definir({
      situacao: 'ocioso',
      erro: null,
      ultimoSync: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    situacao(navigator.onLine ? 'erro' : 'offline', msg);
    console.error('[sync]', e);
  } finally {
    sincronizando = false;
  }
}

// ── primeiro contato: garante a linha de configuração da conta ──────────────

async function primeiroContato(userId: string): Promise<ResumoInicial> {
  const sb = exigirSupabase();

  const { data: cfg, error } = await sb
    .from('configuracoes')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  if (!cfg) {
    const { error: erroInsert } = await sb.from('configuracoes').insert({
      user_id: userId,
      limite_foco: 6,
      semeado: false,
      atualizado_em: new Date().toISOString(),
    });
    if (erroInsert) throw erroInsert;
  }

  const { count, error: erroCount } = await sb
    .from('metas')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('removido', false);
  if (erroCount) throw erroCount;

  // Puxa tudo antes de o app decidir entre semear, migrar ou só usar.
  await pull(userId);

  return { contaSemeada: Boolean(cfg?.semeado), metasNaNuvem: count ?? 0 };
}

/** Marca no servidor que a conta já foi inicializada (evita re-semear). */
export async function marcarContaSemeada(userId: string) {
  const sb = exigirSupabase();
  const { error } = await sb
    .from('configuracoes')
    .update({ semeado: true, atualizado_em: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
  useStore.getState().marcarSemeado(true);
}

// ── PUSH ────────────────────────────────────────────────────────────────────

async function push(userId: string) {
  const sb = exigirSupabase();
  const s = useStore.getState();

  const metasSujas = s.metas.filter((m) => s.sujos.metas.includes(m.id));
  const etiquetasSujas = s.etiquetas.filter((e) => s.sujos.etiquetas.includes(e.id));
  const prioridadesSujas = s.prioridades.filter((p) => s.sujos.prioridades.includes(p.id));
  const lapides = s.lapides;

  // Guardamos o carimbo enviado de cada item: se ele for editado durante o
  // push, `limparSujos` percebe e mantém o item na fila.
  const enviados: Enviados = {};
  const carimbos = <T extends { id: string; atualizadoEm?: string }>(itens: T[]) =>
    itens.map((x) => [x.id, x.atualizadoEm] as [string, string | undefined]);

  if (metasSujas.length) {
    const { error } = await sb
      .from('metas')
      .upsert(metasSujas.map((m) => linhaDeMeta(m, userId)), { onConflict: 'user_id,id' });
    if (error) throw error;
    enviados.metas = carimbos(metasSujas);
  }

  if (etiquetasSujas.length) {
    const { error } = await sb
      .from('etiquetas')
      .upsert(etiquetasSujas.map((e) => linhaDeEtiqueta(e, userId)), { onConflict: 'user_id,id' });
    if (error) throw error;
    enviados.etiquetas = carimbos(etiquetasSujas);
  }

  if (prioridadesSujas.length) {
    const { error } = await sb
      .from('prioridades')
      .upsert(prioridadesSujas.map((p) => linhaDePrioridade(p, userId)), {
        onConflict: 'user_id,id',
      });
    if (error) throw error;
    enviados.prioridades = carimbos(prioridadesSujas);
  }

  if (s.sujos.config) {
    const { error } = await sb.from('configuracoes').upsert(
      {
        user_id: userId,
        limite_foco: s.limiteFoco,
        semeado: s.semeado,
        atualizado_em: s.configAtualizadaEm,
      },
      { onConflict: 'user_id' },
    );
    if (error) throw error;
    enviados.config = s.configAtualizadaEm;
  }

  // Exclusões viram soft delete via UPDATE: a linha já existe no servidor e
  // assim não precisamos remontar as colunas obrigatórias.
  const lapidesEnviadas: Lapide[] = [];
  for (const l of lapides) {
    const { error } = await sb
      .from(l.tabela)
      .update({ removido: true, atualizado_em: l.em })
      .eq('user_id', userId)
      .eq('id', l.id);
    if (error) throw error;
    lapidesEnviadas.push(l);
  }

  if (Object.keys(enviados).length || lapidesEnviadas.length) {
    useStore.getState().limparSujos(enviados, lapidesEnviadas);
  }
}

// ── PULL ────────────────────────────────────────────────────────────────────

/**
 * Margem contra relógios levemente dessincronizados entre aparelhos: relemos
 * dois minutos a mais do que o estritamente necessário. O merge é idempotente,
 * então reler é barato e evita perder uma escrita por diferença de relógio.
 */
const MARGEM_CURSOR_MS = 2 * 60 * 1000;

async function pull(userId: string) {
  const sb = exigirSupabase();
  const cursor = useStore.getState().cursorPull;

  const consulta = (tabela: string) => {
    const b = sb.from(tabela).select('*').eq('user_id', userId);
    return cursor ? b.gt('atualizado_em', cursor) : b;
  };

  const [rMetas, rEtiquetas, rPrioridades, rConfig] = await Promise.all([
    consulta('metas'),
    consulta('etiquetas'),
    consulta('prioridades'),
    sb.from('configuracoes').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  for (const r of [rMetas, rEtiquetas, rPrioridades, rConfig]) {
    if (r.error) throw r.error;
  }

  const linhasMetas = (rMetas.data ?? []) as any[];
  const linhasEtiquetas = (rEtiquetas.data ?? []) as any[];
  const linhasPrioridades = (rPrioridades.data ?? []) as any[];
  const cfg = rConfig.data as any;

  const local = useStore.getState();
  const removidos: { tabela: Tabela; id: string }[] = [];

  const metas = resolver<Meta>(
    linhasMetas,
    metaDeLinha,
    local.metas,
    local.sujos.metas,
    'metas',
    removidos,
    mesclarMeta,
  );
  const etiquetas = resolver<Etiqueta>(
    linhasEtiquetas,
    etiquetaDeLinha,
    local.etiquetas,
    local.sujos.etiquetas,
    'etiquetas',
    removidos,
  );
  const prioridades = resolver<Prioridade>(
    linhasPrioridades,
    prioridadeDeLinha,
    local.prioridades,
    local.sujos.prioridades,
    'prioridades',
    removidos,
  );

  const configRemotaVence =
    cfg && !local.sujos.config && (cfg.atualizado_em ?? '') > (local.configAtualizadaEm ?? '');

  useStore.getState().aplicarRemoto({
    metas,
    etiquetas,
    prioridades,
    removidos,
    limiteFoco: configRemotaVence ? cfg.limite_foco : undefined,
    configAtualizadaEm: configRemotaVence ? cfg.atualizado_em : undefined,
  });

  if (cfg?.semeado && !local.semeado) useStore.getState().marcarSemeado(true);

  const carimbos = [...linhasMetas, ...linhasEtiquetas, ...linhasPrioridades].map(
    (l) => l.atualizado_em as string,
  );
  if (carimbos.length) {
    const maior = carimbos.reduce((a, b) => (a > b ? a : b));
    const comMargem = new Date(new Date(maior).getTime() - MARGEM_CURSOR_MS).toISOString();
    const atual = useStore.getState().cursorPull;
    if (!atual || comMargem > atual) useStore.getState().definirCursorPull(comMargem);
  } else if (!useStore.getState().cursorPull) {
    useStore
      .getState()
      .definirCursorPull(new Date(Date.now() - MARGEM_CURSOR_MS).toISOString());
  }
}

/**
 * Decide, linha a linha, quem vence: o servidor ou a versão local ainda não
 * enviada. Local "sujo" e mais recente sempre ganha — senão uma edição feita
 * offline seria silenciosamente descartada.
 */
function resolver<T extends { id: string; atualizadoEm?: string }>(
  linhas: any[],
  converter: (l: any) => T,
  locais: T[],
  idsSujos: string[],
  tabela: Tabela,
  removidos: { tabela: Tabela; id: string }[],
  mesclar?: (local: T, remoto: T) => T,
): T[] {
  const porId = new Map(locais.map((x) => [x.id, x]));
  const aceitos: T[] = [];

  for (const linha of linhas) {
    const remoto = converter(linha);
    const local = porId.get(remoto.id);
    const sujo = idsSujos.includes(remoto.id);
    const remotoMaisNovo = !local || (remoto.atualizadoEm ?? '') > (local.atualizadoEm ?? '');

    if (linha.removido) {
      // Só apaga se a versão local não for uma edição mais nova ainda por enviar.
      if (!sujo || !local || (local.atualizadoEm ?? '') <= (remoto.atualizadoEm ?? '')) {
        removidos.push({ tabela, id: remoto.id });
      }
      continue;
    }

    if (!sujo) {
      aceitos.push(remoto);
    } else if (remotoMaisNovo && local) {
      aceitos.push(mesclar ? mesclar(local, remoto) : remoto);
    }
    // local sujo e mais novo: mantém o local, que será empurrado no próximo push
  }

  return aceitos;
}

/** O servidor vence, mas os dias cumpridos dos dois lados são somados. */
function mesclarMeta(local: Meta, remoto: Meta): Meta {
  const historico = [...new Set([...local.historico, ...remoto.historico])].sort();
  return { ...remoto, historico };
}

// ── Realtime ────────────────────────────────────────────────────────────────

function assinarRealtime(userId: string): RealtimeChannel {
  const sb = exigirSupabase();
  const filtro = `user_id=eq.${userId}`;
  const canal = sb.channel(`agenda-${userId}`);

  for (const tabela of ['metas', 'etiquetas', 'prioridades', 'configuracoes']) {
    canal.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tabela, filter: filtro },
      () => agendarPull(),
    );
  }

  canal.subscribe();
  return canal;
}
