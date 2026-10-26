# Cardoso Road — Fuga ao Óleo

Jogo integrado na carteira Djabucoin do casino. Dez passos, quatro dificuldades, levantamento após o primeiro sucesso e pagamento automático na meta. A pré-visualização isolada usa créditos demo; na app, as apostas descontam o saldo partilhado e os ganhos regressam à mesma carteira.

## Executar e validar

A partir desta pasta: `npm.cmd run dev`, abrir http://127.0.0.1:5178. A entrada é uma preview apenas do quadro e do jogo, sem cabeçalhos, menus ou carteira do website. [game.html](./game.html) é o conteúdo do quadro, não uma página do website.

`npm.cmd test` valida matemática, transições, progressão visual, vilões e reprodução de vozes. `npm.cmd run test:ui`, `npm.cmd run test:enemies`, `npm.cmd run test:embed`, `npm.cmd run test:voices` e `npm.cmd run test:progression` exigem Playwright instalado na raiz e Microsoft Edge disponível. Os testes de browser bloqueiam pedidos externos. `npm.cmd run test:docs` executa-se na raiz do repositório.

O catálogo monta o jogo dentro da área do casino com carteira Djabucoin partilhada. A pré-visualização isolada continua a usar créditos demo. O build de frontend importa [o empacotador](./build-cardoso.mjs), que copia apenas ficheiros públicos para assets/games/cardoso-road. Publicar a partir da raiz: `npm.cmd run deploy:frontend`. A publicação completa de 26/10/2026 consta do [relatório final](../../docs/reports/casino-cardoso-reset-2026-10-26.md).

## Quadro e preview

[mountCardoso](./mount.mjs) é o componente usado tanto pela preview como pela app. Cria o iframe, carrega [game.html](./game.html), aguarda a mensagem de recursos prontos, e expõe `ready`, `canLeave`, `refreshBalance` e `destroy`. A mensagem valida origem e janela emissora. A demonstração pode ser fechada durante uma ronda porque a recupera localmente.

[host.css](./host.css) usa a mesma fórmula de altura do quadro existente: `clamp(160px, 100dvh - cabeçalho - toolbar - navegação inferior - 24px, 780px)`. Na app, as três medidas são as custom properties já alimentadas pelos ResizeObservers do casino. A preview usa os valores de referência de 80/70/0 px, com 60 px reservados à navegação inferior em ecrãs estreitos. Esse espaço fica vazio na preview: o website não é reproduzido.

[embed.css](./embed.css) distribui a altura finita entre identificação do jogo/saldo fictício, cenário flexível, informação da ronda, barra de apostas e estado/menu. No mobile, a dificuldade e os detalhes secundários ficam no menu; aposta, risco, CASH OUT e GO permanecem no quadro. A posição da dificuldade acompanha alterações da largura do iframe, não a janela exterior. Em alturas extremas de landscape, a deslocação vertical fica no interior do quadro para preservar alvos táteis; não se esconde conteúdo cortado. Os resultados visuais usam o tamanho efetivo do cenário.

O teste de embedding verifica 1440×900, 1024×768, 768×1024, 390×844, 320×740 e 844×390, além de redimensionar apenas o quadro para 640×540. Valida ausência de elementos do website, contenção, menu, levantamento e vitória mobile. A integração foi verificada localmente com o componente partilhado, sem abrir a app autenticada ou consultar dados reais.

## Matemática e persistência

[Motor](./engine.mjs): p = 0,95 / 0,88 / 0,75 / 0,60; M(n) = 0,97 / pⁿ. Contabilidade em cêntimos inteiros; pagamento bruto arredondado para baixo. A prévia mostra o valor efetivo, enquanto o multiplicador é mostrado a duas casas. O teste percorre todas as apostas permitidas (100–10000 cêntimos) e todos os passos; RTP efetivo entre 96,05% e 97%. Limites e valores rápidos pertencem à configuração demo, não constituem limites de um casino real.

Web Crypto gera os resultados. A ronda e as últimas 50 liquidações ficam no armazenamento local, com escrita do novo estado antes da apresentação. Web Locks impede duas instâncias ativas do mesmo browser. Um erro ao guardar não altera o saldo em memória. Os dados locais são editáveis e não servem para dinheiro ou moeda real. Não existe prova verificável com seeds neste modo.

## Integração futura com carteira real

A integração Djabucoin descrita abaixo usa apenas moeda fictícia e resultados locais. Para uma carteira com dinheiro real, não ligar este motor cliente a operações de crédito. O serviço autoritativo deve fornecer configuração e limites certificados, saldo, ronda ativa e histórico. Implementar operações autenticadas `start(requestId, bet, difficulty)`, `step(requestId, roundId, expectedStep)` e `cashout(requestId, roundId, expectedStep)`, com recibos idempotentes e transação atómica de aposta/estado/pagamento. O cliente deve recuperar a operação pendente pelo identificador após erro de rede, nunca repetir com um identificador novo. A conta, moeda e sessão devem vir da infraestrutura existente.

