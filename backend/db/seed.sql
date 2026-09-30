-- =====================================================================
-- Taylor — dados de demonstração (executado por `python setup_db.py --seed`)
--
-- Login de teste: isabela@lojabeta.com.br / taylor123
-- Os números são gerados a partir de uma única fonte (as tabelas), como
-- pede regras-de-negocio.md; não copiam os valores fixos do front.
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

-- ---------- Integrações (simuladas) ----------
insert into integracao (empresa_id, marketplace_id, status, conta_vinculada, ultima_sincronizacao, simulada)
select '00000000-0000-4000-a000-000000000001', m.id, 'conectado', v.conta, now() - v.atraso, v.simulada
from (values
  ('Mercado Livre', 'Loja Beta Oficial', interval '2 min', true),
  ('Shopee',        'lojabeta',          interval '3 min', true),
  ('Magalu',        'Loja Beta',         interval '5 min', true),
  ('Telegram',      '@lojabeta_bot',     null,             false)
) as v (nome, conta, atraso, simulada)
join marketplace m on m.nome = v.nome;

-- ---------- Produtos ----------
insert into produto (empresa_id, nome, sku, preco, estoque_central, estoque_minimo, ncm, origem_fiscal)
select '00000000-0000-4000-a000-000000000001', p.*
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
 where empresa_id = '00000000-0000-4000-a000-000000000001';

-- ---------- Anúncios (um por produto e canal) ----------
-- Mercado Livre: todos. Shopee: quase todos. Magalu: parte do catálogo.
insert into anuncio (produto_id, integracao_id, id_externo, estoque_publicado, status)
select p.id, i.id, null, p.estoque_central,
       case when p.estoque_central = 0 then 'pausado' else 'ativo' end
from produto p
join integracao i on i.empresa_id = p.empresa_id
join marketplace m on m.id = i.marketplace_id and m.tipo = 'marketplace'
where p.empresa_id = '00000000-0000-4000-a000-000000000001'
  and not (m.nome = 'Shopee' and p.sku in ('JAQ220', 'MOC013', 'CSP900'))
  and not (m.nome = 'Magalu' and p.sku in ('MEI310', 'SQZ700', 'CHI150', 'CAP440', 'TOA660', 'COR880', 'LUV770', 'POC550'));

-- Duas divergências para demonstrar RN015.
update anuncio a set estoque_publicado = 10
from produto p, integracao i, marketplace m
where a.produto_id = p.id and p.sku = 'MOC012'
  and a.integracao_id = i.id and i.marketplace_id = m.id and m.nome = 'Shopee';

update anuncio a set estoque_publicado = 16
from produto p, integracao i, marketplace m
where a.produto_id = p.id and p.sku = 'REL400'
  and a.integracao_id = i.id and i.marketplace_id = m.id and m.nome = 'Magalu';

-- ---------- Clientes ----------
insert into cliente (empresa_id, nome, cpf_cnpj, endereco, uf)
select '00000000-0000-4000-a000-000000000001', c.*
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
do $$
declare
  v_empresa constant uuid := '00000000-0000-4000-a000-000000000001';
  v_tz      constant text := 'America/Sao_Paulo';
  v_ml uuid;
  v_sh uuid;
  v_mg uuid;
  v_dia int;
  v_inicio_dia timestamptz;
  v_data timestamptz;
  v_integ uuid;
  v_cli uuid;
  v_status text;
  v_pedido uuid;
  v_codigo int := 199700;
  v_itens int;
  v_prod record;
  v_r float;
  v_nfe int := 4700;
  v_ultimo record;
  v_rejeitada text;
