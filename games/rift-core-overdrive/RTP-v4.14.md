> Histórico. Aumento de 10%: [4.15](./RTP-v4.15.md).

# RIFT//CORE 4.14 — preços fixos, bónus reforçados e barra compacta

Resultados locais de 2026-10-26, aposta-base 0,10. Sem leituras cloud ou deploy.

## Preços e experiência dos bónus

Preços fixados pelo utilizador: **3 Scatters/CORE 80×; 4/RIFT 220×; 5/OVERDRIVE 450×**. Não foram reduzidos para ajustar o RTP. OVERDRIVE comprado mantém 33,33% de 6 Scatters e 14 FS pelo mesmo preço.

Perfis dos FS reforçados: mais Wilds naturais, poderes mais frequentes e pesos por coluna menos dispersos, criando mais oportunidades de ways. Tabela de pagamentos por ways/comprimento da 4.13 preservada, mínimo 0,1× por way, sem multiplicador de cascata. Global CORE, quantidades de FS, retriggers e limites preservados.

| Oportunidade | CORE | RIFT | OVERDRIVE |
|---|---:|---:|---:|
| MEGA WILD DROP | 1,5% | 2% | 2,5% |
| NEON STORM | 8% | 10% | 12% |
| WILD SURGE | 12% | 14% | 16% |
| RIFT LINK | 10% | 12% | 14% |
| REACTOR PULSE, a cada 3.ª vitória | 35% | 45% | 60% |
| Wild natural por posição elegível | 1,5% | 2% | 2% |
| Bias fixo por coluna | 2,8 | 3,415 | 5,88 |

As oportunidades dos quatro poderes são verificadas no início e após cada queda vencedora; precisam de alvos válidos. Pulse é verificado na terceira, sexta, nona… vitória. OVERDRIVE mantém também CORE IMPULSE, com pelo menos um Wild preparado em cada FS, e os Wilds adicionais nos patamares globais.

## Validação dos bónus — 50 000 compras completas por modo

Preços e parâmetros dos FS fixados antes das seeds independentes 751026/751027/751028. Incluem todos os FS, retriggers e cap.

| Bónus | RTP medido | IC95% aproximado | Ganho médio por aposta-base |
|---|---:|---:|---:|
| CORE | 95,15% | 93,85–96,44% | 76,12× |
| RIFT | 96,93% | 95,84–98,02% | 213,25× |
| OVERDRIVE | 96,50% | 95,62–97,39% | 434,27× |

| Bónus | FS jogados | FS com poderes aleatórios | FS com algum poder | FS com ganho |
|---|---:|---:|---:|---:|
| CORE | 434 788 | 48,77% | 48,77% | 68,86% |
| RIFT | 555 810 | 53,93% | 53,93% | 67,93% |
| OVERDRIVE | 719 776 | 58,56% | 100% | 71,63% |

Retriggers: 8 697 / 11 162 / 14 385. Caps: zero nos três modos. Rondas sem qualquer ganho: 6 / 0 / 0, respetivamente; são observações da amostra, não garantias. Os ganhos médios anteriores eram cerca de 4,22× / 15,71× / 143,07× por aposta-base, pelo que os novos bónus foram efetivamente reforçados, em vez de apenas encarecidos.

[Resultados completos dos bónus](./purchases-v4.14-validation.json), incluindo contagens por poder e hashes da amostra.

## Normal e Hunt

A frequência natural dos Scatters foi preservada: qualquer bónus em média 1/615,80 Normal e 1/205,27 Hunt. Seis Scatters: 1/4939,66 e 1/1646,55, respetivamente. Hunt mantém custo 3× e triplica as probabilidades de cada quantidade positiva de Scatters. Não há garantia por contador. Normal e Hunt mantêm poderes desativados.

Como os bónus naturais passaram a devolver mais, foram ajustados apenas os pesos dos spins pagos para os acomodar: bias 4,06 no Normal e 4,24 no Hunt; Wilds mantêm 0,1% e 4,16%. A tabela continua igual nos dois modos.

| Modo | RTP principal estimado | IC95% aproximado |
|---|---:|---:|
| Normal | 96,17% | 95,77–96,51% |
| Hunt | 95,68% | 95,20–96,01% |

Método: um milhão de spins pagos novos por modo, seeds 781026/781027, mais expectativas condicionais dos FS ponderadas pelas probabilidades exatas de entrada. Há desconto conservador no limite inferior pela correlação com o cap acumulado. Os modos partilham as amostras de FS. [Relatório principal, configuração final e hashes](./rtp-v4.14-sample.json).

