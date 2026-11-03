# Barra de controlos padrão

A barra por baixo do tabuleiro da Princesa Sofia é o **padrão de todas as slots**. A estrutura, a disposição nos três desenhos e o comportamento são sempre iguais. Para cada jogo só mudam as cores, as fontes, as formas e o glifo da velocidade, através de um tema.

Pré-visualização: com um servidor local na raiz do repositório, abrir `games/guias-slot/kit/barra-controlos/demo.html`. A página permite escolher o desenho e o tema.

| Ficheiro | Papel | Pode mudar por jogo? |
| --- | --- | --- |
| `barra.js` | Desenha a barra e trata do comportamento dela | **Não.** Copia-se sem alterações |
| `barra.css` | Estrutura, os três desenhos e a pele ligada a variáveis | **Não.** Copia-se sem alterações |
| `tema-sofia.css` | Tema de referência (o aspeto aprovado) | É o modelo do tema |
| `tema-exemplo-neon.css` | Prova de que outro jogo muda só variáveis | Exemplo |
| `demo.html` | Pré-visualização | — |
| `../verificar-kit.mjs` | Confirma que um jogo usa o kit sem alterações | — |

## Anatomia (fixa)

```text
DESENHO DE COMPUTADOR (landscape)
[ⓘ] [♪ Música ━━○ / Efeitos ━━○]  SALDO 10 000,00 DJC   GANHO 0,00 DJC   APOSTA 1,00 DJC   [−] (⟳ 1,00 DJC) [+]  [✦✦✦ Normal]
                                                                                         AUTOPLAY
VERTICAL (portrait)                      COMPACTO (compact, coluna à direita)
SALDO       GANHO      APOSTA         [ⓘ] [♪ Música/Efeitos]
10 000,00 DJC        0,00 DJC            SALDO 10 000,00 DJC
     [−] (⟳ 1,00 DJC) [+]                GANHO 0,00 DJC
          AUTOPLAY                        [−] (⟳) [+]
[ⓘ] [♪ Música/Efeitos]      [✦✦✦]          AUTOPLAY
                                          [✦✦✦ Normal]
```

- **Regras (ⓘ):** abre as regras do jogo (`onRules`).
- **Som:** o botão liga e desliga o silêncio geral. Há duas barras, Música e Efeitos, com curva quadrática. Ficam guardadas no browser (`<storageKey>-volume`).
- **SALDO**, **GANHO** e **APOSTA** em moeda formatada `pt-PT`, sempre com algarismos alinhados, a aposta à direita do ganho (acrescentada a 03-11-2026, pedido do dono no Peace Police). O ganho também é anunciado como «N× a aposta» para leitores de ecrã. A aposta é a que a barra tem selecionada (`setBet`/−/+).
- **− / +:** percorrem a escada de apostas. Ficam bloqueados durante uma jogada, durante o autoplay e nos extremos.
- **RODAR:** mostra o custo real da jogada. Durante uma jogada o custo desaparece e o rótulo acessível passa a «Acelerar». Com o autoplay ligado passa a «Parar auto». O botão nunca decide nada: chama `onSpin({ running, autoRunning })` e o jogo trata do turbo, do salto e da paragem.
- **AUTOPLAY:** aba em meia-lua por baixo do Rodar. Abre uma pequena janela por cima da barra com a quantidade (10–100 de 10 em 10, depois 200–500), Cancelar e Iniciar. Com o autoplay ligado, a aba diz «Parar auto».
- **Velocidade:** Normal → Rápido → Ultra, com 1, 2 ou 3 glifos acesos, cor própria em cada velocidade, e fica guardada. `setTurbo(true)` mostra «Turbo».
- **Aposta extra ativa** (Hunt/Ante): `setExtraActive(true)` muda o fundo e a borda da barra.

## Como um jogo usa a barra

