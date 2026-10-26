# RIFT//CORE: OVERDRIVE — rift-4.15

## Preços fixos e bónus

Compras bloqueadas em CORE (3 Scatters) 80×, RIFT (4) 220× e OVERDRIVE (5) 450×
a aposta-base. OVERDRIVE comprado mantém 33,33% de 6 Scatters/14 FS.
Os preços não são recalibrados automaticamente. Perfis de FS foram reforçados
para que estes preços correspondam a cerca de 96% de retorno esperado.

Resultados locais de 2026-10-26, aposta-base 0,10, 50 000 compras independentes
por bónus: CORE 104,63%, RIFT 106,61%, OVERDRIVE 106,14%.
Ganhos médios por aposta-base: 83,71× / 234,54× / 477,65×.
Poderes aleatórios em 48,77% / 53,93% / 58,56% dos FS, respetivamente;
OVERDRIVE prepara ainda pelo menos um Wild em todos os FS.

Poderes por oportunidade (CORE / RIFT / OVERDRIVE):
MEGA WILD DROP 1,5% / 2% / 2,5%; NEON STORM 8% / 10% / 12%;
WILD SURGE 12% / 14% / 16%; RIFT LINK 10% / 12% / 14%;
REACTOR PULSE 35% / 45% / 60% na terceira, sexta, nona… vitória.
Wild natural dos FS 1,5% / 2% / 2%. Pesos fixos por coluna com bias
2,8 / 3,415 / 5,88, aumentando as oportunidades de formar ways face à 4.13.

CORE: 8 FS, global inicial ×1 / máximo ×25, retrigger +4.
RIFT: 10 FS, global inicial ×3 / máximo ×50, retrigger +5.
OVERDRIVE: 12 FS (14 com 6 Scatters), global inicial ×5 / máximo ×100,
retrigger +6. Limite de 40 FS concedidos, cap acumulado da ronda de 25000×.

## Ways e pagamento

Prémio = ways × valor por way para o comprimento × aposta-base × global CORE.
Sem multiplicador de cascata. Mínimo nominal por way 0,11×; 3×3×3 são 27 ways.
Comprimentos 3/4/5/6 no símbolo fraco: 0,11 / 0,1375 / 0,165 / 0,22×.
Símbolo forte: 0,77 / 0,9625 / 1,155 / 1,54×. Comprimento 6 paga o dobro de 3
para as mesmas ways. Exemplo: 27 ways fracas de 3 colunas × aposta 0,10 ×
global 11 creditam 3,27; as mesmas 27 ways em 6 colunas creditam 6,53.
Os pagamentos nominais subiram exatamente 10%, com precisão de 1/100000.
O crédito de cada avaliação continua arredondado a cêntimos.

Normal/Hunt sem poderes. Frequências de Scatter preservadas:
naturalScatterScale=1/2,47, huntScatterBoost=3. Hunt custa 3×.
Qualquer bónus: média 1/616 Normal ou 1/205 Hunt; seis Scatters:
1/4940 Normal ou 1/1647 Hunt. Sem garantias por contador ou resultado alvo.

## RTP do jogo pago e interface

Estimativa principal Normal 105,69%, Hunt 105,18%, incluindo bónus naturais.
Perfis pagos: bias por coluna 4,06 e 4,24, respetivamente; Wild 0,1% e 4,16%.
A configuração atual ultrapassa 100% de RTP estimado e não está equilibrada
para o alvo anterior de 96%. Os restantes parâmetros e preços não foram
ajustados para compensar o aumento pedido. Não é certificação.
Relatório, incerteza e conferências de rondas completas: RTP-v4.15.md.

Barra Normal compacta, sem campo Ganho do bónus. A presença de uma futura
ronda de bónus não altera o layout enquanto o spin base ainda é apresentado.
Após recolher o resumo final, o estado do resultado anterior também não
reativa o campo. O total do bónus aparece só quando o ecrã mostra o bónus.

## Reproduzir e verificar

A partir da raiz do projeto:

  node games/rift-core-overdrive/scripts/measure-purchases.mjs 50000 .1 751026 --validation
  node games/rift-core-overdrive/scripts/audit-paid-rtp.mjs 1000000 .1 781026
  node --test games/rift-core-overdrive/tests/scatters.test.mjs games/rift-core-overdrive/tests/ways.test.mjs
  node games/rift-core-overdrive/tests/browser-smoke.mjs --layout
  npm.cmd run test:casino:rift
  npm.cmd run test:docs

A amostra atual purchases-50000.json foi executada novamente e mantém os
hashes finais. O relatório atual não reutiliza as compras da versão anterior.
As mesmas seeds permitem comparar as duas versões. Distribuição de 1000
compras: games/reports/rift-purchases-1000-2026-10-26-rift-4.15.md.

## Integração e publicação

Preparar assets: node scripts/build-casino-rift.mjs.
Frontend: npm.cmd run deploy:frontend. Não foi executado deploy.
Nenhuma função Firebase atual importa integration/server-engine.mjs.
Hosts externos devem atualizar motor e configuração em conjunto.
Rondas iniciadas em 4.14 e anteriores preservam a matemática original.
Não recalcular saldos ou históricos. Testes locais bloqueiam pedidos cloud.
