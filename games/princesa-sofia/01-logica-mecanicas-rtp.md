# Revisao v33 - clusters de entrada e Hunt equilibrado

Ajuste dirigido ao modo Base (jogo normal) e Hunt. As probabilidades de cada passo de copia nesses spins passam a 80% das usadas nos bonus. Primeira copia: normais 56%, premium 36%; segunda 36%; terceira 14,4%/8%; quarta 4%/3,2%; quinta 0,8% para ambos. A formacao de clusters continua emergente, sem quotas de premios ou de clusters. Os bonus usam integralmente as probabilidades anteriores.

Reduzir copias isoladamente nao chegou para o alvo, pois tambem deixa mais posicoes para sortear scatters. O terceiro scatter base passa de 16000 para 6100 PPM, com restantes probabilidades base mantidas. Hunt substitui o reforco 6 por 2,09, aplicado por posicao e em todos os refills do spin de entrada, com custo total mantido em 4x. O reforco nao se aplica dentro dos bonus.

Pagamentos por simbolo, pesos, XP, magia, precos de compra, limites e scatters internos dos bonus preservados. As compras Normal/Super/Secret continuam com 18/17/18 XP e precos 95x/237x/754x.

Validacao: [cinco modos](rtp-entry-clusters-balanced-hunt-v33-validation.json), [outras seeds, amostra alargada](rtp-entry-clusters-balanced-hunt-v33-large-independent.json), e amostras adicionais de 1000000 entradas por modo Base/Hunt. As amostras iniciais de 100000 entradas variaram substancialmente, incluindo inversao da ordem Base/Hunt na segunda amostra; nao se considera um resultado pontual como certificacao nem como garantia de vantagem estatistica.

Reproduzir: npm.cmd run validate:entries; npm.cmd run validate:entries -- --independent; npm.cmd run validate:entries -- --large. Este ultimo testa apenas Base/Hunt com 1000000 entradas cada; combinar com --independent usa outras seeds.

## Resultado agregado v33 - 2026-10-31

Duas amostras de um milhao de entradas por modo, com configuracao identica. Ambas foram usadas durante a afinacao; nao sao certificacao nem uma validacao independente posterior a toda a calibracao.

| Modo | Entradas | RTP observado | Chance de qualquer bonus | Entradas por bonus | Bonus com pelo menos um retrigger |
| --- | --- | --- | --- | --- | --- |
| Base | 2000000 | 97.469% | 0.5643% | 177.23 | 10.323% |
| Hunt | 2000000 | 98.375% | 3.7049% | 26.99 | 9.864% |

Hunt fica 0.906 pontos percentuais acima do Base nesta amostra agregada. O intervalo aproximado de 95% para essa diferenca e [-1.802; 3.614] pontos; uma diferenca observada nao garante a ordenacao do RTP real. Ver [dados agregados](rtp-entry-clusters-balanced-hunt-v33-pooled.json). As amostras e metricas curtas continuam nos relatorios de cinco modos. As probabilidades condicionais de retrigger foram preservadas, mesmo onde a frequencia amostral ultrapassa a meta anterior de 10%.

# Revisao v32 - Hunt com seis vezes a chance de scatter

Hunt passa de fator 2,43 para 6 nas probabilidades de scatter por posicao, tanto na geracao inicial como nos refills do spin base. Primeiro a quinto scatter: [180600,120600,96000,9000,2400] PPM, ou [18,06%;12,06%;9,6%;0,9%;0,24%]. Apos cinco scatters, chance zero. O custo total mantem 4x (1x base mais 3x adicionais).

Nao se aplica um multiplicador direto a frequencia dos bonus. Ao entrar num bonus, usam-se as probabilidades proprias desse bonus, sem reforco Hunt. Base, compras e restantes parametros ficam inalterados. As metas propostas anteriormente para a frequencia base por 2000 entradas nao foram aplicadas nesta revisao.

# Revisao v31 - calibracao individual de XP Normal e Super

A barra visual de XP continua oculta em Base/Hunt; a mecanica base conserva o limiar 40. Normal passa de 25 para 18 XP e Super de 20 para 17 XP; Secret mantem 18 XP. Cada bonus foi simulado separadamente com 10000 compras por limiar, reduzindo um XP por passo.

| Bonus | XP | RTP ao preco minimo | Bonus com pelo menos um retrigger |
| --- | --- | --- | --- |
| Normal | 25 | 35.366% | 9.060% |
| Normal | 24 | 39.400% | 9.110% |
| Normal | 23 | 44.182% | 9.100% |
| Normal | 22 | 53.020% | 9.070% |
| Normal | 21 | 59.610% | 9.080% |
| Normal | 20 | 75.587% | 9.500% |
| Normal | 19 | 88.342% | 9.120% |
| Normal | 18 | 114.857% | 9.460% |
| Super | 20 | 56.583% | 9.720% |
| Super | 19 | 68.129% | 9.950% |
| Super | 18 | 86.770% | 9.540% |
| Super | 17 | 114.780% | 10.070% |

O preco minimo usado na pesquisa foi 80x para Normal e 200x para Super. Os limiares inteiros saltam a faixa 96%-98% a esses precos. Selecionou-se o primeiro limiar cujo premio medio permite chegar a faixa com preco inteiro no intervalo obrigatorio: Normal 18 XP a 95x; Super 17 XP a 237x, ambos proximos de 97% na amostra de calibracao. Nao se alteraram premios por simbolo, XP por cluster, geracao, retriggers, magia ou preco Secret. As probabilidades de entrada base/Hunt mantem-se; o seu RTP aumenta porque os bonus naturais usam as novas barras.

O Super registou 10,07% de bonus com retrigger na amostra de calibracao a 17 XP, ligeiramente acima da meta anterior de 10%. As probabilidades condicionais de scatter mantem-se fixadas; nao foram alteradas para compensar este resultado.

Reproduzir pesquisa: npm.cmd run calibrate:xp -- common e npm.cmd run calibrate:xp -- super. Esses comandos testam desde os limiares originais 25/20 e aos precos minimos. Simular os cinco modos atuais: npm.cmd run validate:xp; outras seeds: npm.cmd run validate:xp -- --independent. Todas as amostras sao locais, nao certificacao do RTP real.

Fontes: [pesquisa Normal](xp-common-v31-calibration.json), [pesquisa Super](xp-super-v31-calibration.json), [cinco modos](rtp-individual-bonus-xp-v31-validation.json), [outras seeds](rtp-individual-bonus-xp-v31-independent.json).

# Revisao v30 - minimos obrigatorios de compra

