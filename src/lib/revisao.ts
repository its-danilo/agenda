import type { Meta } from '../types';
import { ehRecorrente, ehTarefa } from '../types';
import { devidaEm } from './recorrencia';
import { diaDaSemana, hojeISO, somarDias } from './dates';

/**
 * Regras da tela de Revisão.
 *
 * O objetivo é forçar, uma vez por semana, as decisões que não acontecem sozinhas:
 * o que venceu, o que ficou sem prazo, o que parou e o que está cadastrado numa
 * cadência que a pessoa não consegue sustentar. Tudo aqui é função pura sobre a
 * lista de metas, para poder ser testado sem navegador.
 */

/** Prazo já passou e a meta não foi concluída. */
export function atrasadas(metas: Meta[], hoje: string = hojeISO()): Meta[] {
  return metas
    .filter((m) => m.status !== 'concluida' && m.dataAlvo !== undefined && m.dataAlvo < hoje)
    .sort((a, b) => (a.dataAlvo ?? '').localeCompare(b.dataAlvo ?? ''));
}

/**
 * Tarefas e projetos sem nenhuma data. Metas recorrentes ficam de fora: elas se
 * guiam pela repetição, não por prazo.
 */
export function semPrazo(metas: Meta[]): Meta[] {
  return metas.filter(
    (m) => ehTarefa(m) && m.status !== 'concluida' && !m.dataAlvo && !m.agendadaPara,
  );
}

/**
 * Quantos dias devidos passaram desde o último cumprimento (contando hoje).
 * Para uma meta 3x/semana, cinco dias de folga não contam — só as ocorrências.
 */
export function devidosSemCumprir(m: Meta, ate: string = hojeISO()): number {
  if (!ehRecorrente(m)) return 0;
  const feitos = new Set(m.historico);
  const inicio = m.criadaEm.slice(0, 10);
  let cursor = ate;
  let conta = 0;

  for (let i = 0; i < 800 && cursor >= inicio; i++) {
    if (devidaEm(m, cursor)) {
      if (feitos.has(cursor)) break;
      conta++;
    }
    cursor = somarDias(cursor, -1);
  }
  return conta;
}

export const LIMITE_PARADA = 7;

/** Metas recorrentes ativas que passaram de {@link LIMITE_PARADA} ocorrências sem check-in. */
export function paradas(
  metas: Meta[],
  ate: string = hojeISO(),
): { meta: Meta; devidosSemCumprir: number }[] {
  return metas
    .filter((m) => m.status === 'ativa' && ehRecorrente(m))
    .map((meta) => ({ meta, devidosSemCumprir: devidosSemCumprir(meta, ate) }))
    .filter((x) => x.devidosSemCumprir >= LIMITE_PARADA)
    .sort((a, b) => b.devidosSemCumprir - a.devidosSemCumprir);
}

/** Ocorrências devidas e cumpridas numa janela de N dias terminando em `ate`. */
export function aderencia(
  m: Meta,
  dias = 14,
  ate: string = hojeISO(),
): { devidos: number; feitos: number } {
  const feitos = new Set(m.historico);
  let cursor = ate;
  let d = 0;
  let f = 0;

  for (let i = 0; i < dias; i++) {
    if (devidaEm(m, cursor)) {
      d++;
      if (feitos.has(cursor)) f++;
    }
    cursor = somarDias(cursor, -1);
  }
  return { devidos: d, feitos: f };
}

/** Dias da semana em que a meta foi de fato cumprida na janela recente. */
export function diasQueCumpriu(m: Meta, dias = 28, ate: string = hojeISO()): number[] {
  const limite = somarDias(ate, -(dias - 1));
  const encontrados = new Set<number>();
  for (const d of m.historico) {
    if (d >= limite && d <= ate) encontrados.add(diaDaSemana(d));
  }
  return [...encontrados].sort((a, b) => a - b);
}

export const ADERENCIA_MINIMA = 0.5;

/**
 * Metas diárias (ou "para sempre") que a pessoa claramente não sustenta, com a
 * sugestão de virar semanal justamente nos dias em que ela realmente cumpre.
 *
 * Só entra quem já tem algum histórico: sem nenhum cumprimento não há como
 * sugerir dias, e o caso cai em {@link paradas}.
 */
export function cadenciaIrreal(
  metas: Meta[],
  ate: string = hojeISO(),
): { meta: Meta; devidos: number; feitos: number; diasSugeridos: number[] }[] {
  return metas
    .filter(
      (m) =>
        m.status === 'ativa' &&
        (m.cadencia === 'diaria' || m.cadencia === 'para_sempre') &&
        m.historico.length > 0,
    )
    .map((meta) => {
      const { devidos, feitos } = aderencia(meta, 14, ate);
      return { meta, devidos, feitos, diasSugeridos: diasQueCumpriu(meta, 28, ate) };
    })
    .filter(
      (x) =>
        x.devidos >= 14 &&
        x.feitos > 0 &&
        x.feitos / x.devidos < ADERENCIA_MINIMA &&
        x.diasSugeridos.length > 0 &&
        x.diasSugeridos.length < 7,
    );
}

/** Há espaço no limite de foco e gente esperando na fila. */
export function filaParada(metas: Meta[], limiteFoco: number): Meta[] {
  const ativas = metas.filter((m) => m.status === 'ativa').length;
  const vagas = limiteFoco - ativas;
  if (vagas <= 0) return [];
  return metas.filter((m) => m.status === 'fila').slice(0, vagas);
}

export interface Revisao {
  atrasadas: Meta[];
  semPrazo: Meta[];
  paradas: { meta: Meta; devidosSemCumprir: number }[];
  cadenciaIrreal: { meta: Meta; devidos: number; feitos: number; diasSugeridos: number[] }[];
  filaParada: Meta[];
  total: number;
}

export function revisar(metas: Meta[], limiteFoco: number, hoje: string = hojeISO()): Revisao {
  const r = {
    atrasadas: atrasadas(metas, hoje),
    semPrazo: semPrazo(metas),
    paradas: paradas(metas, hoje),
    cadenciaIrreal: cadenciaIrreal(metas, hoje),
    filaParada: filaParada(metas, limiteFoco),
  };
  // A fila parada é sugestão, não pendência: não conta para a faixa de aviso.
  return {
    ...r,
    total: r.atrasadas.length + r.semPrazo.length + r.paradas.length + r.cadenciaIrreal.length,
  };
}