begin
  perform setseed(0.42);

  select i.id into v_ml from integracao i join marketplace m on m.id = i.marketplace_id
   where i.empresa_id = v_empresa and m.nome = 'Mercado Livre';
  select i.id into v_sh from integracao i join marketplace m on m.id = i.marketplace_id
   where i.empresa_id = v_empresa and m.nome = 'Shopee';
  select i.id into v_mg from integracao i join marketplace m on m.id = i.marketplace_id
   where i.empresa_id = v_empresa and m.nome = 'Magalu';

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
      v_integ := case when v_r < 0.55 then v_ml when v_r < 0.83 then v_sh else v_mg end;

      select id into v_cli from cliente where empresa_id = v_empresa order by random() limit 1;

      v_status := case
        when v_dia = 0 then case when random() < 0.5 then 'aguardando' else 'em_separacao' end
        when v_dia = 1 then case when random() < 0.4 then 'em_separacao' else 'em_transporte' end
        when v_dia <= 4 then case when random() < 0.55 then 'em_transporte'
                                  when random() < 0.9 then 'entregue' else 'cancelado' end
        else case when random() < 0.95 then 'entregue' else 'cancelado' end
      end;

      insert into pedido (empresa_id, integracao_id, cliente_id, codigo, data_pedido, quantidade_itens, valor_total, status)
      values (v_empresa, v_integ, v_cli, '#' || v_codigo, v_data, 1, 0, v_status)
      returning id into v_pedido;

      v_itens := case when random() < 0.65 then 1 when random() < 0.8 then 2 else 3 end;
      for v_prod in
        select p.id, p.preco
        from produto p
        join anuncio a on a.produto_id = p.id and a.integracao_id = v_integ
        where p.empresa_id = v_empresa and p.estoque_central > 0
        order by random()
        limit v_itens
      loop
        insert into item_pedido (pedido_id, produto_id, quantidade, preco_unitario)
        values (v_pedido, v_prod.id, case when random() < 0.8 then 1 else 2 end, v_prod.preco);
      end loop;

      update pedido pe
         set quantidade_itens = t.qtd, valor_total = t.total
        from (select sum(quantidade) as qtd, sum(quantidade * preco_unitario) as total
                from item_pedido where pedido_id = v_pedido) t
       where pe.id = v_pedido;

      -- Nota fiscal: rascunho enquanto o pedido não foi faturado; autorizada depois.
      if v_status <> 'cancelado' then
        if v_status = 'aguardando' or (v_status = 'em_separacao' and random() < 0.7) then
          insert into nota_fiscal (empresa_id, pedido_id, status, valor, criado_em)
          select v_empresa, v_pedido, 'aguardando_emissao', valor_total, v_data
            from pedido where id = v_pedido;
        else
          v_nfe := v_nfe + 1;
          insert into nota_fiscal (empresa_id, pedido_id, numero, status, valor, xml_url, emitida_em, criado_em)
          select v_empresa, v_pedido, lpad(v_nfe::text, 6, '0'), 'autorizada', valor_total,
                 'simulado://nfe/' || lpad(v_nfe::text, 6, '0') || '.xml',
                 v_data + interval '2 min' + random() * interval '5 min', v_data
            from pedido where id = v_pedido;
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
                where nf.empresa_id = v_empresa and nf.status = 'aguardando_emissao' and p.status = 'em_separacao'
                order by p.data_pedido limit 1);

  v_nfe := v_nfe + 1;
  update nota_fiscal
     set status = 'processando', numero = lpad(v_nfe::text, 6, '0'), emitida_em = now() - interval '2 min'
   where id = (select nf.id from nota_fiscal nf join pedido p on p.id = nf.pedido_id
                where nf.empresa_id = v_empresa and nf.status = 'aguardando_emissao'
                order by p.data_pedido desc limit 1);

  update empresa set proximo_numero_nfe = v_nfe + 1 where id = v_empresa;

  -- Notificações de exemplo, apontando para dados reais do seed.
  select p.codigo, c.nome, p.quantidade_itens, p.valor_total, m.nome as canal
    into v_ultimo
    from pedido p
    join cliente c on c.id = p.cliente_id
    join integracao i on i.id = p.integracao_id
    join marketplace m on m.id = i.marketplace_id
   where p.empresa_id = v_empresa
   order by p.data_pedido desc limit 1;

  insert into notificacao (empresa_id, tipo, titulo, descricao, icone, tom, lida, acao_rotulo, acao_pagina, criada_em) values
    (v_empresa, 'estoque', 'Garrafa Térmica sem estoque',
     'O anúncio foi pausado automaticamente no Mercado Livre, Shopee e Magalu.',
     'alert', 'red', false, 'Ver estoque', 'Estoque', now() - interval '5 min'),
    (v_empresa, 'pedidos', 'Novo pedido ' || v_ultimo.codigo,
     v_ultimo.nome || ' comprou ' || v_ultimo.quantidade_itens || ' ' ||
       case when v_ultimo.quantidade_itens = 1 then 'item' else 'itens' end || ' no ' || v_ultimo.canal || '.',
     'cart', 'blue', false, 'Ver pedido', 'Pedidos', now() - interval '12 min'),
    (v_empresa, 'fiscal', 'NF-e ' || v_rejeitada || ' rejeitada',
     'SEFAZ: CFOP incompatível com a UF de destino. Revise antes de reenviar.',
     'receipt', 'red', false, 'Revisar nota', 'Notas fiscais', now() - interval '1 hour'),
    (v_empresa, 'estoque', 'Divergência na Mochila Urban',
     'A Shopee mostra 10 unidades, mas o estoque central tem 12.',
     'stock', 'yellow', false, 'Ver estoque', 'Estoque', now() - interval '2 hours'),
    (v_empresa, 'integracoes', 'Sincronização concluída',
     'Produtos atualizados em 3 marketplaces sem erros.',
     'refresh', 'green', true, null, null, now() - interval '3 hours'),
    (v_empresa, 'integracoes', 'Telegram vinculado',
     'Os alertas da operação agora também chegam no seu Telegram.',
     'telegram', 'telegram', true, null, null, now() - interval '1 day'),
    (v_empresa, 'fiscal', 'NF-e de ontem autorizadas',
     'Todas as notas de ontem foram autorizadas e o XML enviado aos canais.',
     'receipt', 'green', true, null, null, now() - interval '1 day 2 hours');

  insert into sincronizacao (empresa_id, tipo, status, itens_atualizados, iniciada_em, concluida_em)
  select v_empresa, 'completa', 'concluida', count(*), now() - interval '3 hours', now() - interval '3 hours' + interval '4 seconds'
    from anuncio a join produto p on p.id = a.produto_id
   where p.empresa_id = v_empresa;
end;
$$;
