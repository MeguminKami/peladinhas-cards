# Guia 1 — Matemática, lógica e motor da slot

> **Para o agente:** És responsável pela fase 1 de uma slot nova: toda a lógica e toda a matemática. Recebes apenas este guia e o «Input» preenchido pelo dono do jogo. Não fazes interface, arte nem som. Entregas um motor puro, determinístico e testado, um simulador e um RTP **medido** com o tamanho da amostra e a incerteza. Também entregas a documentação de que as fases seguintes precisam: as regras, o catálogo de eventos e a API. Trabalhas sozinho nas decisões reversíveis e só perguntas quando uma ambiguidade impede uma decisão correta. Para dúvidas pequenas, escolhes, documentas a hipótese e continuas.

## Input do dono do jogo

Copia este bloco, preenche o que souberes e deixa o resto em branco.

```text
NOME DO JOGO:
PASTA DO JOGO: [ex.: games/nome-do-jogo]
IDEIA EM 2-3 FRASES:

GRELHA: [colunas × linhas]
SISTEMA DE PAGAMENTO: [linhas fixas (quantas e quais) | ways | clusters (mínimo N ligados, horizontal/vertical) | outro]
CASCATAS / TUMBLE: [sim/não; como caem os símbolos novos]
SÍMBOLOS NORMAIS (do mais comum ao mais raro):
SÍMBOLOS PREMIUM (do mais comum ao mais raro):
WILD: [aparece onde, substitui o quê, multiplicadores, poderes, quantos no máximo]
SCATTER: [onde conta, quantos ativam cada bónus, se paga sozinho]
PODERES / MECÂNICAS ESPECIAIS: [ex.: barra de XP que lança wilds, símbolos que se transformam, sticky]
MULTIPLICADORES: [somam ou multiplicam, quando reiniciam, limites]
BÓNUS / FREE SPINS: [quantos tipos, spins iniciais, retriggers, o que muda dentro de cada um]
COMPRAS DE BÓNUS: [quais, preço desejado ou intervalo, ex.: 80×-100×]
APOSTA EXTRA / HUNT / ANTE: [custo e efeito]
APOSTAS: [unidade mínima e escada, ex.: 0,10 / 0,20 / 0,50 / 1 / 2 / 5 / 10 / 20 / 50 / 100]
RTP ALVO E TOLERÂNCIA: [ex.: 96%-98% em cada modo]
VOLATILIDADE PRETENDIDA: [baixa / média / alta / muito alta]
FREQUÊNCIAS DESEJADAS: [ex.: bónus natural 1 em 200 spins; no máximo 10% dos bónus com retrigger]
GANHO MÁXIMO: [ex.: 10 000× a aposta, por jogada completa incluindo o bónus]
O QUE É FIXO (não pode ser mexido para calibrar):
O QUE PODE SER AJUSTADO PARA CALIBRAR:
INTEGRAÇÃO: [standalone | casino Peladinhas (carteira Djabucoin) | outro]
OUTRAS REGRAS OU RESTRIÇÕES:
```

## 0. Antes de começar

1. Lê o `AGENTS.md` da raiz do repositório e o da pasta do jogo, se existirem, e respeita-os.
2. Inspeciona o que já existe na pasta. Não apagues trabalho do utilizador.
3. Cria a estrutura descrita em `00-LEIA-PRIMEIRO.md`: `src/`, `scripts/`, `tests/`, `relatorios/`, `docs/`, `package.json`, `README.md` e `AGENTS.md`.
4. Por omissão, usa **JavaScript com ES modules, sem build e sem dependências em runtime**. Os testes correm com `node --test`. Isto simplifica a incorporação no site: basta copiar `src/` e `ui/`. Só usa TypeScript ou bundler se o input o pedir.

## 1. Transformar o input numa especificação

Escreve `docs/matematica.md` antes do código e mantém-no sempre igual à configuração executável. Define, sem ambiguidades:

