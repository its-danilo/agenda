import { useState } from 'react';
import { useStore } from '../store';
import { hojeISO } from '../lib/dates';

/**
 * Anotar algo deve custar uma linha de texto.
 *
 * O formulário completo tem treze campos — bom para desenhar uma meta de um ano,
 * péssimo para "comprar pão". Aqui o item nasce como tarefa pontual de curto
 * prazo, ativa e marcada para hoje, então aparece na hora em "Para hoje".
 * Qualquer refinamento é opcional, depois, pelo cartão.
 */
export function CapturaRapida({ placeholder = 'Anotar uma tarefa para hoje...' }) {
  const prioridades = useStore((s) => s.prioridades);
  const adicionarMeta = useStore((s) => s.adicionarMeta);
  const [titulo, setTitulo] = useState('');

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = titulo.trim();
    if (!t) return;

    const ordenadas = [...prioridades].sort((a, b) => a.ordem - b.ordem);
    adicionarMeta({
      titulo: t,
      categoria: 'todo',
      horizonte: 'curto',
      cadencia: 'pontual',
      diasSemana: [],
      prioridadeId: ordenadas[2]?.id ?? ordenadas[0]?.id ?? 'p3',
      etiquetas: [],
      status: 'ativa',
      agendadaPara: hojeISO(),
      subtarefas: [],
      progresso: 0,
    });
    setTitulo('');
  }

  return (
    <form onSubmit={enviar} className="flex gap-2">
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder={placeholder}
        aria-label="Anotar tarefa rápida"
        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
      />
      <button
        type="submit"
        disabled={!titulo.trim()}
        className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-30"
      >
        Anotar
      </button>
    </form>
  );
}
