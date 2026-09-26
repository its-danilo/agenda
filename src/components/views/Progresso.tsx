import { HORIZONTES, ORDEM_HORIZONTES, ehRecorrente } from '../../types';
import { CATEGORIAS } from '../../types';
import { useStore } from '../../store';
import { Heatmap } from '../Heatmap';
import { melhorStreakRecorrente, progressoDe, streakRecorrente } from '../../lib/recorrencia';

export function Progresso() {
  const { metas } = useStore();

  const concluidas = metas.filter((m) => m.status === 'concluida').length;
  const totalPct = metas.length ? Math.round((concluidas / metas.length) * 100) : 0;

  const historicos = metas.map((m) => m.historico);
  const totalCumprimentos = historicos.reduce((s, h) => s + h.length, 0);

  const melhorStreak = Math.max(0, ...metas.map(melhorStreakRecorrente));

  const comStreak = metas
    .filter(ehRecorrente)
    .map((m) => ({ m, streak: streakRecorrente(m) }))
    .filter((x) => x.streak > 0)
    .sort((a, b) => b.streak - a.streak);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Progresso</h1>
        <p className="text-sm text-slate-400">Sua constância ao longo do tempo.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat titulo="Conclusão" valor={`${totalPct}%`} sub={`${concluidas}/${metas.length} metas`} />
        <Stat titulo="Dias cumpridos" valor={`${totalCumprimentos}`} sub="total registrado" />
        <Stat titulo="Melhor sequência" valor={`🔥 ${melhorStreak}`} sub="ocorrências seguidas" />
        <Stat
          titulo="Ativas agora"
          valor={`${metas.filter((m) => m.status === 'ativa').length}`}
          sub="em foco"
        />
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Mapa de constância (últimas 17 semanas)
        </h2>
        <Heatmap historicos={historicos} />
      </section>

      {comStreak.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Sequências ativas
          </h2>
          <div className="space-y-1.5">
            {comStreak.map(({ m, streak }) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{m.titulo}</span>
                <span className="font-semibold text-orange-400">🔥 {streak}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Por horizonte
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {ORDEM_HORIZONTES.map((h) => {
            const doGrupo = metas.filter((m) => m.horizonte === h);
            if (!doGrupo.length) return null;
            const info = HORIZONTES[h];
            // Média do progresso real (subtarefas quando existem), não só o
            // "concluída ou não" — metas longas avançam sem estar prontas.
            const media = Math.round(
              doGrupo.reduce((s, m) => s + (m.status === 'concluida' ? 100 : progressoDe(m)), 0) /
                doGrupo.length,
            );
            return (
              <Barra
                key={h}
                titulo={`${info.emoji} ${info.nome}`}
                direita={`${doGrupo.filter((m) => m.status === 'concluida').length}/${doGrupo.length}`}
                pct={media}
                cor={info.cor}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Por categoria
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIAS.map((cat) => {
            const doGrupo = metas.filter((m) => m.categoria === cat.id);
            if (!doGrupo.length) return null;
            const feitas = doGrupo.filter((m) => m.status === 'concluida').length;
            return (
              <Barra
                key={cat.id}
                titulo={`${cat.emoji} ${cat.nome}`}
                direita={`${feitas}/${doGrupo.length}`}
                pct={Math.round((feitas / doGrupo.length) * 100)}
                cor="#22c55e"
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Barra({
  titulo,
  direita,
  pct,
  cor,
}: {
  titulo: string;
  direita: string;
  pct: number;
  cor: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span>{titulo}</span>
        <span className="text-slate-400">{direita}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: cor }}
        />
      </div>
    </div>
  );
}

function Stat({ titulo, valor, sub }: { titulo: string; valor: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="text-xs text-slate-400">{titulo}</div>
      <div className="mt-1 text-xl font-bold">{valor}</div>
      <div className="text-[11px] text-slate-500">{sub}</div>
    </div>
  );
}
