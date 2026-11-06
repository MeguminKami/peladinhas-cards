# Matemática e regras exatas — PEACE POLICE: THE AFTERPARTY

> **Versão da matemática:** ver `tabelas/versao.js` (atual: `pp-v6`). Este documento descreve **exatamente** o que o motor faz. Os valores numéricos vivem nas tabelas (`tabelas/*.js`, `npm run tabelas`). O RTP é **medido localmente** por simulação: **não é certificação.**

---

## 1. Contrato fixo e parâmetros de calibração

O **contrato fixo** está em `AGENTS.md` e não se mexe para calibrar. São **parâmetros de calibração** todos os valores das tabelas: pesos, empilhamento, pagamentos, parâmetros dos poderes e das fusões, ranking das fusões, multiplicadores dos cantos, probabilidades do Peace Police, Joiner, preços das compras e custo da aposta extra.

## 2. Grelha, símbolos e unidades

- Área 5×5, `col` 0..4 da esquerda para a direita e `row` 0..4 de cima para baixo. Índice = `col × 5 + row`. Cantos (0,0), (4,0), (0,4) e (4,4) fechados no início: **21 células**.
- IDs estáveis: `N1` Bob Joint, `N2` Copo de shot, `N3` Botija de Copium, `N4` Pastilha, `N5` Selo, `P1` WEED, `P2` ALCOOL, `P3` COPIUM, `P4` MDMA, `P5` LCD, `W` Wild, `CW` Wild de Canto, `DW` Joiner, `S` Passe da Afterparty.
- **Unidades:** os prémios são inteiros em **milésimos de aposta base** (1000 = 1×). A tabela aceita no máximo 3 casas decimais. O dinheiro só se calcula no fim: `totalWin = floor(aposta × mils / 1000)`.

## 3. Geração dos símbolos

1. Cada célula vazia é sorteada por **pesos relativos** (`PESOS[conjunto]`). O conjunto depende do modo: `base`, `hunt` ou o do bónus. Peso relativo não é probabilidade final: `npm run tabelas` mostra a probabilidade por posição, e a simulação mostra as frequências observadas.
2. **Empilhamento** (`EMPILHAMENTO[conjunto]`): antes do sorteio, a célula copia o símbolo **de cima** com probabilidade `vertical`; se não copiar, copia o **da esquerda** com probabilidade `horizontal`. As probabilidades dependem de o vizinho ser baixo ou premium. Só se copiam símbolos pagantes. É o que controla a frequência de clusters grandes e de despertares.
3. **Scatter:** podem cair vários na mesma coluna (`scatterMaximoPorColuna` = 5, sem limite prático). Se o limite fosse atingido, sorteava-se sem `S`.
4. **Raridade validada:** os pesos são estritamente decrescentes de N1 a P5.
5. **Não há wilds naturais:** W, CW e DW só nascem dos poderes, dos cantos e do Peace Police.
6. Ordem de sorteio: colunas da esquerda para a direita e linhas de cima para baixo (na grelha inicial e nas cascatas).

## 4. Pagamento (Cluster Pays)

