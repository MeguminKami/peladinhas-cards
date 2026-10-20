# Progresso dos participantes nas missões pessoais — 20/10/2026

O detalhe das missões de objetivo individual mostra todos os participantes ordenados de 100% a 0%, incluindo não iniciados e bloqueados por pré-requisitos. Pesquisa por nome, destaque «Tu», estado textual com ícone, contador e barra tornam visíveis quem concluiu e quanto falta a cada jogador. Em objetivos compostos, os contadores por objetivo ficam num detalhe expansível.

## Dados e regras

`getEvent` acrescenta `participantProgress`, calculado com o ranking e o registo de conclusões que já eram consultados, sem leituras Firestore adicionais. A lista pública não inclui `ratingState`, médias, votos, recompensas ou dados privados. `progress` continua filtrado para o próprio membro. O resumo usado em `listEvents` não inclui esta lista, evitando aumentar a carga da página inicial. Eventos competitivos e missões coletivas conservam a apresentação anterior.

100% corresponde ao objetivo cumprido ou a uma conclusão válida registada no período. Conclusões anteriores não completam automaticamente um novo período; o limite total de conclusões atingido conserva a missão concluída. Uma contagem pequena pode arredondar para 0%, mas mantém o estado «Em progresso» e o contador real. Nos empates, a apresentação ordena nomes alfabeticamente.

## Verificação local

- 17 testes de integração de eventos passaram no emulador Firestore demo. Incluem lista pública 100/50/0/0, contagem de outro participante, conclusão reclamada, detalhe privado limitado ao próprio e renovação de período.
- Interface: ordem 100/100/40/0/0, estados, pesquisa sem acentos, pesquisa vazia, nome longo, quatro temas e larguras 1440/768/390/320. Detalhes compostos abrem por teclado. Capturas desktop/telemóvel inspecionadas.
- Sem deploy nem alterações de dados cloud nesta tarefa. Não é necessário recalcular progresso guardado: a consulta calcula-o a partir dos jogos e conclusões existentes.

## Publicação

```powershell
npm.cmd run deploy:frontend
npx.cmd firebase deploy --only "functions:peladinhas:getEvent,functions:peladinhas:listEvents,functions:peladinhas:eventAction,functions:peladinhas:voteEvent,functions:peladinhas:claimMission,functions:peladinhas:closeEvents"
```

As seis funções partilham `functions/event-management.js`. Não são necessárias alterações a regras ou índices.
