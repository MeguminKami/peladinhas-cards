# Destinatários das mensagens ADMIN — 20/10/2026

ADMIN → Mensagens permite enviar para jogadores de um jogo, jogadores escolhidos ou todos os jogadores ativos. No jogo, contam titulares e suplentes das duas equipas. A pesquisa por nome ou username preserva as seleções e ignora acentos. A contagem e os nomes antecipam os destinatários; não é possível enviar com o grupo vazio.

`adminMessage` valida a autorização e resolve os destinatários no servidor. O modo `game` lê os participantes do jogo; `selected` aceita `recipientIds`, elimina duplicados e filtra contas inexistentes ou desativadas; `all` mantém o envio global. Pedidos antigos sem `audience` conservam o modo global. A resposta inclui `sent`, o número de destinatários com notificação gravada, sem garantir entrega push no aparelho.

Não foram enviadas mensagens reais nem executado deploy. O armazenamento e as regras de acesso das notificações não mudam.

Validação local: teste de backend no emulador demo passou para os três grupos, permissões, entradas inválidas, duplicados e contas desativadas. `npm.cmd run test:admin-messages` passou para envio, pesquisa, falha/repetição, teclado, redução de movimento e larguras 320/390/768/1440. Capturas desktop e telemóvel inspecionadas. `npm.cmd run build:hosting` passou.

Publicação necessária:

```powershell
npx.cmd firebase deploy --only functions:peladinhas:adminMessage
npm.cmd run deploy:frontend
```

Este âmbito é adicional às alterações de percursos ainda por publicar. Não é necessário publicar regras ou índices devido às mensagens.
