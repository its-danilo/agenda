import { useMemo, useState } from 'react';
import type { Meta } from '../../types';
import { CATEGORIAS, NOMES_DIAS, ehRecorrente } from '../../types';
import { prioridadeDe, useStore } from '../../store';
import { MetaCard } from '../MetaCard';
import { ocorrenciasNoIntervalo, progressoDe } from '../../lib/recorrencia';
import {
  diaDoMesNumero,
  ehDoMes,
  gradeDoMes,
  hojeISO,
  nomeMesAno,
  paraData,
  rotuloDiaRelativo,
  semanaDe,
  somarDias,
  somarMeses,
} from '../../lib/dates';

type Modo = 'semana' | 'mes';

/** "30 de ago – 5 de set de 2026", encurtado quando não cruza o mês. */
function intervaloSemana(inicio: string, fim: string): string {
  const mes = (iso: string) => paraData(iso).toLocaleDateString('pt-BR', { month: 'short' });
  const ano = paraData(fim).getFullYear();
  if (inicio.slice(0, 7) === fim.slice(0, 7)) {
    return `${diaDoMesNumero(inicio)}–${diaDoMesNumero(fim)} de ${mes(fim)} de ${ano}`;
  }
  return `${diaDoMesNumero(inicio)} de ${mes(inicio)} – ${diaDoMesNumero(fim)} de ${mes(fim)} de ${ano}`;
}

