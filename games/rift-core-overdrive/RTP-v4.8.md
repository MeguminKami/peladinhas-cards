> Relatório histórico. Versão atual: [4.9](./RTP-v4.9.md).

# RIFT//CORE 4.8 — frequência dos bónus e impacto no RTP

Resultados locais de 2026-10-26, aposta-base 0,10. Esta revisão aumenta a
frequência natural dos bónus. Preserva tabela de pagamentos, multiplicadores,
FS, poderes, cap, retriggers e preços de compra da versão 4.7.
O mínimo numa way de seis colunas continua 2×; o símbolo mais forte paga
20×, antes de CASCADE e CORE. Não há garantia por contador: as frequências
abaixo são médias de sorteios independentes, não prazos máximos.

## Frequências calculadas

| Scatters | Bónus | Normal | Hunt |
|---|---|---:|---:|
| 3 | CORE, 8 FS | 1/780,73 | 1/520,49 |
| 4 | RIFT, 10 FS | 1/812,81 | 1/541,87 |
| 5 | Overdrive, 12 FS | 1/1 000,16 | 1/666,78 |
| 6 | Overdrive, 14 FS | 1/1 999,86 | 1/1 333,24 |
Qualquer bónus: **0,401103%**, média de **1/249,31 spins normais**;
Hunt: **0,601654%**, média de **1/166,21 spins**. Aproximadamente onze
vezes mais frequentes do que na 4.7. O Hunt continua a custar 3× e aumenta
em 50% relativo todas as quantidades positivas de Scatters.

As chances por coluna, condicionadas ao número de Scatters já colocados,
passam de [0.0001,0.8516,0.8516,0.8516,0.8516,0.8641] para
[0.0011,0.8516,0.8516,0.8516,0.8516,0.8643]. Máximo um Scatter por
coluna, só na grelha inicial. Cascatas não criam Scatters.

Dentro dos FS, a distribuição é preservada: três Scatters 1,9%; quatro
0,09%; cinco 0,009%; seis 0,001%. Qualquer 3+ continua a ter **2%**, média
**1/50 FS**, dando +4/+5/+6 FS no CORE/RIFT/Overdrive, conforme os limites
de 40 FS e cap acumulado de 25000×.

## Impacto no RTP

**Esta configuração não está equilibrada para a meta anterior de 94–98%.**
A alteração da frequência foi aplicada sem reduzir pagamentos para a
compensar. As estimativas incluem os bónus naturais no retorno do jogo pago.

| Modalidade | RTP anterior, 4.7 | RTP estimado, 4.8 | IC95% aproximado |
|---|---:|---:|---:|
| base | 95,15% | 222,54% | 219,68–225,24% |
| hunt | 95,81% | 159,34% | 157,43–160,97% |

Só os bónus naturais de cinco e seis Scatters contribuem cerca de **130,70 pontos percentuais** para o RTP normal, antes de CORE, RIFT ou ganhos base. Alterar apenas o preço da compra não corrige esse retorno natural.

Para voltar a 94–98% com estas frequências, seria necessário outro ajuste
à expectativa dos ganhos dos FS e/ou do jogo pago. Essa recalibração não
faz parte desta revisão de frequência e medição. O mínimo de 2× não foi
reduzido, nem a frequência novamente diminuída para disfarçar o impacto.

## Método e dados

Foram amostrados **1 000 000 de resultados pagos novos por modalidade**
(base e Hunt), seeds 501026 e 501027. As expectativas dos bónus são
ponderadas pelas probabilidades exatas de entrada. O intervalo inferior
inclui um desconto conservador para a correlação entre ganhos na entrada
e limite acumulado. Os intervalos são aproximações amostrais, não certificação.

As expectativas condicionais dos FS vêm das [50 000 compras completas por
bónus da 4.7](./purchases-v4.7-50000.json). Não foram apresentadas como
novas compras nesta revisão. O script verifica que só as chances dos
Scatters de entrada mudaram e que o código de liquidação permanece igual,
normalizando apenas imports e despacho para versões arquivadas.
As compras já garantem a entrada e os seus preços não mudaram; por isso
esta alteração não muda o RTP esperado de cada compra. As estimativas
anteriores mantêm-se CORE 95,95%, RIFT 96,04%, Overdrive 95,99%, com a
incerteza original. As estatísticas de FS são partilhadas entre estimativas.

[Dados atuais, hashes e probabilidades completas](./rtp-v4.8-sample.json).
[Dados anteriores da 4.7](./rtp-v4.7-sample.json).

## Reproduzir e publicar

A partir da raiz, mantendo o ficheiro purchases-50000.json da amostra 4.7:

```sh
node games/rift-core-overdrive/scripts/audit-paid-rtp.mjs 1000000 .1 501026 --reuse-bonus-sample
node --test games/rift-core-overdrive/tests/scatters.test.mjs
node games/rift-core-overdrive/tests/browser-smoke.mjs
npm.cmd run test:casino:rift
npm.cmd run test:docs
```

O [motor 4.7](./engine-v4.7.js) e a [configuração](./math-config-v4.7.js)
ficam arquivados. O adaptador local retoma rondas anteriores com os
pagamentos da versão original. Não recalcular históricos nem saldos.

Frontend integrado: `npm.cmd run deploy:frontend`, na raiz. Não foi executado
deploy. Nenhuma função Firebase atual importa o motor Node de referência;
um host externo que o utilize deve atualizar o pacote em conjunto e
concluir rondas antigas antes da troca, conforme [integração](./INTEGRACAO.md).

