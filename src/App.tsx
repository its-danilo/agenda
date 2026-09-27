import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Meta } from './types';
import type { DadosExportados, Vista } from './store';
import {
  limparStoreDaSessao,
  prepararStoreParaDemo,
  prepararStoreParaUsuario,
  useStore,
} from './store';
import { supabase, supabaseConfigurado } from './lib/supabase';
import { iniciarSync, marcarContaSemeada, pararSync, sincronizarAgora } from './lib/sync';
import { lerDadosAntigos, marcarMigracaoFeita, migracaoJaFeita } from './lib/migracao';
import { emDemo, recomecarDemo, sairDaDemo } from './lib/demo';
import { NavBar } from './components/NavBar';
import { MetaForm } from './components/MetaForm';
import { MigracaoAntiga } from './components/MigracaoAntiga';
import { Login, SupabaseNaoConfigurado } from './components/Login';
import { AvisoAtualizacao } from './components/AvisoAtualizacao';
import { Hoje } from './components/views/Hoje';
import { Agenda } from './components/views/Agenda';
import { Metas } from './components/views/Metas';
import { Revisao } from './components/views/Revisao';
import { Foco } from './components/views/Foco';
import { Progresso } from './components/views/Progresso';
import { Ajustes } from './components/views/Ajustes';

function useDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const fn = () => setDesktop(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return desktop;
}

type Fase = 'carregando' | 'deslogado' | 'preparando' | 'migracao' | 'pronto' | 'erro';

export default function App() {
  return emDemo ? <AppDemo /> : <AppConta />;
}

/** A demonstração pública: sem login, sem nuvem, dados de exemplo neste navegador. */
function AppDemo() {
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    void prepararStoreParaDemo().then(() => setPronto(true));
  }, []);

  if (!pronto) return <Carregando texto="" />;

  return (
    <>
      <Principal faixa={<FaixaDemo />} />
      <AvisoAtualizacao />
    </>
  );
}

