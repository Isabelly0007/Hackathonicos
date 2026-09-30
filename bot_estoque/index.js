require('dotenv').config();
const { Telegraf, session, Markup } = require('telegraf');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cron = require('node-cron'); // Importa o agendador de tarefas

/* ---------- Banco: as mesmas tabelas do Taylor (schema DB_SCHEMA, padrão "taylor") ----------
   Conexão direta ao Postgres do Supabase (Session pooler, porta 5432), igual ao backend.
   O schema do Taylor não é exposto na API do Supabase, por isso a chave anon não serve. */
const SCHEMA = process.env.DB_SCHEMA || 'taylor';
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL em bot_estoque/.env (a mesma do backend/.env).');
if (!/^[a-z_][a-z0-9_]{0,40}$/.test(SCHEMA) || SCHEMA === 'public') throw new Error('DB_SCHEMA inválido.');

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL);
// Conexões do bot. Entram na mesma conta do backend no Pool Size do Session pooler do Supabase:
// WEB_CONCURRENCY × DB_POOL_MAX (backend) + DB_POOL_MAX (bot) ≤ Pool Size.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: local ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX) || 3,
});
pool.on('error', (err) => console.log('Erro na conexão com o banco:', err.message));

// Toda conexão usa só o schema do Taylor (definido uma vez, antes do primeiro uso).
async function conectar() {
    const client = await pool.connect();
    if (!client.schemaDefinido) {
        await client.query(`set search_path to ${SCHEMA}`);
        client.schemaDefinido = true;
    }
    return client;
}

async function query(text, params) {
    const client = await conectar();
    try {
        return await client.query(text, params);
    } finally {
        client.release();
    }
}
const um = async (text, params) => (await query(text, params)).rows[0] || null;

