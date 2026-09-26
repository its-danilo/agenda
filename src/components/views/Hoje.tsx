import type { Meta } from '../../types';
import { ehRecorrente } from '../../types';
import { prioridadeDe, useStore } from '../../store';
import { MetaCard } from '../MetaCard';
import { CapturaRapida } from '../CapturaRapida';
import { SincronizacaoBadge } from '../SincronizacaoBadge';
import { devidaHoje } from '../../lib/recorrencia';
import { revisar } from '../../lib/revisao';
import { diasRestantes, hojeISO } from '../../lib/dates';

export function Hoje({
  onEditar,
  onRevisar,
}: {
  onEditar: (m: Meta) => void;
  onRevisar: () => void;
}) {
  const { metas, prioridades, limiteFoco } = useStore();
  const hoje = hojeISO();

  const ordenar = (a: Meta, b: Meta) =>
    prioridadeDe(a.prioridadeId, prioridades).ordem -
    prioridadeDe(b.prioridadeId, prioridades).ordem;

  const ativas = metas.filter((m) => m.status === 'ativa');

  // Hábitos que realmente caem hoje — uma meta 3x/semana não aparece nos dias
  // de folga, ao contrário do comportamento antigo (toda meta diária sempre).
  const habitos = ativas.filter((m) => ehRecorrente(m) && devidaHoje(m)).sort(ordenar);

  const feitos = habitos.filter((m) => m.historico.includes(hoje)).length;
  const pct = habitos.length ? Math.round((feitos / habitos.length) * 100) : 0;

  const tarefas = ativas.filter((m) => !ehRecorrente(m));

  const paraHoje = tarefas
    .filter((m) => {
      const dias = diasRestantes(m.dataAlvo);
      return m.agendadaPara === hoje || (dias !== undefined && dias <= 0);
    })
    .sort((a, b) => (diasRestantes(a.dataAlvo) ?? 0) - (diasRestantes(b.dataAlvo) ?? 0) || ordenar(a, b));

  const emAndamento = tarefas
    .filter((m) => !paraHoje.includes(m))
    .sort((a, b) => {
      const da = diasRestantes(a.dataAlvo) ?? 9999;
      const db = diasRestantes(b.dataAlvo) ?? 9999;
      return da - db || ordenar(a, b);
    });

  // Faixa de revisão: aparece por conteúdo, não por calendário — sem data de
  // "última revisão" para guardar, portanto sem estado novo.
  const pendencias = revisar(metas, limiteFoco, hoje).total;

  const dataLonga = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400 first-letter:uppercase">{dataLonga}</p>
          <h1 className="text-2xl font-bold">Hoje</h1>
        </div>
        <div className="md:hidden">
          <SincronizacaoBadge compacto />
        </div>
      </header>

      <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/40 p-4">
        <ProgressoDia pct={pct} />
        <div>
          <div className="text-lg font-bold">
            {feitos} de {habitos.length} hábitos
          </div>
          <p className="text-sm text-slate-400">
            {pct === 100 && habitos.length > 0
              ? 'Dia completo! 🎉 Mantenha a constância.'
              : habitos.length === 0
                ? 'Nenhum hábito para hoje. Ative metas em Foco.'
                : 'Cada dia conta. Bora manter a sequência!'}
          </p>
        </div>
      </div>

      <CapturaRapida />

      {pendencias > 0 && (
        <button
          onClick={onRevisar}
          className="flex w-full items-center gap-3 rounded-xl border border-amber-900/60 bg-amber-950/20 p-3 text-left transition hover:border-amber-700"
        >
          <span className="text-xl">🩺</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-amber-200">
              {pendencias} ponto(s) para revisar
            </span>
            <span className="block text-xs text-amber-100/60">
              Prazos vencidos, tarefas sem data e metas que pararam de andar.
            </span>
          </span>
          <span className="shrink-0 text-amber-300">→</span>
        </button>
      )}

      <Secao titulo="🔁 Hábitos de hoje" metas={habitos} onEditar={onEditar} />
      <Secao titulo="📌 Para hoje e atrasadas" metas={paraHoje} onEditar={onEditar} />
      <Secao titulo="🚧 Em andamento" metas={emAndamento} onEditar={onEditar} />

      {habitos.length === 0 && paraHoje.length === 0 && emAndamento.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
          Nada ativo por aqui. Vá em <strong className="text-slate-300">Foco</strong> e escolha no
          que focar agora.
        </div>
      )}
    </div>
  );
}

function Secao({
  titulo,
  metas,
  onEditar,
}: {
  titulo: string;
  metas: Meta[];
  onEditar: (m: Meta) => void;
}) {
  if (!metas.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{titulo}</h2>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {metas.map((m) => (
          <MetaCard key={m.id} meta={m} onEditar={onEditar} />
        ))}
      </div>
    </section>
  );
}

function ProgressoDia({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#22c55e"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
        {pct}%
      </span>
    </div>
  );
}
