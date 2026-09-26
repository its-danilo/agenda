import { heatmap } from '../lib/streaks';
import { formatarData } from '../lib/dates';

function cor(total: number, max: number): string {
  if (total === 0) return '#1e293b';
  const t = Math.min(1, total / Math.max(1, max));
  // interpola de emerald escuro -> claro
  if (t < 0.25) return '#14532d';
  if (t < 0.5) return '#166534';
  if (t < 0.75) return '#16a34a';
  return '#22c55e';
}

export function Heatmap({ historicos }: { historicos: string[][] }) {
  const dias = heatmap(historicos, 119); // ~17 semanas
  const max = dias.reduce((m, d) => Math.max(m, d.total), 1);

  // agrupa em colunas de 7 (semanas)
  const semanas: { data: string; total: number }[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {semanas.map((semana, i) => (
          <div key={i} className="flex flex-col gap-1">
            {semana.map((d) => (
              <div
                key={d.data}
                title={`${formatarData(d.data)}: ${d.total} cumprimento(s)`}
                className="h-3 w-3 rounded-[3px]"
                style={{ backgroundColor: cor(d.total, max) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
        <span>menos</span>
        {['#1e293b', '#14532d', '#166534', '#16a34a', '#22c55e'].map((c) => (
          <span key={c} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: c }} />
        ))}
        <span>mais</span>
      </div>
    </div>
  );
}
