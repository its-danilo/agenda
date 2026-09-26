import { hojeISO } from './dates';

/**
 * Mapa de constância: agregado por dia de calendário, somando todas as metas.
 *
 * O cálculo de sequência (streak) NÃO mora aqui — ele depende da recorrência de
 * cada meta (uma meta 3x/semana não pode perder a sequência nos dias de folga)
 * e vive em `lib/recorrencia.ts`.
 */

/** Gera N dias (mais recente por último) com contagem de cumprimentos por dia. */
export function heatmap(
  historicos: string[][],
  dias = 119,
): { data: string; total: number }[] {
  const contagem = new Map<string, number>();
  for (const h of historicos) {
    for (const d of h) contagem.set(d, (contagem.get(d) ?? 0) + 1);
  }
  const resultado: { data: string; total: number }[] = [];
  const base = new Date(hojeISO() + 'T00:00:00');
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const key = hojeISO(d);
    resultado.push({ data: key, total: contagem.get(key) ?? 0 });
  }
  return resultado;
}

export function cumpridoHoje(historico: string[]): boolean {
  return historico.includes(hojeISO());
}
