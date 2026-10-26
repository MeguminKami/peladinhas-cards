> Histórico. Atual: [4.10](./RTP-v4.10.md).

# RIFT//CORE 4.9 — Hunt com Scatters 3×

Resultados locais de 2026-10-26, aposta-base 0,10. Única alteração de parâmetros: huntScatterBoost passa de 1,5 para 3. Custo Hunt mantém-se 3×; poderes, pagamentos, distribuição de FS, retriggers e compras mantêm-se. Quantidades positivas finais de Scatters têm exatamente o triplo da probabilidade do Normal, sem garantia por contador.

| Scatters | Frequência média Hunt |
|---|---:|
| 3 | 1/260,24 |
| 4 | 1/270,94 |
| 5 | 1/333,39 |
| 6 | 1/666,62 |

Qualquer bónus: 1,203309%, cerca de 1/83,10 spins Hunt. Normal permanece 1/249,31.

## RTP estimado

| Modo | RTP | IC95% aproximado |
|---|---:|---:|
| Normal | 222,54% | 219,68–225,24% |
| Hunt | 228,32% | 225,14–230,98% |

Continua acima da meta de 94–98%; não foi efetuada recalibração. A contribuição esperada dos bónus naturais por crédito gasto fica igual nos dois modos (frequência 3× e custo 3×). Os ganhos dos spins pagos ainda diferem.

Estimador estratificado: 1 000 000 de spins pagos por modo, seeds 501026/501027, mais expectativas condicionais das [50 000 compras por bónus da 4.7](./purchases-v4.7-50000.json). Não são novas compras; o script verifica que apenas os parâmetros de entrada Scatter e o despacho de versões mudaram. Intervalos aproximados, com correção conservadora do limite acumulado; não é certificação. Preços calibrados com a própria amostra de compras, sem validação independente.

[Dados atuais e hashes](./rtp-v4.9-sample.json). [Dados anteriores](./rtp-v4.8-sample.json). [Relatório anterior](./RTP-v4.8.md).

## Poderes no Normal

Probabilidades por verificação: MEGA WILD DROP 0,1%; NEON STORM 0,6%; WILD SURGE 0,9%; RIFT LINK 0,6%. Sorteios separados: chance de pelo menos um dos quatro 2,183547%. Verificação no início do spin e depois de cada cascata; não é uma frequência fixa por spin completo. REACTOR PULSE tem uma verificação adicional de 4% a cada terceira cascata. Transformações dependem das posições elegíveis.

## Reprodução e publicação

Na raiz do projeto:

```sh
node games/rift-core-overdrive/scripts/audit-paid-rtp.mjs 1000000 .1 501026 --reuse-bonus-sample
node --test games/rift-core-overdrive/tests/scatters.test.mjs
npm.cmd run test:casino:rift
npm.cmd run test:docs
npm.cmd run deploy:frontend
```

Manter purchases-50000.json da 4.7 para reutilizar a amostra. Motor e configuração 4.8 arquivados; rondas em curso preservam a matemática original. Nenhum deploy executado. Alterações no frontend e no motor de referência, sem funções Firebase atuais consumidoras.

