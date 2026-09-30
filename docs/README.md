# Documentação do Taylor

Documentação funcional e técnica do **Taylor**, software de gestão de marketplace e e-commerce desenvolvido pela equipe **Hackathonicos**. O objetivo é permitir que a equipe de back-end implemente o back-end em **Python** sem precisar ler o código do front-end.

## Como ler esta documentação

| Ordem | Arquivo | Conteúdo |
|---|---|---|
| 1 | [visao-geral.md](visao-geral.md) | Objetivo, problema, público-alvo, funcionamento geral e escopo do MVP |
| 2 | [requisitos-funcionais.md](requisitos-funcionais.md) | Requisitos RF001…RF042 |
| 3 | [regras-de-negocio.md](regras-de-negocio.md) | Regras RN001…RN033, cada uma com a fonte que a comprova |
| 4 | [casos-de-uso.md](casos-de-uso.md) | Casos de uso UC01…UC21 no padrão UML |
| 5 | [modelo-dados.md](modelo-dados.md) | Entidades, atributos, PK/FK, cardinalidades, restrições e DER em Mermaid |
| 6 | [api-backend.md](api-backend.md) | Contratos HTTP para implementação em Python |
| 7 | [integracoes.md](integracoes.md) | Supabase, Gemini, Telegram, voz, marketplaces e emissão fiscal |
| 8 | [mapeamento-frontend-backend.md](mapeamento-frontend-backend.md) | Guia tela → funcionalidade → endpoint → entidade |
| 9 | [../backend/README.md](../backend/README.md#decisões-tomadas-para-as-pendências-da-documentação) | Decisões tomadas para os itens "Pendente de definição" (a antiga `pendencias.md` foi removida) |
| — | [diagramas/](diagramas/) | Diagramas UML em Mermaid (casos de uso, sequência, atividades, componentes) e o fluxograma original |

## Fontes analisadas

| Fonte | Tipo | Observação |
|---|---|---|
| `index.html` | Front-end | Página base; carrega `style.css` e `javascript.js` e monta tudo em `#root` |
| `javascript.js` | Front-end | Todas as telas, dados de exemplo (mock), camada `api` e eventos |
| `style.css` | Front-end | Estilos; confirma os status visuais (classes `.status.*`) |
| `README.md` (raiz) | Documentação | Instruções de uso do front e de ativação do back-end (`CONFIG.useApi`) |
| `Taylor_Resumo_Projeto.docx` | Especificação | Dor, solução, funcionalidades do MVP e tecnologias planejadas |
| Fluxograma "HACKATHONICOS – Fluxograma do Sistema (MVP)" | Especificação | Copiado em [diagramas/fluxograma-mvp.png](diagramas/fluxograma-mvp.png) |
| Repositório `github.com/isaadsl/Hackathonicos` | Código | Conteúdo idêntico à pasta local analisada |

> **DER:** nenhum DER foi encontrado no repositório nem nos anexos. O modelo de dados em [modelo-dados.md](modelo-dados.md) foi derivado do front-end, do fluxograma e do resumo do projeto e está marcado como **proposta sujeita a validação**. O modelo implementado está em `backend/db/schema.sql` (ver [../backend/README.md](../backend/README.md)).

## Legenda de classificação

Usada em todos os arquivos para diferenciar o que existe do que é simulado ou planejado.

| Marcação | Significado |
|---|---|
| **[REAL]** | Comportamento que já funciona hoje (no front-end, localmente) ou integração real com serviço externo |
| **[SIMULADO]** | Funcionalidade representada com dados de exemplo (mock) ou simulada por decisão do MVP |
| **[PLANEJADO]** | Descrito no resumo do projeto ou no fluxograma, mas sem implementação/tela no front-end atual |
| **[VISUAL]** | Elemento presente na tela sem comportamento associado (ex.: botão sem ação) |
| **Pendente de definição** | Regra, dado ou comportamento que as fontes não definem ou em que divergem |

## Situação atual do projeto (resumo técnico)

> Esta documentação foi escrita **antes** do back-end, como especificação. As marcações [PLANEJADO] e
> "Pendente de definição" dos demais arquivos registram a situação daquele momento; o que já foi
> implementado e as decisões tomadas estão em [../backend/README.md](../backend/README.md).

- O front-end é **HTML + CSS + JavaScript puro** (sem framework). Todas as telas são geradas por `javascript.js`.
- O back-end existe em `backend/` (**Python + FastAPI**) e serve também o front-end no mesmo endereço. O objeto `CONFIG` do `javascript.js` vem com `useApi: true`; publicado ou aberto pelo back-end, `apiBase` é `"/api"`. Se a API falhar, as leituras voltam para os dados de exemplo.
- O banco é o **Supabase (PostgreSQL)**, com as tabelas no schema `taylor` ([modelo-dados.md](modelo-dados.md) + acréscimos marcados no `backend/db/schema.sql` e no `backend/db/migracoes.sql`).
- O assistente de IA roda no back-end: o **Gemini** (opcional) identifica a intenção e o back-end monta a resposta com os dados da empresa.
- O **bot do Telegram** (`bot_estoque/`, Node.js, **@EstoqueLojas_bot**) é um programa à parte: lê e grava nas mesmas tabelas do schema `taylor` e busca as mensagens por *long polling* (não há webhook).
- **Conta Demo** (`POST /api/auth/demo`): cada visitante ganha uma loja isolada com os dados de exemplo, apagada depois de algumas horas. Ver [api-backend.md](api-backend.md) §3.1.
