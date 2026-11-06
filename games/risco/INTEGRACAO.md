# Integração no casino

Mesmo percurso da Princesa Sofia: iframe de mesma origem, host no site e carteira IndexedDB partilhada. Não acrescenta saldo ao casino nem modifica Functions.

O motor recebe apostas em DJC inteiros e arredonda o pagamento para DJC inteiros. O adapter converte débito e crédito para os centésimos da carteira multiplicando por 100. O saldo público e data-casino-balance mantêm as unidades da carteira, só o texto divide por 100. Frações de saldo anteriores são preservadas.

## Build e protocolo

[build-casino-risco.mjs](../../scripts/build-casino-risco.mjs), incluído em `npm.cmd run build:casino`, copia game.html, ui, src e tabelas para assets/games/risco. Fontes de arte, promo, relatórios e fotografias ficam de fora.

A thumbnail própria [casino-thumbnail.webp](ui/art/casino-thumbnail.webp), com o LCD aprovado e formato 800×1200, é copiada pela mesma build para assets/casino/covers/risco.webp. O catálogo identifica a modalidade como «CRASH · CASHOUT».

O host mede a posição real do iframe e preenche o espaço até ao fundo visível, descontando a navegação inferior. Acompanha alterações da barra do casino, avisos de ronda pendente, tamanho da janela e visualViewport. Remove os observadores ao fechar o jogo. Assim o botão de cashout fica dentro do ecrã sem depender de uma altura genérica das mesas.

[casino-risco-host.js](../../js/casino-risco-host.js) valida origem, source e canal `risco:v1`. Aceita `connect`, `start`, `poll`, `cashout`, com UUID. Start leva sessionId, expectedRevision, betUnits e autoCashoutCents. Cashout leva sessionId e roundId, nunca o multiplicador a pagar.

[casino-risco-local.js](../../js/casino-risco-local.js) gera seed com crypto.getRandomValues, fixa crash e compromisso e define início cinco segundos no futuro. A [carteira](../../js/casino-local-wallet.js) debita, guarda recibos e liquida com gravação durável. O iframe recebe só publicRound. O manual usa o relógio do host quando é processado na carteira serializada.

Polls não gravam a passagem do tempo, só fronteiras de liquidação e revelação. Auto sai exatamente ao alvo, mesmo se o poll chegar depois do crash ou de recarregar. A ronda conserva seed, início, aposta e alvo. Crédito e movimento «RISCO» são aplicados uma vez. Os totais seguem o checkpoint existente de 15 rondas.

Enquanto a aposta não está liquidada, o casino impede sair ou abrir outro jogo. Após cashout pode sair, com a ronda a continuar. Reabrir recupera o estado público e revela o resultado apenas no fim.

## Confiança e falhas

O modelo local tem as mesmas limitações da Sofia: um jogador com ferramentas do browser pode inspecionar host e IndexedDB. Não é autoridade protegida no servidor. Uma migração exigiria plano e autorização antes de mexer em Functions.

Perda de resposta repete o mesmo UUID, sem segundo débito ou crédito. Falha de gravação é recuperável, não uma recusa definitiva. `wallet=host` exige parentOrigin igual à origem e iframe real. Parâmetros demo são ignorados nesse percurso.

Testar com fixtures, sem abrir o casino real ou consultar Firebase sem autorização. O iframe ocupa o espaço disponível sob o menu, com HUD HTML fora do Canvas. Áudio desbloqueia por gesto, controlos separados e ducking em crash/cashout.

## Verificação integrada

Na raiz, `npm.cmd run test:casino:risco` prepara a build e executa os testes do motor, da carteira e do casino completo. O [teste integrado](../../tests/casino-risco-integrated.mjs) abre o catálogo real com auth e dados substituídos por fixtures locais. Verifica thumbnail, 1920×1080, 1366×768, 768×1024, 390×844 e 320×740, botão dentro do ecrã, saldo no cabeçalho, débito/prémio únicos, bloqueio de saída e recuperação após reload. Não consulta Firebase real.
