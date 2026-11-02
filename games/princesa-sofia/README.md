# Motor Princesa Sofia

## Apresentação da slot

Os símbolos entram individualmente de cima. Nas cascatas, os sobreviventes assentam antes de entrar o preenchimento. Scatters confirmados convergem e explodem em flores antes do bónus; compras usam uma apresentação visual separada do motor. A introdução mostra nome, spins, descrição e uma ação para continuar. Retriggers usam o PNG dedicado, e a mensagem de magia descreve WILDs e multiplicador durante no máximo 2,5 segundos. A mensagem acompanha a velocidade: 2,5 s em Normal, 0,8 s em Rápido e 0,65 s em Ultra, com entrada também escalada; a apresentação aguarda esse intervalo com o tabuleiro anterior intacto. Só depois de fechar a explicação começa a chegada dos WILDs; o spin aguarda o fim dessa chegada. Ultra usa fator 0,16; Normal e Rápido mantêm os fatores anteriores. Estas alterações são apenas de apresentação, sem mudar o contrato matemático.

Arte integrada com imagegen (ferramenta nativa): [retrigger](ui/art/retrigger.png) e [WILD](ui/art/wild-emblem.png). Prompts de arte: retrigger com bouquet de lírios brancos, pétalas rosa, fitas lilás, poeira menta/dourada, lua crescente e texto "+ SPINS", fundo transparente; WILD com silhueta, filigrana e asas preservadas, base opala branca iridescente e reflexos rosa/lilás/menta/aqua/dourado.

## Configuração atual: premium e clusters maiores

A configuração vigente é `sofia-premium-clusters-fixed-magic-v15`. Mantém o contrato fixado: 60 pagamentos únicos por símbolo/escalão, barras de 40/25/20/17 XP, XP por cluster normal 3/5/7/9/11/13 e premium 5/7/9/11/13/15, dez WILDs máximos e as três tabelas condicionais de scatter/retrigger dos bónus. A tabela de prémios da imagem continua por aplicar. As secções de revisões anteriores abaixo são históricas.

Após a primeira magia, os aumentos são garantidos: Normal +1 WILD/+1 ao multiplicador; Super +1/+2; Secret +2/+4. A primeira magia mantém 2 WILDs ×1 no Normal e 2 WILDs ×2 no Super/Secret. As melhorias persistem entre spins; ao chegar a dez WILDs, só aumenta o multiplicador. Foram removidos o sorteio e a dupla escolha do Secret.

Os pesos dos premium passaram de 30% para 40% no sorteio regular. Os pesos atuais, por ordem N1–N5/P1–P5, são 15,5%/13,7%/12%/10,3%/8,5% e 12%/9,5%/8%/6,5%/4%. As cópias vizinhas passaram a existir também para premium: 70% para a segunda cópia normal, 71% para premium e 51% para a terceira cópia. Só copiam para vizinhas livres ortogonais; não há cadeias recursivas nem cópias sobre scatters ou WILDs.

Na comparação de 100 000 tabuleiros iniciais base antes de hits e magia, a presença premium subiu de 20,60% para 39,62% dos espaços. A percentagem de boards com um cluster ligado de pelo menos oito símbolos subiu de 16,12% para 17,45%. A frequência de clusters 11+ ficou praticamente igual, 3,013% contra 3,028%. O [recibo da comparação](premium-cluster-comparison.json) inclui tamanhos, seed e verificação dos parâmetros fixos.

Para calibrar os RTPs observados, foram ajustados os preços para Normal 29×, Super 103× e Secret 754×, respeitando os máximos 100×/250×/800×. No base, apenas a chance condicional do terceiro scatter passou a 17 800 PPM. O Hunt continua a custar 4× e usa fator 2,415. Não se alteraram as probabilidades condicionais de scatter dos free spins nem os prémios de retrigger +2/+4 spins.

**Probabilidade configurada e frequência observada não são a mesma métrica.** A distribuição de cópias/cascatas altera o número de posições sorteadas e pode mudar quantos retriggers aparecem por bónus, mesmo com as mesmas tabelas condicionais. Nas 10 000 compras de cada tipo, observaram-se 1 743/361 eventos de dois/três scatters no Normal, 1 842/331 no Super e 1 740/362 no Secret. Estes são eventos por amostra, não probabilidades garantidas de pelo menos um retrigger.

| Modo | Preço | Entradas pagas | RTP observado |
| --- | --- | --- | --- |
| Base | 1× | 100 000 | 97,8409% |
| Hunt | 4× | 100 000 | 97,4008% |
| Normal | 29× | 10 000 | 97,0643% |
| Super | 103× | 10 000 | 97,0398% |
| Secret | 754× | 10 000 | 97,0096% |

Repetir com `node scripts/validate-rtp.js`. O [relatório atual](rtp-premium-clusters-validation.json) preserva configuração, hash, seeds, intervalos e lotes. As seeds foram reutilizadas na afinação: todos os valores pontuais estão em 96%–98%, mas não constituem validação independente nem certificação do RTP real. `calibrated` continua `false`.

