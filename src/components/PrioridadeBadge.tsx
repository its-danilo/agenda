import type { Prioridade } from '../types';

export function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${prioridade.cor}22`, color: prioridade.cor }}
    >
      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: prioridade.cor }} />
      {prioridade.nome}
    </span>
  );
}