- Um cluster é um grupo **ortogonal** de células do tipo *t* ou wild (W, CW, DW) com **pelo menos 4 células** e **pelo menos 1 símbolo real** do tipo *t* (`clusterMinimoReais`, pp-v3): os wilds contam por inteiro; um cluster só de wilds não paga. As diagonais não ligam. Um wild pode pertencer a clusters de tipos diferentes no mesmo ciclo.
- Prémio = valor de `PAGAMENTOS[t]` na coluna do tamanho × multiplicador. As colunas (`COLUNAS`, desde pp-v4) são 4, 5, …, 14, **15–17, 18–20, 21–24 e 25**: cada coluna vale desde o seu tamanho até ao início da seguinte − 1. Sem cantos abertos, o maior cluster tem 21 células (coluna 21–24); a coluna 25 é o ecrã cheio com os 4 cantos.
- **A tabela é design, não calibração** (decisão do dono, pp-v5): cada linha = valor base do símbolo × a mesma curva de crescimento (ver o cabeçalho de `tabelas/pagamentos.js`). O RTP e a volatilidade afinam-se com probabilidades e multiplicadores, nunca a mexer nos pagamentos.
- **Nenhum prémio base paga menos de 0,10×** (pp-v4; validado ao arrancar desde pp-v7): nenhum cluster, de qualquer tamanho ou símbolo, paga menos de 0,10× antes do multiplicador. Só o N1 num cluster de 4 paga o mínimo.
- **Regras de forma**, validadas ao arrancar (o `src/config.js` recusa uma tabela que as quebre):
  1. o símbolo de cima paga sempre mais do que o de baixo (N1 < … < N5 < P1 < … < P5), sem empates;
  2. em cada linha, cada salto é ≥ ao anterior (o crescimento nunca abranda);
  3. a diferença entre dois símbolos seguidos nunca encolhe com o tamanho;
  4. cada coluna paga pelo menos +15 % do que a anterior.
- **Multiplicador** (pp-v7) = `min(teto, max(1, Σ CW) × max(1, Σ DW))`: os Wilds de Canto do cluster somam; o Joiner multiplica essa soma. O teto é `CANTOS.multClusterMax` no jogo base e na MAIS SCATTERS, e `BONUS.<id>.multClusterMax` em cada bónus.
- **Atribuição** (relatórios): `base × (Σ CW − 1)` vai para `mult:CW` e o que o Joiner acrescenta (`base × Σ CW × (Σ DW − 1)`) vai para `mult:DW`, à escala do prémio pago.
- Todos os clusters do ciclo pagam-se em simultâneo, do maior prémio para o menor. Em caso de empate: P5 → N1, depois o maior tamanho.
- **Wild de Canto:** depois do pagamento, cada CW que participou em pelo menos um cluster nesse ciclo ganha `+incrementoPorPremio`, até `multiplicadorMax` (no bónus, `+incrementoCanto` se o bónus o definir, até `multCantoMax` do bónus).
- **HOLD wild** (pp-v3): um W que fica no tabuleiro através das cascatas e respins até entrar num prémio; quando paga, sai com o cluster. São HOLD os W do rasto do SLOW DISASTER e os W que entram num grupo sticky (WEED, FROZEN REALITY, FREEZE & FREAK) e pagam num cluster de outro tipo (no cluster do próprio grupo ficam até ao pagamento final do grupo). Um W preso num grupo também não salta com o TOTAL MAYHEM. Os CW e DW não são HOLD: ficam até ao fim do spin.

## 5. Cascatas e gravidade

1. Os vencedores saem, **exceto os sticky**: CW, DW, wilds pegajosos, células de grupos sticky e cantos fechados.
2. Em cada coluna, os símbolos não-sticky que sobram caem para as posições não-sticky mais baixas, passando pelas sticky. Os novos entram por cima.
3. O ciclo repete-se enquanto houver prémios ou mudanças no tabuleiro.
4. Limite de segurança: `limiteCiclosPorSpin` ciclos por spin. Nunca é atingido em teste. Se fosse, o spin terminava e pagava o que já estava ganho.

## 6. Despertar

- Um cluster **pago** de premium com **5 ou mais** células desperta a personagem. No jogo base, cada personagem desperta no máximo uma vez por spin. No bónus fica desperta até ao fim, e cada novo cluster 5+ do seu tipo **volta a disparar** o poder, até `maxDisparosPorSpin` por spin.
- Vários despertares no mesmo ciclo resolvem-se pela ordem de pagamento.

## 7. Poderes (fichas)

Formato: **condição → alvo → efeito → limites → sem alvo**. Os valores entre `[]` estão em `tabelas/poderes.js`.

