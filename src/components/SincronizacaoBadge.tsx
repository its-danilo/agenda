import { useStore } from '../store';
import { sincronizarAgora, useSyncStore, type SituacaoSync } from '../lib/sync';
import { emDemo } from '../lib/demo';

const APARENCIA: Record<SituacaoSync, { emoji: string; texto: string; cor: string }> = {
  ocioso: { emoji: '✓', texto: 'Sincronizado', cor: 'text-emerald-500' },
  sincronizando: { emoji: '⟳', texto: 'Sincronizando...', cor: 'text-blue-400' },
  pendente: { emoji: '⇡', texto: 'Enviando...', cor: 'text-blue-400' },
  offline: { emoji: '⚡', texto: 'Offline — salvo aqui', cor: 'text-amber-400' },
  erro: { emoji: '!', texto: 'Falha ao sincronizar', cor: 'text-red-400' },
};

/** Indicador discreto: o app funciona offline, mas você precisa saber disso. */
export function SincronizacaoBadge({ compacto = false }: { compacto?: boolean }) {
  if (emDemo) {
    return (
      <span
        title="Dados de exemplo, salvos só neste navegador"
        className="inline-flex items-center gap-1.5 text-[11px] text-violet-400"
      >
        <span>●</span>
        {!compacto && <span>Demonstração</span>}
      </span>
    );
  }
  return <BadgeDaConta compacto={compacto} />;
}

function BadgeDaConta({ compacto }: { compacto: boolean }) {
  const situacao = useSyncStore((s) => s.situacao);
  const pendentes = useStore(
    (s) => s.sujos.metas.length + s.sujos.etiquetas.length + s.sujos.prioridades.length,
  );

  const efetiva: SituacaoSync =
    situacao === 'ocioso' && pendentes > 0 ? 'pendente' : situacao;
  const a = APARENCIA[efetiva];

  return (
    <button
      onClick={() => void sincronizarAgora()}
      title={pendentes ? `${pendentes} alteração(ões) por enviar` : a.texto}
      className={`inline-flex items-center gap-1.5 text-[11px] ${a.cor} transition hover:opacity-80`}
    >
      <span className={efetiva === 'sincronizando' ? 'inline-block animate-spin' : ''}>
        {a.emoji}
      </span>
      {!compacto && <span>{a.texto}</span>}
      {!compacto && pendentes > 0 && efetiva !== 'sincronizando' && (
        <span className="rounded-full bg-slate-800 px-1.5 text-slate-300">{pendentes}</span>
      )}
    </button>
  );
}
