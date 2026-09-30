# Regras de negócio

Somente regras comprovadas pelas fontes do projeto. Cada regra informa a **fonte** e a **classificação**. Abreviações das fontes:

- **JS** — `javascript.js` (telas, dados de exemplo, textos exibidos, FAQ da Ajuda);
- **FLX** — fluxograma do MVP ([diagramas/fluxograma-mvp.png](diagramas/fluxograma-mvp.png));
- **DOC** — `Taylor_Resumo_Projeto.docx`.

> Os dados de exemplo do front-end são **inconsistentes entre telas** (ex.: "Mochila Urban" tem 5 unidades em Produtos, 12 em Estoque e 4 nos alertas do dashboard). O back-end deve calcular todas as telas a partir de **uma única fonte de dados**; os números do mock não devem ser usados como regra.

## Acesso e empresa

| Código | Regra | Fonte | Classificação |
|---|---|---|---|
| RN001 | O login só pode ser submetido com **e-mail e senha preenchidos**. Caso contrário, exibir "Preencha seu e-mail e sua senha." | JS (`submit` do `login-form`) | [REAL] (validação no front) |
| RN002 | O cadastro de conta exige os dados do usuário e da empresa: **nome, nome da empresa, e-mail, senha e CNPJ**. Obrigatoriedade individual de cada campo e validação do CNPJ: Pendente de definição. | JS (aba "Criar conta"); FLX ("Informa CNPJ e dados da empresa") | [SIMULADO] |
| RN003 | Um usuário pode operar **mais de um CNPJ** e alternar entre eles pelo menu da empresa; no Plano Pro o limite é **3 CNPJs**. | JS (FAQ "Posso gerenciar mais de um CNPJ?"; login: "Todos os CNPJs em uma visão") | [VISUAL] — Pendente de definição se entra no MVP |
| RN004 | Os dados cadastrais da empresa (razão social, CNPJ, IE, regime tributário, endereço etc.) são **usados na emissão de NF-e**. | JS (Configurações › Empresa: "Usados na emissão de NF-e") | [SIMULADO] |

## Dashboard, vendas e pedidos

| Código | Regra | Fonte | Classificação |
|---|---|---|---|
| RN005 | **Ticket médio = valor total vendido ÷ quantidade de pedidos** no período. Conferido: R$ 7.320,50 ÷ 48 ≈ R$ 152,50 (Pedidos); R$ 38.420 ÷ 284 ≈ R$ 135,28 (Relatórios). | JS | [SIMULADO] |
| RN006 | **Pedidos pendentes = pedidos "Aguardando" + pedidos "Em separação"**. Conferido: 12 + 18 = 30 (chat, indicador de Pedidos e gráfico de status). | JS (`chatAnswers`, `orderStatuses`) | [SIMULADO] |
| RN007 | Status possíveis de pedido: **Aguardando, Em separação, Em transporte, Entregue, Cancelado**. Transições permitidas e status inicial: Pendente de definição (ver RN030). | JS (`orderStatuses`, abas de Pedidos, `style.css`) | [SIMULADO] |
| RN008 | Os períodos do dashboard são **Hoje, 7 dias e 30 dias**; os indicadores de Vendas e Pedidos mostram a **variação percentual em relação ao período anterior** de mesma duração. Relatórios usam **7 dias, 30 dias, 3 meses e Personalizado**. | JS (`periods`, legenda "vs. período anterior", Relatórios) | [SIMULADO] |
| RN009 | Cada pedido pertence a **um único canal de venda** (marketplace) e possui cliente, data, quantidade de itens, valor e status. | JS (tabela de Pedidos); FLX ("pedidos … via API") | [SIMULADO] |

## Produtos e estoque

