# Diagramas de atividades

Diagramas de atividades em Mermaid (`flowchart`: losangos = decisões) e diagramas de estados (`stateDiagram-v2`) para os ciclos de vida de pedido, NF-e e produto.

## 1. Fluxo geral do MVP

Reproduz o fluxograma oficial ([fluxograma-mvp.png](fluxograma-mvp.png)) em raias.

```mermaid
flowchart TB
    subgraph U["Usuário (lojista)"]
        I((Início)) --> U1["Acessa o sistema"]
        U2["Visualiza dados no dashboard"]
        U3["Gerencia catálogo e estoque"]
        U4["Envia mensagem ao assistente<br/>(Telegram)"]
        U5["Recebe resposta com as informações"] --> FIM((Fim))
    end
    subgraph FE["Front-end"]
        F1["Tela de Login / Cadastro"] --> F2["Informa CNPJ e dados da empresa"] --> F3["Conecta os marketplaces"]
        F4["Acessa o Dashboard"] --> F5["Exibe produtos, vendas e estoque unificados"]
    end
    subgraph BE["Back-end"]
        B1["Solicita autorização da integração"]
        B2["Recebe access_token e salva integração"] --> B3["Consulta dados dos outros canais"] --> B4["Disponibiliza dados para o sistema"]
        B5["Consulta estoque, vendas, cadastro e executa ação"] --> B6["Gera resposta"]
    end
    subgraph MK["Marketplaces [SIMULADO no MVP]"]
        M1["Autorização OAuth"]
        M2["Busca produtos, pedidos e estoque (via API)"]
    end
    subgraph IA["IA - Gemini [PLANEJADO]"]
        G1["Processa a mensagem e identifica a intenção"]
    end
    subgraph DB["Banco de Dados"]
        D1["Armazena dados da integração da empresa"] --> D2["Atualiza e centraliza produtos, pedidos e estoque"]
    end
    subgraph TG["Telegram [PLANEJADO]"]
        T1["Recebe mensagem do lojista"]
        T2["Envia a resposta via Telegram"]
    end

    U1 --> F1
    F3 --> B1 --> M1 --> B2
    B3 --> M2
    B4 --> F4
    B4 --> D1
    F4 --> U2
    F5 --> U3
    F5 --> B5
    U2 --> U3 --> U4
    U4 --> T1
    B5 --> G1 --> T1
    B5 --> B6
    B6 --> T2
    B6 --> U5
```

> Divergência registrada: no fluxograma original o passo do usuário é "Envia mensagem no **WhatsApp**", mas a seta vai para a raia **Telegram**. Aqui foi representado como Telegram (ver [../pendencias.md](../pendencias.md)).

## 2. Acesso ao sistema (login e cadastro)

```mermaid
flowchart TD
    A((Início)) --> B{"Aba selecionada"}
    B -- "Entrar" --> C["Informar e-mail e senha"]
    B -- "Criar conta" --> D["Informar nome, empresa, e-mail, senha, CNPJ"]
    C --> E{"E-mail e senha preenchidos?"}
    E -- "Não" --> E1["Exibir: Preencha seu e-mail e sua senha."] --> C
    E -- "Sim" --> F{"Credenciais válidas?"}
    F -- "Não" --> F1["Exibir erro de autenticação"] --> C
    F -- "Sim" --> Z["Criar sessão e abrir Início"]
    D --> G{"Dados válidos e<br/>e-mail/CNPJ inéditos?"}
    G -- "Não" --> G1["Exibir erros"] --> D
    G -- "Sim" --> H["Criar usuário, empresa,<br/>vínculo e preferências"] --> Z
    Z --> FIM((Fim))
```

## 3. Sincronização de estoque e tratamento de divergências

```mermaid
flowchart TD
    S((Gatilho)) --> T{"Origem"}
    T -- "Botão Sincronizar" --> P
    T -- "Nova venda" --> V["Baixar estoque central"] --> Q{"Sincronizar estoque<br/>automaticamente?"}
    T -- "Intervalo de conferência" --> P
    Q -- "Não" --> FIM((Fim))
    Q -- "Sim" --> P["Registrar sincronização (em andamento)"]
    P --> L["Para cada produto e canal:<br/>enviar estoque central (simulado)"]
    L --> Z{"Estoque central = 0?"}
    Z -- "Sim" --> Z1{"Pausar anúncios<br/>sem estoque?"}
    Z1 -- "Sim" --> Z2["Pausar anúncios em todos os canais<br/>e notificar"] --> DV
    Z1 -- "Não" --> DV
    Z -- "Não" --> DV{"Estoque publicado ≠<br/>estoque central?"}
    DV -- "Sim" --> D1["Marcar 'Divergência detectada'<br/>e notificar"]
    D1 --> R["Lojista revisa divergências"] --> R1{"Qual valor prevalece?"}
    R1 -- "Central" --> R2["Enviar central a todos os canais"]
    R1 -- "Valor de um canal" --> R3["Atualizar estoque central<br/>e enviar a todos os canais"]
    R2 --> OK
    R3 --> OK
    DV -- "Não" --> OK["Status 'Sincronizado'"]
    OK --> C["Concluir sincronização,<br/>atualizar última sincronização,<br/>notificar 'Sincronização concluída'"] --> FIM
```