**LCD — REALITY BREAK** (depois do refill)
- **Alvo:** o tipo T = o premium com o maior grupo (tipo + wilds); em caso de empate, RNG; sem premiums, um premium aleatório.
- **Efeito:** todos os Selos (N5) livres passam a T. Se forem menos de `[celulasMinimas]`, completa com baixos à volta do maior grupo (anel a anel) e depois com baixos aleatórios.
- **Party:** também transforma `[partyTiposExtra]` tipo(s) de baixo aleatório(s).
- **Teto** (pp-v7): no máximo `[celulasMax]` células (`[celulasMaxParty]` em Party Mode); se houver mais, escolhem-se ao acaso. Vale também para as fusões que usam o LCD.

**WEED — SLOW MOTION** (antes da remoção)
- O cluster que despertou **não sai**: torna-se um grupo sticky.
- Depois de cada refill, até `[maxConversoesPorCiclo]` Bob Joints (N1) adjacentes passam a P1 e entram no grupo.
- `[pagamentoAoCrescer]` (decisão do dono: `'tamanho-final'`): o cluster que acordou o WEED **não paga logo**, e o grupo **não paga enquanto cresce**. Quando, num ciclo, deixa de crescer, paga **uma única vez** o cluster que forma nesse momento (tamanho final e multiplicadores CW/DW desse momento) e sai. Se ainda existir no fim do spin (Party Mode, FROZEN REALITY), paga nesse momento.
  - `'diferenca'`: paga a cada crescimento a diferença da tabela.
  - `'novo-tamanho'`: paga a cada crescimento o valor completo.
- **Party:** não dissolve; paga o tamanho final no fim do spin.
- **Exemplo** (tabela P1 em pp-v5: 5 = 0,50×, 15–17 = 3,60×): grupo 5 → 7 → 10 → 15 com um canto ×5 no fim = **uma** linha `3,60 × 5 = 18,00×`.

**MDMA — RAVE RUSH** (depois do refill)
- Movimentos = `[movimentosBase]` + nº de Pastilhas (N4), até `[movimentosMax]` (Party: `[movimentosMaxParty]`).
- **Alvo:** o maior grupo premium.
- **Efeito:** cada movimento leva o símbolo igual mais próximo (fora do grupo) para uma célula adjacente ao grupo, de preferência uma Pastilha, e troca-os.
- **Sem símbolo igual livre:** uma Pastilha transforma-se no tipo.

**ALCOOL — DRUNK WALK** (depois do refill)
- Começa num Copo de shot (N2) aleatório (se não houver, numa célula pagante).
- Comprimento = `[passosBase]` + nº de Copos, até `[passosMax]` wilds.
- Anda **sempre em diagonal**, e o RNG escolhe a direção. Cada célula pisada vira W. Não pisa S, CW, DW, W nem sticky.
- **Party:** `[rastosParty]` rastos.

**COPIUM — ONE MORE CHANCE** (no fim da sequência)
- Ao despertar fica **armado**. Quando a sequência acaba, guarda o maior grupo premium com 2 ou mais células (se não houver, o maior de qualquer tipo).
- Cada Botija de Copium (N3) livre é revelada: passa ao tipo guardado com `[probRaspadinha]` %, senão sorteia-se.
- As restantes células livres fazem respin, e a seguir corre a sequência normal de cascatas.
- `[respins]` respin (Party: `[respinsParty]`).
- No máximo 1 sequência de respins própria por spin. Uma fusão pode armar uma 2.ª.

## 8. Fusões