async function transacao(fn) {
    const client = await conectar();
    try {
        await client.query('begin');
        const resultado = await fn(client);
        await client.query('commit');
        return resultado;
    } catch (err) {
        await client.query('rollback');
        throw err;
    } finally {
        client.release();
    }
}

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// Escapa caracteres do Markdown do Telegram em textos vindos do banco.
const md = (texto) => String(texto ?? '').replace(/([_*`\[])/g, '\\$1');
const STATUS_PRODUTO = { ativo: '🟢 Ativo', estoque_baixo: '🟡 Estoque baixo', sem_estoque: '🔴 Sem estoque' };

/* Altera o estoque central seguindo as regras do backend (services/estoque.py):
   o trigger grava o movimento; se a sincronização automática estiver ligada, os anúncios
   que estavam sincronizados recebem a nova quantidade (e são pausados/reativados);
   estoque zerado ou abaixo do mínimo gera notificação no painel. */
async function alterarEstoque(client, empresaId, produtoId, novo, tipo, observacao) {
    await client.query(
        "select set_config('taylor.movimento_tipo', $1, true), set_config('taylor.movimento_obs', $2, true)",
        [tipo, observacao]
    );
    const { rows: [m] } = await client.query(
        `update produto p set estoque_central = $1
           from produto antes
          where p.id = $2 and p.empresa_id = $3 and antes.id = p.id
        returning p.id as produto, p.nome, p.estoque_minimo as minimo,
                  antes.estoque_central as anterior, p.estoque_central as atual`,
        [novo, produtoId, empresaId]
    );
    if (!m || m.anterior === m.atual) return m;

    const { rows: [prefs] } = await client.query('select * from preferencia_empresa where empresa_id = $1', [empresaId]);
    if (prefs && prefs.sincronizar_estoque_auto) {
        await client.query(
            `update anuncio a set
                 estoque_publicado = $1,
                 status = case
                     when $1 = 0 and $2 then 'pausado'
                     when $1 > 0 and a.status = 'pausado' then 'ativo'
                     else a.status
                 end
               from integracao i
              where a.integracao_id = i.id and i.status = 'conectado'
                and a.produto_id = $3 and a.estoque_publicado = $4`,
            [m.atual, prefs.pausar_anuncio_sem_estoque, m.produto, m.anterior]
        );
    }

    const pausar = prefs ? prefs.pausar_anuncio_sem_estoque : true;
    if (m.atual === 0 && m.anterior > 0) {
        await notificar(client, empresaId, `${m.nome} sem estoque`,
            pausar ? 'O anúncio foi pausado automaticamente em todos os canais.' : 'Reponha o estoque para continuar vendendo.',
            'alert', 'red');
    } else if (m.atual > 0 && m.atual <= m.minimo && m.minimo < m.anterior) {
        await notificar(client, empresaId, `${m.nome} com estoque baixo`,
            `Restam ${m.atual} unidades (mínimo: ${m.minimo}).`, 'stock', 'yellow');
    }
    return m;
}

function notificar(client, empresaId, titulo, descricao, icone, tom) {
    return client.query(
        `insert into notificacao (empresa_id, tipo, titulo, descricao, icone, tom, acao_rotulo, acao_pagina)
         values ($1, 'estoque', $2, $3, $4, $5, 'Ver estoque', 'Estoque')`,
        [empresaId, titulo, descricao, icone, tom]
    );
}

async function buscarProduto(empresaId, sku) {
    return um(
        'select id, nome, sku, estoque_central, estoque_minimo from produto where empresa_id = $1 and sku = $2',
        [empresaId, sku]
    );
}

/* ---------- Bot ---------- */
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.use(session());

// 1. Middleware de Sessão e Estados
bot.use(async (ctx, next) => {
    if (!ctx.session) {
        ctx.session = {
            usuario_id: null,
            empresa_id: null,
            empresa_nome: null,
            loja_id: null,
            loja_nome: null,
            estado: null,
            temp_email: null,
            temp_usuario_id: null,
            temp_sku: null,
            novo_produto: {},
            restaurada: false,
        };
    }
    // Conta apagada (ex.: conta Demo expirada) ou acesso removido no painel: a sessão deixa de valer.
    if (ctx.session.empresa_id) {
        const ativo = await um(
            `select 1 as ok from usuario_empresa where usuario_id = $1 and empresa_id = $2 and status = 'ativo'`,
            [ctx.session.usuario_id, ctx.session.empresa_id]
        );
        if (!ativo) {
            Object.assign(ctx.session, {
                usuario_id: null, empresa_id: null, empresa_nome: null, loja_id: null, loja_nome: null,
                estado: null, temp_sku: null, novo_produto: {},
            });
        }
    }
    // A sessão fica em memória: depois de reiniciar o bot, o login volta pelo vínculo salvo no banco.
    if (!ctx.session.empresa_id && !ctx.session.restaurada && ctx.chat) {
        ctx.session.restaurada = true;
        const vinculo = await um(
            `select v.usuario_id, v.empresa_id, e.nome_fantasia
               from vinculo_telegram v
               join empresa e on e.id = v.empresa_id
               join usuario_empresa ue on ue.usuario_id = v.usuario_id and ue.empresa_id = v.empresa_id and ue.status = 'ativo'
              where v.chat_id = $1`,
            [ctx.chat.id]
        );
        if (vinculo) {
            ctx.session.usuario_id = vinculo.usuario_id;
            ctx.session.empresa_id = vinculo.empresa_id;
            ctx.session.empresa_nome = vinculo.nome_fantasia;
        }
    }
    return next();
});

function precisaLogin(ctx) {
    if (ctx.session.empresa_id) return false;
    ctx.reply('⚠️ Faça o login primeiro enviando:\n`/login`', { parse_mode: 'Markdown' });
    return true;
}

bot.start((ctx) => {
    ctx.session.estado = null;
    if (ctx.session.empresa_id) {
        return ctx.reply(`👋 Bem-vindo de volta, *${md(ctx.session.empresa_nome)}*!\n\nUse /lojas, /estoque, /novo, /entrada, /baixa ou /sair.`, { parse_mode: 'Markdown' });
    }
    ctx.reply('🔒 *Acesso Restrito*\n\nPara iniciar sessão, envie o comando:\n`/login`\n\nUse o mesmo e-mail e senha do painel Taylor.', { parse_mode: 'Markdown' });
});

// 2. Comando /login
bot.command('login', (ctx) => {
    ctx.session.estado = 'AGUARDANDO_EMAIL';
    ctx.session.temp_email = null;
    ctx.reply('📧 Por favor, envie o seu *e-mail* cadastrado:', { parse_mode: 'Markdown' });
});

// 3. Comando /novo
bot.command('novo', (ctx) => {
    if (precisaLogin(ctx)) return;
    ctx.session.estado = 'AGUARDANDO_NOME_NOVO';
    ctx.session.novo_produto = {};
    ctx.reply('✨ *Registo de Novo Produto*\n\nPor favor, envie o **nome** do produto:', { parse_mode: 'Markdown' });
});

// 4. Comando /entrada
bot.command('entrada', (ctx) => {
    if (precisaLogin(ctx)) return;
    ctx.session.estado = 'AGUARDANDO_SKU_ENTRADA';
    ctx.session.temp_sku = null;
    ctx.reply('📦 *Registo de Entrada de Quantidade*\n\nPor favor, envie o **SKU** do produto que deseja repor:', { parse_mode: 'Markdown' });
});

// 5. Comando /baixa
bot.command('baixa', (ctx) => {
    if (precisaLogin(ctx)) return;
    ctx.session.estado = 'AGUARDANDO_SKU_BAIXA';
    ctx.session.temp_sku = null;
    ctx.reply('📉 *Registo de Baixa de Quantidade*\n\nPor favor, envie o **SKU** do produto que deseja dar baixa:', { parse_mode: 'Markdown' });
});

// 6. Comando /sair (também desfaz o vínculo com o Telegram no painel)
bot.command('sair', async (ctx) => {
    await query('delete from vinculo_telegram where chat_id = $1', [ctx.chat.id]);
    Object.assign(ctx.session, {
        usuario_id: null, empresa_id: null, empresa_nome: null, loja_id: null, loja_nome: null,
        estado: null, temp_email: null, temp_usuario_id: null, temp_sku: null, novo_produto: {},
    });
    ctx.reply('🔒 *Desconectado com sucesso!*\n\nPara entrar novamente, envie:\n`/login`', { parse_mode: 'Markdown' });
});

// 🔒 7. TRAVA DE SEGURANÇA
bot.use((ctx, next) => {
    if (ctx.message && ctx.message.text) {
        const txt = ctx.message.text;
        if (txt.startsWith('/start') || txt.startsWith('/login') || ctx.session.estado) {
            return next();
        }
    }
    if (ctx.callbackQuery && ctx.session.estado === 'ESCOLHENDO_EMPRESA') return next();
    if (!ctx.session.empresa_id) {
        return ctx.reply('⚠️ Faça o login primeiro enviando:\n`/login`', { parse_mode: 'Markdown' });
    }
    return next();
});

// Conclui o login: guarda na sessão e vincula este chat ao usuário (o painel mostra o vínculo).
async function concluirLogin(ctx, usuarioId, empresa) {
    await transacao(async (c) => {
        await c.query('delete from vinculo_telegram where chat_id = $1 and usuario_id <> $2', [ctx.chat.id, usuarioId]);
        await c.query(
            `insert into vinculo_telegram (usuario_id, empresa_id, chat_id, username)
             values ($1, $2, $3, $4)
             on conflict (usuario_id) do update
               set empresa_id = excluded.empresa_id, chat_id = excluded.chat_id,
                   username = excluded.username, vinculado_em = now()`,
            [usuarioId, empresa.id, ctx.chat.id, ctx.from && ctx.from.username ? '@' + ctx.from.username : null]
        );
    });
    ctx.session.usuario_id = usuarioId;
    ctx.session.empresa_id = empresa.id;
    ctx.session.empresa_nome = empresa.nome_fantasia;
    ctx.session.loja_id = null;
    ctx.session.loja_nome = null;
    return ctx.reply(`✅ Login realizado com sucesso na empresa *${md(empresa.nome_fantasia)}*!\n\nUse /lojas, /estoque, /novo, /entrada ou /baixa.`, { parse_mode: 'Markdown' });
}

// 8. Intercetor de Texto para fluxos conversacionais
bot.on('text', async (ctx, next) => {
    const texto = ctx.message.text.trim();

    if (texto.startsWith('/')) {
        return next();
    }

    // --- FLUXO DE LOGIN ---
    if (ctx.session.estado === 'AGUARDANDO_EMAIL') {
        const emailDigitado = texto.toLowerCase();
        const usuario = await um('select id from usuario where email = $1', [emailDigitado]);

        if (!usuario) {
            return ctx.reply('❌ E-mail não encontrado no sistema.\nTente novamente ou envie /sair para cancelar.');
        }

        ctx.session.temp_email = emailDigitado;
        ctx.session.estado = 'AGUARDANDO_SENHA';
        return ctx.reply('🔑 E-mail reconhecido!\nAgora, digite a sua *senha*:', { parse_mode: 'Markdown' });
    }

    if (ctx.session.estado === 'AGUARDANDO_SENHA') {
        const senhaDigitada = texto;
        const emailSalvo = ctx.session.temp_email;

        ctx.session.estado = null;
        ctx.session.temp_email = null;
        // Apaga a mensagem com a senha do histórico do chat (se o bot tiver permissão).
        ctx.deleteMessage().catch(() => {});

        const usuario = await um('select id, senha_hash from usuario where email = $1', [emailSalvo]);
        if (!usuario || !(await bcrypt.compare(senhaDigitada, usuario.senha_hash))) {
            return ctx.reply('❌ *Senha incorreta!* O login falhou.\nEnvie `/login` para tentar novamente.', { parse_mode: 'Markdown' });
        }

        const { rows: empresas } = await query(
            `select e.id, e.nome_fantasia from usuario_empresa ue join empresa e on e.id = ue.empresa_id
              where ue.usuario_id = $1 and ue.status = 'ativo' order by e.nome_fantasia`,
            [usuario.id]
        );
        if (!empresas.length) {
            return ctx.reply('❌ Este usuário não tem acesso ativo a nenhuma empresa.');
        }
        if (empresas.length === 1) return concluirLogin(ctx, usuario.id, empresas[0]);

        ctx.session.temp_usuario_id = usuario.id;
        ctx.session.estado = 'ESCOLHENDO_EMPRESA';
        return ctx.reply('🏢 *Escolha a empresa:*', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(empresas.map((e) => [Markup.button.callback(e.nome_fantasia, `empresa_${e.id}`)])),
        });
    }

    // --- FLUXO DE NOVO PRODUTO ---
    if (ctx.session.estado === 'AGUARDANDO_NOME_NOVO') {
        ctx.session.novo_produto.nome = texto;
        ctx.session.estado = 'AGUARDANDO_SKU_NOVO';
        return ctx.reply('🏷️ Agora, envie o **SKU** (código único) do produto:', { parse_mode: 'Markdown' });
    }

    if (ctx.session.estado === 'AGUARDANDO_SKU_NOVO') {
        const sku = texto.toUpperCase();
        if (await buscarProduto(ctx.session.empresa_id, sku)) {
            return ctx.reply(`⚠️ Já existe um produto com o SKU \`${md(sku)}\`. Envie outro SKU:`, { parse_mode: 'Markdown' });
        }
        ctx.session.novo_produto.sku = sku;
        ctx.session.estado = 'AGUARDANDO_PRECO_NOVO';
        return ctx.reply('💰 Agora, informe o **preço** unitário (ex: 49.90):', { parse_mode: 'Markdown' });
    }

    if (ctx.session.estado === 'AGUARDANDO_PRECO_NOVO') {
        const preco = parseFloat(texto.replace(',', '.'));
        if (isNaN(preco) || preco < 0) {
            return ctx.reply('⚠️ Preço inválido! Por favor, digite um valor numérico válido (ex: 49.90).');
        }
        ctx.session.novo_produto.preco = preco;
        ctx.session.estado = 'AGUARDANDO_ESTOQUE_NOVO';
        return ctx.reply('📦 Agora, informe a **quantidade inicial**:', { parse_mode: 'Markdown' });
    }

    if (ctx.session.estado === 'AGUARDANDO_ESTOQUE_NOVO') {
        const estoque = parseInt(texto, 10);
        if (isNaN(estoque) || estoque < 0) {
            return ctx.reply('⚠️ Quantidade inválida! Por favor, digite um número inteiro.');
        }
        ctx.session.novo_produto.estoque_atual = estoque;
        ctx.session.estado = 'AGUARDANDO_MINIMO_NOVO';
        return ctx.reply('⚠️ Por fim, informe a **quantidade mínima** de alerta:', { parse_mode: 'Markdown' });
    }

    if (ctx.session.estado === 'AGUARDANDO_MINIMO_NOVO') {
        const minimo = parseInt(texto, 10);
        if (isNaN(minimo) || minimo < 0) {
            return ctx.reply('⚠️ Quantidade inválida! Por favor, digite um número inteiro.');
        }

        const p = ctx.session.novo_produto;
        ctx.session.estado = null;
        ctx.session.novo_produto = {};

        // Igual ao POST /api/products: cria o produto e o publica nos canais conectados.
        let canais = 0;
        try {
            canais = await transacao(async (c) => {
                await c.query("select set_config('taylor.movimento_obs', 'Cadastro via Telegram', true)");
                const { rows: [novo] } = await c.query(
                    `insert into produto (empresa_id, nome, sku, preco, estoque_central, estoque_minimo)
                     values ($1, $2, $3, $4, $5, $6) returning id`,
                    [ctx.session.empresa_id, p.nome, p.sku, p.preco, p.estoque_atual, minimo]
                );
                const { rowCount } = await c.query(
                    `insert into anuncio (produto_id, integracao_id, estoque_publicado, status)
                     select $1, i.id, $2, case when $2 = 0 then 'pausado' else 'ativo' end
                       from integracao i join marketplace m on m.id = i.marketplace_id
                      where i.empresa_id = $3 and i.status = 'conectado' and m.tipo = 'marketplace'`,
                    [novo.id, p.estoque_atual, ctx.session.empresa_id]
                );
                return rowCount;
            });
        } catch (error) {
            if (error.code === '23505') return ctx.reply(`❌ Já existe um produto com o SKU ${p.sku}. Envie /novo para recomeçar.`);
            throw error;
        }

        return ctx.reply(
            `✨ *Produto cadastrado com sucesso!* 🎉\n\n` +
            `📦 *Nome:* ${md(p.nome)}\n` +
            `🏷️ *SKU:* \`${md(p.sku)}\`\n` +
            `💰 *Preço:* ${brl(p.preco)}\n` +
            `📊 *Quantidade Inicial:* ${p.estoque_atual} un\n` +
            `⚠️ *Quantidade Mínima:* ${minimo} un\n` +
            `🛒 *Publicado em:* ${canais} ${canais === 1 ? 'canal' : 'canais'}`,
            { parse_mode: 'Markdown' }
        );
    }

    // --- FLUXO DE ENTRADA E BAIXA DE QUANTIDADE ---
    if (ctx.session.estado === 'AGUARDANDO_SKU_ENTRADA' || ctx.session.estado === 'AGUARDANDO_SKU_BAIXA') {
        const entrada = ctx.session.estado === 'AGUARDANDO_SKU_ENTRADA';
        const skuDigitado = texto.toUpperCase();
        const produto = await buscarProduto(ctx.session.empresa_id, skuDigitado);

        if (!produto) {
            return ctx.reply(`❌ Nenhum produto encontrado com o SKU \`${md(skuDigitado)}\` na sua empresa.\nVerifique o SKU ou envie /sair para cancelar.`, { parse_mode: 'Markdown' });
        }

        ctx.session.temp_sku = skuDigitado;
        ctx.session.estado = entrada ? 'AGUARDANDO_QTD_ENTRADA' : 'AGUARDANDO_QTD_BAIXA';
        return ctx.reply(
            `✅ Produto encontrado: *${md(produto.nome)}*\nQuantidade atual: *${produto.estoque_central}* un\n\n` +
            (entrada ? 'Agora, informe a **quantidade** que deseja adicionar:' : 'Agora, informe a **quantidade** que deseja retirar (dar baixa):'),
            { parse_mode: 'Markdown' }
        );
    }

    if (ctx.session.estado === 'AGUARDANDO_QTD_ENTRADA' || ctx.session.estado === 'AGUARDANDO_QTD_BAIXA') {
        const entrada = ctx.session.estado === 'AGUARDANDO_QTD_ENTRADA';
        const quantidade = parseInt(texto, 10);

        if (isNaN(quantidade) || quantidade <= 0) {
            return ctx.reply('⚠️ Quantidade inválida! Por favor, digite um número inteiro maior que zero.');
        }

        const sku = ctx.session.temp_sku;
        ctx.session.estado = null;
        ctx.session.temp_sku = null;

        const resultado = await transacao(async (c) => {
            const { rows: [produto] } = await c.query(
                'select id, nome, estoque_central from produto where empresa_id = $1 and sku = $2 for update',
                [ctx.session.empresa_id, sku]
            );
            if (!produto) return { erro: 'nao_encontrado' };
            if (!entrada && produto.estoque_central < quantidade) return { erro: 'insuficiente', produto };
            const novo = produto.estoque_central + (entrada ? quantidade : -quantidade);
            await alterarEstoque(c, ctx.session.empresa_id, produto.id, novo,
                entrada ? 'entrada_manual' : 'baixa_manual',
                entrada ? 'Reposição manual via Telegram' : 'Baixa manual via Telegram');
            return { produto, novo };
        });

        if (resultado.erro === 'nao_encontrado') {
            return ctx.reply('❌ O produto não foi encontrado (pode ter sido excluído no painel).');
        }
        if (resultado.erro === 'insuficiente') {
            return ctx.reply(`❌ Quantidade insuficiente! A quantidade atual é de apenas *${resultado.produto.estoque_central}* un.\nEnvie \`/baixa\` novamente para tentar outra quantidade.`, { parse_mode: 'Markdown' });
        }

        const { produto, novo } = resultado;
        return ctx.reply(
            (entrada ? `✅ *Entrada registada com sucesso!* 📈\n\n` : `✅ *Baixa registada com sucesso!* 📉\n\n`) +
            `📦 *Produto:* ${md(produto.nome)} (\`${md(sku)}\`)\n` +
            `${entrada ? '📉' : '📈'} Quantidade Anterior: ${produto.estoque_central} un\n` +
            (entrada ? `➕ Quantidade Adicionada: +${quantidade} un\n` : `➖ Quantidade Retirada: -${quantidade} un\n`) +
            `📊 *Nova Quantidade Atual:* *${novo}* un`,
            { parse_mode: 'Markdown' }
        );
    }

    return next();
});

