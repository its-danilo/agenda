import { useState } from 'react';
import { exigirSupabase } from '../lib/supabase';
import { entrarNaDemo } from '../lib/demo';

type Modo = 'entrar' | 'criar' | 'recuperar';

const TEXTOS: Record<Modo, { titulo: string; subtitulo: string; botao: string }> = {
  entrar: { titulo: 'Agenda', subtitulo: 'Entre para continuar', botao: 'Entrar' },
  criar: { titulo: 'Criar conta', subtitulo: 'Sua agenda, em todos os aparelhos', botao: 'Criar conta' },
  recuperar: {
    titulo: 'Recuperar senha',
    subtitulo: 'Enviamos um link para o seu e-mail',
    botao: 'Enviar link',
  },
};

/** Traduz os erros do Supabase, que chegam em inglês. */
function traduzirErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('user already registered')) return 'Já existe uma conta com esse e-mail.';
  if (m.includes('password should be at least'))
    return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled'))
    return 'Cadastro de novas contas está desativado.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Muitas tentativas seguidas. Espere um pouco.';
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Sem conexão com o servidor. Verifique a internet.';
  return msg;
}

export function Login() {
  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const t = TEXTOS[modo];

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      const sb = exigirSupabase();

      if (modo === 'entrar') {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw error;
        // O onAuthStateChange no App assume daqui.
      } else if (modo === 'criar') {
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password: senha });
        if (error) throw error;
        if (!data.session) {
          setAviso('Conta criada. Confirme o e-mail que enviamos e depois entre.');
          setModo('entrar');
        }
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setAviso('Link de recuperação enviado. Confira sua caixa de entrada.');
        setModo('entrar');
      }
    } catch (err) {
      setErro(traduzirErro(err instanceof Error ? err.message : String(err)));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <form
        onSubmit={submeter}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/40"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-lg shadow-emerald-900/50">
            ✓
          </div>
          <h1 className="text-xl font-semibold text-slate-100">{t.titulo}</h1>
          <p className="mt-1 text-sm text-slate-400">{t.subtitulo}</p>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm text-slate-400">E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="username"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-emerald-500"
          />
        </label>

        {modo !== 'recuperar' && (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-slate-400">Senha</span>
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-emerald-500"
            />
          </label>
        )}

        {erro && (
          <p className="mb-4 rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{erro}</p>
        )}
        {aviso && (
          <p className="mb-4 rounded-lg bg-emerald-950/60 px-3 py-2 text-sm text-emerald-300">
            {aviso}
          </p>
        )}

        <button
          type="submit"
          disabled={ocupado}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {ocupado ? 'Aguarde...' : t.botao}
        </button>

        <div className="mt-4 flex justify-between text-xs text-slate-500">
          {modo === 'entrar' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setModo('criar');
                  setErro(null);
                }}
                className="hover:text-slate-300"
              >
                Criar conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setModo('recuperar');
                  setErro(null);
                }}
                className="hover:text-slate-300"
              >
                Esqueci a senha
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setModo('entrar');
                setErro(null);
              }}
              className="hover:text-slate-300"
            >
              ← Voltar para o login
            </button>
          )}
        </div>
      </form>

      <p className="text-sm text-slate-500">
        Só quer conhecer o app?{' '}
        <button
          type="button"
          onClick={entrarNaDemo}
          className="font-medium text-violet-400 hover:text-violet-300"
        >
          Ver demonstração →
        </button>
      </p>
    </div>
  );
}

/** Mostrada quando faltam as variáveis de ambiente do Supabase. */
export function SupabaseNaoConfigurado() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-900 bg-amber-950/30 p-6">
        <h1 className="mb-2 text-lg font-bold text-amber-200">Configuração faltando</h1>
        <p className="mb-3 text-sm text-amber-100/80">
          O app não sabe com qual servidor falar. Defina as duas variáveis abaixo no arquivo{' '}
          <code className="rounded bg-slate-900 px-1">.env.local</code> (local) e nas{' '}
          <em>Environment Variables</em> do projeto na Vercel:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-300">
          VITE_SUPABASE_URL={'\n'}VITE_SUPABASE_ANON_KEY=
        </pre>
        <p className="mt-3 text-xs text-amber-100/60">
          Depois rode o arquivo <code className="rounded bg-slate-900 px-1">supabase/schema.sql</code>{' '}
          no SQL Editor do Supabase.
        </p>
      </div>
    </div>
  );
}
