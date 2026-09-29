# Pendências e divergências

Itens marcados como **Pendente de definição** ao longo da documentação. Devem ser decididos pela equipe antes (ou durante) a implementação do back-end.

## 1. Divergências entre as fontes

| # | Divergência | Fontes | Tratamento adotado na documentação |
|---|---|---|---|
| D1 | **DER não fornecido.** A tarefa cita um DER como referência principal, mas ele não está no repositório nem nos anexos. | Tarefa × repositório | Modelo de dados proposto a partir do front, fluxograma e resumo — **validar** |
| D2 | Tecnologia do front-end: resumo cita **React + Vite**; o repositório tem **HTML + CSS + JavaScript puro**. | Resumo × código | Documentado o front real (HTML/JS) |
| D3 | Fluxograma: usuário "Envia mensagem no **WhatsApp**", mas a seta vai para a raia **Telegram**; todas as outras fontes citam só Telegram. | Fluxograma × resumo/front | Considerado Telegram |
| D4 | Conexão com marketplaces: fluxograma mostra **OAuth real** e consulta "via API"; resumo diz que no MVP as integrações são **simuladas**. | Fluxograma × resumo | MVP simulado; OAuth como planejado |
| D5 | Nome do bot: `CONFIG.telegram` = `taylor_assistente_bot`; telas mostram `@lojabeta_bot`. | Código × telas | Registrado; nome final pendente |
| D6 | Dados de exemplo inconsistentes entre telas (ex.: Mochila Urban com 5, 12 e 4 unidades; "Estoque baixo (10)" em Produtos × 8 no dashboard; "Sem estoque (4)" × "1 sem estoque" no chat). | Código | Back-end deve calcular tudo de uma fonte única; números do mock não são regra |
| D7 | Botão flutuante tem `aria-label` "Abrir assistente no Telegram" e ícone do Telegram, mas abre o **chat interno**. | Código | Documentado como abertura do assistente interno |
| D8 | Tela Produtos mostra "Mochila Urban" como **Estoque baixo** (5 un.), enquanto Estoque mostra 12 un. e **Divergência detectada**. | Código | Ver P9 (prioridade de status) |
| D9 | Recursos visíveis no front (Plano, Equipe, Segurança, Certificado, Ajuda, Busca) **não constam no escopo do MVP** do resumo. | Front × resumo | Documentados como [VISUAL] com escopo pendente |

## 2. Pendências por tema

### Acesso e empresa
| # | Pendência | Onde |
|---|---|---|
| P1 | Autenticação via **Supabase Auth** ou própria (JWT + `senha_hash`) | integracoes.md §1, modelo-dados.md §2.1 |
| P2 | O front atual não envia `Authorization` nas chamadas GET — liberar rotas na demo ou ajustar o front | api-backend.md §1 |
| P3 | Obrigatoriedade de cada campo do cadastro e validação do CNPJ | RF002, RN002 |
| P4 | Fluxo de "Esqueci minha senha" e efeito de "Lembrar de mim" | RF001, RF004 |
| P5 | Multi-CNPJ (até 3 no Plano Pro): entra no MVP? Como trocar a empresa ativa? | RN003 |
| P6 | Permissões por papel (Administradora, Operação, Financeiro, Expedição) | casos-de-uso.md (atores) |
| P7 | Estrutura do endereço da empresa e do cliente (UF necessária para CFOP) | RF032, modelo-dados.md |

### Produtos, estoque e pedidos
| # | Pendência | Onde |
|---|---|---|
| P8 | Estoque baixo: `estoque < mínimo` ou `estoque <= mínimo` | RN012 |
| P9 | Prioridade entre status de estoque quando há mais de uma condição (divergência + baixo etc.) | RN014 |
| P10 | Critério de "crítico" nos alertas do dashboard e quantidade de itens exibidos | RF008 |
| P11 | Campos do formulário "Novo produto" além de nome, SKU, preço, estoque e mínimo (NCM, origem fiscal, canais) | RF011 |
| P12 | Edição/exclusão de produto e opções do menu "•••" (produtos, pedidos, notas) | RF010, RF011, RF012 |
| P13 | Status inicial e transições de pedido | RN007, atividades.md §6 |
| P14 | Formato de "Exportar" pedidos e conteúdo de "Filtros" | RF012, RF014 |
| P15 | Reativação de anúncios pausados após reposição | RF018 |
| P16 | Como o simulador gera divergências e pedidos para demonstração | integracoes.md §5.2 |
| P17 | Tratamento de falha em um canal durante a sincronização | RF009, UC07 |

