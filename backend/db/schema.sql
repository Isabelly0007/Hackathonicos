-- =====================================================================
-- Taylor — esquema do banco (Supabase / PostgreSQL)
-- Fonte: docs/modelo-dados.md (fonte da verdade do modelo)
--
-- Tudo fica no schema __SCHEMA__ (trocado pelo setup_db.py) para NÃO
-- conflitar com as tabelas do bot_estoque no schema public.
-- Convenções: snake_case no singular, PK uuid, criado_em/atualizado_em
-- timestamptz, dinheiro numeric(12,2), enums como text + CHECK e
-- empresa_id em toda tabela operacional (isolamento multiempresa, RN003).
--
-- Acréscimos ao modelo da documentação (marcados com "ACRÉSCIMO"):
--   * empresa.uf e empresa.proximo_numero_nfe (CFOP por UF e numeração NF-e);
--   * marketplace.ordem e marketplace.cor (ordem/cor fixas exigidas pelo front);
--   * notificacao.icone (o front exibe um ícone por notificação);
--   * sincronizacao.novos_pedidos e sincronizacao.erros (resposta de /syncs);
--   * nota_fiscal.pendencias e nota_fiscal.bloqueios ("Rejeições evitadas");
--   * tabela movimento_estoque (mesma ideia da usada pelo bot_estoque).
-- =====================================================================

create schema if not exists __SCHEMA__;
comment on schema __SCHEMA__ is 'taylor-backend: criado por backend/setup_db.py (repo Hackathonicos)';
set search_path to __SCHEMA__;

-- ---------- Funções utilitárias ----------

create or replace function tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = __SCHEMA__
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- Status do produto (RN011, RN012). Estoque baixo = estoque_central <= mínimo
-- (decisão da pendência P8: "atingir o estoque mínimo").
create or replace function status_produto(estoque integer, minimo integer)
returns text
language sql
immutable
as $$
  select case
    when estoque = 0 then 'sem_estoque'
    when estoque <= minimo then 'estoque_baixo'
    else 'ativo'
  end;
$$;

-- ---------- 2.1 usuario ----------
create table usuario (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (btrim(nome) <> ''),
  email      text not null unique check (email = lower(email)),
  senha_hash text not null,   -- bcrypt; a senha nunca é salva
  criado_em  timestamptz not null default now()
);

-- ---------- 2.2 empresa ----------
create table empresa (
  id                 uuid primary key default gen_random_uuid(),
  razao_social       text,
  nome_fantasia      text not null check (btrim(nome_fantasia) <> ''),
  cnpj               text not null unique check (cnpj ~ '^[0-9]{14}$'),   -- sem máscara
  inscricao_estadual text,
  regime_tributario  text check (regime_tributario in ('simples_nacional', 'lucro_presumido', 'lucro_real')),
  email_contato      text,
  telefone           text,
  endereco           text,
  uf                 char(2),                          -- ACRÉSCIMO
  logo_url           text,
  proximo_numero_nfe integer not null default 1,       -- ACRÉSCIMO
  criado_em          timestamptz not null default now()
);

-- ---------- 2.3 usuario_empresa ----------
create table usuario_empresa (
  usuario_id uuid not null references usuario (id) on delete cascade,
  empresa_id uuid not null references empresa (id) on delete cascade,
  papel      text not null default 'administrador'
             check (papel in ('administrador', 'operacao', 'financeiro', 'expedicao')),
  status     text not null default 'ativo' check (status in ('ativo', 'convite_pendente')),
  criado_em  timestamptz not null default now(),
  primary key (usuario_id, empresa_id)
);
create index on usuario_empresa (empresa_id);

