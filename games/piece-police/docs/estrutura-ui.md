# Estrutura da interface (Fase 2)

GUI de teste com todas as funcionalidades finais e apresentação neutra. O motor decide, a interface apresenta: nada aqui sorteia, calcula prémios ou compara grelhas.

## Ficheiros

| Ficheiro | Papel |
|---|---|
| `game.html` | A slot. Uma página, sem scripts nem estilos inline (CSP `default-src 'self'`) |
| `ui/app.js` | Controlador: comandos, máquina de estados, percorre os eventos, HUD, janelas |
| `ui/modelo.js` | Estado do ecrã construído **só** a partir dos eventos (`aplicar(modelo, evento)`). Sem DOM; testado em `tests/modelo.test.js` |
| `ui/session.js` | `TestSession` (créditos de teste), `HostSession` (carteira do site por `postMessage`), `DemoSession` (diagnóstico, sem saldo) |
| `ui/carteira-local.js` | Lógica da carteira do lado do site (start/step, débito único, crédito no último passo, retoma, versão). Função pura, testada em `tests/carteira.test.js` |
| `ui/tempo.js` | Relógio único partilhado; Normal/Rápido/Turbo usam taxas 1/2/3,75. Sem saltar eventos ou alterar resultados |
| `ui/presentation-state.js` | Memória de explicações por bónus e continuidade visual de Party no POLICE PARTY; snapshot de UI separado da carteira |
| `ui/acid-symbols.js`, `ui/acid-refinement.css` | Fechadura articulada, entrada decorativa comprada e acabamento Acidwave dos símbolos, títulos e janelas |
| `ui/layout.js` | Escolhe o desenho (`landscape` / `portrait` / `compact`) e escala o jogo inteiro |
| `ui/fx-visual.js` | **Ponto de ligação visual**; etapa 1 mantém coreografias da Fase 2 até aprovação da amostra |
| `ui/art-loader.js`, `ui/art/manifest.json` | Catálogo visual versão 1: `assets` com `id`, `file` relativo ao manifesto e dimensões; valida URLs locais WebP, descodifica com `decode()` e reporta progresso/falhas. Amostra com seis peças; células conservam texto quando não há arte descodificada. P5 usa o retrato psicadélico ativo quando LCD está desperto; Chemistry usa retrato do catálogo, sem inventar imagens ausentes |
| `ui/theme.css` | Tokens Acidwave, camada de carregamento e apresentação da arte; não altera a geometria dos três desenhos |
| `ui/fx-audio.js`, `ui/audio-bus.js`, `ui/audio-catalog.js` | Adaptador, barramento Web Audio e catálogo de 62 efeitos originais. Os impactos recebem chamadas da apresentação, músicas por modo usam crossfades. Ver [estado sonoro](sons.md) |
| `ui/music-player.js`, `ui/music-loop.js` | Dois leitores musicais, crossfade de potência constante, preparação de loops e níveis, cache limitada e proteção contra cargas antigas |
| `ui/texto.js` | Nomes, formatação (DJC, × aposta) e narração de cada evento |
| `ui/regras.js` | Regras geradas a partir da configuração (`config.tables`) |
| Registo do bónus (`logEvent` em `ui/app.js`, `#event-log`) | No bónus substitui a coluna da esquerda. Limpa-se em cada free spin. Mostra prémios (símbolo + `base × multiplicador = prémio`, em DJC), despertares, fusões, Peace Police, Distintivo, cantos e Total Chemistry. **Nota do dono para a Fase 3: tem de ser visual, não texto** |
| `ui/historico.js` | Últimas 30 jogadas (localStorage), com os passos e os eventos |
| `ui/debug.js`, `ui/sim-worker.js` | Painel de diagnóstico (`?debug=1`) e Web Worker com o mesmo motor |
| `ui/kit/barra.js`, `ui/kit/barra.css` | Barra de controlos padrão, **cópia sem alterações** de `guides/kit/barra-controlos` |
| `ui/tema-barra.css` | Tema da barra: só variáveis `--deck-*` (neutro nesta fase) |
| `ui/base.css`, `ui/layout.css` | Aspeto neutro e os três desenhos. A Fase 3 acrescenta `ui/theme.css` |
| `ui/embed.js` | Ajusta o iframe ao espaço visível por baixo do menu do site |
| `carteira.html`, `ui/carteira-simulada.*` | Carteira simulada (faz de site): latência, resposta perdida, rejeição, recarregar |
| `pc.html`, `telemovel.html`, `site.html`, `index.html`, `ui/preview.*`, `ui/site.css` | Pré-visualizações |
| `scripts/serve.js` | Servidor local estático (`npm run dev`) |

