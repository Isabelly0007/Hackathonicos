-- =====================================================================
-- Taylor — dados de demonstração (executado por `python setup_db.py --seed`)
--
-- Login de teste: isabela@lojabeta.com.br / taylor123
-- Os números são gerados a partir de uma única fonte (as tabelas), como
-- pede regras-de-negocio.md; não copiam os valores fixos do front.
--
-- Integrações, produtos, clientes, pedidos, notas e notificações vêm da
-- função popular_empresa_demo (migracoes.sql), a mesma usada pela conta Demo.
-- =====================================================================

set search_path to __SCHEMA__;

-- ---------- Usuários (senha: taylor123, hash bcrypt) ----------
insert into usuario (id, nome, email, senha_hash) values
  ('00000000-0000-4000-a000-0000000000a1', 'Isabela Franco', 'isabela@lojabeta.com.br', '$2b$10$tc5SrjhN.pudSYiS.cp8keIkq0EsoOE6ZknI8NfEf0c.DY3FGjRpO'),
  ('00000000-0000-4000-a000-0000000000a2', 'Rafael Lima',    'rafael@lojabeta.com.br',  '$2b$10$tc5SrjhN.pudSYiS.cp8keIkq0EsoOE6ZknI8NfEf0c.DY3FGjRpO'),
  ('00000000-0000-4000-a000-0000000000a3', 'Camila Souza',   'camila@lojabeta.com.br',  '$2b$10$tc5SrjhN.pudSYiS.cp8keIkq0EsoOE6ZknI8NfEf0c.DY3FGjRpO'),
  ('00000000-0000-4000-a000-0000000000a4', 'Pedro Alves',    'pedro@lojabeta.com.br',   '$2b$10$tc5SrjhN.pudSYiS.cp8keIkq0EsoOE6ZknI8NfEf0c.DY3FGjRpO');

-- ---------- Empresa ----------
-- O trigger empresa_padroes cria preferencia_empresa e a matriz de notificações.
insert into empresa (
  id, razao_social, nome_fantasia, cnpj, inscricao_estadual, regime_tributario,
  email_contato, telefone, endereco, uf, criado_em
) values (
  '00000000-0000-4000-a000-000000000001', 'Loja Beta Comércio Ltda', 'Loja Beta', '12345678000195',
  '123456789110', 'simples_nacional', 'contato@lojabeta.com.br', '(11) 99999-1204',
  'Rua das Flores, 120 · São Paulo/SP', 'SP', '2025-03-01'
);

insert into usuario_empresa (usuario_id, empresa_id, papel, status) values
  ('00000000-0000-4000-a000-0000000000a1', '00000000-0000-4000-a000-000000000001', 'administrador', 'ativo'),
  ('00000000-0000-4000-a000-0000000000a2', '00000000-0000-4000-a000-000000000001', 'operacao',      'ativo'),
  ('00000000-0000-4000-a000-0000000000a3', '00000000-0000-4000-a000-000000000001', 'financeiro',    'ativo'),
  ('00000000-0000-4000-a000-0000000000a4', '00000000-0000-4000-a000-000000000001', 'expedicao',     'convite_pendente');

insert into certificado_digital (empresa_id, tipo, titular, validade, simulado)
values ('00000000-0000-4000-a000-000000000001', 'A1', 'Loja Beta', '2027-05-01', true);

-- ---------- Integrações, catálogo, clientes, pedidos, NF-e e notificações ----------
select popular_empresa_demo('00000000-0000-4000-a000-000000000001');