-- ---------- 2.4 preferencia_empresa ----------
create table preferencia_empresa (
  empresa_id                 uuid primary key references empresa (id) on delete cascade,
  idioma                     text not null default 'pt-BR' check (idioma in ('pt-BR', 'en', 'es')),
  fuso_horario               text not null default 'America/Sao_Paulo'
                             check (fuso_horario in ('America/Sao_Paulo', 'America/Manaus', 'America/Noronha')),
  sincronizar_estoque_auto   boolean not null default true,
  pausar_anuncio_sem_estoque boolean not null default true,
  importar_pedidos_auto      boolean not null default true,
  intervalo_conferencia_min  integer not null default 5 check (intervalo_conferencia_min in (5, 15, 30, 60)),
  receber_telegram           boolean not null default true,
  receber_email              boolean not null default true,
  receber_push               boolean not null default false,
  resumo_diario              boolean not null default true
);

-- ---------- 2.5 certificado_digital [SIMULADO] ----------
create table certificado_digital (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null unique references empresa (id) on delete cascade,
  tipo       text not null default 'A1' check (tipo in ('A1')),
  titular    text,
  validade   date not null,
  simulado   boolean not null default true
);

-- ---------- 2.6 marketplace (dados de referência) ----------
create table marketplace (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique,
  sigla text,
  tipo  text not null check (tipo in ('marketplace', 'atendimento')),
  ordem integer not null default 99,   -- ACRÉSCIMO: o front usa a posição para a cor do logo
  cor   text                           -- ACRÉSCIMO: classe da linha no gráfico (blue/red/purple)
);

insert into marketplace (nome, sigla, tipo, ordem, cor) values
  ('Mercado Livre', 'ML', 'marketplace', 1, 'blue'),
  ('Shopee',        'S',  'marketplace', 2, 'red'),
  ('Magalu',        'M',  'marketplace', 3, 'purple'),
  ('Telegram',      null, 'atendimento', 4, null);

-- ---------- 2.7 integracao ----------
create table integracao (
  id                   uuid primary key default gen_random_uuid(),
  empresa_id           uuid not null references empresa (id) on delete cascade,
  marketplace_id       uuid not null references marketplace (id),
  status               text not null default 'conectado' check (status in ('conectado', 'desconectado')),
  conta_vinculada      text,
  access_token         text,   -- armazenar criptografado quando o OAuth real existir
  refresh_token        text,
  token_expira_em      timestamptz,
  ultima_sincronizacao timestamptz,
  simulada             boolean not null default true,
  criado_em            timestamptz not null default now(),
  unique (empresa_id, marketplace_id)
);

-- ---------- 2.8 produto ----------
create table produto (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresa (id) on delete cascade,
  nome            text not null,
  sku             text not null,
  preco           numeric(12, 2) not null check (preco >= 0),
  estoque_central integer not null default 0 check (estoque_central >= 0),
  estoque_minimo  integer not null default 0 check (estoque_minimo >= 0),
  ncm             text,
  origem_fiscal   text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (empresa_id, sku)
);
create trigger produto_atualizado_em before update on produto
  for each row execute function tocar_atualizado_em();

-- ---------- 2.9 anuncio ----------
create table anuncio (
  id                uuid primary key default gen_random_uuid(),
  produto_id        uuid not null references produto (id) on delete cascade,
  integracao_id     uuid not null references integracao (id) on delete cascade,
  id_externo        text,
  estoque_publicado integer not null default 0 check (estoque_publicado >= 0),
  status            text not null default 'ativo' check (status in ('ativo', 'pausado')),
  atualizado_em     timestamptz not null default now(),
  unique (produto_id, integracao_id)
);
create index on anuncio (integracao_id);
create trigger anuncio_atualizado_em before update on anuncio
  for each row execute function tocar_atualizado_em();

-- ---------- 2.10 cliente ----------
create table cliente (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa (id) on delete cascade,
  nome       text not null,
  cpf_cnpj   text,
  endereco   text,
  uf         char(2),
  criado_em  timestamptz not null default now()
);
create index on cliente (empresa_id);