## Magia atual: simples, sorteada e dupla

A configuração anterior era `sofia-magic-simple-random-double-v14`. O Normal mantém uma evolução simples e garantida; o Super sorteia as melhorias; o Secret apresenta uma dupla magia. O objetivo desta revisão é melhorar a recompensa de encher XP, sobretudo nos bónus raros, antes de uma futura afinação das probabilidades dos símbolos.

| Bónus | Primeira barra | Barras seguintes |
| --- | --- | --- |
| Normal | 2 WILDs ×1 | +1 WILD e +1 ao multiplicador, garantidos |
| Super | 2 WILDs ×2 | Sorteios independentes de +1, +2 ou +3 WILDs e +1, +2 ou +3 ao multiplicador |
| Secret | 2 WILDs ×2 | Dois sorteios de cada melhoria; conserva separadamente a melhor quantidade e o melhor multiplicador |

O Super usa 70%/25%/5% para +1/+2/+3 WILDs e 10%/70%/20% para +1/+2/+3 ao multiplicador. O Secret usa as mesmas probabilidades em cada sorteio, mas escolhe o melhor de dois: as probabilidades finais são 49%/41,25%/9,75% para a quantidade e 1%/63%/36% para o multiplicador. Os parâmetros `wildGainWeights`, `multiplierGainWeights` e `rewardRolls` estão na configuração e são validados; os pesos de cada distribuição somam 1 000 000.

O resultado de cada melhoria fica guardado durante todo o bónus; não é recalculado ao mudar de spin nem pela interface. Os eventos incluem os sorteios e os ganhos aplicados. O Secret mostra os dois resultados antes da recompensa vencedora. A quantidade de magia continua a determinar quantos WILDs a ativação tenta colocar, respeitando os dez simultâneos, incluindo sobreviventes. Com dez, deixa de sortear a quantidade e continua a melhorar o multiplicador. Os WILDs físicos não passam ao spin seguinte, mas XP e evolução mantêm-se.

Mantêm-se as barras de 40/25/20/17 XP, XP fixo por cluster, preços de 27×/188×/697×, tabela única de pagamentos, pesos dos símbolos, pares, scatters, custo Hunt e restantes limites. A tabela de prémios da imagem continua por aplicar. Não se alteraram as probabilidades dos símbolos para compensar esta mudança.

Foram simuladas 100 000 entradas base, 100 000 Hunt e 10 000 compras de cada bónus, com as mesmas seeds anteriores. Repetir: `node scripts/validate-rtp.js`. O [relatório atual](rtp-random-double-magic-validation.json) guarda configuração, hash, intervalos e métricas. A frequência de chegar ao limite de WILDs usa agora o maior valor real atingido, em vez de o inferir do número de barras, pois as melhorias são aleatórias.

| Modo | RTP anterior | RTP observado atual |
| --- | --- | --- |
| Base | 58,3109% | 58,5100% |
| Hunt | 35,8619% | 36,2775% |
| Normal | 32,0609% | 32,0609% |
| Super | 11,1017% | 16,8017% |
| Secret | 4,5422% | 10,2400% |

O aumento não estabelece nem estabiliza um RTP de 96%–98%; os cinco resultados ainda estão abaixo da meta. São medições locais, sem certificação do RTP real. As secções das revisões anteriores abaixo são históricas.

## XP por cluster: normais e premium

A configuração anterior era `sofia-cluster-xp-normal-premium-v13`. A tabela abaixo substitui o XP por símbolo e aplica-se igualmente ao base, Hunt e três bónus. Cada grupo vencedor recebe um valor fixo pelo escalão da sua quantidade de símbolos regulares; WILDs não dão XP nem aumentam o escalão de XP. Menos de cinco regulares dão zero XP, mesmo que os WILDs completem um hit pagante. O pagamento continua a contar todos os elementos do hit, incluindo WILDs.

| Símbolos do grupo | 5 | 6–7 | 8–10 | 11–14 | 15–17 | 18+ |
| --- | --- | --- | --- | --- | --- | --- |
| Normais N1–N5 | 3 | 5 | 7 | 9 | 11 | 13 |
| Premium P1–P5 | 5 | 7 | 9 | 11 | 13 | 15 |

Exemplo: cinco normais e três WILDs pagam como oito elementos, mas dão 3 XP. Um hit de oito premium sem WILDs dá 9 XP. Os ganhos de grupos diferentes somam-se; o excesso da barra continua a ser descartado ao ativar a magia.

Mantêm-se as barras de 40/25/20/17 XP para base-Hunt/Normal/Super/Secret, dez WILDs como máximo fixo, preços 27×/188×/697× e todos os restantes parâmetros. A tabela de pagamentos da imagem foi apenas convertida na conversa, não aplicada: esta medição muda exclusivamente o XP ganho. As secções de revisões anteriores abaixo são históricas.

