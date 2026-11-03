# Visuais e animações

## Arte

Arte final em [ui/art](../ui/art). O jogo carrega versões **WebP** (`*.webp`, ~1,6 MB no total em vez de ~14 MB): símbolos a 320 px, emblemas de bónus a 512 px, cenário e moldura no tamanho original. Os PNG ficam ao lado como fonte; para regenerar, reduzir o PNG e gravar WebP (qualidade 88, cenário 80) com o mesmo nome. nomes e hierarquia dos símbolos em [ui/symbols.js](../ui/symbols.js). Referências de produção em [ASSETS](../ASSETS). Fonte do jogo: Cormorant Garamond (`ui/fonts`), com algarismos alinhados (lining) nos valores de saldo, ganhos e preços.

| Símbolos | Ficheiros |
| --- | --- |
| Normais N1–N5 | `n1-color` … `n5-color` (folha, laço, lua, coração, cristal) |
| Premium P1–P5 | `miffy2-color`, `miffy1-color`, `misty-color`, `joao-color`, `sofia-color` |
| Flor Scatter | `scatter-color` |
| WILD | `wild-emblem` + multiplicador e "WILD" em texto, num único bloco `.wild-art` (anima como uma peça) |
| Bónus | `bonus-common` (Jardim Encantado), `bonus-moon` (Baile ao Luar), `bonus-secret` (Coroa da Aurora), `bonus-hunt` |
| Cenário e extras | `scene`, `logo`, `fairy-dust`, `retrigger`, `notice-frame` |

## Spin e suspense de Scatters

- As colunas caem da esquerda para a direita, cada uma de baixo para cima (`revealSpin` em `ui/motion.js`). O ritmo depende só do que já está à vista, nunca do resultado.
- Regras em `scatterSuspense(mode)` (`ui/app.js`), iguais no spin e nas cascatas:

| Modo | Flores à vista | Suspense |
| --- | --- | --- |
| Jogo normal e Hunt | 2 / 3 / 4 (com hipótese de mais uma) | nível 1 rosa / 2 lilás / 3 dourado |
| Free spins | 1 (à espera de +2 spins) / 2 (à espera de +4) | nível 1 / 2 |

- Em suspense, os símbolos seguintes caem um a um com um feixe de luz na coluna; as flores pousadas pulsam; nos níveis 2 e 3 a moldura brilha mais e o resto da grelha escurece (opacidade 78% / 55%); no 3 a coluna treme ligeiramente.
- Cascatas (`cascadeBoard`): se as flores que ficaram permitirem mais uma, os símbolos novos caem um a um com suspense; uma flor nova conta logo e pode subir o nível.
- Compra de bónus: grelha teatral sorteada a cada compra (3/4/5 flores em colunas e linhas aleatórias) revelada com o mesmo suspense; não altera motor, saldo nem XP.

## Ganhos

- Normal e Rápido: cada hit é apresentado individualmente; o seguinte só começa quando o anterior acaba. Ultra/turbo: todos os grupos brilham e mostram o valor ao mesmo tempo.
- Com WILD multiplicador (multiplicador total > 1): ganho do cluster → `× N` (o multiplicador em destaque e os WILDs do hit brilham) → a conta funde-se no resultado → sobe e desaparece. 360 ms por etapa em Normal, escalado pela velocidade (sem mínimos fixos).
- Escalões de cor e tamanho por múltiplo da aposta (`ui/payout-presentation.js`).

## Magia, flores e bónus

- XP: os vencedores desfazem-se em poeira que voa para a barra; barra cheia vibra com cores; a magia entra com uma fada e os WILDs pousam um a um.
- Flores confirmadas convergem para o centro antes do bónus; introdução com ornamento PNG, nome, spins e descrição.
- Retrigger com o PNG próprio; MAX WIN num painel próprio.

## Painel de regras

Quatro separadores ilustrados com a arte do jogo (`rulesContent` em `ui/app.js`, estilos em `ui/rules.css`): **Jogar** (mini-grelha com grupo ligado e diagonal que não conta; 3 passos), **Wilds** (W a completar grupo; 2× + 3× = ×5 com a conta; barra → magia; tabela da magia por modo; XP por grupo recolhido), **Flores e bónus** (flor em destaque; 3/4/5 flores → bónus; retriggers; Bonus Hunt), **Pagamentos** (tabela única com imagem de cada símbolo). Demonstrações locais no fim do painel.

## Ritmo, velocidade e turbo automático

Tudo passa por um único relógio, [ui/tempo.js](../ui/tempo.js). As durações no código estão sempre em **ms da velocidade Normal**; a velocidade só muda o `rate` do relógio (Normal 1×, Rápido 3,1× — 2,4× dentro dos bónus —, Ultra 6,25×). As animações Web Animations registadas (`track`/`animate`) e as esperas (`wait`, `pause`, impactos dos símbolos, etapas do cálculo do multiplicador, contagens) seguem esse ritmo, por isso mudar a velocidade a meio é contínuo e o som fica sincronizado. Não há tempos mínimos fixos.

**Turbo automático (ultra spin).** Quem carrega repetidamente quer jogar depressa, sem ir às definições:

| Ação do jogador | Efeito |
| --- | --- |
| 2 toques em 1,2 s, ou um toque até 0,7 s depois do fim de uma jogada | a jogada seguinte corre em Ultra; o botão de velocidade mostra **Turbo** |
| Parar de carregar ~1,8 s | volta sozinho à velocidade escolhida |
| Manter o espaço premido | turbo contínuo: cada jogada arranca mal a anterior acaba |
| 1.º toque durante um spin | acelera esse spin 3× de forma suave (nada é cortado) |
| 2.º toque durante um spin | 8× e a jogada seguinte fica em espera (arranca sem tempo morto) |
| 3.º toque durante um spin | salta o resto da apresentação desse spin (só desse spin, nunca do bónus inteiro) |

Em Ultra (escolhido ou turbo) a coreografia é própria: as colunas caem quase juntas, o suspense é por coluna e não símbolo a símbolo, os ganhos aparecem em simultâneo, os WILDs da magia pousam em onda e o aviso da magia é mais curto. Normal e Rápido mantêm o ritmo aprovado.

**Arranque imediato.** No toque, os símbolos começam logo a sair enquanto o pedido segue para a carteira do casino (`preExit` em `ui/app.js`); a grelha fica vazia (`.board.cleared`) até o resultado chegar.

**Mercados regulados.** No topo de `ui/app.js`: `MIN_CYCLE_MS`, `TURBO_ALLOWED`, `HOLD_TO_SPIN`. Para o Reino Unido (Gambling Commission, RTS 14) usar `MIN_CYCLE_MS = 2500`, `TURBO_ALLOWED = false` e `HOLD_TO_SPIN = false`: sem turbo, sem acelerar por toque e no mínimo 2,5 s entre jogadas.

**Desempenho.** As animações frequentes usam só `transform`/`opacity` (no compositor). Evitar animar `filter: drop-shadow/blur`, `box-shadow` ou `backdrop-filter`: obrigam a redesenhar em cada frame e pesam muito em telemóveis. Uma animação de fundo com `filter` fazia o browser recalcular estilos 60×/s com o jogo parado.
