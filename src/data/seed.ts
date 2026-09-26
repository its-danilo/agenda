import type { Etiqueta, Meta, Prioridade } from '../types';
import { estimativaParaDataAlvo } from '../lib/dates';

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
