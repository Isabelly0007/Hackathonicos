-- =====================================================================
-- Taylor — alterações posteriores ao schema.sql (idempotentes).
-- Rodadas pelo setup_db.py (depois do schema.sql) e a cada início do
-- backend, para bancos criados antes delas. Só use "if not exists".
-- =====================================================================

set search_path to __SCHEMA__;

-- ---------- Esqueci minha senha ----------
-- Tokens com hash (sha256), uso único e validade curta. Trocar a senha grava
-- senha_alterada_em: tokens de sessão (JWT) emitidos antes disso deixam de valer.
alter table usuario add column if not exists senha_alterada_em timestamptz;

create table if not exists redefinicao_senha (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuario (id) on delete cascade,
  token_hash text not null unique,
  expira_em  timestamptz not null,
  usada_em   timestamptz,
  criado_em  timestamptz not null default now()
);
create index if not exists redefinicao_senha_usuario on redefinicao_senha (usuario_id, criado_em desc);

alter table redefinicao_senha enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on __SCHEMA__.redefinicao_senha from anon, authenticated';
  end if;
end;
$$;

-- ---------- TikTok Shop ----------
-- Quarto marketplace (conexão simulada, como os demais). Cor "teal" no gráfico de vendas.
insert into marketplace (nome, sigla, tipo, ordem, cor)
values ('TikTok Shop', 'TT', 'marketplace', 4, 'teal')
on conflict (nome) do nothing;
update marketplace set ordem = 5 where nome = 'Telegram' and ordem = 4;
