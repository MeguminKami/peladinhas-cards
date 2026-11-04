# Catálogo de eventos e API do motor

> Atualizado na Fase 2 (03-11-2026): `grid.drop.mult`, `power.rave_rush.move.symbol`, `power.slow_motion.grow.symbol` e `power.slow_motion.start` com `kind: 'frozen'`. Só acrescentam informação: os resultados são os mesmos.

> Contrato entre o motor (Fase 1) e a apresentação (Fases 2, 3 e 4). A interface **só** usa estes eventos, pela ordem em que vêm. Nunca volta a sortear e nunca deduz acontecimentos comparando grelhas.

## API pública (`src/index.js`)

```js
import { config, MATH_VERSION, CONFIG_HASH, playRound, newState, seedState, scenario, scenarioNames } from './src/index.js';

newState(seed)                 // -> { rng, seed }   (o saldo real é da carteira, não do motor)
playRound(rngState, request)   // request: { bet, mode, roundId? }
                               //   bet: cêntimos (um de config.bets)
                               //   mode: 'base' | 'hunt' | 'buy-afterparty' | 'buy-vip' | 'buy-police'
// -> { roundId, version, mode, bet, cost, costMils, steps: [Step], totalWin, totalWinMils, capped, forced, rngAfter }
scenario(name, { seed?, bet? }) // diagnóstico (forced: true). Lista: scenarioNames()
```

- **Unidades.** `cost` e `totalWin` estão em cêntimos (`totalWin = floor(bet × totalWinMils / 1000)`). Os campos `pay`, `basePay`, `win` e `totalWin*Mils` estão em **milésimos de aposta base** (1000 = 1×).
- **Jogada completa.** A ronda fica resolvida no início e é entregue em passos. A carteira debita `cost` uma vez e credita `totalWin` no fim. Para retomar depois de um reload, guarda-se a ronda (ou o estado do RNG mais `version`).
- **Step** = um spin visível: `{ index, kind: 'base'|'bonus', bonusId, events: [Evento], win, roundWinSoFar, freeSpins: { played, total } | null }`.
- **Células.** O índice é `col * 5 + row`, com `col` 0..4 da esquerda para a direita e `row` 0..4 de cima para baixo. Os cantos são 0, 20, 4 e 24.
- **Grelhas** (`grid`): array de 25 IDs (`'N1'…'P5'`, `'W'`, `'CW'`, `'DW'`, `'S'`), `'X'` para canto fechado e `''` para vazio.

## Eventos

