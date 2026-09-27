import type { Etiqueta, Meta, Prioridade } from '../types';
import { ehRecorrente } from '../types';
import { diaISO, estimativaParaDataAlvo, hojeISO } from '../lib/dates';
import { devidaEm } from '../lib/recorrencia';

export const PRIORIDADES_SEED: Prioridade[] = [
  { id: 'p1', nome: 'Urgente', cor: '#ef4444', ordem: 0 },
  { id: 'p2', nome: 'Alta', cor: '#f97316', ordem: 1 },
  { id: 'p3', nome: 'Média', cor: '#eab308', ordem: 2 },
  { id: 'p4', nome: 'Baixa', cor: '#22c55e', ordem: 3 },
];

export const ETIQUETAS_SEED: Etiqueta[] = [
  { id: 'e-leitura', nome: 'Leitura ativa', cor: '#8b5cf6' },
  { id: 'e-celular', nome: 'Celular', cor: '#06b6d4' },
  { id: 'e-conserto', nome: 'Conserto', cor: '#f97316' },
  { id: 'e-idioma', nome: 'Idioma', cor: '#ec4899' },
  { id: 'e-habito', nome: 'Hábito diário', cor: '#10b981' },
  { id: 'e-projeto', nome: 'Projeto', cor: '#3b82f6' },
];

type MetaSeed = Omit<Meta, 'id' | 'criadaEm' | 'historico' | 'dataAlvo' | 'atualizadoEm'> & {
  id: string;
};

const RAW: MetaSeed[] = [
  // ── A fazer / curto prazo ─────────────────────────────────────────────
  {
    id: 'm-organizar-fotos',
    titulo: 'Organizar as fotos do celular',
    categoria: 'todo',
    horizonte: 'curto',
    cadencia: 'pontual',
    prioridadeId: 'p2',
    etiquetas: [],
    status: 'ativa',
    estimativaTexto: '~4 horas',
    progresso: 0,
  },

  // ── Motoras ───────────────────────────────────────────────────────────
  {
    id: 'm-digitacao',
    titulo: 'Aprender a digitar sem olhar',
    categoria: 'motora',
    horizonte: 'longo',
    cadencia: 'diaria',
    prioridadeId: 'p3',
    etiquetas: ['e-habito'],
    status: 'ativa',
    minutosPorDia: 15,
    estimativaTexto: '~6 meses',
  },

  // ── Cognitivas ────────────────────────────────────────────────────────
  {
    id: 'm-leitura',
    titulo: 'Ler um livro por mês',
    descricao: 'Leitura ativa',
    categoria: 'cognitiva',
    horizonte: 'longo',
    cadencia: 'diaria',
    prioridadeId: 'p3',
    etiquetas: ['e-leitura', 'e-habito'],
    status: 'fila',
    minutosPorDia: 15,
  },
  {
    id: 'm-idioma',
    titulo: 'Aprender um novo idioma',
    categoria: 'cognitiva',
    horizonte: 'longo',
    cadencia: 'diaria',
    prioridadeId: 'p2',
    etiquetas: ['e-idioma', 'e-habito'],
    status: 'ativa',
    minutosPorDia: 15,
    estimativaTexto: '~1 ano',
  },

  // ── Profissionais ─────────────────────────────────────────────────────
  {
    id: 'm-projeto-pessoal',
    titulo: 'Terminar o projeto pessoal',
    categoria: 'profissional',
    horizonte: 'medio',
    cadencia: 'projeto',
    prioridadeId: 'p1',
    etiquetas: ['e-projeto'],
    status: 'ativa',
    estimativaTexto: '~3 meses',
    progresso: 0,
  },
  {
    id: 'm-conserto',
    titulo: 'Consertar o notebook antigo',
    categoria: 'profissional',
    horizonte: 'curto',
    cadencia: 'pontual',
    prioridadeId: 'p4',
    etiquetas: ['e-conserto'],
    status: 'fila',
    estimativaTexto: '~1 semana',
  },

  // ── Artísticas ────────────────────────────────────────────────────────
  {
    id: 'm-violao',
    titulo: 'Praticar violão',
    categoria: 'artistica',
    horizonte: 'longo',
    cadencia: 'semanal',
    diasSemana: [2, 4],
    prioridadeId: 'p3',
    etiquetas: [],
    status: 'fila',
    minutosPorDia: 30,
  },

  // ── Físicas ───────────────────────────────────────────────────────────
  {
    id: 'm-academia',
    titulo: 'Academia',
    categoria: 'fisica',
    horizonte: 'longo',
    cadencia: 'para_sempre',
    prioridadeId: 'p2',
    etiquetas: ['e-habito'],
    status: 'ativa',
  },

  // ── Românticas ────────────────────────────────────────────────────────
  {
    id: 'm-encontro',
    titulo: 'Planejar um encontro especial',
    categoria: 'romantica',
    horizonte: 'curto',
    cadencia: 'pontual',
    prioridadeId: 'p2',
    etiquetas: [],
    status: 'fila',
    estimativaTexto: '~3 dias',
  },
];

export function metasSeed(): Meta[] {
  const criadaEm = new Date().toISOString();
  return RAW.map((m) => ({
    ...m,
    criadaEm,
    atualizadoEm: criadaEm,
    historico: [],
    diasSemana: m.diasSemana ?? [],
    subtarefas: m.subtarefas ?? [],
    dataAlvo: estimativaParaDataAlvo(m.estimativaTexto),
  }));
}

export const SEED_VERSION = 1;

// ── Demonstração (?demo) ───────────────────────────────────────────────────

/** Dias de passado inventado: o bastante para o mapa de constância ter forma. */
const DIAS_DEMO = 45;

/** 0–1 estável para o mesmo texto: a demo não muda a cada recarga. */
function sorteio(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/**
 * As metas do seed com um passado: criadas há 45 dias, com dias cumpridos nas
 * recorrentes ativas (uma sequência atual de 5 a 24 devidos, diferente em cada
 * meta, e antes dela uma falha e dias soltos) e hoje em aberto, para o
 * visitante poder marcar.
 */
export function metasDemo(metas: Meta[]): Meta[] {
  const criadaEm = new Date(Date.now() - DIAS_DEMO * 86_400_000).toISOString();
  const hoje = hojeISO();

  return metas.map((original) => {
    const m: Meta = { ...original, criadaEm };

    if (m.id === 'm-organizar-fotos') return { ...m, agendadaPara: hoje };
    if (m.id === 'm-projeto-pessoal') {
      return {
        ...m,
        subtarefas: [
          { id: 'demo-s1', titulo: 'Definir o escopo do MVP', feita: true },
          { id: 'demo-s2', titulo: 'Montar o protótipo das telas', feita: true },
          { id: 'demo-s3', titulo: 'Implementar o login', feita: false },
          { id: 'demo-s4', titulo: 'Publicar a primeira versão', feita: false },
        ],
      };
    }

    if (!ehRecorrente(m) || m.status !== 'ativa') return m;

    const sequencia = 5 + Math.floor(sorteio(m.id) * 20);
    const historico: string[] = [];
    let devidos = 0;
    for (let i = 1; i <= DIAS_DEMO; i++) {
      const dia = diaISO(-i);
      if (!devidaEm(m, dia)) continue;
      devidos++;
      if (devidos <= sequencia || (devidos > sequencia + 1 && sorteio(m.id + dia) < 0.75)) {
        historico.push(dia);
      }
    }
    return { ...m, historico: historico.sort() };
  });
}
