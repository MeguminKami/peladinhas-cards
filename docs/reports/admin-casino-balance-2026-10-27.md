# Saldo no envio administrativo de moedas — 27/10/2026

O popup Admin → Jogadores → Moedas apresenta o saldo do destinatário. `openCasinoGrant` chama `getCasinoPlayerBalance` apenas ao abrir o formulário. A listagem de jogadores não consulta carteiras; digitar a quantidade e enviar não repetem essa consulta. Reabrir obtém um novo snapshot. Não existem listeners, polling ou tentativas automáticas. A transação de envio mantém as suas leituras e validações anteriores.

A callable exige administrador ativo e valida `uid`, sessão revogada e App Check pela proteção existente. Devolve apenas identificador e saldo. São três leituras Firestore por abertura: `settings/system`, `users/{adminUid}` e `casinoWallets/{uid}`. A consulta não cria nem escreve documentos. Carteira ausente ou de edição anterior apresenta os 200 DJC efetivos da edição atual sem executar o reset; o reset continua a ocorrer no primeiro acesso com escrita. Não lê subcoleções, movimentos ou Storage.

Validação local: teste de browser com fixtures confirma zero consultas na lista, uma por abertura, nenhuma ao digitar/enviar, atualização ao reabrir e erro sem repetição automática. Composição inspecionada a 1440, 768, 390 e 320 px. O teste de backend passou no emulador Firestore local em 8188, verificando autorização, input, saldo atual, carteiras ausentes/antigas e ausência de escritas. Não foram consultados dados reais nem efetuado deploy.

Testes reutilizáveis: `npm.cmd run test:admin:casino` e `npm.cmd run test:casino:backend`. O segundo inicia um emulador; deve ser executado com a porta 8188 disponível.

Publicar a nova função antes do frontend:

```powershell
npx.cmd firebase deploy --only functions:peladinhas:getCasinoPlayerBalance
npm.cmd run deploy:frontend
```

A função usa `europe-west1`. Não altera regras, índices ou outras funções existentes.