// Escolha de empresa quando o usuário tem acesso a mais de uma.
bot.action(/empresa_(.+)/, async (ctx) => {
    ctx.answerCbQuery();
    const usuarioId = ctx.session.temp_usuario_id;
    if (ctx.session.estado !== 'ESCOLHENDO_EMPRESA' || !usuarioId) return ctx.reply('⚠️ Envie /login para entrar.');
    const empresa = await um(
        `select e.id, e.nome_fantasia from usuario_empresa ue join empresa e on e.id = ue.empresa_id
          where ue.usuario_id = $1 and ue.empresa_id = $2 and ue.status = 'ativo'`,
        [usuarioId, ctx.match[1]]
    );
    ctx.session.estado = null;
    ctx.session.temp_usuario_id = null;
    if (!empresa) return ctx.reply('❌ Empresa inválida. Envie /login para tentar novamente.');
    return concluirLogin(ctx, usuarioId, empresa);
});

// 9. Comando /lojas (canais conectados da empresa no Taylor)
bot.command('lojas', async (ctx) => {
    const { rows: canais } = await query(
        `select i.id, m.nome from integracao i join marketplace m on m.id = i.marketplace_id
          where i.empresa_id = $1 and i.status = 'conectado' and m.tipo = 'marketplace'
          order by m.ordem`,
        [ctx.session.empresa_id]
    );

    if (!canais.length) {
        return ctx.reply('❌ Nenhuma loja online / canal conectado no momento. Conecte um canal no painel Taylor.');
    }

    const botoes = canais.map((canal) => [Markup.button.callback(`🛒 ${canal.nome}`, `canal_${canal.id}`)]);
    ctx.reply('🏬 *Selecione a loja online / marketplace que deseja consultar:*', { parse_mode: 'Markdown', ...Markup.inlineKeyboard(botoes) });
});

