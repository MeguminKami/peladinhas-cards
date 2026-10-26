# Bonus Hunt — configuração 0.6.0

Opção do jogo base, ativada/desativada entre rondas. Não é um novo tipo de bónus nem uma compra de FS. Custa **3× a aposta base por spin pago**, mantendo a aposta base para todos os pagamentos, multiplicadores, compras e teto de 10 000×.

O aumento de 50% é **relativo** e aplica-se à probabilidade de cada quantidade positiva de Scatters. O número de Scatters continua a ser sorteado antes das posições, em colunas distintas. Não são adicionados Scatters depois de avaliar um resultado.

| Scatters no spin base | Normal | Bonus Hunt |
|---|---:|---:|
| 0 | 75% | 62,5% |
| 1 | 20% | 30% |
| 2 | 4,65% | 6,975% |
| 3 | 0,32% | 0,48% |
| 4 | 0,03% | 0,045% |
| Pelo menos um | 25% | 37,5% |

Pesos inteiros Hunt: `[12500,6000,1395,96,9]`, soma 20 000. Regras de símbolos, roubo, poderes e pagamentos são iguais ao base. Os FS ganhos são grátis e usam os pesos normais do respetivo bónus, sem o boost. As compras continuam a custar 90× e 220× da aposta base.

Com aposta base 0,20, o spin custa 0,60. Com aposta base 10, custa 30. Não se cria uma nova escada de apostas. O modo fica bloqueado durante spins, sequências automáticas e rondas de FS. A preferência é persistida; cada ronda regista `bonusHunt: true` quando utilizado. O saldo externo recebe o custo real de 3× no mesmo pedido idempotente habitual.

A interface usa um ícone vetorial próprio com órbita contínua quando ativo, cores verdes na aposta/custo/botão e um interruptor inequívoco. A rotação respeita a preferência de movimento reduzido do sistema. No bónus, o boost está suspenso; volta a aplicar-se ao regressar ao base se a preferência continuar ativa.

## Teste e simulação

```sh
npm run cli -- spin --bonus-hunt on --bet 0.20 --seed teste
npm run cli -- round --bonus-hunt on --bet 0.20 --seed teste
npm run cli -- simulate --bonus-hunt on --rounds 100000 --bet 0.20 --seed teste --output reports/hunt.json
```

O denominador do RTP inclui 3× por ronda paga Hunt. O relatório identifica `bonusHunt` e a configuração. **RTP 0.6.0 ainda não medido nem recalibrado**, tanto no modo Hunt como nas restantes combinações; os relatórios antigos não validam este modo. O comando acima é uma instrução de medição, não um resultado já obtido.

O restauro de sessões 0.5.1 mantém saldo, RNG, histórico e bónus em curso. Pedidos de carteira pendentes preservam o resultado confirmado na configuração anterior, sem novo sorteio.