-- ---------- 2.11 pedido ----------
create table pedido (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresa (id) on delete cascade,
  integracao_id    uuid not null references integracao (id),
  cliente_id       uuid references cliente (id),
  codigo           text not null,
  data_pedido      timestamptz not null default now(),
  quantidade_itens integer not null check (quantidade_itens >= 1),
  valor_total      numeric(12, 2) not null check (valor_total >= 0),
  status           text not null default 'aguardando'
                   check (status in ('aguardando', 'em_separacao', 'em_transporte', 'entregue', 'cancelado')),
  unique (empresa_id, codigo)
);
create index on pedido (empresa_id, data_pedido desc);
create index on pedido (integracao_id);

-- ---------- 2.12 item_pedido ----------
create table item_pedido (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references pedido (id) on delete cascade,
  produto_id     uuid not null references produto (id),
  quantidade     integer not null check (quantidade >= 1),
  preco_unitario numeric(12, 2) not null check (preco_unitario >= 0)
);
create index on item_pedido (pedido_id);
create index on item_pedido (produto_id);

-- ---------- 2.13 nota_fiscal [SIMULADO] ----------
create table nota_fiscal (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresa (id) on delete cascade,
  pedido_id       uuid not null unique references pedido (id) on delete cascade,
  numero          text,
  status          text not null default 'aguardando_emissao'
                  check (status in ('aguardando_emissao', 'processando', 'autorizada', 'rejeitada')),
  valor           numeric(12, 2) not null check (valor >= 0),
  motivo_rejeicao text,
  xml_url         text,
  emitida_em      timestamptz,
  pendencias      text[],                      -- ACRÉSCIMO: última validação fiscal que bloqueou o envio
  bloqueios       integer not null default 0,  -- ACRÉSCIMO: envios barrados pela validação ("rejeições evitadas")
  simulada        boolean not null default true,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  check (status <> 'rejeitada' or motivo_rejeicao is not null),
  unique (empresa_id, numero)
);
create index on nota_fiscal (empresa_id, status);
create trigger nota_fiscal_atualizado_em before update on nota_fiscal
  for each row execute function tocar_atualizado_em();

-- ---------- 2.14 sincronizacao ----------
create table sincronizacao (
  id                uuid primary key default gen_random_uuid(),
  empresa_id        uuid not null references empresa (id) on delete cascade,
  integracao_id     uuid references integracao (id) on delete cascade,   -- nulo = todos os canais
  tipo              text not null check (tipo in ('completa', 'estoque', 'pedidos', 'produtos')),
  status            text not null default 'em_andamento' check (status in ('em_andamento', 'concluida', 'erro')),
  itens_atualizados integer not null default 0,
  novos_pedidos     integer not null default 0,   -- ACRÉSCIMO
  erros             integer not null default 0,   -- ACRÉSCIMO
  iniciada_em       timestamptz not null default now(),
  concluida_em      timestamptz
);
-- Uma sincronização em andamento por empresa (409 SINCRONIZACAO_EM_ANDAMENTO).
create unique index sincronizacao_uma_em_andamento on sincronizacao (empresa_id) where status = 'em_andamento';

-- ---------- 2.15 notificacao ----------
create table notificacao (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresa (id) on delete cascade,
  tipo        text not null check (tipo in ('pedidos', 'estoque', 'fiscal', 'integracoes')),
  titulo      text not null,
  descricao   text,
  icone       text,   -- ACRÉSCIMO
  tom         text check (tom in ('red', 'blue', 'yellow', 'green', 'purple', 'telegram')),
  lida        boolean not null default false,
  acao_rotulo text,
  acao_pagina text,
  criada_em   timestamptz not null default now()
);
create index on notificacao (empresa_id, criada_em desc);

-- ---------- 2.16 preferencia_notificacao ----------
create table preferencia_notificacao (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa (id) on delete cascade,
  evento     text not null
             check (evento in ('novo_pedido', 'estoque_baixo', 'divergencia_estoque', 'nfe_rejeitada', 'resumo_diario')),
  telegram   boolean not null default false,
  email      boolean not null default false,
  push       boolean not null default false,
  unique (empresa_id, evento)
);