Repetir com `node scripts/validate-rtp.js`. O [relatório atual](rtp-cluster-xp-normal-premium-validation.json) inclui configuração, hash, seeds, intervalos e as cinco populações, com todos os spins decorrentes de cada entrada paga. Os mesmos tamanhos e seeds permitem comparar com a revisão anterior; não certificam o RTP real.

| Modo | Entradas pagas | RTP observado | Intervalo aproximado de 95% |
| --- | --- | --- | --- |
| Base | 100000 | 58,3109% | 57,2123% a 59,4094% |
| Hunt | 100000 | 35,8619% | 35,2347% a 36,4890% |
| Normal | 10000 | 32,0609% | 31,5289% a 32,5930% |
| Super | 10000 | 11,1017% | 10,7886% a 11,4148% |
| Secret | 10000 | 4,5422% | 4,4087% a 4,6758% |

Todos os modos ficaram abaixo de 96%–98%. O código de saída 1 assinala a meta não cumprida; as cinco simulações terminaram.

## Barras fixadas: 25/20/17 XP

A configuração anterior era `sofia-ten-wilds-fixed-xp-25-20-17-v12`. Por escolha explícita, foram fixados os valores da imagem: Normal 25 XP, Super 20 XP e Secret 17 XP, substituindo os primeiros candidatos abaixo de 99% da pesquisa anterior. Base/Hunt continua em 40 XP. Mantêm-se dez WILDs como limite fixo e preços de 27×/188×/697×.

Foram repetidas as cinco populações com as mesmas seeds, sem afinação posterior. Executar `node scripts/validate-rtp.js`; consultar o [relatório atual](rtp-fixed-xp-25-20-17-validation.json). As secções de revisões anteriores abaixo são históricas.

| Modo | Entradas pagas | RTP observado |
| --- | --- | --- |
| Base | 100 000 | 99,9649% |
| Hunt | 100 000 | 104,0680% |
| Normal | 10 000 | 102,9133% |
| Super | 10 000 | 118,1599% |
| Secret | 10 000 | 102,7429% |

Todos os resultados pontuais ultrapassam a meta de 96%–98%. O código de saída 1 sinaliza a meta não cumprida; as simulações terminaram. Resultados locais, sem certificação do RTP real.

## Pesquisa atual: primeiro RTP abaixo de 99%

A configuração anterior era `sofia-ten-wilds-xp-first-below-99-v11`. Mantém dez WILDs como limite fixo, pagamentos e preços de 27×/188×/697×. Apenas as barras dos três bónus foram aumentadas; o base/Hunt mantém 40 XP. As secções de revisões anteriores abaixo são históricas.

Foi testado um bónus de cada vez, por ordem Normal, Super, Secret, aumentando exatamente 1 XP por candidato. Cada candidato executou 10 000 compras completas, usando sempre a mesma seed dentro do modo. A pesquisa começou no valor anterior +1 e parou imediatamente no primeiro RTP observado estritamente abaixo de 99%, sem tentar aproximá-lo depois de 96%–98%.

| Bónus | XP inicial | Último candidato acima de 99% | Primeiro candidato abaixo de 99% |
| --- | --- | --- | --- |
| Normal/comum | 18 | 25 XP: 102,9133% | **26 XP: 84,2475%** |
| Super | 16 | 20 XP: 118,1599% | **21 XP: 80,8118%** |
| Secret | 15 | 17 XP: 102,7429% | **18 XP: 64,3905%** |

Foram executados os 16 candidatos consecutivos: 19–26 XP no Normal, 17–21 no Super e 16–18 no Secret, totalizando 160 000 compras na pesquisa. O [recibo completo](rtp-xp-first-below-99.json) preserva a configuração de partida, cada candidato, seeds, intervalos e os primeiros resultados selecionados. Um resultado abaixo de 99% não garante que o RTP real esteja abaixo desse valor, nem significa que ficou na faixa de 96%–98%.

O comando `node scripts/tune-xp.js` inicia uma nova pesquisa a partir dos limites que estiverem configurados nesse momento e escreve o recibo; não altera automaticamente a configuração do motor. O comando `node scripts/validate-rtp.js` verifica a configuração aplicada com as cinco populações e grava o [relatório final](rtp-xp-threshold-validation.json). A validação geral ainda compara com 96%–98%, pelo que um código de saída 1 nesta revisão significa meta geral não cumprida, não uma simulação incompleta.

| Modo | Entradas pagas | XP necessário | RTP observado final |
| --- | --- | --- | --- |
| Base | 100 000 | 40 | 88,5081% |
| Hunt | 100 000 | 40 | 87,7172% |
| Normal/comum | 10 000 | 26 | 84,2475% |
| Super | 10 000 | 21 | 80,8118% |
| Secret | 10 000 | 18 | 64,3905% |