- **Grelha:** dimensões, sistema de coordenadas (`col`, `row`, origem no canto superior esquerdo) e ordem dos índices. Cada símbolo tem um ID estável (`N1…N5`, `P1…P5`, `W`, `S`…) e um nome temático.
- **Pagamento:** linhas (lista explícita de caminhos), ways ou clusters. Indica o tamanho mínimo, a direção, se as diagonais contam e como se resolvem empates e sobreposições. Diz se a tabela é em × aposta total ou por linha, e garante que a divisão nunca se aplica duas vezes.
- **Geração:** tiras de rolos ou sorteio por posição com pesos. Distingue sempre **peso relativo** de **probabilidade final observada**. Se houver «cópias vizinhas» ou outra formação de grupos, descreve cada passo.
- **Raridade:** por omissão, os pesos são estritamente decrescentes do primeiro normal ao último premium e os normais são mais frequentes do que os premium. O motor valida isto ao arrancar.
- **Wild:** o que substitui, se forma grupos só de wilds, multiplicador próprio, como se combinam vários wilds (somam ou multiplicam), máximo simultâneo e se sobrevive às cascatas.
- **Scatter:** onde conta e em que momento (por exemplo, no fim de todas as cascatas), quantos ativam cada bónus, máximos e se é protegido de transformações. Quando a probabilidade é condicional por posição sorteada, explica-o e mede à parte a frequência real por spin e por bónus.
- **Poderes:** uma ficha por poder, no formato `ID → condição → sorteio → alvo → efeito → duração → limites → o que acontece se não houver alvo`, mais as interações entre poderes e a ordem determinística em que se resolvem.
- **Multiplicadores:** quais somam, quais multiplicam, quando nascem, quando reiniciam e quais são os limites. Inclui pelo menos dois exemplos numéricos completos.
- **Bónus:** entrada, spins iniciais, diferenças entre modos, retriggers, condições de saída e o que se mantém entre spins.
- **Custos:** distingue **aposta base** (a referência dos prémios e do «×») de **custo efetivo** (base × fator do hunt/ante, ou o preço da compra). Os prémios são sempre calculados sobre a aposta base.
- **Arredondamento e limite:** unidade mínima de pagamento, momento em que se arredonda e ganho máximo por jogada completa, bónus incluído. Fixa a ordem: prémio bruto → multiplicadores → arredondamento → limite. Diz como o corte do limite se reparte pelos eventos, para que a soma dos eventos seja sempre igual ao total pago.

Separa no documento o **contrato fixo** (o que o dono do jogo decidiu) dos **parâmetros de calibração** (o que podes ajustar). Copia o contrato fixo para o `AGENTS.md` da pasta do jogo. Os agentes seguintes não o podem alterar.

## 2. Arquitetura do motor

```text
src/config.js      configuração versionada: MATH_VERSION, grelha, símbolos, pesos, tabela, modos, preços, limites
src/random.js      RNG com semente (ex.: Mulberry32 ou xoshiro128**) com estado serializável
src/engine.js      regras puras: gerar, avaliar, cascatas, poderes, bónus, limite; emite eventos
src/simulation.js  corre N rondas e agrega métricas
src/index.js       API pública usada pela interface e pela carteira
```

Regras invioláveis:

- O motor não usa DOM, relógio, rede, `Math.random()` nem estado global. Recebe sempre a configuração, o estado do RNG e o pedido.
- **Determinismo:** o mesmo estado do RNG, o mesmo pedido e a mesma `MATH_VERSION` produzem exatamente a mesma ronda. Há um teste que o garante.
- **O resultado nasce dos símbolos.** É proibido sortear primeiro «quanto vai ganhar» e depois fabricar uma grelha. As exceções são as regras explícitas (por exemplo, uma compra que garante N scatters) e os cenários de diagnóstico, que nunca entram em relatórios nem liquidam saldo.
- **Valores monetários em inteiros**, por exemplo em cêntimos da moeda do jogo. Os multiplicadores ficam exatos ou em ponto fixo. Nada de acumular floats.
- A configuração é validada ao arrancar: pesos inteiros e positivos, somas maiores que zero, raridade monótona, preços dentro dos intervalos do contrato e tabela completa. Depois é congelada com `Object.freeze`, em profundidade. Uma configuração inválida faz o motor falhar logo.

### API pública (`src/index.js`)

Mantém a API pequena e estável, porque as fases 2, 3 e 4 dependem dela.

```js
export { config, MATH_VERSION } from './config.js';
// Nova sessão local de teste
newState(seed)                  // -> { rng, balance?, history? }  (o saldo real é da carteira, não do motor)
// Uma jogada completa (spin pago, spin com hunt ou compra), resolvida de uma vez
playRound(rngState, request)    // request: { bet, mode: 'base'|'hunt'|<compra>, ... }
                                // -> { roundId, version, cost, bet, steps: [Step], totalWin, capped, rngAfter }
// Step = um spin visível (o spin pago ou um free spin)
//   { index, kind: 'base'|'bonus', bonusId?, events: [Evento], win, roundWinSoFar, freeSpins: { played, total } }
scenario(name, opts)            // só para diagnóstico: grelhas/forçamentos nomeados, marcados como forçados
```