## Ajustes de apresentação — 06-11-2026

O tabuleiro mantém as mesmas dimensões e posição no jogo base, AFTERPARTY, VIP AFTERPARTY e POLICE PARTY para o mesmo viewport. O título do modo e o indicador de fusão reservam espaço mesmo quando ocultos. O registo de free spins ocupa a área lateral sobre os controlos do jogo base, sem alterar a altura do palco. No telemóvel, o registo pode ser percorrido dentro dessa área. Regressão local: `node tests/board-size.browser.js` a partir da pasta do jogo, com Edge, cobre os três bónus, fusão e regresso ao jogo base em 1280 × 800, 390 × 844, 320 × 640 e 844 × 390, sem pedidos à carteira ou cloud.

A entrada comprada reutiliza as células, os materiais e o recorte da grelha normal, incluindo premium, Scatter e cantos fechados. `ctx.paintSymbol` usa o mesmo pintor do catálogo, que também define a cor da personagem nos premium. O título de entrada continua acessível, mas já não ocupa uma linha que reduza a altura das células. A composição decorativa conserva 3/4/5 Scatters, sem alterar modelo, motor ou carteira.

O Joiner reserva espaço inferior para o multiplicador e o nome, com o retrato contido na área própria. Valores com vários algarismos deixam de ocupar o rosto. Os avisos de Chemistry, poderes, Party e restantes banners acompanham a velocidade do jogo: 3 a 5 segundos em Normal, 1,5 a 2,5 segundos em Rápido e cerca de 0,8 a 1,3 segundos em Turbo, incluindo mudanças de velocidade durante o aviso e movimento reduzido. As animações continuam a seguir o relógio partilhado, e os avisos com confirmação manual mantêm esse funcionamento.

Validação dirigida: `npm.cmd run test:presentation-fixes -- --edge`. Cobre a geometria e a arte da compra nos três bónus, quatro formatos, multiplicadores ×9/×10/×25/×50/×100/×1000, tempos de leitura em Normal/Rápido/Turbo, movimento reduzido e mudança de velocidade durante o aviso. Usa fixtures de apresentação locais, sem pedidos ou alterações da carteira.

## Pontos de ligação

Para cada evento de `step.events`, por ordem, `ui/app.js` faz:

Antes de ligar a sessão, a etapa 1 da Fase 3 carrega o manifesto indicado por `meta[name="pp-art-manifest"]`, aguarda a descodificação das imagens e atualiza o progresso por recursos concluídos. Falhas preservam o fallback textual e são expostas em `window.pp.art` e na consola. A amostra integrada inclui N1, N4, P1, P5, W e retrato ativo P5; as restantes peças ainda usam apresentação textual. É integração local, sem deploy executado.

```js
aplicar(model, evento);              // o modelo passa a mostrar o estado DEPOIS do evento
fx.audio.play(evento, ctx);          // não bloqueia
await fx.visual.play(evento, ctx);   // a apresentação decide quanto tempo demora
render(); hud();                     // por segurança: a grelha fica sempre igual ao modelo
```

### `ctx`

