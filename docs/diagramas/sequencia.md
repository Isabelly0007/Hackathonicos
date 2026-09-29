# Diagramas de sequência

Participantes padrão: **Lojista**, **Front** (`javascript.js`), **API** (back-end Python), **DB** (Supabase/PostgreSQL) e serviços externos. Onde o comportamento atual difere do esperado, há uma nota.

## 1. Login (UC01)

```mermaid
sequenceDiagram
    actor L as Lojista
    participant F as Front
    participant A as API
    participant D as DB
    L->>F: Informa e-mail e senha e clica em "Entrar na plataforma"
    alt e-mail ou senha vazios
        F-->>L: "Preencha seu e-mail e sua senha."
    else preenchidos
        F->>A: POST /api/auth/login {email, password, remember}
        A->>D: Busca usuário por e-mail e verifica senha
        alt credenciais válidas
            D-->>A: usuário + empresas vinculadas
            A-->>F: 200 {access_token, user, company}
            F-->>L: Exibe tela Início
        else inválidas
            A-->>F: 401 CREDENCIAIS_INVALIDAS
            F-->>L: Exibe erro
        end
    end
    Note over F: Hoje o front aceita qualquer e-mail/senha preenchidos (sem chamada à API).
```

## 2. Criar conta e empresa (UC02)

```mermaid
sequenceDiagram
    actor V as Visitante
    participant F as Front
    participant A as API
    participant D as DB
    V->>F: Preenche nome, empresa, e-mail, senha, CNPJ
    F->>A: POST /api/auth/register
    A->>A: Valida campos e CNPJ
    A->>D: Verifica e-mail e CNPJ únicos
    alt duplicado
        A-->>F: 409 EMAIL_JA_CADASTRADO / CNPJ_JA_CADASTRADO
    else ok
        A->>D: INSERT usuario, empresa, usuario_empresa (administrador), preferencia_empresa
        A-->>F: 201 {access_token, user, company}
        F-->>V: Exibe tela Início
    end
```

## 3. Carregamento do dashboard (UC04)

As 5 chamadas são disparadas em paralelo por `renderDashboard()` e já existem no front.

```mermaid
sequenceDiagram
    actor L as Lojista
    participant F as Front
    participant A as API
    participant D as DB
    L->>F: Acessa "Início"
    par Indicadores
        F->>A: GET /api/dashboard/stats?period=Hoje
        A->>D: Agrega pedidos, produtos, integrações
        A-->>F: 200 [5 indicadores]
    and Gráfico
        F->>A: GET /api/dashboard/sales?range=7 dias
        A-->>F: 200 {labels, yMax, series}
    and Status
        F->>A: GET /api/dashboard/order-statuses
        A-->>F: 200 [{label, value, color}]
    and Alertas
        F->>A: GET /api/dashboard/stock-alerts
        A-->>F: 200 [{name, desc, critical}]
    and Canais
        F->>A: GET /api/channels
        A-->>F: 200 [{name, short, products, lastSync}]
    end
    F-->>L: Renderiza cartões e gráficos
    Note over F,A: Qualquer resposta com erro → o front usa os dados de exemplo daquele bloco.
    L->>F: Troca período para "7 dias"
    F->>A: GET /api/dashboard/stats?period=7 dias
    A-->>F: 200 [5 indicadores]
```

## 4. Conectar marketplace — MVP simulado e OAuth planejado (UC11)

```mermaid
sequenceDiagram
    actor L as Lojista
    participant F as Front
    participant A as API
    participant M as Marketplace
    participant D as DB
    L->>F: "＋ Conectar canal" e escolhe o canal
    F->>A: POST /api/marketplaces/connect {marketplace}
    alt MVP [SIMULADO]
        A->>D: INSERT integracao (conectado, simulada=true)
        A->>A: Simulador gera anúncios e pedidos
        A->>D: INSERT anuncio, pedido, item_pedido
        A-->>F: 201 {integration_id, status: conectado}
    else OAuth real [PLANEJADO]
        A-->>F: 200 {authorization_url}
        F->>M: Redireciona para autorização
        L->>M: Autoriza com a conta de vendedor
        M->>A: GET /api/marketplaces/oauth/callback?code&state
        A->>M: Troca code por access_token
        M-->>A: access_token, refresh_token
        A->>D: Salva integração (tokens criptografados)
        A->>M: Consulta produtos, pedidos e estoque (API)
        M-->>A: Dados do canal
        A->>D: Armazena e centraliza produtos, pedidos, estoque
        A-->>F: 302 → tela Marketplaces
    end
    F-->>L: Canal aparece como "● Conectado"
```

