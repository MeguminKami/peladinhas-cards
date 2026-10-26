> Histórico. Modelo atual de ways e comprimento: [4.13](./RTP-v4.13.md).

# RIFT//CORE 4.12 — calibração para cerca de 96%

Resultados locais de 2026-10-26, aposta-base 0,10. Nenhuma leitura cloud nem deploy.

## Alterações

- Todos os prémios por símbolo reduzidos em 25%: uma way de seis colunas paga 1,5× no símbolo mais fraco e 15× no mais forte, antes dos multiplicadores. A progressão por comprimento mantém-se.
- Normal e Hunt continuam sem poderes e sem Reactor Pulse; os FS mantêm os poderes, multiplicadores, retriggers e quantidade de spins.
- A dificuldade de entrada começou em 1,125×, metade de 2,25×, e subiu durante a calibração até **2,47×** face à referência 4.10. NaturalScatterScale=1/2.47. Não foi deixada permanentemente em 1,125× porque o RTP ultrapassaria a meta.
- Hunt mantém custo 3× e probabilidade de cada quantidade positiva de Scatter 3× a do Normal. Pesos fixos do Hunt ajustados de bias 10 para 9,4, aproximando o retorno dos spins pagos entre modos. Normal mantém bias 7,59; Wilds mantêm as suas probabilidades.
- Preços de compra recalibrados: CORE **11,7×**, RIFT **46,9×**, OVERDRIVE **687,1×**. Reduzir apenas os prémios sem reduzir os preços faria cair o RTP das compras.

São parâmetros fixos para todas as novas rondas; não há ajuste por jogador, resultado escolhido antecipadamente ou contador de garantia.

## RTP medido

| Modalidade | RTP | IC95% aproximado | Amostra |
|---|---:|---:|---|
| Normal | 95,71% | 94,71–96,67% | 1 000 000 de spins pagos + estimativa dos FS |
| Hunt | 95,48% | 94,48–96,37% | 1 000 000 de spins pagos + estimativa dos FS |
| Compra CORE | 96,44% | 92,33–100,55% | 50 000 rondas completas independentes |
| Compra RIFT | 97,05% | 93,26–100,84% | 50 000 rondas completas independentes |
| Compra OVERDRIVE | 94,18% | 92,37–96,00% | 50 000 rondas completas independentes |

As estimativas pontuais estão entre 94–98%. Os intervalos das compras são mais largos e não ficam todos dentro desse intervalo; 50 000 compras não certificam o RTP nem garantem o resultado de uma sessão. Resultados referem-se à aposta 0,10, com arredondamento a cêntimos e cap de 25000× por ronda.

Nos spins pagos, os ganhos contribuem 53,57 pontos percentuais no Normal e 53,35 no Hunt. Os bónus naturais acrescentam cerca de 42,14 pontos a ambos, por crédito gasto. Não confundir o RTP da compra com o retorno do bónus por aposta-base.

## Frequências naturais

| Scatters | Normal, média de spins | Hunt, média de spins |
|---|---:|---:|
| 3 | 1 928,40 | 642,80 |
| 4 | 2 007,64 | 669,21 |
| 5 | 2 470,40 | 823,47 |
| 6 | 4 939,66 | 1 646,55 |
| Qualquer bónus | 615,80 | 205,27 |

A escala multiplica cada probabilidade positiva final da referência por 1/2,47, através do hazard por coluna antes de surgir o primeiro Scatter. No máximo um por coluna, só na grelha inicial; cascatas não criam Scatters. Estas médias substituem a meta antiga de seis Scatters em cerca de 2000 spins Normal. Em FS, a chance de 3+ permanece 2%, dando +4/+5/+6 FS conforme o modo, até 40 FS concedidos e respeitando o cap.

## Calibração e validação independente

Primeira amostra: **50 000 compras completas por bónus**, seeds 531026/531027/531028. Os preços foram calculados como prémio médio por aposta-base dividido por 0,96, arredondados a décimas. [Amostra de calibração](./purchases-v4.12-calibration.json). Os perfis dos FS e a tabela de prémios dessa amostra são os finais; alterações posteriores de entrada natural e de pesos Hunt não afetam compras.

Após fixar os preços, foram feitas **outras 50 000 compras completas por bónus**, seeds 561026/561027/561028, sem ajustar preços aos resultados. Incluem todos os FS, retriggers e cap. [Validação independente e hashes finais](./purchases-v4.12-validation.json). CORE: 434 508 FS e 8 627 retriggers; RIFT: 555 562 FS e 11 113 retriggers; OVERDRIVE: 719 376 FS e 14 346 retriggers. Caps observados: 0, 1 e 28, respetivamente.

Normal/Hunt: **1 000 000 de resultados pagos novos por modo**, seeds 571026/571027, com expectativas condicionais dos FS da validação independente ponderadas pelas probabilidades exatas de entrada. Não são um milhão de rondas naturais completas. Intervalos aproximados, partilhando amostras dos FS, com desconto conservador no limite inferior para o cap acumulado da entrada. [Relatório com configuração, probabilidades e hashes](./rtp-v4.12-sample.json).

O ensaio preliminar de pesos Hunt em [paid-calibration.json](./paid-calibration-v4.12.json) tem 200 000 spins por cenário, seeds 541026–541029, com a configuração de entrada inicial. Não é a validação final.

## Reproduzir e publicar

Na raiz do projeto, com a configuração final:

```sh
node games/rift-core-overdrive/scripts/measure-purchases.mjs 50000 .1 561026 --validation
node games/rift-core-overdrive/scripts/audit-paid-rtp.mjs 1000000 .1 571026
node games/rift-core-overdrive/scripts/build-server-engine.mjs
node --test games/rift-core-overdrive/tests/scatters.test.mjs
node games/rift-core-overdrive/tests/browser-smoke.mjs --layout
npm.cmd run test:casino:rift
npm.cmd run test:docs
```

20 testes de matemática, 6 testes de integração e verificações de interface em desktop, tablet e telemóvel passaram. Motor e configuração 4.11 arquivados; o adaptador mantém as rondas antigas na matemática original, sem recalcular históricos ou saldos.

Publicação: npm.cmd run deploy:frontend. Nenhum deploy executado. Nenhuma função Firebase atual importa o motor Node de referência; hosts externos devem atualizar motor e configuração em conjunto.