// 10. Ação ao clicar numa loja específica
bot.action(/canal_(.+)/, async (ctx) => {
    ctx.answerCbQuery();
    const canal = await um(
        `select i.id, m.nome from integracao i join marketplace m on m.id = i.marketplace_id
          where i.id = $1 and i.empresa_id = $2`,
        [ctx.match[1], ctx.session.empresa_id]
    );
    if (!canal) return ctx.reply('❌ Loja não encontrada. Envie /lojas novamente.');
    ctx.session.loja_id = canal.id;
    ctx.session.loja_nome = canal.nome;
    ctx.reply(`✅ Loja *${md(canal.nome)}* selecionada!\n\nEnvie /estoqueloja para ver a quantidade desta loja.`, { parse_mode: 'Markdown' });
});

// 11. Comando /estoqueloja (quantidade publicada em cada anúncio do canal)
bot.command('estoqueloja', async (ctx) => {
    if (!ctx.session.loja_id) {
        return ctx.reply('⚠️ Primeiro selecione uma loja usando o comando /lojas.');
    }

    const { rows } = await query(
        `select p.nome, p.sku, p.preco, p.estoque_central, a.estoque_publicado, a.status
           from anuncio a
           join produto p on p.id = a.produto_id
           join integracao i on i.id = a.integracao_id
          where i.id = $1 and i.empresa_id = $2
          order by p.nome`,
        [ctx.session.loja_id, ctx.session.empresa_id]
    );

    if (!rows.length) {
        return ctx.reply(`📦 Não há produtos associados à loja *${md(ctx.session.loja_nome)}* no momento.`, { parse_mode: 'Markdown' });
    }

    let resposta = `📦 *Quantidade na Loja: ${md(ctx.session.loja_nome)}*\n\n`;
    rows.forEach((item) => {
        const avisos = [
            item.status === 'pausado' ? '⏸️ pausado' : '',
            item.estoque_publicado !== item.estoque_central ? `⚠️ diverge do central (${item.estoque_central} un)` : '',
        ].filter(Boolean).join(' · ');
        resposta += `- *${md(item.nome)}* (SKU: \`${md(item.sku)}\`)\n  Preço: ${brl(item.preco)} | Quantidade: *${item.estoque_publicado}* un${avisos ? `\n  ${avisos}` : ''}\n\n`;
    });

    ctx.replyWithMarkdown(resposta);
});

