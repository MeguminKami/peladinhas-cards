# Auditoria de fichas e pagamentos — 26 de outubro de 2026

A face de algumas fichas instanciadas herdava uma rotação Euler Y que inclinava o disco. Parte do disco atravessava o cilindro, causando a aparência de meia cor e ocultando o valor. A face passa a ter orientação horizontal independente do corpo, mantendo o número direito. A regressão consulta as matrizes reais das instâncias, incluindo várias fichas da mesma cor.

Faces maiores, centro escuro com número claro ampliado e sem microtexto Atelier/Casino. O material da face preserva as cores sem variações de iluminação sobre o texto; o corpo e os apliques continuam a ser geometria 3D iluminada. Seletores com algarismos maiores e fonte sem serifa de peso forte. Totais mistos mantêm vírgula decimal.

Auditoria matemática independente da tabela de multiplicadores do motor: 27.417 liquidações de planos com um número, todos os 666 pares, 37 triplos e todos os 37 números; mais 5.809 liquidações que misturam cada uma das 157 apostas canónicas com plenos. Total: **33.226 liquidações exatas**, além da verificação de carteira, serialização e ausência de crédito duplicado. Todas passaram; não foi necessário alterar pagamentos, sorteio ou regras.

Exemplos, em créditos fictícios:

| Apostas | Resultado | Custo | Retorno bruto | Líquido |
|---|---:|---:|---:|---:|
| 50 no 17 | 17 | 50 | 1.800 | +1.750 |
| 50 no 17, 50 no 20 e 50 no 21 | 17 | 150 | 1.800 | +1.650 |
| 0,50 no zero, 5 no vermelho e 5 no preto | 0 | 10,50 | 18 | +7,50 |
| 0,50 em cada um dos 37 números | Qualquer | 18,50 | 18 | −0,50 |

Num pleno, 35:1 é o lucro; o retorno bruto é 36 vezes a aposta vencedora, incluindo a sua stake. Outras apostas perdidas continuam incluídas no custo total. Apostas sobrepostas vencedoras somam os seus próprios retornos; não pagam todos os números do plano como se tivessem ganho.

Os testes de browser verificam também pleno único, três plenos, pleno+cavalo+quadro+externa+dúzia+coluna, zero, saldo e fichas efetivamente devolvidas, reload sem novo crédito e orientação das faces, nos viewports desktop e mobile.
