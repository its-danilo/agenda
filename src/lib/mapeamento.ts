import type { Etiqueta, Meta, Prioridade, Subtarefa } from '../types';

/**
 * Conversão entre as linhas do Postgres (snake_case, nulls) e os objetos do
 * app (camelCase, undefined). Isolado aqui para o resto do código nunca
 * precisar conhecer o formato do banco.
 */

export type Tabela = 'metas' | 'etiquetas' | 'prioridades';

export interface LinhaBase {
  id: string;
  user_id: string;
  removido: boolean;
  atualizado_em: string;
}

const semNulo = <T>(v: T | null | undefined): T | undefined => (v == null ? undefined : v);

// ── metas ───────────────────────────────────────────────────────────────────

export function metaDeLinha(l: any): Meta {
  return {
    id: l.id,
    titulo: l.titulo,
    descricao: semNulo(l.descricao),
    categoria: l.categoria,
    horizonte: l.horizonte ?? 'longo',
    cadencia: l.cadencia,
    diasSemana: l.dias_semana ?? [],
    diaDoMes: semNulo(l.dia_do_mes),
    prioridadeId: l.prioridade_id,
    etiquetas: l.etiquetas ?? [],
    status: l.status,
    minutosPorDia: semNulo(l.minutos_por_dia),
    estimativaTexto: semNulo(l.estimativa_texto),
    dataAlvo: semNulo(l.data_alvo),
    agendadaPara: semNulo(l.agendada_para),
    notas: semNulo(l.notas),
    subtarefas: (l.subtarefas ?? []) as Subtarefa[],
    criadaEm: l.criada_em,
    historico: l.historico ?? [],
    progresso: semNulo(l.progresso),
    atualizadoEm: l.atualizado_em,
  };
}

export function linhaDeMeta(m: Meta, userId: string, removido = false) {
  return {
    user_id: userId,
    id: m.id,
    titulo: m.titulo,
    descricao: m.descricao ?? null,
    categoria: m.categoria,
    horizonte: m.horizonte,
    cadencia: m.cadencia,
    dias_semana: m.diasSemana ?? [],
    dia_do_mes: m.diaDoMes ?? null,
    prioridade_id: m.prioridadeId,
    etiquetas: m.etiquetas ?? [],
    status: m.status,
    minutos_por_dia: m.minutosPorDia ?? null,
    estimativa_texto: m.estimativaTexto ?? null,
    data_alvo: m.dataAlvo ?? null,
    agendada_para: m.agendadaPara ?? null,
    notas: m.notas ?? null,
    subtarefas: m.subtarefas ?? [],
    progresso: m.progresso ?? null,
    historico: m.historico ?? [],
    criada_em: m.criadaEm,
    removido,
    atualizado_em: m.atualizadoEm ?? new Date().toISOString(),
  };
}

// ── etiquetas ───────────────────────────────────────────────────────────────

export function etiquetaDeLinha(l: any): Etiqueta {
  return { id: l.id, nome: l.nome, cor: l.cor, atualizadoEm: l.atualizado_em };
}

export function linhaDeEtiqueta(e: Etiqueta, userId: string, removido = false) {
  return {
    user_id: userId,
    id: e.id,
    nome: e.nome,
    cor: e.cor,
    removido,
    atualizado_em: e.atualizadoEm ?? new Date().toISOString(),
  };
}

// ── prioridades ─────────────────────────────────────────────────────────────

export function prioridadeDeLinha(l: any): Prioridade {
  return { id: l.id, nome: l.nome, cor: l.cor, ordem: l.ordem, atualizadoEm: l.atualizado_em };
}

export function linhaDePrioridade(p: Prioridade, userId: string, removido = false) {
  return {
    user_id: userId,
    id: p.id,
    nome: p.nome,
    cor: p.cor,
    ordem: p.ordem,
    removido,
    atualizado_em: p.atualizadoEm ?? new Date().toISOString(),
  };
}