export function Agenda({ onEditar }: { onEditar: (m: Meta) => void }) {
  const { metas, prioridades } = useStore();
  const hoje = hojeISO();

  const [modo, setModo] = useState<Modo>('semana');
  const [ref, setRef] = useState(hoje);
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);

  const dias = useMemo(() => (modo === 'semana' ? semanaDe(ref) : gradeDoMes(ref)), [modo, ref]);

  /** dia ISO → metas que caem nele (hábitos recorrentes + tarefas agendadas). */
  const porDia = useMemo(() => {
    const inicio = dias[0];
    const fim = dias[dias.length - 1];
    const mapa = new Map<string, Meta[]>();
    const ordem = (m: Meta) => prioridadeDe(m.prioridadeId, prioridades).ordem;

    for (const m of metas) {
      if (m.status === 'concluida' || m.status === 'pausada') continue;
      for (const d of ocorrenciasNoIntervalo(m, inicio, fim)) {
        const lista = mapa.get(d) ?? [];
        lista.push(m);
        mapa.set(d, lista);
      }
    }
    for (const lista of mapa.values()) lista.sort((a, b) => ordem(a) - ordem(b));
    return mapa;
  }, [metas, prioridades, dias]);

  const atrasadas = useMemo(
    () =>
      metas
        .filter(
          (m) =>
            m.status === 'ativa' &&
            !ehRecorrente(m) &&
            m.dataAlvo !== undefined &&
            m.dataAlvo < hoje,
        )
        .sort((a, b) => (a.dataAlvo ?? '').localeCompare(b.dataAlvo ?? '')),
    [metas, hoje],
  );

  function navegar(direcao: -1 | 1) {
    setRef((r) => (modo === 'semana' ? somarDias(r, 7 * direcao) : somarMeses(r, direcao)));
  }

  function irParaHoje() {
    setRef(hoje);
    setDiaSelecionado(hoje);
  }

  const titulo = modo === 'semana' ? intervaloSemana(dias[0], dias[6]) : nomeMesAno(ref);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-slate-400 first-letter:uppercase">{titulo}</p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-slate-700 text-xs">
          {(['semana', 'mes'] as Modo[]).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`px-3 py-1.5 font-medium capitalize transition ${
                modo === m ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {m === 'mes' ? 'mês' : m}
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navegar(-1)}
          className="h-8 w-8 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
        >
          ←
        </button>
        <button
          onClick={irParaHoje}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
        >
          Hoje
        </button>
        <button
          onClick={() => navegar(1)}
          className="h-8 w-8 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
        >
          →
        </button>
      </div>

      {atrasadas.length > 0 && (
        <section className="space-y-2 rounded-xl border border-red-900/60 bg-red-950/20 p-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-red-400">
            ⚠️ Atrasadas ({atrasadas.length})
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {atrasadas.map((m) => (
              <MetaCard key={m.id} meta={m} onEditar={onEditar} />
            ))}
          </div>
        </section>
      )}

      {modo === 'semana' ? (
        <div className="space-y-3">
          {dias.map((d) => {
            const itens = porDia.get(d) ?? [];
            const feitos = itens.filter((m) => m.historico.includes(d)).length;
            return (
              <section
                key={d}
                className={`rounded-xl border p-3 ${
                  d === hoje ? 'border-emerald-800 bg-emerald-950/10' : 'border-slate-800'
                }`}
              >
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className={`first-letter:uppercase ${d === hoje ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {rotuloDiaRelativo(d)}
                  </span>
                  {itens.length > 0 && (
                    <span className="text-xs font-normal text-slate-600">
                      {feitos}/{itens.length}
                    </span>
                  )}
                </h2>
                {itens.length ? (
                  <div className="space-y-1">
                    {itens.map((m) => (
                      <LinhaAgenda key={m.id} meta={m} dia={d} onEditar={onEditar} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">Nada marcado.</p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1">
            {NOMES_DIAS.map((n) => (
              <div key={n} className="pb-1 text-center text-[11px] font-medium text-slate-500">
                {n}
              </div>
            ))}
            {dias.map((d) => {
              const itens = porDia.get(d) ?? [];
              const feitos = itens.filter((m) => m.historico.includes(d)).length;
              const doMes = ehDoMes(d, ref);
              const selecionado = d === diaSelecionado;
              return (
                <button
                  key={d}
                  onClick={() => setDiaSelecionado(d)}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition ${
                    selecionado
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  } ${doMes ? '' : 'opacity-35'}`}
                >
                  <span
                    className={`font-medium ${d === hoje ? 'text-emerald-400' : 'text-slate-300'}`}
                  >
                    {diaDoMesNumero(d)}
                  </span>
                  {itens.length > 0 && (
                    <span className="mt-0.5 flex gap-0.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          feitos === itens.length ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                      />
                      {itens.length > 1 && (
                        <span className="text-[9px] leading-none text-slate-500">
                          {itens.length}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 first-letter:uppercase">
              {rotuloDiaRelativo(diaSelecionado)}
            </h2>
            {(porDia.get(diaSelecionado) ?? []).length ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {(porDia.get(diaSelecionado) ?? []).map((m) => (
                  <MetaCard key={m.id} meta={m} onEditar={onEditar} data={diaSelecionado} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-800 px-3 py-3 text-xs text-slate-600">
                Nada marcado nesse dia.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/**
 * Linha compacta da visão de semana: sete dias de cards completos viravam uma
 * parede de repetição. Aqui fica só o essencial, com o check-in do dia.
 */
function LinhaAgenda({
  meta,
  dia,
  onEditar,
}: {
  meta: Meta;
  dia: string;
  onEditar: (m: Meta) => void;
}) {
  const prioridades = useStore((s) => s.prioridades);
  const alternarCumprido = useStore((s) => s.alternarCumprido);

  const prio = prioridadeDe(meta.prioridadeId, prioridades);
  const cat = CATEGORIAS.find((c) => c.id === meta.categoria) ?? CATEGORIAS[0];
  const feito = meta.historico.includes(dia);
  const recorrente = ehRecorrente(meta);
  const pct = progressoDe(meta);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-900/60 px-2 py-1.5">
      <span className="h-6 w-1 shrink-0 rounded" style={{ backgroundColor: prio.cor }} />
      <span className="shrink-0 text-sm" title={cat.nome}>
        {cat.emoji}
      </span>
      <button
        onClick={() => onEditar(meta)}
        className={`min-w-0 flex-1 truncate text-left text-sm hover:text-white ${
          feito ? 'text-slate-500 line-through' : 'text-slate-200'
        }`}
      >
        {meta.titulo}
      </button>
      {meta.minutosPorDia ? (
        <span className="shrink-0 text-[11px] text-slate-500">{meta.minutosPorDia}min</span>
      ) : null}
      {!recorrente && <span className="shrink-0 text-[11px] text-slate-500">{pct}%</span>}
      {recorrente && (
        <button
          onClick={() => alternarCumprido(meta.id, dia)}
          title={feito ? 'Cumprido — clique para desfazer' : 'Marcar como feito'}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm transition ${
            feito
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
              : 'border-slate-700 text-slate-500 hover:border-emerald-500 hover:text-emerald-400'
          }`}
        >
          {feito ? '✓' : '○'}
        </button>
      )}
    </div>
  );
}
