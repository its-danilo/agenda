-- ============================================================================
-- Agenda de Metas — schema Supabase
-- Rode este arquivo inteiro no SQL Editor do painel do Supabase.
-- É idempotente: pode rodar de novo sem quebrar nada.
-- ============================================================================

-- ── Tabelas ─────────────────────────────────────────────────────────────────

create table if not exists public.configuracoes (
  user_id       uuid primary key references auth.users on delete cascade,
  limite_foco   int  not null default 6,
  semeado       boolean not null default false,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.prioridades (
  user_id       uuid not null references auth.users on delete cascade,
  id            text not null,
  nome          text not null,
  cor           text not null,
  ordem         int  not null default 0,
  removido      boolean not null default false,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.etiquetas (
  user_id       uuid not null references auth.users on delete cascade,
  id            text not null,
  nome          text not null,
  cor           text not null,
  removido      boolean not null default false,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.metas (
  user_id         uuid not null references auth.users on delete cascade,
  id              text not null,
  titulo          text not null,
  descricao       text,
  categoria       text not null,
  horizonte       text not null default 'longo',   -- curto | medio | longo
  cadencia        text not null,                   -- diaria | semanal | mensal | pontual | para_sempre | projeto
  dias_semana     int[]  not null default '{}',    -- 0=domingo … 6=sábado (cadência semanal)
  dia_do_mes      int,                             -- 1–31 (cadência mensal)
  prioridade_id   text not null,
  etiquetas       text[] not null default '{}',
  status          text not null,                   -- fila | ativa | pausada | concluida
  minutos_por_dia int,
  estimativa_texto text,
  data_alvo       date,
  agendada_para   date,
  notas           text,
  subtarefas      jsonb not null default '[]'::jsonb,
  progresso       int,
  historico       text[] not null default '{}',
  criada_em       timestamptz not null default now(),
  removido        boolean not null default false,
  atualizado_em   timestamptz not null default now(),
  primary key (user_id, id)
);

-- ── Índices para o pull incremental (where atualizado_em > cursor) ───────────

create index if not exists metas_sync_idx       on public.metas (user_id, atualizado_em);
create index if not exists etiquetas_sync_idx   on public.etiquetas (user_id, atualizado_em);
create index if not exists prioridades_sync_idx on public.prioridades (user_id, atualizado_em);

-- ── Row Level Security: cada usuário só enxerga as próprias linhas ───────────

alter table public.configuracoes enable row level security;
alter table public.prioridades  enable row level security;
alter table public.etiquetas    enable row level security;
alter table public.metas        enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['configuracoes', 'prioridades', 'etiquetas', 'metas'] loop
    execute format('drop policy if exists %I on public.%I', t || '_proprio', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_proprio', t
    );
  end loop;
end $$;

-- ── Realtime: o PC reflete o celular ao vivo ────────────────────────────────

-- Se este bloco não puder rodar (falta de permissão no projeto), o app continua
-- funcionando: ele sincroniza ao abrir, ao voltar o foco da aba e a cada
-- alteração. O realtime só deixa a atualização instantânea entre aparelhos.
-- Nesse caso, ligue pelo painel: Database → Replication → supabase_realtime.
do $$
declare
  t text;
begin
  foreach t in array array['metas', 'etiquetas', 'prioridades', 'configuracoes'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;   -- já estava na publicação
      when others then
        raise notice 'Realtime não habilitado para %: % (ligue pelo painel)', t, sqlerrm;
    end;
  end loop;
end $$;