| Código | Regra | Fonte | Classificação |
|---|---|---|---|
| RN010 | Todo produto tem **nome, SKU, preço, estoque atual e estoque mínimo**. | DOC ("Gestão de produtos, preços, SKU, estoque atual e estoque mínimo"); JS (tabelas) | [SIMULADO] |
| RN011 | Status do produto (tela Produtos): **Ativo**, **Estoque baixo** ou **Sem estoque**. Produto com estoque **igual a 0** tem status **Sem estoque**. | JS (`products`, abas de Produtos) | [SIMULADO] |
| RN012 | Produto em **estoque baixo / crítico** é aquele cujo estoque central atingiu o **estoque mínimo**. Se a comparação é "menor que" (legenda "produtos abaixo do mínimo") ou "menor ou igual" (evento "Quando um produto atingir o estoque mínimo"): **Pendente de definição**. | JS | [SIMULADO] |
| RN013 | O **estoque central** é a referência da operação. A cada venda, o estoque central é atualizado e a nova quantidade é **enviada para todos os canais**, quando a opção "Sincronizar estoque automaticamente" está ativa. | JS (FAQ "O estoque é sincronizado automaticamente?"; Preferências) | [SIMULADO] |
| RN014 | Status de estoque (tela Estoque): **Sincronizado, Divergência detectada, Estoque baixo, Sem estoque**. Prioridade entre status quando mais de uma condição ocorre (ex.: divergência + estoque baixo): Pendente de definição. | JS (`stock`, `style.css`) | [SIMULADO] |
| RN015 | Há **divergência de estoque** quando a quantidade publicada em algum canal é **diferente** do estoque central. Na revisão, o **lojista escolhe qual valor deve prevalecer** e o sistema sincroniza os canais. | JS (FAQ "O que significa Divergência detectada?"; notificação "Divergência na Mochila Urban") | [SIMULADO] |
| RN016 | Quando um produto fica **sem estoque**, seus anúncios são **pausados automaticamente em todos os canais**, se a opção "Pausar anúncios sem estoque" estiver ativa. | JS (notificação "Garrafa Térmica sem estoque"; Preferências) | [SIMULADO] |
| RN017 | Quando um pedido é **cancelado**, o **estoque é devolvido** (estornado ao estoque central). | JS (notificação "Pedido #200010 cancelado … O estoque foi devolvido.") | [SIMULADO] |
| RN018 | O estoque é exibido **por canal**: Mercado Livre, Shopee e Magalu, ao lado do estoque central e do mínimo. | JS (tabela de Estoque) | [SIMULADO] |

## Marketplaces e sincronização

| Código | Regra | Fonte | Classificação |
|---|---|---|---|
| RN019 | No MVP, as integrações com **Mercado Livre, Shopee e Magalu são simuladas**, sem depender das APIs reais. | DOC ("Nossa solução") | [SIMULADO] |
| RN020 | A conexão de um marketplace ocorre por **autorização OAuth** com a conta de vendedor; o back-end **recebe o `access_token` e salva a integração**; em seguida importa produtos, pedidos e estoque. | FLX; JS (FAQ "Como conecto meu primeiro marketplace?") | [PLANEJADO] (no MVP: [SIMULADO]) |
| RN021 | Com "Importar pedidos automaticamente" ativo, **novos pedidos entram direto na fila de separação**. | JS (Preferências) | [VISUAL] |
| RN022 | O **intervalo de conferência** com os marketplaces pode ser: **5 min, 15 min, 30 min ou 1 hora**. | JS (Preferências) | [VISUAL] |
| RN023 | Toda sincronização registra a **data/hora da última sincronização** por canal, exibida no dashboard, em Marketplaces e em Integrações. | JS | [SIMULADO] |

## Fiscal (simulado)

