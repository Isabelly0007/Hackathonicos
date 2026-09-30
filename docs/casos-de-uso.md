# Casos de uso

Especificação textual no padrão UML. O diagrama está em [diagramas/casos-de-uso.md](diagramas/casos-de-uso.md).

## Atores

| Ator | Tipo | Descrição |
|---|---|---|
| Visitante | Primário | Pessoa não autenticada |
| Lojista | Primário | Usuário autenticado de uma empresa (administrador ou membro da equipe; permissões por papel: Pendente de definição) |
| Sistema (agendador) | Secundário interno | Rotinas automáticas do back-end (conferência periódica, resumo diário) |
| Marketplace | Secundário externo | Mercado Livre, Shopee, Magalu — **simulados no MVP** |
| Gemini | Secundário externo | IA que identifica a intenção — **planejado** |
| Telegram | Secundário externo | Bot de consultas e alertas — **planejado** |
| SEFAZ | Secundário externo | Autorização de NF-e — **simulada** |

## Índice

| UC | Nome | Ator principal | Requisitos | Classificação |
|---|---|---|---|---|
| UC01 | Autenticar-se | Visitante | RF001 | [SIMULADO] |
| UC02 | Criar conta e empresa | Visitante | RF002 | [SIMULADO] |
| UC03 | Encerrar sessão | Lojista | RF003 | [REAL] (local) |
| UC04 | Acompanhar dashboard | Lojista | RF005–RF009 | [SIMULADO] |
| UC05 | Gerenciar produtos | Lojista | RF010, RF011 | [SIMULADO] / [VISUAL] |
| UC06 | Acompanhar pedidos | Lojista | RF012–RF014 | [SIMULADO] / [VISUAL] |
| UC07 | Sincronizar estoque | Lojista, Sistema | RF009, RF016, RF018 | [SIMULADO] |
| UC08 | Revisar divergências de estoque | Lojista | RF017 | [SIMULADO] / [VISUAL] |
| UC09 | Emitir NF-e | Lojista | RF019–RF022 | [SIMULADO] |
| UC10 | Tratar NF-e rejeitada | Lojista | RF023 | [SIMULADO] |
| UC11 | Conectar marketplace | Lojista | RF026 | [SIMULADO] / [PLANEJADO] |
| UC12 | Gerenciar marketplaces e integrações | Lojista | RF025, RF027, RF028 | [SIMULADO] / [VISUAL] |
| UC13 | Consultar relatórios | Lojista | RF029 | [SIMULADO] |
| UC14 | Gerenciar notificações | Lojista | RF030, RF031 | [REAL] (local) / [SIMULADO] |
| UC15 | Configurar empresa e preferências | Lojista | RF032–RF035 | [VISUAL] |
| UC16 | Gerenciar equipe | Lojista | RF036 | [VISUAL] |
| UC17 | Consultar assistente de IA por texto | Lojista | RF038 | [SIMULADO] |
| UC18 | Consultar assistente por voz | Lojista | RF039 | [PLANEJADO] |
| UC19 | Consultar operação pelo Telegram | Lojista | RF040 | [PLANEJADO] |
| UC20 | Receber alertas da operação | Lojista, Sistema | RF030, RF035, RF040 | [PLANEJADO] |
| UC21 | Consultar central de ajuda | Lojista | RF041 | [REAL] (local) / [SIMULADO] |

---

### UC01 — Autenticar-se
| Campo | Descrição |
|---|---|
| Ator | Visitante |
| Objetivo | Acessar o painel do Taylor |
| Pré-condições | Conta existente |
| Fluxo principal | 1. Visitante abre o Taylor (aba "Entrar" selecionada). 2. Informa e-mail e senha. 3. Clica em "Entrar na plataforma". 4. Sistema valida o preenchimento (RN001). 5. Sistema autentica e cria a sessão. 6. Sistema exibe a tela **Início**. |
| Fluxos alternativos | **A1 — campos vazios** (passo 4): exibe "Preencha seu e-mail e sua senha." e permanece na tela. **A2 — credenciais inválidas** (passo 5): exibe erro (texto Pendente de definição). **A3 — "Esqueci minha senha"**: Pendente de definição. **A4 — trocar para "Criar conta"**: segue UC02. |
| Pós-condições | Sessão ativa; empresa ativa definida. |

