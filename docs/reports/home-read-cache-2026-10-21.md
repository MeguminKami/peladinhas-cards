# Cache do início e automações por alteração — 21/10/2026

## Problema e resultado implementado

O início carregava coleções completas e consultava avaliações e missões por jogador. Trabalhos de cinco ou quinze minutos voltavam a consultar dados sem alterações. O novo `getHome` reutiliza o contexto da liga e um resultado pessoal; versões pequenas avisam as páginas visíveis quando precisam de atualizar.

O comportamento e os procedimentos reutilizáveis estão na [referência dos dados do início](../reference/home-data.md). Mantêm-se os cálculos, o fecho semanal às 18h, a abertura às 12h e o corte de 48h dos percursos. Não foi executado recálculo de dados cloud nem publicação.

## Evidência local

- Emulador Firestore, projeto `demo-*`, 20 jogadores: repetição de `getHome` com cache fez **5 leituras de documentos e 0 consultas a coleções**: política, ator, duas versões e resultado pessoal.
- O primeiro carregamento reconstrói os dados necessários; outro jogador reutiliza o contexto partilhado. Os resultados pessoais, avaliações pendentes e autorização permanecem separados.
- Testes verificam pedidos simultâneos, espera pelo resultado de outra instância, progresso pessoal diferente na mesma missão, alterações de eventos sem recalcular cartas, conta desativada, sessão revogada, prazos, falhas e escrita durante uma tarefa. Os novos endpoints declaram `europe-west1` e o limite de três instâncias; a configuração publicada não foi consultada.
- Browser com fixtures e rede cloud bloqueada: sem polling do início, atualização por versão, suspensão em segundo plano, regresso à página e carregamento completo ao sair para jogadores. Verificado a 1440/768/390/320 px, sem overflow horizontal. Capturas locais em `test-results/home-revisions-*.png`.
- Regras verificam tokens globais/pessoais/de evento e impedem leitura das caches e escritas pelo cliente. Testes existentes de navegação, eventos, percursos e push complementam esta validação.

As cinco leituras referem-se exclusivamente ao callable com cache. Não incluem autenticação/perfil no navegador, notificações, listeners, consultas frias, índices nem verificações de regras. Não se mediu uma percentagem de redução em produção.

## Validação reproduzível

```powershell
npm.cmd run test:home-cache
npm.cmd run test:home-cache:backend
npm.cmd run test:rules
npm.cmd run check
npm.cmd test
npm.cmd run test:docs
```

O teste backend usa apenas um projeto demo através do emulador. O desenvolvimento continua com fixtures por defeito. Não foram lidos documentos do Firestore de produção neste trabalho.

## Publicação seletiva

Primeiro publicar servidor e regras, depois frontend:

```powershell
npm.cmd run deploy:home-cache
npm.cmd run deploy:frontend
```

`deploy:home-cache` contém os seletores explícitos das 21 funções abaixo e `firestore:rules`; não publica Storage nem índices:

| Grupo | Funções |
| --- | --- |
| Início e versões | `getHome`, `onHomeSource`, `onHomeFeedback`, `onHomeVote` |
| Ciclo e coleção | `closeCardWeek`, `openCardWeek`, `refreshCardCollection` |
| Eventos e consumidores internos | `closeEvents`, `eventAction`, `voteEvent`, `getEvent`, `listEvents`, `claimMission`, `onGame` |
| Percursos | `getPath`, `pathAction`, `onPathGame`, `onPathSummary`, `settlePaths` |
| Lembretes e recuperação | `scheduledNotifications`, `systemHeartbeat` |

Inclui consumidores que executam código de eventos internamente, não apenas a função agendada. As alterações de `policy-runtime.js` afetam a classificação de leitura de `getHome` e os checkpoints das quatro tarefas indicadas; as restantes operações conservam o comportamento anterior. Alterações anteriores ainda por publicar continuam a exigir os respetivos seletores.

O arranque usa o carregamento anterior apenas se o backend devolver `not-found`/`unimplemented` durante uma publicação gradual. Uma falha temporária ou de autorização não provoca uma leitura completa da liga como alternativa. Validar a entrega dos triggers e a cadência das tarefas na configuração cloud após publicar; os testes locais não confirmam essa configuração.