| Campo | O que é |
|---|---|
| `ctx.model` | Modelo depois do evento: `grid[25]`, `mult{célula: ×}`, `groups[{symbol, kind, cells:Set}]`, `stickyW:Set`, `awake[]`, `fused[]`, `level`, `partyMode`, `police`, `total`, `kind`, `bonusId`, `freeSpins`, `stepWin`, `roundWin` (milésimos de aposta) |
| `ctx.before` | Cópia do modelo antes do evento (sem os grupos) |
| `ctx.board`, `ctx.cells[25]`, `ctx.flash` | Grelha do DOM, as 25 células (índice `col * 5 + row`) e a camada por cima da grelha para etiquetas |
| `ctx.render()` | Pinta o modelo nas células (só muda as células diferentes) |
| `ctx.paintSymbol(target, symbol)` | Reutiliza o pintor e as cores do catálogo para as células decorativas da entrada comprada |
| `ctx.tempo` | `{ wait(ms, skip), animate(el, frames, opts), rate }`. **Todas** as durações em ms da velocidade Normal |
| `ctx.skip()` | Sempre `false` nesta revisão: os toques não saltam a apresentação |
| `ctx.reduced` | Movimento reduzido (preferência do sistema ou interruptor nas definições) |
| `ctx.speed`, `ctx.mode`, `ctx.bet`, `ctx.scale` | Velocidade efetiva, modo atual (`base`, `hunt`, `afterparty`, `vip`, `police`), aposta em cêntimos, escala do jogo |
| `ctx.hud()`, `ctx.narrate(texto)`, `ctx.money(cêntimos)` | Atualizar o HUD, escrever na faixa de narração, formatar DJC |
| `ctx.explainFusion(evento)` | Atualiza sempre o indicador do par; na primeira apresentação no bónus mostra a explicação completa e aguarda CONTINUAR. No jogo base explica cada ocorrência |

Regra: quando `visual.play` termina, a grelha tem de mostrar `ctx.model`. A Fase 3 pode animar como quiser, mas não pode decidir resultados nem guardar estado de jogo.

`fx.audio` também recebe `ui(nome)` (sons da barra: `bet-step`, `dialog-open`, `dialog-close`, `speed`, `auto-start`, `auto-stop`, `click`, e do jogo: `spin-press`, `buy`, `hunt-on`, `hunt-off`, `overlay`), `setVolumes({ music, sfx, muted })`, `mode(modo)` e `unlock()`.

## Máquina de estados

```text
A_LIGAR → PRONTO → A_PEDIR (débito único) → A_APRESENTAR (passo n)
        → [ENTRADA_BONUS → FREE_SPINS (passo n+1…) → RESUMO_BONUS] → A_CONFIRMAR (crédito) → PRONTO
Erros: SALDO_INSUFICIENTE → PRONTO; CARTEIRA_PENDENTE (o pedido repete-se com o mesmo id) → estado anterior;
       ERRO_FATAL (aviso + RECUPERAR) → A_LIGAR → retoma
```

As transições permitidas estão em `TRANSICOES` (`ui/app.js`). Uma transição fora da tabela escreve um erro na consola, e os testes falham com qualquer erro na consola. `window.pp.transicoes` guarda as últimas 300.

Durante uma jogada ficam bloqueados: aposta, compras, aposta extra, renovar a seed e repor o saldo. Ficam ativos: velocidade, volume, regras, histórico e ecrã inteiro.

## Sessão e carteira

Interface comum: `balance`, `cost(mode, bet)`, `active`, `round`, `connect()`, `start({ mode, bet })` e `step()` → `{ step, last, totalWin }`.

