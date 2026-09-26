// Utilitários de data — sem dependências externas.

/** Retorna 'YYYY-MM-DD' no fuso local. */
export function hojeISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function diaISO(offsetDias: number, base: Date = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDias);
  return hojeISO(d);
}

/** Converte "~6 meses", "~7 dias", "~1 ano", "~4 horas" numa data alvo ISO. */
export function estimativaParaDataAlvo(
  texto: string | undefined,
  base: Date = new Date(),
): string | undefined {
  if (!texto) return undefined;
  const t = texto.toLowerCase();
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(hora|dia|semana|m[êe]s|mes|ano)/);
  if (!m) return undefined;
  const n = parseFloat(m[1].replace(',', '.'));
  const unidade = m[2];
  const d = new Date(base);
  if (unidade.startsWith('hora')) return hojeISO(d); // horas => hoje/amanhã
  if (unidade.startsWith('dia')) d.setDate(d.getDate() + n);
  else if (unidade.startsWith('semana')) d.setDate(d.getDate() + n * 7);
  else if (unidade.startsWith('m')) d.setMonth(d.getMonth() + n);
  else if (unidade.startsWith('ano')) d.setFullYear(d.getFullYear() + n);
  return hojeISO(d);
}

/** Dias restantes até a data alvo (negativo = atrasado). */
export function diasRestantes(dataAlvoISO?: string): number | undefined {
  if (!dataAlvoISO) return undefined;
  const alvo = new Date(dataAlvoISO + 'T00:00:00');
  const hoje = new Date(hojeISO() + 'T00:00:00');
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

export function formatarData(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function rotuloPrazo(dataAlvoISO?: string): string | undefined {
  const d = diasRestantes(dataAlvoISO);
  if (d === undefined) return undefined;
  if (d < 0) return `Atrasado ${Math.abs(d)}d`;
  if (d === 0) return 'Vence hoje';
  if (d === 1) return 'Vence amanhã';
  if (d < 30) return `Faltam ${d} dias`;
  if (d < 365) {
    const meses = Math.round(d / 30);
    return meses === 1 ? 'Falta 1 mês' : `Faltam ${meses} meses`;
  }
  const anos = Math.round((d / 365) * 10) / 10;
  const txt = Number.isInteger(anos) ? String(anos) : anos.toFixed(1).replace('.', ',');
  return anos === 1 ? 'Falta 1 ano' : `Faltam ${txt} anos`;
}

// ── helpers de calendário (views Semana / Mês) ───────────────────────────────

/** Converte 'YYYY-MM-DD' em Date local (evita o off-by-one do fuso do `new Date(iso)`). */
export function paraData(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

export function somarDias(iso: string, n: number): string {
  const d = paraData(iso);
  d.setDate(d.getDate() + n);
  return hojeISO(d);
}

export function somarMeses(iso: string, n: number): string {
  const d = paraData(iso);
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  // Mantém o dia sem transbordar (31 de janeiro + 1 mês = 28/29 de fevereiro).
  d.setDate(Math.min(dia, ultimoDiaDoMes(d.getFullYear(), d.getMonth())));
  return hojeISO(d);
}

export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

/** Domingo da semana que contém a data. */
export function inicioDaSemana(iso: string): string {
  const d = paraData(iso);
  d.setDate(d.getDate() - d.getDay());
  return hojeISO(d);
}

/** Os 7 dias (domingo→sábado) da semana que contém a data. */
export function semanaDe(iso: string): string[] {
  const inicio = inicioDaSemana(iso);
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
}

/**
 * Grade do mês para o calendário: sempre semanas completas de domingo a sábado,
 * incluindo os dias vizinhos que completam a primeira e a última linha.
 */
export function gradeDoMes(iso: string): string[] {
  const d = paraData(iso);
  const primeiro = hojeISO(new Date(d.getFullYear(), d.getMonth(), 1));
  const ultimo = hojeISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const inicio = inicioDaSemana(primeiro);
  const dias: string[] = [];
  let cursor = inicio;
  do {
    dias.push(cursor);
    cursor = somarDias(cursor, 1);
  } while (cursor <= ultimo || dias.length % 7 !== 0);
  return dias;
}

export function ehDoMes(iso: string, refISO: string): boolean {
  return iso.slice(0, 7) === refISO.slice(0, 7);
}

export function nomeMesAno(iso: string): string {
  return paraData(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function diaDoMesNumero(iso: string): number {
  return paraData(iso).getDate();
}

export function diaDaSemana(iso: string): number {
  return paraData(iso).getDay();
}

export function rotuloDiaRelativo(iso: string): string {
  const hoje = hojeISO();
  if (iso === hoje) return 'Hoje';
  if (iso === somarDias(hoje, 1)) return 'Amanhã';
  if (iso === somarDias(hoje, -1)) return 'Ontem';
  return paraData(iso).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}
