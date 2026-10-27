# Blackjack — estabilidade e movimento

## Alterações de 27/10/2026

- Mesa, ações e fichas partilham uma superfície contínua, sem painéis interiores concorrentes.
- O espaço das ações fica reservado em aposta, distribuição, decisão, confirmação pendente, espera e resultado. As mãos são desenhadas acima dos avatares, sem os empurrar para baixo.
- «Centrar jogo» dimensiona o iframe incluindo o seletor de fichas, saldo e aposta, entre as barras do website. O enquadramento adapta a perspetiva da mesa à proporção disponível no multiplayer.
- A reconciliação do DOM preserva cartas, fichas, avatares e controlos existentes em vez de os recriar a cada snapshot. Atualizações de presença/saldo não repetem a distribuição.
- As atualizações de ronda são processadas em sequência; uma carta em movimento termina antes de apresentar os eventos seguintes. A abertura da carta fechada usa rotação em perspetiva. A distribuição usa 340 ms por voo, uma pausa de 40 ms e 180 ms após uma mão terminal; a carta fechada abre em 300 ms. Movimento reduzido conserva a apresentação imediata.
- As fichas 3D mantêm as malhas quando os montantes não mudam, atualizando apenas a posição. Nenhuma regra, reserva, pagamento ou pedido cloud adicional foi introduzido.

## Verificação local

`npm.cmd run test:casino:blackjack` prepara os SDKs, verifica a cópia do motor do servidor, executa testes do motor/contabilidade e dois testes de browser com servidores de fixtures próprios (8093 e 8096). Estes bloqueiam fontes externas; não consultam Firebase real.

O teste `tests/blackjack-live-layout.mjs` verifica geometria constante da mesa, ações, fichas e avatar entre estados, retenção dos nós e quatro voos completos sem cancelamento ao receber atualizações durante a distribuição. Verifica ainda o website a 1440×720, 768×900, 390×844 e 320×844, incluindo «Centrar jogo». Capturas em `test-results/blackjack/centered-*.png` e `live-stable-*.png`.

Os resultados locais não medem a latência de produção nem garantem uma frequência de frames num dispositivo real. Não foi efetuado deploy no âmbito desta revisão. Publicação apenas frontend: `npm.cmd run deploy:frontend`.
