# Diagrama de casos de uso

O Mermaid não possui diagrama de casos de uso UML nativo. A notação abaixo usa `flowchart`: **atores** em retângulos à esquerda/direita, **casos de uso** em elipses (formato estádio) dentro da fronteira do sistema. Linhas sólidas = associação; linhas tracejadas `«include»` / `«extend»` = relações UML.

Especificação textual: [../casos-de-uso.md](../casos-de-uso.md).

## Visão geral

```mermaid
flowchart LR
    V["🧍 Visitante"]
    L["🧍 Lojista"]
    S["⚙ Sistema<br/>(agendador)"]
    MK["🏬 Marketplace<br/>[SIMULADO]"]
    GM["🤖 Gemini<br/>[PLANEJADO]"]
    TG["✈ Telegram<br/>[PLANEJADO]"]
    SZ["🏛 SEFAZ<br/>[SIMULADO]"]

    subgraph TAYLOR["Taylor"]
        UC01(["UC01 Autenticar-se"])
        UC02(["UC02 Criar conta e empresa"])
        UC03(["UC03 Encerrar sessão"])
        UC04(["UC04 Acompanhar dashboard"])
        UC05(["UC05 Gerenciar produtos"])
        UC06(["UC06 Acompanhar pedidos"])
        UC07(["UC07 Sincronizar estoque"])
        UC08(["UC08 Revisar divergências"])
        UC09(["UC09 Emitir NF-e"])
        UC10(["UC10 Tratar NF-e rejeitada"])
        UC11(["UC11 Conectar marketplace"])
        UC12(["UC12 Gerenciar integrações"])
        UC13(["UC13 Consultar relatórios"])
        UC14(["UC14 Gerenciar notificações"])
        UC15(["UC15 Configurar empresa e preferências"])
        UC16(["UC16 Gerenciar equipe"])
        UC17(["UC17 Assistente IA por texto"])
        UC18(["UC18 Assistente por voz"])
        UC19(["UC19 Consultar pelo Telegram"])
        UC20(["UC20 Receber alertas"])
        UC21(["UC21 Consultar ajuda"])
    end

    V --- UC01
    V --- UC02
    L --- UC03
    L --- UC04
    L --- UC05
    L --- UC06
    L --- UC07
    L --- UC08
    L --- UC09
    L --- UC10
    L --- UC11
    L --- UC12
    L --- UC13
    L --- UC14
    L --- UC15
    L --- UC16
    L --- UC17
    L --- UC18
    L --- UC19
    L --- UC21
    S --- UC07
    S --- UC20
    UC20 --- L

    UC06 --- MK
    UC07 --- MK
    UC11 --- MK
    UC12 --- MK
    UC09 --- SZ
    UC10 --- SZ
    UC17 --- GM
    UC18 --- GM
    UC19 --- GM
    UC19 --- TG
    UC20 --- TG

    UC08 -. "«include»" .-> UC07
    UC18 -. "«include»" .-> UC17
    UC19 -. "«include»" .-> UC17
    UC10 -. "«extend»" .-> UC09
    UC04 -. "«extend»" .-> UC07
```

## Casos de uso por classificação

```mermaid
flowchart TB
    subgraph R["[REAL] local / [SIMULADO] no front atual"]
        direction LR
        a1(["UC01"]) --- a2(["UC02"]) --- a3(["UC03"]) --- a4(["UC04"]) --- a5(["UC05"]) --- a6(["UC06"]) --- a13(["UC13"]) --- a14(["UC14"]) --- a17(["UC17"]) --- a21(["UC21"])
    end
    subgraph SM["[SIMULADO] por decisão do MVP"]
        direction LR
        b7(["UC07"]) --- b8(["UC08"]) --- b9(["UC09"]) --- b10(["UC10"]) --- b11(["UC11"]) --- b12(["UC12"])
    end
    subgraph P["[PLANEJADO] sem tela / sem integração"]
        direction LR
        c18(["UC18 Voz"]) --- c19(["UC19 Telegram"]) --- c20(["UC20 Alertas externos"])
    end
    subgraph VS["[VISUAL] escopo Pendente de definição"]
        direction LR
        d15(["UC15"]) --- d16(["UC16"])
    end
```