- **TestSession:** 10 000 DJC de teste no `sessionStorage` (sobrevive a um reload, recomeça num separador novo). Seed criada uma vez; renovar é uma ação explícita entre jogadas (Definições ou diagnóstico). `?seed=<texto>` fixa a seed de um separador novo.
- **HostSession:** `game.html?wallet=host&parentOrigin=<origem>`. Canal `peace-police:v1`, pedidos `connect`, `start` (com `withFirstStep: true`) e `step`. Ids idempotentes: um id novo por `start`, `<roundId>-<índice>` por passo. Enquanto apresenta o passo n pede já o n+1. Um timeout (8 s; `?timeout=` nos testes) repete o pedido com o **mesmo id** até haver resposta ou rejeição definitiva. Valida a origem e a janela de cada mensagem; nunca usa `'*'`.
- O saldo mostrado fica retido até ao fim da contagem do prémio e é publicado em `html[data-casino-balance]`.
- **Integração no casino Peladinhas:** ainda não feita (decisão do dono, 03-11-2026). O site vai usar `ui/carteira-local.js` tal como está, como a Princesa Sofia usa `js/casino-sofia-local.js`: guarda `{ sessionId, revision, seed, rng, round }` e os recibos por id, e responde aos pedidos do canal.

## Ritmo e teclado

- Seletor Normal/Rápido/Turbo: taxas 1/2/3,75, guardadas pela barra. O identificador interno `ultra` corresponde ao rótulo Turbo. Pode mudar durante o spin com rampa de 100 ms; o kit continua intacto.
- ESPAÇO num único sítio (`keydown` em `ui/app.js`): com um aviso aberto = CONTINUAR; senão = spin. Campos focados e as outras janelas têm prioridade.
- 100 ms mínimos entre comandos de spin; 500 ms mínimos antes de um aviso aceitar CONTINUAR; a tecla que estava premida quando o aviso abriu não o fecha; a repetição automática nunca cria spins.
- Toques durante o spin são ignorados. Não há aceleração, salto, fila de spins nem repetição por ESPAÇO mantido. O botão pode parar um lote de autoplay, sem encurtar a jogada atual.
- Constantes no controlador: `MIN_CYCLE_MS = 0`, `TURBO_ALLOWED = true` (seletor), `HOLD_TO_SPIN = false`. Não há aceleração automática por toque nem repetição por tecla mantida. Estas escolhas não alteram resultados nem probabilidades.

## Compra e desbloqueio — revisão Acidwave

Revisão de identidade e leitura: DW conserva o significado de Distintivo do motor, mas a arte é o retrato JOINER WILD baseado na referência autorizada. W/CW/DW têm rótulos funcionais explícitos; são exceções aos nomes escondidos dos símbolos pagantes. Introduções montam cartões a partir de `step.events[0].awake`; as regras do bónus só indicam Fusão Ativa. Cada fusão inicial é explicada em dialog próprio antes de começar. `ui/fusion-copy.js` partilha o efeito e limites com as regras e acrescenta condição, funcionamento e duração na explicação detalhada. Movimento reduzido e Turbo não encurtam a leitura manual. Em ecrãs baixos o dialog permite scroll vertical e mantém a ação acessível.

`presentation-state` guarda quais as fusões já explicadas no bónus. A chave local `pp-visual-bonus` contém apenas id da jogada e flags de UI; a retoma só recupera o snapshot do mesmo id. Uma nova jogada limpa a memória. Cada evento `fusion.trigger` atualiza e anima `#fusion-indicator`, colocado fora do tabuleiro; repetições no mesmo bónus não abrem o dialog. O jogo base continua a anunciar/explicar cada ocorrência.

No POLICE PARTY, a primeira ocorrência real de `police.joiner.party_mode` liga a continuidade visual. Nos `step.start` seguintes, o modelo continua fiel aos eventos, mas o HUD não pisca OFF. Anúncios Joiner/Party repetidos são omitidos; a colocação do novo DW de cada spin continua visível. O motor já aplica Party antes das cascatas de cada spin: não se alterou matemática. O par da última fusão ativa define `--party-a`/`--party-b` para o degradê e o indicador usa as duas cores das personagens.

Na entrada comprada, os quatro cadeados continuam visíveis e reagem com brilho/movimento. Não se inventam posições abertas: os CW iniciais são apresentados pela grelha real do primeiro spin. O registo usa miniaturas e multiplicadores contidos nas próprias linhas, com scroll local; cinzento/colorido e marcas acessíveis distinguem poderes inativos/ativos.