## 5. Venda recebida → baixa e propagação de estoque (RN013, RN016)

```mermaid
sequenceDiagram
    participant J as Agendador / Sincronização
    participant A as API (serviços)
    participant M as Marketplace (simulado)
    participant D as DB
    J->>A: Conferência periódica (intervalo configurado)
    A->>M: Buscar pedidos novos
    M-->>A: Novo pedido 200015 (itens)
    A->>D: BEGIN, INSERT pedido + itens
    A->>D: UPDATE produto SET estoque_central = estoque_central - qtd
    A->>D: COMMIT
    A->>D: INSERT notificacao (Pedidos, "Novo pedido")
    opt sincronizar_estoque_auto = true
        loop cada anúncio do produto
            A->>M: atualizar_estoque(anuncio, estoque_central)
            A->>D: UPDATE anuncio.estoque_publicado
        end
    end
    opt estoque_central = 0 e pausar_anuncio_sem_estoque = true
        loop cada anúncio do produto
            A->>M: pausar_anuncio(anuncio)
            A->>D: UPDATE anuncio.status = pausado
        end
        A->>D: INSERT notificacao (Estoque, "produto sem estoque")
    end
```

## 6. Sincronizar agora (UC07)

```mermaid
sequenceDiagram
    actor L as Lojista
    participant F as Front
    participant A as API
    participant M as Marketplace (simulado)
    participant D as DB
    L->>F: Clica em "Sincronizar agora"
    F->>A: POST /api/channels/sync
    alt já existe sincronização em andamento
        A-->>F: 409 SINCRONIZACAO_EM_ANDAMENTO
    else
        A->>D: INSERT sincronizacao (em_andamento)
        A-->>F: 202 {sync_id}
        F-->>L: Botão "Sincronizando..."
        loop cada integração e anúncio
            A->>M: atualizar_estoque / buscar pedidos
            A->>D: UPDATE anuncio, INSERT pedidos
        end
        A->>D: Detecta divergências (estoque_publicado ≠ estoque_central)
        A->>D: UPDATE sincronizacao (concluida), integracao.ultima_sincronizacao
        A->>D: INSERT notificacao (Integrações, "Sincronização concluída")
        F->>A: GET /api/syncs/{sync_id}
        A-->>F: 200 {status: concluida, items_updated}
        F-->>L: "Última sinc.: agora"
    end
    Note over F: Hoje o botão apenas simula 1,4 s de espera, sem API.
```

## 7. Revisar divergência de estoque (UC08)

```mermaid
sequenceDiagram
    actor L as Lojista
    participant F as Front
    participant A as API
    participant M as Marketplace (simulado)
    participant D as DB
    L->>F: "Revisar divergências"
    F->>A: GET /api/stock/divergences
    A->>D: Produtos com anuncio.estoque_publicado ≠ produto.estoque_central
    A-->>F: 200 [produto, central, canais]
    L->>F: Escolhe o valor que prevalece (ex.: Shopee = 10)
    F->>A: POST /api/stock/divergences/{produto}/resolve {source: channel, integration_id}
    A->>D: UPDATE produto.estoque_central = 10
    loop cada anúncio
        A->>M: atualizar_estoque(anuncio, 10)
        A->>D: UPDATE anuncio.estoque_publicado = 10
    end
    A-->>F: 200 {status: Sincronizado}
```

## 8. Emissão de NF-e em lote — simulada (UC09, UC10)

