# Casino e Djabucoin

[Documentação](../README.md) · [Desenvolvimento](development.md) · [Publicação](deployment.md)

O casino está em `#/casino`; `/casino` redireciona para essa rota. O convite aparece no início, imediatamente abaixo do pódio. A entrada exige uma conta ativa. Os cinco jogos usam as fontes de `games` e a mesma carteira.

No telemóvel, blackjack e roleta usam as mesmas fichas selecionáveis do computador, sem dropdown. Em retrato, os nove valores ficam visíveis em duas filas. Abrir o chat não ativa o campo de mensagem; o teclado só é solicitado ao tocar nesse campo.

## Economia e reinício

A edição `official-2026-10-27-reset-200` inicia cada carteira com **200 DJC**. O reinício é aplicado atomicamente no primeiro acesso à carteira, recompensa ou envio administrativo depois da publicação do servidor. Não exige percorrer a base de dados. Carteiras da edição atual conservam o saldo. Sessões e snapshots anteriores ficam isolados pela versão, sem recuperar saldos de teste.

Cada peladinha que passa a `closed` atribui entre **20 e 200 DJC** a cada participante, incluindo suplentes:

| Componente | Moedas |
| --- | --- |
| Participação | 50 |
| Vitória / empate / derrota | +40 / +15 / +0 |
| Diferença de golos da equipa | 6 por golo, limitada entre −30 e +30 |
| Golo do jogador | +15 |
| Assistência do jogador | +10 |
| Total | limitado entre 20 e 200 |

Exemplos: derrota por cinco sem contribuições = 20; empate sem contribuições = 65; vitória por cinco com quatro golos e duas assistências = 200. O servidor usa resultado e `performance` do jogo fechado. O recibo `matchAwards/{gid}` impede duplicações; reaberturas não voltam a pagar. Correções posteriores não recalculam prémios. Não existe backfill nem alteração de semanas fechadas.

Em Administração → Jogadores, **Moedas** permite adicionar de 0 a 10 000 DJC, incluindo ao próprio administrador. O servidor verifica o perfil e o destinatário. O identificador do envio e o recibo impedem duplicações. O diálogo conserva o pedido pendente para recuperar respostas perdidas. Não são transferências entre jogadores.

O popup **Moedas** consulta o saldo apenas quando é aberto, pela callable administrativa `getCasinoPlayerBalance`. Não há consultas de carteiras na lista de jogadores nem atualização automática. A consulta é apenas leitura e usa três documentos: política global, perfil do administrador e carteira do destinatário. Detalhes e testes no [relatório de saldo administrativo](../reports/admin-casino-balance-2026-10-27.md).

100 unidades inteiras = 1 DJC. Aposta mínima da slot: 0,20 DJC. Não existe dinheiro real, depósito ou levantamento.

## Sincronização

- Cada jogada é primeiro guardada atomicamente em IndexedDB, com saldo, RNG/progresso e recibo local.
- A entrada no casino consulta o saldo do utilizador. Entrar em qualquer jogo confirma primeiro os lotes pendentes e obtém o saldo comum atualizado antes de montar o SDK. Se essa consulta falhar, o jogo apresenta erro e permite tentar novamente; não abre com um saldo antigo como alternativa.
- As slots confirmam os totais após **15 spins normais**, sem confirmar a meio de um bónus. O fim de um bónus confirma o resultado completo, incluindo retriggers.
- O Blackjack abre agora uma [mesa pública multiplayer](blackjack-multiplayer.md): apostas reservadas online, decisões validadas no servidor e pagamentos atómicos por jogador. Rondas locais antigas podem terminar pelo adaptador anterior. A Roleta usa uma mesa partilhada e liquidação autoritativa no servidor.
- Sair do jogo, navegar, ocultar a página, logout e recuperação de entrada também tentam guardar alterações pendentes. Não existe polling nem gravação por temporizador.
- Cada dispositivo abre uma sessão independente. Não existe bloqueio global por dispositivo. Na mesma origem, a proteção entre abas impede alterações simultâneas ao mesmo snapshot.
- Os jogos com checkpoints usam o saldo comum completo do utilizador, sem parcelas nem distribuição manual. O Blackjack multiplayer reserva cada aposta no servidor antes de distribuir.
- Checkpoints concorrentes são serializados pela transação Firestore e nunca tornam o saldo confirmado negativo. Se outro dispositivo tiver consumido o saldo necessário para confirmar um lote, o servidor recusa esse lote sem o alterar. O pedido exato permanece guardado e novas apostas nessa sessão param até recuperar a confirmação. Depois de haver saldo suficiente, repetir o pedido confirma-o uma única vez.
- Com checkpoints por lotes, dispositivos podem iniciar apostas usando o mesmo saldo anterior à atualização. Este modelo impede saldo negativo no Firebase, mas não garante prevenção de todo o gasto local concorrente. Para garantir esse limite antes de cada aposta seria necessário validar cada aposta online ou reservar fundos; nenhuma dessas opções faz parte do fluxo pedido.
- Cada confirmação leva sequência e totais acumulados de débitos e prémios. O servidor aplica apenas a diferença em transação, preservando recompensas e envios administrativos concorrentes.
- Respostas perdidas conservam exatamente o pedido até recuperação. Não apagar IndexedDB ou pedidos pendentes para resolver erros.
- Falhas de rede não provocam tentativas em todos os spins: uma nova tentativa automática por quantidade só acontece após outros 15 spins normais. Fim de bónus, fim de ronda, atualização manual e entrada são também pontos de recuperação. Não existe repetição infinita por temporizador.