A jogada inteira fica resolvida no início e é entregue passo a passo. A carteira debita `cost` uma vez no início e credita `totalWin` no fim. Assim, uma jogada interrompida (reload, falha de rede) retoma no passo confirmado. Se a `MATH_VERSION` mudar com uma jogada pendente, esta é liquidada com o resultado guardado. Por isso **não é preciso manter motores antigos** para acabar rondas. Grava o resultado ou o estado do RNG e a versão junto da jogada.

### Catálogo de eventos (`docs/eventos.md`)

Cada passo traz uma lista ordenada de eventos. É a única coisa que a interface usa para apresentar o jogo. Define o catálogo completo com o nome, os campos e a ordem em que pode aparecer. Ponto de partida, a adaptar à mecânica:

| Evento | Campos | Quando |
| --- | --- | --- |
| `step.start` | `kind`, `bonusId`, `freeSpins` | Início de cada spin visível |
| `grid.drop` | `grid` (matriz de IDs) | Grelha inicial do spin |
| `scatter.land` | `cell`, `count` | Cada scatter que pousa, por ordem de revelação |
| `win.line` / `win.cluster` / `win.ways` | `symbol`, `cells`, `size`, `basePay`, `multiplier`, `pay` | Cada prémio, por ordem de pagamento |
| `grid.remove` | `cells` | Símbolos que saem numa cascata |
| `grid.refill` | `grid`, `newCells` | Símbolos novos que caem |
| `wild.place` | `cell`, `multiplier` | Wild criado por um poder |
| `<poder>.*` | conforme a ficha | Cada poder: carga (ex.: XP), ativação, efeito |
| `multiplier.change` | `from`, `to`, `scope` | Mudança de multiplicador global ou local |
| `bonus.trigger` | `bonusId`, `scatters`, `freeSpins` | Entrada em bónus (no fim do spin que o ativou) |
| `bonus.retrigger` | `added`, `total` | Spins acrescentados |
| `cap.hit` | `limit`, `cut` | O limite cortou o prémio |
| `bonus.end` | `bonusId`, `totalWin` | Último free spin terminado |
| `step.end` | `win`, `roundWinSoFar` | Fim do spin |

Invariantes testadas: a soma dos `pay` dos eventos do passo é igual a `win`; a soma dos `win` dos passos é igual a `totalWin`; tudo o que muda no tabuleiro tem um evento; nenhum evento usa dados fora do contrato.

## 3. Simulador e linha de comandos

`scripts/simulate.js` e `scripts/validate-rtp.js`, com comandos reais no `package.json` e no README:

```text
npm run sim -- --mode base --rounds 100000 --bet 1 --seed exemplo
npm run sim -- --mode <compra> --rounds 10000
npm run validate:rtp              # protocolo padrão (ver secção 4)
npm run validate:rtp -- --large   # amostras grandes
npm run round -- --seed x --mode base   # imprime uma jogada com os eventos (para depurar)
```

O simulador usa **exatamente** o mesmo `playRound` do jogo, não uma cópia simplificada. Exporta JSON para `relatorios/` com a versão, um hash da configuração, as seeds, o tamanho da amostra, a duração e todas as métricas.

## 4. Medir e calibrar o RTP sem o inventar

**Definição:** `RTP = soma dos prémios pagos / soma dos custos efetivos`, medido por modo:

- **Jogo base:** custo = aposta base. Os prémios incluem os bónus que saem naturalmente (os free spins não são uma aposta nova).
- **Hunt/ante:** custo = aposta × fator. Prémios sobre a aposta base.
- **Cada compra:** custo = preço da compra. Uma «ronda» é a compra completa, até ao fim do bónus.

**Protocolo mínimo** depois de qualquer mudança matemática: 100 000 jogadas base, 100 000 de cada aposta extra e 10 000 de cada compra. Para o relatório final, 1 000 000 de jogadas base e de aposta extra. Usa várias seeds independentes. **As seeds de validação não podem ser as mesmas da calibração.**

**Incerteza:** em slots de volatilidade alta, 100 000 spins não chegam para afirmar um RTP com precisão de 1 ponto percentual. A meia-largura do intervalo a 95% é aproximadamente `1,96 × σ / √N`, em que σ é o desvio padrão do prémio por ronda em múltiplos do custo. Com σ = 15 e N = 100 000 dá cerca de ±9 pp, e com N = 1 000 000 cerca de ±3 pp. Calcula σ, apresenta sempre o intervalo e estima-o por lotes independentes de rondas completas (por exemplo, 20 lotes), nunca por free spins soltos.

