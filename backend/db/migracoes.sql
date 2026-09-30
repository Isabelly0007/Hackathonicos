-- =====================================================================
-- Taylor — alterações posteriores ao schema.sql (idempotentes).
-- Rodadas pelo setup_db.py (depois do schema.sql) e a cada início do
-- backend, para bancos criados antes delas. Só use "if not exists".
-- =====================================================================

set search_path to __SCHEMA__;

-- Com vários workers (WEB_CONCURRENCY), todos rodam este arquivo ao iniciar:
-- a trava faz um esperar o outro (create or replace simultâneo dá erro).
select pg_advisory_xact_lock(hashtext('taylor-migracoes'));

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

-- ---------- Índice para o bot ----------
-- O bot_estoque procura pedidos novos de todas as empresas a cada 20 s (data_pedido > marca).
create index if not exists pedido_data_pedido on pedido (data_pedido);

-- ---------- Conta Demo (palestra) ----------
-- Cada clique em "Entrar com a conta Demo" cria usuário "Demo" + empresa "Loja Demo NNNN"
-- com os dados de exemplo (popular_empresa_demo). A conta é apagada depois de
-- CONTA_DEMO_HORAS (excluir_conta_demo). A senha fica em texto puro DE PROPÓSITO: a conta é
-- descartável e o painel mostra a senha para a pessoa entrar no bot do Telegram. O login
-- usa usuario.senha_hash (bcrypt), como qualquer conta.
create sequence if not exists conta_demo_numero_seq;

create table if not exists conta_demo (
  empresa_id uuid primary key references empresa (id) on delete cascade,
  usuario_id uuid not null unique references usuario (id) on delete cascade,
  numero     integer not null unique,
  senha      text not null,
  criada_em  timestamptz not null default now(),
  expira_em  timestamptz not null
);
create index if not exists conta_demo_expira_em on conta_demo (expira_em);

alter table conta_demo enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on __SCHEMA__.conta_demo from anon, authenticated';
    execute 'revoke all on sequence __SCHEMA__.conta_demo_numero_seq from anon, authenticated';
  end if;
end;
$$;

-- Dados de exemplo de uma empresa (antes era o corpo do seed.sql). Usada pelo seed (Loja Beta)
-- e por POST /api/auth/demo. Tudo é filtrado por p_empresa: nada de outra empresa é alterado.
-- Os números são gerados a partir das tabelas (regras-de-negocio.md), com a mesma semente para
-- todas as empresas: cada conta Demo mostra os mesmos números da apresentação.
create or replace function popular_empresa_demo(p_empresa uuid)
returns void
language plpgsql
set search_path = __SCHEMA__
as $$
declare
  v_tz constant text := 'America/Sao_Paulo';
  v_nome text;
  v_slug text;
  v_ml uuid;
  v_sh uuid;
  v_mg uuid;
  v_clientes uuid[];
  v_ids_ml uuid[];
  v_precos_ml numeric[];
  v_ids_sh uuid[];
  v_precos_sh numeric[];
  v_ids_mg uuid[];
  v_precos_mg numeric[];
  v_ids uuid[];
  v_precos numeric[];
  v_escolhidos uuid[];
  v_qtds int[];
  v_valores numeric[];
  v_idx int;
  v_qtd_total int;
  v_total numeric;
  v_dia int;
  v_inicio_dia timestamptz;
  v_data timestamptz;
  v_integ uuid;
  v_cli uuid;
  v_status text;
  v_pedido uuid;
  v_codigo int := 199700;
  v_itens int;
  v_r float;
  v_nfe int := 4700;
  v_ultimo record;
  v_rejeitada text;