Nos jogos com checkpoints, o estado fica no navegador: o servidor verifica identidade, sequência e contabilidade, sem provar a origem do resultado. No Blackjack multiplayer, o servidor controla também o motor, o baralho privado, os turnos e os resultados. As regras negam acesso direto a carteiras e recibos, incluindo por administradores.

## Roleta multiplayer e chat

No casino do website, todos entram na mesma sala online, mesmo quando só há uma pessoa. A aposta é debitada no servidor; o número é sorteado com `node:crypto` e o retorno de todos os participantes é aplicado atomicamente nas respetivas carteiras. A animação do browser apenas apresenta o resultado confirmado pelo servidor. Sem ligação, não há sorteio offline nem prémio local: a operação pendente conserva o identificador para recuperação.

Com uma pessoa ativa, cada aposta resolve imediatamente. Com várias, a primeira aposta abre uma janela comum de **30 segundos**; a ronda resolve antes se todos os jogadores ativos apostarem, ou no prazo pelo cliente/sweep. Assim que a ronda resolve, a mesa volta imediatamente a «apostas abertas» e limpa as apostas ativas; o resultado fica no documento apenas para ser animado (15 segundos de validade no cliente) e quem entra mais tarde não repete resultados antigos. As fichas dos outros jogadores aparecem no tapete com a cor e o valor de cada um, e o pedido de aposta repetido devolve o `roundId` original. Uma presença expira após 75 segundos; browsers visíveis enviam heartbeat a cada 30 segundos. A mesa aceita até 12 jogadores.

O separador **Chat** subscreve mensagens apenas enquanto está aberto. Mostra o nome e a mensagem, sem horário; as próprias ficam à direita, as restantes à esquerda, com uma cor atribuída pelo servidor a cada jogador. O texto tem até 180 caracteres e o servidor limita cada jogador a uma mensagem por segundo. A consulta apresenta as 100 mensagens mais recentes dos últimos 30 minutos; a interface também remove mensagens expiradas enquanto está aberta. O TTL do Firestore elimina os documentos mais tarde, de forma assíncrona.

### Leituras Firestore estimadas

As contagens seguintes são leituras dos documentos da mesa, não uma fatura total. Uma entrada lê o documento privado da sala e a carteira do jogador (2); um heartbeat lê a sala (1); uma aposta individual lê a sala e a carteira (2). A liquidação de uma ronda partilhada lê a sala e as carteiras de quem apostou, até 13 documentos no máximo. Quem recebe o resultado pelo listener e não pela resposta da aposta consulta depois o saldo (sala + carteira, 2 leituras); a resposta da própria aposta já traz o saldo quando disponível. O cliente também lê o documento público ao subscrever e em cada atualização.

Os heartbeats atualizam o documento público, pelo que cada escrita é entregue a cada listener. Com 12 jogadores visíveis e 12 listeners, o ritmo máximo normal de heartbeat representa aproximadamente **24 leituras transacionais + 288 entregas a listeners + 1 leitura do sweep a cada 5 minutos**, cerca de **18 730 leituras por hora** ou **449 570 por dia**. Com apenas uma pessoa, a mesma presença e o sweep representam cerca de 4 leituras por minuto (250 por hora). Estes valores excluem autenticação/políticas das callables, entradas, apostas/liquidações, confirmações de saldo, chat, reconexões e leituras das regras; não são uma estimativa do consumo total.