O servidor deve manter o RNG criptográfico, guardar resultados, rejeitar passos fora de ordem e publicar um protocolo auditado de compromisso/revelação de seeds antes de ativação. Considerar teto de prémio na validação inicial da aposta. Os efeitos visuais só consomem o estado confirmado. Certificação e requisitos regulamentares continuam pendentes; esta entrega não ativa apostas reais.

## Arte e limites desta versão

[Atlas de personagens](./assets/characters.png) gerado com a ferramenta integrada image_gen, a partir das referências fornecidas. Prompt final: «Remove ALL background, colored glow, shadow, gradients from this sprite atlas. Preserve both characters and exact left/right positions, complete bodies. Output true transparent alpha channel around both figures, no backdrop whatsoever. Crisp isolated game sprites.» O prompt inicial especificou Cardoso musculado com equipamento preto/verde ZERO ÓLEO e shaker, Sofia com vestido vermelho/rosa, ambos cartoon 3D, corpos completos em metades separadas.

O [cenário Canvas](./scene.mjs) apresenta um circuito contínuo de ginásio, com dez zonas de treino e uma janela de aproximadamente quatro etapas em desktop e telemóvel. A personagem ocupa até 440 px de altura e a câmara acompanha-a perto dos 30% da largura. Uma coluna JBL desenhada em Canvas acompanha o Cardoso: grelha, dois altifalantes RGB, pega, base móvel, reflexo de luz no chão e ondas sonoras. LEDs e vibração reagem ao relógio das batidas e aos eventos de progresso/levantamento/vitória. A dificuldade altera os efeitos cosméticos, sem mudar o motor.

A [progressão visual](./progression.mjs) distingue a posição 0, «PARTIDA», sem multiplicador ou inimigo, dos valores nas posições 1 a 10. Após n sucessos, o Cardoso ocupa o valor n e tenta ganhar o valor n+1. Tanto no sucesso como na derrota, desloca-se primeiro para a posição tentada e enfrenta aí o inimigo dessa etapa. O movimento demora 420 ms e o confronto 300 ms; a preferência de movimento reduzido resolve imediatamente a apresentação. Estes tempos nunca bloqueiam o CASH OUT nem alteram a liquidação já confirmada. Um levantamento durante o movimento preserva o confronto em curso, enquanto uma nova ronda repõe imediatamente a zona de partida. Depois de atualizar uma ronda perdida, recupera a posição tentada n+1 e o inimigo correspondente.

[Interior do ginásio](./assets/gym.png) gerado pela ferramenta integrada image_gen. Direção do prompt: ginásio arcade cartoon 3D, luzes LED turquesa/roxo/rosa/laranja, equipamentos grandes, espelhos, suplementos, chão de borracha reflexivo e espaço de circulação livre; sem pessoas, texto ou interface. O fundo é combinado com máquinas e obstáculos procedurais. Ver [recursos e prompts](./ASSETS.md).

A barra de apostas é uma linha compacta em desktop e um painel de duas linhas em mobile. Mantém o valor de pagamento efetivo no CASH OUT dourado, GO verde, risco por passo e seleção bloqueada durante a ronda. A dificuldade, quando não cabe na barra, e as opções secundárias ficam no menu do jogo. Dez indicadores acessíveis mostram o progresso. A Sofia só aparece depois de vencer a décima etapa. A celebração permanece visível; o resumo do prémio abre por ação explícita.

Personagens são sprites 2D renderizados com aparência 3D, não modelos articulados. O Cardoso usa [quatro poses com rosto mais realista](./assets/cardoso-poses-realistic.png), corrigido a partir da fotografia facial enviada: corrida A/B, contração de bíceps e susto. A Sofia mantém o atlas original. Não existe abraço articulado. O [áudio](./audio.mjs) usa uma faixa eletrónica original sintetizada com baixo, bombo, percussão e melodia, além de efeitos distintos de avanço, início, derrota, levantamento e vitória. Música, efeitos e vozes têm controlos independentes. As falas usam as oito gravações fornecidas pelo utilizador, não a síntese de voz do sistema. OGG originais preservados e alternativa PCM WAV gerada localmente para descodificadores incompatíveis. A publicação das representações requer a autorização das pessoas, conforme o briefing.

O [canal de vozes](./voices.mjs) toca uma gravação de cada vez, substitui falas antigas em novas ações, cancela carregamentos atrasados e interrompe a reprodução ao desligar vozes, silenciar ou esconder o jogo. A música reduz de intensidade durante a fala. Nenhuma reprodução é aguardada pelas transições de aposta, passo ou pagamento. Em falhas de carregamento/codec, o jogo continua com a mensagem textual. As vozes estão ligadas por defeito em instalações novas; preferências existentes são respeitadas. Alterar em Menu → Áudio e imagem → Vozes do Cardoso.

