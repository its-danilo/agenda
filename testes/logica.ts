/**
 * Testes da lógica pura: recorrência, sequência (streak), calendário e merge
 * da migração. Sem framework — `npm test` compila com esbuild e roda no Node.
 *
 * É aqui que moram as regras fáceis de quebrar sem perceber: uma meta 3x/semana
 * não pode perder o streak nos dias de folga, e um merge entre aparelhos não
 * pode engolir dias já cumpridos.
 */
import type { Meta } from '../src/types';
import {
  devidaEm,
  melhorStreakRecorrente,
  ocorrenciasNoIntervalo,
  progressoDe,
  rotuloRecorrencia,
  streakRecorrente,
} from '../src/lib/recorrencia';
import {
  gradeDoMes,
  semanaDe,
  somarDias,
  somarMeses,
  inicioDaSemana,
} from '../src/lib/dates';
import {
  mesclarDados,
  normalizarMeta,
} from '../src/lib/migracao';
import { metasDemo, metasSeed } from '../src/data/seed';
import { ehRecorrente } from '../src/types';
import { hojeISO } from '../src/lib/dates';
import {
  atrasadas,
  cadenciaIrreal,
  devidosSemCumprir,
  filaParada,
  paradas,
  revisar,
  semPrazo,
} from '../src/lib/revisao';

let falhas = 0;
let passes = 0;

function ok(nome: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passes++;
  } else {
    falhas++;
    console.log('  FALHOU: ' + nome, extra ?? '');
  }
}

