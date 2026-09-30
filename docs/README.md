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
| 9 | [pendencias.md](pendencias.md) | Lista consolidada de itens "Pendente de definição" e divergências entre fontes |
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

> **DER:** nenhum DER foi encontrado no repositório nem nos anexos. O modelo de dados em [modelo-dados.md](modelo-dados.md) foi derivado do front-end, do fluxograma e do resumo do projeto e está marcado como **proposta sujeita a validação** (ver [pendencias.md](pendencias.md)).

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

- O front-end é **HTML + CSS + JavaScript puro** (sem framework). Todas as telas são geradas por `javascript.js`.
- Não existe back-end. O objeto `CONFIG` possui `useApi: false` e `apiBase: "/api"`. Com `useApi = true`, as funções do objeto `api` fazem `GET` em `CONFIG.apiBase + caminho` e, em caso de erro, voltam para os dados de exemplo.
- Apenas **10 chamadas GET** já estão ligadas à camada `api`. Todo o restante (formulários, botões de ação, notificações, configurações, chat) usa dados fixos no código. Os contratos desses pontos estão **propostos** em [api-backend.md](api-backend.md).
- O comentário no topo do `javascript.js` cita **FastAPI** como back-end esperado.
