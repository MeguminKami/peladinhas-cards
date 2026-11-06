# Matemática RISCO

Versão `risco-1.0.0`. O motor usa centésimos inteiros e divisão BigInt para dinheiro e para a distribuição. Para a amostra inteira q em [0, 2^52), C em centésimos é `floor(99 × 2^52 / (2^52 − q))`, limitado a 100–999900. O RNG reprodutível é adequado à carteira local de créditos fictícios, não constitui certificação criptográfica.

O alvo automático m ganha quando C ≥ m. O pedido manual usa o tempo recebido pelo motor e exige m(t) < C, como pedido no contrato. Há uma incompatibilidade nesse contrato: a regra manual estrita perde empates e por isso não tem exatamente o mesmo retorno dos alvos automáticos. Em centésimos, o retorno manual num alvo m é aproximadamente `0,99 × m / (m + 0,01)`. A aplicação não deve prometer 99% para qualquer estratégia manual. Igualar ambos exige autorização para alterar a regra de empate.

O retorno de 99% refere-se ao multiplicador antes do arredondamento de pagamentos. `floor(aposta × centésimos / 100)` reduz o retorno em apostas indivisíveis pequenas. O motor preserva o arredondamento obrigatório e não aumenta probabilidades para compensar.

O cashout automático é resolvido mesmo que a atualização chegue depois do crash. O teto 9999× força pagamento. Pedidos repetidos de liquidação não voltam a pagar no motor. A carteira tem ainda de garantir débito e crédito idempotentes e persistência.

## Simulação

Executar `npm.cmd run sim` nesta pasta. Por omissão usa um milhão de rondas por estratégia e grava seed, versão, distribuição, retorno observado e intervalo de confiança normal aproximado em `relatorios/`. Para verificação rápida, `npm.cmd run sim -- --rounds=10000`. Seeds de validação têm o prefixo `risco-validation`, separado de quaisquer futuras seeds de calibração.

Cada amostra passa pelas mesmas funções `createRound` e `resolveRound` usadas pelo jogo, com um alvo automático definido antes do início. A estratégia aleatória escolhe previamente um alvo inteiro uniforme entre 1,01× e 9999×. O simulador não replica a condição de vitória.

Um milhão de rondas não permite exigir que todos os alvos fiquem entre 98,8% e 99,2%. No alvo 9999× esperam-se cerca de 99 sucessos, com grande variação. O intervalo normal é uma aproximação e é pouco fiável quando há muito poucos sucessos. Não se altera a distribuição para ajustar uma amostra. O crash imediato tem frequência teórica de aproximadamente 1,98%.

O compromisso SHA-256 deve ser calculado pelo anfitrião antes de começar. A API pública nunca revela seed nem crash até o tempo do motor atingir o crash. A curva temporal é independente da seed e do saldo. O anfitrião deve enviar apenas a vista pública ao iframe, conservar a ronda interna e impedir pedidos de demonstração na carteira real.

## Corrida local de 05-11-2026

Seed `risco-validation-2026-11-05`, versão `risco-1.0.0`, **1 000 000 de rondas por estratégia**, 9 000 000 no total. Aposta de 100 DJC, sem perda por arredondamento ao centésimo do multiplicador. Dados completos em [JSON](../relatorios/sim.json) e [CSV](../relatorios/sim.csv).

| Estratégia | RTP observado | IC 95% aproximado |
| --- | --- | --- |
| 1,01× | 98,9913% | 98,9637–99,0190% |
| 1,5× | 98,9793% | 98,8400–99,1186% |
| 2× | 98,9216% | 98,7256–99,1176% |
| 5× | 98,7990% | 98,4088–99,1892% |
| 10× | 98,7610% | 98,1763–99,3457% |
| 100× | 99,6100% | 97,6636–101,5564% |
| 1 000× | 101,2000% | 94,9680–107,4320% |
| 9 999× | 104,9895% | 84,9085–125,0705% |
| Alvo aleatório | 100,5183% | 86,7667–114,2698% |

Os nove intervalos incluem 99%, mas a amostra não satisfaz a tolerância pedida de 98,8–99,2% em todos os alvos. A cauda rara impede essa garantia com esta amostra. Os intervalos não são garantia sobre estratégias manuais nem compensam o arredondamento de apostas pequenas.
