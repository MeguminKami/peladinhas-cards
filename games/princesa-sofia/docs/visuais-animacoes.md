# Visuais e animações

## Arte

Arte final em [ui/art](../ui/art) (PNG com transparência, resolução suficiente para ecrãs 3×); nomes e hierarquia dos símbolos em [ui/symbols.js](../ui/symbols.js). Referências de produção em [ASSETS](../ASSETS). Fonte do jogo: Cormorant Garamond (`ui/fonts`), com algarismos alinhados (lining) nos valores de saldo, ganhos e preços.

| Símbolos | Ficheiros |
| --- | --- |
| Normais N1–N5 | `n1-color.png` … `n5-color.png` (folha, laço, lua, coração, cristal) |
| Premium P1–P5 | `miffy2-color`, `miffy1-color`, `misty-color`, `joao-color`, `sofia-color` |
| Flor Scatter | `scatter-color.png` |
| WILD | `wild-emblem.png` + multiplicador e "WILD" em texto, num único bloco `.wild-art` (anima como uma peça) |
| Bónus | `bonus-common.png` (Jardim Encantado), `bonus-moon.png` (Baile ao Luar), `bonus-secret.png` (Coroa da Aurora), `bonus-hunt.png` |
| Cenário e extras | `scene.png`, `logo.png`, `fairy-dust.png`, `retrigger.png`, `notice-frame.png` |

## Spin e suspense de Scatters

- As colunas caem da esquerda para a direita, cada uma de baixo para cima (`revealSpin` em `ui/motion.js`). O ritmo depende só do que já está à vista, nunca do resultado.
- Regras em `scatterSuspense(mode)` (`ui/app.js`), iguais no spin e nas cascatas:

| Modo | Flores à vista | Suspense |
| --- | --- | --- |
| Jogo normal e Hunt | 2 / 3 / 4 (com hipótese de mais uma) | nível 1 rosa / 2 lilás / 3 dourado |
| Free spins | 1 (à espera de +2 spins) / 2 (à espera de +4) | nível 1 / 2 |

- Em suspense, os símbolos seguintes caem um a um com um feixe de luz na coluna; as flores pousadas pulsam; nos níveis 2 e 3 a moldura pulsa e o resto da grelha escurece (82% / 58%); no 3 a coluna treme ligeiramente.
- Cascatas (`cascadeBoard`): se as flores que ficaram permitirem mais uma, os símbolos novos caem um a um com suspense; uma flor nova conta logo e pode subir o nível.
- Compra de bónus: grelha teatral sorteada a cada compra (3/4/5 flores em colunas e linhas aleatórias) revelada com o mesmo suspense; não altera motor, saldo nem XP.

## Ganhos

- Cada hit é apresentado individualmente; o seguinte só começa quando o anterior acaba.
- Com WILD multiplicador (multiplicador total > 1): ganho do cluster → `× N` (o multiplicador em destaque e os WILDs do hit brilham) → a conta funde-se no resultado → sobe e desaparece. Ritmo `max(105 ms, 360 ms × fator de velocidade)` por etapa; carregar no spin salta para o resultado.
- Escalões de cor e tamanho por múltiplo da aposta (`ui/payout-presentation.js`).

## Magia, flores e bónus

- XP: os vencedores desfazem-se em poeira que voa para a barra; barra cheia vibra com cores; a magia entra com uma fada e os WILDs pousam um a um.
- Flores confirmadas convergem para o centro antes do bónus; introdução com ornamento PNG, nome, spins e descrição.
- Retrigger com o PNG próprio; MAX WIN num painel próprio.

## Painel de regras

Quatro separadores ilustrados com a arte do jogo (`rulesContent` em `ui/app.js`, estilos em `ui/rules.css`): **Jogar** (mini-grelha com grupo ligado e diagonal que não conta; 3 passos), **Wilds** (W a completar grupo; 2× + 3× = ×5 com a conta; barra → magia; tabela da magia por modo; XP por grupo recolhido), **Flores e bónus** (flor em destaque; 3/4/5 flores → bónus; retriggers; Bonus Hunt), **Pagamentos** (tabela única com imagem de cada símbolo). Demonstrações locais no fim do painel.
