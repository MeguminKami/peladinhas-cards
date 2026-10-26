> Histórico. Atual: [4.12](./RTP-v4.12.md).

# RIFT//CORE 4.11 — spins pagos sem poderes e bónus 2,25× mais raros

Resultados locais de 2026-10-26, aposta-base 0,10.

Normal e Hunt sem os quatro poderes aleatórios e sem REACTOR PULSE. Poderes dos FS, pagamentos, Wilds naturais, compras, retriggers e limites preservados. O Hunt continua a custar 3× e a triplicar a probabilidade de cada quantidade positiva de Scatters face ao Normal.

A probabilidade de cada quantidade positiva final é exatamente a da 4.10 dividida por 2,25. A função de hazard ajusta apenas a chance de iniciar a sequência Scatter, condicionada à coluna, sem escolher previamente uma quantidade final. Cascatas não criam Scatters. naturalScatterScale=1/2.25; huntScatterBoost=3.

| Entrada | Normal, média de spins | Hunt, média de spins |
|---|---:|---:|
| 3 Scatters | 1 756,64 | 585,55 |
| 4 Scatters | 1 828,82 | 609,61 |
| 5 Scatters | 2 250,37 | 750,12 |
| 6 Scatters | 4 499,69 | 1 499,90 |
| Qualquer bónus | 560,95 | 186,98 |

Estas médias não são garantias nem contadores. A alteração substitui a meta anterior de seis Scatters em cerca de 2000 spins Normal.

## RTP estimado

| Modo | RTP | IC95% aproximado |
|---|---:|---:|
| Normal | 133,12% | 131,72–134,46% |
| Hunt | 126,29% | 124,89–127,50% |

Continua acima da meta de 94–98%. Ganhos dos spins pagos contribuem 71,08 e 64,24 pontos percentuais, respetivamente; bónus naturais contribuem 62,04 pontos em ambos, por crédito gasto. A diferença residual vem dos perfis fixos dos spins pagos.

Estimador estratificado: 1 000 000 de spins pagos novos por modo, seeds 521026/521027, mais expectativas condicionais das [50 000 compras completas por bónus da 4.7](./purchases-v4.7-50000.json). Compras não foram repetidas; os seus parâmetros não mudaram. O script verifica que apenas os perfis pagos, a entrada Scatter e o despacho de versões diferem da amostra, preservando código e parâmetros de FS. Intervalos aproximados e partilhando amostras dos FS, com correção conservadora do limite acumulado; não é certificação. Preços das compras foram calibrados com a própria amostra, sem validação independente.

[Dados atuais, configuração e hashes](./rtp-v4.11-sample.json). [Dados anteriores](./rtp-v4.10-sample.json). [Relatório anterior](./RTP-v4.10.md).

## Reprodução e publicação

Na raiz do projeto, preservando purchases-50000.json da amostra 4.7:

```sh
node games/rift-core-overdrive/scripts/audit-paid-rtp.mjs 1000000 .1 521026 --reuse-bonus-sample
node --test games/rift-core-overdrive/tests/scatters.test.mjs
npm.cmd run test:casino:rift
npm.cmd run test:docs
```

Testes verificam probabilidades reduzidas exatamente por 2,25, Hunt 3×, ausência de poderes nos spins pagos dos motores browser e servidor, preservação dos perfis FS e compatibilidade de rondas antigas. Motor e configuração 4.10 arquivados. O adaptador aceita rondas antigas sem recalcular saldos.

Publicação: npm.cmd run deploy:frontend. Nenhum deploy executado. Nenhuma função Firebase atual importa o motor Node de referência.