- **Regra:** cada despertar a partir do 2.º (sem Calmer ativo) funde com o parceiro desperto **de rank mais forte** cujo par ainda não fundiu. A fusão **substitui** o poder normal desse despertar.
- **Fusão surpresa** (pp-v6): no início de cada spin do jogo base / hunt, depois da queda da grelha, com `FUSAO_SURPRESA.probabilidade[modo]` % dispara uma das 10 fusões (pesos iguais), sem cluster (`runFusion(ctx, f, null)`), fora de Party Mode. Emite `fusion.trigger` com `persona: null` e `surprise: true`. Não acorda personagens, não conta para o Chemistry e não entra no conjunto de pares fundidos do spin (os despertares continuam a gerar a sua fusão). Nunca acontece nos bónus nem em cenários forçados sem `force.surprise`. Desliga-se para análise com `--desligar surpresa`.
- **No bónus:** os pares fundidos ficam fundidos. Quando uma personagem fundida volta a disparar, dispara a fusão de rank mais forte dos seus pares fundidos.

| Fusão | O que o motor faz |
|---|---|
| NEVER_ENDING_DREAM (WEED+COPIUM) | Arma o COPIUM. O respin repete-se enquanto o grupo guardado crescer, até `maxRespins` |
| ONE_MORE_ROUND (ALCOOL+COPIUM) | Arma o COPIUM. Cada respin que não faz crescer o grupo põe 1 W adjacente e dá outro respin, até `maxRespinsExtra` |
| SLOW_DISASTER (WEED+ALCOOL) | DRUNK WALK com wilds pegajosos. O bêbado dá mais 1 passo por ciclo, até `passosExtraMax` |
| RAVE_DIMENSION (LCD+MDMA) | RAVE RUSH em que cada movimento **copia** (a origem fica igual) |
| TOTAL_MAYHEM (MDMA+ALCOOL) | DRUNK WALK. Depois, em cada ciclo, os wilds do rasto **saltam** para a célula que liga 2 grupos do mesmo tipo (ou para junto do maior grupo), até `saltosMax` ciclos |
| FROZEN_REALITY (LCD+WEED) | REALITY BREAK. As células transformadas ficam sticky até ao fim do spin, como grupos que crescem (Bob Joints adjacentes). Pagam o tamanho final no fim do spin |
| FREEZE_AND_FREAK (WEED+MDMA) | O cluster que despertou fica sticky (como o SLOW MOTION, mesma regra de pagamento) e, depois de cada refill, puxa 1 símbolo igual, até `puxoesMax` |
| DREAM_GLITCH (LCD+COPIUM) | Arma o COPIUM. No respin só caem o tipo guardado e baixos, e as Botijas de Copium revelam sempre o tipo guardado |
| ONE_MORE_RAVE (MDMA+COPIUM) | Arma o COPIUM. No respin, todos os iguais ao grupo guardado são puxados para junto dele |
| DOUBLE_VISION (LCD+ALCOOL) | DRUNK WALK mais um rasto em espelho horizontal (col → 4 − col) |

## 9. Chemistry, cantos e Total Chemistry

- Nível = nº de personagens diferentes despertas (no spin, ou no bónus inteiro).
- **Ao chegar ao nível 3** abrem `cantosNivel3` cantos fechados (escolhidos pelo RNG). **Ao chegar ao 4** abrem todos os que faltam. Os cantos abrem com um CW de multiplicador inicial: `multiplicadorInicial` no jogo base, `multCantoInicial` no bónus.
- **Nível 5 — TOTAL CHEMISTRY** (uma vez por spin no jogo base, uma vez por bónus): cada CW ganha `+totalSomaCantos` (pp-v7; até `multiplicadorMaxAbsoluto`; no bónus, `multMaxAbsoluto` do bónus se existir; o DW não muda), e o poder normal de cada personagem desperta re-dispara em **Party Mode**.
- O **Calmer** bloqueia cantos, fusões e Total Chemistry no resto desse spin.

## 10. Peace Police