function eq(nome: string, a: unknown, b: unknown) {
  const igual = JSON.stringify(a) === JSON.stringify(b);
  ok(nome, igual, igual ? undefined : `esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);
}

function meta(p: Partial<Meta>): Meta {
  return {
    id: 'x',
    titulo: 't',
    categoria: 'fisica',
    horizonte: 'longo',
    cadencia: 'diaria',
    prioridadeId: 'p3',
    etiquetas: [],
    status: 'ativa',
    criadaEm: '2026-01-01T00:00:00.000Z',
    historico: [],
    ...p,
  };
}

// ── datas ───────────────────────────────────────────────────────────────────
console.log('datas');
eq('inicioDaSemana(quarta 2026-09-02) = domingo 2026-08-30', inicioDaSemana('2026-09-02'), '2026-08-30');
eq('semanaDe tem 7 dias', semanaDe('2026-09-02').length, 7);
eq('semanaDe começa no domingo', semanaDe('2026-09-02')[0], '2026-08-30');
eq('somarDias atravessa o mês', somarDias('2026-01-31', 1), '2026-02-01');
eq('somarMeses 31/jan + 1 = 28/fev (2026 não é bissexto)', somarMeses('2026-01-31', 1), '2026-02-28');
eq('somarMeses 31/dez + 1 = 31/jan', somarMeses('2026-12-31', 1), '2027-01-31');

const grade = gradeDoMes('2026-09-15');
ok('gradeDoMes é múltiplo de 7', grade.length % 7 === 0, grade.length);
ok('gradeDoMes contém o 1º do mês', grade.includes('2026-09-01'));
ok('gradeDoMes contém o último do mês', grade.includes('2026-09-30'));
eq('gradeDoMes começa num domingo', new Date(grade[0] + 'T00:00:00').getDay(), 0);

// ── recorrência ─────────────────────────────────────────────────────────────
console.log('recorrencia');
// 2026-09-02 é uma quarta-feira (dia 3 da semana)
eq('sanidade: 2026-09-02 é quarta', new Date('2026-09-02T00:00:00').getDay(), 3);

const semanal = meta({ cadencia: 'semanal', diasSemana: [1, 3, 5] }); // seg, qua, sex
ok('semanal cai na quarta', devidaEm(semanal, '2026-09-02'));
ok('semanal NÃO cai na terça', !devidaEm(semanal, '2026-09-01'));
ok('semanal cai na sexta', devidaEm(semanal, '2026-09-04'));
ok('semanal NÃO cai no sábado', !devidaEm(semanal, '2026-09-05'));

const semanalVazia = meta({ cadencia: 'semanal', diasSemana: [] });
ok('semanal sem dias marcados vale todo dia', devidaEm(semanalVazia, '2026-09-05'));

const mensal31 = meta({ cadencia: 'mensal', diaDoMes: 31 });
ok('mensal dia 31 cai em 31 de janeiro', devidaEm(mensal31, '2026-01-31'));
ok('mensal dia 31 cai no último dia de fevereiro', devidaEm(mensal31, '2026-02-28'));
ok('mensal dia 31 NÃO cai em 27 de fevereiro', !devidaEm(mensal31, '2026-02-27'));

const diaria = meta({ cadencia: 'diaria' });
ok('diaria cai todo dia', devidaEm(diaria, '2026-09-05') && devidaEm(diaria, '2026-09-06'));

const pontual = meta({ cadencia: 'pontual' });
ok('pontual não é recorrente', !devidaEm(pontual, '2026-09-05'));

eq('rótulo semanal', rotuloRecorrencia(semanal), '3x/sem · seg, qua, sex');
eq('rótulo mensal', rotuloRecorrencia(mensal31), 'todo dia 31');

// ── streak ──────────────────────────────────────────────────────────────────
console.log('streak');
// Meta 3x/semana (seg/qua/sex), avaliada numa sexta 2026-09-04.
const hoje = '2026-09-04'; // sexta
const semanalFeita = meta({
  cadencia: 'semanal',
  diasSemana: [1, 3, 5],
  criadaEm: '2026-08-01T00:00:00.000Z',
  historico: ['2026-08-24', '2026-08-26', '2026-08-28', '2026-08-31', '2026-09-02', '2026-09-04'],
});
eq('streak semanal conta 6 ocorrências seguidas', streakRecorrente(semanalFeita, hoje), 6);

const semanalPulouHoje = meta({
  ...semanalFeita,
  historico: ['2026-08-24', '2026-08-26', '2026-08-28', '2026-08-31', '2026-09-02'],
});
eq(
  'dia de hoje ainda não feito NÃO zera a sequência anterior',
  streakRecorrente(semanalPulouHoje, hoje),
  5,
);

const semanalFalhou = meta({
  ...semanalFeita,
  historico: ['2026-08-24', '2026-08-26', '2026-08-31', '2026-09-02', '2026-09-04'],
}); // faltou 2026-08-28
eq('falha num dia devido interrompe a sequência', streakRecorrente(semanalFalhou, hoje), 3);

// O ponto central da correção: dias de folga não podem zerar o streak.
const semanalFolgaNoMeio = meta({
  cadencia: 'semanal',
  diasSemana: [1], // só segundas
  criadaEm: '2026-08-01T00:00:00.000Z',
  historico: ['2026-08-17', '2026-08-24', '2026-08-31'],
});
eq(
  'meta 1x/semana mantém streak apesar dos 6 dias de folga',
  streakRecorrente(semanalFolgaNoMeio, '2026-09-02'),
  3,
);

const diariaSeguida = meta({
  cadencia: 'diaria',
  criadaEm: '2026-08-30T00:00:00.000Z',
  historico: ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'],
});
eq('streak diária', streakRecorrente(diariaSeguida, '2026-09-04'), 4);
eq('melhor streak diária', melhorStreakRecorrente(diariaSeguida), 4);
eq('streak de meta sem histórico', streakRecorrente(meta({}), hoje), 0);

// ── ocorrências / agenda ────────────────────────────────────────────────────
console.log('agenda');
eq(
  'ocorrências da semanal numa semana',
  ocorrenciasNoIntervalo(semanal, '2026-08-30', '2026-09-05'),
  ['2026-08-31', '2026-09-02', '2026-09-04'],
);
eq(
  'tarefa pontual aparece no dia agendado',
  ocorrenciasNoIntervalo(
    meta({ cadencia: 'pontual', agendadaPara: '2026-09-03', dataAlvo: '2026-09-10' }),
    '2026-08-30',
    '2026-09-05',
  ),
  ['2026-09-03'],
);
eq(
  'sem dia agendado, a tarefa cai no prazo',
  ocorrenciasNoIntervalo(
    meta({ cadencia: 'projeto', dataAlvo: '2026-09-03' }),
    '2026-08-30',
    '2026-09-05',
  ),
  ['2026-09-03'],
);
eq(
  'meta recorrente na fila não ocupa a agenda',
  ocorrenciasNoIntervalo(meta({ cadencia: 'diaria', status: 'fila' }), '2026-09-01', '2026-09-03'),
  [],
);

// ── progresso ───────────────────────────────────────────────────────────────
console.log('progresso');
eq(
  'progresso vem das subtarefas quando existem',
  progressoDe(
    meta({
      progresso: 10,
      subtarefas: [
        { id: 'a', titulo: 'a', feita: true },
        { id: 'b', titulo: 'b', feita: true },
        { id: 'c', titulo: 'c', feita: false },
        { id: 'd', titulo: 'd', feita: false },
      ],
    }),
  ),
  50,
);
eq('sem subtarefas usa o valor manual', progressoDe(meta({ progresso: 35 })), 35);

// ── migração ────────────────────────────────────────────────────────────────
console.log('migracao');
const antiga = {
  id: 'm1',
  titulo: 'Consertar o teclado',
  categoria: 'profissional',
  horizonte: 'longo',
  cadencia: 'pontual',
  prioridadeId: 'p3',
  etiquetas: ['e-conserto'],
  status: 'fila',
  criadaEm: '2026-01-01T00:00:00.000Z',
  historico: ['2026-01-02', '2026-01-02'],
  dataAlvo: '2026-09-10',
};
const norm = normalizarMeta(antiga);
eq('horizonte inferido pelo prazo curto', norm.horizonte, 'curto');
eq('histórico deduplicado', norm.historico, ['2026-01-02']);
eq('subtarefas default', norm.subtarefas, []);
eq('atualizadoEm cai para criadaEm', norm.atualizadoEm, '2026-01-01T00:00:00.000Z');

eq(
  'categoria "todo" sempre é curto prazo',
  normalizarMeta({ ...antiga, categoria: 'todo', dataAlvo: undefined }).horizonte,
  'curto',
);
eq(
  'prazo de ~4 meses vira médio',
  normalizarMeta({ ...antiga, dataAlvo: somarDias(new Date().toISOString().slice(0, 10), 120) })
    .horizonte,
  'medio',
);

const nuvem = {
  versao: 2,
  exportadoEm: '',
  limiteFoco: 6,
  etiquetas: [],
  prioridades: [],
  metas: [
    normalizarMeta({
      ...antiga,
      historico: ['2026-01-02'],
      atualizadoEm: '2026-05-01T00:00:00.000Z',
      titulo: 'Versão da nuvem',
    }),
  ],
};
const aparelho = {
  versao: 2,
  exportadoEm: '',
  limiteFoco: 6,
  etiquetas: [],
  prioridades: [],
  metas: [
    normalizarMeta({
      ...antiga,
      historico: ['2026-01-03', '2026-01-04'],
      atualizadoEm: '2026-06-01T00:00:00.000Z',
      titulo: 'Versão do celular',
    }),
    normalizarMeta({ ...antiga, id: 'm2', titulo: 'Só no celular' }),
  ],
};
const fundido = mesclarDados(nuvem, aparelho);
eq('merge mantém as duas metas', fundido.metas.length, 2);
const m1 = fundido.metas.find((m) => m.id === 'm1')!;
eq('vence a versão mais recente', m1.titulo, 'Versão do celular');
eq('histórico é a UNIÃO dos dois lados', m1.historico, ['2026-01-02', '2026-01-03', '2026-01-04']);
ok('meta que só existia no celular sobrevive', fundido.metas.some((m) => m.id === 'm2'));

// ── revisão ─────────────────────────────────────────────────────────────────
console.log('revisao');
{
  const hojeRev = '2026-09-04'; // sexta

  eq(
    'meta vencida entra em Atrasadas',
    atrasadas([meta({ id: 'v', dataAlvo: '2026-09-01' })], hojeRev).map((m) => m.id),
    ['v'],
  );
  eq(
    'meta concluida nao entra em Atrasadas',
    atrasadas([meta({ id: 'v', dataAlvo: '2026-09-01', status: 'concluida' })], hojeRev).length,
    0,
  );
  eq(
    'prazo no futuro nao entra em Atrasadas',
    atrasadas([meta({ id: 'v', dataAlvo: '2026-09-30' })], hojeRev).length,
    0,
  );

  // O caso real do usuario: estimativa "6" que nunca virou prazo.
  eq(
    'tarefa sem nenhuma data entra em Sem prazo',
    semPrazo([meta({ id: 's', cadencia: 'projeto', estimativaTexto: '6' })]).map((m) => m.id),
    ['s'],
  );
  eq(
    'tarefa com dia agendado NAO entra em Sem prazo',
    semPrazo([meta({ id: 's', cadencia: 'projeto', agendadaPara: '2026-09-10' })]).length,
    0,
  );
  eq(
    'meta recorrente nunca entra em Sem prazo',
    semPrazo([meta({ id: 's', cadencia: 'diaria' })]).length,
    0,
  );
  eq(
    'tarefa na fila e sem data tambem conta como sem prazo',
    semPrazo([meta({ id: 'f', cadencia: 'pontual', status: 'fila' })]).length,
    1,
  );

  // Uma semanal so conta as ocorrencias, nao os dias de folga.
  const semanalParada = meta({
    id: 'p',
    cadencia: 'semanal',
    diasSemana: [1],
    criadaEm: '2026-06-01T00:00:00.000Z',
    historico: ['2026-08-31'],
  });
  eq('devidosSemCumprir ignora dias de folga', devidosSemCumprir(semanalParada, hojeRev), 0);
  eq(
    'apos 8 segundas sem cumprir, vira parada',
    paradas([semanalParada], '2026-10-27').length,
    1,
  );

  // Cadencia irreal: diaria com 3 de 14 dias cumpridos, sempre em seg/qua.
  const diariaFraca = meta({
    id: 'c',
    cadencia: 'diaria',
    criadaEm: '2026-07-01T00:00:00.000Z',
    historico: ['2026-08-24', '2026-08-26', '2026-08-31'], // seg, qua, seg
  });
  const irreal = cadenciaIrreal([diariaFraca], hojeRev);
  eq('diaria com baixa adesao entra em Cadencia irreal', irreal.length, 1);
  eq('adesao medida na janela de 14 dias', [irreal[0].feitos, irreal[0].devidos], [3, 14]);
  eq('sugere exatamente os dias em que cumpriu', irreal[0].diasSugeridos, [1, 3]);

  const diariaForte = meta({
    id: 'f',
    cadencia: 'diaria',
    criadaEm: '2026-07-01T00:00:00.000Z',
    historico: Array.from({ length: 12 }, (_, i) => somarDias(hojeRev, -i)),
  });
  eq('diaria com boa adesao nao aparece', cadenciaIrreal([diariaForte], hojeRev).length, 0);

  eq(
    'meta sem nenhum cumprimento nao vira sugestao de semanal',
    cadenciaIrreal([meta({ id: 'z', cadencia: 'diaria', historico: [] })], hojeRev).length,
    0,
  );

  // Fila parada
  const comVaga = [
    meta({ id: 'a1', cadencia: 'pontual', status: 'ativa', dataAlvo: '2026-12-01' }),
    meta({ id: 'q1', cadencia: 'pontual', status: 'fila', dataAlvo: '2026-12-01' }),
    meta({ id: 'q2', cadencia: 'pontual', status: 'fila', dataAlvo: '2026-12-01' }),
  ];
  eq('sugere puxar da fila quando ha vaga', filaParada(comVaga, 3).map((m) => m.id), ['q1', 'q2']);
  eq('limite cheio nao sugere nada', filaParada(comVaga, 1).length, 0);

  // Uma recorrente ativa que nunca teve check-in conta como parada.
  eq(
    'diaria ativa sem nenhum cumprimento entra em paradas',
    paradas([meta({ id: 'n', cadencia: 'diaria', status: 'ativa' })], hojeRev).length,
    1,
  );

  // Resumo: 1 atrasada + 1 sem prazo. A fila (q1/q2) e sugestao, nao pendencia.
  const r = revisar(
    [
      meta({ id: 'v', cadencia: 'pontual', dataAlvo: '2026-09-01' }),
      meta({ id: 's', cadencia: 'projeto' }),
      ...comVaga,
    ],
    5,
    hojeRev,
  );
  eq('total soma apenas as pendencias reais', r.total, 2);
  ok('fila parada nao entra no total', r.filaParada.length > 0 && r.total === 2);
}

// ── Demonstração ──────────────────────────────────────────────────────────
{
  const demo = metasDemo(metasSeed());
  const hojeDemo = hojeISO();
  const ativas = demo.filter((m) => ehRecorrente(m) && m.status === 'ativa');

  ok('demo tem recorrentes ativas com passado', ativas.length > 0 && ativas.every((m) => m.historico.length > 0));
  ok('demo deixa hoje em aberto', demo.every((m) => !m.historico.includes(hojeDemo)));
  ok('demo so cumpre dias devidos', demo.every((m) => m.historico.every((d) => devidaEm(m, d))));
  ok('demo abre com sequencia de pelo menos 5', ativas.every((m) => streakRecorrente(m) >= 5));
  ok(
    'demo nao inventa passado para o que esta na fila',
    demo.filter((m) => m.status !== 'ativa').every((m) => m.historico.length === 0),
  );
  eq('demo e estavel entre recargas', JSON.stringify(metasDemo(metasSeed()).map((m) => m.historico)), JSON.stringify(demo.map((m) => m.historico)));
}

console.log('');
console.log(`${passes} passaram, ${falhas} falharam`);
if (falhas) process.exit(1);
