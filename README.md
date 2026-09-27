# Agenda 🎯

Agenda pessoal de **curto, médio e longo prazo**, com foco, etiquetas, prioridades coloridas e
constância (streaks). Os dados ficam na **sua conta**, sincronizados entre celular e PC, e o app
continua funcionando **offline** — as mudanças sobem sozinhas quando a conexão volta. Instalável
como app (PWA).

## Demonstração

Abra o app com `?demo` no fim do endereço (ou clique em **Ver demonstração** na tela de login)
para usar sem conta: ele abre com metas de exemplo e algumas semanas de histórico inventado. Nada
vai para a nuvem; as mudanças ficam só naquele navegador, e **Recomeçar** volta ao exemplo.

## Ideia central: Foco Ativo

Você tem muitas metas, mas não dá para fazer todas ao mesmo tempo. Cada item tem um **status**
(`fila`, `ativa`, `pausada`, `concluída`) e existe um **limite de foco (WIP)**. A tela **Hoje** só
mostra o que está ativo *e cai hoje* — o resto espera na fila.

## Telas

- **☀️ Hoje** — hábitos que caem hoje, tarefas para hoje/atrasadas e o que está em andamento.
- **🗓️ Agenda** — visão por **Semana** e **Mês**, com os itens no dia em que acontecem.
- **🎯 Metas** — tudo agrupado por **horizonte** (curto/médio/longo) ou por categoria, com busca e filtros.
- **🧭 Foco** — move itens entre fila e ativos, respeitando o limite.
- **📈 Progresso** — mapa de constância, sequências, conclusão por horizonte e por categoria.
- **⚙️ Ajustes** — conta, sincronização, etiquetas, prioridades, backup JSON.

## Modelo

- **Horizonte**: `curto` (dias a poucas semanas), `medio` (semanas a poucos meses), `longo` (meses a anos).
- **Repetição**: `diária`, `semanal` (dias escolhidos da semana), `mensal` (um dia do mês),
  `para sempre`, `pontual`, `projeto`.
- **Datas**: `dataAlvo` (prazo) e `agendadaPara` (dia marcado na agenda). O campo de estimativa
  (`~3 meses`) continua existindo como atalho para preencher o prazo.
- **Etapas (subtarefas)**: quando existem, o progresso passa a ser **calculado** a partir delas.
- **Notas**: texto livre por item.

O streak de metas recorrentes conta **só os dias em que a meta era devida** — uma meta 3x/semana
não perde a sequência nos dias de folga.

## Configuração (uma vez)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql). Ele cria as
   tabelas, liga a Row Level Security e habilita o realtime.
3. Copie `.env.example` para `.env.local` e preencha:

   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```

   Ambas são chaves **públicas** (vão no bundle do navegador). Quem protege os dados é a RLS.
   A chave `service_role` **não** deve ser usada aqui.
4. Abra o app, use **Criar conta** e defina sua senha.
5. No painel do Supabase → *Authentication → Providers → Email*, **desative** "Allow new users to
   sign up" para que só a sua conta exista.
6. Na Vercel, cadastre as mesmas duas variáveis em *Settings → Environment Variables* e refaça o deploy.

## Como rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testes da lógica de recorrência, streak, calendário e merge
npm run build    # gera dist/ (PWA pronta)
```

## Sincronização

- O `localStorage` é **cache de trabalho**, não a fonte da verdade: o app abre e funciona sem rede.
- Cada registro carrega `atualizadoEm`; conflitos entre aparelhos se resolvem por *last-write-wins*.
- Exceção proposital: o **histórico de dias cumpridos é sempre unido**, nunca sobrescrito — dia
  marcado não se perde numa corrida entre celular e PC.
- Exclusões viajam como *soft delete* (`removido`), senão o outro aparelho devolveria o item apagado.
- Mudanças feitas offline ficam numa fila local e sobem ao voltar a conexão.

## Vindo da versão antiga (só localStorage)

Antes, cada navegador guardava a própria lista na chave `agenda-metas-v1` — por isso os aparelhos
mostravam coisas diferentes. No primeiro login em um aparelho que ainda tenha essa cópia, o app
oferece enviá-la para a nuvem, unindo com o que já estiver lá (itens iguais são fundidos pela versão
mais recente, e nenhum dia de sequência é perdido). "Agora não" não apaga nada.

## Estrutura

```
supabase/schema.sql        # tabelas, RLS e realtime
testes/logica.ts           # testes sem framework (npm test)
src/
  types.ts                 # tipos e constantes (horizontes, cadências, status)
  store.ts                 # estado global (zustand) + fila de sincronização
  data/seed.ts             # itens iniciais de uma conta nova
  lib/
    supabase.ts            # cliente
    sync.ts                # push/pull, realtime, fila offline
    migracao.ts            # leitura e merge dos dados antigos
    mapeamento.ts          # linha do Postgres <-> objeto do app
    recorrencia.ts         # quando uma meta cai, streak, progresso
    dates.ts               # prazos e helpers de calendário
    streaks.ts             # mapa de constância
  components/              # MetaCard, MetaForm, NavBar, Login, badges...
    views/                 # Hoje, Agenda, Metas, Foco, Progresso, Ajustes
```