### UC02 — Criar conta e empresa
| Campo | Descrição |
|---|---|
| Ator | Visitante |
| Objetivo | Cadastrar-se e cadastrar a empresa (CNPJ) |
| Pré-condições | E-mail e CNPJ ainda não cadastrados |
| Fluxo principal | 1. Visitante seleciona "Criar conta". 2. Informa nome, empresa, e-mail, senha e CNPJ. 3. Clica em "Criar minha operação". 4. Sistema valida os dados (RN002). 5. Sistema cria usuário, empresa, vínculo (administrador) e preferências padrão. 6. Sistema inicia a sessão e exibe **Início**. |
| Fluxos alternativos | **A1 — campos inválidos**: mensagens por campo. **A2 — e-mail ou CNPJ já cadastrado**: erro 409. |
| Pós-condições | Empresa pronta para conectar o primeiro canal (UC11). |

### UC03 — Encerrar sessão
| Campo | Descrição |
|---|---|
| Ator | Lojista |
| Objetivo | Sair do sistema |
| Pré-condições | Sessão ativa |
| Fluxo principal | 1. Lojista clica no bloco da empresa ("Plano Pro · Sair") na sidebar. 2. Sistema invalida a sessão. 3. Exibe a tela de login. |
| Fluxos alternativos | Nenhum. |
| Pós-condições | Sessão encerrada. |

### UC04 — Acompanhar dashboard
| Campo | Descrição |
|---|---|
| Ator | Lojista |
| Objetivo | Ter a visão geral da operação em todos os canais |
| Pré-condições | Sessão ativa |
| Fluxo principal | 1. Lojista acessa **Início**. 2. Sistema carrega em paralelo: indicadores (período "Hoje"), vendas por canal ("Últimos 7 dias"), pedidos por status, alertas de estoque e canais conectados. 3. Lojista analisa os dados. |
| Fluxos alternativos | **A1 — trocar período dos indicadores** (Hoje/7 dias/30 dias): recarrega só os indicadores. **A2 — trocar período do gráfico**: recarrega só o gráfico. **A3 — "Sincronizar agora"**: executa UC07. **A4 — API indisponível**: o front exibe os dados de exemplo. |
| Pós-condições | Nenhuma alteração de dados. |

### UC05 — Gerenciar produtos
| Campo | Descrição |
|---|---|
| Ator | Lojista |
| Objetivo | Consultar e manter o catálogo central |
| Pré-condições | Sessão ativa |
| Fluxo principal | 1. Lojista acessa **Produtos**. 2. Sistema lista produtos com SKU, estoque, preço, status (RN011), canais e atualização, e os contadores por status. 3. Lojista filtra por aba (Todos, Ativos, Estoque baixo, Sem estoque). |
| Fluxos alternativos | **A1 — Novo produto**: lojista informa nome, SKU, preço, estoque e estoque mínimo (RN010); sistema valida e cria (SKU duplicado → erro). Formulário: Pendente de definição. **A2 — Editar/excluir (menu "•••")**: Pendente de definição. **A3 — Filtros avançados**: Pendente de definição. |
| Pós-condições | Catálogo atualizado (A1). |

### UC06 — Acompanhar pedidos
| Campo | Descrição |
|---|---|
| Ator | Lojista |
| Objetivo | Acompanhar pedidos de todos os marketplaces em um só lugar |
| Pré-condições | Sessão ativa; ao menos um canal conectado |
| Fluxo principal | 1. Lojista acessa **Pedidos**. 2. Sistema exibe indicadores (pedidos hoje, vendas hoje, ticket médio — RN005, pendentes — RN006) e a lista consolidada. 3. Lojista filtra por status. |
| Fluxos alternativos | **A1 — Sincronizar pedidos**: sistema importa pedidos novos (simulado), baixa estoque (RN013) e gera notificação. **A2 — Exportar**: Pendente de definição. **A3 — Pedido cancelado no canal**: sistema estorna o estoque (RN017) e notifica. |
| Pós-condições | Pedidos atualizados (A1/A3). |

