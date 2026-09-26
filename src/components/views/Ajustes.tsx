import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { sincronizarAgora, useSyncStore } from '../../lib/sync';
import { normalizarDados } from '../../lib/migracao';
import { SincronizacaoBadge } from '../SincronizacaoBadge';

export function Ajustes() {
  const { etiquetas, prioridades } = useStore();
  const adicionarEtiqueta = useStore((s) => s.adicionarEtiqueta);
  const atualizarEtiqueta = useStore((s) => s.atualizarEtiqueta);
  const removerEtiqueta = useStore((s) => s.removerEtiqueta);
  const atualizarPrioridade = useStore((s) => s.atualizarPrioridade);
  const moverPrioridade = useStore((s) => s.moverPrioridade);
  const exportarDados = useStore((s) => s.exportarDados);
  const importarDados = useStore((s) => s.importarDados);
  const resetar = useStore((s) => s.resetar);

  const ultimoSync = useSyncStore((s) => s.ultimoSync);
  const erroSync = useSyncStore((s) => s.erro);

  const [novaTag, setNovaTag] = useState('');
  const [novaCor, setNovaCor] = useState('#8b5cf6');
  // undefined = ainda carregando; null = sessão sem e-mail
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [senhaErro, setSenhaErro] = useState<string | null>(null);
  const [senhaOk, setSenhaOk] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const prioridadesOrd = [...prioridades].sort((a, b) => a.ordem - b.ordem);

  function exportar() {
    const dados = exportarDados();
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importar(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        // Normaliza para o formato atual: aceita backups da versão antiga.
        const dados = normalizarDados(JSON.parse(String(reader.result)));
        if (!confirm(`Importar ${dados.metas.length} meta(s)? Isso substitui a lista atual.`)) {
          return;
        }
        importarDados(dados);
        void sincronizarAgora();
        alert('Dados importados e enviados para a nuvem.');
      } catch {
        alert('Arquivo inválido.');
      }
    };
    reader.readAsText(file);
  }

  async function sair() {
    if (!confirm('Sair da conta neste aparelho?')) return;
    await sincronizarAgora();
    await supabase?.auth.signOut();
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    setSenhaErro(null);
    setSenhaOk(false);

    if (novaSenha.length < 8) {
      setSenhaErro('Use pelo menos 8 caracteres.');
      return;
    }
    if (novaSenha !== confirmaSenha) {
      setSenhaErro('As duas senhas não são iguais.');
      return;
    }

    setSalvandoSenha(true);
    try {
      const { error } = await supabase!.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setSenhaOk(true);
      setNovaSenha('');
      setConfirmaSenha('');
      setTrocandoSenha(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSenhaErro(
        msg.toLowerCase().includes('should be different')
          ? 'A senha nova precisa ser diferente da atual.'
          : msg,
      );
    } finally {
      setSalvandoSenha(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <p className="text-sm text-slate-400">Conta, etiquetas, prioridades e backup.</p>
      </header>

      {/* Conta e sincronização */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Conta</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-200">
                {email === undefined ? 'carregando...' : (email ?? 'sem sessão')}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <SincronizacaoBadge />
              </div>
              {ultimoSync && (
                <div className="mt-0.5 text-[11px] text-slate-600">
                  Última sincronização: {new Date(ultimoSync).toLocaleString('pt-BR')}
                </div>
              )}
              {erroSync && <div className="mt-0.5 text-[11px] text-red-400">{erroSync}</div>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void sincronizarAgora()}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-700"
              >
                ⟳ Sincronizar
              </button>
              <button
                onClick={() => {
                  setTrocandoSenha((v) => !v);
                  setSenhaErro(null);
                  setSenhaOk(false);
                }}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-700"
              >
                🔑 Trocar senha
              </button>
              <button
                onClick={() => void sair()}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Sair
              </button>
            </div>
          </div>

          {senhaOk && (
            <p className="mt-3 rounded-lg bg-emerald-950/60 px-3 py-2 text-sm text-emerald-300">
              Senha alterada. Ela vale em todos os aparelhos no próximo login.
            </p>
          )}

          {trocandoSenha && (
            <form onSubmit={trocarSenha} className="mt-3 space-y-2">
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Nova senha"
                autoComplete="new-password"
                autoFocus
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <input
                type="password"
                value={confirmaSenha}
                onChange={(e) => setConfirmaSenha(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              {senhaErro && (
                <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{senhaErro}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={salvandoSenha}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {salvandoSenha ? 'Salvando...' : 'Salvar senha'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTrocandoSenha(false);
                    setNovaSenha('');
                    setConfirmaSenha('');
                    setSenhaErro(null);
                  }}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <p className="mt-3 text-xs text-slate-500">
            Suas metas ficam na sua conta e aparecem em qualquer aparelho onde você entrar. Sem
            internet o app continua funcionando e envia as mudanças quando a conexão voltar.
          </p>
        </div>
      </section>

      {/* Prioridades */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Prioridades (ordem &amp; cor)
        </h2>
        <div className="space-y-2">
          {prioridadesOrd.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5"
            >
              <span className="w-6 text-center text-xs font-bold text-slate-500">P{i + 1}</span>
              <input
                type="color"
                value={p.cor}
                onChange={(e) => atualizarPrioridade(p.id, { cor: e.target.value })}
                className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
              />
              <input
                value={p.nome}
                onChange={(e) => atualizarPrioridade(p.id, { nome: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => moverPrioridade(p.id, -1)}
                  disabled={i === 0}
                  className="h-7 w-7 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => moverPrioridade(p.id, 1)}
                  disabled={i === prioridadesOrd.length - 1}
                  className="h-7 w-7 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Etiquetas */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Etiquetas</h2>
        <div className="space-y-2">
          {etiquetas.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5"
            >
              <input
                type="color"
                value={e.cor}
                onChange={(ev) => atualizarEtiqueta(e.id, { cor: ev.target.value })}
                className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent"
              />
              <input
                value={e.nome}
                onChange={(ev) => atualizarEtiqueta(e.id, { nome: ev.target.value })}
                className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => {
                  if (confirm(`Remover etiqueta "${e.nome}"?`)) removerEtiqueta(e.id);
                }}
                className="h-7 w-7 rounded bg-slate-800 text-red-400 hover:bg-red-900/50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={novaCor}
            onChange={(e) => setNovaCor(e.target.value)}
            className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent"
          />
          <input
            value={novaTag}
            onChange={(e) => setNovaTag(e.target.value)}
            placeholder="Nova etiqueta..."
            className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => {
              if (novaTag.trim()) {
                adicionarEtiqueta(novaTag.trim(), novaCor);
                setNovaTag('');
              }
            }}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Adicionar
          </button>
        </div>
      </section>

      {/* Backup */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Backup dos dados
        </h2>
        <p className="text-xs text-slate-500">
          A nuvem já mantém tudo sincronizado. O arquivo JSON serve como cópia de segurança
          independente, para você guardar onde quiser.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportar}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-700"
          >
            ⬇️ Exportar JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium hover:bg-slate-700"
          >
            ⬆️ Importar JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importar(f);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      {/* Zona de perigo */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-400">Zona de perigo</h2>
        <button
          onClick={() => {
            if (
              confirm(
                'Isso apaga TODAS as metas da sua conta, em todos os aparelhos. Não dá para desfazer. Continuar?',
              )
            ) {
              resetar();
              void sincronizarAgora();
            }
          }}
          className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-900/40"
        >
          Apagar todos os dados da conta
        </button>
        <p className="text-xs text-slate-600">
          Exporte um JSON antes — a exclusão vale para todos os aparelhos.
        </p>
      </section>

      <footer className="pt-2 text-center text-xs text-slate-600">
        Agenda · dados na sua conta · instalável como app
      </footer>
    </div>
  );
}