```mermaid
sequenceDiagram
    actor L as Lojista
    participant F as Front
    participant A as API
    participant S as SEFAZ (simulador)
    participant D as DB
    L->>F: "Emitir 18 NF-e em lote"
    F->>A: POST /api/invoices/batch
    A-->>F: 202 {batch_id, total: 18}
    loop cada pedido pronto para faturar
        A->>D: Lê pedido, itens, cliente, produtos, empresa, certificado
        A->>A: Validação fiscal (CPF/CNPJ, endereço, NCM, CFOP por UF, origem)
        alt validação falhou
            A->>D: Mantém aguardando_emissao e conta rejeição evitada
        else validação ok
            A->>D: UPDATE nota_fiscal.status = processando
            A->>S: Envia NF-e (simulado)
            alt autorizada
                S-->>A: Autorizada + XML
                A->>D: status = autorizada, numero, xml_url, emitida_em
                A->>A: Devolve XML ao pedido e ao canal (simulado)
            else rejeitada
                S-->>A: Rejeitada + motivo
                A->>D: status = rejeitada, motivo_rejeicao
                A->>D: INSERT notificacao (Fiscal, "NF-e rejeitada")
            end
        end
    end
    L->>F: Abre nota rejeitada, corrige dados e reenvia
    F->>A: POST /api/invoices/{id}/resend
    A->>S: Reenvia (mesmo fluxo)
```

## 9. Assistente de IA por texto (UC17)

```mermaid
sequenceDiagram
    actor L as Lojista
    participant F as Front
    participant A as API
    participant G as Gemini
    participant D as DB
    L->>F: Digita "Quais produtos estão com estoque baixo?" ou clica numa ação rápida
    alt mensagem vazia
        F-->>L: Nada é enviado
    else
        F->>A: POST /api/assistant/messages {message, channel: app}
        A->>G: Mensagem + intenções suportadas
        G-->>A: intent = consultar_estoque_baixo
        alt intenção reconhecida
            A->>D: Consulta produtos com estoque ≤ mínimo (empresa do usuário)
            D-->>A: Lista de produtos
            A->>A: Gera resposta (opcionalmente redigida pelo Gemini)
            A-->>F: 200 {reply, intent, data}
        else não reconhecida / Gemini indisponível
            A-->>F: 200/502 {reply: "Ainda estou aprendendo a responder isso..."}
        end
        F-->>L: Exibe resposta no chat
    end
    Note over F: Hoje: 4 respostas fixas (chatAnswers) exibidas após 400 ms, sem API.
```

## 10. Assistente por voz — planejado (UC18)

Mostra a opção (a) de [integracoes.md](../integracoes.md#4-reconhecimento-e-interação-por-voz): conversão no navegador. A escolha é **Pendente de definição**.

```mermaid
sequenceDiagram
    actor L as Lojista
    participant F as Front
    participant W as Voz do navegador
    participant A as API
    L->>F: Ativa o microfone
    F->>W: Inicia reconhecimento (pt-BR)
    L->>W: Fala "Quantos pedidos tivemos hoje?"
    W-->>F: Texto transcrito
    F->>A: POST /api/assistant/messages {message, input_mode: voice}
    A-->>F: 200 {reply}
    F-->>L: Exibe a resposta em texto
    F->>W: Sintetiza a resposta em áudio
    W-->>L: Resposta falada
```

## 11. Consulta pelo Telegram — planejado (UC19)

```mermaid
sequenceDiagram
    actor L as Lojista
    participant T as Telegram
    participant A as API
    participant G as Gemini
    participant D as DB
    L->>T: Envia "vendas de hoje" ao bot
    T->>A: POST /api/telegram/webhook (Update)
    A->>A: Valida secret token
    A->>D: Busca vinculo_telegram por chat_id
    alt chat não vinculado
        A->>T: sendMessage (instruções de vínculo)
    else vinculado
        A->>G: Mensagem + intenções
        G-->>A: intent = vendas_hoje
        A->>D: Soma vendas e pedidos de hoje
        A->>T: sendMessage("Hoje você vendeu R$ ... em N pedidos ...")
    end
    A-->>T: 200 {}
    T-->>L: Resposta no chat
```

## 12. Envio de alerta (UC20)

```mermaid
sequenceDiagram
    participant E as Evento (pedido, estoque, divergência, NF-e)
    participant A as API (notificações)
    participant D as DB
    participant T as Telegram
    participant M as E-mail
    participant P as Push
    E->>A: Evento ocorrido
    A->>D: INSERT notificacao (lida = false)
    A->>D: Lê preferencia_notificacao do evento e preferencia_empresa
    opt Telegram habilitado
        A->>T: sendMessage(chat_id, alerta)
    end
    opt E-mail habilitado
        A->>M: Envia e-mail (provedor Pendente de definição)
    end
    opt Push habilitado
        A->>P: Notificação push (mecanismo Pendente de definição)
    end
```
