import type { Meta } from '../types';
import { ehRecorrente } from '../types';
import { diaDaSemana, hojeISO, paraData, somarDias, ultimoDiaDoMes } from './dates';

/**
 * A meta recorrente "cai" nesse dia?
 *
 * - diária / para sempre → todo dia
 * - semanal → nos dias marcados em `diasSemana` (0=domingo … 6=sábado).
 *   Sem nenhum dia marcado, vale todo dia — assim uma meta nunca some da tela
 *   por configuração incompleta.
 * - mensal → no `diaDoMes`; se o mês for curto demais (dia 31 em fevereiro),
 *   cai no último dia do mês.
 * - pontual / projeto → não são recorrentes; elas se guiam por `agendadaPara`
 *   e `dataAlvo`, não por esta função.
 */
export function devidaEm(m: Meta, iso: string): boolean {
  if (!ehRecorrente(m)) return false;

  switch (m.cadencia) {
    case 'diaria':
    case 'para_sempre':
      return true;

    case 'semanal': {
      const dias = m.diasSemana ?? [];
      if (!dias.length) return true;
      return dias.includes(diaDaSemana(iso));
    }

    case 'mensal': {
      const d = paraData(iso);
      const alvo = m.diaDoMes ?? paraData(m.criadaEm.slice(0, 10)).getDate();
      const ultimo = ultimoDiaDoMes(d.getFullYear(), d.getMonth());
      return d.getDate() === Math.min(alvo, ultimo);
    }

    default:
      return false;
  }
}

export function devidaHoje(m: Meta): boolean {
  return devidaEm(m, hojeISO());
}

export function cumpridaEm(m: Meta, iso: string): boolean {
  return m.historico.includes(iso);
}

/**
 * Streak contado apenas sobre os dias em que a meta era devida.
 *
 * Uma meta 3x/semana não pode perder a sequência nos dias de folga — por isso
 * este cálculo pula os dias não agendados, diferente de `streakAtual`, que
 * conta dias de calendário e só serve para cadência diária.
 */
export function streakRecorrente(m: Meta, ate: string = hojeISO()): number {
  if (!ehRecorrente(m) || !m.historico.length) return 0;

  const feitos = new Set(m.historico);
  const inicio = m.criadaEm.slice(0, 10);
  let cursor = ate;
  let streak = 0;
  let devidosVistos = 0;

  // Teto de segurança: 3 anos de calendário ou 400 ocorrências.
  for (let i = 0; i < 1100 && devidosVistos < 400; i++) {
    if (cursor < inicio && !feitos.has(cursor)) break;

    if (devidaEm(m, cursor)) {
      devidosVistos++;
      if (feitos.has(cursor)) {
        streak++;
      } else if (cursor !== ate) {
        // Falhou num dia devido que já passou: a sequência acabou.
        break;
      }
      // Se for o próprio dia `ate` e ainda não foi feito, a sequência dos dias
      // anteriores continua valendo — o dia ainda não terminou.
    }
    cursor = somarDias(cursor, -1);
  }

  return streak;
}

/** Datas em que a meta aparece na agenda dentro do intervalo (inclusivo). */
export function ocorrenciasNoIntervalo(m: Meta, inicio: string, fim: string): string[] {
  const datas: string[] = [];

  if (ehRecorrente(m)) {
    if (m.status !== 'ativa') return datas;
    let cursor = inicio;
    while (cursor <= fim) {
      if (devidaEm(m, cursor)) datas.push(cursor);
      cursor = somarDias(cursor, 1);
    }
    return datas;
  }

  // Tarefas e projetos aparecem no dia agendado; sem dia agendado, no prazo.
  const dia = m.agendadaPara ?? m.dataAlvo;
  if (dia && dia >= inicio && dia <= fim) datas.push(dia);
  return datas;
}

/** Progresso 0–100: derivado das subtarefas quando existem, senão o manual. */
export function progressoDe(m: Meta): number {
  const subs = m.subtarefas ?? [];
  if (subs.length) {
    return Math.round((subs.filter((s) => s.feita).length / subs.length) * 100);
  }
  return m.progresso ?? 0;
}

export function temSubtarefas(m: Meta): boolean {
  return (m.subtarefas?.length ?? 0) > 0;
}

/** Descrição curta da recorrência, para mostrar nos cards. */
export function rotuloRecorrencia(m: Meta): string | undefined {
  if (m.cadencia === 'semanal') {
    const dias = m.diasSemana ?? [];
    if (!dias.length) return 'todo dia';
    if (dias.length === 7) return 'todo dia';
    const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    return `${dias.length}x/sem · ${[...dias].sort().map((d) => nomes[d]).join(', ')}`;
  }
  if (m.cadencia === 'mensal') {
    return m.diaDoMes ? `todo dia ${m.diaDoMes}` : 'mensal';
  }
  return undefined;
}

/** Melhor sequência histórica, contada só sobre os dias devidos. */
export function melhorStreakRecorrente(m: Meta): number {
  if (!ehRecorrente(m) || !m.historico.length) return 0;

  const feitos = new Set(m.historico);
  const primeiro = [...m.historico].sort()[0];
  const inicio = primeiro < m.criadaEm.slice(0, 10) ? primeiro : m.criadaEm.slice(0, 10);
  const fim = hojeISO();

  let melhor = 0;
  let atual = 0;
  let cursor = inicio;

  for (let i = 0; i < 1100 && cursor <= fim; i++) {
    if (devidaEm(m, cursor)) {
      if (feitos.has(cursor)) {
        atual++;
        if (atual > melhor) melhor = atual;
      } else if (cursor !== fim) {
        atual = 0;
      }
    }
    cursor = somarDias(cursor, 1);
  }

  return melhor;
}
