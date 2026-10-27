# Blackjack e roleta — feedback de 2026-10-27

[Procedimento e publicação](../guides/blackjack-multiplayer.md)

## Alterações

- Uma pessoa pode ocupar vários lugares livres, selecionar cada avatar para apostar e decidir por lugar. O servidor protege a ocupação concorrente, soma débitos/retornos na mesma carteira e renova a presença de todos os lugares. Reentrar não reclama lugares extra; sair abrange todos os seus lugares.
- Distribuição sequencial com movimento de 320 ms, pausa curta e som procedural de papel. A projeção dos eventos pode continuar a partir de uma carta já apresentada quando chegam novas decisões. O botão Ver mesa permite terminar a apresentação imediatamente; movimento reduzido não cria esperas.
- Total do dealer abaixo das cartas, com fundo escuro, contorno dourado e algarismos tabulares; a carta fechada continua escondida.
- Reset azul, Limpar vermelho e Pronto verde, com rótulos, foco e estados desativados.

## Verificação local

Os testes de estado cobrem cinco pessoas e vários lugares do mesmo dono, rejeição de seguro/decisões de outro dono, confirmação repetida, fundos insuficientes, saídas e presença. Um teste de transações no Firestore Emulator verifica ocupações simultâneas e pagamentos de vários lugares na mesma carteira. A sequência de apresentação tem um teste específico para atualizações recebidas a meio da distribuição.

O teste de browser inclui cinco páginas em simultâneo, uma segunda ronda com dois lugares do mesmo dono, 1440/768/390/320 px, cores distintas, posição/tamanho do total do dealer e criação das fontes Web Audio de papel. A criação das fontes foi verificada automaticamente; a qualidade subjetiva do som não foi avaliada por audição humana.

## Roleta

O motor já sorteia o número e a animação termina no bolso correspondente. Não foi alterada a matemática nem a trajetória da roleta. O teste `node tests/roulette-alignment.mjs` usa a cena original, captura as posições reais dos números desenhados na textura e compara-as com a bola em todos os 37 números e quatro rotações: **148 verificações**. A tolerância angular de 0,000001 rad contempla a precisão da matriz Canvas, muito inferior à largura de um bolso. Foram capturados os resultados 0, 17, 32 e 36 para inspeção. Os testes existentes também verificam trajetória e contabilidade para todos os resultados.

Capturas e resultados ficam em `test-results/blackjack` e `test-results/roulette-alignment`. Não houve consultas ao Firebase/Storage reais nem publicação. Publicar as funções `blackjackAction` e `blackjackSweep`, que importam o modelo partilhado, e o frontend; não foram alteradas regras nem índices neste feedback.
