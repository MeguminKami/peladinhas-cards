# Regras da slot

- A slot nunca pode ter barras de deslocação horizontais ou verticais, no widget ou em ecrã inteiro, incluindo a barra de controlos. Ajustar a composição e a escala ao espaço disponível; todos os elementos e ações devem permanecer visíveis. Ocultar overflow sem garantir que o conteúdo cabe não resolve o problema.
- Exemplo: num widget estreito, reduzir proporcionalmente o jogo completo; nunca exigir deslizar para chegar ao spin, autoplay ou velocidade.
- Validar ausência de overflow no documento da slot e nos controlos, em widget e ecrã inteiro, incluindo ecrãs estreitos e horizontais baixos.