| Código | Regra | Fonte | Classificação |
|---|---|---|---|
| RN024 | A emissão de NF-e e documentos fiscais é **simulada** no MVP (não há comunicação real com a SEFAZ). | DOC ("Simulação do fluxo de emissão de NF-e") | [SIMULADO] |
| RN025 | Toda NF-e está **vinculada a um pedido**. Status: **Aguardando emissão** (nota em rascunho, sem número), **Processando**, **Autorizada**, **Rejeitada**. | JS (`invoices`, abas, `style.css`) | [SIMULADO] |
| RN026 | Antes do envio, a NF-e passa por **validação fiscal**: cadastro do destinatário (**CPF/CNPJ e endereço**), **NCM**, **CFOP sugerido conforme a UF de destino**, dados do cliente. A tela cita "23 regras"; a lista completa é Pendente de definição. | JS (Guardião de rejeições; FAQ "Como emito notas fiscais em lote?") | [SIMULADO] |
| RN027 | NF-e **rejeitada** exibe o **motivo informado pela SEFAZ**; o lojista corrige o dado indicado (produto ou destinatário) e **reenvia**. | JS (FAQ; notificação "NF-e 004817 rejeitada") | [SIMULADO] |
| RN028 | NF-e **autorizada** tem o **XML devolvido ao pedido e ao marketplace** (conciliação automática). | JS (Guardião de rejeições; fluxo "XML enviado ao canal") | [SIMULADO] |
| RN029 | Pedidos **prontos para faturar** podem ser emitidos **em lote**. | JS ("Emitir 18 NF-e em lote"; FAQ) | [SIMULADO] |

## Notificações

| Código | Regra | Fonte | Classificação |
|---|---|---|---|
| RN030 | Tipos de notificação: **Pedidos, Estoque, Fiscal, Integrações**. Toda notificação nasce **não lida**; torna-se lida quando o usuário **clica nela** ou no seu botão de ação; "Marcar todas como lidas" marca todas. O contador de não lidas aparece na sidebar e no sino. | JS (`notifications`, `markRead`, `read-all`) | [REAL] (local) |
| RN031 | Eventos notificáveis e canais (**Telegram, E-mail, Push**) configuráveis **por evento**. Padrões exibidos: Novo pedido (Telegram, E-mail); Estoque baixo (os 3); Divergência de estoque (Telegram, E-mail); NF-e rejeitada (os 3); Resumo diário (Telegram). | JS (`notifEvents`) | [VISUAL] |
| RN032 | O **resumo diário** traz vendas e pendências do **dia anterior** e é enviado **às 08h**. | JS (`notifEvents`, "Onde receber alertas") | [VISUAL] |

## Assistente de IA, voz e Telegram

| Código | Regra | Fonte | Classificação |
|---|---|---|---|
| RN033 | O assistente recebe perguntas em **linguagem natural**; a IA (Gemini) **identifica a intenção**; o back-end consulta os dados/executa a ação e **gera a resposta** com os mesmos dados do painel. Mensagem vazia não é enviada. Se a pergunta não for compreendida, responde com mensagem padrão. Na interação por **voz**, a resposta é exibida em **texto e reproduzida em áudio**. As mesmas consultas estão disponíveis pelo **Telegram**. | FLX; DOC; JS (`answerChat`, FAQ Telegram) | Texto [SIMULADO]; Gemini, voz e Telegram [PLANEJADO] |

## Regras exibidas apenas visualmente (fora do escopo do MVP no resumo do projeto)

Registradas para referência. A implementação é **Pendente de definição**.

| Referência | Regra exibida | Fonte |
|---|---|---|
| Plano Pro | R$ 249/mês; limites por ciclo: 5.000 pedidos, 2.000 produtos, 5 marketplaces, 10 usuários, 3.000 NF-e | JS (Configurações › Plano) |
| Equipe | Papéis: Administradora, Operação, Financeiro, Expedição; status: Ativo, Convite pendente; limite de usuários do plano | JS (Configurações › Equipe) |
| Segurança | Verificação em duas etapas obrigatória; encerrar sessões inativas após 8 horas | JS (Configurações › Equipe) |
| Certificado | Certificado digital A1 com data de validade | JS (Configurações › Empresa; Saúde fiscal) |
