# Blackjack partilhado

[Casino](casino.md) · [Validação e consumo](../reports/blackjack-multiplayer-2026-10-26.md)

## Entrada e rondas

Depois de uma ronda terminar, a mesa reabre as apostas ap?s 3,25 segundos. Se a ronda terminar na distribui??o inicial, o servidor preserva o tempo necess?rio para apresentar as cartas antes de reabrir as apostas.

O Blackjack do casino abre uma única mesa pública com cinco lugares, atribuídos automaticamente. O primeiro jogador cria a mesa. Não há códigos nem anfitrião; sair não transfere controlo para outro browser. Com cinco lugares ocupados, uma nova entrada recebe a indicação de mesa cheia; esta versão não inclui espectadores adicionais.

Cada pessoa pode ocupar vários dos cinco lugares: clicar num **+** livre ocupa o lugar e clicar no próprio avatar escolhe onde apostar. O primeiro lugar é atribuído na entrada; regressar à aplicação não ocupa lugares adicionais. Lugares ocupados durante uma ronda entram na seguinte. Confirmar em **Pronto** reserva apenas a aposta do lugar selecionado. Todos os lugares da mesma pessoa usam a mesma carteira DJC, com controlo do saldo agregado no servidor. Sair da mesa liberta todos os seus lugares após resolver as apostas.

A primeira confirmação abre 15 segundos; se todos os lugares ocupados confirmarem antes, a ronda começa. Quem não confirmou ou entrou durante uma ronda participa na seguinte. Ajustar fichas e alternar o lugar selecionado são operações locais. As decisões identificam o lugar da mão ativa; seguro e aposta identificam o lugar escolhido. Os retornos de todos os lugares do mesmo dono são creditados atomicamente na mesma carteira.

As cartas são apresentadas uma a uma, com movimento de cerca de 340 ms (300 ms na abertura da carta fechada) e uma pausa curta entre entregas. Um som procedural de papel acompanha cada carta; som e movimento reduzido respeitam as definições existentes. **Ver mesa** permite saltar a sequência. Atualiza??es recebidas durante a distribui??o s?o processadas em sequ?ncia, sem interromper a carta em voo; o estado mais recente conserva todos os eventos confirmados. Altera??es de presen?a ou saldo mant?m os n?s das cartas, fichas e bot?es. Mesa, avatares e controlos conservam a geometria ao mudar de estado, numa superf?cie ?nica. **Centrar jogo** inclui fichas e saldo no espa?o entre as barras do website. O total do dealer fica abaixo das cartas, ocultando o valor da carta fechada. **Reset**, **Limpar** e **Pronto** distinguem-se por azul, vermelho e verde, mantendo texto e foco acessível.

As regras são as mesmas do modo individual: quatro baralhos, S17, natural 3:2, seguro, dobrar e até quatro mãos por lugar. O servidor embaralha com `node:crypto`, mantém o baralho e a carta fechada privados e verifica a propriedade de cada decisão. Cada pessoa tem 30 segundos para decidir; o timeout para a mão ou recusa seguro. As decisões podem demorar um pouco mais a ser processadas se houver latência. Sem clientes ligados, o processo de recuperação corre a cada minuto.

Os ganhos são pagos na transação que termina a ronda. O resumo permanece pelo menos 6,5 segundos antes de reabrir apostas. Se a ronda terminar logo na distribuição inicial, o prazo inclui tempo para apresentar todas as cartas e o resultado sem cortar a sequência. Saídas antes da distribuição devolvem apostas reservadas; mãos já distribuídas continuam até à liquidação, mesmo que todos saiam. Não há um botão para cancelar uma mão ou repetir o pagamento.

## Presença e recuperação

A sala fecha após **um minuto sem jogo**: o prazo começa na criação da mesa e reinicia quando alguém aposta ou termina uma ronda. Uma ronda em curso, incluindo seguro e decisões, suspende este encerramento, mesmo que dure mais de um minuto. Presença, entradas e animações não prolongam o prazo. Quando o prazo termina, todos regressam ao catálogo. Os timeouts individuais continuam a resolver mãos abandonadas; o encerramento da sala nunca interrompe uma ronda.

