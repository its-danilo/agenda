import { useState } from 'react';
import type { Meta } from '../types';
import { CADENCIAS, CATEGORIAS, HORIZONTES, STATUS_INFO, ehRecorrente } from '../types';
import { etiquetasDe, prioridadeDe, useStore } from '../store';
import { EtiquetaChip } from './EtiquetaChip';
import { PrioridadeBadge } from './PrioridadeBadge';
import { AtalhosPrazo } from './AtalhosPrazo';
import { hojeISO, rotuloPrazo } from '../lib/dates';
import { progressoDe, rotuloRecorrencia, streakRecorrente } from '../lib/recorrencia';

const ACOES_STATUS = {
  ativa: { rotulo: 'Ativar', cor: '#3b82f6' },
  fila: { rotulo: 'Fila', cor: '#64748b' },
  pausada: { rotulo: 'Pausar', cor: '#a16207' },
  concluida: { rotulo: 'Concluir', cor: '#22c55e' },
} as const;

export function MetaCard({
  meta,
  onEditar,
  data,
}: {
  meta: Meta;
  onEditar: (m: Meta) => void;
  /** Dia que o check-in marca. Padrão: hoje. A view Agenda passa outro dia. */
  data?: string;
}) {
  const { prioridades, etiquetas } = useStore();
  const definirStatus = useStore((s) => s.definirStatus);
  const alternarCumprido = useStore((s) => s.alternarCumprido);
  const definirProgresso = useStore((s) => s.definirProgresso);
  const alternarSubtarefa = useStore((s) => s.alternarSubtarefa);
  const atualizarMeta = useStore((s) => s.atualizarMeta);
  const removerMeta = useStore((s) => s.removerMeta);

  const [etapasAbertas, setEtapasAbertas] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const dia = data ?? hojeISO();
  const prioridade = prioridadeDe(meta.prioridadeId, prioridades);
  const tags = etiquetasDe(meta.etiquetas, etiquetas);
  const categoria = CATEGORIAS.find((c) => c.id === meta.categoria) ?? CATEGORIAS[0];
  const horizonte = HORIZONTES[meta.horizonte] ?? HORIZONTES.longo;
  const streak = streakRecorrente(meta);
  const feitoNoDia = meta.historico.includes(dia);
  const prazo = rotuloPrazo(meta.dataAlvo);
  const repeticao = rotuloRecorrencia(meta);
  const concluida = meta.status === 'concluida';
  const subtarefas = meta.subtarefas ?? [];
  const temEtapas = subtarefas.length > 0;
  const pct = progressoDe(meta);
  const mostraProgresso = !ehRecorrente(meta) || temEtapas;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-3 pl-4 transition hover:border-slate-700 ${
        concluida ? 'opacity-60' : ''
      }`}
    >
      <span
        className="absolute left-0 top-0 h-full w-1.5"
        style={{ backgroundColor: prioridade.cor }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span title={categoria.nome}>{categoria.emoji}</span>
            <h3
              className={`truncate font-semibold text-slate-100 ${concluida ? 'line-through' : ''}`}
            >
              {meta.titulo}
            </h3>
          </div>
          {meta.descricao && (
            <p className="mt-0.5 truncate text-xs text-slate-400">{meta.descricao}</p>
          )}
        </div>

        {ehRecorrente(meta) && !concluida && (
          <button
            onClick={() => alternarCumprido(meta.id, dia)}
            title={feitoNoDia ? 'Cumprido — clique para desfazer' : 'Marcar como feito'}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg transition ${
              feitoNoDia
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 animate-pop'
                : 'border-slate-700 text-slate-500 hover:border-emerald-500 hover:text-emerald-400'
            }`}
          >
            {feitoNoDia ? '✓' : '○'}
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PrioridadeBadge prioridade={prioridade} />
        <span
          className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: `${horizonte.cor}22`, color: horizonte.cor }}
        >
          {horizonte.emoji} {horizonte.nome}
        </span>
        <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300">
          {CADENCIAS[meta.cadencia].emoji} {repeticao ?? CADENCIAS[meta.cadencia].nome}
          {meta.minutosPorDia ? ` · ${meta.minutosPorDia}min` : ''}
        </span>
        {streak > 0 && (
          <span className="rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-orange-400">
            🔥 {streak}
          </span>
        )}
        {prazo && (
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] ${
              prazo.startsWith('Atrasado') || prazo === 'Vence hoje'
                ? 'bg-red-500/15 text-red-400'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            ⏳ {prazo}
          </span>
        )}
        {meta.notas && (
          <span
            className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-400"
            title={meta.notas}
          >
            📝
          </span>
        )}
      </div>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((t) => (
            <EtiquetaChip key={t.id} etiqueta={t} />
          ))}
        </div>
      )}

      {mostraProgresso && (
        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
            <button
              onClick={() => temEtapas && setEtapasAbertas((v) => !v)}
              className={temEtapas ? 'hover:text-slate-200' : 'cursor-default'}
            >
              {temEtapas
                ? `${etapasAbertas ? '▾' : '▸'} Etapas (${subtarefas.filter((s) => s.feita).length}/${subtarefas.length})`
                : 'Progresso'}
            </button>
            <span>{pct}%</span>
          </div>

          {temEtapas ? (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : (
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={meta.progresso ?? 0}
              onChange={(e) => definirProgresso(meta.id, Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-emerald-500"
            />
          )}

          {temEtapas && etapasAbertas && (
            <div className="mt-2 space-y-1">
              {subtarefas.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => alternarSubtarefa(meta.id, sub.id)}
                  className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-xs hover:bg-slate-800/60"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                      sub.feita
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-slate-700 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span className={sub.feita ? 'text-slate-500 line-through' : 'text-slate-300'}>
                    {sub.titulo}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Uma ação principal à vista; o resto atrás do ⋯ */}
      <div className="mt-3 flex items-center gap-1.5">
        <span
          className="rounded-md px-1.5 py-0.5 text-[11px] font-medium"
          style={{
            backgroundColor: `${STATUS_INFO[meta.status].cor}22`,
            color: STATUS_INFO[meta.status].cor,
          }}
        >
          {STATUS_INFO[meta.status].nome}
        </span>

        {!ehRecorrente(meta) && !concluida && (
          <button
            onClick={() => definirStatus(meta.id, 'concluida')}
            className="rounded-md bg-emerald-600/90 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-emerald-500"
          >
            ✓ Concluir
          </button>
        )}
        {concluida && (
          <button
            onClick={() => definirStatus(meta.id, 'ativa')}
            className="rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
          >
            ↩ Reabrir
          </button>
        )}

        <button
          onClick={() => onEditar(meta)}
          title="Editar"
          className="ml-auto rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
        >
          ✎
        </button>
        <button
          onClick={() => setMenuAberto((v) => !v)}
          title="Mais ações"
          aria-expanded={menuAberto}
          className={`rounded-md px-2 py-1 text-[11px] transition ${
            menuAberto ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          ⋯
        </button>
      </div>

      {menuAberto && (
        <div className="mt-2 space-y-2.5 rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
          <div>
            <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">
              Foco
            </span>
            <div className="flex flex-wrap gap-1">
              {(['fila', 'ativa', 'pausada', 'concluida'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => definirStatus(meta.id, st)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                    meta.status === st
                      ? 'text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                  style={meta.status === st ? { backgroundColor: ACOES_STATUS[st].cor } : undefined}
                >
                  {ACOES_STATUS[st].rotulo}
                </button>
              ))}
            </div>
          </div>

          {!ehRecorrente(meta) && (
            <div>
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">
                {prazo ? 'Adiar prazo' : 'Definir prazo'}
              </span>
              <AtalhosPrazo
                quais={['Hoje', 'Amanhã', '1 semana', '1 mês']}
                onEscolher={(d) => atualizarMeta(meta.id, { dataAlvo: d })}
              />
            </div>
          )}

          <button
            onClick={() => {
              if (confirm(`Remover "${meta.titulo}"?`)) removerMeta(meta.id);
            }}
            className="text-[11px] text-red-400 hover:text-red-300"
          >
            Remover esta meta
          </button>
        </div>
      )}
    </div>
  );
}