Cada envio de chat lê a sala e o documento de idempotência da mensagem; cada listener do chat recebe uma leitura por nova mensagem. Abrir o separador lê até 100 mensagens. `rouletteSweep` consulta um documento fixo a cada 5 minutos mesmo quando não há ronda, isto é, **288 leituras por dia**; sem clientes ligados, uma ronda vencida resolve nessa passagem, além da execução agendada. O modo multiplayer não é polling de jogo: as atualizações chegam por listeners Firestore.

## Código e publicação

[casino-economy.js](../../js/casino-economy.js) contém a edição e as recompensas; [casino-session-model.js](../../js/casino-session-model.js) define as confirmações; [casino-local-wallet.js](../../js/casino-local-wallet.js) guarda o progresso e agenda checkpoints. As funções ficam em [functions/casino.js](../../functions/casino.js).

Alterar estes cálculos exige publicar todos os consumidores: `getCasinoWallet`, `settleCasinoSlot`, `casinoSession`, `onCasinoGame`, `grantCasinoCoins`, `blackjackAction`, `blackjackSweep`, `getCasinoShop` e `buyCasinoCard`, além do frontend. O endpoint antigo por spin rejeita novas operações nas carteiras oficiais.

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:getCasinoWallet,functions:peladinhas:settleCasinoSlot,functions:peladinhas:casinoSession,functions:peladinhas:onCasinoGame,functions:peladinhas:grantCasinoCoins,functions:peladinhas:blackjackAction,functions:peladinhas:blackjackSweep,functions:peladinhas:getCasinoShop,functions:peladinhas:buyCasinoCard"
npm.cmd run deploy:frontend
```

Estes comandos publicam a economia e os checkpoints. Para o Blackjack multiplayer, seguir também os [seletores das novas funções e regras](blackjack-multiplayer.md#código-testes-e-publicação). Não são necessários índices, Storage ou recálculo histórico. Publicar é separado dos testes locais; estes comandos não foram executados durante a implementação.

Para a Roleta multiplayer, publicar as duas funções novas, regras de leitura e TTL do chat, e frontend:

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:rouletteAction,functions:peladinhas:rouletteSweep,firestore:rules,firestore:indexes"
npm.cmd run deploy:frontend
```

O frontend recompila o SDK da Roleta a partir de `games/roleta-europeia-3d`; não publicar apenas o jogo standalone. O deploy não foi executado.

## Desenvolvimento offline

Numa instalação nova:

```powershell
npm.cmd ci
npm.cmd ci --prefix games/futebol
npm.cmd ci --prefix games/blackjack-3d
npm.cmd ci --prefix games/roleta-europeia-3d
npm.cmd run dev:casino
```

Abrir `http://localhost:8081/#/casino`. O servidor usa fixtures, sem Firebase real, e 1000 créditos de desenvolvimento numa carteira nova. O site oficial começa com 200 DJC. A mesa multiplayer de desenvolvimento tem carteiras fictícias próprias de 200 DJC e estado em memória, partilhado entre browsers desse servidor local. O comando recompila os jogos; depois de alterar fontes de `games`, reiniciar o comando ou executar `npm.cmd run build:casino`. As builds em `assets/games` são geradas e ignoradas no Git.

Node 24.16+ para compilar os jogos; runtime das Functions: Node 22. O backend usa Java 21 e [firebase.casino.json](../../firebase.casino.json), com projeto `demo-` e Firestore em 8188.

```powershell
npm.cmd run test:casino
npm.cmd run test:casino:tables
npm.cmd run test:casino:rift
npm.cmd run test:casino:backend
npm.cmd run test:docs
```

As fontes publicadas são `games/futebol`, `games/rift-core-overdrive`, `games/blackjack-3d` e `games/roleta-europeia-3d` e `games/cardoso-road`. Preservar adaptadores de carteira; não usar endpoints HTTP de demonstração dos fornecedores. A integração não altera a matemática dos jogos.

## Capas

WebP vertical 800 × 1200 px (2:3), sRGB, opaco, idealmente até 250 KB; conservar o PNG original. A arte inclui o nome do jogo e margem segura de 8%. Não incluir botões, saldos ou disponibilidade. Os assets dos jogos ficam fora da pré-cache PWA e carregam ao abrir o jogo.

