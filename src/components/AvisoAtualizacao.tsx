import { useEffect, useState } from 'react';
import { observarAtualizacao } from '../lib/atualizacao';

/**
 * Quando sai uma versão nova, recarrega sozinho se você não estiver olhando —
 * e, se estiver, oferece o botão em vez de puxar a página debaixo do seu nariz
 * no meio de uma digitação.
 */
export function AvisoAtualizacao() {
  const [disponivel, setDisponivel] = useState(false);

  useEffect(() => {
    const parar = observarAtualizacao(() => {
      if (document.visibilityState === 'hidden') window.location.reload();
      else setDisponivel(true);
    });
    return parar;
  }, []);

  useEffect(() => {
    if (!disponivel) return;
    // Se você sair do app com a atualização pendente, ela entra sozinha.
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') window.location.reload();
    };
    document.addEventListener('visibilitychange', aoEsconder);
    return () => document.removeEventListener('visibilitychange', aoEsconder);
  }, [disponivel]);

  if (!disponivel) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-4 md:bottom-4">
      <div className="flex items-center gap-3 rounded-full border border-emerald-800 bg-emerald-950/95 px-4 py-2 shadow-lg shadow-black/40 backdrop-blur">
        <span className="text-sm text-emerald-200">Nova versão disponível</span>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
