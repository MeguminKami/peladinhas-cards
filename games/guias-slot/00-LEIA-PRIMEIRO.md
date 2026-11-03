# Guias para criar uma slot do zero

Quatro guias, um por fase. Cada um é entregue a um agente **sem contexto**: o agente recebe o guia da fase, o teu input e o que as fases anteriores entregaram. Mais nada.

| Fase | Guia | O agente recebe | O agente entrega |
| --- | --- | --- | --- |
| 1 | [1-MATEMATICA-E-MOTOR.md](1-MATEMATICA-E-MOTOR.md) | O teu **input inicial** (modelo no próprio guia) | Motor puro, configuração versionada, simulador, RTP medido, `docs/matematica.md`, `docs/eventos.md`, `AGENTS.md` |
| 2 | [2-GUI-DE-TESTE.md](2-GUI-DE-TESTE.md) | Pasta do jogo da fase 1 | Jogo jogável com **todas** as funcionalidades finais, sem arte nem animações elaboradas, com painel de diagnóstico e ligação à carteira |
| 3 | [3-VISUAIS-E-ANIMACOES.md](3-VISUAIS-E-ANIMACOES.md) | Pasta do jogo da fase 2 + tema e referências visuais | Arte final, interface com a identidade do jogo, todas as animações, `docs/TEMA.md`, `docs/visuais-animacoes.md` |
| 4 | [4-SOM-E-MUSICA.md](4-SOM-E-MUSICA.md) | Pasta do jogo da fase 3 (ou 2) + direção sonora | Música por modo, todos os efeitos, mistura, página de teste de som, `docs/sons.md` |

As fases 3 e 4 podem correr em paralelo com dois agentes, porque escrevem em ficheiros diferentes: `ui/fx-visual.js` e `ui/fx-audio.js`. A fase 2 tem de estar terminada antes de qualquer uma delas começar.

## Como usar

1. Copia o bloco «Input» do guia 1, preenche-o e dá-o ao agente junto com o guia 1. O que deixares em branco o agente propõe e marca como provisório.
2. Revê o relatório de RTP e as regras fixadas no `AGENTS.md`. Só passas à fase 2 quando a matemática te agradar. Mudar a matemática depois obriga a medir tudo de novo.
3. Dá ao agente seguinte o guia da fase e diz-lhe qual é a pasta do jogo. Os guias 3 e 4 também têm um pequeno bloco «Input» com o tema e a direção sonora.
4. Cada agente termina com um relatório num formato fixo, descrito no fim de cada guia. Usa-o para decidir se a fase está concluída.

## O contrato que liga as fases

Todas as fases respeitam estas quatro coisas. Se um agente precisar de as mudar, tem de o dizer explicitamente no relatório.

**1. Estrutura de pastas** (`<jogo>` = pasta do jogo, por exemplo `games/nome-do-jogo/`)

```text
<jogo>/
  AGENTS.md            regras fixas do dono do jogo (prevalecem sobre tudo)
  README.md            visão geral, comandos, organização
  package.json         scripts npm (test, sim, validate:rtp, dev, test:ui)
  src/                 FASE 1 - motor puro: config.js, engine.js, random.js, simulation.js, index.js
  scripts/             FASE 1 - simulate.js, validate-rtp.js; FASE 2 - serve.js
  relatorios/          FASE 1 - relatórios de RTP em JSON (com seeds e versão)
  tests/               testes do motor (node --test) e do browser (Playwright)
  docs/                matematica.md, eventos.md (F1); estrutura-ui.md (F2); TEMA.md, visuais-animacoes.md (F3); sons.md (F4)
  game.html            FASE 2 - a slot
  ui/                  FASE 2 - app.js, session.js, layout.js, tempo.js, fx-visual.js, fx-audio.js, *.css
  ui/kit/              FASE 2 - barra de controlos padrão copiada SEM alterações (barra.js, barra.css)
  ui/tema-barra.css    FASE 2 neutro -> FASE 3 com as cores/fontes do jogo (só variáveis --deck-*)
  ui/art/              FASE 3 - arte publicada (WebP) + fontes PNG ao lado
  ui/fonts/            FASE 3
  ui/audio/music/      FASE 4
  ui/audio/sfx/        FASE 4
  ASSETS/              referências privadas (fotografias, inspiração) - nunca publicar
```

**2. Catálogo de eventos** (`docs/eventos.md`, criado na fase 1). O motor descreve cada passo de jogo como uma lista ordenada de eventos, por exemplo `grid.drop`, `win.cluster`, `scatter.land` ou `bonus.trigger`. A interface apresenta os eventos por ordem: nunca adivinha nada a partir das diferenças entre grelhas e nunca volta a sortear. A fase 3 dá uma animação a cada evento e a fase 4 dá-lhe um som.

**3. Pontos de ligação da apresentação** (criados na fase 2). `ui/app.js` percorre os eventos e, para cada um, espera por `await fx.visual.play(evento, ctx)` e chama `fx.audio.play(evento, ctx)`. Todas as esperas passam pelo relógio único `ui/tempo.js`, que aplica as velocidades. Na fase 2 estes módulos são mínimos. As fases 3 e 4 substituem-nos sem mexer na lógica.

**4. Barra de controlos padrão** ([kit/barra-controlos](kit/barra-controlos/README.md)). A barra por baixo do tabuleiro, com saldo, ganho, regras, som, − RODAR +, Autoplay e velocidade, é a da Princesa Sofia e é igual em todas as slots. A fase 2 usa-a tal como está e a fase 3 só lhe muda cores, fontes e formas no `ui/tema-barra.css`. `node games/guias-slot/kit/verificar-kit.mjs games/<jogo>` confirma que não foi alterada. Uma melhoria à barra faz-se no kit e passa depois para todos os jogos.

## Regras que valem para todas as fases

- Português de Portugal nos textos do jogo, nos documentos e nos relatórios.
- Créditos fictícios. O motor no browser **não** serve como autoridade para dinheiro real.
- Nenhuma fase altera a matemática, exceto a fase 1. Se outra fase encontrar um erro no motor, corrige-o em `src/`, acrescenta um teste, sobe a versão da matemática e diz no relatório que o RTP tem de ser medido de novo.
- A slot nunca tem barras de deslocação, nem no widget nem em ecrã inteiro. Quando falta espaço, o jogo inteiro encolhe por igual.
- Nada é dado como feito sem ter sido verificado: testes executados, capturas de ecrã vistas, sons ouvidos ou analisados. Quando algo fica por verificar, o relatório diz exatamente o quê.
