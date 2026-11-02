# Regras da slot

- A slot nunca pode ter barras de deslocação horizontais ou verticais, no widget ou em ecrã inteiro, incluindo a barra de controlos. Ajustar a composição e a escala ao espaço disponível; todos os elementos e ações devem permanecer visíveis. Ocultar overflow sem garantir que o conteúdo cabe não resolve o problema.
- Exemplo: num widget estreito, reduzir proporcionalmente o jogo completo; nunca exigir deslizar para chegar ao spin, autoplay ou velocidade.
- Validar ausência de overflow no documento da slot e nos controlos, em widget e ecrã inteiro, incluindo ecrãs estreitos e horizontais baixos.

# Contrato matemático fixado pelo utilizador

- Não alterar os multiplicadores de pagamento por símbolo/escalão, nem criar tabelas de pagamento por modo. A tabela executável atual é a referência; a imagem discutida foi apenas convertida, não aplicada.
- Manter as barras de XP: base/Hunt 40, Normal 18, Super 17, Secret 18.
- Manter XP fixo por cluster para os escalões 5 / 6–7 / 8–10 / 11–14 / 15–17 / 18+: normais 3/5/7/9/11/13; premium 5/7/9/11/13/15. Contar apenas regulares; menos de cinco regulares dão zero XP.
- Máximo fixo de dez WILDs simultâneos, incluindo sobreviventes, em todos os modos.
- Não alterar as probabilidades configuradas dos scatters de bónus/retrigger: Normal [18000,1800,23000], Super [18000,1800,21000], Secret [18000,1270,18000] PPM (v22: meta de no maximo 10% dos bonus com pelo menos um retrigger, aprovada pelo utilizador). Não confundir essas probabilidades condicionais por posição sorteada com a frequência observada de eventos por bónus; medir e comunicar esta última quando a geração/cascatas mudar.
- Evolução garantida após a primeira magia: Normal +1 WILD/+1 ao multiplicador; Super +1/+2; Secret +2 WILDs e incremento de multiplicador alternado +2/+3, comecando em +2 apos a primeira magia de 2x. Com dez WILDs, só aumenta o multiplicador.
- Para calibrar o RTP, podem ajustar-se os restantes parâmetros, incluindo pesos dos símbolos, formação de cópias vizinhas, entradas naturais/Hunt e preços. Manter os máximos de compra: Normal 100×, Super 250×, Secret 800×.
- Após mudanças de matemática, apresentar a tabela dos cinco RTPs observados, com 100 000 entradas base, 100 000 Hunt e 10 000 compras de cada bónus. Distinguir calibração da amostra e certificação do RTP real; não ajustar parâmetros fixos para fazer passar a meta.

- Raridade obrigatoria: pesos estritamente decrescentes de N1 a N5 e depois P1 a P5; nenhum simbolo posterior pode ser mais frequente ou igualmente frequente. As copias dos normais devem ter probabilidade maior que as dos premium.

- Cada WILD conserva o multiplicador com que foi criado, em todos os modos. Novas magias nao atualizam WILDs sobreviventes; a progressao aplica-se apenas aos novos WILDs.

- v29: Secret visa 8% dos bonus com pelo menos um retrigger; e uma meta de frequencia por bonus, nao uma probabilidade por posicao nem uma quota garantida.

- Precos de compra obrigatorios: Normal entre 80x e 100x; Super entre 200x e 250x. Nao baixar destes minimos para calibrar o RTP.

- v33: Hunt multiplica por 2,09 as probabilidades condicionais dos scatters do spin base e de todos os seus refills. Custo total 4x. O fator nao se aplica dentro dos bonus/retriggers nem diretamente a frequencia de entrada em bonus.

- v33: apenas Base/Hunt reduzem as probabilidades de cada passo de copia para 80% do valor dos bonus; as compras mantem a sua geracao. Terceiro scatter base: 6100 PPM.
