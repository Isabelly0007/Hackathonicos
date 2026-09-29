require('dotenv').config();
const { Telegraf, session, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron'); // Importa o agendador de tarefas

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.use(session());

let chatIdAtivo = null;

// 1. Middleware de Sessão e Estados
bot.use(async (ctx, next) => {
    if (!ctx.session) {
        ctx.session = { 
            empresa_id: null, 
            empresa_nome: null, 
            loja_id: null, 
            loja_nome: null, 
            estado: null, 
            temp_email: null,
            temp_sku: null,
            novo_produto: {} 
        };
    }
    return next();
});

bot.start((ctx) => {
    chatIdAtivo = ctx.chat.id;
    ctx.session.estado = null;
    if (ctx.session.empresa_id) {
        return ctx.reply(`👋 Bem-vindo de volta, *${ctx.session.empresa_nome}*!\n\nUse /lojas, /estoque, /novo, /entrada, /baixa ou /sair.`, { parse_mode: 'Markdown' });
    }
    ctx.reply('🔒 *Acesso Restrito*\n\nPara iniciar sessão, envie o comando:\n`/login`', { parse_mode: 'Markdown' });
});

// 2. Comando /login
bot.command('login', (ctx) => {
    chatIdAtivo = ctx.chat.id;
    ctx.session.estado = 'AGUARDANDO_EMAIL';
    ctx.session.temp_email = null;
    ctx.reply('📧 Por favor, envie o seu *e-mail* cadastrado:', { parse_mode: 'Markdown' });
});

// 3. Comando /novo
bot.command('novo', (ctx) => {
    ctx.session.estado = 'AGUARDANDO_NOME_NOVO';
    ctx.session.novo_produto = {};
    ctx.reply('✨ *Registo de Novo Produto*\n\nPor favor, envie o **nome** do produto:', { parse_mode: 'Markdown' });
});

// 4. Comando /entrada
bot.command('entrada', (ctx) => {
    ctx.session.estado = 'AGUARDANDO_SKU_ENTRADA';
    ctx.session.temp_sku = null;
    ctx.reply('📦 *Registo de Entrada de Quantidade*\n\nPor favor, envie o **SKU** do produto que deseja repor:', { parse_mode: 'Markdown' });
});

// 5. Comando /baixa
bot.command('baixa', (ctx) => {
    ctx.session.estado = 'AGUARDANDO_SKU_BAIXA';
    ctx.session.temp_sku = null;
    ctx.reply('📉 *Registo de Baixa de Quantidade*\n\nPor favor, envie o **SKU** do produto que deseja dar baixa:', { parse_mode: 'Markdown' });
});

// 6. Comando /sair
bot.command('sair', (ctx) => {
    ctx.session.empresa_id = null;
    ctx.session.empresa_nome = null;
    ctx.session.loja_id = null;
    ctx.session.loja_nome = null;
    ctx.session.estado = null;
    ctx.session.temp_email = null;
    ctx.session.temp_sku = null;
    ctx.session.novo_produto = {};
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
    if (!ctx.session.empresa_id) {
        return ctx.reply('⚠️ Faça o login primeiro enviando:\n`/login`', { parse_mode: 'Markdown' });
    }
    return next();
});

// 8. Intercetor de Texto para fluxos conversacionais
bot.on('text', async (ctx, next) => {
    const texto = ctx.message.text.trim();

    if (texto.startsWith('/')) {
        return next();
    }

    // --- FLUXO DE LOGIN ---
    if (ctx.session.estado === 'AGUARDANDO_EMAIL') {
        const emailDigitado = texto.toLowerCase();

        const { data: usuario } = await supabase
            .from('usuario')
            .select('*')
            .eq('email', emailDigitado)
            .single();

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

        const { data: usuario } = await supabase
            .from('usuario')
            .select('*')
            .eq('email', emailSalvo)
            .single();

        if (!usuario || usuario.senha_hash !== senhaDigitada) {
            return ctx.reply('❌ *Senha incorreta!* O login falhou.\nEnvie `/login` para tentar novamente.', { parse_mode: 'Markdown' });
        }

        const { data: empresa } = await supabase
            .from('empresa')
            .select('id_empresa, nome_fantasia')
            .eq('id_empresa', usuario.empresa_id)
            .single();

        ctx.session.empresa_id = empresa.id_empresa;
        ctx.session.empresa_nome = empresa.nome_fantasia;

        return ctx.reply(`✅ Login realizado com sucesso na empresa *${empresa.nome_fantasia}*!\n\nUse /lojas, /estoque, /novo, /entrada ou /baixa.`, { parse_mode: 'Markdown' });
    }

    // --- FLUXO DE NOVO PRODUTO ---
    if (ctx.session.estado === 'AGUARDANDO_NOME_NOVO') {
        ctx.session.novo_produto.nome = texto;
        ctx.session.estado = 'AGUARDANDO_SKU_NOVO';
        return ctx.reply('🏷️ Agora, envie o **SKU** (código único) do produto:', { parse_mode: 'Markdown' });
    }

    if (ctx.session.estado === 'AGUARDANDO_SKU_NOVO') {
        ctx.session.novo_produto.sku = texto.toUpperCase();
        ctx.session.estado = 'AGUARDANDO_DESC_NOVO';
        return ctx.reply('📝 Agora, envie uma breve **descrição** para o produto:', { parse_mode: 'Markdown' });
    }

    if (ctx.session.estado === 'AGUARDANDO_DESC_NOVO') {
        ctx.session.novo_produto.descricao = texto;
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

        const { error } = await supabase.from('produto').insert({
            empresa_id: ctx.session.empresa_id,
            sku: p.sku,
            nome: p.nome,
            descricao: p.descricao,
            preco: p.preco,
            estoque_atual: p.estoque_atual,
            estoque_minimo: minimo,
            status: 'Ativo',
            data_cadastro: new Date(),
            data_atualizacao: new Date()
        });

        if (error) {
            return ctx.reply(`❌ Erro ao cadastrar produto: ${error.message}\nVerifique se o SKU já existe.`);
        }

        return ctx.reply(
            `✨ *Produto cadastrado com sucesso!* 🎉\n\n` +
            `📦 *Nome:* ${p.nome}\n` +
            `🏷️ *SKU:* \`${p.sku}\`\n` +
            `💰 *Preço:* R$ ${p.preco}\n` +
            `📊 *Quantidade Inicial:* ${p.estoque_atual} un\n` +
            `⚠️ *Quantidade Mínima:* ${minimo} un`,
            { parse_mode: 'Markdown' }
        );
    }

    // --- FLUXO DE ENTRADA DE QUANTIDADE ---
    if (ctx.session.estado === 'AGUARDANDO_SKU_ENTRADA') {
        const skuDigitado = texto.toUpperCase();

        const { data: produto } = await supabase
            .from('produto')
            .select('*')
            .eq('sku', skuDigitado)
            .eq('empresa_id', ctx.session.empresa_id)
            .single();

        if (!produto) {
            return ctx.reply(`❌ Nenhum produto encontrado com o SKU \`${skuDigitado}\` na sua empresa.\nVerifique o SKU ou envie /sair para cancelar.`);
        }

        ctx.session.temp_sku = skuDigitado;
        ctx.session.estado = 'AGUARDANDO_QTD_ENTRADA';
        return ctx.reply(`✅ Produto encontrado: *${produto.nome}*\nQuantidade atual: *${produto.estoque_atual}* un\n\nAgora, informe a **quantidade** que deseja adicionar:`, { parse_mode: 'Markdown' });
    }

    if (ctx.session.estado === 'AGUARDANDO_QTD_ENTRADA') {
        const quantidade = parseInt(texto, 10);

        if (isNaN(quantidade) || quantidade <= 0) {
            return ctx.reply('⚠️ Quantidade inválida! Por favor, digite um número inteiro maior que zero.');
        }

        const sku = ctx.session.temp_sku;
        ctx.session.estado = null;
        ctx.session.temp_sku = null;

        const { data: produto } = await supabase
            .from('produto')
            .select('*')
            .eq('sku', sku)
            .eq('empresa_id', ctx.session.empresa_id)
            .single();

        const estoqueAnterior = produto.estoque_atual;
        const novoEstoque = estoqueAnterior + quantidade;

        await supabase
            .from('produto')
            .update({ estoque_atual: novoEstoque, data_atualizacao: new Date() })
            .eq('id_produto', produto.id_produto);

        await supabase.from('movimento_estoque').insert({
            produto_id: produto.id_produto,
            tipo: 'ENTRADA_MANUAL',
            quantidade: quantidade,
            estoque_anterior: estoqueAnterior,
            estoque_atual: novoEstoque,
            data_movimento: new Date(),
            observacao: 'Reposição manual via Telegram'
        });

        return ctx.reply(
            `✅ *Entrada registada com sucesso!* 📈\n\n` +
            `📦 *Produto:* ${produto.nome} (\`${sku}\`)\n` +
            `📉 Quantidade Anterior: ${estoqueAnterior} un\n` +
            `➕ Quantidade Adicionada: +${quantidade} un\n` +
            `📊 *Nova Quantidade Atual:* *${novoEstoque}* un`,
            { parse_mode: 'Markdown' }
        );
    }

    // --- FLUXO DE BAIXA DE QUANTIDADE ---
    if (ctx.session.estado === 'AGUARDANDO_SKU_BAIXA') {
        const skuDigitado = texto.toUpperCase();

        const { data: produto } = await supabase
            .from('produto')
            .select('*')
            .eq('sku', skuDigitado)
            .eq('empresa_id', ctx.session.empresa_id)
            .single();

        if (!produto) {
            return ctx.reply(`❌ Nenhum produto encontrado com o SKU \`${skuDigitado}\` na sua empresa.\nVerifique o SKU ou envie /sair para cancelar.`);
        }

        ctx.session.temp_sku = skuDigitado;
        ctx.session.estado = 'AGUARDANDO_QTD_BAIXA';
        return ctx.reply(`✅ Produto encontrado: *${produto.nome}*\nQuantidade atual: *${produto.estoque_atual}* un\n\nAgora, informe a **quantidade** que deseja retirar (dar baixa):`, { parse_mode: 'Markdown' });
    }

    if (ctx.session.estado === 'AGUARDANDO_QTD_BAIXA') {
        const quantidade = parseInt(texto, 10);

        if (isNaN(quantidade) || quantidade <= 0) {
            return ctx.reply('⚠️ Quantidade inválida! Por favor, digite um número inteiro maior que zero.');
        }

        const sku = ctx.session.temp_sku;
        ctx.session.estado = null;
        ctx.session.temp_sku = null;

        const { data: produto } = await supabase
            .from('produto')
            .select('*')
            .eq('sku', sku)
            .eq('empresa_id', ctx.session.empresa_id)
            .single();

        const estoqueAnterior = produto.estoque_atual;

        if (estoqueAnterior < quantidade) {
            return ctx.reply(`❌ Quantidade insuficiente! A quantidade atual é de apenas *${estoqueAnterior}* un.\nEnvie \`/baixa\` novamente para tentar outra quantidade.`, { parse_mode: 'Markdown' });
        }

        const novoEstoque = estoqueAnterior - quantidade;

        await supabase
            .from('produto')
            .update({ estoque_atual: novoEstoque, data_atualizacao: new Date() })
            .eq('id_produto', produto.id_produto);

        await supabase.from('movimento_estoque').insert({
            produto_id: produto.id_produto,
            tipo: 'BAIXA_MANUAL',
            quantidade: quantidade,
            estoque_anterior: estoqueAnterior,
            estoque_atual: novoEstoque,
            data_movimento: new Date(),
            observacao: 'Baixa manual via Telegram'
        });

        return ctx.reply(
            `✅ *Baixa registada com sucesso!* 📉\n\n` +
            `📦 *Produto:* ${produto.nome} (\`${sku}\`)\n` +
            `📈 Quantidade Anterior: ${estoqueAnterior} un\n` +
            `➖ Quantidade Retirada: -${quantidade} un\n` +
            `📊 *Nova Quantidade Atual:* *${novoEstoque}* un`,
            { parse_mode: 'Markdown' }
        );
    }

    return next();
});

// 9. Comando /lojas
bot.command('lojas', async (ctx) => {
    const { data: canais, error } = await supabase.from('canal').select('*');

    if (error || !canais || canais.length === 0) {
        return ctx.reply('❌ Nenhuma loja online / canal configurado no momento.');
    }

    const botoes = canais.map(canal => [
        Markup.button.callback(`🛒 ${canal.nome} (${canal.tipo})`, `canal_${canal.id_canal}`)
    ]);

    ctx.reply('🏬 *Selecione a loja online / marketplace que deseja consultar:*', Markup.inlineKeyboard(botoes));
});

// 10. Ação ao clicar numa loja específica
bot.action(/canal_(.+)/, async (ctx) => {
    const canalId = ctx.match[1];
    const { data: canal } = await supabase.from('canal').select('nome').eq('id_canal', canalId).single();
    ctx.session.loja_id = canalId;
    ctx.session.loja_nome = canal ? canal.nome : 'Loja';

    ctx.answerCbQuery();
    ctx.reply(`✅ Loja *${ctx.session.loja_nome}* selecionada!\n\nEnvie /estoqueloja para ver a quantidade desta loja.`, { parse_mode: 'Markdown' });
});

// 11. Comando /estoqueloja
bot.command('estoqueloja', async (ctx) => {
    if (!ctx.session.loja_id) {
        return ctx.reply('⚠️ Primeiro selecione uma loja usando o comando /lojas.');
    }

    const { data: vinculos, error } = await supabase
        .from('produto_canal')
        .select(`
            estoque_canal,
            preco_canal,
            produto:produto_id (nome, sku, empresa_id)
        `)
        .eq('canal_id', ctx.session.loja_id);

    if (error) return ctx.reply('Erro ao buscar quantidade da loja: ' + error.message);
    
    const produtosDaEmpresa = vinculos.filter(v => v.produto && v.produto.empresa_id === ctx.session.empresa_id);

    if (!produtosDaEmpresa || produtosDaEmpresa.length === 0) {
        return ctx.reply(`📦 Não há produtos associados à loja *${ctx.session.loja_nome}* no momento.`);
    }

    let resposta = `📦 *Quantidade na Loja: ${ctx.session.loja_nome}*\n\n`;
    produtosDaEmpresa.forEach(item => {
        resposta += `- *${item.produto.nome}* (SKU: \`${item.produto.sku}\`)\n  Preço: R$ ${item.preco_canal} | Quantidade: *${item.estoque_canal}* un\n\n`;
    });

    ctx.replyWithMarkdown(resposta);
});

// 12. Comando /estoque geral
bot.command('estoque', async (ctx) => {
    const { data, error } = await supabase
        .from('produto')
        .select('*')
        .eq('empresa_id', ctx.session.empresa_id);

    if (error) return ctx.reply('Erro ao buscar catálogo: ' + error.message);
    if (!data || data.length === 0) return ctx.reply('O catálogo central está vazio.');
    
    let resposta = `📦 *Catálogo Central Geral (${ctx.session.empresa_nome}):*\n\n`;
    data.forEach(i => {
        resposta += `- *${i.nome}* (SKU: \`${i.sku}\`)\n  Preço: R$ ${i.preco} | Quantidade: *${i.estoque_atual}* un\n\n`;
    });

    ctx.replyWithMarkdown(resposta);
});

// 📊 13. BRIEFING AUTOMÁTICO (Executa às 9h, 13h e 18h)
cron.schedule('0 9,13,18 * * *', async () => {
    if (!chatIdAtivo) return;

    // Busca pedidos do dia atual (a partir das 00:00)
    const hojeInicio = new Date();
    hojeInicio.setHours(0, 0, 0, 0);

    const { data: pedidos, error } = await supabase
        .from('pedido')
        .select('*')
        .gte('data_pedido', hojeInicio.toISOString());

    if (error) {
        console.log('Erro ao buscar briefing automático:', error.message);
        return;
    }

    const totalVendas = pedidos ? pedidos.length : 0;
    const faturamentoTotal = pedidos ? pedidos.reduce((acc, p) => acc + Number(p.valor_total || 0), 0) : 0;
    
    // Filtra vendas não conferidas/pendentes (ajuste o status conforme o padrão do seu banco se necessário)
    const naoConferidos = pedidos ? pedidos.filter(p => {
        const st = p.status ? p.status.toLowerCase() : '';
        return st !== 'pago' && st !== 'concluido' && st !== 'finalizado';
    }).length : 0;

    const relatorio = 
        `📊 *RELATÓRIO PERIÓDICO DE VENDAS* 📊\n\n` +
        `⏰ Horário de Disparo: ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
        `🛒 *Vendas do Dia:* ${totalVendas}\n` +
        `💰 *Faturamento Total:* R$ ${faturamentoTotal.toFixed(2)}\n` +
        `⚠️ *Vendas Não Conferidas:* ${naoConferidos}\n\n` +
        `_Relatório gerado automaticamente pelo sistema._`;

    bot.telegram.sendMessage(chatIdAtivo, relatorio, { parse_mode: 'Markdown' })
        .catch(err => console.log('Erro ao enviar briefing automático:', err.message));
}, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
});

// 🚨 14. ESCUTA EM TEMPO REAL (Supabase Realtime para Pedidos e Vendas)
supabase.channel('monitor-vendas')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedido' }, async (payload) => {
      const novoPedido = payload.new;
      
      const { data: canal } = await supabase.from('canal').select('nome').eq('id_canal', novoPedido.canal_id).single();
      const nomeLoja = canal ? canal.nome : 'Marketplace';

      if (chatIdAtivo) {
          const mensagemAlerta = 
              `🚨 *NOVA VENDA REALIZADA!* 🚨\n\n` +
              `🛒 *Loja:* ${nomeLoja}\n` +
              `📦 *Cód. Pedido:* \`${novoPedido.codigo_externo}\`\n` +
              `💰 *Valor Total:* R$ ${novoPedido.valor_total}\n` +
              `🚚 *Frete:* R$ ${novoPedido.frete}\n\n` +
              `_A quantidade foi atualizada automaticamente pela API._`;

          bot.telegram.sendMessage(chatIdAtivo, mensagemAlerta, { parse_mode: 'Markdown' })
              .catch(err => console.log('Erro ao enviar mensagem:', err.message));
      }
  })
  .subscribe();

// Servidor HTTP para manter o Render ativo 24/7
const http = require('http');
http.createServer((req, res) => { res.writeHead(200); res.end('Bot Online!'); }).listen(process.env.PORT || 3001);

bot.launch();
console.log('🤖 Bot com briefings automáticos às 9h, 13h e 18h a funcionar!');
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));