## Cardoso Road

O jogo usa a carteira partilhada em Djabucoin. Cada aposta, passo e levantamento guarda saldo e ronda na mesma transação IndexedDB. O fim da ronda e a saída confirmam os totais online; os passos não fazem leituras Firestore. A ronda pode ser retomada neste dispositivo. A pré-visualização em `games/cardoso-road` continua isolada com créditos demo.

O reset por edição invalida os snapshots e sessões anteriores dos cinco jogos; não apaga fisicamente o arquivo da base de dados. `scripts/reset-casino.mjs` permite materializar o saldo nas contas existentes, com limite de 500 documentos por coleção e precondições para não sobrescrever alterações concorrentes. O modo real exige autorização prévia para as leituras e os argumentos `--live --repair --apply --scope DESCRICAO --max-reads 1500`. Não repetir o reset mudando a edição sem um novo pedido explícito.

Entre avanços existe um intervalo mínimo de 500 ms, também pela tecla Espaço. Depois de uma confirmação, o botão volta a ficar disponível ao terminar esse intervalo. O rodapé reúne áudio e ferramentas; não inclui cashout automático, valores rápidos ou mensagens de fala.

Validação local da integração: `npm.cmd run test:casino:cardoso`. Acrescentar `--motion` a `node tests/casino-cardoso.mjs` para verificar animações normais.

Reset de 27/10/2026: a edição `official-2026-10-27-reset-200` começa com 200 DJC. As sessões e progressos dos jogos anteriores não recuperam saldo; a mesa multiplayer antiga é descartada ao mudar de edição, sem reembolsar apostas antigas. As cartas compradas mantêm-se em `cardCollections`. O reset é aplicado no primeiro acesso após publicar todos os consumidores e o frontend; não implica uma leitura global nem apaga arquivos.

Validação local da integração: `npm.cmd run test:casino:cardoso`.
# Rejuice

A Vault pessoal está descrita no [relatório de implementação de 29/10/2026](../reports/casino-vault-2026-10-29.md): depósitos definitivos no cabeçalho do salão, sem levantamentos e com saldo separado das apostas. O total para a [loja da conta](casino-shop.md) soma carteira e Vault. O painel abre num popup ancorado ao botão Vault e fecha ao clicar fora, mover o foco para outro controlo ou premir Escape.

O salão apresenta sempre «Pedir Rejuice». Com saldo local de pelo menos 5 DJC, o clique mostra uma mensagem sem chamar o servidor. Abaixo desse valor, a carteira envia uma confirmação `casinoSession` com `rejuice: true`, incluindo os totais pendentes. Não há limite diário.

Na mesma transação, o servidor aplica os totais, verifica o saldo real resultante e acrescenta 5000 centésimos apenas se o saldo estiver entre 0 e 499. A sequência e o fingerprint da sessão tornam a repetição idempotente; o pedido fica persistido antes do envio e a resposta atualiza a carteira local sem leitura adicional nem novo listener. Pedidos concorrentes são serializados pela transação. O cliente bloqueia cliques durante o processamento.

Uma confirmação normal utiliza duas leituras transacionais (carteira e sessão) e duas escritas, além das leituras existentes de política e utilizador. Repetir a mesma confirmação não escreve. A contenção pode exigir novas tentativas internas do Firestore. Não são criados documentos de recibo adicionais.

Segurança: esta validação protege a atribuição contra saldo concorrente e repetição. Os jogos locais continuam a enviar totais calculados pelo navegador, conforme a arquitetura existente; não há validação autoritativa de cada resultado. Garantir resistência à falsificação desses totais exige migrar a execução dos jogos para o servidor.

Validação local: `node tests/casino-rejuice.mjs`, `node --test tests/casino-session.test.js tests/casino.test.js` e `npm.cmd run test:casino:backend` (emulador). Publicar primeiro `npx.cmd firebase deploy --only functions:peladinhas:casinoSession` e depois `npm.cmd run deploy:frontend`. Não é necessário recalcular carteiras nem alterar semanas fechadas.

O Rejuice usa o botão **Pedir Rejuice**, do lado oposto a **Loja de cartas**, com o mesmo formato e tamanho. O resultado aparece num popup junto ao botão e desvanece após cinco segundos. Em ecrãs estreitos, o popup aparece por baixo.