- Em cada despertar (ou re-disparo), se ainda não apareceu nesse spin, aparece com `probAparecer[modo]` %. O modo é Joiner com `probJoiner[modo]` %, senão Calmer.
- **CALMER:** todos os baixos livres são removidos (sem pagar) e há refill (as células novas contam como origem `CALMER`). Fecha a escalada nesse spin. Nunca tira prémios.
- **JOINER:** Party Mode para o resto do spin. Deixa cair 1 **Joiner** (DW, multiplicador sorteado em `distintivo`; um bónus pode ter pesos próprios em `BONUS.<id>.distintivo`) junto ao maior grupo premium. Com `joinerRepetePoderes`, o poder normal de cada personagem já desperta re-dispara uma vez em Party Mode.
- **POLICE PARTY:** o Joiner entra no início de **todos** os spins (Party Mode e 1 Joiner novo por spin). Não há outras aparições.

## 11. Bónus

| | AFTERPARTY (3 S) | VIP (4 S) | POLICE PARTY (5 S) |
|---|---|---|---|
| Spins | 10 | 10 | 10 |
| Volatilidade (pp-v5) | média | alta | muito alta |
| Personagens no início | 0 | 1 (RNG) | 2 (RNG), com o par já fundido |
| Cantos no início | 4 | 3 (RNG) | 0 (abrem com o Chemistry) |
| CW entre spins | voltam ao inicial | persistem | persistem |
| CW inicial / incremento / máx. | ×1 / +1 / ×2 | ×2 / +1 / ×10 (×20 com Total) | ×1 / +2 / ×50 |
| Joiner | pesos gerais | pesos gerais | pesos próprios, até ×50 |
| Joiner | aleatório | aleatório | todos os spins |

- Comum: as personagens ficam despertas e as fusões persistem. Os cantos abertos ficam abertos. Os grupos sticky, os wilds pegajosos, os DW e o Party Mode reiniciam em cada spin (o DW do POLICE PARTY é novo em cada spin).
- **Retrigger** (pp-v7): no bónus nunca há mais de `scattersMaximoNoBonus` (3) S no ecrã num spin, contando as cascatas: quando já há 3, as células novas sorteiam-se sem S. No fim do free spin, `spinsPorScatters` dá os spins extra (3 S → +5), até `spinsMaximoTotal`. Não sobe de nível de bónus.
- Os Scatters contam-se **no fim** do spin (depois de todas as cascatas e respins).

## 12. Modos, custos e compras

- **Base:** custo 1×. **Hunt (MAIS SCATTERS):** custo `MODOS.hunt.custo` × aposta, com o conjunto de pesos `hunt` (mais Scatters). Os prémios são sempre sobre a aposta base.
- **Compras:** entram **diretamente** no bónus (sem spin base). O custo é o preço da tabela × aposta.
- **Preço justo** ≈ valor médio medido do bónus / RTP alvo. O simulador mostra-o em cada corrida de compras.

## 13. Ganho máximo e arredondamento

- Limite: `ganhoMaximo` × aposta por **jogada completa**, bónus incluído.
- Ordem: prémio da tabela → × multiplicador → limite (os mils são exatos, não há arredondamento intermédio).
- Quando um prémio passa o limite, é cortado (evento `cap.hit`) e a jogada termina, incluindo os free spins que faltavam. A soma dos eventos é sempre igual ao total pago.

## 14. Ordem de resolução de um spin

```text
grelha inicial → [POLICE PARTY: Joiner + Joiner]
ciclo:
  1. avaliar clusters, pagar, crescer CW
  2. despertares (decide fusão; WEED / FREEZE & FREAK criam o grupo sticky antes da remoção)
  3. remover vencedores não-sticky e dissolver grupos que não cresceram → refill
  4. para cada despertar: poder ou fusão → Chemistry (cantos / Total) → Peace Police
  5. efeitos contínuos: grupos crescem (+íman), SLOW DISASTER, TOTAL MAYHEM
  6. repetir enquanto houver prémios ou mudanças
fim → COPIUM armado? respins (cada um volta ao ciclo) → grupos sticky ainda vivos pagam o tamanho final → contar Scatters → bónus
```

## 15. Atribuição do RTP (só estatística)