A amostra dos bónus precede o último ajuste dos pesos dos spins pagos. Foi reutilizada após verificar que todos os parâmetros condicionais dos FS, os preços, a tabela e o motor de liquidação são iguais; apenas os perfis pagos diferem. Os hashes originais ficam preservados em purchaseSample e purchases-50000.json. Não são apresentadas novas compras após esse ajuste.

## Conferências com rondas completas e incerteza

Foram executadas **duas amostras independentes de um milhão de rondas completas por modo**, terminando todos os FS de cada bónus natural antes da aposta seguinte:

| Ensaio | Seeds Normal/Hunt | Normal | IC95% aprox. Normal | Hunt | IC95% aprox. Hunt |
|---|---|---:|---:|---:|---:|
| Primeiro | 791026/791027 | 91,46% | 88,27–94,65% | 95,87% | 93,90–97,84% |
| Segundo | 801026/801027 | 96,11% | 92,70–99,52% | 96,57% | 94,44–98,69% |

O primeiro resultado Normal ficou abaixo do esperado, motivando a segunda conferência com contagens de entradas e ganhos por bónus. Não foi descartado nem se escolheu apenas a seed mais próxima de 96%. Os novos bónus têm variância elevada; os intervalos normais são aproximações e não garantias. A diferença do primeiro ensaio permanece registada como limitação da validação amostral, sem afirmar certificação ou prometer o retorno de uma sessão.

[Primeiro ensaio completo](./round-crosscheck-v4.14-first.json). [Segundo ensaio completo, com decomposição por bónus](./round-crosscheck-v4.14-second.json). No segundo Normal ocorreram 479 CORE, 516 RIFT, 387 OVERDRIVE de 5 e 193 de 6 Scatters; no Hunt, 1 547 / 1 527 / 1 192 / 620. Estas amostras não foram usadas para reajustar preços ou bónus.

## Barra e compatibilidade

A barra deixou de usar a existência da futura ronda como sinal de que já está no bónus. Segue presentation/pending.mode e, sem resultado apresentado, o modo da ronda ativa. Assim, o spin base que prepara um bónus não abre o campo Ganho do bónus. Ao recolher o resumo final, o registo passado não reativa a disposição larga. Nos spins normais a barra fica compacta; durante os FS mantém o total separado.

Testes verificam estes estados em 390/1024/1440 px, além da interface em 320/390/768/1024/1440, teclado e movimento reduzido. Foram aprovados 30 testes de matemática/ways e os testes de integração da carteira. O exemplo 27 ways × 0,1 × aposta 0,10 × global 11 = 2,97 mantém-se.

Novas rondas usam 4.14; rondas antigas 4.13 e anteriores preservam o motor original. Não recalcular saldos, históricos ou compras em curso.

## Calibração e reprodução

[Exploração inicial de perfis](./bonus-grid-v4.14.json), [ensaio de 15 000 compras por perfil](./bonus-calibration-v4.14.json), [primeira medição de 50 000 compras](./purchases-v4.14-tuning.json). O RIFT ficou abaixo da meta nesse ensaio; o seu bias foi ajustado de 3,5 para 3,415 antes da validação independente final.

Com a configuração final, a partir da raiz:

```sh
node games/rift-core-overdrive/scripts/measure-purchases.mjs 50000 .1 751026 --validation
node games/rift-core-overdrive/scripts/audit-paid-rtp.mjs 1000000 .1 781026
node games/rift-core-overdrive/scripts/measure-local.mjs 1000000 base,hunt ../round-crosscheck-v4.14-second.json .1 801026
node --test games/rift-core-overdrive/tests/scatters.test.mjs games/rift-core-overdrive/tests/ways.test.mjs
node games/rift-core-overdrive/tests/browser-smoke.mjs --layout
npm.cmd run test:casino:rift
npm.cmd run test:docs
```

A reprodução gera novos hashes finais e pode produzir um resultado diferente das compras guardadas, porque a geração da grelha de ativação usa o perfil pago que foi ajustado depois; a distribuição condicional dos FS permanece igual. Para reproduzir o relatório atual com a amostra guardada, executar apenas audit-paid-rtp com --reuse-bonus-sample. Todas as medições referem-se à aposta 0,10 e arredondamento a cêntimos; não são certificação.

Publicação: npm.cmd run deploy:frontend. Nenhum deploy executado. Nenhuma função Firebase atual importa o motor Node de referência; hosts externos devem atualizar motor e configuração em conjunto.