Motor e protótipo local ligados, sem Firebase ou carteira real. A configuração anterior era `sofia-fixed-ten-wilds-v10`, com limite fixo de dez WILDs em todos os modos. A meta continua em 96%–98%; a calibração anterior com limites por raridade é histórica. Os intervalos ainda não certificam o RTP real; os relatórios e secções de revisões anteriores são históricos.

## Magia por raridade

Revisão anterior `sofia-rarity-magic-v9`: os limites 4/6/8 e os RTPs desta secção foram substituídos pelo limite fixo de dez descrito no fim do documento.

Cada barra aumenta simultaneamente a quantidade de WILDs e o multiplicador. A evolução é determinística, sem sorteios que possam adiar uma melhoria de quantidade. O nível e o XP persistem entre spins do bónus; os WILDs físicos não passam ao spin seguinte. Cada ativação tenta colocar a quantidade correspondente ao nível, respeitando o limite total do modo, incluindo os sobreviventes.

| Bónus | Preço | XP por barra | Primeira magia | Aumento por barra | Limite de WILDs |
| --- | --- | --- | --- | --- | --- |
| Normal/comum | 27× | 18 | 2 W ×1 | +1 W e +1× | 4 |
| Super | 188× | 16 | 2 W ×2 | +1 W e +2× | 6 |
| Secret | 697× | 15 | 2 W ×2 | +1 W e +2× | 8 |

Ao atingir o limite de quantidade, cada barra continua a aumentar o multiplicador. Não existe teto separado para o multiplicador; mantém-se o MAX WIN global de 10 000×. Continuam a existir 12 spins iniciais, retriggers de +2/+4 spins, soma dos multiplicadores por hit e XP de 1 por normal/2 por premium premiado. WILDs não geram XP e o excesso da barra é descartado. O base mantém 40 XP e coloca 1–3 WILDs sem multiplicador. A tabela de 60 pagamentos é a mesma em todos os modos, estritamente crescente por símbolo e por escalão.

Os preços respeitam os máximos autorizados de 100×/250×/800×. Para equilibrar o base e o Hunt, a chance condicional do terceiro scatter do base passou a 17 300 PPM; os outros quatro valores mantêm-se. O Hunt continua a custar 4× e aplica fator de scatter 2,075, apenas até entrar no bónus. Os valores de scatter dos free spins não foram alterados. Menos ou mais cascatas podem alterar indiretamente a frequência observada de retrigger.

Repetir: `node scripts/validate-rtp.js`. O [relatório atual](rtp-rarity-magic-validation.json) guarda configuração, hash, seeds, intervalos, lotes e mecânicas. Foram usadas 100 000 entradas base, 100 000 Hunt e 10 000 compras de cada bónus, sempre incluindo os spins e cascatas decorrentes. As seeds foram mantidas durante a afinação: isto é calibração local, não validação independente ou certificação do RTP real. `calibrated` continua `false`; o sucesso da meta pontual não significa que os intervalos de confiança caibam entre 96% e 98%.

| Modo | RTP observado | Intervalo aproximado de 95% |
| --- | --- | --- |
| Base | 97,2461% | 93,3728%–101,1195% |
| Hunt | 97,4620% | 94,6690%–100,2550% |
| Normal/comum | 97,1539% | 95,5120%–98,7958% |
| Super | 96,8311% | 94,6526%–99,0096% |
| Secret | 96,9509% | 94,0658%–99,8359% |

Nas compras, a média de ativações de magia por bónus foi 5,17 / 6,84 / 9,03, respetivamente. A percentagem que chegou ao nível da quantidade máxima do próprio modo foi 93,53% / 76,22% / 60,88%. Esta métrica mede o nível atingido, não garante que todos os WILDs fiquem visíveis ao mesmo tempo. O Secret observou nove MAX WINs em 10 000 compras; os outros dois observaram zero.

## Abrir o protótipo

```powershell
npm.cmd run dev
```

Abrir `http://127.0.0.1:4175`: uma página branca incorpora a slot de [game.html](game.html) num iframe responsivo. O botão no canto superior direito alterna entre widget e ecrã inteiro, preservando a jogada; o modo expandido aproveita mais largura. Para incorporar noutro contentor, permitir fullscreen no iframe e configurar a política `frame-ancestors` para a origem autorizada. O servidor só escuta no computador local e a página não faz pedidos externos. Disponibiliza três velocidades, regras e pagamentos, volume/silêncio, compra de bónus, Hunt, ajuste de aposta, spin e autoplay com a seleção 10–100 de dez em dez e 200–500 de cem em cem. Os cenários de demonstração são locais e não alteram o saldo normal. Recarregar reinicia os 10 000 créditos de teste.