begin
  select nome_fantasia into v_nome from empresa where id = p_empresa;
  if not found then
    raise exception 'Empresa % não encontrada', p_empresa;
  end if;
  v_slug := lower(regexp_replace(v_nome, '[^A-Za-z0-9]', '', 'g'));
  perform setseed(0.42);

  -- ---------- Empresa e certificado (só o que estiver vazio: a Loja Beta já vem completa) ----------
  update empresa set
    razao_social       = coalesce(razao_social, v_nome || ' Comércio Ltda'),
    inscricao_estadual = coalesce(inscricao_estadual, '123456789110'),
    regime_tributario  = coalesce(regime_tributario, 'simples_nacional'),
    email_contato      = coalesce(email_contato, 'contato@' || v_slug || '.com.br'),
    telefone           = coalesce(telefone, '(11) 99999-1204'),
    endereco           = coalesce(endereco, 'Rua das Flores, 120 · São Paulo/SP'),
    uf                 = coalesce(uf, 'SP')
  where id = p_empresa;

  insert into certificado_digital (empresa_id, tipo, titular, validade, simulado)
  values (p_empresa, 'A1', v_nome, (current_date + interval '7 months')::date, true)
  on conflict (empresa_id) do nothing;

  -- ---------- Integrações (simuladas) ----------
  insert into integracao (empresa_id, marketplace_id, status, conta_vinculada, ultima_sincronizacao, simulada)
  select p_empresa, m.id, 'conectado', v.conta, now() - v.atraso, v.simulada
  from (values
    ('Mercado Livre', v_nome || ' Oficial', interval '2 min', true),
    ('Shopee',        v_slug,               interval '3 min', true),
    ('Magalu',        v_nome,               interval '5 min', true),
    ('Telegram',      '@EstoqueLojas_bot',  null::interval,   false)
  ) as v (nome, conta, atraso, simulada)
  join marketplace m on m.nome = v.nome
  on conflict (empresa_id, marketplace_id) do nothing;

  -- ---------- Produtos ----------
  insert into produto (empresa_id, nome, sku, preco, estoque_central, estoque_minimo, ncm, origem_fiscal)
  select p_empresa, p.*
  from (values
    ('Tênis Runner Pro',        'TEN001', 249.90,  24, 10, '64041900', '0'),
    ('Mochila Urban',           'MOC012', 189.90,  12,  8, '42029200', '0'),
    ('Camiseta Essentials',     'CAM034',  79.90,   2, 10, '61091000', '0'),
    ('Garrafa Térmica',         'GAR203',  99.90,   0,  6, '96170010', '0'),
    ('Fone Bluetooth',          'FON045', 129.90,   3, 10, '85183000', '2'),
    ('Boné Classic',            'BON101',  59.90,  40, 10, '65050090', '0'),
    ('Jaqueta Corta-Vento',     'JAQ220', 219.90,  15,  5, '62019300', '0'),
    ('Kit Meias Esportivas',    'MEI310',  39.90, 120, 30, '61159500', '0'),
    ('Relógio Digital Sport',   'REL400', 179.90,  18,  6, '91021900', '2'),
    ('Óculos de Sol Aviador',   'OCU510', 149.90,  22,  8, '90041000', '1'),
    ('Carteira Slim Couro',     'CAR620',  89.90,  35, 10, '42023100', '0'),
    ('Squeeze 750 ml',          'SQZ700',  34.90,  64, 20, '39241000', '0'),
    ('Legging Fit',             'LEG810', 119.90,  28, 10, '61046200', '0'),
    ('Bermuda Dry',             'BER820',  89.90,  31, 10, '62034200', '0'),
    ('Tênis Casual Street',     'TEN002', 199.90,   9,  8, '64041900', '0'),
    ('Chinelo Slide',           'CHI150',  49.90,  75, 20, '64022000', '0'),
    ('Mochila Notebook 15"',    'MOC013', 229.90,   7,  5, null,       '0'),
    ('Caixa de Som Portátil',   'CSP900', 159.90,  14,  5, '85182200', '2'),
    ('Carregador Turbo USB-C',  'CRG330',  69.90,  50, 15, '85044010', null),
    ('Capa Antiimpacto',        'CAP440',  29.90, 140, 40, '39269090', null),
    ('Pochete Urbana',          'POC550',  69.90,  19,  6, '42029200', '0'),
    ('Toalha Esportiva',        'TOA660',  44.90,  42, 12, null,       '0'),
    ('Luva de Academia',        'LUV770',  54.90,   6,  8, '42032100', null),
    ('Corda de Pular',          'COR880',  29.90,  33, 10, '95069100', null)
  ) as p (nome, sku, preco, estoque_central, estoque_minimo, ncm, origem_fiscal);

  -- Catálogo montado ao longo dos meses (dois produtos novos nesta semana).
  update produto
     set criado_em = case when sku in ('LUV770', 'COR880') then now() - interval '3 days'
                          else now() - ((20 + abs(hashtext(sku)) % 180) * interval '1 day') end
   where empresa_id = p_empresa;

  -- ---------- Anúncios (um por produto e canal) ----------
  -- Mercado Livre: todos. Shopee: quase todos. Magalu: parte do catálogo.
  insert into anuncio (produto_id, integracao_id, id_externo, estoque_publicado, status)
  select p.id, i.id, null, p.estoque_central,
         case when p.estoque_central = 0 then 'pausado' else 'ativo' end
  from produto p
  join integracao i on i.empresa_id = p.empresa_id
  join marketplace m on m.id = i.marketplace_id and m.tipo = 'marketplace'
  where p.empresa_id = p_empresa
    and not (m.nome = 'Shopee' and p.sku in ('JAQ220', 'MOC013', 'CSP900'))
    and not (m.nome = 'Magalu' and p.sku in ('MEI310', 'SQZ700', 'CHI150', 'CAP440', 'TOA660', 'COR880', 'LUV770', 'POC550'));

  -- Duas divergências para demonstrar RN015.
  update anuncio a set estoque_publicado = 10
  from produto p, integracao i, marketplace m
  where a.produto_id = p.id and p.empresa_id = p_empresa and p.sku = 'MOC012'
    and a.integracao_id = i.id and i.marketplace_id = m.id and m.nome = 'Shopee';

  update anuncio a set estoque_publicado = 16
  from produto p, integracao i, marketplace m
  where a.produto_id = p.id and p.empresa_id = p_empresa and p.sku = 'REL400'
    and a.integracao_id = i.id and i.marketplace_id = m.id and m.nome = 'Magalu';

  -- ---------- Clientes ----------
  insert into cliente (empresa_id, nome, cpf_cnpj, endereco, uf)
  select p_empresa, c.*
  from (values
    ('Mariana Souza',     '39053344705', 'Av. Paulista, 1000 · São Paulo/SP',        'SP'),
    ('Carlos Mendes',     '52998224725', 'Rua Voluntários da Pátria, 45 · Rio de Janeiro/RJ', 'RJ'),
    ('Juliana Pereira',   '11144477735', 'Av. Afonso Pena, 300 · Belo Horizonte/MG', 'MG'),
    ('Rafael Teixeira',   '93541134780', 'Rua Augusta, 1500 · São Paulo/SP',         'SP'),
    ('Camila Rocha',      '28625587887', 'Rua XV de Novembro, 80 · Curitiba/PR',     'PR'),
    ('Beatriz Almeida',   '71428793860', 'Av. Sete de Setembro, 12 · Salvador/BA',   'BA'),
    ('Lucas Martins',     '86288366757', 'Rua da Aurora, 200 · Recife/PE',           'PE'),
    ('Fernanda Lopes',    '24843803807', 'Av. Borges de Medeiros, 90 · Porto Alegre/RS', 'RS'),
    ('Gabriel Costa',     '61978346069', 'Rua 7 de Setembro, 33 · Campinas/SP',      'SP'),
    ('Ana Ribeiro',       '43246752031', 'Av. Beira Mar, 700 · Fortaleza/CE',        'CE'),
    ('Pedro Henrique',    '07345169005', 'Rua das Palmeiras, 18 · Goiânia/GO',       'GO'),
    ('Larissa Nunes',     '98765432100', 'Rua Chile, 55 · Florianópolis/SC',         'SC'),
    ('Thiago Barbosa',    null,          null,                                        null),
    ('Patrícia Gomes',    '16899535009', 'Av. Brasil, 2100 · Rio de Janeiro/RJ',     'RJ'),
    ('Rodrigo Silva',     '45317828791', 'Rua Direita, 70 · São Paulo/SP',           'SP'),
    ('Aline Cardoso',     '85202338087', 'Av. Getúlio Vargas, 410 · Belo Horizonte/MG', 'MG'),
    ('Bruno Azevedo',     '31516394030', 'Rua do Comércio, 9 · Manaus/AM',           'AM'),
    ('Vanessa Duarte',    '70255674004', 'Av. Independência, 150 · Ribeirão Preto/SP', 'SP'),
    ('Felipe Moreira',    '06498217040', 'Rua Marechal Deodoro, 60 · Curitiba/PR',   'PR'),
    ('Renata Castro',     '53742863080', 'Av. Dom Luís, 320 · Fortaleza/CE',         'CE')
  ) as c (nome, cpf_cnpj, endereco, uf);

  -- ---------- Pedidos, itens e notas fiscais (últimos 90 dias) ----------
  -- Clientes e produtos de cada canal são lidos uma vez (arrays): cada pedido custa só três inserts.
  select i.id into v_ml from integracao i join marketplace m on m.id = i.marketplace_id
   where i.empresa_id = p_empresa and m.nome = 'Mercado Livre';
  select i.id into v_sh from integracao i join marketplace m on m.id = i.marketplace_id
   where i.empresa_id = p_empresa and m.nome = 'Shopee';
  select i.id into v_mg from integracao i join marketplace m on m.id = i.marketplace_id
   where i.empresa_id = p_empresa and m.nome = 'Magalu';

  select array_agg(id order by nome) into v_clientes from cliente where empresa_id = p_empresa;
  select array_agg(p.id order by p.sku), array_agg(p.preco order by p.sku) into v_ids_ml, v_precos_ml
    from produto p join anuncio a on a.produto_id = p.id and a.integracao_id = v_ml
   where p.empresa_id = p_empresa and p.estoque_central > 0;
  select array_agg(p.id order by p.sku), array_agg(p.preco order by p.sku) into v_ids_sh, v_precos_sh
    from produto p join anuncio a on a.produto_id = p.id and a.integracao_id = v_sh
   where p.empresa_id = p_empresa and p.estoque_central > 0;
  select array_agg(p.id order by p.sku), array_agg(p.preco order by p.sku) into v_ids_mg, v_precos_mg
    from produto p join anuncio a on a.produto_id = p.id and a.integracao_id = v_mg
   where p.empresa_id = p_empresa and p.estoque_central > 0;

  for v_dia in reverse 90..0 loop
    v_inicio_dia := (date_trunc('day', now() at time zone v_tz) - make_interval(days => v_dia)) at time zone v_tz;

    for v_data in
      select t
      from (
        select case
                 when v_dia = 0 then v_inicio_dia + random() * (now() - v_inicio_dia)
                 else v_inicio_dia + interval '8 hours' + random() * interval '14 hours'
               end as t
        from generate_series(1, 7 + floor(random() * 7)::int)
      ) s
      order by t
    loop
      v_codigo := v_codigo + 1;
      v_r := random();
      if v_r < 0.55 then
        v_integ := v_ml; v_ids := v_ids_ml; v_precos := v_precos_ml;
      elsif v_r < 0.83 then
        v_integ := v_sh; v_ids := v_ids_sh; v_precos := v_precos_sh;
      else
        v_integ := v_mg; v_ids := v_ids_mg; v_precos := v_precos_mg;
      end if;
      continue when coalesce(cardinality(v_ids), 0) = 0;

      v_cli := v_clientes[1 + floor(random() * cardinality(v_clientes))::int];

      v_status := case
        when v_dia = 0 then case when random() < 0.5 then 'aguardando' else 'em_separacao' end
        when v_dia = 1 then case when random() < 0.4 then 'em_separacao' else 'em_transporte' end
        when v_dia <= 4 then case when random() < 0.55 then 'em_transporte'
                                  when random() < 0.9 then 'entregue' else 'cancelado' end
        else case when random() < 0.95 then 'entregue' else 'cancelado' end
      end;

      -- 1 a 3 produtos diferentes do canal sorteado, com 1 ou 2 unidades cada.
      v_itens := least(case when random() < 0.65 then 1 when random() < 0.8 then 2 else 3 end, cardinality(v_ids));
      v_escolhidos := '{}';
      v_qtds := '{}';
      v_valores := '{}';
      while cardinality(v_escolhidos) < v_itens loop
        v_idx := 1 + floor(random() * cardinality(v_ids))::int;
        if not (v_ids[v_idx] = any (v_escolhidos)) then
          v_escolhidos := v_escolhidos || v_ids[v_idx];
          v_qtds := v_qtds || case when random() < 0.8 then 1 else 2 end;
          v_valores := v_valores || v_precos[v_idx];
        end if;
      end loop;
      select sum(q), sum(q * v) into v_qtd_total, v_total from unnest(v_qtds, v_valores) as x (q, v);

      insert into pedido (empresa_id, integracao_id, cliente_id, codigo, data_pedido, quantidade_itens, valor_total, status)
      values (p_empresa, v_integ, v_cli, '#' || v_codigo, v_data, v_qtd_total, v_total, v_status)
      returning id into v_pedido;

      insert into item_pedido (pedido_id, produto_id, quantidade, preco_unitario)
      select v_pedido, x.p, x.q, x.v from unnest(v_escolhidos, v_qtds, v_valores) as x (p, q, v);

      -- Nota fiscal: rascunho enquanto o pedido não foi faturado; autorizada depois.
      if v_status <> 'cancelado' then
        if v_status = 'aguardando' or (v_status = 'em_separacao' and random() < 0.7) then
          insert into nota_fiscal (empresa_id, pedido_id, status, valor, criado_em)
          values (p_empresa, v_pedido, 'aguardando_emissao', v_total, v_data);
        else
          v_nfe := v_nfe + 1;
          insert into nota_fiscal (empresa_id, pedido_id, numero, status, valor, xml_url, emitida_em, criado_em)
          values (p_empresa, v_pedido, lpad(v_nfe::text, 6, '0'), 'autorizada', v_total,
                  'simulado://nfe/' || lpad(v_nfe::text, 6, '0') || '.xml',
                  v_data + interval '2 min' + random() * interval '5 min', v_data);
        end if;
      end if;
    end loop;
  end loop;

  -- Uma nota rejeitada (UC10) e uma em processamento.
  v_nfe := v_nfe + 1;
  v_rejeitada := lpad(v_nfe::text, 6, '0');
  update nota_fiscal
     set status = 'rejeitada', numero = v_rejeitada, emitida_em = now() - interval '1 hour',
         motivo_rejeicao = 'SEFAZ: CFOP incompatível com a UF de destino.'
   where id = (select nf.id from nota_fiscal nf join pedido p on p.id = nf.pedido_id
                where nf.empresa_id = p_empresa and nf.status = 'aguardando_emissao' and p.status = 'em_separacao'
                order by p.data_pedido limit 1);

  v_nfe := v_nfe + 1;
  update nota_fiscal
     set status = 'processando', numero = lpad(v_nfe::text, 6, '0'), emitida_em = now() - interval '2 min'
   where id = (select nf.id from nota_fiscal nf join pedido p on p.id = nf.pedido_id
                where nf.empresa_id = p_empresa and nf.status = 'aguardando_emissao'
                order by p.data_pedido desc limit 1);

  update empresa set proximo_numero_nfe = v_nfe + 1 where id = p_empresa;

  -- Notificações de exemplo, apontando para dados reais da empresa.
  select p.codigo, c.nome, p.quantidade_itens, p.valor_total, m.nome as canal
    into v_ultimo
    from pedido p
    join cliente c on c.id = p.cliente_id
    join integracao i on i.id = p.integracao_id
    join marketplace m on m.id = i.marketplace_id
   where p.empresa_id = p_empresa
   order by p.data_pedido desc limit 1;

  insert into notificacao (empresa_id, tipo, titulo, descricao, icone, tom, lida, acao_rotulo, acao_pagina, criada_em) values
    (p_empresa, 'estoque', 'Garrafa Térmica sem estoque',
     'O anúncio foi pausado automaticamente no Mercado Livre, Shopee e Magalu.',
     'alert', 'red', false, 'Ver estoque', 'Estoque', now() - interval '5 min'),
    (p_empresa, 'pedidos', 'Novo pedido ' || v_ultimo.codigo,
     v_ultimo.nome || ' comprou ' || v_ultimo.quantidade_itens || ' ' ||
       case when v_ultimo.quantidade_itens = 1 then 'item' else 'itens' end || ' no ' || v_ultimo.canal || '.',
     'cart', 'blue', false, 'Ver pedido', 'Pedidos', now() - interval '12 min'),
    (p_empresa, 'fiscal', 'NF-e ' || v_rejeitada || ' rejeitada',
     'SEFAZ: CFOP incompatível com a UF de destino. Revise antes de reenviar.',
     'receipt', 'red', false, 'Revisar nota', 'Notas fiscais', now() - interval '1 hour'),
    (p_empresa, 'estoque', 'Divergência na Mochila Urban',
     'A Shopee mostra 10 unidades, mas o estoque central tem 12.',
     'stock', 'yellow', false, 'Ver estoque', 'Estoque', now() - interval '2 hours'),
    (p_empresa, 'integracoes', 'Sincronização concluída',
     'Produtos atualizados em 3 marketplaces sem erros.',
     'refresh', 'green', true, null, null, now() - interval '3 hours'),
    (p_empresa, 'integracoes', 'Telegram vinculado',
     'Os alertas da operação agora também chegam no seu Telegram.',
     'telegram', 'telegram', true, null, null, now() - interval '1 day'),
    (p_empresa, 'fiscal', 'NF-e de ontem autorizadas',
     'Todas as notas de ontem foram autorizadas e o XML enviado aos canais.',
     'receipt', 'green', true, null, null, now() - interval '1 day 2 hours');

  insert into sincronizacao (empresa_id, tipo, status, itens_atualizados, iniciada_em, concluida_em)
  select p_empresa, 'completa', 'concluida', count(*), now() - interval '3 hours', now() - interval '3 hours' + interval '4 seconds'
    from anuncio a join produto p on p.id = a.produto_id
   where p.empresa_id = p_empresa;

  -- A semente vale para a conexão inteira: volta ao acaso para os simuladores (order by random()).
  perform setseed((extract(microseconds from clock_timestamp())::bigint % 1000000) / 1000000.0 * 2 - 1);