| Evento | Campos | Quando |
|---|---|---|
| `step.start` | `kind`, `bonusId`, `freeSpins`; no bónus também `awake`, `fused`, `corners` | Início de cada spin visível |
| `grid.drop` | `grid`, `mult` | Grelha inicial do spin. `mult` = `{ célula: × }` dos Wilds de Canto e Distintivos já no tabuleiro (cantos que persistem no bónus, cenários) |
| `win.cluster` | `symbol`, `cells`, `size`, `basePay`, `multiplier`, `pay`, `growthFrom`, `groupFinal?`, `startSize?`, `attrib` | Cada prémio, pela ordem de pagamento (maior primeiro). `groupFinal: true` = pagamento único do grupo sticky pelo tamanho final (`startSize` = com quantas células nasceu) |
| `cap.hit` | `limit`, `cut` | O ganho máximo cortou o prémio anterior |
| `multiplier.change` | `cell`, `from`, `to` | Um Wild de Canto cresceu, ou o Total Chemistry duplicou um multiplicador |
| `persona.awaken` | `persona`, `kind: 'awaken'\|'refire'`, `cluster`, `fusion`, `party` | Personagem desperta (ou volta a disparar, no bónus) |
| `fusion.trigger` | `fusionId`, `pair`, `persona`, `surprise?` | Logo a seguir ao `persona.awaken` que funde. **Fusão surpresa** (pp-v6): logo a seguir ao `grid.drop`, com `persona: null` e `surprise: true` |
| `grid.remove` | `cells` | Símbolos que saem (vencedores não-sticky e grupos sticky que dissolvem) |
| `grid.refill` | `grid`, `newCells` | Depois da gravidade e da entrada de símbolos novos |
| `power.reality_break` | `target`, `cells`, `party` | LCD transforma células |
| `power.slow_motion.start` | `cells`, `symbol`, `party`, `kind: 'weed'\|'freeze'\|'frozen'` | Um grupo fica sticky (`frozen` = cada grupo de células transformadas pelo FROZEN REALITY) |
| `power.slow_motion.grow` | `cells`, `newSize`, `symbol` | O grupo sticky cresce. Conversão: `cells` = as Lava lamps que passam a `symbol`. Fusão de clusters: `cells` = o grupo inteiro (os símbolos já são do tipo) |
| `power.slow_motion.end` | `cells` | O grupo sticky dissolve (não cresceu) |
| `power.rave_rush.move` | `from`, `to`, `symbol`, `swapped`, `copy`, `transform?` | Cada movimento do MDMA (também FREEZE & FREAK, ONE MORE RAVE). `to` passa a `symbol`; `from` passa a `swapped` (exceto com `copy`). `from = -1` e `transform: true` quando é uma Coluna de som que se transforma em `symbol` |
| `power.drunk_walk.step` | `walker`, `cell`, `sticky`, `jump?`, `from?` | Cada wild do rasto. `walker` pode ser `'espelho'`, `'slow_disaster'` ou `'total_mayhem'` (salto) |
| `power.one_more_chance.armed` | `mods` | COPIUM armado para o fim da sequência (mods: `neverEnding`, `oneMoreRound`, `dreamGlitch`, `oneMoreRave`) |
| `power.one_more_chance.respin` | `held`, `revealed`, `symbol`, `grid`, `mods` | Cada respin do COPIUM (o `grid` já é o resultado) |
| `wild.place` | `cell`, `multiplier`, `source: 'DISTINTIVO'\|'ONE_MORE_ROUND'` | Distintivo do Peace Police ou wild do ONE MORE ROUND |
| `chemistry.level` | `from`, `to` | O nível de Chemistry mudou |
| `corner.open` | `cell`, `multiplier` | Um Party Corner abre com um Wild de Canto |
| `chemistry.total` | — | TOTAL CHEMISTRY (nível 5) |
| `police.enter` | `mode: 'calmer'\|'joiner'` | O Peace Police entra |
| `police.calmer.arrest` | `cells` | Calmer prende os baixos (segue-se um `grid.refill`) |
| `police.joiner.party_mode` | `personas`, `badge: { cell, multiplier } \| null` | Joiner: Party Mode e Distintivo |
| `bonus.trigger` | `bonusId`, `scatters`, `freeSpins` | No fim do spin base que ativa o bónus |
| `bonus.retrigger` | `scatters`, `added`, `total` | Free spins acrescentados |
| `bonus.end` | `bonusId`, `totalWin`, `spins` | Último free spin |
| `safety.stop` | `cycles` | Limite de segurança anti-loop. Não deve acontecer: há um teste que o garante |
| `step.end` | `win`, `roundWinSoFar` | Fim do spin |

## Ordem típica dentro de um spin

```text
step.start → grid.drop → [police.enter + police.joiner.party_mode]  (só no POLICE PARTY)
  repetir:
    win.cluster* → [cap.hit] → multiplier.change*   (o cluster que cria um grupo sticky não paga aqui)
    → (persona.awaken → [fusion.trigger] → [power.slow_motion.start])*
    → grid.remove → grid.refill
    → para cada despertar: power.* → [chemistry.level → corner.open* → chemistry.total]
                           → [police.enter → police.calmer.arrest → grid.refill | police.joiner.party_mode → power.*]
    → efeitos contínuos: power.slow_motion.grow / power.rave_rush.move / power.drunk_walk.step
  fim da sequência: [power.one_more_chance.respin → repetir ...]* → win.cluster (groupFinal) dos grupos ainda vivos
→ [bonus.trigger | bonus.retrigger] → [bonus.end] → step.end
```

## Invariantes (testadas em `tests/motor.test.js`)

- A soma dos `pay` dos `win.cluster` de um passo é igual a `win`. A soma dos `win` dos passos é igual a `totalWinMils`.
- A soma de `attrib` de cada `win.cluster` é igual ao seu `pay`.
- `totalWinMils` nunca passa de `config.maxWinMils`. Quando `capped`, é exatamente igual.
- Todos os eventos emitidos pertencem a este catálogo.
- Nunca há `safety.stop` em 20 000 jogadas aleatórias de todos os modos.
- **A interface consegue acompanhar tudo só com os eventos:** `tests/modelo.test.js` aplica-os por ordem ao modelo da interface (`ui/modelo.js`) e confirma, em milhares de jogadas de todos os modos e em todos os cenários, que o modelo bate certo com cada grelha completa, com as células e o multiplicador de cada prémio e com a soma dos prémios.

## `attrib` (para estatística, não para a UI)

Lista de pares `[índiceDaEtiqueta, mils]` que divide o prémio pelas origens das células: `natural`, cada poder, cada fusão, `CALMER`, e `mult:CW` / `mult:DW` para a parte acima de ×1. Os nomes estão em `TAGS` (`src/config.js`).
