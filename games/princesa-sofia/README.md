# Motor Princesa Sofia

Motor e protótipo local ligados, sem Firebase ou carteira real. A configuração atual é `sofia-xp-evolution-6-52-25-v2`, com pagamentos por modo e validação local descrita abaixo. Os relatórios antigos preservam as configurações anteriores; o RTP real continua sem certificação estatística para a meta de 96%–99%.

## Abrir o protótipo

```powershell
npm.cmd run dev
```

Abrir `http://127.0.0.1:4175`: uma página branca incorpora a slot de [game.html](game.html) num iframe responsivo. O botão no canto superior direito alterna entre widget e ecrã inteiro, preservando a jogada; o modo expandido aproveita mais largura. Para incorporar noutro contentor, permitir fullscreen no iframe e configurar a política `frame-ancestors` para a origem autorizada. O servidor só escuta no computador local e a página não faz pedidos externos. Disponibiliza três velocidades, regras e pagamentos, volume/silêncio, compra de bónus, Hunt, ajuste de aposta, spin e autoplay com a seleção 10–100 de dez em dez e 200–500 de cem em cem. Os cenários de demonstração são locais e não alteram o saldo normal. Recarregar reinicia os 10 000 créditos de teste.

O [mapa da etapa 2](02-prototipo-visual-estrutura.md) documenta dimensões, áreas, estados, animações e assets reservados para a arte final. Este é um primeiro protótipo estrutural, ainda sujeito à opinião do utilizador.

A estrutura atual tem slot horizontalmente alargada, XP por cima e wilds elevados à esquerda. A barra inferior junta info, som, saldo e ganho à esquerda; aposta, −/Rodar/+, autoplay e velocidade à direita. O botão Bónus abre Hunt, comum, super e secret, com ajuste de aposta no topo. As explicações e demonstrações ficam nas regras. A revisão preserva a matemática.

Teste de browser: `npm.cmd run test:ui`. Reutiliza o Playwright instalado no repositório e um Chromium disponível; no Windows, aceita o Edge instalado como alternativa. Não instala browsers automaticamente.

## Executar

A partir desta pasta, usando Node.js 22:

```powershell
npm.cmd test
npm.cmd run simulate -- --mode all --count 1000 --seed 20261030 --out pilot.json
```

Sem `--count`, o modo `all` executa 1 000 000 de apostas base e 100 000 compras de cada bónus:

```powershell
npm.cmd run simulate -- --mode all --seed 20261031 --out validation.json
```

Também é possível escolher `--mode base`, `common`, `super` ou `secret`. `--count` aplica a quantidade indicada a cada modo selecionado; não conta cascatas nem free spins como novas compras. Seeds são inteiros de 0 a 4 294 967 295. O modo `all` usa seeds diferentes entre populações. A saída identifica a configuração por versão e SHA-256 e inclui RTP normalizado, RTP após arredondamento de créditos, intervalos aproximados, contribuições, percentis e métricas de mecânicas. `precisionGatePassed` é apenas uma verificação numérica do intervalo, não uma certificação de cobertura de eventos raros.

Para simular apenas Bonus Hunt:

```powershell
npm.cmd run simulate -- --mode hunt --count 1000000 --seed 20270221 --out hunt-rtp-validation.json
```

`hunt` cobra 4× a aposta base uma única vez e aplica às cinco probabilidades de scatter do base um fator de 1,94, arredondado à unidade por milhão, no preenchimento inicial e nas cascatas. O utilizador autorizou aumentar este fator de 1,53 para aproximar o RTP da meta; a frequência de bónus deixou de estar limitada ao objetivo anterior de 3×. Quando entra num bónus, usa as regras e probabilidades normais desse bónus. Pagamentos, XP e MAX WIN continuam referidos à aposta base, sem multiplicar por quatro. O modo `all` mantém as quatro populações anteriores; `hunt` é selecionado explicitamente.

Usar `--bet-units` para testar o arredondamento numa aposta inteira de unidades de crédito. O padrão é 100: cada centésimo da aposta corresponde exatamente a uma unidade, sem perda adicional na liquidação. Com apostas menores, o RTP liquidado pode ser inferior ao normalizado.

