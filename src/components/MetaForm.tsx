import { useState } from 'react';
import type { Cadencia, Categoria, Horizonte, Meta, Subtarefa } from '../types';
import { CADENCIAS, CATEGORIAS, HORIZONTES, INICIAIS_DIAS, ORDEM_HORIZONTES } from '../types';
import { gerarId, useStore } from '../store';
import { hojeISO } from '../lib/dates';
import { AtalhosPrazo } from './AtalhosPrazo';

const RECORRENTES: Cadencia[] = ['diaria', 'semanal', 'mensal', 'para_sempre'];

export function MetaForm({
  meta,
  onFechar,
}: {
  meta: Meta | 'nova' | null;
  onFechar: () => void;
}) {
  const { etiquetas, prioridades } = useStore();
  const adicionar = useStore((s) => s.adicionarMeta);
  const atualizar = useStore((s) => s.atualizarMeta);
  const remover = useStore((s) => s.removerMeta);

  const editando = meta !== 'nova' && meta !== null;
  const base = editando ? meta : null;

  const prioridadesOrd = [...prioridades].sort((a, b) => a.ordem - b.ordem);

  const [titulo, setTitulo] = useState(base?.titulo ?? '');
  const [descricao, setDescricao] = useState(base?.descricao ?? '');
  const [categoria, setCategoria] = useState<Categoria>(base?.categoria ?? 'todo');
  const [horizonte, setHorizonte] = useState<Horizonte>(base?.horizonte ?? 'curto');
  const [cadencia, setCadencia] = useState<Cadencia>(base?.cadencia ?? 'pontual');
  const [diasSemana, setDiasSemana] = useState<number[]>(base?.diasSemana ?? []);
  const [diaDoMes, setDiaDoMes] = useState<string>(base?.diaDoMes?.toString() ?? '');
  const [prioridadeId, setPrioridadeId] = useState(
    base?.prioridadeId ?? prioridadesOrd[2]?.id ?? prioridadesOrd[0]?.id ?? 'p3',
  );
  const [minutos, setMinutos] = useState<string>(base?.minutosPorDia?.toString() ?? '15');
  const [dataAlvo, setDataAlvo] = useState(base?.dataAlvo ?? '');
  const [agendadaPara, setAgendadaPara] = useState(base?.agendadaPara ?? '');
  const [notas, setNotas] = useState(base?.notas ?? '');
  const [subtarefas, setSubtarefas] = useState<Subtarefa[]>(base?.subtarefas ?? []);
  const [novaSub, setNovaSub] = useState('');
  const [tagsSel, setTagsSel] = useState<string[]>(base?.etiquetas ?? []);

  if (meta === null) return null;

  const ehRecorrente = RECORRENTES.includes(cadencia);

  function adicionarSub() {
    const t = novaSub.trim();
    if (!t) return;
    setSubtarefas((prev) => [...prev, { id: gerarId(), titulo: t, feita: false }]);
    setNovaSub('');
  }

  function salvar() {
    if (!titulo.trim()) return;
    const dados = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      categoria,
      horizonte,
      cadencia,
      diasSemana: cadencia === 'semanal' ? diasSemana : [],
      diaDoMes: cadencia === 'mensal' && diaDoMes ? Number(diaDoMes) : undefined,
      prioridadeId,
      etiquetas: tagsSel,
      minutosPorDia: ehRecorrente && minutos ? Number(minutos) : undefined,
      dataAlvo: dataAlvo || undefined,
      agendadaPara: agendadaPara || undefined,
      notas: notas.trim() || undefined,
      subtarefas,
    };
    if (editando && base) {
      atualizar(base.id, dados);
    } else {
      adicionar({ ...dados, status: 'fila', progresso: 0 });
    }
    onFechar();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onFechar}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{editando ? 'Editar' : 'Nova tarefa ou meta'}</h2>
          <button onClick={onFechar} className="rounded-md px-2 text-slate-400 hover:text-slate-200">
            ✕
          </button>
        </div>

        <Campo rotulo="Título">
          <input
            autoFocus
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Fazer a prova da PF"
            className={ENTRADA}
          />
        </Campo>

        <Campo rotulo="Descrição (opcional)">
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Leitura ativa"
            className={ENTRADA}
          />
        </Campo>

        {/* Horizonte: agora é escolha sua, não mais deduzido da categoria */}
        <div className="mb-3">
          <Rotulo>Horizonte</Rotulo>
          <div className="grid grid-cols-3 gap-1.5">
            {ORDEM_HORIZONTES.map((h) => {
              const info = HORIZONTES[h];
              const ativo = horizonte === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizonte(h)}
                  className="rounded-lg border px-2 py-2 text-left transition"
                  style={{
                    borderColor: ativo ? info.cor : '#334155',
                    backgroundColor: ativo ? `${info.cor}22` : 'transparent',
                  }}
                >
                  <div
                    className="text-xs font-semibold"
                    style={{ color: ativo ? info.cor : '#cbd5e1' }}
                  >
                    {info.emoji} {info.nome}
                  </div>
                  <div className="text-[10px] leading-tight text-slate-500">{info.descricao}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <Campo rotulo="Categoria" semMargem>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as Categoria)}
              className={ENTRADA}
            >
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Prioridade" semMargem>
            <select
              value={prioridadeId}
              onChange={(e) => setPrioridadeId(e.target.value)}
              className={ENTRADA}
            >
              {prioridadesOrd.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo rotulo="Repetição">
          <select
            value={cadencia}
            onChange={(e) => {
              const c = e.target.value as Cadencia;
              setCadencia(c);
              // Semanal sem nenhum dia marcado valeria todo dia — começa no dia de hoje.
              if (c === 'semanal' && !diasSemana.length) setDiasSemana([new Date().getDay()]);
              if (c === 'mensal' && !diaDoMes) setDiaDoMes(String(new Date().getDate()));
            }}
            className={ENTRADA}
          >
            {(Object.keys(CADENCIAS) as Cadencia[]).map((c) => (
              <option key={c} value={c}>
                {CADENCIAS[c].emoji} {CADENCIAS[c].nome} — {CADENCIAS[c].descricao}
              </option>
            ))}
          </select>
        </Campo>

        {cadencia === 'semanal' && (
          <div className="mb-3">
            <Rotulo>Dias da semana</Rotulo>
            <div className="flex gap-1.5">
              {INICIAIS_DIAS.map((inicial, dia) => {
                const ativo = diasSemana.includes(dia);
                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() =>
                      setDiasSemana((prev) =>
                        ativo ? prev.filter((d) => d !== dia) : [...prev, dia].sort(),
                      )
                    }
                    className={`h-9 flex-1 rounded-lg border text-sm font-semibold transition ${
                      ativo
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-slate-700 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    {inicial}
                  </button>
                );
              })}
            </div>
            {!diasSemana.length && (
              <p className="mt-1 text-[11px] text-amber-400">
                Sem nenhum dia marcado, vale todo dia.
              </p>
            )}
          </div>
        )}

        {cadencia === 'mensal' && (
          <Campo rotulo="Dia do mês">
            <input
              type="number"
              min={1}
              max={31}
              value={diaDoMes}
              onChange={(e) => setDiaDoMes(e.target.value)}
              className={ENTRADA}
            />
          </Campo>
        )}

        {ehRecorrente && (
          <Campo rotulo="Minutos por sessão">
            <input
              type="number"
              min={0}
              value={minutos}
              onChange={(e) => setMinutos(e.target.value)}
              className={ENTRADA}
            />
          </Campo>
        )}

        <div className="mb-3 grid grid-cols-2 gap-3">
          <Campo rotulo="Prazo final" semMargem>
            <input
              type="date"
              value={dataAlvo}
              onChange={(e) => setDataAlvo(e.target.value)}
              className={ENTRADA}
            />
          </Campo>
          {!ehRecorrente && (
            <Campo rotulo="Fazer no dia" semMargem>
              <input
                type="date"
                value={agendadaPara}
                onChange={(e) => setAgendadaPara(e.target.value)}
                className={ENTRADA}
              />
            </Campo>
          )}
        </div>

        <div className="mb-3">
          <Rotulo>Prazo rápido</Rotulo>
          <AtalhosPrazo onEscolher={setDataAlvo} />
          {!ehRecorrente && !agendadaPara && (
            <button
              type="button"
              onClick={() => setAgendadaPara(hojeISO())}
              className="mt-1.5 text-[11px] text-emerald-400 hover:text-emerald-300"
            >
              + agendar para hoje
            </button>
          )}
        </div>

        {/* Subtarefas: quando existem, o progresso passa a ser calculado */}
        <div className="mb-3">
          <Rotulo>
            Etapas {subtarefas.length > 0 && `(${subtarefas.filter((s) => s.feita).length}/${subtarefas.length})`}
          </Rotulo>
          <div className="space-y-1.5">
            {subtarefas.map((sub) => (
              <div key={sub.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSubtarefas((prev) =>
                      prev.map((s) => (s.id === sub.id ? { ...s, feita: !s.feita } : s)),
                    )
                  }
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs ${
                    sub.feita
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : 'border-slate-700 text-transparent'
                  }`}
                >
                  ✓
                </button>
                <input
                  value={sub.titulo}
                  onChange={(e) =>
                    setSubtarefas((prev) =>
                      prev.map((s) => (s.id === sub.id ? { ...s, titulo: e.target.value } : s)),
                    )
                  }
                  className={`min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 ${
                    sub.feita ? 'text-slate-500 line-through' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setSubtarefas((prev) => prev.filter((s) => s.id !== sub.id))}
                  className="h-7 w-7 shrink-0 rounded bg-slate-800 text-red-400 hover:bg-red-900/50"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2">
            <input
              value={novaSub}
              onChange={(e) => setNovaSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  adicionarSub();
                }
              }}
              placeholder="Nova etapa..."
              className={ENTRADA}
            />
            <button
              type="button"
              onClick={adicionarSub}
              className="shrink-0 rounded-lg bg-slate-800 px-3 text-sm text-slate-300 hover:bg-slate-700"
            >
              +
            </button>
          </div>
        </div>

        <Campo rotulo="Notas">
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            placeholder="Anotações, links, o que você já fez..."
            className={`${ENTRADA} resize-y`}
          />
        </Campo>

        <div className="mb-4">
          <Rotulo>Etiquetas</Rotulo>
          <div className="flex flex-wrap gap-1.5">
            {etiquetas.map((e) => {
              const ativa = tagsSel.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() =>
                    setTagsSel((prev) =>
                      ativa ? prev.filter((id) => id !== e.id) : [...prev, e.id],
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition"
                  style={{
                    backgroundColor: ativa ? `${e.cor}33` : 'transparent',
                    color: ativa ? e.cor : '#94a3b8',
                    border: `1px solid ${ativa ? e.cor : '#334155'}`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: e.cor }} />
                  {e.nome}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={salvar}
            disabled={!titulo.trim()}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-40"
          >
            {editando ? 'Salvar alterações' : 'Criar'}
          </button>
          {editando && base && (
            <button
              onClick={() => {
                if (confirm(`Remover "${base.titulo}"?`)) {
                  remover(base.id);
                  onFechar();
                }
              }}
              className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-900/50"
            >
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const ENTRADA =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500';

function Rotulo({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-xs font-medium text-slate-400">{children}</span>;
}

function Campo({
  rotulo,
  children,
  semMargem,
}: {
  rotulo: string;
  children: React.ReactNode;
  semMargem?: boolean;
}) {
  return (
    <label className={semMargem ? 'block' : 'mb-3 block'}>
      <Rotulo>{rotulo}</Rotulo>
      {children}
    </label>
  );
}