O [mapa da etapa 2](02-prototipo-visual-estrutura.md) conserva o histórico estrutural. A [etapa visual](03-visuais-animacoes-equipa.md) regista a produção atual: cinco premium ilustrados, cinco objetos normais, Scatter, magia iridescente, cenário, logo, ícones de bónus e apresentações PNG sobre o tabuleiro. O ecrã inteiro amplia a composição proporcionalmente; em retrato os controlos reorganizam-se em duas filas, sem deformar as células.

A estrutura atual tem slot horizontalmente alargada, XP por cima e wilds elevados à esquerda. A barra inferior junta info, som, saldo e ganho à esquerda; aposta, −/Rodar/+, autoplay e velocidade à direita. O botão Bónus abre Hunt, comum, super e secret, com ajuste de aposta no topo. As explicações e demonstrações ficam nas regras. A revisão preserva a matemática.

Teste de browser: `npm.cmd run test:ui`. Reutiliza o Playwright instalado no repositório e um Chromium disponível; no Windows, aceita o Edge instalado como alternativa. Não instala browsers automaticamente.

Verificação adicional da arte: `node tests/art.browser.js`. Confirma PNGs com transparência, menus sem scroll, secções das regras e apresentações naturais dos três bónus, incluindo 320×568 e 640×240. A arte encontra-se em [ui/art](ui/art); os nomes e a hierarquia são definidos em [symbols.js](ui/symbols.js). As imagens foram produzidas com a ferramenta integrada de geração, a partir das referências locais, preservando a Sofia revista.

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

`hunt` cobra 4× a aposta base uma única vez e aplica às cinco probabilidades de scatter do base um fator de 2,075, arredondado à unidade por milhão, no preenchimento inicial e nas cascatas. O utilizador autorizou aumentar este fator de 1,53 para aproximar o RTP da meta; a frequência de bónus deixou de estar limitada ao objetivo anterior de 3×. Quando entra num bónus, usa as regras e probabilidades normais desse bónus. Pagamentos, XP e MAX WIN continuam referidos à aposta base, sem multiplicar por quatro. O modo `all` mantém as quatro populações anteriores; `hunt` é selecionado explicitamente.

Usar `--bet-units` para testar o arredondamento numa aposta inteira de unidades de crédito. O padrão é 100: cada centésimo da aposta corresponde exatamente a uma unidade, sem perda adicional na liquidação. Com apostas menores, o RTP liquidado pode ser inferior ao normalizado.

## Configuração e unidades

[src/config.js](src/config.js) é a fonte executável de pesos, 60 pagamentos partilhados por todos os modos, XP, scatters, pares, preços e limites. É imutável. Os valores monetários normalizados terminados em `100` representam centésimos da aposta: `paid100 = 123` significa 1,23×. XP usa também centésimos. Probabilidades usam partes por milhão, com soma de pesos igual a 1 000 000.

Para experiências de calibração, clonar a configuração, alterar parâmetros e atribuir nova versão antes de criar o motor. O motor copia, valida e congela a sua configuração; alterações posteriores ao objeto de origem não afetam uma jogada em curso. Não alterar probabilidades em função do jogador ou do histórico.

Preços atuais em afinação: comum 27×, super 188× e secret 697×. As compras entram diretamente nos 12 free spins, sem spin de gatilho ou pagamento de entrada. O estado regista um custo único; este motor não movimenta um saldo externo.

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

O [relatório da evolução](rtp-evolution-validation.json) guarda os resultados, configuração, hash, sementes, percentis, intervalos e histórico de ajuste. Nenhum MAX WIN foi observado nestas amostras finais. As sementes foram usadas no ajuste: estes valores são evidência de calibração, não validação independente nem garantia do RTP real. Os intervalos aproximados de 95% continuam largos: normal 87,98%–107,55%, comum 93,42%–101,38%, super 93,50%–101,70% e secret 94,59%–99,76%. Hunt não foi recalibrado nesta tarefa. O script de valida??o agora executa a revis?o de 31 de outubro, incluindo Hunt.

## Tabela ?nica, XP e retriggers (2026-10-31)

Esta sec??o regista a revis?o anterior `sofia-shared-pay-additive-v3`. Foi substitu?da pela revis?o de XP por cluster abaixo.

A tabela em [src/config.js](src/config.js) ? id?ntica no base, Hunt e tr?s b?nus, antes dos multiplicadores. Cada coluna cresce estritamente de N1 a P5; cada linha cresce estritamente de 5 a 18+. O motor rejeita tabelas por modo ou empates/invers?es de pagamentos. Os WILDs de um hit somam os seus multiplicadores: ?2 + ?3 + ?7 = ?12, sem multiplicar entre si nem somar uma unidade extra.

As barras exigem 39 XP no base, 12 no comum, 11 no Super e 10 no Secret. S?o limites inteiros; o XP ganho por c?lula mant?m a pequena influ?ncia da raridade. As progress?es de magia e os pr?mios de +2/+4 spins mant?m-se. A frequ?ncia pretendida de retrigger ? aproximadamente 1 evento de dois scatters por 3,27 b?nus completos e 1 de tr?s scatters por 11,32. Medimos eventos por b?nus, incluindo spins adicionais; n?o ? uma garantia por sess?o nem a probabilidade de pelo menos um evento. Os tr?s valores de scatter por modo s?o probabilidades condicionais por c?lula e n?o precisam de ser crescentes.