## Configuração e unidades

[src/config.js](src/config.js) é a fonte executável de pesos, 240 pagamentos (60 por modo), XP, scatters, pares, preços e limites. É imutável. Os valores monetários normalizados terminados em `100` representam centésimos da aposta: `paid100 = 123` significa 1,23×. XP usa também centésimos. Probabilidades usam partes por milhão, com soma de pesos igual a 1 000 000.

Para experiências de calibração, clonar a configuração, alterar parâmetros e atribuir nova versão antes de criar o motor. O motor copia, valida e congela a sua configuração; alterações posteriores ao objeto de origem não afetam uma jogada em curso. Não alterar probabilidades em função do jogador ou do histórico.

Preços atuais em afinação: comum 80×, super 225× e secret 316×. As compras entram diretamente nos 12 free spins, sem spin de gatilho ou pagamento de entrada. O estado regista um custo único; este motor não movimenta um saldo externo.

## API

Importar a API de [src/index.js](src/index.js):

```js
import { createEngine } from './src/index.js';

const engine = createEngine({ seed: 123 });
const result = engine.play({ mode: 'base', betUnits: 100, trace: true });
console.log(result.settlement, result.events);

const purchase = engine.play({ mode: 'super', betUnits: 100 });
console.log(purchase.state, purchase.settlement);

const hunt = engine.play({ mode: 'hunt', betUnits: 100 });
console.log(hunt.settlement.costUnits); // 400
```

`play` resolve a aposta completa, incluindo o bónus natural e retriggers, quando existirem. Sem `trace`, omite os eventos para simulação. Não mistura o preço de compra com o denominador de um bónus natural. `settlement` contém custo, crédito, resultado líquido e MAX WIN; não volta a somar o prémio acumulado.

Para conduzir a futura apresentação um spin de cada vez:

```js
let state = engine.start({ mode: 'secret', betUnits: 100 });
while (!state.complete) {
  const step = engine.step(state);
  state = step.state;
  // Apresentar step.events por ordem, sem voltar a sortear o resultado.
}
```

Cada `step` resolve um spin com todas as suas cascatas. O estado publicado é imutável e só pode avançar uma vez no motor que o criou. Estados antigos, concluídos ou de outro motor são rejeitados. Não há carregamento de estados arbitrários guardados em JSON; um adaptador de persistência terá de ser implementado e validado separadamente.

`initialBoard` em `step` é uma opção de fixtures locais para reproduzir casos de teste. Não a aceitar como entrada de um jogador num futuro adaptador de servidor. As funções de avaliação de tabuleiros também servem para cenários controlados.

## Tabuleiro e eventos

O tabuleiro é um array de 30 células em ordem por linhas: índice `linha * 6 + coluna`, com linhas 0–4 e colunas 0–5. Uma célula é `N1`–`N5`, `P1`–`P5`, `S` ou `{ symbol: 'W', multiplier: n }`. Wilds base têm `n = 0`; nos três bónus têm `n >= 1`. A ausência de célula durante o preenchimento é `null`.

A geração percorre colunas da esquerda para a direita e espaços livres de baixo para cima. Pares escolhem vizinhas livres uniformemente, não se replicam e também se aplicam às entradas de cascatas. Wilds naturais não existem.

Eventos possíveis, por ordem de resolução: `spin-start`, `hits`, `xp-gained`, `refill`, `magic`, nova avaliação, `spin-end`, eventual `bonus-start` ou `retrigger`, e `round-end`. `magic` inclui o tabuleiro após a colocação, posições, quantidade pedida/colocada, multiplicador e XP descartado. As grelhas dos eventos são cópias independentes.

`hits` contém grupos, posições, XP e pagamentos brutos. Os campos `multiplier` e `rawPay100` de cada grupo são strings decimais exatas para evitar perda numérica em multiplicadores extremos; `credited100` é o valor efetivamente acrescentado à jogada depois do teto. O valor bruto dos grupos pode ultrapassar o crédito quando se atinge MAX WIN.

