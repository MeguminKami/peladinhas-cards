# Rotação e paragem contínuas

Correção de apresentação: removido o ajuste rápido que surgia ao parar, sobretudo com Scatters. Não altera o motor, prémios, RNG ou configuração 0.5.0.

Antes, a faixa tinha de percorrer quatro a nove células num intervalo fixo de 70–900 ms, começando com uma velocidade diferente da rotação. Além disso, o enquadramento do símbolo móvel diferia do enquadramento estático e existia um movimento adicional ao revelar a célula final.

Agora:

- Mantêm-se os mesmos elementos visíveis e a sua posição quando o resultado final entra na faixa; só são removidas células totalmente fora da janela.
- A duração é calculada pela distância real a percorrer e pela velocidade atual. A velocidade inicial da paragem coincide com a da rotação; depois diminui continuamente até zero, sem aceleração para acertar o destino.
- A curva normal é quadrática; o suspense usa uma curva cúbica com cauda mais longa. Não se muda abruptamente o playback rate ao entrar em suspense.
- As colunas normais param em paralelo, com finais ordenados. O suspense aguarda os Scatters anteriores assentarem antes de iluminar e desacelerar a próxima coluna.
- A célula final usa as mesmas dimensões, bordas e escala da arte que a célula estática. A passagem para o tabuleiro espera pelo fim real da animação, não por um temporizador aproximado.
- Removido o salto vertical e o redimensionamento de chegada. O Scatter recebe um brilho independente, sem mudar de posição.
- Nos bónus o suspense procura o terceiro Scatter; no jogo base pode continuar a procurar o quarto. Nas compras respeita três ou quatro conforme o modo.
- Mantidos os sprites reduzidos da rotação, movimento reduzido e a possibilidade de CONCLUIR sem alterar resultados.

Implementação: `web/reel-motion.ts`, `web/presentation.ts` e `web/animation-v2.css`.

Testes verificam continuidade de velocidade, desaceleração monotónica, preservação da posição dos elementos visíveis, ordem dos finais e correspondência geométrica no browser, nas três velocidades. Também cobrem suspense, compra e cancelamento sem mudança do estado matemático.
