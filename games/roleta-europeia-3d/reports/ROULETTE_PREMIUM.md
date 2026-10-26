# Roleta premium — 26 de outubro de 2026

Revisão de legibilidade e pagamentos: [auditoria detalhada](ROULETTE_PAYOUT_AUDIT.md). Faces 3D horizontais, números maiores e alto contraste; 33.226 liquidações exatas adicionais e 10 testes de browser nos dois viewports. A suite lógica global tem agora 31 testes, dos quais 11 pertencem à roleta individual. Pagamentos preservados e verificados.

O acabamento e os comportamentos aprovados no blackjack foram adaptados à roleta, preservando o seu contrato próprio: 37 casas, um zero, ordem europeia, 157 coberturas canónicas e tabela de pagamentos integral. Sem la partage/en prison, sem push, sem regras ou lugares de blackjack.

- Logótipo próprio centrado, botões bordô/dourado, Manrope/Cormorant locais com licenças OFL e saldo junto às fichas, sem legendas de valor repetidas.
- Fichas selecionáveis 0,20/0,50/1/5/10/25/50/100/500. Passo 0,10 (`EU-STAKES-10-2`) para aceitar 0,50 sem arredondamento, mantendo mínimo 0,20 e os mesmos limites máximos.
- Fichas Three.js de volume real, instanciadas pelo montante. Cada posição mostra uma ficha com o total exato da aposta, incluindo valores mistos: 50 + 50 = 100; acrescentar 0,50 passa a 100,50. As fichas entregues na animação são agregadas no retorno final. Texturas derivadas do valor e libertadas quando deixam de ser usadas. Sem cap visual que altere prémios. Fallback identificado se WebGL não estiver disponível.
- Apostas diretas em números, externas e junções válidas; pré-visualização da cobertura; seletor acessível alternativo para combinações e vizinhos. Em mobile o tapete desliza dentro do seu espaço, sem alargar a página.
- Fichas e controlos integrados diretamente abaixo do tapete, sem timeline, resumo de exposição, recibo ou barra normal de mensagens. Reset limpa toda a mesa independentemente do foco; Desfazer recupera a última alteração global, incluindo Reset. Repetir/Dobrar são atómicos e Jogar inicia a ronda. Combinações/vizinhos estão em «Apostas» no topo; mensagens de resultado e retorno junto à roda, com erros operacionais visíveis.
- Sequência explícita: fechar apostas e confirmar operação → roda/bola → número no bolso certo → recolher perdas → acrescentar lucro às stakes vencedoras → reabrir apostas. Sem «Confirmar resultado» nem spin automático. O saldo visual retém o crédito até ao pagamento.
- Sons acompanham a passagem da bola, recolha/pagamento e tipo de resultado. Pleno vencedor, vitória, retorno parcial, ronda equilibrada e perdas são distinguidos sem confundir retorno com lucro.
- Reload, skip e recuperação de timeout preservam o número, RNG e ID da operação. O teste de carteira aplica a operação e falha a resposta; repetir o mesmo ID credita uma só vez.

Validação: TypeScript e build standalone/SDK; 28 testes de lógica/carteiras/apresentação na suite global; 44 testes browser desktop/mobile. Inclui todos os 37 bolsos em três ângulos e dois viewports, fichas em movimento, pagamento automático, cobertura/denominações, foco/undo, insuficiência de saldo sem duplicação parcial, número oculto antes da chegada, retorno parcial e resize durante a recolha. O blackjack continua coberto pela mesma suite de regressão.

Revisão dos controlos e totais: 20 cenários específicos de browser em desktop/mobile verificados, com repetição dos cenários afetados pela última afinação. Incluem Reset com várias apostas/em foco e após pagamento, desfazer o Reset, inscrição 100,50, uma ficha por posição, timeout de carteira e combinações no diálogo. A observação de recolha usa frames do browser para não perder a fase curta entre consultas espaçadas. Novo check e build standalone/SDK concluídos; matemática e RNG preservados.

Matemática: enumeração das 157 apostas nos 37 resultados também com stake 0,50 (5809 liquidações exatas), todas com retorno médio 36/37. Nova simulação: 100000 rondas em cada uma de três seeds, 300000 no total, aposta fixa no vermelho. Retornos observados 97,212%, 97,526% e 97,436%; IC95% e distribuição por número no JSON. Sem ajustar probabilidades.

O perfil headless anterior é apenas baseline; não certifica 60 FPS da apresentação nova. Falta validação CPU/GPU/memória no dispositivo físico final e integração com backend real do website. Nenhuma publicação externa foi feita. Assets originais procedurais/vetoriais e fontes locais com licença incluída.