MAX WIN emite `max-win` com o rótulo `MAX WIN`, seguido de `round-end`, sem preencher novos símbolos, atribuir retriggers ou continuar free spins. O protótipo consome esse evento num painel próprio, sem creditar de novo ao fechar.

## Validação e limitações

[tests/engine.test.js](tests/engine.test.js) verifica pagamentos, escalões, XP, conectividade, wilds partilhados, pares, scatters, gravidade, magia antes da avaliação, persistência, compras, retriggers, teto, arredondamento, replay e limites técnicos. [tests/simulation.test.js](tests/simulation.test.js) verifica reprodutibilidade e denominadores das populações.

[tests/hunt.test.js](tests/hunt.test.js) verifica os cinco aumentos de scatter, custo único de 4×, cascatas com boost, regresso às probabilidades normais no bónus, denominador do RTP e teto referido à aposta base.

O RNG Mulberry32 é reproduzível para desenvolvimento, não apropriado para dinheiro real. Limites técnicos de 100 000 cascatas por spin e 100 000 spins por jogada lançam erro e invalidam a execução em vez de devolver um prémio parcial. Um erro que já tenha consumido aleatoriedade invalida o estado desse passo. Estes limites não substituem as regras de duração ou o teto de pagamento.

A meta atual de RTP medido é 96%–99%. As amostras abaixo cumprem a meta pontual; os intervalos de confiança ainda não comprovam que o RTP real esteja nessa faixa.

## Evolução dos bónus e pagamentos (2026-10-30)

A primeira magia inicia estas sequências; cada linha representa uma barra cheia. Os valores são por wild, somados quando vários wilds participam num hit.

| Barra | Comum | Super | Secret |
| --- | --- | --- | --- |
| 1 | 2 wilds ×1 | 2 wilds ×2 | 2 wilds ×2 |
| 2 | 3 wilds ×1 | 2 wilds ×4 | 3 wilds ×4 |
| 3 | 3 wilds ×2 | 3 wilds ×4 | 4 wilds ×6 |
| 4 | 4 wilds ×2 | 3 wilds ×6 | 5 wilds ×8 |
| 5 | 4 wilds ×3 | 4 wilds ×6 | 6 wilds ×10 |

Há no máximo seis wilds simultâneos, contando os existentes. Ao atingir seis, cada barra seguinte aumenta o multiplicador: +1 no comum, +2 no super e secret. Wilds sobreviventes também recebem a melhoria, sem reduzir um multiplicador maior. A interface mostra a próxima melhoria e destaca a ativação.

Todos começam com 12 spins. Encher XP não dá spins; wilds não geram XP. Retriggers por scatters preservados. MAX WIN de 10 000× na jogada completa. Cada hit paga no mínimo 0,25× a aposta (0,05 numa aposta de 0,20), antes dos multiplicadores. Os pagamentos são específicos de cada modo e podem ser consultados nas regras. Preços de compra preservados: comum 80×, super 225× e secret 316×.

Os relatórios anteriores preservam as configurações antigas e não validam estas novas regras.

Configuração atual: `sofia-xp-evolution-6-52-25-v2`, com duplicação de 52% e segunda cópia de 25%, sem recursão. A frequência de hits é aproximadamente 67% dos spins. Os pagamentos maiores foram compensados para preservar o mínimo dos hits pequenos.

| Modo | Amostra | RTP pontual |
| --- | ---: | ---: |
| Normal | 100 000 apostas completas | 97,7646% |
| Comum | 10 000 compras | 97,4012% |
| Super | 10 000 compras | 97,5971% |
| Secret | 10 000 compras | 97,1761% |

O [relatório da evolução](rtp-evolution-validation.json) guarda os resultados, configuração, hash, sementes, percentis, intervalos e histórico de ajuste. Nenhum MAX WIN foi observado nestas amostras finais. As sementes foram usadas no ajuste: estes valores são evidência de calibração, não validação independente nem garantia do RTP real. Os intervalos aproximados de 95% continuam largos: normal 87,98%–107,55%, comum 93,42%–101,38%, super 93,50%–101,70% e secret 94,59%–99,76%. Hunt não foi recalibrado nesta tarefa. Repetir a amostra com `node scripts/validate-rtp.js`.
