export type Horizonte = 'curto' | 'medio' | 'longo';

export type Categoria =
  | 'todo'
  | 'motora'
  | 'cognitiva'
  | 'profissional'
  | 'artistica'
  | 'fisica'
  | 'romantica';

export type Cadencia =
  | 'diaria'
  | 'semanal'
  | 'mensal'
  | 'pontual'
  | 'para_sempre'
  | 'projeto';

export type Status = 'fila' | 'ativa' | 'pausada' | 'concluida';

export interface Prioridade {
  id: string;
  nome: string;
  cor: string; // hex
  ordem: number; // 0 = mais alta
  atualizadoEm?: string; // ISO — usado pela sincronização
}

export interface Etiqueta {
  id: string;
  nome: string;
  cor: string; // hex
  atualizadoEm?: string; // ISO — usado pela sincronização
}

export interface Subtarefa {
  id: string;
  titulo: string;
  feita: boolean;
}

export interface Meta {
  id: string;
  titulo: string;
  descricao?: string;
  categoria: Categoria;
  horizonte: Horizonte;
  cadencia: Cadencia;
  diasSemana?: number[]; // 0=domingo … 6=sábado (cadência semanal)
  diaDoMes?: number; // 1–31 (cadência mensal)
  prioridadeId: string;
  etiquetas: string[]; // ids de Etiqueta
  status: Status;
  minutosPorDia?: number;
  estimativaTexto?: string; // ex.: "~6 meses"
  dataAlvo?: string; // ISO 'YYYY-MM-DD' — prazo final
  agendadaPara?: string; // ISO 'YYYY-MM-DD' — dia marcado na agenda
  notas?: string;
  subtarefas?: Subtarefa[];
  criadaEm: string; // ISO
  historico: string[]; // datas 'YYYY-MM-DD' em que foi cumprida
  progresso?: number; // 0–100 (usado quando não há subtarefas)
  atualizadoEm?: string; // ISO — usado pela sincronização
}

export interface CategoriaMeta {
  id: Categoria;
  nome: string;
  emoji: string;
  descricao: string;
}

export const CATEGORIAS: CategoriaMeta[] = [
  { id: 'todo', nome: 'A fazer', emoji: '⚡', descricao: 'Tarefas avulsas' },
  { id: 'motora', nome: 'Motoras', emoji: '⌨️', descricao: 'Habilidades motoras' },
  { id: 'cognitiva', nome: 'Cognitivas', emoji: '🧠', descricao: 'Leitura e aprendizado' },
  { id: 'profissional', nome: 'Profissionais', emoji: '💼', descricao: 'Projetos e consertos' },
  { id: 'artistica', nome: 'Artísticas', emoji: '🎨', descricao: 'Arte e expressão' },
  { id: 'fisica', nome: 'Físicas', emoji: '💪', descricao: 'Corpo e saúde' },
  { id: 'romantica', nome: 'Românticas', emoji: '❤️', descricao: 'Relacionamento' },
];

export const CADENCIAS: Record<Cadencia, { nome: string; emoji: string; descricao: string }> = {
  diaria: { nome: 'Diária', emoji: '🔁', descricao: 'Todo dia' },
  semanal: { nome: 'Semanal', emoji: '📅', descricao: 'Em dias escolhidos da semana' },
  mensal: { nome: 'Mensal', emoji: '🗓️', descricao: 'Um dia por mês' },
  pontual: { nome: 'Pontual', emoji: '📌', descricao: 'Uma vez só' },
  para_sempre: { nome: 'Para sempre', emoji: '♾️', descricao: 'Hábito permanente, todo dia' },
  projeto: { nome: 'Projeto', emoji: '🚧', descricao: 'Trabalho longo, com etapas' },
};

export const HORIZONTES: Record<Horizonte, { nome: string; emoji: string; descricao: string; cor: string }> = {
  curto: { nome: 'Curto prazo', emoji: '⚡', descricao: 'Dias a poucas semanas', cor: '#f97316' },
  medio: { nome: 'Médio prazo', emoji: '🌱', descricao: 'Semanas a poucos meses', cor: '#3b82f6' },
  longo: { nome: 'Longo prazo', emoji: '🌳', descricao: 'Meses a anos', cor: '#8b5cf6' },
};

export const ORDEM_HORIZONTES: Horizonte[] = ['curto', 'medio', 'longo'];

export const STATUS_INFO: Record<Status, { nome: string; cor: string }> = {
  fila: { nome: 'Na fila', cor: '#64748b' },
  ativa: { nome: 'Ativa', cor: '#3b82f6' },
  pausada: { nome: 'Pausada', cor: '#a16207' },
  concluida: { nome: 'Concluída', cor: '#22c55e' },
};

/** Cadências que se repetem — geram check-in diário/semanal/mensal e streak. */
export const CADENCIAS_RECORRENTES: Cadencia[] = ['diaria', 'semanal', 'mensal', 'para_sempre'];

/** Cadências com data de entrega — usam progresso/subtarefas em vez de streak. */
export const CADENCIAS_TAREFA: Cadencia[] = ['pontual', 'projeto'];

export const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const INICIAIS_DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function ehRecorrente(m: Meta): boolean {
  return CADENCIAS_RECORRENTES.includes(m.cadencia);
}

export function ehTarefa(m: Meta): boolean {
  return CADENCIAS_TAREFA.includes(m.cadencia);
}
