import { useState } from 'react';
import type { DadosExportados } from '../store';
import { useStore } from '../store';
import { descartarDadosAntigos, marcarMigracaoFeita, mesclarDados } from '../lib/migracao';
import { sincronizarAgora } from '../lib/sync';

/**
 * Tela mostrada uma única vez por aparelho: os dados que estavam presos no
 * localStorage deste navegador ainda não existem na nuvem. Nada é apagado
 * automaticamente — a decisão é do usuário.
 */
export function MigracaoAntiga({
  antigos,
  onConcluir,
}: {
  antigos: DadosExportados;
  onConcluir: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const substituirTudo = useStore((s) => s.substituirTudo);

  const naNuvem = useStore((s) => s.metas.length);

  async function enviar() {
    setOcupado(true);
    setErro(null);
    try {
      const s = useStore.getState();
      const atuais: DadosExportados = {
        versao: 2,
        exportadoEm: new Date().toISOString(),
        metas: s.metas,
        etiquetas: s.etiquetas,
        prioridades: s.prioridades,
        limiteFoco: s.limiteFoco,
      };
      // A nuvem é a base; o que veio deste aparelho entra por cima, sem perder
      // dias cumpridos dos dois lados (ver `mesclarDados`).
      const fundidos = mesclarDados(atuais, antigos);
      substituirTudo(fundidos, true);
      await sincronizarAgora();
      concluir();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setOcupado(false);
    }
  }

  function concluir() {
    marcarMigracaoFeita();
    descartarDadosAntigos();
    onConcluir();
  }

  function pular() {
    // Mantém a cópia antiga intacta no navegador; só não pergunta de novo.
    marcarMigracaoFeita();
    onConcluir();
  }

  const habitos = antigos.metas.filter((m) => m.historico.length).length;
  const diasRegistrados = new Set(antigos.metas.flatMap((m) => m.historico)).size;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-3xl">📦</span>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Dados guardados neste aparelho</h1>
            <p className="text-sm text-slate-400">
              Antes, cada navegador guardava a própria lista. Encontramos uma aqui.
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <Numero valor={antigos.metas.length} rotulo="metas" />
          <Numero valor={habitos} rotulo="com histórico" />
          <Numero valor={diasRegistrados} rotulo="dias marcados" />
        </div>

        <p className="mb-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
          Enviar junta esta lista com a que já está na sua conta
          {naNuvem > 0 ? ` (${naNuvem} meta(s) na nuvem)` : ''}. Itens iguais são unidos — vale a
          versão mais recente — e nenhum dia de sequência é perdido.
        </p>

        {erro && (
          <p className="mb-4 rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{erro}</p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={enviar}
            disabled={ocupado}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {ocupado ? 'Enviando...' : '☁️ Enviar para a nuvem'}
          </button>
          <button
            onClick={pular}
            disabled={ocupado}
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            Agora não
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-600">
          "Agora não" não apaga nada — a cópia antiga continua neste navegador.
        </p>
      </div>
    </div>
  );
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <div className="text-2xl font-bold text-emerald-400">{valor}</div>
      <div className="text-[11px] text-slate-500">{rotulo}</div>
    </div>
  );
}
