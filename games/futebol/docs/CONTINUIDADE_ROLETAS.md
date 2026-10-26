# Continuidade visual entre spins

Cada coluna inicia a rotação com cópias dos quatro símbolos efetivamente visíveis, incluindo a aparência resultante dos poderes do spin anterior. O tabuleiro seguinte fica por baixo das faixas em movimento e só é revelado ao parar cada coluna.

A tira tem dez posições decorativas e repete as quatro primeiras no fim. A posição inicial corresponde precisamente ao tabuleiro anterior; o reinício técnico do loop é visualmente idêntico. O resultado real continua a ser inserido fora da região visível e a desaceleração usa a fase e velocidade atuais. As posições sticky permanecem visíveis através da máscara, sem rodar. Aplica-se a base, free spins e ativação de compras.

É continuidade da apresentação, sem mudanças na geração de resultados, pagamentos, probabilidades ou RNG. A sequência decorativa não consome aleatoriedade matemática. Não implica conservar um índice de rolo físico entre sessões: o próximo arranque parte do estado visível restaurado.

`e2e/reel-start-continuity.spec.ts` verifica os símbolos, imagens e posição inicial nos modos base e superior. `e2e/reel-fluid.spec.ts` verifica a velocidade de paragem e coincidência geométrica do resultado final, incluindo suspense.