Executar a medi??o atual: `node scripts/validate-rtp.js`. S?o 100 000 jogadas base, 100 000 Hunt e 10 000 compras de cada b?nus, incluindo toda a respetiva sequ?ncia de spins. O [resultado com pre?os atuais](rtp-shared-validation.json) preserva configura??o, seeds, hash e intervalos. O processo termina com c?digo 1 quando algum RTP pontual fica fora de 96%?98%.

A proposta de pre?os ? comum 98?, Super 222? e Secret 800?, em vez de 80?/225?/316?. Ainda n?o est? aplicada. A [simula??o da proposta](rtp-shared-proposal.json) usa as mesmas quantidades e seeds; pode ser repetida com `node scripts/validate-rtp.js --proposed-prices`. Os pre?os alteram apenas o custo de entrada e o denominador do RTP, sem alterar os resultados ou ganhos do b?nus. As seeds foram usadas na afina??o: estes resultados s?o calibra??o local, n?o valida??o independente nem certifica??o estat?stica do RTP real.

Resultados pontuais de 31 de outubro (as compras propostas ainda n?o est?o aplicadas):

| Modo | Jogadas | RTP com pre?os atuais | RTP com pre?os propostos |
| --- | --- | --- | --- |
| Base | 100 000 | 96,1186% | 96,1186% |
| Hunt | 100 000 | 96,0868% | 96,0868% |
| Comum | 10 000 | 118,7806% | 96,9638% |
| Super | 10 000 | 95,6463% | 96,9388% |
| Secret | 10 000 | 245,7113% | 97,0560% |

Nas 30 000 compras foram observados 9 515 retriggers de dois scatters (1 por 3,15 b?nus) e 2 674 de tr?s scatters (1 por 11,22). Separadamente: comum 1 por 3,13/10,70; Super 1 por 3,17/11,78; Secret 1 por 3,16/11,24, respetivamente para dois/tr?s scatters. A proposta passa a meta dos valores pontuais nos cinco modos; os pre?os atuais n?o passam nas compras. Nenhum destes resultados certifica o RTP real.

## XP fixo por cluster: barras 40/30/22/15

Revis?o hist?rica `sofia-cluster-xp-v4`, substitu?da pelo XP por s?mbolo abaixo.

A revis?o `sofia-cluster-xp-v4` aplica a tabela aprovada abaixo, igual em todos os modos. O escal?o de XP usa apenas a quantidade de s?mbolos regulares do grupo vencedor: menos de cinco regulares d?o zero XP, mesmo que os WILDs completem um hit pagante. Cinco regulares com tr?s WILDs pagam como oito s?mbolos, mas recebem o XP fixo do escal?o de cinco. Os multiplicadores n?o afetam o XP.

| S?mbolo | 5 | 6?7 | 8?10 | 11?14 | 15?17 | 18+ |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | 5 | 7 | 9 | 12 | 16 | 20 |
| N2 | 5 | 7 | 9 | 12 | 16 | 21 |
| N3 | 5 | 7 | 9 | 13 | 17 | 21 |
| N4 | 5 | 7 | 10 | 13 | 17 | 22 |
| N5 | 5 | 8 | 10 | 13 | 18 | 22 |
| P1 | 6 | 8 | 10 | 14 | 18 | 23 |
| P2 | 6 | 8 | 10 | 14 | 18 | 24 |
| P3 | 6 | 8 | 11 | 14 | 19 | 24 |
| P4 | 6 | 8 | 11 | 15 | 19 | 25 |
| P5 | 6 | 9 | 11 | 15 | 20 | 25 |

Limites das barras: base/Hunt 40 XP, b?nus normal/comum 30, Super 22 e Secret 15. O excesso continua a ser descartado quando a magia ativa. Pagamentos, probabilidades de scatter, progress?es WILD, pre?os de compra (80?/225?/316?) e custo Hunt de 4? mant?m-se. As frequ?ncias de retrigger podem mudar indiretamente por haver menos magias e cascatas; n?o foram afinadas novamente.

Repetir com `node scripts/validate-rtp.js`: 100 000 jogadas base, 100 000 Hunt e 10 000 compras de cada b?nus, usando as mesmas seeds da revis?o anterior. O [relat?rio desta revis?o](rtp-cluster-xp-validation.json) inclui a configura??o, hash, intervalos e todos os spins decorrentes de cada entrada paga. O c?digo de sa?da 1 indica resultados fora da meta de 96%?98%, n?o uma simula??o incompleta. As amostras anteriores n?o comprovam o RTP desta nova configura??o.