- Um browser visível renova a presença a cada 30 segundos. Esse pedido altera apenas o estado privado, sem atualizar o documento acompanhado pelos cinco jogadores.
- Uma quebra de ligação ou aba oculta reserva o lugar por 60 segundos. Após a expiração, a entrada normal pode criar ou recuperar a mesa que estiver disponível.
- Dois minutos sem participar removem um jogador que não esteja a aguardar decisões de uma ronda em que apostou. Aguardar pela vez numa ronda longa não conta como inatividade. A interface regressa ao catálogo com uma explicação, sem reload completo.
- Sair durante uma ronda marca o lugar para saída. Esse lugar continua associado ao dono até ao pagamento e é libertado depois. Quando a última participação termina, os documentos da mesa são apagados.
- Pedidos de aposta e decisões ficam em `sessionStorage` antes do envio. Uma resposta de rede incerta conserva o pedido exato e tenta confirmá-lo automaticamente a cada 2 segundos; repetir o identificador não repete o débito. Não limpar o armazenamento para resolver uma confirmação pendente.
- A revisão impede decisões atrasadas. Confirmações de aposta de pessoas diferentes podem chegar em simultâneo; a transação verifica cada aposta contra o saldo real. Recompensas e envios administrativos concorrentes são preservados.

O catálogo não subscreve o estado da mesa. Os relógios e as animações são locais. Não existem escritas por segundo. O processo `blackjackSweep` consulta um documento fixo a cada minuto: mesmo sem mesa, há **1 440 leituras por dia**, além do custo próprio do Scheduler/Functions. Com mesa, uma passagem sem alterações usa duas leituras; recuperar pagamentos ou saídas pode ler também carteiras e escrever documentos.

O modo antigo continua disponível apenas para concluir uma ronda local anterior à atualização. Depois de terminar e voltar a abrir o Blackjack, entra-se na mesa partilhada. Os restantes jogos conservam os checkpoints existentes; o Blackjack partilhado faz reservas e pagamentos online.

## Chat da mesa

O botão **Chat** abre um painel com os separadores **Jogadores** e **Chat**, com o mesmo comportamento do chat da Roleta (ver [casino.md](./casino.md)). O painel flutua sobre a mesa (canto superior direito no computador, folha inferior no telemóvel) e não altera a composição do jogo; Escape ou ✕ fecha-o.

- O chat só subscreve `casinoBlackjack/main/blackjackMessages` enquanto o separador Chat está aberto: as 100 mensagens mais recentes dos últimos 30 minutos. A interface remove mensagens expiradas; o TTL do Firestore (`expireAt`) apaga os documentos mais tarde.
- O envio usa a ação `chat` de `blackjackAction`, sem leitura de carteiras e sem alterar a revisão da mesa, o documento público nem a inatividade do jogador. O servidor atribui uma cor por jogador (partilhada pelos seus lugares), limita o texto a 180 caracteres e uma mensagem por segundo, e é idempotente pelo identificador do pedido (`{uid}_{id}`). Quem já saiu ou expirou tem de voltar a entrar para conversar.
- Mensagens próprias ficam à direita e as restantes à esquerda, com o nome na cor do jogador.

## Código, testes e publicação

O estado e a contabilidade estão em [blackjack-table.js](../../functions/blackjack-table.js); transações e recuperação em [blackjack.js](../../functions/blackjack.js). O transporte fica em [casino-blackjack.js](../../js/casino-blackjack.js), com apresentação em [multiplayer.ts](../../games/blackjack-3d/src/multiplayer.ts). O servidor importa cópias geradas do motor original; após mudar as regras ou utilitários TypeScript, executar `npm.cmd run build:blackjack:server` e rever as diferenças geradas. O teste verifica que as cópias estão atualizadas.

```powershell
node scripts/build-casino-tables.mjs
npm.cmd run test:casino:blackjack
npm.cmd run test:casino:blackjack:backend
npm.cmd run test:docs
node tests/blackjack-live-layout.mjs
node tests/roulette-alignment.mjs
```

O primeiro comando prepara o SDK usado no browser. Os testes de browser iniciam um servidor de fixtures próprio em 8093 e bloqueiam fontes externas na página principal. O emulador usa `firebase.casino.json`, projeto `demo-` e Firestore em 8188. Não usam dados reais. O teste backend gera `test-results/blackjack/budget.json`: operações de transação medidas, com leituras de listeners, regras e validação calculadas separadamente.

Publicar primeiro as funções e a regra de leitura do documento público; depois, o frontend:

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:blackjackAction,functions:peladinhas:blackjackSweep,firestore:rules,firestore:indexes"
npm.cmd run deploy:frontend
```

Não são necessários Storage ou recálculos históricos. O chat exige publicar também `firestore:indexes` (TTL de `blackjackMessages.expireAt`). As alterações ao módulo de casino apenas exportam o wrapper já existente; não alteram o comportamento das funções antigas. Este guia não confirma publicação nem configuração cloud verificada.