## 4. Emissão de NF-e simulada

```mermaid
flowchart TD
    A((Início)) --> B["Pedido importado<br/>(Pedido recebido)"]
    B --> C["Nota criada como rascunho<br/>(Aguardando emissão)"]
    C --> D{"Emissão individual<br/>ou em lote?"}
    D -- "Individual" --> E["Emitir nota do pedido"]
    D -- "Lote" --> E2["Para cada pedido pronto<br/>para faturar"] --> E
    E --> F{"Validação fiscal ok?<br/>(destinatário, NCM, CFOP/UF,<br/>origem, certificado)"}
    F -- "Não" --> F1["Manter aguardando emissão,<br/>listar pendências<br/>(rejeição evitada)"] --> G1["Lojista corrige cadastro"] --> E
    F -- "Sim" --> H["Status Processando<br/>(envio à SEFAZ simulada)"]
    H --> I{"Resultado da SEFAZ simulada"}
    I -- "Autorizada" --> J["Gerar número e XML,<br/>devolver XML ao pedido e ao canal"] --> FIM((Fim))
    I -- "Rejeitada" --> K["Registrar motivo,<br/>notificar (Fiscal)"] --> L["Lojista revisa e corrige"] --> M["Reenviar"] --> H
```

## 5. Processamento de mensagem do assistente (texto, voz e Telegram)

```mermaid
flowchart TD
    A((Mensagem)) --> B{"Canal de entrada"}
    B -- "App (texto ou ação rápida)" --> C["Texto"]
    B -- "App (voz) [PLANEJADO]" --> V["Converter fala em texto"] --> C
    B -- "Telegram [PLANEJADO]" --> T{"Chat vinculado?"}
    T -- "Não" --> T1["Responder com instruções de vínculo"] --> FIM((Fim))
    T -- "Sim" --> C
    C --> E{"Texto vazio?"}
    E -- "Sim" --> FIM
    E -- "Não" --> G["Gemini identifica a intenção"]
    G --> H{"Intenção reconhecida?"}
    H -- "Não" --> H1["Resposta padrão:<br/>Ainda estou aprendendo..."] --> OUT
    H -- "Sim" --> I["Consultar dados / executar ação<br/>(empresa do usuário)"] --> J["Gerar resposta"] --> OUT{"Canal de saída"}
    OUT -- "App texto" --> O1["Exibir no chat"] --> FIM
    OUT -- "App voz" --> O2["Exibir texto e reproduzir áudio"] --> FIM
    OUT -- "Telegram" --> O3["Enviar via Telegram"] --> FIM
```

## 6. Estados do pedido

Status confirmados pelo front. **As transições são propostas** (o front não mostra mudança de status) — Pendente de definição.

```mermaid
stateDiagram-v2
    [*] --> Aguardando: pedido importado
    Aguardando --> EmSeparacao: separação iniciada
    EmSeparacao --> EmTransporte: enviado
    EmTransporte --> Entregue: entrega confirmada
    Aguardando --> Cancelado: cancelado no canal
    EmSeparacao --> Cancelado: cancelado no canal
    Cancelado --> [*]: estoque devolvido (RN017)
    Entregue --> [*]
    EmSeparacao: Em separação
    EmTransporte: Em transporte
```

## 7. Estados da NF-e (simulada)

```mermaid
stateDiagram-v2
    [*] --> AguardandoEmissao: pedido pronto para faturar
    AguardandoEmissao --> Processando: emitir (validação ok)
    Processando --> Autorizada: SEFAZ simulada autoriza
    Processando --> Rejeitada: SEFAZ simulada rejeita
    Rejeitada --> Processando: corrigir e reenviar
    Autorizada --> [*]: XML devolvido ao pedido e ao canal
    AguardandoEmissao: Aguardando emissão (rascunho)
```

## 8. Status de estoque de um produto

```mermaid
stateDiagram-v2
    [*] --> Sincronizado
    Sincronizado --> Divergencia: publicado ≠ central
    Divergencia --> Sincronizado: divergência resolvida
    Sincronizado --> EstoqueBaixo: central atinge o mínimo
    EstoqueBaixo --> SemEstoque: central = 0
    SemEstoque --> EstoqueBaixo: reposição parcial
    EstoqueBaixo --> Sincronizado: reposição acima do mínimo
    SemEstoque --> Sincronizado: reposição acima do mínimo
    Divergencia: Divergência detectada
    EstoqueBaixo: Estoque baixo
    SemEstoque: Sem estoque (anúncios pausados)
```
> Prioridade quando duas condições ocorrem ao mesmo tempo (ex.: divergência e estoque baixo) e reativação de anúncios na reposição: Pendente de definição.
