# Blackjack BJ-4D-S17-DAS-1

Cinco lugares para a mesma pessoa. Antes de cada ronda, quatro baralhos completos (208 IDs físicos únicos) são embaralhados com Fisher–Yates. Todos os lugares e dealer partilham esse conjunto até ao fim. A expressão «quatro baralhos a cada mão» é interpretada como cada ronda completa, sem reiniciar a seed nem embaralhar entre lugares.

Distribuição: primeira carta por lugar em ordem, dealer aberto, segunda por lugar, dealer fechado. Áses valem 1/11. Blackjack natural, apenas duas cartas iniciais não divididas, paga 3:2 de lucro. Vitória normal 1:1; push devolve a aposta. Dealer S17. Hole card e peek com A/10; com A o seguro é decidido antes do peek. Dois naturais empatam; natural vence 21 de três cartas. Bust perde independentemente do dealer.

Double em duas cartas, inclusive DAS, uma única carta. Split pelo mesmo valor (10+K permitido), até quatro mãos por lugar. Áses dividem uma vez; recebem uma carta e terminam, sem double/hit/resplit. 21 dividido não é natural. Seguro por lugar: metade da aposta inicial, ganho 2:1 mais stake. Sem surrender, bónus, side bets ou five-card Charlie.

Contabilidade em cêntimos fictícios inteiros, aposta mínima 20, máxima 100000, apostas iniciais pares. A aposta 20 devolve 40 na vitória, 50 no blackjack, 20 no empate. Exposição inclui extras e seguro; retorno bruto e líquido são separados. Um debit/credit tem ID estável. Comandos contêm ronda/revisão/mão para rejeitar repetição.

Segurança do shoe: só se aceita o conjunto completo de 208 cartas físicas válidas antes de debitar; uma carta nunca regressa ao shoe. Com até 20 mãos, a soma dos valores mínimos das cartas de mãos terminadas é no máximo 20×30 mais 26 do dealer, abaixo dos 1360 pontos mínimos do shoe completo. Assim não se consome o shoe completo numa ronda legal. Um erro de esgotamento lança exceção sobre uma cópia, preservando estado e saldo originais.

Se ninguém precisar de comparar com o dealer, revela sem comprar cartas desnecessárias. Sem timers estratégicos. Sessão persiste ronda e RNG. Por pedido do utilizador, o dealer recolhe/paga as fichas automaticamente após a liquidação confirmada; não existe confirmação de resumo. A mesa reabre apostas, mas nunca inicia outra distribuição nem toma decisões estratégicas automaticamente.