Mapeamento: início → uma chupadela de cada vez; passos bem-sucedidos → mais um PR, proteína pura, é só gains, isso não tem óleo, zero óleo (ciclo); derrota → fui frito; CASH OUT → grito de cashout; chegada à Sofia → zero óleo. Os avisos escritos da derrota continuam a identificar o inimigo da etapa.

`npm.cmd run prepare:voices` recria os WAV a partir dos OGG locais, usando apenas o descodificador do Edge. O [relatório de recursos](./reports/voice-assets.json) regista duração, canais e amostragem. A preparação não consulta serviços externos.

Manrope tem licença [OFL](./assets/Manrope-OFL.txt).

## Validação — 2026-10-26

Quinze testes locais aprovados: cinco do motor (40 multiplicadores, todas as apostas em cêntimos, falha no limiar, dez sucessos, levantamento, rejeição de repetição, recuperação e validação de aposta), um da geometria da câmara, três da progressão visual, dois da apresentação dos vilões e quatro do canal de vozes. O motor matemático não foi alterado nestas alterações de apresentação.

Browser Edge: 1440, 768, 390 e 320 px, sem overflow horizontal, com regras, teclado, painel expansível, levantamento e recuperação após reload. Testes percorrem dez sucessos nas quatro dificuldades, derrota e levantamento automático. Resultados deterministas são injetados apenas pelo runner de testes, nunca pelo jogo. Capturas locais em reports. Verificação visual de desktop e telemóvel realizada. Não foi medido FPS em aparelhos físicos nem verificada configuração cloud. Estes testes locais não confirmam publicação; ver o relatório final da integração.

Correção dos vilões: o [mapa de encontros](./enemies.mjs) associa um inimigo a cada etapa, incluindo o Boss do Óleo e o guarda final da zona VIP. A derrota utiliza o mesmo tipo, imagem e fala da etapa tentada; não existe uma segunda escolha aleatória do agressor. A animação desloca o inimigo do cenário até ao Cardoso, retirando a sua cópia da etapa e escondendo os outros inimigos para dar foco ao agressor. O recuo do Cardoso é limitado à largura disponível para manter o rosto dentro do ecrã no telemóvel. Após reload, recupera a mesma identidade a partir do número de passos da ronda guardada, sem alterar o formato do histórico. As quatro imagens independentes eliminam recortes que podiam incluir partes do inimigo vizinho no atlas. O início do treino aguarda o carregamento dos vilões; falhas de imagem mantêm uma representação procedural do tipo correto.

Validação específica de 26/10/2026: testes unitários verificam falhas em todas as 10 etapas das quatro dificuldades e o percurso da animação. O teste de browser específico força uma derrota em cada uma das 10 etapas, alternando desktop/mobile e movimento normal/reduzido, e compara a identidade do inimigo antes do passo, durante a derrota e após reload. Verifica também a fala correspondente, ausência de duplicação na etapa, saldo/histórico, erros de JavaScript e carregamento dos novos recursos.

Áudio — 26/10/2026: as oito gravações foram descodificadas localmente, com durações entre 1,39 e 3,03 segundos, mono a 48 kHz. No quadro mobile, o teste reproduz os oito OGG, repete a reprodução forçando a alternativa WAV, desliga vozes durante reprodução e simula carregamentos lentos para confirmar que o CASH OUT liquida antes da fala e que não entram falas antigas. Inclui recuperação do ciclo pagehide/pageshow. Isto verifica reprodução e eventos no browser; não substitui uma audição num iPhone ou Android físico. Não houve publicação.

Progressão — 26/10/2026: teste de browser em 1440, 390 e 320 px verifica a separação de uma etapa entre o Cardoso e o primeiro valor, deslocação antes do confronto, sucesso na posição 1, derrota na posição tentada 2, identidade do inimigo, recuperação após reload e reinício na posição 0. O CASH OUT permanece disponível durante o confronto de um passo bem-sucedido. A fórmula, RNG e pagamentos não foram alterados.

## Integração da carteira (26/10/2026)

`mountCardoso(container, wallet)` liga a iframe à carteira do casino. `cardosoAct` guarda a ronda completa e o saldo atomicamente, com recibo para repetir o mesmo pedido sem novo desconto ou prémio. A ronda é retomada no mesmo dispositivo; não migra os créditos da demonstração. O saldo usa centésimos de DJC e os pagamentos mantêm o RTP e arredondamento definidos no motor.

O fim da ronda e a saída confirmam os totais com `casinoSession`. Não há pedidos à cloud por passo. A edição do casino isola o progresso após resets. Testar a partir da raiz com `npm.cmd run test:casino:cardoso`.