`buy-dialog` seleciona e `buy-confirm` confirma: dois dialogs independentes, nunca abertos em simultâneo. Ao selecionar, fecha-se a seleção antes de abrir a confirmação. Cancelar ou Escape regressa à seleção sem pedido nem débito. A confirmação conserva uma fotografia de modo, aposta e preço; revalida estado, preço e saldo antes de chamar o mesmo `runRound`. O pending é consumido uma só vez; confirmação fechada não aceita ações programáticas prematuras.

Depois de `session.start` aceitar a compra, `visual.buy` apresenta cinco colunas com símbolos em trânsito, paragens progressivas e exatamente 3/4/5 Scatters conforme a configuração do modo. `purchaseEntry` deriva composição e tempos do id da jogada e bónus, com mistura e permutação locais. É apenas decoração da entrada já comprada: não entra no modelo, carteira ou RNG do motor, não paga e não simula um spin base. Retoma não repete esta entrada nem o débito. A sequência sai antes da introdução do bónus; os eventos reais continuam a ser apresentados pela ordem recebida.

Em `corner.open`, o DOM ainda fechado é copiado antes de pintar o CW do evento por baixo. A chave aproxima-se, entra, roda; a argola abre, as duas metades das correntes afastam-se e o conjunto desvanece. Todas as peças e animações são removidas em `finally`. Movimento reduzido usa opacidade curta. Premium usam recorte de margens transparentes por CSS, sem distorcer imagens; multiplicadores e fitas HOLD/STICKY mantêm significado e nomes acessíveis.

Validação dirigida: `npm.cmd run test:acidwave -- --edge`. Inclui quatro formatos, cancelamento, preferências antigas, cliques repetidos, compras dos três bónus até ao saldo final e desbloqueio real de um cenário do motor.

## Desenhos

| Desenho | Largura de referência | Quando |
|---|---|---|
| `landscape` | 1120 | computador |
| `portrait` | 400 | ecrã alto (telemóvel ao alto, iPad vertical) |
| `compact` | 1100 | baixo e largo (telemóvel na horizontal) |

Escala máxima 1,6. Abaixo de 1 os rótulos pequenos são reforçados (`--ui-boost`, máximo 1,6). O ajuste conserva o reforço anterior quando a diferença candidata é inferior a 0,005, evitando oscilações de quebra de linha no ResizeObserver; o cálculo final continua a verificar os limites do viewport. Nunca há scroll: o teste `tamanhos` mede `scrollWidth/scrollHeight` em 10 tamanhos, no jogo inteiro e dentro de `site.html`.

## Diagnóstico (`?debug=1`)

Seed (ver, definir, renovar), cenários forçados do motor (`scenarioNames()`), «procurar e jogar» (procura num Web Worker a primeira seed com retrigger, ganho grande, sem prémio, limite, Calmer, Joiner, Total Chemistry ou bónus, e apresenta essa jogada real do motor), passo a passo, registo de eventos com narração, JSON do passo e do estado, simulação rápida no Worker e desempenho (FPS, tarefas longas, latência da carteira). `?perf=1` mostra só o desempenho. O jogo encolhe para o painel não tapar nada.

## Ecrã (revisão do dono, 03-11-2026)

- Coluna da esquerda no jogo base: COMPRAR BÓNUS, MAIS SCATTERS e Peace Police. No bónus: registo de eventos da rodada. O nome e o contador ficam apenas no topo, sem painel duplicado.
- Palco ao centro com o néon **PARTY MODE · ON/OFF** no topo; ligado, a moldura brilha (sem animação em movimento reduzido).
- À direita: as 5 cartas de Chemistry (estado, poder ou fusão, e a fusão que cada uma geraria a seguir) e a dica do próximo nível. No desenho vertical não há largura: ficam numa linha por cima do palco.
- A narração de cada evento continua a existir (`narracao` no painel de diagnóstico e no histórico), mas já não há faixa de texto no ecrã.
- Barra do kit: SALDO | GANHO | APOSTA.


