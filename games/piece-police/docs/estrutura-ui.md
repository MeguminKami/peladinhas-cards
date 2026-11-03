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
| `ui/tempo.js` | Relógio único: `wait(ms, skip)`, `animate(el, frames, opts)`, `setRate`, `currentRate`, `flushWaits`, turbo automático |
| `ui/layout.js` | Escolhe o desenho (`landscape` / `portrait` / `compact`) e escala o jogo inteiro |
| `ui/fx-visual.js` | **Ponto de ligação visual** (a Fase 3 substitui) |
| `ui/fx-audio.js` | **Ponto de ligação de som** (a Fase 4 substitui). Nesta fase não toca nada |
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

## Pontos de ligação

Para cada evento de `step.events`, por ordem, `ui/app.js` faz:

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
| `ctx.tempo` | `{ wait(ms, skip), animate(el, frames, opts), rate }`. **Todas** as durações em ms da velocidade Normal |
| `ctx.skip()` | `true` quando o jogador saltou o resto do spin (3.º toque): terminar já |
| `ctx.reduced` | Movimento reduzido (preferência do sistema ou interruptor nas definições) |
| `ctx.speed`, `ctx.mode`, `ctx.bet`, `ctx.scale` | Velocidade efetiva, modo atual (`base`, `hunt`, `afterparty`, `vip`, `police`), aposta em cêntimos, escala do jogo |
| `ctx.hud()`, `ctx.narrate(texto)`, `ctx.money(cêntimos)` | Atualizar o HUD, escrever na faixa de narração, formatar DJC |

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

Durante uma jogada ficam bloqueados: aposta, compras, aposta extra, renovar a seed e repor o saldo. Ficam ativos: volume, regras, histórico, velocidade e ecrã inteiro.

## Sessão e carteira

Interface comum: `balance`, `cost(mode, bet)`, `active`, `round`, `connect()`, `start({ mode, bet })` e `step()` → `{ step, last, totalWin }`.

- **TestSession:** 10 000 DJC de teste no `sessionStorage` (sobrevive a um reload, recomeça num separador novo). Seed criada uma vez; renovar é uma ação explícita entre jogadas (Definições ou diagnóstico). `?seed=<texto>` fixa a seed de um separador novo.
- **HostSession:** `game.html?wallet=host&parentOrigin=<origem>`. Canal `peace-police:v1`, pedidos `connect`, `start` (com `withFirstStep: true`) e `step`. Ids idempotentes: um id novo por `start`, `<roundId>-<índice>` por passo. Enquanto apresenta o passo n pede já o n+1. Um timeout (8 s; `?timeout=` nos testes) repete o pedido com o **mesmo id** até haver resposta ou rejeição definitiva. Valida a origem e a janela de cada mensagem; nunca usa `'*'`.
- O saldo mostrado fica retido até ao fim da contagem do prémio e é publicado em `html[data-casino-balance]`.
- **Integração no casino Peladinhas:** ainda não feita (decisão do dono, 03-11-2026). O site vai usar `ui/carteira-local.js` tal como está, como a Princesa Sofia usa `js/casino-sofia-local.js`: guarda `{ sessionId, revision, seed, rng, round }` e os recibos por id, e responde aos pedidos do canal.

## Ritmo e teclado

- Velocidades Normal / Rápido / Ultra (fatores 1 / 0,5 / 0,2 das durações), guardadas pela barra.
- ESPAÇO num único sítio (`keydown` em `ui/app.js`): com um aviso aberto = CONTINUAR; senão = spin. Campos focados e as outras janelas têm prioridade.
- 100 ms mínimos entre comandos de spin; 500 ms mínimos antes de um aviso aceitar CONTINUAR; a tecla que estava premida quando o aviso abriu não o fecha; a repetição automática nunca cria spins.
- Toques durante o spin: 1.º acelera 3× (rampa suave), 2.º 8× e deixa a jogada seguinte pronta, 3.º salta o resto desse spin (nunca o bónus inteiro). Turbo automático com toques rápidos ou ESPAÇO premido.
- Constantes de mercado regulado no topo de `ui/app.js`: `MIN_CYCLE_MS`, `TURBO_ALLOWED`, `HOLD_TO_SPIN` (Reino Unido: 2500 / false / false).

## Desenhos

| Desenho | Largura de referência | Quando |
|---|---|---|
| `landscape` | 1120 | computador |
| `portrait` | 400 | ecrã alto (telemóvel ao alto, iPad vertical) |
| `compact` | 1100 | baixo e largo (telemóvel na horizontal) |

Escala máxima 1,6. Abaixo de 1 os rótulos pequenos são reforçados (`--ui-boost`, máximo 1,6). Nunca há scroll: o teste `tamanhos` mede `scrollWidth/scrollHeight` em 10 tamanhos, no jogo inteiro e dentro de `site.html`.

## Diagnóstico (`?debug=1`)

Seed (ver, definir, renovar), cenários forçados do motor (`scenarioNames()`), «procurar e jogar» (procura num Web Worker a primeira seed com retrigger, ganho grande, sem prémio, limite, Calmer, Joiner, Total Chemistry ou bónus, e apresenta essa jogada real do motor), passo a passo, registo de eventos com narração, JSON do passo e do estado, simulação rápida no Worker e desempenho (FPS, tarefas longas, latência da carteira). `?perf=1` mostra só o desempenho. O jogo encolhe para o painel não tapar nada.

## Ecrã (revisão do dono, 03-11-2026)

- Coluna da esquerda no jogo base: COMPRAR BÓNUS, MAIS SCATTERS e Peace Police. No bónus: contador de free spins e ganho do bónus, e por baixo o registo do spin.
- Palco ao centro com o néon **PARTY MODE · ON/OFF** no topo; ligado, a moldura brilha (sem animação em movimento reduzido).
- À direita: as 5 cartas de Chemistry (estado, poder ou fusão, e a fusão que cada uma geraria a seguir) e a dica do próximo nível. No desenho vertical não há largura: ficam numa linha por cima do palco.
- A narração de cada evento continua a existir (`narracao` no painel de diagnóstico e no histórico), mas já não há faixa de texto no ecrã.
- Barra do kit: SALDO | GANHO | APOSTA.
