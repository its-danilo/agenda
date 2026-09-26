import type { Etiqueta } from '../types';

export function EtiquetaChip({
  etiqueta,
  onClick,
  ativa,
}: {
  etiqueta: Etiqueta;
  onClick?: () => void;
  ativa?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition ${
        onClick ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
      }`}
      style={{
        backgroundColor: ativa === false ? 'transparent' : `${etiqueta.cor}22`,
        color: etiqueta.cor,
        border: `1px solid ${etiqueta.cor}${ativa === false ? '55' : '00'}`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: etiqueta.cor }}
      />
      {etiqueta.nome}
    </button>
  );
}