| Modo | Jogadas | RTP observado | Intervalo aproximado de 95% |
| --- | --- | --- | --- |
| Base | 100000 | 44,2035% | 43,7151% a 44,6919% |
| Hunt | 100000 | 16,4437% | 16,1620% a 16,7253% |
| Normal/comum | 10000 | 9,4757% | 9,3711% a 9,5802% |
| Super | 10000 | 7,0431% | 6,9119% a 7,1743% |
| Secret | 10000 | 32,9073% | 32,2653% a 33,5492% |

Todos os modos ficaram abaixo da meta nesta amostra. A medi??o foi conclu?da sem ajuste de par?metros ap?s observar os resultados; n?o certifica o RTP real.

## XP por s?mbolo: normais 1, premium 2

A revis?o `sofia-symbol-xp-v5` substitui o XP fixo por escal?o. Cada s?mbolo N1?N5 de um grupo vencedor d? 1 XP; cada P1?P5 d? 2 XP. Apenas s?mbolos regulares contam: WILDs d?o zero e os multiplicadores n?o alteram XP. Quatro normais e um WILD d?o 4 XP; quatro premium e um WILD d?o 8 XP. Um grupo s? de WILDs d? zero XP. N?o existe arredondamento por escal?o: seis normais d?o 6 XP e sete d?o 7 XP.

As barras continuam em 40 XP no base/Hunt, 30 no normal/comum, 22 no Super e 15 no Secret. Pagamentos, probabilidades e compras de 80?/225?/316? mant?m-se. Os ganhos s?o somados por grupo; s?mbolos fora de grupos vencedores n?o d?o XP.

Executar `node scripts/validate-rtp.js` para 100 000 entradas base, 100 000 Hunt e 10 000 compras de cada b?nus, incluindo os respetivos free spins e retriggers. As seeds s?o as mesmas das revis?es anteriores. O [relat?rio atual](rtp-symbol-xp-validation.json) preserva configura??o, hash, intervalos e m?tricas. O c?digo de sa?da 1 assinala valores fora da meta 96%?98%; n?o implica uma execu??o incompleta.

| Modo | Entradas pagas | RTP observado | Intervalo aproximado de 95% |
| --- | --- | --- | --- |
| Base | 100000 | 44,2218% | 43,6905% a 44,7531% |
| Hunt | 100000 | 16,8029% | 16,4983% a 17,1075% |
| Normal/comum | 10000 | 9,6838% | 9,5675% a 9,8000% |
| Super | 10000 | 7,7568% | 7,5766% a 7,9370% |
| Secret | 10000 | 71,3875% | 69,7908% a 72,9842% |

Todos os resultados pontuais continuam abaixo de 96%?98%. Medi??o local, sem afina??o posterior nem certifica??o do RTP real.

## Limite atual de WILDs: oito

A revis?o `sofia-symbol-xp-eight-wilds-v6` permite no m?ximo oito WILDs simult?neos no tabuleiro. Os WILDs sobreviventes contam para esse limite: com cinco existentes, a magia coloca no m?ximo mais tr?s. As progress?es alternadas continuam at? oito; depois cresce apenas o multiplicador. No base, cada magia continua a pedir 1?3 WILDs, respeitando o total de oito. XP, barras, pagamentos, pre?os e scatters mant?m-se. Os relat?rios anteriores mediram o limite de seis. A medi??o atual com oito WILDs est? abaixo.

Ap?s cada altera??o da l?gica ou matem?tica, executar as cinco popula??es e apresentar a tabela de RTP observado: 100 000 entradas base, 100 000 Hunt e 10 000 compras de cada b?nus.

Repetir a configura??o atual com `node scripts/validate-rtp.js`. O [relat?rio com oito WILDs](rtp-eight-wilds-validation.json) preserva a configura??o e as mesmas seeds anteriores.

| Modo | Entradas pagas | RTP observado | Intervalo aproximado de 95% |
| --- | --- | --- | --- |
| Base | 100000 | 44,2218% | 43,6905% a 44,7531% |
| Hunt | 100000 | 16,8029% | 16,4983% a 17,1075% |
| Normal/comum | 10000 | 9,6838% | 9,5675% a 9,8000% |
| Super | 10000 | 7,8240% | 7,6389% a 8,0091% |
| Secret | 10000 | 213,8441% | 207,4807% a 220,2076% |

O Secret ultrapassou a meta de 96%?98%; os restantes modos continuam abaixo. A medi??o n?o certifica o RTP real.

## Secret: pre?o de compra 690?

A revis?o `sofia-secret-price-690-v7` muda apenas o pre?o de compra do Secret, de 316? para 690?. O retorno m?dio anterior de 675,747478? dividido por 0,98 aponta para um pre?o de 689,538243?; arredondar para 690? d? aproximadamente 97,9344% nesta amostra. O pre?o n?o altera ganhos, magia ou b?nus naturais.