## Contas de prémios na apresentação

`clusterEquation` em `ui/texto.js` usa os valores fornecidos pelo evento. A base em DJC conserva a precisão necessária até cinco casas antes do multiplicador; o resultado segue `winCents` e a apresentação monetária existente. Mostra `=` quando exato, `≈` quando há arredondamento visual a cêntimos e `→ … (limite)` quando o pagamento foi cortado. Não muda prémios, saldos, eventos nem a matemática. O registo usa imagens dos símbolos e retratos quando disponíveis, com nomes acessíveis e texto como fallback.

A pintura de símbolos e retratos reutiliza a imagem quando a origem não mudou; alterações de símbolo ou estado ativo continuam a substituir a arte correspondente. Aliases de moldura com a mesma origem preservam o elemento visual.


## Introdução às personagens

Depois de carregar a arte e antes de ligar a sessão ou retomar uma jogada, a introdução apresenta WEED, ALCOOL, COPIUM, MDMA, LCD e Peace Police. Reutiliza a arte aprovada, os tokens Acidwave e os textos de ajuda; não pede jogadas nem altera o motor. Cada cena aguarda 1,5 segundos reais, independentemente de Normal/Rápido/Turbo, antes de revelar CONTINUAR; a última mostra JOGAR. A leitura é manual, com quatro instruções curtas sempre visíveis, teclado e movimento reduzido.

A opção «Não voltar a mostrar esta introdução» aparece no fim. Só é guardada ao clicar em JOGAR, na chave local `pp-intro-v1-hidden`. Sem a opção, a sequência reaparece em cada abertura; a preferência aplica-se apenas ao navegador/perfil atual. Se o armazenamento não estiver disponível, a introdução continua funcional, mas pode reaparecer.

Validação local: `npm.cmd run test:intro -- --edge` verifica as seis cenas, espera mínima, teclado, quatro formatos, detalhes e persistência.

A grelha de entrada é uma composição decorativa de 21 símbolos premium, com 16 LCD destacados a formar um coração. Os quatro cantos mantêm-se fechados. A composição não passa pelo motor nem gera prémios; o primeiro pedido substitui-a pelos eventos reais e remove o destaque. O painel Peace Police em espera mostra «DE OLHO NA FESTA», com tipografia Acidwave.


As apresentações dos bónus usam `bonusBrief` e as das fusões usam `fusionBrief`, com resumos para leitura rápida. As regras mantêm `bonusDescription` e `fusionDescription` com o detalhe completo. A confirmação manual e a memória das fusões já explicadas mantêm-se.


O nome apresentado para DW é apenas «Joiner», incluindo o símbolo, regras, apresentações e registo. Os identificadores internos `DW` e `DISTINTIVO` mantêm-se por compatibilidade. Os blocos de descrição usam fundos escuros com 96 % de opacidade para proteger a leitura da arte decorativa.


O título de modo é mostrado apenas nos bónus, centrado no topo e com cor própria de AFTERPARTY, VIP AFTERPARTY ou POLICE PARTY. O anúncio Party Mode identifica o Joiner como wild que multiplica o multiplicador do grupo.


No telemóvel vertical, a área da grelha ocupa o espaço disponível entre Chemistry e os controlos, sem linha vazia reservada abaixo. O encaixe respeita `safe-area-inset-*`. A pré-visualização transmite margens simuladas ao iframe para a notch e a base do aparelho, também quando existe a simulação do menu do site. iPhone SE e iPad não mostram uma notch fictícia.


O cabeçalho duplicado do registo do bónus foi removido. O contador continua no título superior, o ganho continua nos controlos e o total do bónus aparece no resumo final. O registo de eventos é preservado. Efeitos e músicas estão implementados para revisão, com estado e limitações em [sons.md](sons.md).