1. Copia `barra.js` e `barra.css` **sem alterações** para `<jogo>/ui/kit/`.
2. Cria `<jogo>/ui/tema-barra.css` só com `:root{ --deck-…: … }` e, se precisar, `@font-face`. Começa por copiar `tema-sofia.css` e muda os valores.
3. No `game.html`, carrega `ui/kit/barra.css` e depois `ui/tema-barra.css`, e põe `<div id="deck-slot"></div>` por baixo do tabuleiro.
4. No `ui/app.js`:

```js
import { createControlDeck } from './kit/barra.js';
const deck = createControlDeck(document.getElementById('deck-slot'), {
  bets: BET_UNITS, bet: betUnits, currency: 'DJC', unitsPerCredit: 100, storageKey: 'nome-do-jogo',
  onSpin: pressSpin,                       // o jogo decide: rodar, acelerar, saltar ou parar o auto
  onBetChange: bet => { betUnits = bet; deck.setCost(session.cost(mode, bet)); },
  onAutoStart: count => startAuto(count),  onAutoStop: stopAuto,
  onSpeedChange: speed => tempo.setSpeed(speed),
  onVolumeChange: v => fx.audio.setVolumes(v), // { music, sfx, muted } já com a curva aplicada
  onRules: openRules,  onUiSound: name => fx.audio.ui(name),
  canAutoStart: count => session.balance >= session.cost(mode, deck.bet),
});
// O jogo informa a barra:
deck.setBalance(units); deck.setWin(units, multiple); deck.setCost(units);
deck.setState({ running, autoRunning, locked, ready }); deck.setTurbo(on); deck.setExtraActive(on);
```

5. O `layout.js` do jogo põe `data-layout="landscape|portrait|compact"` num antecessor da barra (ex.: `.shell`). A barra reorganiza-se sozinha. Se o desenho compacto tiver o logótipo sobreposto ao topo da coluna, o tema define `--deck-compact-top`.
6. Confirma com `node games/guias-slot/kit/verificar-kit.mjs games/<jogo>`.

Os sons de interface (`onUiSound`) têm estes nomes: `bet-step`, `dialog-open`, `dialog-close`, `speed`, `auto-start`, `auto-stop` e `click`.

## O que o tema pode mudar

Só as variáveis `--deck-*` definidas no topo de `barra.css`:

- **Fontes:** `--deck-font`, `--deck-font-label`.
- **Texto:** `--deck-text`, `--deck-text-muted`, `--deck-value`, `--deck-focus`.
- **Barra:** `--deck-bg`, `--deck-border`, `--deck-radius`, `--deck-shadow`; com a aposta extra ativa, `--deck-extra-bg` e `--deck-extra-border`.
- **Botões redondos:** `--deck-btn-*`.
- **Rodar:** `--deck-spin-*`, incluindo `--deck-spin-cost-size`, a reduzir em fontes largas para «1,00 DJC» caber numa linha.
- **Aba Autoplay:** `--deck-auto-*`.
- **Velocidade:**
  - forma: `--deck-speed-shape` e `--deck-speed-inner-shape`;
  - glifo: `--deck-speed-glyph`, por exemplo `"✦"` ou `"▲"`;
  - cores das três velocidades: `--deck-speed-*`, `--deck-speed-fast-*` e `--deck-speed-ultra-*`.
- **Barras deslizantes:** `--deck-range-*`.
- **Janela do Autoplay:** `--deck-dialog-*`.
- **Desenho compacto:** `--deck-compact-top`.

Para além das variáveis, o jogo pode trocar o pequeno brilho de assinatura dos ícones com a opção `signature`: um `<path id="deck-spark" …/>` próprio, ou `''` para não ter brilho.

**O tema não pode** ter seletores próprios, mudar tamanhos ou posições, esconder botões nem acrescentar controlos. Se uma slot precisar de algo que a barra não tem, a melhoria é feita **aqui, no kit**, testada no `demo.html` com os três desenhos e os dois temas, e depois copiada para todos os jogos.

## Fora da barra (cada jogo decide)

O botão de compra de bónus, o painel de free spins, o multiplicador e os poderes ficam na coluna lateral ou na faixa do jogo, não na barra. O ecrã inteiro fica na barra superior do jogo.