### UC07 — Sincronizar estoque
| Campo | Descrição |
|---|---|
| Ator | Lojista; Sistema |
| Objetivo | Manter o estoque publicado em cada canal igual ao estoque central |
| Pré-condições | Canais conectados |
| Fluxo principal | 1. Lojista clica em "Sincronizar agora" (Início) ou "↻ Sincronizar estoque" (Estoque). 2. Sistema registra a sincronização (em andamento). 3. Para cada anúncio, envia o estoque central ao canal (simulado). 4. Sistema detecta divergências remanescentes (RN015). 5. Sistema atualiza a última sincronização e gera a notificação "Sincronização concluída". |
| Fluxos alternativos | **A1 — Gatilho automático**: venda registrada (RN013) ou intervalo de conferência (RN022). **A2 — Produto zerado**: pausa anúncios (RN016) e notifica. **A3 — Sincronização em andamento**: novo pedido de sincronização é recusado. **A4 — Falha em um canal**: Pendente de definição. |
| Pós-condições | Estoques publicados atualizados; registro de sincronização gravado. |

### UC08 — Revisar divergências de estoque
| Campo | Descrição |
|---|---|
| Ator | Lojista |
| Objetivo | Resolver diferenças entre canal e estoque central |
| Pré-condições | Existe ao menos um produto com "Divergência detectada" |
| Fluxo principal | 1. Lojista vê a faixa "N divergências precisam da sua atenção" em **Estoque**. 2. Clica em "Revisar divergências". 3. Sistema lista os produtos com a quantidade central e a de cada canal. 4. Lojista escolhe o valor que prevalece. 5. Sistema atualiza o estoque central (se aplicável) e sincroniza os canais. |
| Fluxos alternativos | **A1 — Acesso pela notificação** "Divergência na Mochila Urban". **A2 — Divergência já resolvida**: sistema informa (409). |
| Pós-condições | Produto com status "Sincronizado". |

### UC09 — Emitir NF-e (simulado)
| Campo | Descrição |
|---|---|
| Ator | Lojista (SEFAZ simulada) |
| Objetivo | Faturar pedidos |
| Pré-condições | Pedidos prontos para faturar; dados da empresa preenchidos (RN004) |
| Fluxo principal | 1. Lojista acessa **Notas fiscais** e vê "N pedidos prontos para faturar". 2. Clica em "Emitir N NF-e em lote" (ou "＋ Emitir nota fiscal" para um pedido). 3. Sistema valida os dados fiscais (RN026). 4. Sistema envia à SEFAZ simulada; status "Processando". 5. SEFAZ simulada autoriza; status "Autorizada"; XML devolvido ao pedido e ao canal (RN028). |
| Fluxos alternativos | **A1 — Validação falha**: nota não é enviada; pendências exibidas ("rejeição evitada"). **A2 — SEFAZ rejeita**: status "Rejeitada" com motivo; notificação Fiscal; segue UC10. **A3 — "Revisar pedidos"**: Pendente de definição. |
| Pós-condições | Notas autorizadas ou rejeitadas; indicadores atualizados. |

### UC10 — Tratar NF-e rejeitada
| Campo | Descrição |
|---|---|
| Ator | Lojista |
| Objetivo | Corrigir e reenviar nota rejeitada |
| Pré-condições | Nota com status "Rejeitada" |
| Fluxo principal | 1. Lojista abre a nota (aba "Rejeitadas" ou notificação "Revisar nota"). 2. Sistema exibe o motivo da SEFAZ (RN027). 3. Lojista corrige o dado (produto ou destinatário). 4. Lojista reenvia. 5. Sistema executa os passos 3–5 do UC09. |
| Fluxos alternativos | **A1 — Nova rejeição**: volta ao passo 2. |
| Pós-condições | Nota autorizada ou novamente rejeitada. |

### UC11 — Conectar marketplace
| Campo | Descrição |
|---|---|
| Ator | Lojista; Marketplace |
| Objetivo | Integrar um canal de venda ao Taylor |
| Pré-condições | Sessão ativa; canal ainda não conectado |
| Fluxo principal (MVP simulado) | 1. Lojista acessa **Marketplaces** e clica em "＋ Conectar canal". 2. Escolhe o canal (Mercado Livre, Shopee ou Magalu). 3. Sistema cria a integração simulada como "Conectado". 4. Sistema importa produtos, pedidos e estoque simulados. 5. Canal aparece no dashboard, em Marketplaces e em Integrações. |
| Fluxos alternativos | **A1 — OAuth real [PLANEJADO]** (fluxograma): no passo 3, sistema solicita autorização → marketplace autoriza via OAuth → sistema recebe o `access_token` e salva a integração → consulta produtos, pedidos e estoque via API. **A2 — Autorização negada**: integração não é criada. **A3 — Canal já conectado**: erro 409. |
| Pós-condições | Integração ativa e dados centralizados. |