// 12. Comando /estoque geral
bot.command('estoque', async (ctx) => {
    const { rows } = await query(
        `select nome, sku, preco, estoque_central, status_produto(estoque_central, estoque_minimo) as status
           from produto where empresa_id = $1 order by nome`,
        [ctx.session.empresa_id]
    );

    if (!rows.length) return ctx.reply('O catálogo central está vazio.');

    let resposta = `📦 *Catálogo Central Geral (${md(ctx.session.empresa_nome)}):*\n\n`;
    rows.forEach((i) => {
        resposta += `- *${md(i.nome)}* (SKU: \`${md(i.sku)}\`)\n  Preço: ${brl(i.preco)} | Quantidade: *${i.estoque_central}* un · ${STATUS_PRODUTO[i.status]}\n\n`;
    });

    ctx.replyWithMarkdown(resposta);
});

/* ---------- Envios automáticos ----------
   Vão para os chats vinculados (vinculo_telegram), respeitando as preferências do painel:
   Configurações > Notificações (canal Telegram ligado e o evento marcado para Telegram). */
async function destinatarios(evento, empresaId = null) {
    const { rows } = await query(
        `select v.chat_id, v.empresa_id, e.nome_fantasia, pe.fuso_horario
           from vinculo_telegram v
           join empresa e on e.id = v.empresa_id
           join preferencia_empresa pe on pe.empresa_id = v.empresa_id and pe.receber_telegram
           join preferencia_notificacao pn on pn.empresa_id = v.empresa_id and pn.evento = $1 and pn.telegram
          where $2::uuid is null or v.empresa_id = $2::uuid`,
        [evento, empresaId]
    );
    return rows;
}