Normal passa a custar 80x e Super 200x; Secret mantem 754x. O motor rejeita Normal abaixo de 80x ou acima de 100x e Super abaixo de 200x ou acima de 250x. A calibracao nao pode reduzir os precos abaixo destes minimos. Geracao de premios, pagamentos, XP, magia, scatters e copias inalterados. Alterar apenas o preco muda o denominador do RTP das compras; nao aumenta o premio medio. Os RTPs anteriores com compras a 29x/117x sao historicos.

# Revisao v29 - retrigger Secret alvo 8%

O segundo scatter do Secret passa de 1415 para 1270 PPM; primeiro e terceiro mantem 18000 PPM. A meta corrigida pelo utilizador e 8% dos bonus completos com pelo menos um retrigger. Com 10000 compras e seed 24261043, observaram-se 801 bonus com retrigger (8,01%). E calibracao amostral, sem quota ou garantia de probabilidade real exata. Restantes modos e parametros mantidos, incluindo os 18 XP e alternancia +2/+3.

# Revisao v28 - Secret alterna incrementos +2/+3

A primeira magia Secret mantem 2 wilds de 2x. Cada magia seguinte acrescenta +2 wilds pedidos e alterna o aumento do multiplicador: +2, +3, +2, +3, etc. Sequencia dos novos wilds: 2x, 4x, 7x, 9x, 12x, 14x. A alternancia continua no limite de wilds e reinicia em cada novo bonus. Os sobreviventes conservam os valores individuais. Mantem-se barra de 18 XP, scatters, copias, pagamentos, precos e restantes parametros.

# Revisao v27 - Secret volta a +3 no multiplicador

Secret mantem barra de 18 XP, primeira magia de 2 wilds de 2x e ganho de +2 wilds pedidos. O multiplicador dos novos wilds volta a aumentar +3 por magia: 2x, 5x, 8x, 11x, etc. Os wilds sobreviventes conservam sempre o seu multiplicador original. Restantes parametros inalterados, incluindo scatters Secret [18000,1415,18000] PPM.

# Revisao v26 - barra Secret 18 XP

O limiar de magia do Secret sobe de 17 para 18 XP, a pedido do utilizador. Os valores de XP ganhos por cluster, restantes barras e parametros ficam inalterados. O texto do jogo usa o limiar da configuracao partilhada. A frequencia de retrigger e medida novamente, pois a mudanca de magia pode alterar cascatas e oportunidades de scatter.

# Revisao v25 - retrigger Secret alvo 8,9%

O segundo scatter do Secret passa de 1500 para 1415 PPM; primeiro e terceiro mantem 18000 PPM. A meta de 8,9% aplica-se a bonus completos com pelo menos um retrigger. Calibracao com 10000 compras e seed 24261043: 890 bonus com retrigger, ou 8,9%. Este resultado nao garante uma probabilidade real exata de 8,9%; o codigo continua a sortear scatters por posicao e nao controla quotas. Restantes modos e parametros inalterados.

# Revisao v24 - valores individuais dos wilds e Secret +2

Cada wild conserva o multiplicador com que foi criado em todos os bonus. Magias seguintes nao alteram os sobreviventes, mesmo com multiplicador inferior ao da nova magia. A progressao aplica-se exclusivamente aos novos wilds. Com dez wilds presentes, a magia pode progredir mas nao coloca novos nem altera os existentes.

Secret mantem primeira magia de 2 wilds de 2x e ganho de +2 wilds pedidos, mas o multiplicador dos novos aumenta +2 por ativacao: 2x, 4x, 6x, 8x, etc. Normal e Super mantem os seus incrementos. Pagamentos, XP, copias, precos e scatters mantidos. Esta revisao substitui qualquer regra historica de atualizar multiplicadores sobreviventes.

# Revisao v23 - copias ate cinco e calibracao dos primeiros quatro modos

Uma selecao pode gerar de zero a cinco copias adicionais (ate seis simbolos incluindo o original). Cada copia tenta ocupar um vizinho ortogonal livre da copia anterior; a cadeia para quando falha o sorteio, nao ha espaco, ou ja colocou cinco copias. Copias nao iniciam cadeias independentes. As mesmas regras aplicam-se em todos os modos e refills.

| Copia adicional | Normal: chance condicionada as anteriores | Premium: chance condicionada as anteriores |
| --- | --- | --- |
| Primeira | 70% | 45% |
| Segunda | 45% | 45% |
| Terceira | 18% | 10% |
| Quarta | 5% | 4% |
| Quinta | 1% | 1% |

Havendo espaco em todos os passos, a probabilidade exata de k copias e o produto das chances ate k multiplicado pela falha do passo seguinte; cinco copias nao tem sorteio seguinte. Sem espaco, os resultados deslocam-se para menos copias.

| Copias adicionais exatas | Normal | Premium |
| --- | --- | --- |
| 0 | 30% | 55% |
| 1 | 38,5% | 24,75% |
| 2 | 25,83% | 18,225% |
| 3 | 5,3865% | 1,944% |
| 4 | 0,280665% | 0,08019% |
| 5 | 0,002835% | 0,00081% |

Outros ajustes permitidos na calibracao: terceiro scatter base passa de 17800 para 16000 PPM (primeiro/segundo/quarto/quinto mantidos); reforco Hunt de 2,415 para 2,43; compra Super de 103 para 117 apostas base. Compra Normal mantem 29 e Secret 754. A ordem e pesos dos simbolos mantem-se. Pagamentos, XP, dez wilds, evolucao de magia e probabilidades de scatter dos bonus v22 nao mudam.

Alvo de calibracao: 96%-98% em Base, Hunt, Normal e Super; Secret e medido mas nao afinado especificamente. Nao se presume que o RTP Secret seja matematicamente sempre maior: o resultado depende dos premios e do preco. Todos os modos partilham as copias e, por isso, a sua geracao tambem muda.

Amostras: 100000 entradas Base, 100000 Hunt e 10000 compras de cada bonus, incluindo bonus naturais e todos os retriggers. Calibracao com seeds 20261031 + indice * 1000003; verificacao adicional com seeds 3198127 + indice * 1000003 (indice: Base=0, Hunt=1, Normal=2, Super=3, Secret=4). As seeds adicionais nao foram usadas para escolher os parametros; o ultimo ajuste de Hunt foi escolhido pelo desvio na amostra de calibracao. Resultados amostrais e intervalos nao certificam o RTP real nem um limite exato de 10% de bonus com retrigger.

