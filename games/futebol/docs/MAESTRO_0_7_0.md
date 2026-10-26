# Maestro — configuração 0.7.0

Implementado em 2026-10-26. Substitui as regras P3 da versão 0.5.1; restantes regras 0.6.0 mantidas.

P3 converte qualquer posição exceto Wild, após as expansões P2. Inclui premiums e Scatters, mesmo o premium de origem. Todos os roubos são decididos no tabuleiro inicial: converter uma fonte não cancela poderes já obtidos nem cria novos roubos.

Um único premium de destino por spin: P1/P2/P3/P4, 25% cada. Cada ativação pede entre 2 e 10 conversões com pesos respetivos 18/16/14/12/11/9/8/7/5%, média 5,02. Sorteia posições sem reposição e exclui alvos de ativações anteriores, mesmo quando já tinham o símbolo de destino. Limita a quantidade aos alvos disponíveis.

Scatters são contados no tabuleiro inicial. A conversão preserva ativação natural e retrigger de +5 FS, salvo prioridade do teto. A apresentação existente entrega o retrigger no final do spin, antes de permitir o próximo.

Sessões 0.6.0 preservam saldo, RNG, resultados confirmados e retrigger pendente ao migrar. Novos spins usam 0.7.0; históricos mantêm os resultados originais. Não recalcular resultados existentes. O motor é distribuído no frontend, incluindo a versão integrada, sem função cloud de jogo.

RTP por medir nesta configuração; relatórios anteriores não a validam.

## Verificacao local em 2026-10-26

Amostra exploratoria de 10 000 rondas por modo, aposta 20, seeds independentes por modo: RTP observado base 54,51% (IC95 47,42-61,60%), compra normal 56,07% (53,25-58,88%), compra superior 96,93% (89,95-103,90%). Custos das compras incluidos no denominador. [Relatorio bruto](../reports/maestro-0.7.0-local.json). Amostra pequena, sem calibracao nem validacao conclusiva de RTP ou caudas; bonus naturais nao foram isolados nesta amostra.
