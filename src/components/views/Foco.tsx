import type { Meta } from '../../types';
import { CATEGORIAS } from '../../types';
import { prioridadeDe, useStore } from '../../store';

export function Foco() {
  const { metas, prioridades, limiteFoco } = useStore();
  const definirStatus = useStore((s) => s.definirStatus);
  const definirLimiteFoco = useStore((s) => s.definirLimiteFoco);

  const ordenar = (a: Meta, b: Meta) =>
    prioridadeDe(a.prioridadeId, prioridades).ordem -
    prioridadeDe(b.prioridadeId, prioridades).ordem;

  const ativas = metas.filter((m) => m.status === 'ativa').sort(ordenar);
  const fila = metas.filter((m) => m.status === 'fila').sort(ordenar);
  const pausadas = metas.filter((m) => m.status === 'pausada').sort(ordenar);

  const excedido = ativas.length > limiteFoco;

  function LinhaMeta({ m, acao }: { m: Meta; acao: 'ativar' | 'enfileirar' }) {
    const cat = CATEGORIAS.find((c) => c.id === m.categoria)!;
    const prio = prioridadeDe(m.prioridadeId, prioridades);
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
        <span className="h-8 w-1 rounded" style={{ backgroundColor: prio.cor }} />
        <span>{cat.emoji}</span>
        <span className="min-w-0 flex-1 truncate text-sm">{m.titulo}</span>
        {acao === 'ativar' ? (
          <button
            onClick={() => definirStatus(m.id, 'ativa')}
            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500"
          >
            → Focar
          </button>
        ) : (
          <button
            onClick={() => definirStatus(m.id, 'fila')}
            className="rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600"
          >
            ← Fila
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Foco</h1>
        <p className="text-sm text-slate-400">
          Escolha poucas metas para atacar agora. O resto espera na fila — sem sobrecarga.
        </p>
      </header>

      {/* controle do limite */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex-1">
          <div className="text-sm font-medium">Limite de foco (WIP)</div>
          <p className="text-xs text-slate-500">Máximo recomendado de metas ativas ao mesmo tempo.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => definirLimiteFoco(limiteFoco - 1)}
            className="h-8 w-8 rounded-lg bg-slate-800 text-lg hover:bg-slate-700"
          >
            −
          </button>
          <span className="w-6 text-center text-lg font-bold">{limiteFoco}</span>
          <button
            onClick={() => definirLimiteFoco(limiteFoco + 1)}
            className="h-8 w-8 rounded-lg bg-slate-800 text-lg hover:bg-slate-700"
          >
            +
          </button>
        </div>
      </div>

      {excedido && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-300">
          ⚠️ Você tem {ativas.length} metas ativas, acima do seu limite de {limiteFoco}. Considere
          mandar algumas de volta para a fila para manter o foco.
        </div>
      )}

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-400">
          🔵 Ativas ({ativas.length}/{limiteFoco})
        </h2>
        {ativas.length ? (
          <div className="space-y-2">
            {ativas.map((m) => (
              <LinhaMeta key={m.id} m={m} acao="enfileirar" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nenhuma meta ativa. Puxe da fila abaixo.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          ⚪ Na fila ({fila.length})
        </h2>
        {fila.length ? (
          <div className="space-y-2">
            {fila.map((m) => (
              <LinhaMeta key={m.id} m={m} acao="ativar" />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Fila vazia.</p>
        )}
      </section>

      {pausadas.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            ⏸️ Pausadas ({pausadas.length})
          </h2>
          <div className="space-y-2 opacity-70">
            {pausadas.map((m) => (
              <LinhaMeta key={m.id} m={m} acao="ativar" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