function enviar(chatId, texto) {
    return bot.telegram.sendMessage(String(chatId), texto, { parse_mode: 'Markdown' })
        .catch((err) => console.log('Erro ao enviar mensagem:', err.message));
}

// 📊 13. BRIEFING AUTOMÁTICO (Executa às 9h, 13h e 18h)
cron.schedule('0 9,13,18 * * *', async () => {
    try {
        for (const d of await destinatarios('resumo_diario')) {
            const r = await um(
                `select count(*)::int as total,
                        coalesce(sum(valor_total) filter (where status <> 'cancelado'), 0) as faturamento,
                        count(*) filter (where status in ('aguardando', 'em_separacao'))::int as pendentes
                   from pedido
                  where empresa_id = $1
                    and data_pedido >= date_trunc('day', now() at time zone $2) at time zone $2`,
                [d.empresa_id, d.fuso_horario]
            );
            const relatorio =
                `📊 *RELATÓRIO PERIÓDICO DE VENDAS* 📊\n` +
                `🏢 ${md(d.nome_fantasia)}\n\n` +
                `⏰ Horário de Disparo: ${new Date().toLocaleTimeString('pt-BR', { timeZone: d.fuso_horario })}\n\n` +
                `🛒 *Vendas do Dia:* ${r.total}\n` +
                `💰 *Faturamento Total:* ${brl(r.faturamento)}\n` +
                `⚠️ *Aguardando envio:* ${r.pendentes}\n\n` +
                `_Relatório gerado automaticamente pelo sistema._`;
            await enviar(d.chat_id, relatorio);
        }
    } catch (err) {
        console.log('Erro ao gerar briefing automático:', err.message);
    }
}, {
    timezone: 'America/Sao_Paulo',
});