Reproduzir: npm.cmd run validate:copies; para a outra amostra: npm.cmd run validate:copies -- --independent. Relatorios: [calibracao](rtp-five-copies-v23-validation.json) e [outras seeds](rtp-five-copies-v23-independent.json). Configuracao integral, hashes, intervalos, RTP por componente e frequencias de retrigger ficam nos JSON.

## Resultados v23 - 2026-10-31

| Modo | Entradas por amostra | RTP calibracao | RTP outras seeds | Bonus com retrigger calibracao | Bonus com retrigger outras seeds |
| --- | --- | --- | --- | --- | --- |
| Base | 100000 | 97.137% | 95.887% | 8.993% | 8.347% |
| Hunt | 100000 | 96.917% | 97.672% | 8.956% | 8.689% |
| Normal | 10000 | 97.569% | 96.242% | 9.060% | 9.350% |
| Super | 10000 | 96.767% | 96.673% | 9.720% | 9.790% |
| Secret | 10000 | 153.839% | 150.531% | 9.290% | 9.760% |

Os quatro modos alvo ficam entre 96% e 98% na calibracao. Na outra amostra, Base fica ligeiramente abaixo de 96%; nao ha certificacao. Secret e medido sem afinacao especifica.

# Revisao v22 - meta de retrigger no maximo 10%

Meta: no maximo 10% dos bonus com pelo menos um retrigger, medida por bonus completo e nao por posicao nem por numero de eventos. Probabilidades condicionais por posicao para primeiro/segundo/terceiro scatter: Normal [18000,1800,23000], Super [18000,1800,21000], Secret [18000,1500,18000] PPM. Valores aprovados no contrato do utilizador. Mantem-se primeiro e terceiro scatter; reduz-se o segundo. A meta requer medicao estatistica e nao e um limite garantido por quota.

O simulador regista bonusRoundsCount, bonusRoundsWithRetrigger e bonusRetriggerFrequency. No base/Hunt o denominador inclui apenas entradas que ativaram bonus; nas compras inclui todas as compras. Restantes parametros mantidos.

# Revisao v22 - probabilidade de pelo menos um retrigger abaixo de 10%

Pedido do utilizador: no maximo 10% dos bonus com pelo menos um retrigger. Ajusta-se somente a probabilidade condicional do segundo scatter: Normal 1800 PPM (0,18%), Super 1800 PPM (0,18%), Secret 1500 PPM (0,15%). Primeiro e terceiro scatters mantidos; vetores atuais Normal [18000,1800,23000], Super [18000,1800,21000], Secret [18000,1500,18000]. Restantes parametros mantidos.

A meta e P(pelo menos um retrigger durante o bonus completo), nao eventos por bonus nem probabilidade por posicao. O simulador passa a registar bonusCount, bonusesWithRetrigger e bonusWithRetriggerFrequency; no base/Hunt o denominador inclui apenas entradas que ativam bonus. Calibracao local com margem e verificacao com seeds independentes; uma amostra abaixo de 10% nao prova um limite matematico exato nem garante que todas as futuras amostras fiquem abaixo de 10%. Nao existe quota global nem bloqueio do segundo retrigger.

# Revisao v21 - Secret aumenta +3 no multiplicador

Secret: primeira magia mantem 2 wilds de multiplicador 2. Cada magia seguinte acrescenta +2 wilds pedidos e +3 ao multiplicador (2, 5, 8, 11, ...). Ao atingir dez wilds pedidos, apenas o multiplicador continua a aumentar +3. Restantes parametros inalterados. Esta revisao substitui os incrementos historicos de +4 abaixo.

# Revisao v20 - raridade ordenada e copias arredondadas

Ordem obrigatoria de raridade crescente: N1 < N2 < N3 < N4 < N5 < P1 < P2 < P3 < P4 < P5. As probabilidades de sorteio decrescem estritamente nessa ordem: 15,5% / 13,7% / 12,1% / 11,9% / 10,3% / 9,5% / 8,5% / 8% / 6,5% / 4%. Somam 100%, condicionadas a nao sair scatter.

Copias vizinhas: normais 62%, premium 61%; segunda copia condicionada a primeira 44%, em todos os modos. Valores inteiros ligeiramente superiores aos anteriores; normais copiam mais que premium. Pagamentos e restantes parametros mantidos. Esta revisao substitui os pesos e copias historicos abaixo.

# Revisao v19 - reducao de copias em 15%

Substitui a reducao anterior de 25%. Probabilidades originais multiplicadas por 0,85: primeira copia normal 59,5%; primeira copia premium 60,35%; segunda copia, condicionada a primeira, 43,35%. Aplicam-se a todos os modos e preenchimentos, quando existem vizinhos livres. Pagamentos, pesos dos simbolos, XP, magia, scatters e precos mantem-se. Esta revisao substitui as probabilidades de copia historicas abaixo.

# Revis?o v17 ? raridade premium e barra de XP

Pesos condicionados a n?o sair scatter: N1 15,5%; N2 13,7%; N3 12%; N4 10,3%; N5 12%; P1 8,5%; P2 9,5%; P3 8%; P4 6,5%; P5 4%. Todos os premium s?o mais raros que qualquer normal no sorteio. As probabilidades de c?pia permanecem 70% normais, 71% premium e 51% para a segunda c?pia; frequ?ncias finais de ocupa??o n?o s?o estes pesos condicionais.

A barra visual de XP e a anima??o dirigida ? barra s?o retiradas no base/Hunt e mantidas nos b?nus. A acumula??o de XP e magia base/Hunt continua com limiar 40; pagamentos e restantes par?metros inalterados.

# Pagamentos atuais ? v16

Tabela completa aprovada em 2026-10-31, transcrita de simbolos_x.md. Os montantes do anexo para aposta 0,10 s?o divididos por 0,10 para obter m?ltiplos da aposta; o motor guarda esses m?ltiplos em cent?simos. A mesma tabela aplica-se a todos os modos.

| S?mbolo | 5 | 6?7 | 8?10 | 11?13 | 14?17 | 18+ |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | 0.1? | 0.2? | 0.5? | 1? | 2? | 5? |
| N2 | 0.1? | 0.2? | 0.5? | 1? | 2? | 5? |
| N3 | 0.1? | 0.2? | 0.5? | 1? | 2? | 10? |
| N4 | 0.2? | 0.4? | 0.7? | 1.5? | 3? | 10? |
| N5 | 0.2? | 0.4? | 0.7? | 1.5? | 3? | 10? |
| P1 | 0.5? | 0.8? | 1.5? | 3? | 10? | 50? |
| P2 | 0.5? | 0.8? | 1.5? | 3? | 10? | 50? |
| P3 | 0.8? | 1.2? | 2.5? | 5? | 15? | 75? |
| P4 | 0.8? | 1.2? | 2.5? | 5? | 15? | 100? |
| P5 | 1? | 1.5? | 5? | 10? | 25? | 150? |

