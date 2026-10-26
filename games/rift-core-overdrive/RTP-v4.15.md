# RIFT//CORE 4.15 — todos os pagamentos dos símbolos aumentados em 10%

Resultados locais de 2026-10-26, aposta-base 0,10. Não foi executado deploy nem consultada a cloud.

## Alteração aplicada

Todos os valores por símbolo e comprimento foram multiplicados por **1,10**, mantendo preços **80× / 220× / 450×**, pesos, Wilds, poderes, Scatters, FS, retriggers, globais e limites da 4.14. A precisão da tabela passou de 1/10000 para 1/100000, permitindo representar exatamente o aumento sem arredondar prematuramente valores como 0,17875×. O crédito de cada avaliação continua arredondado a cêntimos.

| Símbolo | 3 colunas | 4 colunas | 5 colunas | 6 colunas |
|---|---:|---:|---:|---:|
| Mais fraco | 0,11× | 0,1375× | 0,165× | 0,22× |
| Mais forte | 0,77× | 0,9625× | 1,155× | 1,54× |

Sem multiplicador de cascata. A contagem de ways não mudou. Exemplo com 27 ways, aposta 0,10 e global 11: três colunas fracas pagam 3,267 antes do arredondamento, creditando **3,27**; seis colunas creditam **6,53**. Pequenos totais e mínimos podem permanecer iguais devido ao arredondamento a cêntimos.

**Esta configuração ultrapassa os 100% de RTP estimado e já não corresponde à meta de 94–98%.** Não se alteraram outros parâmetros para compensar o aumento pedido.

## Medições principais repetidas

Foram usadas as mesmas seeds da 4.14 para permitir comparação direta, sem procurar resultados mais favoráveis.

| Modalidade | RTP anterior | RTP após +10% | IC95% aproximado atual |
|---|---:|---:|---:|
| Normal | 96,17% | **105,69%** | 105,25–106,07% |
| Hunt | 95,68% | **105,18%** | 104,65–105,54% |
| Compra CORE | 95,15% | **104,63%** | 103,21–106,06% |
| Compra RIFT | 96,93% | **106,61%** | 105,41–107,80% |
| Compra OVERDRIVE | 96,50% | **106,14%** | 105,17–107,12% |

Compras: **50 000 rondas completas por modo**, seeds 751026/751027/751028, incluindo todos os FS, retriggers e cap. Ganhos médios por aposta-base: CORE **83,71×**, RIFT **234,54×**, OVERDRIVE **477,65×**. Os perfis foram mantidos; na amostra não houve caps. [Dados completos das compras](./purchases-50000.json).

Normal/Hunt: **1 000 000 de spins pagos por modo**, seeds 781026/781027, com expectativas condicionais dos bónus ponderadas pelas probabilidades exatas de entrada. A amostra de compras foi executada novamente com a configuração final; não foi reutilizada a amostra antiga. [Relatório principal, configuração e hashes](./local-math-report.json).

O aumento dos retornos creditados não é exatamente 10% em todos os casos por causa do arredondamento a cêntimos e do limite acumulado. Estes intervalos são aproximações amostrais, não certificação.

## Conferências de rondas naturais completas

Repetidos os dois ensaios de **um milhão de rondas completas por modo**, com todos os bónus naturais jogados até ao fim:

| Ensaio | Seeds Normal/Hunt | Normal | IC95% Normal | Hunt | IC95% Hunt |
|---|---|---:|---:|---:|---:|
| Primeiro | 791026/791027 | 100,52% | 97,01–104,03% | 105,38% | 103,21–107,55% |
| Segundo | 801026/801027 | 105,63% | 101,88–109,38% | 106,15% | 103,81–108,48% |

[Primeiro ensaio](./round-crosscheck-v4.15-first.json). [Segundo ensaio](./round-crosscheck-v4.15-second.json). Ambos foram preservados; a maior variância dos bónus impede interpretar uma única amostra como garantia do RTP.

## Repetição das 1000 compras e distribuição de 100×

Seeds 811026/811027/811028, as mesmas da medição anterior. Valores brutos em × da aposta-base, antes de descontar o preço de compra.

| Bónus | Win média | Win mínima | Win máxima | RTP da amostra |
|---|---:|---:|---:|---:|
| CORE | 82,05× | 1,10× | 2913,90× | 102,57% |
| RIFT | 230,00× | 7,00× | 3725,80× | 104,54% |
| OVERDRIVE | 476,26× | 28,60× | 5042,20× | 105,84% |

[Distribuição completa em intervalos de 100×](../reports/rift-purchases-1000-2026-10-26-rift-4.15.md). [Dados das 3000 compras](../reports/rift-purchases-1000-2026-10-26-rift-4.15.json). A distribuição inclui o limite inferior e exclui o superior.

## Compatibilidade, verificação e reprodução

Rondas iniciadas em 4.14 e anteriores continuam com o motor original. Novas rondas usam 4.15. Os testes comparam todos os valores da tabela com o aumento exato de 10%, verificam ways, multiplicadores, conservação dos preços e recuperação das rondas antigas. A barra compacta e a fórmula de pagamento foram verificadas em desktop e telemóvel.

Na raiz do projeto:

```sh
node games/rift-core-overdrive/scripts/measure-purchases.mjs 50000 .1 751026 --validation
node games/rift-core-overdrive/scripts/audit-paid-rtp.mjs 1000000 .1 781026
node games/rift-core-overdrive/scripts/purchase-distribution.mjs 1000 .1 811026
node games/rift-core-overdrive/scripts/measure-local.mjs 1000000 base,hunt ../round-crosscheck-v4.15-first.json .1 791026
node games/rift-core-overdrive/scripts/measure-local.mjs 1000000 base,hunt ../round-crosscheck-v4.15-second.json .1 801026
node --test games/rift-core-overdrive/tests/scatters.test.mjs games/rift-core-overdrive/tests/ways.test.mjs
node games/rift-core-overdrive/tests/browser-smoke.mjs --layout
npm.cmd run test:casino:rift
npm.cmd run test:docs
```

Publicação frontend: npm.cmd run deploy:frontend. Nenhum deploy executado. Nenhuma função Firebase atual importa o motor Node de referência; hosts externos devem atualizar motor e configuração em conjunto.
