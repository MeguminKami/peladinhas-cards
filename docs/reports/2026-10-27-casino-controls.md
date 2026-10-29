# Casino — controlos e apresentação

## Implementação

- Blackjack: Repetir e Dobrar aposta usam a última aposta confirmada do lugar, guardada neste navegador por utilizador. Alteram o rascunho; Pronto continua a confirmar a aposta. Reset desfaz a alteração. Ações com ícones, cores distintas e foco visível.
- Cardoso Road: pose de repouso antes de apostar e após cashout, câmara a 23% da largura, Espaço avança apenas numa ronda ativa. Logótipo e carteira pertencem à barra do website. Controlos de dificuldade, áudio, cashout automático, valores rápidos e ferramentas ficam no rodapé, sem Menu/Difícil.
- RIFT: versão `rift-4.16`, com arquivo 4.15 para retoma. Rift Link nunca seleciona Wilds. A proteção também é aplicada aos motores arquivados quando continuam uma partida; não reescreve resultados guardados.
- Futebol de Bairro: configuração 0.7.1, sticky do bónus superior de 12% para 18% (+50% relativo). O bónus normal mantém a regra sem sticky. O contador passa ao spin atual antes de iniciar a sua animação. Restauro de snapshots 0.7.0 conserva saldo e RNG. O servidor aceita recibos 0.7.0 pendentes e rejeita vers?es desconhecidas.
- Capas do catálogo usam URLs resolvidos a partir do módulo e carregamento imediato. A loja apresenta mensagem legível em vez de `internal`.

As alterações probabilísticas não incluem nova medição de RTP. Não é necessário recalcular dados existentes nem alterar semanas fechadas.

## Arte do repouso

Asset: [cardoso-relax-v1.png](../../games/cardoso-road/assets/cardoso-relax-v1.png). PNG transparente gerado com ImageGen a partir da referência local `cardoso-poses-realistic.png`.

Direção/prompt: personagem Cardoso musculado, pele bronzeada, cabelo escuro encaracolado e barba curta, óculos de sol pretos; camisola sem mangas e calções pretos com detalhes verde-lima, luvas e ténis a condizer. Reclinado descontraído numa espreguiçadeira de estrutura escura e acabamento verde-lima, cabeça à esquerda, pés à direita, shaker de proteína na mão. Ilustração realista estilizada coerente com o jogo. Corpo e cadeira completos, fundo transparente, sem texto, logótipos ou interface.

## Validação local em 27/10/2026

Testes com fixtures, sem Firestore ou Storage reais: carteira e retoma Cardoso, cashout idempotente, derrota, Espaço, 1440/768/390/320 px; Blackjack multiplayer e controlos; proteção Wild dos três bónus RIFT; testes do motor Futebol e migração; contador 9/10 em repouso e 10/10 durante o último spin. Capturas em `test-results`.

Consulta cloud separada e expressamente autorizada: 30 registos recentes de `getCasinoShop`/`casinoSession`; não continham erro e mostravam respostas HTTP 200/204 da loja. Não confirma a causa do erro antigo nem o comportamento atual dos dados reais. Nenhuma função foi executada para diagnóstico.

## Publicação

Frontend: `npm.cmd run deploy:frontend`.

A versão partilhada em `js/casino-economy.js` também exige publicar os seus consumidores: `getCasinoWallet`, `settleCasinoSlot`, `casinoSession`, `onCasinoGame`, `grantCasinoCoins`, `blackjackAction`, `blackjackSweep`, `getCasinoShop`, `buyCasinoCard`, todos na codebase `peladinhas`. Publicar o servidor antes do frontend. Este relatório não indica deploy executado.

## Revisão de 27/10/2026 — PC e contador de todos os spins

O Blackjack inclui tratamento de desktop: controlos distribuem a largura disponível, fonte local Atelier Manrope, ações numa fila a 1440 px e separação do saldo/fichas. A adaptação móvel não substitui a composição de PC.

O contador de Futebol de Bairro atualiza agora no callback `onReelsStart`, depois de os rolos entrarem no estado `reeling`; não é antecipado pela preparação do resultado. Isto aplica-se a todos os spins, incluindo o primeiro após entrada no bónus e após retrigger. A legenda constante «SPIN / TOTAL» identifica o spin apresentado; entre jogadas conserva o último valor. Teste de browser observa as mutações do contador e exige que os rolos já estejam a rodar em cada avanço, nos spins 1, 2, 5, 9 e 10. Estas correções adicionais só exigem publicação do frontend.

## Áudios de inimigos — 27/10/2026

Os ficheiros fornecidos `unlearnthematrix.ogg` e `maluco.ogg` estão em `games/cardoso-road/assets/audio/` e juntam-se às cinco falas anteriores nos eventos `step` de sucesso. A seleção é aleatória, com probabilidade igual para cada uma das sete opções (1/7 quando todas estão ativas), permitindo repetições consecutivas, respeitando Vozes do Cardoso e Efeitos sonoros; reproduz uma de cada vez. Mantêm o canal único, volume geral, opção Efeitos sonoros e redução temporária da música; não se sobrepõem a feedback posterior. Cashout e vitória final conservam `win_1`. Teste do canal cobre as cinco falas antigas, os dois áudios novos e interrupção; browser descodifica os dois OGG locais. Publicação apenas frontend.

## Repouso após derrota e entrada — 27/10/2026

A derrota regressa à partida e à espreguiçadeira após a animação (420 ms de avanço, 300 ms de confronto e 400 ms de resultado). Com movimento reduzido, regressa imediatamente. O progresso visual volta a zero; a ronda perdida, a aposta e o histórico permanecem guardados. Uma nova aposta cancela o retorno pendente para este não interromper a nova ronda.

Entrar sem ronda ativa, incluindo reabrir uma derrota, cashout ou vitória concluída, mostra repouso. Uma ronda já apostada continua a ser retomada com a sua posição e contabilidade. `tests/casino-cardoso.mjs` verifica a entrada, regresso após derrota e reabertura com saldo preservado; `--motion` repete com a animação ativa. Publicação apenas frontend.

## Intervalo de avanço e rodapé — 27/10/2026

O botão Avançar e a tecla Espaço partilham um bloqueio de 500 ms, contado após a confirmação de cada passo. A ação também verifica o bloqueio, protegendo contra cliques sintéticos ou teclado rápido. O envio pendente continua protegido pelo estado ocupado e pela idempotência existente.

Foram removidos o cashout automático, o grupo Valores rápidos e a linha de mensagens de fala, incluindo o texto após apostar. Os atalhos MIN/½/2×/MAX do campo de aposta continuam disponíveis. O teste de browser confirma que os elementos deixaram de existir, bloqueia um clique e um Espaço imediatos após avançar e verifica que o botão volta a ficar disponível. A composição foi verificada em quatro larguras, com e sem movimento reduzido. Publicação apenas frontend.