Cada célula guarda a origem: `natural`, o poder ou fusão que a criou ou mexeu, ou `CALMER`. A parte ×1 de cada prémio divide-se pelas origens das células do cluster (proporcional ao nº de células). A parte acima de ×1 vai para `mult:CW` e `mult:DW` (proporcional aos multiplicadores). Mede quem produz valor, não causalidade perfeita.

---

## 16. RTP e volatilidade medidos (`pp-v6`)

Validação com uma seed diferente das de calibração: «validacao-pp-v6-c» (16 M spins de base e de hunt, 200 000 por compra). Para repetir: `npm run sim -- --seed validacao-pp-v6-c --spins 16000000 --compras 200000`. Calibração: «calib-v6a/b», «validacao-pp-v6» e «validacao-pp-v6-b» (estas duas passaram a calibração quando o peso do N1 voltou a mexer). Alvo do dono: **98 %**. Medição local, não certificação: o dono confirma com as suas corridas.

| Modo | Custo | RTP | Valor médio | Mediana | p90 | Maior visto |
|---|---|---|---|---|---|---|
| Jogo base | 1× | **97,07 % ± 0,89** (decomposto) · 96,86 % ± 1,11 (direto) | — | 0× | — | 9 954× |
| Aposta extra MAIS SCATTERS | 2× | **98,39 % ± 0,66** (decomposto) · 99,08 % ± 1,08 (direto) | — | 0× | — | 16 660× |
| Compra AFTERPARTY | 160× | **97,59 % ± 0,65** | 156,1× | 37× | 490× | 2 560× |
| Compra VIP AFTERPARTY | 336× | **97,67 % ± 0,86** | 328,2× | 39× | 1 181× | 8 249× |
| Compra POLICE PARTY | 830× | **98,20 % ± 1,00** | 815,1× | 16× | 3 056× | 25 000× (3×) |

Todos os modos ficam a menos de 1 ponto de 98 %, com 98 % dentro do intervalo de confiança.

**Fusão surpresa (3 %):** cada uma vale em média cerca de 5× a aposta (arma respins, deixa rastos de wilds, cria grupos sticky e ajuda a cair Scatters). Sem compensação, o jogo base passava de 97 % para ~115 %. Compensou-se com o Scatter do jogo base mais raro (S 20 → 16).

**Jogo base sem bónus:** 73,2 % (era 60 % em pp-v5): a fusão surpresa passa valor dos bónus para o jogo base. No MAIS SCATTERS, 34,2 % do custo.

| Bónus | Frequência no base | Frequência no MAIS SCATTERS |
|---|---|---|
| AFTERPARTY | 1 em 831 | 1 em 177 |
| VIP AFTERPARTY | 1 em 8 904 | 1 em 1 355 |
| POLICE PARTY | 1 em ~57 600 | 1 em ~5 100 |

**Volatilidade por bónus** (não muda com a fusão surpresa, que não existe nos bónus):

| | AFTERPARTY (média) | VIP (alta) | POLICE PARTY (muito alta) |
|---|---|---|---|
| Desvio-padrão ÷ preço | 1,47 | 1,96 | 2,28 |
| Compras abaixo de metade do preço | 61,7 % | 72,2 % | 75,4 % |
| Compras acima do preço | 29,5 % | 22,3 % | 21,4 % |
| Ganho máximo (25 000×) | nunca visto | nunca visto | 1 em ~40 000 compras (todas as corridas) |

O que mais mexe na volatilidade é **quantos cantos começam abertos**, não os tetos: subir os multiplicadores aumenta o valor do bónus, mas o preço sobe na mesma proporção. Por isso a AFTERPARTY começa com os 4 cantos (paga com regularidade) e a POLICE PARTY começa com eles fechados (o valor depende de os abrir e de os fazer crescer até ×50).

