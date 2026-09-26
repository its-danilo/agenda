import { useMemo } from 'react';
import type { Meta } from '../../types';
import { CATEGORIAS, INICIAIS_DIAS } from '../../types';
import { prioridadeDe, useStore } from '../../store';
import { AtalhosPrazo } from '../AtalhosPrazo';
import { revisar } from '../../lib/revisao';
import { hojeISO, rotuloPrazo, somarDias } from '../../lib/dates';

/**
 * A parada semanal.
 *
 * Metas de médio e longo prazo apodrecem na fila quando nada obriga a decidir.
 * Cada seção aqui é uma pergunta com resposta em um clique, e some assim que
 * fica vazia — a tela vazia é o objetivo, não um erro.
 */
export function Revisao({ onEditar }: { onEditar: (m: Meta) => void }) {
  const { metas, prioridades, limiteFoco } = useStore();
  const atualizarMeta = useStore((s) => s.atualizarMeta);
  const definirStatus = useStore((s) => s.definirStatus);
  const hoje = hojeISO();

  const r = useMemo(() => revisar(metas, limiteFoco, hoje), [metas, limiteFoco, hoje]);

  const adiar = (m: Meta, dias: number) =>
    atualizarMeta(m.id, { dataAlvo: somarDias(m.dataAlvo && m.dataAlvo > hoje ? m.dataAlvo : hoje, dias) });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Revisão</h1>
        <p className="text-sm text-slate-400">
          {r.total === 0
            ? 'Nada pendente. Sua agenda está em dia.'
            : `${r.total} ponto(s) esperando uma decisão sua.`}
        </p>
      </header>

      {r.total === 0 && r.filaParada.length === 0 && (
        <div className="rounded-xl border border-dashed border-emerald-900 bg-emerald-950/20 p-8 text-center text-emerald-400">
          ✓ Tudo revisado.
        </div>
      )}

      {r.atrasadas.length > 0 && (
        <Secao
          titulo="⚠️ Passaram do prazo"
          sub="Escolha uma data nova ou marque como feito."
          cor="border-red-900/60 bg-red-950/20"
          n={r.atrasadas.length}
        >
          {r.atrasadas.map((m) => (
            <Linha key={m.id} meta={m} prioridades={prioridades} onEditar={onEditar}>
              <span className="mr-1 text-[11px] text-red-400">{rotuloPrazo(m.dataAlvo)}</span>
              <Acao onClick={() => adiar(m, 1)}>+1 dia</Acao>
              <Acao onClick={() => adiar(m, 7)}>+1 semana</Acao>
              <Acao onClick={() => atualizarMeta(m.id, { dataAlvo: undefined })}>Tirar prazo</Acao>
              <Acao destaque onClick={() => definirStatus(m.id, 'concluida')}>
                ✓ Concluir
              </Acao>
            </Linha>
          ))}
        </Secao>
      )}

      {r.semPrazo.length > 0 && (
        <Secao
          titulo="📅 Sem prazo nenhum"
          sub="Tarefas e projetos sem data não aparecem na agenda."
          n={r.semPrazo.length}
        >
          {r.semPrazo.map((m) => (
            <Linha key={m.id} meta={m} prioridades={prioridades} onEditar={onEditar} empilhar>
              <AtalhosPrazo
                quais={['Hoje', 'Amanhã', '1 semana', '1 mês', '3 meses']}
                onEscolher={(d) => atualizarMeta(m.id, { dataAlvo: d })}
              />
            </Linha>
          ))}
        </Secao>
      )}

      {r.paradas.length > 0 && (
        <Secao
          titulo="💤 Ativas, mas paradas"
          sub="Estão ocupando seu foco sem andar. Vale tirar de circulação?"
          n={r.paradas.length}
        >
          {r.paradas.map(({ meta: m, devidosSemCumprir }) => (
            <Linha key={m.id} meta={m} prioridades={prioridades} onEditar={onEditar}>
              <span className="mr-1 text-[11px] text-slate-500">
                {devidosSemCumprir}x sem marcar
              </span>
              <Acao onClick={() => definirStatus(m.id, 'pausada')}>Pausar</Acao>
              <Acao onClick={() => definirStatus(m.id, 'fila')}>← Fila</Acao>
            </Linha>
          ))}
        </Secao>
      )}

      {r.cadenciaIrreal.length > 0 && (
        <Secao
          titulo="🔁 Diárias que não estão dando"
          sub="Talvez o problema não seja você, e sim a frequência cadastrada."
          n={r.cadenciaIrreal.length}
        >
          {r.cadenciaIrreal.map(({ meta: m, devidos, feitos, diasSugeridos }) => (
            <Linha key={m.id} meta={m} prioridades={prioridades} onEditar={onEditar} empilhar>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500">
                  {feitos} de {devidos} dias nas últimas 2 semanas
                </span>
                <Acao
                  destaque
                  onClick={() =>
                    atualizarMeta(m.id, { cadencia: 'semanal', diasSemana: diasSugeridos })
                  }
                >
                  Virar semanal:{' '}
                  {diasSugeridos.map((d) => INICIAIS_DIAS[d]).join(' ')}
                </Acao>
              </div>
            </Linha>
          ))}
        </Secao>
      )}

      {r.filaParada.length > 0 && (
        <Secao
          titulo="🧭 Cabe mais no seu foco"
          sub={`Você tem espaço para ${r.filaParada.length} a mais dentro do limite de ${limiteFoco}.`}
          n={r.filaParada.length}
        >
          {r.filaParada.map((m) => (
            <Linha key={m.id} meta={m} prioridades={prioridades} onEditar={onEditar}>
              <Acao destaque onClick={() => definirStatus(m.id, 'ativa')}>
                → Focar
              </Acao>
            </Linha>
          ))}
        </Secao>
      )}
    </div>
  );
}

function Secao({
  titulo,
  sub,
  n,
  cor,
  children,
}: {
  titulo: string;
  sub: string;
  n: number;
  cor?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`space-y-2 rounded-xl border p-3 ${cor ?? 'border-slate-800'}`}>
      <div>
        <h2 className="text-sm font-semibold text-slate-200">
          {titulo} <span className="font-normal text-slate-500">({n})</span>
        </h2>
        <p className="text-[11px] text-slate-500">{sub}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Linha({
  meta,
  prioridades,
  onEditar,
  empilhar,
  children,
}: {
  meta: Meta;
  prioridades: ReturnType<typeof useStore.getState>['prioridades'];
  onEditar: (m: Meta) => void;
  /** Ações numa linha própria, quando não cabem ao lado do título. */
  empilhar?: boolean;
  children: React.ReactNode;
}) {
  const prio = prioridadeDe(meta.prioridadeId, prioridades);
  const cat = CATEGORIAS.find((c) => c.id === meta.categoria) ?? CATEGORIAS[0];

  return (
    <div
      className={`rounded-lg bg-slate-900/60 p-2 ${
        empilhar ? 'space-y-1.5' : 'flex flex-wrap items-center gap-1.5'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="h-5 w-1 shrink-0 rounded" style={{ backgroundColor: prio.cor }} />
        <span className="shrink-0 text-sm">{cat.emoji}</span>
        <button
          onClick={() => onEditar(meta)}
          className="min-w-0 flex-1 truncate text-left text-sm text-slate-200 hover:text-white"
        >
          {meta.titulo}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function Acao({
  onClick,
  destaque,
  children,
}: {
  onClick: () => void;
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
        destaque
          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