// 🚨 14. NOVOS PEDIDOS (consulta o banco a cada 20 s; pedidos entram com data_pedido = now())
const pedidosAvisados = new Map(); // id -> data_pedido (evita aviso duplicado na janela de sobreposição)
let marcaPedidos = null;

async function verificarPedidos() {
    try {
        if (!marcaPedidos) marcaPedidos = (await um('select now() as agora')).agora;
        const { rows } = await query(
            `select p.id, p.empresa_id, p.codigo, p.valor_total, p.quantidade_itens, p.data_pedido,
                    m.nome as canal, c.nome as cliente
               from pedido p
               join integracao i on i.id = p.integracao_id
               join marketplace m on m.id = i.marketplace_id
               left join cliente c on c.id = p.cliente_id
              where p.data_pedido > $1::timestamptz - interval '2 minutes'
              order by p.data_pedido`,
            [marcaPedidos]
        );
        const novos = rows.filter((p) => !pedidosAvisados.has(p.id));
        const cache = new Map();
        for (const p of novos) {
            pedidosAvisados.set(p.id, p.data_pedido);
            if (!cache.has(p.empresa_id)) cache.set(p.empresa_id, await destinatarios('novo_pedido', p.empresa_id));
            const mensagemAlerta =
                `🚨 *NOVA VENDA REALIZADA!* 🚨\n\n` +
                `🛒 *Loja:* ${md(p.canal)}\n` +
                `📦 *Cód. Pedido:* \`${md(p.codigo)}\`\n` +
                (p.cliente ? `👤 *Cliente:* ${md(p.cliente)}\n` : '') +
                `🧾 *Itens:* ${p.quantidade_itens}\n` +
                `💰 *Valor Total:* ${brl(p.valor_total)}\n\n` +
                `_A quantidade foi atualizada automaticamente no Taylor._`;
            for (const d of cache.get(p.empresa_id)) await enviar(d.chat_id, mensagemAlerta);
        }
        for (const p of rows) if (p.data_pedido > marcaPedidos) marcaPedidos = p.data_pedido;
        const limite = Date.now() - 10 * 60 * 1000;
        for (const [id, quando] of pedidosAvisados) if (new Date(quando).getTime() < limite) pedidosAvisados.delete(id);
    } catch (err) {
        console.log('Erro ao verificar novos pedidos:', err.message);
    }
}
setInterval(verificarPedidos, 20 * 1000);
verificarPedidos();