**O que mudou em pp-v6** (desde pp-v5):
- **Fusão surpresa:** 3 % dos spins do jogo base e do MAIS SCATTERS (§8).
- **Scatter do jogo base:** S 20 → 16 (N1 430, igual).
- **MAIS SCATTERS:** custo 1,4× → 2×; Scatter 26 → 29 (N1 415 → 369). O AFTERPARTY fica ~4,7× mais frequente do que no jogo base.
- **Preços das compras** para o alvo de 98 %: 161 / 336 / 836 → 160 / 336 / 830.

**pp-v5** (tabela de pagamentos fixa de design, ganho máximo 25 000×, volatilidade por bónus): AFTERPARTY 4 cantos ×1 (máx. ×2); VIP 3 cantos persistentes (máx. ×10, ×20 com Total); POLICE PARTY cantos fechados, nascem ×1, +2 por prémio, até ×50, Joiner `{×2: 40, ×3: 30, ×5: 18, ×10: 8, ×25: 3, ×50: 1}`.

## 17. Decisões tomadas na Fase 1 que precisam da aprovação do dono

Estas decisões não estavam no GDD ou mudam algo do GDD. **Ainda por aprovar: D2, D5, D6, D7, D8, D12, D13.** Foram necessárias para o jogo funcionar ou para fechar o RTP. **Todas são reversíveis**, e a coluna «Onde» diz o que mudar.

| # | Decisão | Porquê | Onde |
|---|---|---|---|
| D1 | ✅ **Revisto pelo dono (pp-v3):** os wilds contam por inteiro, basta 1 símbolo real. Para não haver ciclos infinitos, os HOLD wilds saem quando pagam (§4) | Em pp-v2 eram 3 reais; um tabuleiro cheio de wilds com 2 ALCOOL pagava 0 | `JOGO.clusterMinimoReais = 1` + motor |
| D2 | Os wilds pegajosos do SLOW DISASTER saem depois de participar num prémio | A mesma razão do D1 | motor |
| D3 | ✅ **Decidido pelo dono:** o grupo sticky paga **uma vez, pelo tamanho final** (com os multiplicadores desse momento), quando para de crescer ou no fim do spin. O cluster que o cria também não paga logo | «Está a crescer para pagar mais» | `PODERES.WEED.pagamentoAoCrescer = 'tamanho-final'` |
| D4 | ✅ **Aprovado.** Geração com empilhamento (cópia do vizinho de cima ou da esquerda) | Sem isto, despertar era 1 em 600 spins. Agora é 1 em 16, sem mudar a regra dos 5+ | `EMPILHAMENTO` |
| D5 | O Joiner também **re-dispara em Party Mode** os poderes já despertos | Interpretação de «todas as despertas ficam em Party Mode»: é o momento de loucura pedido | `PEACE_POLICE.joinerRepetePoderes` |
| D6 | O LCD transforma no mínimo 4 células (completa com baixos junto ao maior grupo) | Sem isto, o LCD valia 0,23× por disparo | `PODERES.LCD.celulasMinimas` |
| D7 | O COPIUM prefere guardar um grupo premium | Guardar baixos quase não dava valor | motor |
| D8 | As compras entram **diretamente** no bónus (sem spin base) | É o comportamento habitual de uma compra | motor |
| D9 | ✅ **Aprovado.** Teto dos Wilds de Canto ×5 no jogo base e no AFTERPARTY, ×4 no VIP e no POLICE PARTY. O POLICE PARTY começa em ×2 | Com ×10, os cantos davam 43 % do RTP do jogo base sozinhos | `CANTOS`, `BONUS.*.multCanto*` |
| D10 | ✅ **Aprovado.** Preços = valor medido / 97,5 %: agora **69× / 216× / 820×** | A escada de valor ×1 → ×3,1 → ×11,9 mantém-se | `MODOS` |
| D11 | ✅ **Decidido pelo dono:** vários Scatters por coluna | O VIP passou de 1 em ~3 900 para 1 em ~3 100 e o POLICE PARTY de 1 em ~83 000 para 1 em ~20 700 | `JOGO.scatterMaximoPorColuna` |
| D12 | No bónus, o Peace Police também pode aparecer nos re-disparos | Mais oportunidades de Joiner no bónus | motor |
| D13 | Aposta extra: custo 1,5×, Scatter 36 em vez de 26 (bónus ~2,3× mais frequente) | Fecha os 97,5 % com o custo de 1,5× | `PESOS.hunt` |

