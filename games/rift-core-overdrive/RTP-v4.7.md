> Relatório histórico 4.7. Revisão atual: [RTP-v4.8.md](./RTP-v4.8.md). Os scripts atuais importam a configuração nova e não reproduzem esta revisão antiga sem restaurar a versão correspondente.

# RIFT//CORE — pagamentos, Scatters e RTP 4.7

Resultados locais de 2026-10-26. Novas rondas usam a versão 4.7.
Uma way do símbolo mais fraco nas seis colunas paga **2× a aposta**;
a mais forte paga **20×**, antes dos multiplicadores CASCADE e CORE.
Mais ocorrências nas mesmas colunas multiplicam as ways. O Hunt usa a
aposta-base para os prémios, apesar de cobrar 3× para jogar.

| Símbolo | 3 colunas | 4 colunas | 5 colunas | 6 colunas |
|---|---:|---:|---:|---:|
| NEON SHARD, mais fraco | 0,05× | 0,15× | 0,50× | 2× |
| REACTOR HEART, mais forte | 0,50× | 1,50× | 5× | 20× |

## RTP medido

Aposta-base 0,10. Cada compra foi simulada em **50 000 rondas completas**,
incluindo todos os free spins, retriggers, cascatas, cap e custo cobrado.
Os preços foram calibrados com as seeds declaradas; reexecutar essas
seeds confirma os débitos finais, não é validação independente.
Os intervalos são aproximações de 95%, não certificação. CORE e RIFT
mantêm intervalos mais largos do que a margem pretendida de 94–98%.

| Modalidade | Amostra | RTP estimado | IC95% aproximado |
|---|---:|---:|---:|
| base | 1000000 | 95,15% | 94,04–96,22% |
| hunt | 1000000 | 95,81% | 94,65–96,93% |
| core | 50000 | 95,95% | 91,59–100,31% |
| rift | 50000 | 96,04% | 93,39–98,69% |
| overdrive | 50000 | 95,99% | 94,21–97,78% |
Compras: CORE 15,6×; RIFT 59,1×; OVERDRIVE 907,5× a aposta-base.
[Dados das 150 000 compras](./purchases-v4.7-50000.json): total cobrado, pago,
FS, retriggers, caps, seeds, preços e hashes. O Overdrive comprado tem
33,33% de probabilidade de seis Scatters/14 FS; o resto dá cinco/12 FS.

O base e o Hunt usam um milhão de resultados pagos independentes por
modalidade, somando a expectativa dos bónus naturais ponderada pelas
probabilidades exatas. Um limite conservador desconta a possível correlação
entre ganhos na entrada e cap acumulado. As estimativas partilham amostras
de FS entre si. Não certificam separadamente todas as apostas disponíveis.
[Relatório completo](./rtp-v4.7-sample.json).

## Probabilidades exatas de Scatters

As colunas mostram a quantidade inicial final K. Cada coluna tem no máximo
um Scatter; as cascatas não criam novos Scatters. Hunt aumenta em 50%
relativo cada quantidade positiva. Não existem prazos garantidos.

| Scatters e resultado | Base | Base, média de spins | Hunt | Hunt, média de spins |
|---|---:|---:|---:|---:|
| 3 — CORE, 8 FS | 0,011673% | 1/8 567 | 0,017510% | 1/5 711 |
| 4 — RIFT, 10 FS | 0,011201% | 1/8 928 | 0,016801% | 1/5 952 |
| 5 — OVERDRIVE, 12 FS | 0,009096% | 1/10 994 | 0,013644% | 1/7 329 |
| 6 — OVERDRIVE, 14 FS | 0,004545% | 1/22 004 | 0,006817% | 1/14 669 |
Qualquer bónus: base **0,036514%**, cerca de **1/2739**; Hunt
**0,054771%**, cerca de **1/1826**. Estes valores são calculados a partir
das probabilidades fixas, não de contagens da simulação.

Em todos os modos FS: K=0..6 tem massas
[0.8,0.13,0.05,0.019,0.0009,0.00009,0.00001]. Assim, três Scatters têm
1,9%; quatro 0,09%; cinco 0,009%; seis 0,001%. Qualquer 3+ tem **2%**, média
**1/50 FS**. Dão +4 FS no CORE, +5 no RIFT e +6 no Overdrive, limitados a
40 FS totais e respeitando o cap acumulado de 25000×.

## Distribuição e integridade

Cada posição é sorteada independentemente. Os pesos dos símbolos são
[16,15,14,13,12,10,7.5,5.5,4,3]. A coluna c, de 0 a 5, multiplica o peso
do símbolo c por 7,59 no base e por 10 no Hunt/FS; normaliza em seguida.
Wild é sorteado primeiro: base 0,1%; Hunt 3,29%; CORE 0,8%; RIFT 0,9%;
Overdrive 1%. A interface apresenta a média das seis colunas antes dos
Scatters e poderes, não uma probabilidade idêntica em todas as colunas.
Não há quotas, rejeição de resultados, ajuste por saldo/perdas/jogador ou
reinício automático da seed. Combinações e bónus ficaram menos frequentes
para suportar os pagamentos maiores sem reduzir o mínimo de 2×.

Scatters base: com zero colocados, chance 0,01% na coluna seguinte;
com 1–4, 85,16%; com 5, 86,41%. Linha uniforme e um por coluna.

## Reproduzir e publicar

Na raiz do repositório:

```sh
node games/rift-core-overdrive/scripts/measure-purchases.mjs 50000 .1 471026
node games/rift-core-overdrive/scripts/audit-paid-rtp.mjs 1000000 .1 491026
node --test games/rift-core-overdrive/tests/scatters.test.mjs
node games/rift-core-overdrive/tests/browser-smoke.mjs
npm.cmd run test:casino:rift
npm.cmd run test:docs
```

O [motor 4.6](./engine-v4.6.js) e a [configuração 4.6](./math-config-v4.6.js)
ficam arquivados. O standalone e o adaptador local retomam rondas antigas
com a matemática correspondente. Não recalcular saldos nem históricos.
O [relatório 4.6](./RTP-v4.6.md) conserva os resultados históricos.

Frontend integrado: `npm.cmd run deploy:frontend`. A build copia motor,
configurações arquivadas e relatório. Não foi executado deploy. Nenhuma
função Firebase atual importa o [motor Node de referência](./integration/server-engine.mjs).
Um host externo que o utilize deve atualizar o pacote inteiro e concluir
rondas anteriores antes da troca: esse adaptador rejeita versões antigas.