Foram repetidas as cinco popula??es com as mesmas seeds: `node scripts/validate-rtp.js`. O [relat?rio atual](rtp-secret-690-validation.json) inclui configura??o, hash, intervalos e m?tricas. As seeds foram reutilizadas para calibrar o pre?o; n?o ? valida??o independente nem certifica??o de um RTP real de 98%.

| Modo | Entradas pagas | RTP observado | Intervalo aproximado de 95% |
| --- | --- | --- | --- |
| Base | 100000 | 44,2218% | 43,6905% a 44,7531% |
| Hunt | 100000 | 16,8029% | 16,4983% a 17,1075% |
| Normal/comum | 10000 | 9,6838% | 9,5675% a 9,8000% |
| Super | 10000 | 7,8240% | 7,6389% a 8,0091% |
| Secret | 10000 | 97,9344% | 95,0201% a 100,8487% |

O Secret fica no alvo pontual 96%?98%; os restantes modos continuam abaixo. A frequ?ncia de atingir oito WILDs n?o ? dedut?vel apenas do RTP.

## Normal e Super: evolu??o a partir de zero

A revis?o `sofia-zero-start-random-super-v8` inicia Normal/comum e Super com quantidade de magia zero e multiplicador 1?. A primeira barra garante o primeiro WILD de 1? em ambos. No Normal, a barra passa a 24 XP e as primeiras ativa??es s?o 1 W ?1, 2 W ?1, 2 W ?2, 3 W ?2; depois mant?m a altern?ncia. Ao chegar a oito WILDs, cada barra acrescenta +1?.

O Super mant?m 22 XP. Depois da primeira ativa??o, cada barra sorteia independentemente, em partes iguais, +1 WILD ou +2 ao multiplicador. O estado conserva o resultado entre cascatas e spins; a interface mostra o progresso real, sem sortear uma previs?o. Com oito WILDs, a atualiza??o ? sempre +2?. A quantidade de magia determina quantos WILDs se tenta colocar, respeitando o limite total de oito incluindo sobreviventes.

Secret (15 XP), base/Hunt (40 XP), XP por s?mbolo (1 normal/2 premium), pagamentos, probabilidades de scatter e pre?os 80?/225?/690? mant?m-se. O novo sorteio do Super usa o mesmo RNG do motor. A medi??o continua com 100 000 entradas base, 100 000 Hunt e 10 000 compras de cada b?nus, sem afina??o adicional. Repetir com `node scripts/validate-rtp.js`; consultar o [relat?rio atual](rtp-zero-start-validation.json).

| Modo | Entradas pagas | RTP observado | Intervalo aproximado de 95% |
| --- | --- | --- | --- |
| Base | 100000 | 43,7354% | 43,2572% a 44,2136% |
| Hunt | 100000 | 16,1074% | 15,8342% a 16,3805% |
| Normal/comum | 10000 | 9,2316% | 9,1091% a 9,3541% |
| Super | 10000 | 4,0955% | 4,0017% a 4,1894% |
| Secret | 10000 | 97,9344% | 95,0201% a 100,8487% |

O Secret mant?m o alvo pontual de 96%?98%; os restantes modos est?o abaixo. Estes valores s?o observados na amostra e n?o certificam o RTP real.

## Dez WILDs: limite fixo

A revisão `sofia-fixed-ten-wilds-v10` fixa o limite total em dez WILDs, incluindo os sobreviventes, em todos os modos. Normal, Super e Secret deixam de ter limites diferentes. Começam com 2 WILDs e cada barra acrescenta +1 WILD até dez; o multiplicador sobe +1 no Normal e +2 no Super/Secret, continuando depois do limite. No base, cada magia continua a pedir 1–3 WILDs sem multiplicador, respeitando o total de dez.

Mantêm-se barras de 40/18/16/15 XP, preços de 27×/188×/697×, pagamentos, scatters e custo Hunt de 4×. Não houve recalibração posterior à mudança de limite. Repetir: `node scripts/validate-rtp.js`. O [relatório com dez WILDs](rtp-ten-wilds-validation.json) usa as mesmas seeds e 100 000 entradas base, 100 000 Hunt e 10 000 compras de cada bónus.

| Modo | Entradas pagas | RTP observado | Intervalo aproximado de 95% |
| --- | --- | --- | --- |
| Base | 100000 | 625,5948% | 559,0906% a 692,0990% |
| Hunt | 100000 | 881,8522% | 836,2920% a 927,4123% |
| Normal/comum | 10000 | 1032,4693% | 978,1539% a 1086,7847% |
| Super | 10000 | 688,5118% | 664,0512% a 712,9723% |
| Secret | 10000 | 283,4427% | 275,0074% a 291,8780% |

Todos os modos ultrapassaram a meta de 96%–98%. O código de saída 1 assinala a meta não cumprida; as cinco simulações terminaram. Resultados da amostra, sem certificação do RTP real.
