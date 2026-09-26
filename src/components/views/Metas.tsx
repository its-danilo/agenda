import { useMemo, useState } from 'react';
import type { Meta, Status } from '../../types';
import { CATEGORIAS, HORIZONTES, ORDEM_HORIZONTES, STATUS_INFO } from '../../types';
import { prioridadeDe, useStore } from '../../store';
import { MetaCard } from '../MetaCard';
import { CapturaRapida } from '../CapturaRapida';

type Agrupamento = 'horizonte' | 'categoria';

export function Metas({ onEditar, onNova }: { onEditar: (m: Meta) => void; onNova: () => void }) {
  const { metas, etiquetas, prioridades } = useStore();
  const [tagFiltro, setTagFiltro] = useState<string | null>(null);
  const [prioFiltro, setPrioFiltro] = useState<string | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<Status | null>(null);
  const [busca, setBusca] = useState('');
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('horizonte');
  const [arquivoAberto, setArquivoAberto] = useState(false);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return metas
      .filter((m) => (tagFiltro ? m.etiquetas.includes(tagFiltro) : true))
      .filter((m) => (prioFiltro ? m.prioridadeId === prioFiltro : true))
      .filter((m) => (statusFiltro ? m.status === statusFiltro : true))
      .filter((m) =>
        termo
          ? m.titulo.toLowerCase().includes(termo) ||
            (m.descricao ?? '').toLowerCase().includes(termo) ||
            (m.notas ?? '').toLowerCase().includes(termo)
          : true,
      )
      .sort(
        (a, b) =>
          prioridadeDe(a.prioridadeId, prioridades).ordem -
          prioridadeDe(b.prioridadeId, prioridades).ordem,
      );
  }, [metas, tagFiltro, prioFiltro, statusFiltro, busca, prioridades]);

  const prioridadesOrd = [...prioridades].sort((a, b) => a.ordem - b.ordem);
  const temFiltro = Boolean(tagFiltro || prioFiltro || statusFiltro || busca);

  // Concluídas saem da listagem principal — a não ser que o filtro peça por elas,
  // senão o filtro "Concluída" viraria um beco sem saída.
  const filtrandoConcluidas = statusFiltro === 'concluida';
  const emAndamento = filtrandoConcluidas
    ? filtradas
    : filtradas.filter((m) => m.status !== 'concluida');
  const concluidas = filtrandoConcluidas
    ? []
    : filtradas.filter((m) => m.status === 'concluida');

  const grupos: { chave: string; titulo: string; sub?: string; metas: Meta[] }[] =
    agrupamento === 'horizonte'
      ? ORDEM_HORIZONTES.map((h) => ({
          chave: h,
          titulo: `${HORIZONTES[h].emoji} ${HORIZONTES[h].nome}`,
          sub: HORIZONTES[h].descricao,
          metas: emAndamento.filter((m) => m.horizonte === h),
        }))
      : CATEGORIAS.map((c) => ({
          chave: c.id,
          titulo: `${c.emoji} ${c.nome}`,
          metas: emAndamento.filter((m) => m.categoria === c.id),
        }));

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metas</h1>
          <p className="text-sm text-slate-400">{emAndamento.length} em andamento</p>
        </div>
        <button
          onClick={onNova}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          + Nova
        </button>
      </header>

      <CapturaRapida placeholder="Anotar rapidamente..." />

      <div className="space-y-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título, descrição ou nota..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Agrupar por</span>
          <div className="flex overflow-hidden rounded-lg border border-slate-700 text-xs">
            {(['horizonte', 'categoria'] as Agrupamento[]).map((a) => (
              <button
                key={a}
                onClick={() => setAgrupamento(a)}
                className={`px-3 py-1 font-medium capitalize transition ${
                  agrupamento === a ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {prioridadesOrd.map((p) => (
            <button
              key={p.id}
              onClick={() => setPrioFiltro(prioFiltro === p.id ? null : p.id)}
              className="rounded-full px-2 py-0.5 text-xs font-medium transition"
              style={{
                backgroundColor: prioFiltro === p.id ? p.cor : `${p.cor}22`,
                color: prioFiltro === p.id ? '#fff' : p.cor,
              }}
            >
              {p.nome}
            </button>
          ))}
          <span className="mx-1 w-px bg-slate-700" />
          {(Object.keys(STATUS_INFO) as Status[]).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFiltro(statusFiltro === st ? null : st)}
              className="rounded-full px-2 py-0.5 text-xs font-medium transition"
              style={{
                backgroundColor:
                  statusFiltro === st ? STATUS_INFO[st].cor : `${STATUS_INFO[st].cor}22`,
                color: statusFiltro === st ? '#fff' : STATUS_INFO[st].cor,
              }}
            >
              {STATUS_INFO[st].nome}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {etiquetas.map((e) => (
            <button
              key={e.id}
              onClick={() => setTagFiltro(tagFiltro === e.id ? null : e.id)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition"
              style={{
                backgroundColor: tagFiltro === e.id ? e.cor : `${e.cor}22`,
                color: tagFiltro === e.id ? '#fff' : e.cor,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: tagFiltro === e.id ? '#fff' : e.cor }}
              />
              {e.nome}
            </button>
          ))}
          {temFiltro && (
            <button
              onClick={() => {
                setTagFiltro(null);
                setPrioFiltro(null);
                setStatusFiltro(null);
                setBusca('');
              }}
              className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
            >
              Limpar ✕
            </button>
          )}
        </div>
      </div>

      {grupos.map((g) =>
        g.metas.length === 0 ? null : (
          <section key={g.chave} className="space-y-2">
            <h2 className="flex items-baseline gap-2 text-sm font-semibold text-slate-300">
              {g.titulo}
              <span className="text-xs font-normal text-slate-500">({g.metas.length})</span>
              {g.sub && <span className="text-[11px] font-normal text-slate-600">{g.sub}</span>}
            </h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {g.metas.map((m) => (
                <MetaCard key={m.id} meta={m} onEditar={onEditar} />
              ))}
            </div>
          </section>
        ),
      )}

      {concluidas.length > 0 && (
        <section className="space-y-2">
          <button
            onClick={() => setArquivoAberto((v) => !v)}
            className="flex w-full items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm font-semibold text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
          >
            <span>{arquivoAberto ? '▾' : '▸'}</span>
            ✅ Concluídas
            <span className="text-xs font-normal text-slate-500">({concluidas.length})</span>
          </button>
          {arquivoAberto && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {concluidas.map((m) => (
                <MetaCard key={m.id} meta={m} onEditar={onEditar} />
              ))}
            </div>
          )}
        </section>
      )}

      {filtradas.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
          Nenhuma meta encontrada com esses filtros.
        </div>
      )}
    </div>
  );
}