### UC12 — Gerenciar marketplaces e integrações
| Campo | Descrição |
|---|---|
| Ator | Lojista |
| Objetivo | Acompanhar e manter as conexões |
| Pré-condições | Integração existente |
| Fluxo principal | 1. Lojista acessa **Marketplaces** (métricas por canal) ou **Integrações** (conta vinculada e última sincronização). 2. Escolhe uma ação: Sincronizar, Reconectar ou Desconectar. 3. Sistema executa e atualiza a tela. |
| Fluxos alternativos | **A1 — Gerenciar / Configurar**: Pendente de definição. **A2 — Desconectar**: integração fica "desconectado"; efeito sobre dados importados Pendente de definição. |
| Pós-condições | Integração sincronizada, reconectada ou desconectada. |

### UC13 — Consultar relatórios
| Campo | Descrição |
|---|---|
| Ator | Lojista |
| Objetivo | Analisar o desempenho de vendas |
| Pré-condições | Sessão ativa |
| Fluxo principal | 1. Lojista acessa **Relatórios**. 2. Seleciona o período (7 dias, 30 dias, 3 meses, Personalizado). 3. Sistema exibe vendas totais, pedidos, ticket médio, produtos vendidos, evolução das vendas, participação por marketplace e produtos mais vendidos. |
| Fluxos alternativos | **A1 — Personalizado**: seleção de datas Pendente de definição. |
| Pós-condições | Nenhuma alteração de dados. |

### UC14 — Gerenciar notificações
| Campo | Descrição |
|---|---|
| Ator | Lojista |
| Objetivo | Tratar o que precisa de atenção |
| Pré-condições | Sessão ativa |
| Fluxo principal | 1. Lojista clica no sino ou em "Notificações" (contador de não lidas). 2. Sistema lista as notificações e indicadores. 3. Lojista filtra (Todas, Não lidas, Pedidos, Estoque, Fiscal, Integrações). 4. Clica em uma notificação; ela é marcada como lida (RN030). |
| Fluxos alternativos | **A1 — Botão de ação** ("Ver estoque", "Ver pedido", "Revisar nota"): marca como lida e navega para a tela. **A2 — "Marcar todas como lidas"**: zera o contador e exibe confirmação. **A3 — Filtro sem itens**: "Tudo em dia!". **A4 — "Preferências"**: abre UC15 na aba Notificações. **A5 — Alterar "Onde receber alertas"**: salva canais (RF031). |
| Pós-condições | Notificações marcadas como lidas. |

### UC15 — Configurar empresa e preferências
| Campo | Descrição |
|---|---|
| Ator | Lojista |
| Objetivo | Manter dados fiscais da empresa e o comportamento do sistema |
| Pré-condições | Sessão ativa |
| Fluxo principal | 1. Lojista acessa **Configurações**. 2. Escolhe a aba (Empresa, Preferências, Notificações). 3. Altera campos ou chaves. 4. Clica em "Salvar alterações". 5. Sistema valida, grava e exibe "Alterações salvas com sucesso". |
| Fluxos alternativos | **A1 — Tema claro**: aplicado imediatamente (hoje só local). **A2 — Cancelar**: descarta alterações (hoje sem ação). **A3 — Substituir certificado / Alterar logo**: Pendente de definição. **A4 — Dados inválidos**: mensagens por campo. |
| Pós-condições | Configurações gravadas e aplicadas às rotinas (sincronização, alertas, NF-e). |

### UC16 — Gerenciar equipe
| Campo | Descrição |
|---|---|
| Ator | Lojista (administrador) |
| Objetivo | Dar acesso a outras pessoas da empresa |
| Pré-condições | Limite de usuários do plano não atingido |
| Fluxo principal | 1. Lojista acessa **Configurações › Equipe**. 2. Clica em "＋ Convidar usuário". 3. Informa e-mail e papel. 4. Sistema cria o vínculo com status "Convite pendente". |
| Fluxos alternativos | **A1 — Limite atingido**: bloqueio. **A2 — Segurança** (2 etapas, sessões inativas): Pendente de definição. |
| Pós-condições | Convite registrado. **Escopo no MVP: Pendente de definição.** |