end;
$$;

-- Apaga uma conta Demo e todos os dados dela. Devolve false (e não apaga nada) se a empresa
-- não for uma conta Demo: a Loja Beta e as contas reais nunca passam por aqui.
-- A ordem importa: item_pedido → produto, pedido → integracao e pedido → cliente não têm cascata.
create or replace function excluir_conta_demo(p_empresa uuid)
returns boolean
language plpgsql
set search_path = __SCHEMA__
as $$
declare
  v_usuario uuid;
begin
  select usuario_id into v_usuario from conta_demo where empresa_id = p_empresa;
  if not found then
    return false;
  end if;

  delete from item_pedido where pedido_id in (select id from pedido where empresa_id = p_empresa);
  delete from nota_fiscal where empresa_id = p_empresa;
  delete from pedido where empresa_id = p_empresa;
  delete from anuncio where produto_id in (select id from produto where empresa_id = p_empresa);
  delete from movimento_estoque where empresa_id = p_empresa;
  delete from produto where empresa_id = p_empresa;
  delete from cliente where empresa_id = p_empresa;
  delete from sincronizacao where empresa_id = p_empresa;
  delete from integracao where empresa_id = p_empresa;
  -- Cascata: notificações, preferências, certificado, usuario_empresa, vinculo_telegram e conta_demo.
  delete from empresa where id = p_empresa;
  delete from usuario u
   where u.id = v_usuario
     and not exists (select 1 from usuario_empresa ue where ue.usuario_id = u.id);
  return true;
end;
$$;