**Métricas obrigatórias por modo:** RTP e intervalo, σ, frequência de pagamento (> 0), frequência de ganho líquido, distribuição por escalões (0, <1×, 1–5×, 5–20×, 20–100×, 100–1000×, ≥1000×), frequência de bónus (1 em N), duração média dos bónus, % de bónus com retrigger, frequência de cada poder, prémio máximo observado, número de vezes que o limite foi atingido e contribuição de cada componente para o RTP (base, cada bónus, poderes).

**Calibração:**

1. Calcula analiticamente tudo o que der (probabilidades de scatters, valor esperado dos pagamentos simples). Simula o resto.
2. Ajusta só os parâmetros de calibração, uma família de cada vez, e mede de novo.
3. **Preço justo de uma compra:** `preço ≈ valor esperado do bónus comprado / RTP alvo`. Se o contrato fixar um intervalo de preços, ajusta o bónus para caber nele, não o contrário.
4. Cada mudança cria uma nova `MATH_VERSION` (ex.: `nome-v12`) e uma linha no histórico de `docs/matematica.md`. Os relatórios antigos deixam de valer para a versão nova. Guarda só os relatórios da versão atual.
5. Nunca ajustes probabilidades em função do saldo, do jogador ou do histórico.
6. Se a meta não for atingível sem violar o contrato fixo, para e apresenta as opções com números. Não violes o contrato.

Um RTP medido localmente **não é** certificação. Diz isto no relatório e no `docs/matematica.md`.

## 5. Testes do motor (`node --test`)

Escreve testes com significado, não repetições da implementação:

- Tabela: cada símbolo e escalão com uma grelha montada à mão.
- Deteção de linhas/clusters/ways: casos-limite como diagonais que não contam, empates, sobreposições, wilds a ligar dois grupos e grupos só de wilds.
- Wild, scatter e cada poder: ativação, alvo indisponível, máximos, interações.
- Multiplicadores: os exemplos numéricos do documento.
- Bónus: entrada, retrigger, máximo de spins, saída.
- Arredondamento e limite: incluindo a repartição do corte pelos eventos.
- Determinismo: a mesma seed dá a mesma jogada, e o estado do RNG continua entre jogadas sem nunca ser reiniciado.
- Invariantes em 10 000 jogadas aleatórias: dinheiro inteiro, soma dos eventos igual ao total, nunca acima do limite, configuração congelada.
- Validação da configuração: uma configuração inválida falha logo.
- Cenários de diagnóstico: cada `scenario()` produz o que promete e vem marcado como forçado.

## 6. Entregáveis

1. `src/` com o motor completo e a configuração versionada e validada.
2. `scripts/` com o simulador e a validação de RTP. `package.json` com `test`, `sim`, `round` e `validate:rtp`.
3. `relatorios/` com os relatórios da versão atual.
4. `docs/matematica.md` (regras atuais, tabela de pagamentos com os pesos, tabela de RTP medido com amostras e intervalos, histórico de versões), `docs/eventos.md` (catálogo de eventos e API) e `README.md`.
5. `AGENTS.md` da pasta do jogo com o contrato fixo e a regra «após mudanças de matemática, correr `validate:rtp` e apresentar a tabela de RTP por modo».
6. Todos os testes a passar.

## 7. Relatório final ao dono do jogo

Responde com: o que foi decidido por hipótese (lista curta), a tabela de RTP por modo (amostra, RTP, intervalo a 95%, σ, frequência de bónus, prémio máximo observado), os parâmetros finais mais importantes, os comandos para reproduzir e as limitações conhecidas. Não escrevas «RTP confirmado» nem «certificado». Escreve «medido em N jogadas, intervalo X–Y».

## Erros comuns a evitar

- Confundir a probabilidade por posição com a frequência por spin ou por bónus. Mede as duas.
- Calcular o RTP de uma compra com a aposta base no denominador, ou o RTP dos free spins a dividir por zero.
- Validar com as mesmas seeds usadas para calibrar e anunciar o resultado como validação.
- Deixar notas antigas contraditórias no topo das regras. O histórico vai para o fim.
- Manter motores antigos para terminar rondas pendentes. Guarda antes o resultado da jogada no início.
- Afinar o RTP mexendo em algo que o dono do jogo fixou.
