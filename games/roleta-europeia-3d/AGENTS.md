# Roleta

Preservar a variante REGRAS.md, catálogo canónico, ordem única da roda e sorteio uniforme. A animação nunca altera pagamentos. Não publicar nem alterar outro projeto. Verificar todos os 37 bolsos e contabilidade antes da entrega.

Acabamento pedido pelo utilizador: identidade Atelier bordô/dourado coerente com o blackjack, logótipo centrado, Manrope/Cormorant locais, saldo ao lado das nove fichas sem valores duplicados abaixo. Apostar diretamente no tapete, incluindo junções válidas; combinações acessíveis e vizinhos com cobertura/custo prévios. Foco numa aposta ou na mesa, desfazer e limpar no âmbito selecionado, dobrar/repetir atómicos.

Revisão de interface: abaixo do tapete ficam apenas fichas, saldo/exposição compactos e Reset, Desfazer, Repetir, Dobrar, Jogar. Sem timeline de fases, resumo de exposição, recibo de resultado ou barra de mensagens normal nessa zona. Reset limpa sempre toda a mesa, mesmo com aposta em foco, e Desfazer recupera a última alteração global. Combinações e vizinhos acessíveis em «Apostas» no topo. Resultados e retorno permanecem junto à roda; erros operacionais continuam visíveis. Cada posição tem uma ficha 3D com o total exato ali apostado (50+50=100), incluindo valores mistos; agregar novamente os retornos após a animação de pagamento.

Seletor de fichas numa única linha horizontal, utilizando a largura disponível com saldo ao lado. Em ecrãs estreitos, deslizar a linha dentro do seletor em vez de criar várias filas ou alargar a página.

Legibilidade: números grandes e de alto contraste nas fichas do seletor e do tapete, sem microtexto ornamental na face das fichas físicas. A face circular deve permanecer horizontal e acima do cilindro; não reutilizar a rotação Y do corpo como rotação Euler Y da face, pois inclina o disco e faz metade desaparecer no corpo. Texto das faces sempre orientado para leitura.

Fichas físicas Three.js instanciadas e derivadas dos montantes, nunca etiquetas fixas. Pipeline confirmada: fechar apostas → roda/bola → número no bolso correto → recolher só apostas perdidas → pagar stakes vencedoras + lucro → reabrir apostas. Sem botão «Confirmar resultado», sem spin automático nem anúncio/crédito visual antes da chegada da bola. Distinguir lucro, retorno parcial, ronda equilibrada e perda; não inventar push na roleta. Guardar/recuperar o mesmo resultado e ID de operação. Apenas créditos fictícios.