XP mant?m os escal?es 5 / 6?7 / 8?10 / 11?14 / 15?17 / 18+, contando apenas regulares: normais 3/5/7/9/11/13 e premium 5/7/9/11/13/15. Barras 40/25/20/17; restantes par?metros inalterados. Esta revis?o substitui os pagamentos hist?ricos abaixo.

---

# Etapa 1 — Lógica, mecânicas, bónus e RTP

> Estado vigente: `sofia-premium-clusters-fixed-magic-v15`. Premium com maior peso e copias vizinhas; Super +1 W/+2 multi e Secret +2 W/+4 multi garantidos. Contrato fixo de pagamentos, XP, dez WILDs e probabilidades condicionais de retrigger preservado. Consultar [configuracao, precos e RTPs atuais](README.md#configuração-atual-premium-e-clusters-maiores).

> Estado vigente: `sofia-magic-simple-random-double-v14`. Normal com melhoria garantida; Super com sorteios de +1 a +3 WILDs e multiplicador; Secret com dois sorteios e o melhor de cada recompensa. Barras, XP por cluster, precos, limite de dez e probabilidades dos simbolos mantidos. Consultar a [mecanica e medicao atuais](README.md#magia-atual-simples-sorteada-e-dupla).

> Estado vigente: `sofia-cluster-xp-normal-premium-v13`. XP fixo por cluster, contando apenas regulares: normais 3/5/7/9/11/13 e premium 5/7/9/11/13/15. Menos de cinco regulares dao zero XP. Barras, pagamentos, precos e limite de dez WILDs mantidos. Consultar a [regra e a medicao atuais](README.md#xp-por-cluster-normais-e-premium).

> Estado vigente: `sofia-ten-wilds-fixed-xp-25-20-17-v12`. Barras fixadas em 25/20/17 XP para Normal/Super/Secret; base-Hunt 40 XP. Consultar os [valores e RTPs atuais](README.md#barras-fixadas-252017-xp).

> Estado vigente: `sofia-ten-wilds-xp-first-below-99-v11`. Barras de 40/26/21/18 XP no base-Hunt/Normal/Super/Secret; limite fixo de dez WILDs. Foi selecionado o primeiro resultado abaixo de 99% em passos de +1 XP com 10 000 compras por candidato. Consultar a [pesquisa e os resultados atuais](README.md#pesquisa-atual-primeiro-rtp-abaixo-de-99).

> Estado vigente: `sofia-fixed-ten-wilds-v10`. Limite fixo de dez WILDs em todos os modos, substituindo os limites anteriores. Consultar a [regra e a simulação atuais](README.md#dez-wilds-limite-fixo).

> Estado vigente: `sofia-rarity-magic-v9`. A [magia por raridade](README.md#magia-por-raridade) substitui as regras anteriores de alternancia, sorteio do Super, limites iguais e barras de XP. Normal/Super/Secret usam 18/16/15 XP, limites de 4/6/8 WILDs e precos de 27x/188x/697x. As secoes anteriores abaixo sao historicas.

> Revis?o atual: Normal/comum exige 24 XP. Normal e Super come?am em 0 W e ?1; a primeira barra d? 1 W ?1. O Normal mant?m depois a altern?ncia +1 W / +1?; o Super sorteia depois +1 W ou +2? com 50% para cada. Com oito WILDs, apenas o multiplicador aumenta. Ver [mec?nica e medi??o](README.md#normal-e-super-evolu??o-a-partir-de-zero).

> Limite atual: oito WILDs simult?neos, incluindo os sobreviventes. As refer?ncias anteriores a seis s?o hist?ricas; as progress?es chegam agora a oito antes de continuar apenas o multiplicador.

## Revis?o atual: XP por s?mbolo

Cada s?mbolo normal N1?N5 num grupo vencedor d? 1 XP; cada premium P1?P5 d? 2 XP. WILDs d?o zero XP e n?o multiplicam o XP. A quantidade exata conta, sem tabela fixa por escal?o e sem m?nimo de cinco regulares: quatro normais mais um WILD d?o 4 XP. As barras mant?m 40/30/22/15 no base-Hunt/normal-comum/Super/Secret. Consultar os [resultados atuais](README.md#xp-por-s?mbolo-normais-1-premium-2).

## Revis?o anterior: XP fixo por cluster

A tabela inteira por cluster aprovada substitui o XP por c?lula. O escal?o conta apenas s?mbolos regulares do grupo vencedor: menos de cinco d?o zero XP, mesmo com WILDs a completar o hit. As barras exigem 40 XP no base/Hunt, 30 no normal/comum, 22 no Super e 15 no Secret. Pagamentos, pre?os e probabilidades mant?m-se. Consultar a [tabela e medi??o atuais](README.md#xp-fixo-por-cluster-barras-40302215).

## Revis?o anterior de 31 de outubro de 2026

Esta revis?o substitui as metas e tabelas anteriores: RTP pretendido de 96%?98%, uma ?nica tabela de pagamentos estritamente crescente por s?mbolo e por intervalo em todos os modos, soma dos multiplicadores WILD por hit, barras inteiras de 39/12/11/10 XP (base/comum/Super/Secret) e retriggers aproximadamente uma vez por 3,27 b?nus (dois scatters) ou 11,32 b?nus (tr?s scatters). Contar eventos por b?nus completo, incluindo spins adicionais. A medi??o pedida ? 100 000 spins base, 100 000 Hunt e 10 000 compras de cada b?nus. A proposta de pre?os para as compras aguarda decis?o; consultar o [estado atual e resultados](README.md#tabela-?nica-xp-e-retriggers-2026-10-31).

## Contexto para o agente

Vamos criar uma slot de raiz num projeto limpo. Este documento é uma instrução de trabalho para um agente que não conhece conversas anteriores. O desenvolvimento decorre em três etapas:

1. **Lógica:** discutir e implementar regras, mecânicas, bónus e matemática, sem gráficos.
2. **Protótipo visual básico:** tornar as mecânicas observáveis e decidir posições, áreas, controlos e menus em conjunto.
3. **Produção visual:** depois de o utilizador fornecer tema, imagens e cores, criar todos os visuais e animações com uma equipa de três agentes: o principal e dois em paralelo.

Estamos apenas na primeira etapa. Não antecipar o desenho da interface nem produzir arte final. O utilizador quer construir a ideia através de conversa, com um agente que toma iniciativa, faz perguntas e propõe alternativas.

## Conceito recebido — 30 de outubro de 2026

Esta secção regista as regras e a configuração inicial de desenvolvimento. O [motor local](src/engine.js), as [tabelas executáveis](src/config.js), os testes e o simulador estão implementados; os valores iniciais ainda não estão calibrados para o RTP pretendido. Consultar o [guia de execução](README.md) e o estado da medição na [formulação matemática](matematica.md).

### Regras confirmadas pela ideia inicial

- Grelha 6×5, com pagamentos por grupos de símbolos iguais ligados horizontal ou verticalmente. Diagonais não ligam grupos; não existem linhas de pagamento.
- Dez símbolos regulares: cinco normais, menos valiosos, e cinco premium, mais valiosos, com raridades crescentes. Identificadores N1–N5 e P1–P5; pesos, pagamentos e XP seguem a ordem global N1 a P5 nas tabelas atuais.
- Existe um símbolo scatter e existem wilds.
- O prémio máximo é 10 000× a aposta, acumulando toda a jogada paga: spin base, cascatas, bónus e spins adicionais originados. Ao atingir ou ultrapassar o teto, creditar apenas o necessário para totalizar exatamente 10 000× e terminar imediatamente a jogada, incluindo cascatas, magias e free spins restantes. Emitir um evento de MAX WIN para a apresentação futura mostrar um ecrã com «MAX WIN». Não aplicar tetos separados por hit ou free spin, nem pagar o prémio total novamente ao mostrar esse ecrã.
- Um grupo começa a pagar com cinco símbolos. A tabela tem seis escalões, sendo o primeiro 5 e o último 18+. O tamanho máximo físico de um grupo é 30.
- Ao sortear um dos cinco símbolos normais para uma posição, existe 52% de probabilidade de colocar outro igual numa posição vizinha desocupada, horizontal ou vertical. Se não existir vizinha válida, não se gera a cópia. A probabilidade aplica-se por símbolo sorteado, não por spin. A implementação escolhe uniformemente entre vizinhas válidas, permite apenas uma segunda cópia com a probabilidade própria de 25% e aplica a mesma regra nas cascatas.
- Os grupos vencedores desaparecem; os símbolos restantes caem e entram símbolos novos, permitindo cascatas. Wilds usados num hit desaparecem; os não usados permanecem durante as cascatas com o seu multiplicador individual. Nenhum wild sobrevive à passagem para outro spin, incluindo spins de bónus.
- Os resultados são gerados aleatoriamente com probabilidades explícitas configuráveis. A decisão inicial de não simular foi substituída pelo pedido explícito de formular, simular e calibrar para RTP de 98%–100%. O plano atual inclui 1 000 000 de jogadas base completas com os bónus obtidos e 100 000 compras de cada tipo de bónus, com análise separada. Ver a [formulação matemática](matematica.md). Não afirmar um RTP medido ou validado com base apenas na configuração de probabilidades.
- O XP é ganho apenas nos grupos vencedores e depende da quantidade de símbolos e da raridade, com influência pequena, mas existente, da raridade. Para XP contam apenas os símbolos regulares, usando a raridade do grupo: quatro normais mais um wild formam um hit de cinco e geram 4 XP; quatro premium mais um wild geram 8 XP. Wilds continuam a contar no tamanho do hit e no pagamento; um hit só de wilds gera zero XP.
- No jogo base, a barra mantém XP durante as cascatas do mesmo spin, mas reinicia a cada novo spin. O XP do jogo base nunca passa para o bónus, mesmo que o spin que o ativa também tenha hits. A entrada no bónus começa com a barra vazia; durante o bónus, o progresso da barra mantém-se entre spins. Ao regressar ao jogo base, não se recupera XP anterior.
- Os três bónus começam com 12 spins. Encher a barra ativa a magia sem acrescentar spins. Apenas scatters podem conceder os retriggers previstos.
- Quando uma cascata enche a barra, primeiro pagam-se os grupos que geraram esse XP, removem-se os vencedores e deixam-se cair e entrar os símbolos. Antes de avaliar ou pagar quaisquer novos grupos, a magia esvazia a barra e lança os wilds no tabuleiro. Só depois se avalia o tabuleiro resultante. A magia coloca o XP exatamente a zero e descarta todo o excedente do preenchimento; esse excedente não gera ativações adicionais. Wilds só substituem os cinco símbolos normais ou os cinco premium, nunca scatters nem wilds existentes.
- Um wild pode participar em todos os grupos a que esteja fisicamente ligado. Para cada símbolo regular, apurar separadamente os componentes ligados por passos horizontais ou verticais, atravessando apenas esse símbolo e wilds. Outro símbolo regular, um scatter ou uma diagonal não serve de ponte. Um wild ligado apenas ao grupo de N1 não conta no grupo de P1. Se estiver ligado a ambos por percursos válidos, participa em ambos, incluindo quantidade, multiplicador e XP de cada hit; é removido fisicamente apenas uma vez. Cada posição conta apenas uma vez dentro do mesmo grupo, mesmo que existam vários percursos até ela.
- No jogo base, a barra exige mais XP e cada preenchimento espalha aleatoriamente de um a três wilds, sem multiplicador.
- Três scatters ativam o comum. A magia começa em 2 wilds de ×1 e alterna +1 wild / +1×. Ao atingir seis wilds, cada barra seguinte acrescenta +1×.
- Quatro scatters ativam o super. A magia começa em 2 wilds de ×2 e alterna +2× / +1 wild. Ao atingir seis wilds, cada barra seguinte acrescenta +2×.
- Cinco scatters ativam o secret. A magia começa em 2 wilds de ×2; cada barra seguinte acrescenta +1 wild e +2×. Após seis wilds, continua +2× por barra.
- Wilds multiplicadores no mesmo hit somam os seus valores. Exemplo: um hit com wilds ×2 e ×3 aplica ×5 ao prémio desse grupo. Wilds que sobrevivam conservam o seu valor individual, permitindo coexistirem valores diferentes.
- Todos os bónus começam com 12 spins. Os gatilhos no jogo base são contagens exatas: 3 scatters para o comum, 4 para o super e 5 para o secret. Não usar «5 ou mais» nem criar outros escalões. A geração no jogo base está limitada a cinco scatters por spin completo, incluindo as cascatas.
- No jogo base, cada posição sorteada usa a probabilidade correspondente ao próximo scatter: primeiro, segundo, terceiro, quarto ou quinto, de acordo com a contagem atual. Após gerar um scatter, atualizar imediatamente a contagem antes de sortear outra posição. Com cinco scatters, a probabilidade de gerar outro passa a zero. A contagem reinicia no spin seguinte; não sortear antecipadamente uma quantidade nem garantir qualquer scatter. Os cinco valores de probabilidade ainda estão por definir e são configurados separadamente dos valores do bónus.
- Contar scatters uma única vez no fim de cada spin completo, depois de terminarem todos os hits, cascatas e eventuais magias. Isto aplica-se a cada spin do jogo base e a cada spin do bónus; não acumular scatters entre spins. Não ativar nem atribuir spins adicionais durante uma cascata ainda em curso.
- Durante um bónus, exatamente dois scatters dão mais dois spins e exatamente três scatters dão mais quatro spins. Não adicionar os escalões propostos de quatro ou cinco scatters nem promover o tipo de bónus.
- No bónus, a geração está limitada a três scatters por spin completo, incluindo todos os preenchimentos de cascatas. A geração ocorre individualmente por posição: com zero scatters no spin usa-se a probabilidade configurada para o primeiro; com um, a do segundo; com dois, a do terceiro; com três, a probabilidade de outro scatter é zero. Atualizar a contagem imediatamente após cada scatter gerado, antes de sortear a posição seguinte. Não sortear previamente uma quantidade de scatters por spin nem garantir que sai pelo menos um: cada posição pode falhar o sorteio. Os valores das três probabilidades ainda estão por definir.

### Seis escalões definidos para a tabela

| Escalão | Quantidade de símbolos ligados |
| --- | --- |
| 1 | 5 |
| 2 | 6–7 |
| 3 | 8–10 |
| 4 | 11–14 |
| 5 | 15–17 |
| 6 | 18+ |

Estes escalões cobrem todos os tamanhos premiados sem sobreposição. Cada símbolo terá os seus seis valores de pagamento, ainda por calibrar; 18+ é um escalão de pagamento, não um limite de tamanho do grupo.

### Progressão confirmada da magia nos bónus

Numerar as ativações desde `k = 1` no início de cada novo bónus. O contador mantém-se entre os spins desse bónus, incluindo spins adicionais; reinicia apenas num novo bónus. Os wilds no tabuleiro continuam a desaparecer na passagem de spin, mas o progresso da magia e o XP parcial mantêm-se durante o bónus.

| Ativação | Comum | Super | Secret |
| --- | --- | --- | --- |
| 1 | 2 wilds ×1 | 2 wilds ×2 | 2 wilds ×2 |
| 2 | 3 wilds ×1 | 2 wilds ×4 | 3 wilds ×4 |
| 3 | 3 wilds ×2 | 3 wilds ×4 | 4 wilds ×6 |
| 4 | 4 wilds ×2 | 3 wilds ×6 | 5 wilds ×8 |
| 5 | 4 wilds ×3 | 4 wilds ×6 | 6 wilds ×10 |

- Comum alterna +1 wild / +1×. Super alterna +2× / +1 wild. Secret acrescenta ambos a cada barra.
- A quantidade está limitada a seis wilds simultâneos, incluindo existentes. Ao atingir seis, todas as barras seguintes melhoram o multiplicador: +1 no comum, +2 no super/secret.
- A magia melhora também os multiplicadores dos wilds sobreviventes; nunca reduz um multiplicador maior. Scatters não são substituídos. Se faltarem posições elegíveis, ignorar os wilds que não couberem.
- Somar os multiplicadores dos wilds ligados a cada hit nos três bónus. A evolução reinicia no bónus seguinte.

### Propostas para discutir

- Configuração inicial de XP definida para desenvolvimento: `quantidade × (1 + 0,02 × índice_de_raridade)`, com índice de 0 a 9, de N1 a P5. A raridade acrescenta no máximo 18%; os multiplicadores monetários não multiplicam XP. A quantidade inclui os wilds fisicamente ligados usados em cada grupo. Barras atuais: jogo normal 39 XP, comum 18,80 XP, super 17,10 XP e secret 16,50 XP, sem alteração do limiar conforme sobe o nível. A [formulação matemática](matematica.md) contém a tabela completa de XP por símbolo e intervalo. Estes valores ainda precisam de calibração de RTP.

### Configuração matemática atual

Os valores desta secção são as tabelas de `sofia-growth-4`, preservadas em `sofia-growth-4-hunt-3` com a revisão do Bonus Hunt. Não são probabilidades medidas de prémio nem garantem RTP. Os seis escalões foram aumentados por fatores de aproximadamente 1,5; 3; 6; 12; 24 e 48 face à versão inicial, com arredondamento ao centésimo, favorecendo sobretudo os clusters grandes. Não substituem as regras confirmadas e ainda precisam de calibração.

#### Símbolos, pagamentos e XP

Primeiro sortear se a posição recebe scatter usando a probabilidade do modo e da contagem atual. Se não receber scatter, sortear um dos dez símbolos pela distribuição abaixo, que soma 100%. Assim, a probabilidade do símbolo regular numa posição sorteada é `(1 - probabilidade_scatter_atual) × probabilidade_condicional`. Uma posição ocupada por uma cópia de par não recebe um novo sorteio independente.

Todos os pagamentos são múltiplos da aposta total, por grupo vencedor, antes dos multiplicadores dos wilds. A proposta usa a mesma distribuição e tabela em todos os modos e preenchimentos; as diferenças entre modos vêm dos scatters e da magia.

| Símbolo | Probabilidade condicional | 5 | 6–7 | 8–10 | 11–14 | 15–17 | 18+ | XP por posição do hit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N1 | 18% | 0,15× | 0,45× | 1,50× | 6,00× | 24,00× | 96,00× | 1,00 |
| N2 | 16% | 0,18× | 0,54× | 1,80× | 7,20× | 28,80× | 120,00× | 1,02 |
| N3 | 14% | 0,23× | 0,66× | 2,40× | 9,60× | 38,40× | 144,00× | 1,04 |
| N4 | 12% | 0,30× | 0,90× | 3,00× | 12,00× | 48,00× | 192,00× | 1,06 |
| N5 | 10% | 0,38× | 1,20× | 3,90× | 15,60× | 62,40× | 240,00× | 1,08 |
| P1 | 9% | 0,60× | 1,80× | 6,00× | 24,00× | 96,00× | 384,00× | 1,10 |
| P2 | 7% | 0,90× | 2,70× | 9,00× | 36,00× | 144,00× | 576,00× | 1,12 |
| P3 | 6% | 1,20× | 3,60× | 12,00× | 48,00× | 192,00× | 768,00× | 1,14 |
| P4 | 5% | 1,50× | 4,50× | 15,00× | 60,00× | 240,00× | 960,00× | 1,16 |
| P5 | 3% | 2,25× | 7,50× | 24,00× | 96,00× | 384,00× | 1440,00× | 1,18 |

Exemplo de XP: seis posições num hit de P3, incluindo os wilds usados, geram `6 × 1,14 = 6,84 XP`, independentemente do multiplicador monetário. O motor guarda XP e prémios normalizados em centésimos inteiros, acumula toda a jogada e arredonda por defeito apenas na liquidação para unidades de crédito.

#### Scatters por posição sorteada

| Scatter que se tenta gerar | Jogo base | Qualquer bónus |
| --- | --- | --- |
| Primeiro | 3,01% | 3,00% |
| Segundo | 2,01% | 1,20% |
| Terceiro | 0,655% | 0,30% |
| Quarto | 0,15% | 0% |
| Quinto | 0,04% | 0% |
| Após atingir o limite | 0% | 0% |

Estas são probabilidades locais, condicionadas pela contagem atual; não são a probabilidade final de entrar num bónus ou ganhar spins. As cascatas criam novas oportunidades de sorteio. Proposta: scatters não pagam um prémio monetário próprio, apenas ativam bónus ou atribuem spins adicionais.

#### Magia e escolha de posições

| Parâmetro | Proposta inicial |
| --- | --- |
| Limiar de XP no jogo base | 39 XP |
| Limiar no comum | 18,80 XP |
| Limiar no super | 17,10 XP |
| Limiar no secret | 16,50 XP |
| Magia base: lançar 1 wild | 50% |
| Magia base: lançar 2 wilds | 35% |
| Magia base: lançar 3 wilds | 15% |
| Wilds naturais no sorteio de símbolos | 0%; criados apenas pela magia |
| Posições da magia | Sorteio uniforme sem reposição entre símbolos regulares elegíveis |
| Vizinha de um par | Sorteio uniforme entre vizinhas ortogonais livres |
| Aplicação dos pares | Preenchimento inicial e entradas de cascatas; cópias não geram outras cópias |
| Ordem técnica de geração | Colunas da esquerda para a direita; posições livres de baixo para cima, após compactar as colunas |

A chance de tentar criar um par é de 52% (com 25% de tentar uma segunda cópia junto da primeira, sem recursão) para símbolos normais; a quantidade e o multiplicador dos wilds nos bónus seguem a progressão confirmada, sem sorteio adicional. Uma magia que encheu a barra ocorre sempre, não tem uma segunda probabilidade de ativação.

### Bonus Hunt

- Entrada `hunt`: custo de 4× a aposta base por jogada, debitado/registado uma única vez. Os pagamentos e MAX WIN de 10 000× continuam referidos à aposta base.
- Para aproximar o RTP da meta, o utilizador autorizou aumentar o fator de scatter de 1,53 para 1,94. O objetivo anterior de aproximadamente 3× entradas em bónus deixa de limitar este ajuste. Aplicar o fator a cada probabilidade de scatter por posição no spin base e em todas as suas cascatas, mantendo a dependência da contagem atual e o limite de cinco scatters. Arredondar à parte por milhão mais próxima e limitar a probabilidade a 100%. Não sortear diretamente uma probabilidade de entrada no bónus.

| Próximo scatter | Base normal | Bonus Hunt |
| --- | --- | --- |
| Primeiro | 3,01% | 5,8394% |
| Segundo | 2,01% | 3,8994% |
| Terceiro | 0,655% | 1,2707% |
| Quarto | 0,15% | 0,291% |
| Quinto | 0,04% | 0,0776% |
| Após cinco | 0% | 0% |

- São mantidos pagamentos, pesos condicionais dos símbolos, pares, XP, magia e gatilhos exatos de 3/4/5. Alterar a chance de scatter altera naturalmente a probabilidade absoluta de sair um símbolo regular, porque as probabilidades da posição continuam a somar 100%.
- O boost termina quando se entra num bónus; os free spins e retriggers usam as probabilidades normais do bónus obtido, sem custos adicionais.
- O pedido inicial «3× chance de obter bónus» referia-se à frequência agregada, atingida aproximadamente na versão anterior. A revisão atual favorece o RTP e gera uma frequência maior; ver o histórico de medição na formulação matemática. A frequência final tem incerteza estatística e não é uma garantia por sessão.

### Regras de fronteira confirmadas

- Ecrã exclusivamente com wilds e scatters: todos os casos recebem o mesmo pagamento base, igual ao símbolo mais caro no escalão 18+. No jogo base, isto abrange 25–30 wilds com zero a cinco scatters; no bónus, 27–30 wilds com zero a três scatters. Na tabela inicial proposta, corresponde a P5 / 18+, ou 1 440× a aposta antes dos multiplicadores. A regra confirmada referencia a tabela, não fixa os valores ainda propostos dessa tabela.
- Este resultado é um único prémio especial do ecrã, não dez prémios por substituição dos dez símbolos nem prémios separados pelos componentes que os scatters possam isolar. Aplicar a regra existente de somar os multiplicadores dos wilds participantes; sem multiplicadores, aplicar apenas o pagamento base. Os scatters não entram na quantidade de wilds, no multiplicador ou no XP do hit. Usar a raridade de P5 para o XP e retirar os wilds usados como num hit normal, salvo se o MAX WIN já tiver encerrado a jogada.
- A exceção acima inclui o caso confirmado de quatro ou cinco scatters no jogo base. Não cria pagamentos independentes para componentes só de wilds num tabuleiro que ainda tenha símbolos regulares.
- MAX WIN: o teto, o âmbito da jogada completa, o encerramento imediato e o ecrã «MAX WIN» estão confirmados nas regras acima. A implementação visual pertence às etapas posteriores; o motor deve emitir o evento e o resultado final sem depender da interface.

### Implementação e calibração pendente

1. Pares: vizinhas uniformes, sem recursão das cópias, no preenchimento inicial e cascatas; ordem de geração conforme a configuração acima. Gerar pares não garante grupos premiados.
2. Resolução do tabuleiro: o prémio especial de ecrã apenas com wilds e scatters e o tratamento de posições insuficientes para a magia estão confirmados acima; não há decisão pendente nestes dois casos.
3. XP: fórmula, tabela e limiares iniciais implementados acima e na formulação matemática; falta calibrar os valores. A origem do XP, a contagem dos wilds, a persistência por modo, o momento da magia e o descarte do excedente estão confirmados acima.
4. Bónus: os cinco valores de probabilidade de scatter no jogo base e os três no bónus estão implementados conforme as tabelas, sujeitos a calibração. A sequência de progressão, a ausência de teto de nível e o tratamento de posições insuficientes estão confirmados.
5. Matemática: calibrar probabilidades, pagamentos e preços das compras conforme a [formulação matemática](matematica.md). Faixas confirmadas: comum 80×–100×, super 200×–240× e secret 300× ou mais. O âmbito e o encerramento pelo prémio máximo de 10 000× estão confirmados.

### Estado da etapa

Motor independente da interface, tabelas, testes dirigidos, eventos e simulador implementados. O [guia de execução](README.md) documenta a API e comandos locais. O utilizador aceitou os parâmetros atuais e autorizou explicitamente a etapa 2; o [protótipo estrutural](02-prototipo-visual-estrutura.md) está ligado ao motor sem alterar a matemática. A validação estatística do RTP continua pendente e não é comprovada por essa aceitação.

## Orientações para a conversa

- Pedir ao utilizador a ideia inicial, caso ainda não a tenha apresentado. Se já a apresentou, partir dela sem pedir que a repita.
- Resumir o que foi entendido e, **depois da ideia inicial**, tomar a iniciativa de fazer perguntas concretas para desenvolver o conceito.
- Trabalhar um assunto de cada vez, com poucas perguntas por ronda. Evitar um questionário longo logo no início.
- Dar ideias próprias: apresentar duas ou três alternativas quando houver uma escolha relevante, recomendar uma e explicar o efeito na experiência e na matemática.
- Usar exemplos de jogadas para discutir regras. Identificar ambiguidades, conflitos, casos extremos e mecânicas que possam tornar-se pouco interessantes.
- Explicar termos como RTP, volatilidade e frequência de prémios em linguagem simples quando aparecerem.
- Distinguir ideias propostas, decisões confirmadas e questões em aberto. Não transformar silêncio em aprovação de uma mecânica.
- Resolver escolhas técnicas rotineiras autonomamente. Confirmar com o utilizador decisões que mudem a experiência ou as regras.
- Implementar, testar e simular partes já acordadas enquanto a conversa evolui; não inventar regras em falta para declarar o jogo concluído.

## Assuntos a decidir progressivamente

Abordar apenas o que for aplicável ao conceito:

- Grelha, rolos, símbolos e forma de pagar: linhas, ways, clusters ou outra.
- Valor da aposta, tabela de pagamentos, combinações e ordem de resolução dos prémios.
- Wilds, scatters, substituições, cascatas, multiplicadores e respetivos limites.
- Gatilhos de bónus, free spins, retriggers, persistência de estados e condições de saída.
- Compra de bónus ou outros modos, apenas se fizerem parte da ideia; custo e matemática próprios.
- RTP alvo, volatilidade desejada, frequência de prémios, frequência dos bónus e prémio máximo.
- O que constitui uma jogada completa, como se cobra a aposta e como se liquidam todos os prémios dessa jogada.
- Casos de fronteira: prémios simultâneos, acumulações, limites, arredondamentos e interrupções.

O tema artístico pode ficar para a terceira etapa. Aqui bastam identificadores de símbolos e descrições funcionais.

## Implementação e validação

- Criar um motor independente da apresentação, executável por testes e simulações, sem interface gráfica.
- Separar configuração de probabilidades e pagamentos das regras e das ferramentas de simulação, sem construir infraestrutura desnecessária.
- Permitir execuções reproduzíveis com seed e cenários controlados para verificar regras raras. Não confundir aleatoriedade de teste com uma solução adequada para produção com dinheiro real.
- Produzir resultados e eventos estruturados: grelha, combinações, prémios, transições e estado do bónus. A apresentação futura deve conseguir explicar o resultado sem voltar a sortear ou calcular prémios.
- Usar unidades e arredondamentos explícitos; evitar erros de saldo por ponto flutuante.
- Testar as regras acordadas, transições de estado e limites relevantes, incluindo ausência de cobrança duplicada e de pagamento duplicado.
- Executar simulações reproduzíveis para calibração e validação independente conforme a [formulação matemática](matematica.md). Probabilidades configuradas não comprovam um RTP; registar amostras, seeds, configuração, resultados e incerteza antes de afirmar validação.
- Contar os pagamentos de free spins e bónus na jogada paga que os originou. Modos comprados usam o seu custo efetivo e uma análise separada.
- Não ajustar probabilidades ao jogador, ao saldo ou aos resultados recentes para forçar um RTP. Alterações matemáticas devem ser explícitas e versionadas.
- Usar apenas créditos e dados locais nesta etapa. Não integrar carteiras reais nem publicar por iniciativa própria.

## Entrega e passagem à etapa seguinte

Manter no projeto uma especificação de regras e um registo curto de decisões, atualizados durante o trabalho. Registar a configuração matemática, comandos reais de execução e testes, resultados obtidos, limitações e questões pendentes. Não inventar comandos antes de existir a respetiva implementação.

A etapa fica pronta quando as regras e probabilidades estão decididas, o motor funciona, os testes relevantes passam e a validação independente sustenta o RTP pretendido nos quatro modos. O RTP permanece não validado enquanto esses resultados não existirem. Confirmar com o utilizador a passagem ao protótipo; não avançar automaticamente.

Para a próxima conversa, entregar este contexto persistido e o motor, juntamente com o [guia da etapa 2](02-prototipo-visual-estrutura.md). Um agente novo deve conseguir continuar sem acesso ao histórico da conversa.

A magia coloca no máximo seis wilds no tabuleiro, incluindo os que já existem. A quantidade por ativação cresce de dois até seis nos três bónus; o multiplicador continua a crescer pelas regras de super e secret. Wilds existentes e os seus multiplicadores são preservados. A revisão `sofia-xp-evolution-6-52-25-v2` usa duplicação vizinha de 52% e uma segunda tentativa de 25%; pagamentos ajustados por modo. Wilds não geram XP e a barra não acrescenta spins. A validação local de 100 000 apostas normais e 10 000 compras de cada bónus está no [relatório atual](rtp-evolution-validation.json): estimativas pontuais entre 96% e 99%, com sementes usadas no ajuste, sem comprovar essa faixa para o RTP real.

Na evolução atual de XP, wilds sobreviventes recebem o novo multiplicador da magia sem perder um multiplicador maior que já possuam. As melhorias pertencem ao bónus e reiniciam na próxima jogada. Cada bónus começa com 12 spins; XP não gera spins e wilds não geram XP. O pagamento mínimo de um hit é 0,25× a aposta (0,05 numa aposta de 0,20). MAX WIN: 10 000×.
