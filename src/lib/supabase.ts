import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chaveAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * A chave anon é pública por design — ela vai no bundle do navegador. Quem
 * protege os dados é a Row Level Security do Postgres (ver supabase/schema.sql):
 * cada linha só é legível/gravável por `auth.uid() = user_id`.
 */
export const supabaseConfigurado = Boolean(url && chaveAnon);

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url!, chaveAnon!, {
      auth: {
        // localStorage (padrão) em vez de sessionStorage: fechar a aba não desloga.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/** Uso interno: só chame depois de checar `supabaseConfigurado`. */
export function exigirSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