## 18. Histórico

| Versão | Data | Mudança |
|---|---|---|
| pp-v1 | 03-11-2026 | Primeira versão completa: motor, tabelas iniciais, calibração inicial |
| pp-v2 | 03-11-2026 | Decisões do dono sobre D1–D13: vários Scatters por coluna; grupos sticky pagam o **tamanho final** uma vez; pagamentos +13 %; preços 71× / 220× / 820×; Scatter base 26 / hunt 36 / bónus 12 |
| pp-v2 (sem mudança de versão) | 03-11-2026 | Fase 2: eventos com mais informação para a interface — `grid.drop.mult`, `power.rave_rush.move.symbol`, `power.slow_motion.grow.symbol` e `power.slow_motion.start` com `kind: 'frozen'` (FROZEN REALITY). **Os resultados não mudam**: mesmas grelhas, prémios e estado do gerador em 34 500 jogadas comparadas (todos os modos); por isso a versão e o RTP medido mantêm-se |
| pp-v7 | 05-11-2026 | Decisões do dono: o Joiner multiplica a soma dos cantos (teto por modo); tabela ~2× com curva mais forte no fim (21–24 ×25, ecrã cheio ×50) e mínimo 0,10× validado; multiplicadores mais baixos; Total Chemistry +1 aos cantos; tetos nos poderes (LCD, WEED, MDMA, ALCOOL, NEVER ENDING DREAM); Scatter base 18 / hunt 33; preços 126× / 334× / 840× |
| pp-v6 | 04-11-2026 | Decisões do dono: fusão surpresa em 3 % dos spins do jogo base e do MAIS SCATTERS; alvo de RTP 98 %; Scatter base 16; MAIS SCATTERS a 2× com Scatter 29; preços 160× / 336× / 830× |
| pp-v5 | 04-11-2026 | Decisões do dono: tabela de pagamentos fixa de design (4 regras de forma); ganho máximo 25 000×; volatilidade por bónus (AFTERPARTY média, VIP alta, POLICE PARTY muito alta); Scatter base 20 / hunt 26; preços 161× / 336× / 836× |
| pp-v4 | 04-11-2026 | Decisões do dono: nenhum prémio abaixo de 0,10×; ecrãs cheios de wilds mais raros e mais bem pagos (colunas 18–20, 21–24 e 25 na tabela; menos wilds do ALCOOL, SLOW DISASTER e TOTAL MAYHEM); tabela +2 %; preços 61,5× / 160× / 864× |
| pp-v3 | 03-11-2026 | Decisão do dono: os wilds contam por inteiro (1 símbolo real chega); HOLD wilds saem quando pagam; W preso num grupo não salta no TOTAL MAYHEM (corrige um caso que deixava símbolos estranhos num grupo sticky). Pagamentos comprimidos nos tamanhos grandes, aposta extra 1,4× (Scatter 35), preços 53× / 128× / 687× |


**Identidade visual aprovada em 05-11-2026:** N1 Bob Joint, N3 Cope Cannister (botija de Copium), N4 Pastilha vermelha «Move» e N5 Selo colorido. A abertura da botija revela o símbolo no lugar da antiga raspagem. Os IDs, eventos e parâmetros internos mantêm-se, incluindo `probRaspadinha` por compatibilidade. A alteração dos nomes muda o hash da configuração, mas não a versão matemática nem os resultados das jogadas.
