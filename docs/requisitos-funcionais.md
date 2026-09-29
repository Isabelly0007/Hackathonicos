# Requisitos funcionais

Cada requisito indica a **tela** de origem, a **classificação** ([REAL], [SIMULADO], [PLANEJADO], [VISUAL] — ver [README](README.md#legenda-de-classificação)) e o endpoint proposto em [api-backend.md](api-backend.md).

Atores usados: **Lojista** (usuário autenticado da empresa), **Visitante** (não autenticado), **Sistema** (processos automáticos do back-end), **Marketplace**, **Gemini**, **Telegram**, **SEFAZ (simulada)**.

## Índice

| Código | Nome | Módulo | Classificação |
|---|---|---|---|
| RF001 | Autenticar usuário | Acesso | [SIMULADO] |
| RF002 | Criar conta e empresa | Acesso | [SIMULADO] |
| RF003 | Encerrar sessão | Acesso | [REAL] (local) |
| RF004 | Recuperar senha | Acesso | [VISUAL] |
| RF005 | Exibir indicadores do dashboard por período | Dashboard | [SIMULADO] |
| RF006 | Exibir vendas por canal | Dashboard | [SIMULADO] |
| RF007 | Exibir pedidos por status | Dashboard | [SIMULADO] |
| RF008 | Exibir alertas de estoque | Dashboard / Estoque | [SIMULADO] |
| RF009 | Exibir canais conectados e sincronizar todos | Dashboard / Canais | [SIMULADO] |
| RF010 | Listar produtos com filtro por status | Produtos | [SIMULADO] |
| RF011 | Cadastrar produto | Produtos | [VISUAL] |
| RF012 | Listar pedidos consolidados | Pedidos | [SIMULADO] |
| RF013 | Sincronizar pedidos | Pedidos | [VISUAL] |
| RF014 | Exportar pedidos | Pedidos | [VISUAL] |
| RF015 | Visualizar estoque central e por canal | Estoque | [SIMULADO] |
| RF016 | Sincronizar estoque entre canais | Estoque | [VISUAL] / [SIMULADO] |
| RF017 | Detectar e revisar divergências de estoque | Estoque | [SIMULADO] / [VISUAL] |
| RF018 | Pausar anúncios sem estoque | Estoque | [SIMULADO] |
| RF019 | Listar notas fiscais e indicadores fiscais | Notas fiscais | [SIMULADO] |
| RF020 | Emitir NF-e de um pedido | Notas fiscais | [VISUAL] / [SIMULADO] |
| RF021 | Emitir NF-e em lote | Notas fiscais | [VISUAL] / [SIMULADO] |
| RF022 | Validar dados fiscais antes da emissão | Notas fiscais | [SIMULADO] |
| RF023 | Tratar NF-e rejeitada | Notas fiscais | [SIMULADO] |
| RF024 | Importar XML e exportar XMLs | Notas fiscais | [VISUAL] |
| RF025 | Listar marketplaces com métricas | Marketplaces | [SIMULADO] |
| RF026 | Conectar marketplace | Marketplaces | [VISUAL] / [PLANEJADO] |
| RF027 | Sincronizar marketplace individual | Marketplaces | [VISUAL] |
| RF028 | Gerenciar integrações | Integrações | [VISUAL] |
| RF029 | Consultar relatórios | Relatórios | [SIMULADO] |
| RF030 | Gerenciar notificações | Notificações | [REAL] (local) / [SIMULADO] |
| RF031 | Configurar canais de recebimento de alertas | Notificações | [VISUAL] |
| RF032 | Manter dados da empresa | Configurações › Empresa | [VISUAL] |
| RF033 | Gerenciar certificado digital | Configurações › Empresa | [VISUAL] |
| RF034 | Configurar preferências e sincronização | Configurações › Preferências | Tema [REAL] (local) / demais [VISUAL] |
| RF035 | Configurar eventos de notificação por canal | Configurações › Notificações | [VISUAL] |
| RF036 | Gerenciar equipe e segurança | Configurações › Equipe | [VISUAL] |
| RF037 | Visualizar plano e uso | Configurações › Plano | [VISUAL] |
| RF038 | Conversar com o assistente de IA por texto | Assistente IA | [SIMULADO] |
| RF039 | Interagir com o assistente por voz | Assistente IA | [PLANEJADO] |
| RF040 | Consultar a operação e receber alertas pelo Telegram | Telegram | [PLANEJADO] |
| RF041 | Consultar central de ajuda | Ajuda | [REAL] (local) / [SIMULADO] |
| RF042 | Busca global | Barra superior | [VISUAL] |

---

## Acesso

### RF001 — Autenticar usuário
| Item | Descrição |
|---|---|
| Tela | Login (aba "Entrar") |
| Descrição | Permite ao lojista acessar o painel com e-mail e senha. |
| Ator | Visitante |
| Entrada | `email`, `password`; opção "Lembrar de mim" (checkbox) |
| Processamento esperado | Validar preenchimento (RN001); autenticar credenciais; criar sessão; carregar usuário e empresa ativa. |
| Saída | Token de sessão e dados do usuário/empresa; redireciona para **Início**. |
| Erros/exceções | Campos vazios → "Preencha seu e-mail e sua senha."; credenciais inválidas (texto da mensagem: Pendente de definição); serviço indisponível. |
| Situação atual | [SIMULADO] qualquer e-mail/senha preenchidos são aceitos. Efeito de "Lembrar de mim": Pendente de definição. |
| Endpoint | `POST /api/auth/login` |

### RF002 — Criar conta e empresa
| Item | Descrição |
|---|---|
| Tela | Login (aba "Criar conta") |
| Descrição | Cadastra o usuário e a empresa (CNPJ) que será operada no Taylor. |
| Ator | Visitante |
| Entrada | `name` (Seu nome), `company` (Empresa), `email`, `password`, `cnpj` |
| Processamento esperado | Validar campos (RN001, RN002); garantir unicidade de e-mail e CNPJ; criar usuário, empresa e vínculo usuário–empresa como administrador; iniciar sessão. |
| Saída | Usuário e empresa criados; sessão iniciada; redireciona para **Início**. |
| Erros/exceções | Campos obrigatórios vazios; e-mail já cadastrado; CNPJ já cadastrado; CNPJ inválido (algoritmo de validação: Pendente de definição). |
| Situação atual | [SIMULADO] o front só valida e-mail e senha e entra no painel. |
| Endpoint | `POST /api/auth/register` |

### RF003 — Encerrar sessão
| Item | Descrição |
|---|---|
| Tela | Sidebar (botão da empresa "Plano Pro · Sair") |
| Ator | Lojista |
| Entrada | Clique em "Sair" |
| Processamento esperado | Invalidar o token/sessão. |
| Saída | Volta para a tela de login. |
| Erros/exceções | Token já expirado (tratar como sucesso). |
| Situação atual | [REAL] local — apenas troca o estado do front. |
| Endpoint | `POST /api/auth/logout` |

### RF004 — Recuperar senha
| Item | Descrição |
|---|---|
| Tela | Login (botão "Esqueci minha senha") |
| Ator | Visitante |
| Entrada / Processamento / Saída | Pendente de definição (não há formulário nem fluxo). |
| Situação atual | [VISUAL] botão sem ação. |
| Endpoint | `POST /api/auth/forgot-password` (proposto; Pendente de definição) |

---

## Dashboard (tela Início)

### RF005 — Exibir indicadores do dashboard por período
| Item | Descrição |
|---|---|
| Descrição | Exibe 5 cartões: Vendas, Pedidos, Produtos, Estoque crítico, Marketplaces conectados — cada um com valor, variação e minigráfico. |
| Ator | Lojista |
| Entrada | `period` ∈ {`Hoje`, `7 dias`, `30 dias`} (seletor segmentado; padrão `Hoje`) |
| Processamento esperado | Somar vendas e contar pedidos do período; contar produtos cadastrados, produtos em estoque crítico (RN012) e integrações de marketplace ativas; calcular variação vs. período anterior (RN008). |
| Saída | Lista de 5 indicadores. |
| Erros/exceções | Período inválido → 400. Falha da API → o front usa dados de exemplo. |
| Situação atual | [SIMULADO] — já chama `GET /api/dashboard/stats?period=` quando `useApi = true`. |

### RF006 — Exibir vendas por canal
| Item | Descrição |
|---|---|
| Descrição | Gráfico de linhas com a evolução das vendas (R$) por marketplace. |
| Ator | Lojista |
| Entrada | `range` ∈ {`Hoje`, `7 dias`, `30 dias`} (select "Hoje", "Últimos 7 dias", "Últimos 30 dias"; padrão `7 dias`) |
| Processamento esperado | Agrupar vendas por canal e por intervalo (horas para `Hoje`: 08h a 20h de 2 em 2 h; dias para 7 e 30 dias — 7 pontos); calcular o teto do eixo Y. |
| Saída | Rótulos do eixo X, `yMax` e séries por canal. |
| Erros/exceções | Range inválido → 400. |
| Situação atual | [SIMULADO] — chama `GET /api/dashboard/sales?range=`. Se os valores são acumulados ou por intervalo: Pendente de definição (o mock de `Hoje` é crescente, sugerindo acumulado). |

### RF007 — Exibir pedidos por status
| Item | Descrição |
|---|---|
| Descrição | Gráfico de rosca com a quantidade de pedidos por status e o total no centro. |
| Ator | Lojista |
| Entrada | Nenhuma. Se deve respeitar o período selecionado: Pendente de definição (o front não envia período). |
| Processamento esperado | Contar pedidos por status (RN007). |
| Saída | Lista `{label, value, color}`. |
| Situação atual | [SIMULADO] — chama `GET /api/dashboard/order-statuses`. |

### RF008 — Exibir alertas de estoque
| Item | Descrição |
|---|---|
| Descrição | Lista produtos com estoque baixo ou zerado, destacando os críticos em vermelho. Link "Ver todos" ([VISUAL], sem ação). |
| Ator | Lojista |
| Entrada | Nenhuma |
| Processamento esperado | Selecionar produtos em estoque baixo (RN012) ou sem estoque (RN011); montar a descrição ("2 unidades restantes", "Sem estoque"). |
| Saída | Lista `{name, desc, critical}`. |
| Situação atual | [SIMULADO] — chama `GET /api/dashboard/stock-alerts`. Critério de `critical`: Pendente de definição (no mock, 0 e 2 unidades são críticos; 3 e 4 não). |

### RF009 — Exibir canais conectados e sincronizar todos
| Item | Descrição |
|---|---|
| Descrição | Cartões dos marketplaces conectados (nome, "Conectado", nº de produtos, última sincronização) e botão "Sincronizar agora". |
| Ator | Lojista |
| Entrada | Clique em "Sincronizar agora" |
| Processamento esperado | Disparar a sincronização de produtos, pedidos e estoque com todos os canais conectados (simulada no MVP); atualizar a data da última sincronização. |
| Saída | Lista de canais; após sincronizar, "Última sinc.: agora". |
| Erros/exceções | Sincronização já em andamento (o front bloqueia novo clique); falha em um canal (tratamento: Pendente de definição). |
| Situação atual | [SIMULADO] — lista via `GET /api/channels`; a sincronização é só uma animação local de 1,4 s. |

---

## Produtos

### RF010 — Listar produtos com filtro por status
| Item | Descrição |
|---|---|
| Descrição | Tabela: Produto, SKU, Estoque, Preço, Status, Canais, Atualização. Abas: Todos, Ativos, Estoque baixo, Sem estoque (com contadores). Botão "Filtros" e menu "•••" por linha ([VISUAL]). |
| Ator | Lojista |
| Entrada | Filtro de status (aba) |
| Processamento esperado | Listar produtos da empresa, derivando o status (RN011) e os canais em que o produto está publicado; retornar contadores por status. |
| Saída | Lista de produtos + contadores. |
| Situação atual | [SIMULADO] — chama `GET /api/products` (sem filtro). As abas só mudam o destaque visual; contadores fixos no código. |

### RF011 — Cadastrar produto
| Item | Descrição |
|---|---|
| Descrição | Botão "＋ Novo produto". |
| Ator | Lojista |
| Entrada | Pelo resumo do projeto: nome, SKU, preço, estoque atual, estoque mínimo. Demais campos (NCM, origem fiscal, canais de publicação): Pendente de definição. |
| Processamento esperado | Validar campos; garantir SKU único por empresa; criar o produto; publicação nos canais (simulada): Pendente de definição. |
| Saída | Produto criado. |
| Erros/exceções | SKU duplicado; preço ou estoque negativos; campos obrigatórios vazios. |
| Situação atual | [VISUAL] — não existe formulário. Edição e exclusão (menu "•••"): Pendente de definição. |

---

## Pedidos

### RF012 — Listar pedidos consolidados
| Item | Descrição |
|---|---|
| Descrição | Indicadores (Pedidos hoje, Vendas hoje, Ticket médio, Pedidos pendentes) e tabela: Pedido, Canal, Data, Cliente, Itens, Valor, Status. Abas: Todos, Aguardando, Em separação, Em transporte, Entregues, Cancelados. |
| Ator | Lojista |
| Entrada | Filtro de status; botão "Filtros" ([VISUAL]) |
| Processamento esperado | Listar pedidos de todos os canais; calcular os indicadores (RN005, RN006). |
| Saída | Lista de pedidos + indicadores. |
| Situação atual | [SIMULADO] — chama `GET /api/orders`; indicadores fixos no código; abas só visuais. Detalhe do pedido (menu "•••"): Pendente de definição. |

### RF013 — Sincronizar pedidos
| Item | Descrição |
|---|---|
| Descrição | Botão "Sincronizar pedidos": importa novos pedidos dos marketplaces. |
| Ator | Lojista; Sistema (importação automática — RN021) |
| Processamento esperado | Buscar pedidos novos (simulado no MVP), gravar, baixar o estoque central (RN013) e gerar notificação "Novo pedido" (RN031). |
| Saída | Quantidade de pedidos importados. |
| Situação atual | [VISUAL]. |

### RF014 — Exportar pedidos
| Item | Descrição |
|---|---|
| Descrição | Botão "Exportar". |
| Ator | Lojista |
| Entrada / Saída | Formato do arquivo e filtros: Pendente de definição. |
| Situação atual | [VISUAL]. |

---

## Estoque

### RF015 — Visualizar estoque central e por canal
| Item | Descrição |
|---|---|
| Descrição | Indicadores (Produtos cadastrados, Unidades disponíveis, Estoque baixo, Sem estoque), faixa "N divergências precisam da sua atenção" e tabela: Produto, SKU, Estoque central, Estoque mínimo, Mercado Livre, Shopee, Magalu, Status. |
| Ator | Lojista |
| Processamento esperado | Para cada produto, retornar estoque central, mínimo e quantidade publicada em cada canal; derivar o status de estoque (RN014). |
| Saída | Lista + indicadores + quantidade de divergências. |
| Situação atual | [SIMULADO] — chama `GET /api/stock`; indicadores e faixa fixos. |

### RF016 — Sincronizar estoque entre canais
| Item | Descrição |
|---|---|
| Descrição | Botão "↻ Sincronizar estoque": envia o estoque central a todos os canais. |
| Ator | Lojista; Sistema (automático a cada venda — RN013 — e no intervalo configurado — RN022) |
| Processamento esperado | Para cada produto, igualar a quantidade publicada em cada canal ao estoque central (simulado); registrar a sincronização; gerar notificação "Sincronização concluída" (RN030). |
| Saída | Resumo: produtos atualizados, canais, erros. |
| Situação atual | [VISUAL] na tela Estoque; [SIMULADO] no dashboard (RF009). |

### RF017 — Detectar e revisar divergências de estoque
| Item | Descrição |
|---|---|
| Descrição | Botão "Revisar divergências". Divergência = quantidade publicada em algum canal diferente do estoque central (RN015). |
| Ator | Lojista; Sistema (detecção) |
| Entrada | Produto e valor que deve prevalecer (estoque central ou quantidade de um canal) |
| Processamento esperado | Listar divergências; aplicar o valor escolhido ao estoque central e sincronizar todos os canais. |
| Saída | Divergência resolvida; status volta a "Sincronizado". |
| Erros/exceções | Produto sem divergência → 409. |
| Situação atual | [SIMULADO] status "Divergência detectada" na tabela; a tela de revisão não existe ([VISUAL]). |

### RF018 — Pausar anúncios sem estoque
| Item | Descrição |
|---|---|
| Descrição | Quando o estoque de um produto chega a zero, os anúncios são pausados em todos os canais (RN016). |
| Ator | Sistema |
| Entrada | Evento de estoque zerado |
| Processamento esperado | Se a preferência "Pausar anúncios sem estoque" estiver ativa, pausar os anúncios (simulado) e gerar notificação de estoque. |
| Saída | Anúncios pausados + notificação "<produto> sem estoque". |
| Situação atual | [SIMULADO] apenas a notificação de exemplo. Reativação ao repor estoque: Pendente de definição. |

---

## Notas fiscais (fluxo fiscal simulado)

### RF019 — Listar notas fiscais e indicadores fiscais
| Item | Descrição |
|---|---|
| Descrição | Faixa "N pedidos prontos para faturar" com o fluxo 01 Pedido recebido → 02 Validação fiscal → 03 NF-e autorizada; indicadores (Emitidas hoje, Aguardando emissão, Tempo médio, Rejeições evitadas); "Saúde fiscal da operação" (nota 0–100 e itens); "Guardião de rejeições"; tabela: Nota, Pedido, Canal, Cliente, Valor, Status, Emissão. Abas: Todas, Aguardando emissão, Processando, Autorizadas, Rejeitadas. |
| Ator | Lojista |
| Processamento esperado | Listar notas por status (RN025); calcular indicadores; calcular saúde fiscal (fórmula da nota: Pendente de definição). |
| Saída | Lista + indicadores + saúde fiscal. |
| Situação atual | [SIMULADO] — chama `GET /api/invoices`; restante fixo no código. |

### RF020 — Emitir NF-e de um pedido
| Item | Descrição |
|---|---|
| Descrição | Botão "＋ Emitir nota fiscal". |
| Ator | Lojista |
| Entrada | Pedido (forma de seleção: Pendente de definição — não há formulário) |
| Processamento esperado | Validar dados (RN026) usando os dados da empresa (RN004); simular o envio à SEFAZ (RN024); atualizar status; devolver o XML ao pedido e ao canal (RN028). |
| Saída | Nota com status `Processando` → `Autorizada` ou `Rejeitada`. |
| Erros/exceções | Pedido já possui NF-e autorizada; pedido cancelado (Pendente de definição); dados fiscais incompletos. |
| Situação atual | [VISUAL]. |

### RF021 — Emitir NF-e em lote
| Item | Descrição |
|---|---|
| Descrição | Botão "Emitir 18 NF-e em lote" — emite as notas de todos os pedidos prontos para faturar. Botão "Revisar pedidos" ([VISUAL]). |
| Ator | Lojista |
| Processamento esperado | Para cada nota em "Aguardando emissão", executar o processamento de RF020. |
| Saída | Resumo: autorizadas e rejeitadas. |
| Situação atual | [VISUAL]. |

### RF022 — Validar dados fiscais antes da emissão
| Item | Descrição |
|---|---|
| Descrição | "A plataforma confere 23 regras antes de enviar cada NF-e à SEFAZ." Regras exibidas: cadastro do destinatário (CPF/CNPJ e endereço), tributação por UF (CFOP sugerido conforme destino), conciliação automática (XML devolvido ao pedido e ao canal). Saúde fiscal: NCM preenchido, certificado A1 válido, produtos sem origem fiscal. |
| Ator | Sistema |
| Processamento esperado | Executar as validações (RN026). Lista completa das 23 regras: Pendente de definição. |
| Saída | Aprovado ou lista de pendências; contador "Rejeições evitadas". |
| Situação atual | [SIMULADO]. |

### RF023 — Tratar NF-e rejeitada
| Item | Descrição |
|---|---|
| Descrição | A nota rejeitada exibe o motivo informado pela SEFAZ; o lojista corrige o dado e reenvia (RN027). A notificação "NF-e rejeitada" tem a ação "Revisar nota". |
| Ator | Lojista |
| Entrada | Nota rejeitada |
| Saída | Nota reenviada (status volta a `Processando`). |
| Situação atual | [SIMULADO] status e notificação; tela de detalhe/reenvio não existe. |

### RF024 — Importar XML e exportar XMLs
| Item | Descrição |
|---|---|
| Descrição | Botões "Importar XML" e "Exportar XMLs". |
| Ator | Lojista |
| Entrada / Saída | Finalidade da importação e formato da exportação (arquivo único, ZIP, filtros): Pendente de definição. |
| Situação atual | [VISUAL]. |

---

## Marketplaces e integrações

### RF025 — Listar marketplaces com métricas
| Item | Descrição |
|---|---|
| Descrição | Cartão por marketplace: "Conectado", Produtos publicados, Pedidos, Vendas, última sincronização. |
| Ator | Lojista |
| Saída | Lista de marketplaces com métricas. Período de Pedidos/Vendas: Pendente de definição (os valores do mock coincidem com "Hoje"). |
| Situação atual | [SIMULADO] — chama `GET /api/marketplaces`. |

### RF026 — Conectar marketplace
| Item | Descrição |
|---|---|
| Descrição | Botão "＋ Conectar canal": escolher o canal e autorizar com a conta de vendedor (FAQ); produtos e pedidos são importados automaticamente. |
| Ator | Lojista; Marketplace |
| Entrada | Marketplace escolhido; autorização OAuth |
| Processamento esperado | Fluxograma: solicitar autorização → marketplace autoriza via OAuth → back-end recebe `access_token` e salva a integração → consulta produtos, pedidos e estoque → armazena. **No MVP a autorização e a consulta são simuladas.** |
| Saída | Integração ativa + importação inicial. |
| Erros/exceções | Autorização negada; marketplace já conectado; limite do plano (5 marketplaces — [VISUAL]). |
| Situação atual | [VISUAL] botão sem ação; OAuth real [PLANEJADO]. |

### RF027 — Sincronizar marketplace individual
| Item | Descrição |
|---|---|
| Descrição | Botões "↻ Sincronizar" e "Gerenciar" em cada cartão de marketplace. |
| Ator | Lojista |
| Processamento esperado | Igual a RF009, restrito a um canal. Função de "Gerenciar": Pendente de definição. |
| Situação atual | [VISUAL]. |

### RF028 — Gerenciar integrações
| Item | Descrição |
|---|---|
| Descrição | Tela Integrações lista Mercado Livre, Shopee, Magalu e Telegram (conta `@lojabeta_bot`) com conta vinculada, última sincronização e botões Configurar, Reconectar, Desconectar. |
| Ator | Lojista |
| Processamento esperado | Reconectar: refazer a autorização. Desconectar: desativar a integração. Configurar: Pendente de definição. |
| Erros/exceções | Integração inexistente → 404. |
| Situação atual | [VISUAL] — a lista vem de `GET /api/marketplaces` + item fixo do Telegram. |

---

## Relatórios

### RF029 — Consultar relatórios
| Item | Descrição |
|---|---|
| Descrição | Indicadores (Vendas totais, Pedidos, Ticket médio, Produtos vendidos), "Evolução das vendas", "Vendas por marketplace" (% por canal) e "Produtos mais vendidos" (top 4 com unidades e valor). |
| Ator | Lojista |
| Entrada | Período ∈ {`7 dias`, `30 dias`, `3 meses`, `Personalizado`} |
| Processamento esperado | Agregar vendas, pedidos e itens no período (RN005). Datas do período "Personalizado": Pendente de definição. |
| Saída | Indicadores, série temporal, participação por canal, ranking de produtos. |
| Situação atual | [SIMULADO] — reutiliza `GET /api/dashboard/sales?range=7 dias` (usa só a 1ª série) e `GET /api/products` (4 primeiros nomes; unidades e valores são calculados artificialmente); o seletor de período só muda o destaque. |

---

## Notificações

### RF030 — Gerenciar notificações
| Item | Descrição |
|---|---|
| Descrição | Indicadores (Recebidas hoje, Alertas críticos, Novos pedidos, Entregues no Telegram); lista com filtros Todas, Não lidas (com contador), Pedidos, Estoque, Fiscal, Integrações; marcar como lida ao clicar; botão de ação que navega (ex.: "Ver estoque"); "Marcar todas como lidas"; contador na sidebar e ponto no sino da barra superior. Botão "Preferências" abre Configurações › Notificações. |
| Ator | Lojista; Sistema (gera as notificações) |
| Entrada | Filtro; id da notificação |
| Processamento esperado | Listar notificações da empresa (RN030); marcar uma ou todas como lidas. |
| Saída | Lista filtrada, contador de não lidas, toast "Todas as notificações foram marcadas como lidas". Lista vazia → "Tudo em dia!". |
| Situação atual | [REAL] filtros e marcação funcionam localmente (em memória, perdidos ao recarregar) com dados [SIMULADO]. |

### RF031 — Configurar canais de recebimento de alertas
| Item | Descrição |
|---|---|
| Descrição | Card "Onde receber alertas": Telegram, E-mail, Navegador (push), Resumo diário — cada um com liga/desliga. |
| Ator | Lojista |
| Saída | Preferências salvas. |
| Situação atual | [VISUAL] os switches não são persistidos. Relação com a matriz de RF035: Pendente de definição. |

---

## Configurações

### RF032 — Manter dados da empresa
| Item | Descrição |
|---|---|
| Descrição | Aba "Empresa": "Dados da empresa — Usados na emissão de NF-e". Campos: Razão social, Nome fantasia, CNPJ, Inscrição estadual, Regime tributário (Simples Nacional, Lucro Presumido, Lucro Real), E-mail de contato, Telefone, Endereço. Botões "Alterar logo", "Cancelar", "Salvar alterações". |
| Ator | Lojista |
| Processamento esperado | Validar e salvar. O endereço é um campo único na tela; estrutura detalhada (logradouro, cidade, UF, CEP), necessária para a regra de tributação por UF: Pendente de definição. |
| Saída | Toast "Alterações salvas com sucesso". |
| Erros/exceções | CNPJ inválido ou duplicado; campos obrigatórios (Pendente de definição). |
| Situação atual | [VISUAL] — "Salvar alterações" apenas exibe o toast; "Alterar logo" sem ação. |

### RF033 — Gerenciar certificado digital
| Item | Descrição |
|---|---|
| Descrição | "Certificado A1 · Loja Beta — Expira em 214 dias (01/05/2027)" com botão "Substituir". |
| Ator | Lojista |
| Situação atual | [VISUAL]. No MVP o fluxo fiscal é simulado; upload real de certificado: Pendente de definição. |

### RF034 — Configurar preferências e sincronização
| Item | Descrição |
|---|---|
| Descrição | "Aparência e região": Tema claro (switch), Idioma (Português (Brasil), English, Español), Fuso horário (Brasília GMT-3, Manaus GMT-4, Noronha GMT-2). "Sincronização": Sincronizar estoque automaticamente, Pausar anúncios sem estoque, Importar pedidos automaticamente (switches) e Intervalo de conferência (a cada 5, 15, 30 minutos ou a cada hora). |
| Ator | Lojista |
| Processamento esperado | Salvar as preferências; aplicá-las às rotinas automáticas (RN013, RN016, RN021, RN022). |
| Situação atual | Tema [REAL] (local, não persiste; também alternável pelo botão da barra superior); demais [VISUAL]. Se tema/idioma são por usuário ou por empresa: Pendente de definição. |

### RF035 — Configurar eventos de notificação por canal
| Item | Descrição |
|---|---|
| Descrição | Card Telegram (conta vinculada, "Alertas ativos desde…", "Abrir no Telegram") e matriz Evento × Canal (Telegram, E-mail, Push) para: Novo pedido, Estoque baixo, Divergência de estoque, NF-e rejeitada, Resumo diário (RN031). |
| Ator | Lojista |
| Situação atual | [VISUAL]. |

### RF036 — Gerenciar equipe e segurança
| Item | Descrição |
|---|---|
| Descrição | Lista de usuários ("4 de 10") com nome, e-mail, papel (Administradora, Operação, Financeiro, Expedição) e status (Ativo, Convite pendente); botão "＋ Convidar usuário". Segurança: "Verificação em duas etapas — obrigatória para todos os usuários" e "Encerrar sessões inativas — após 8 horas sem uso". |
| Ator | Lojista (administrador) |
| Processamento esperado | Convidar usuário (forma de envio do convite: Pendente de definição); respeitar o limite de usuários do plano (regra exibida visualmente — ver regras-de-negocio.md). |
| Situação atual | [VISUAL]. Fora do escopo do MVP descrito no resumo — Pendente de definição. |

### RF037 — Visualizar plano e uso
| Item | Descrição |
|---|---|
| Descrição | Plano Pro (R$ 249/mês, renovação mensal), uso do ciclo (Pedidos no mês, Produtos, Marketplaces, Usuários, NF-e emitidas), forma de pagamento (Pix automático) e faturas; botões Comparar planos, Fazer upgrade, Alterar, Ver faturas. |
| Ator | Lojista |
| Situação atual | [VISUAL]. Fora do escopo do MVP — Pendente de definição. |

---

## Assistente de IA, voz e Telegram

### RF038 — Conversar com o assistente de IA por texto
| Item | Descrição |
|---|---|
| Descrição | Painel "Assistente Taylor" aberto pelo botão "Assistente IA" da sidebar, pelo botão flutuante (ícone do Telegram) ou pela Ajuda. Mensagem inicial "Olá! Como posso ajudar na sua operação?", ações rápidas (Consultar estoque, Vendas de hoje, Pedidos pendentes, Estoque baixo), campo de texto e link "Abrir no Telegram". |
| Ator | Lojista; Gemini |
| Entrada | Texto livre ou ação rápida |
| Processamento esperado | Fluxograma: o Gemini processa a mensagem e **identifica a intenção** → o back-end consulta estoque, vendas e cadastro e **executa a ação** → **gera a resposta** com os dados da empresa. |
| Saída | Resposta em texto. |
| Erros/exceções | Mensagem vazia não é enviada (RN033); intenção não reconhecida → resposta padrão (RN033); Gemini indisponível. |
| Situação atual | [SIMULADO] — 4 respostas fixas + resposta padrão "Ainda estou aprendendo a responder isso. Conecte o backend para ver dados reais da sua operação.". Quais ações o assistente pode **executar** (além de consultar): Pendente de definição. |

### RF039 — Interagir com o assistente por voz
| Item | Descrição |
|---|---|
| Descrição | Resumo do projeto: o usuário fala a solicitação, recebe a resposta em texto e a ouve em áudio. |
| Ator | Lojista; Gemini |
| Entrada | Áudio do usuário |
| Processamento esperado | Converter fala em texto → mesmo fluxo de RF038 → exibir texto e reproduzir áudio. Onde ocorre a conversão (navegador ou back-end) e qual tecnologia: Pendente de definição. |
| Saída | Texto + áudio. |
| Situação atual | [PLANEJADO] — não há botão de microfone no front. |

### RF040 — Consultar a operação e receber alertas pelo Telegram
| Item | Descrição |
|---|---|
| Descrição | Bot `taylor_assistente_bot`: responde perguntas como "vendas de hoje" ou "estoque baixo" com os mesmos dados do painel (FAQ) e envia alertas de estoque, novos pedidos e NF-e rejeitadas (card do Telegram). |
| Ator | Lojista; Telegram; Gemini |
| Entrada | Mensagem enviada ao bot |
| Processamento esperado | Fluxograma: Telegram recebe a mensagem do lojista → Gemini identifica a intenção → back-end consulta/executa → resposta enviada via Telegram. Alertas conforme RN031. Forma de vincular a conta do Telegram ao usuário: Pendente de definição. |
| Saída | Resposta ou alerta no Telegram. |
| Situação atual | [PLANEJADO] — existem somente links para `https://t.me/taylor_assistente_bot`. |

---

## Ajuda e busca

### RF041 — Consultar central de ajuda
| Item | Descrição |
|---|---|
| Descrição | Busca textual nas perguntas frequentes (ignora acentos e maiúsculas), filtro por tópico (Primeiros passos, Estoque, NF-e, Telegram — clicar de novo remove o filtro), contatos (Assistente IA, Suporte no Telegram seg. a sex. 8h–20h, e-mail `suporte@taylor.com.br` com resposta em até 24h) e "Status dos serviços" (Mercado Livre, Shopee, Magalu, SEFAZ (NF-e), Bot do Telegram). |
| Ator | Lojista |
| Saída | Perguntas filtradas; sem resultado → "Nada encontrado". |
| Situação atual | [REAL] busca e filtros locais; conteúdo do FAQ e status [SIMULADO]. Se FAQ e status vêm do back-end: Pendente de definição. |

### RF042 — Busca global
| Item | Descrição |
|---|---|
| Descrição | Campo "Buscar produtos, pedidos, SKU..." na barra superior. |
| Ator | Lojista |
| Entrada | Termo de busca |
| Processamento / Saída | Pendente de definição (não há tela de resultados). |
| Situação atual | [VISUAL]. |
