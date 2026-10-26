# Revisão visual e de interação do blackjack

Implementados os pedidos adicionais do utilizador:

- Os cinco lugares estão sobre a mesa. Avatares, cartas, pontuação, aposta e resultados ocupam o próprio lugar; não há painéis de lugares por baixo da mesa.
- O «+» no próprio lugar permite ocupar sem aposta automática. Depois de escolher a ficha, clicar na zona de aposta coloca fichas 3D. Avatar ocupado escolhe o lugar em foco. Não existem controlos auxiliares +/−/× por lugar. Desfazer e limpar fichas atuam exclusivamente no foco, com históricos independentes; limpar mantém a ocupação. O foco e a ocupação sobrevivem a reload.
- Cartas em SVG com índices, pips e figuras redesenhados, maiores e legíveis. Verso original Atelier Casino bordô/dourado, presente nas cartas fechadas e na capa do deck.
- Botões flutuantes grandes, com cores distintas: Carta verde, Parar vermelho, Dobrar dourado e Dividir azul. A disponibilidade continua a vir do motor e os atalhos mantêm a mão ativa correta.
- Fichas da mesa são meshes Three.js com volume, topo, rebordo e faixas; denominações somam exatamente cada aposta, mão dividida, double, seguro ou retorno. Não há símbolos HTML de fichas sobre a mesa. A sua posição usa projeção da interface responsiva no plano do feltro.
- Recolha de stakes e entrega de retornos animam efetivamente os grupos 3D entre jogador e banca. A carteira/ledger confirma antes de mostrar o pagamento.
- Liquidação automática sem «Confirmar resumo». Sons, texto do tipo de resultado e contador de saldo acompanham a recolha/pagamento. Distinção entre blackjack, vitória normal, dealer rebentado, mão rebentada, empate e vitória/blackjack do dealer. O texto de cada lugar discrimina resultados de split e seguro.
- As apostas reabrem automaticamente após a animação; a distribuição seguinte e as decisões estratégicas continuam a depender do jogador. As cartas/resultados pagos permanecem até à preparação explícita da próxima aposta.
- Reload durante/após liquidação não aplica novamente crédito. Saltar animação converge ao mesmo estado contabilístico.

Pipeline atualizada: a UI projeta os eventos confirmados um a um. A carta do jogador é legível e o total atualiza imediatamente; a mão permanece visível antes de virar a hole card e animar as compras do dealer. O saldo de retorno não é mostrado antes da liquidação visual. Saltar termina a apresentação do mesmo resultado, sem executar comandos novos.

Seletor ornamental com 0,20/0,50/1/5/10/25/50/100/500 créditos, sem valores repetidos abaixo das fichas. Botões inspirados no verso bordô/dourado com acentos distintos por ação. Logótipo centrado substitui o bloco de título/frase. O saldo fica ao lado das fichas, com Manrope local; Cormorant Garamond no branding, ambos WOFF2 latinos com licenças OFL incluídas (cerca de 62,5 kB no total).

Validações: TypeScript e build standalone/SDK; 25 testes de motores/carteiras/denominações/apresentação; suite de 34 testes browser desktop/mobile incluindo entrada no + sem aposta, colocação pela zona do lugar, foco e undo/reset independentes, troca de denominação, quatro mãos divididas, seguro independente, nova carta/21 antes da revelação e compras do dealer, valores novos em fichas reais, logótipo centrado, saldo lateral e carregamento da fonte. Os cenários forçados usam uma fixture standalone sem carteira externa.

As capturas locais foram revistas em 1440×1000 e 390×844. O perfil de desempenho anterior a esta revisão está conservado como baseline, não certifica a versão visual nova nem 60 FPS. A nova apresentação mantém redução de movimento e controlo de som.
