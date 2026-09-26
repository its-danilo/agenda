import { useState } from 'react';
import type { Vista } from '../store';
import { SincronizacaoBadge } from './SincronizacaoBadge';

interface Item {
  id: Vista;
  nome: string;
  emoji: string;
}

const ITENS: Item[] = [
  { id: 'hoje', nome: 'Hoje', emoji: '☀️' },
  { id: 'agenda', nome: 'Agenda', emoji: '🗓️' },
  { id: 'metas', nome: 'Metas', emoji: '🎯' },
  { id: 'foco', nome: 'Foco', emoji: '🧭' },
  { id: 'revisao', nome: 'Revisão', emoji: '🩺' },
  { id: 'progresso', nome: 'Progresso', emoji: '📈' },
  { id: 'ajustes', nome: 'Ajustes', emoji: '⚙️' },
];

// No celular a barra inferior comporta 5 alvos de toque; o resto vai para "Mais".
const PRINCIPAIS: Vista[] = ['hoje', 'agenda', 'metas', 'foco'];
const SECUNDARIAS = ITENS.filter((i) => !PRINCIPAIS.includes(i.id));

export function NavBar({
  vista,
  setVista,
  orientacao,
}: {
  vista: Vista;
  setVista: (v: Vista) => void;
  orientacao: 'horizontal' | 'vertical';
}) {
  const [maisAberto, setMaisAberto] = useState(false);

  if (orientacao === 'vertical') {
    return (
      <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-slate-800 p-3">
        <div className="mb-4 px-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <div className="text-sm font-bold leading-tight">Agenda</div>
              <div className="text-[11px] text-slate-500">Curto, médio e longo prazo</div>
            </div>
          </div>
          <div className="mt-2 pl-0.5">
            <SincronizacaoBadge />
          </div>
        </div>
        {ITENS.map((it) => (
          <button
            key={it.id}
            onClick={() => setVista(it.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              vista === it.id
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">{it.emoji}</span>
            {it.nome}
          </button>
        ))}
      </nav>
    );
  }

  const emSecundaria = SECUNDARIAS.some((i) => i.id === vista);

  return (
    <>
      {maisAberto && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setMaisAberto(false)}
          role="presentation"
        >
          <div
            className="absolute bottom-14 left-0 right-0 border-t border-slate-800 bg-slate-950 p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {SECUNDARIAS.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  setVista(it.id);
                  setMaisAberto(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                  vista === it.id ? 'bg-slate-800 text-white' : 'text-slate-300'
                }`}
              >
                <span className="text-lg">{it.emoji}</span>
                {it.nome}
              </button>
            ))}
            <div className="px-3 py-2">
              <SincronizacaoBadge />
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {ITENS.filter((i) => PRINCIPAIS.includes(i.id)).map((it) => (
          <button
            key={it.id}
            onClick={() => setVista(it.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
              vista === it.id ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            <span className="text-lg">{it.emoji}</span>
            {it.nome}
          </button>
        ))}
        <button
          onClick={() => setMaisAberto((v) => !v)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
            emSecundaria || maisAberto ? 'text-emerald-400' : 'text-slate-500'
          }`}
        >
          <span className="text-lg">⋯</span>
          Mais
        </button>
      </nav>
    </>
  );
}
