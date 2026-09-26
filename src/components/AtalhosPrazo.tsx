import { hojeISO, somarDias, somarMeses } from '../lib/dates';

/**
 * Atalhos de prazo.
 *
 * Substituem o antigo campo de texto livre ("~6 meses"), que exigia a unidade e
 * devolvia nada em silêncio quando ela faltava — na prática, todas as tarefas
 * criadas à mão acabaram sem prazo. Aqui não há entrada inválida possível.
 */
export const ATALHOS_PRAZO: { rotulo: string; calcular: () => string }[] = [
  { rotulo: 'Hoje', calcular: () => hojeISO() },
  { rotulo: 'Amanhã', calcular: () => somarDias(hojeISO(), 1) },
  { rotulo: '1 semana', calcular: () => somarDias(hojeISO(), 7) },
  { rotulo: '1 mês', calcular: () => somarMeses(hojeISO(), 1) },
  { rotulo: '3 meses', calcular: () => somarMeses(hojeISO(), 3) },
  { rotulo: '6 meses', calcular: () => somarMeses(hojeISO(), 6) },
  { rotulo: '1 ano', calcular: () => somarMeses(hojeISO(), 12) },
];

export function AtalhosPrazo({
  onEscolher,
  quais,
}: {
  onEscolher: (dataISO: string) => void;
  /** Subconjunto de rótulos, quando o espaço é curto. */
  quais?: string[];
}) {
  const lista = quais ? ATALHOS_PRAZO.filter((a) => quais.includes(a.rotulo)) : ATALHOS_PRAZO;
  return (
    <div className="flex flex-wrap gap-1.5">
      {lista.map((a) => (
        <button
          key={a.rotulo}
          type="button"
          onClick={() => onEscolher(a.calcular())}
          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
        >
          {a.rotulo}
        </button>
      ))}
    </div>
  );
}