-- ---------- 2.17 vinculo_telegram [PLANEJADO] ----------
create table vinculo_telegram (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null unique references usuario (id) on delete cascade,
  empresa_id   uuid not null references empresa (id) on delete cascade,
  chat_id      bigint not null unique,
  username     text,
  vinculado_em timestamptz not null default now()
);

-- ---------- ACRÉSCIMO: movimento_estoque ----------
create table movimento_estoque (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references empresa (id) on delete cascade,
  produto_id       uuid not null references produto (id) on delete cascade,
  tipo             text not null check (tipo in (
                     'cadastro', 'entrada_manual', 'baixa_manual', 'venda',
                     'cancelamento', 'divergencia', 'ajuste')),
  quantidade       integer not null check (quantidade >= 0),
  estoque_anterior integer not null,
  estoque_atual    integer not null,
  observacao       text,
  criado_em        timestamptz not null default now()
);
create index on movimento_estoque (produto_id, criado_em desc);

-- Registra toda alteração de estoque_central. Quem altera pode informar o
-- motivo na transação: set_config('taylor.movimento_tipo', 'venda', true)
-- e set_config('taylor.movimento_obs', 'Pedido #200015', true).
create or replace function registrar_movimento_estoque()
returns trigger
language plpgsql
set search_path = __SCHEMA__
as $$
declare
  v_tipo text := coalesce(nullif(current_setting('taylor.movimento_tipo', true), ''), 'ajuste');
  v_obs  text := nullif(current_setting('taylor.movimento_obs', true), '');
begin
  if tg_op = 'INSERT' then
    insert into movimento_estoque (empresa_id, produto_id, tipo, quantidade, estoque_anterior, estoque_atual, observacao)
    values (new.empresa_id, new.id, 'cadastro', new.estoque_central, 0, new.estoque_central, v_obs);
  elsif new.estoque_central is distinct from old.estoque_central then
    insert into movimento_estoque (empresa_id, produto_id, tipo, quantidade, estoque_anterior, estoque_atual, observacao)
    values (new.empresa_id, new.id, v_tipo, abs(new.estoque_central - old.estoque_central),
            old.estoque_central, new.estoque_central, v_obs);
  end if;
  return new;
end;
$$;

create trigger produto_movimento_estoque after insert or update of estoque_central on produto
  for each row execute function registrar_movimento_estoque();

-- ---------- Padrões ao criar uma empresa ----------
-- preferencia_empresa (1:1) e a matriz Evento × Canal com os padrões da RN031.
create or replace function criar_padroes_empresa()
returns trigger
language plpgsql
set search_path = __SCHEMA__
as $$
begin
  insert into preferencia_empresa (empresa_id) values (new.id);
  insert into preferencia_notificacao (empresa_id, evento, telegram, email, push) values
    (new.id, 'novo_pedido',         true, true,  false),
    (new.id, 'estoque_baixo',       true, true,  true),
    (new.id, 'divergencia_estoque', true, true,  false),
    (new.id, 'nfe_rejeitada',       true, true,  true),
    (new.id, 'resumo_diario',       true, false, false);
  return new;
end;
$$;

create trigger empresa_padroes after insert on empresa
  for each row execute function criar_padroes_empresa();

-- ---------- Acesso ----------
-- Só o back-end (conexão direta como postgres) usa este schema. Se alguém
-- expuser o schema na API do Supabase, RLS sem políticas bloqueia anon e
-- authenticated por padrão.
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = '__SCHEMA__' loop
    execute format('alter table __SCHEMA__.%I enable row level security', t.tablename);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on schema __SCHEMA__ from anon, authenticated';
    execute 'revoke all on all tables in schema __SCHEMA__ from anon, authenticated';
  end if;
end;
$$;