### Dashboard e relatórios
| # | Pendência | Onde |
|---|---|---|
| P18 | Vendas por canal: valores acumulados ou por intervalo | RF006 |
| P19 | "Pedidos por status" deve respeitar o período selecionado? | RF007 |
| P20 | Base de comparação dos indicadores "Produtos" e "Estoque crítico" | api-backend.md §2.1 |
| P21 | Período das métricas "Pedidos" e "Vendas" em Marketplaces | RF025 |
| P22 | Período "Personalizado" (datas) e "3 meses" em Relatórios; critério do ranking de produtos | RF029 |
| P23 | Manter os formatos posicionais/formatados dos 10 GET atuais ou migrar para objetos (exige ajuste no front) | api-backend.md §2 |
| P24 | Cor/posição de um 4º marketplace nos gráficos e colunas fixas de estoque | api-backend.md §2.2, §2.8 |

### Fiscal (simulado)
| # | Pendência | Onde |
|---|---|---|
| P25 | Lista completa das "23 regras" de validação | RF022, RN026 |
| P26 | Fórmula da nota de "Saúde fiscal" (0–100) | RF019 |
| P27 | Critério para a simulação autorizar ou rejeitar uma nota | integracoes.md §6 |
| P28 | Seleção do pedido em "Emitir nota fiscal"; função de "Revisar pedidos" | RF020, RF021 |
| P29 | Emissão para pedido cancelado; histórico de tentativas de envio | RF020, modelo-dados.md §2.13 |
| P30 | Finalidade de "Importar XML" e formato de "Exportar XMLs" | RF024 |
| P31 | Upload real de certificado A1 (ou apenas simulado) | RF033 |

### Marketplaces e integrações
| # | Pendência | Onde |
|---|---|---|
| P32 | Função dos botões "Gerenciar" (Marketplaces) e "Configurar" (Integrações) | RF027, RF028 |
| P33 | Efeito de "Desconectar" sobre anúncios e pedidos importados | RF028 |
| P34 | Uma empresa pode conectar duas contas do mesmo marketplace? | modelo-dados.md §2.7 |

### Notificações
| # | Pendência | Onde |
|---|---|---|
| P35 | Leitura de notificações por empresa ou por usuário | modelo-dados.md §2.15 |
| P36 | Relação entre "Onde receber alertas" (liga/desliga geral) e a matriz Evento × Canal | RF031, RF035 |
| P37 | Provedor de e-mail e mecanismo de push do navegador | sequencia.md §12 |
| P38 | Tratamento de falha no envio de alertas | UC20 |

### Assistente, voz e Telegram
| # | Pendência | Onde |
|---|---|---|
| P39 | Lista final de intenções e **ações de escrita** que o assistente pode executar ("executa ação" no fluxograma) | RF038 |
| P40 | Modelo do Gemini e persistência do histórico de conversa | integracoes.md §2 |
| P41 | Voz: conversão no navegador (Web Speech API) ou no back-end; controle de microfone na interface | RF039, integracoes.md §4 |
| P42 | Processo de vínculo entre usuário e chat do Telegram | RF040, modelo-dados.md §2.17 |
| P43 | Suporte humano no Telegram é o mesmo bot do assistente? | integracoes.md §3 |

### Configurações, ajuda e busca
| # | Pendência | Onde |
|---|---|---|
| P44 | Tema e idioma: persistir? Por usuário ou por empresa? | RF034 |
| P45 | Equipe, segurança (2 etapas, sessões) e plano/cobrança entram no MVP? | RF036, RF037 |
| P46 | Upload do logo da empresa | RF032 |
| P47 | FAQ e status dos serviços: estáticos no front ou servidos pelo back-end | RF041 |
| P48 | Busca global: escopo e tela de resultados | RF042 |