function FaixaDemo() {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-violet-900/70 bg-violet-950/40 px-4 py-3 text-sm">
      <p className="min-w-0 flex-1 text-violet-100/90">
        <span className="font-semibold text-violet-200">Demonstração</span> com dados de exemplo.
        Mexa à vontade: tudo fica só neste navegador.
      </p>
      <div className="flex gap-2">
        <button
          onClick={recomecarDemo}
          className="rounded-lg border border-violet-800 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-900/50"
        >
          Recomeçar
        </button>
        <button
          onClick={sairDaDemo}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

function AppConta() {
  const [fase, setFase] = useState<Fase>('carregando');
  const [erro, setErro] = useState<string | null>(null);
  const [antigos, setAntigos] = useState<DadosExportados | null>(null);
  // Evita preparar duas vezes o mesmo usuário (StrictMode roda os efeitos 2x em dev).
  const usuarioPreparado = useRef<string | null>(null);
  const precisaSemear = useRef(false);
  const usuarioId = useRef<string | null>(null);

  const preparar = useCallback(async (userId: string) => {
    if (usuarioPreparado.current === userId) return;
    usuarioPreparado.current = userId;
    usuarioId.current = userId;
    setFase('preparando');
    setErro(null);

    try {
      await prepararStoreParaUsuario(userId);
      const resumo = await iniciarSync(userId);

      const pendentes = migracaoJaFeita() ? null : lerDadosAntigos();
      setAntigos(pendentes);

      const contaVazia = !resumo.contaSemeada && resumo.metasNaNuvem === 0;
      precisaSemear.current = contaVazia;

      if (pendentes) {
        setFase('migracao');
        return;
      }

      if (contaVazia) {
        useStore.getState().semear();
        await sincronizarAgora();
        await marcarContaSemeada(userId);
        precisaSemear.current = false;
      }

      setFase('pronto');
    } catch (e) {
      usuarioPreparado.current = null;
      setErro(e instanceof Error ? e.message : String(e));
      setFase('erro');
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado || !supabase) {
      setFase('deslogado');
      return;
    }

    let vivo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      if (data.session) void preparar(data.session.user.id);
      else setFase('deslogado');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (!vivo) return;
      if (evento === 'SIGNED_OUT' || !sessao) {
        pararSync();
        limparStoreDaSessao();
        usuarioPreparado.current = null;
        usuarioId.current = null;
        setAntigos(null);
        setFase('deslogado');
        return;
      }
      void preparar(sessao.user.id);
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [preparar]);

  async function concluirMigracao() {
    setAntigos(null);
    const id = usuarioId.current;
    if (precisaSemear.current && id) {
      // A conta nasceu com os dados migrados: não deve plantar as metas de
      // exemplo depois.
      try {
        await marcarContaSemeada(id);
      } catch {
        /* tenta de novo no próximo login */
      }
      precisaSemear.current = false;
    }
    marcarMigracaoFeita();
    setFase('pronto');
  }

  if (!supabaseConfigurado) return <SupabaseNaoConfigurado />;

  const aviso = <AvisoAtualizacao />;

  if (fase === 'carregando' || fase === 'preparando') {
    return <Carregando texto={fase === 'preparando' ? 'Sincronizando sua agenda...' : ''} />;
  }

  if (fase === 'erro') {
    return (
      <TelaErro
        erro={erro}
        onTentar={() => {
          const id = usuarioId.current;
          usuarioPreparado.current = null;
          if (id) void preparar(id);
          else setFase('deslogado');
        }}
        onSair={() => void supabase?.auth.signOut()}
      />
    );
  }

  if (fase === 'deslogado')
    return (
      <>
        <Login />
        {aviso}
      </>
    );

  if (fase === 'migracao' && antigos) {
    return <MigracaoAntiga antigos={antigos} onConcluir={concluirMigracao} />;
  }

  return (
    <>
      <Principal />
      {aviso}
    </>
  );
}

/** O app em si: navegação, a vista atual e o formulário de meta. */
function Principal({ faixa }: { faixa?: ReactNode }) {
  const [vista, setVista] = useState<Vista>('hoje');
  const [form, setForm] = useState<Meta | 'nova' | null>(null);
  const desktop = useDesktop();

  return (
    <div className="flex min-h-screen">
      {desktop && <NavBar vista={vista} setVista={setVista} orientacao="vertical" />}

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-5 md:pb-8">
        {faixa}
        {vista === 'hoje' && <Hoje onEditar={setForm} onRevisar={() => setVista('revisao')} />}
        {vista === 'agenda' && <Agenda onEditar={setForm} />}
        {vista === 'metas' && <Metas onEditar={setForm} onNova={() => setForm('nova')} />}
        {vista === 'revisao' && <Revisao onEditar={setForm} />}
        {vista === 'foco' && <Foco />}
        {vista === 'progresso' && <Progresso />}
        {vista === 'ajustes' && <Ajustes />}
      </main>

      {(vista === 'hoje' || vista === 'metas' || vista === 'agenda') && (
        <button
          onClick={() => setForm('nova')}
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-3xl text-white shadow-lg shadow-emerald-900/50 transition hover:bg-emerald-500 md:bottom-6"
          title="Nova meta"
        >
          +
        </button>
      )}

      {!desktop && <NavBar vista={vista} setVista={setVista} orientacao="horizontal" />}

      {form !== null && <MetaForm meta={form} onFechar={() => setForm(null)} />}
    </div>
  );
}

function Carregando({ texto }: { texto: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-slate-400">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-500" />
      {texto && <p className="text-sm">{texto}</p>}
    </div>
  );
}

function TelaErro({
  erro,
  onTentar,
  onSair,
}: {
  erro: string | null;
  onTentar: () => void;
  onSair: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-red-900 bg-red-950/30 p-6">
        <h1 className="mb-2 text-lg font-bold text-red-200">Não deu para sincronizar</h1>
        <p className="mb-3 text-sm text-red-100/80">
          Suas alterações continuam salvas neste aparelho e sobem assim que a conexão voltar.
        </p>
        {erro && (
          <pre className="mb-4 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-400">
            {erro}
          </pre>
        )}
        <div className="flex gap-2">
          <button
            onClick={onTentar}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Tentar de novo
          </button>
          <button
            onClick={onSair}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