// Erros inesperados não derrubam o bot.
bot.catch((err, ctx) => {
    console.log('Erro no bot:', err.message);
    ctx.reply('⚠️ Ocorreu um erro ao falar com o sistema. Tente novamente em instantes.').catch(() => {});
});

// Servidor HTTP para manter o Render ativo 24/7
const http = require('http');
http.createServer((req, res) => { res.writeHead(200); res.end('Bot Online!'); }).listen(process.env.PORT || 3001);

// Long polling (getUpdates): o bot busca as mensagens no Telegram; não há webhook.
// Só pode haver UMA cópia ligada por token (a segunda recebe erro 409 do Telegram).
bot.launch().catch((err) => {
    console.log('Erro ao iniciar o bot (outra cópia ligada com o mesmo token?):', err.message);
    process.exit(1);
});
// Mostra qual bot é este token (o link do painel, CONFIG.telegram, deve apontar para ele).
bot.telegram.getMe()
    .then((me) => console.log(`🤖 Bot @${me.username} ligado ao Taylor (schema ${SCHEMA}), com briefings às 9h, 13h e 18h!`))
    .catch((err) => console.log('Não foi possível confirmar o bot no Telegram (confira o TELEGRAM_TOKEN):', err.message));
process.once('SIGINT', () => { bot.stop('SIGINT'); pool.end(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); pool.end(); });