### UC17 — Consultar assistente de IA por texto
| Campo | Descrição |
|---|---|
| Ator | Lojista; Gemini |
| Objetivo | Obter informações da operação em linguagem natural |
| Pré-condições | Sessão ativa |
| Fluxo principal | 1. Lojista abre o assistente (botão "Assistente IA", botão flutuante ou Ajuda). 2. Digita a pergunta ou escolhe uma ação rápida. 3. Sistema envia a mensagem ao Gemini, que identifica a intenção. 4. Sistema consulta os dados (estoque, vendas, pedidos) ou executa a ação. 5. Sistema gera a resposta e a exibe no chat. |
| Fluxos alternativos | **A1 — Mensagem vazia**: nada é enviado. **A2 — Intenção não reconhecida**: resposta padrão. **A3 — Gemini indisponível**: resposta padrão. **A4 — "Abrir no Telegram"**: segue UC19. |
| Pós-condições | Nenhuma alteração de dados (salvo ações de escrita — Pendente de definição). |

### UC18 — Consultar assistente por voz [PLANEJADO]
| Campo | Descrição |
|---|---|
| Ator | Lojista; Gemini |
| Objetivo | Interagir com o assistente falando |
| Pré-condições | Navegador com microfone permitido |
| Fluxo principal | 1. Lojista ativa a entrada por voz (controle ainda inexistente). 2. Fala a solicitação. 3. Sistema converte a fala em texto. 4. Executa os passos 3–5 do UC17. 5. Sistema exibe a resposta em texto e a reproduz em áudio. |
| Fluxos alternativos | **A1 — Fala não reconhecida**: pede para repetir (Pendente de definição). **A2 — Microfone negado**: mantém apenas texto. |
| Pós-condições | Resposta exibida e falada. |

### UC19 — Consultar operação pelo Telegram [PLANEJADO]
| Campo | Descrição |
|---|---|
| Ator | Lojista; Telegram; Gemini |
| Objetivo | Consultar a operação sem abrir o Taylor |
| Pré-condições | Conta do Telegram vinculada ao usuário: comando `/login` no bot com o e-mail e a senha do painel |
| Fluxo principal | 1. Lojista envia mensagem ao bot. 2. Telegram entrega a mensagem ao back-end (webhook). 3. Sistema identifica o usuário/empresa pelo chat. 4. Executa os passos 3–5 do UC17. 5. Sistema envia a resposta via Telegram. |
| Como ficou implementado | O bot `@EstoqueLojas_bot` (`bot_estoque/`) recebe as mensagens por **long polling** (não há webhook) e responde a comandos (`/estoque`, `/lojas`, `/estoqueloja`, `/entrada`, `/baixa`, `/novo`) consultando direto as tabelas do schema `taylor`. As perguntas em linguagem natural com o Gemini ficam no assistente do painel (UC17). |
| Fluxos alternativos | **A1 — Chat não vinculado**: bot orienta o vínculo. **A2 — Intenção não reconhecida**: resposta padrão. |
| Pós-condições | Resposta entregue no Telegram. |

### UC20 — Receber alertas da operação
| Campo | Descrição |
|---|---|
| Ator | Sistema; Lojista (receptor) |
| Objetivo | Avisar o lojista sobre eventos importantes |
| Pré-condições | Evento ocorrido; preferências configuradas |
| Fluxo principal | 1. Ocorre um evento (novo pedido, estoque baixo, divergência, NF-e rejeitada) ou chega o horário do resumo diário (08h). 2. Sistema cria a notificação no Taylor. 3. Sistema consulta a matriz Evento × Canal (RN031) e os canais habilitados. 4. Envia pelo Telegram, e-mail e/ou push. |
| Fluxos alternativos | **A1 — Canal desativado**: não envia por ele. **A2 — Falha de envio**: Pendente de definição. |
| Pós-condições | Notificação registrada e enviada. |

### UC21 — Consultar central de ajuda
| Campo | Descrição |
|---|---|
| Ator | Lojista |
| Objetivo | Tirar dúvidas de uso |
| Pré-condições | Sessão ativa |
| Fluxo principal | 1. Lojista acessa **Ajuda**. 2. Digita na busca ou escolhe um tópico. 3. Sistema filtra as perguntas frequentes (sem diferenciar acentos/maiúsculas). 4. Lojista expande a pergunta desejada. |
| Fluxos alternativos | **A1 — Nada encontrado**: mensagem sugerindo o assistente. **A2 — Contato**: abre o assistente (UC17), o Telegram ou o e-mail de suporte. **A3 — Clicar no tópico ativo**: remove o filtro. |
| Pós-condições | Nenhuma alteração de dados. |
