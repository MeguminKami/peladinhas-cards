# Fecho semanal às 18h de quarta — 21/10/2026

Alterado o calendário base para fechar à quarta-feira às **18:00, Europe/Lisbon**, desde o ciclo que termina em 21/10/2026. A abertura continua à quinta-feira às 12:00. Até às 17:59:59 de quarta, a carta da semana pode continuar a evoluir e receber alterações de apresentação/fotografia segundo as permissões existentes; a partir das 18:00 fica bloqueada. As janelas próprias de avaliações, regras de missões e permissões de acesso não foram removidas.

## Compatibilidade e reabertura

O histórico de políticas é compilado com uma transição de calendário datada, sem escrever uma revisão fictícia no Firestore nem mudar o número de revisão existente. Mantém a configuração histórica anterior a 21/10; revisões explícitas posteriores continuam a prevalecer. `cardWeek` e `cardWeekBounds` resolvem a hora de fecho na data da quarta-feira, permitindo estender a semana já aberta na quinta anterior.

`buildHistory` reabre apenas o snapshot da semana corrente quando o ciclo está aberto e o fecho guardado é anterior ao novo fecho. Remove o bloqueio e reconstrói a carta corrente com os dados atuais. Nunca reabre semanas anteriores. Fotografia e seleção de carta usam a mesma decisão; a edição da foto pode iniciar esta atualização sem exigir outro pedido prévio.

Os jobs de abertura/fecho continuam a cada 15 minutos. A chave de execução passa a incluir o instante de fecho: um fecho já processado às 12h não impede o novo fecho às 18h, e uma abertura antiga não impede a passagem de atualização após a extensão. O acesso ao histórico e as ações que o atualizam também fazem a reparação corrente. Não foi executado recálculo global ou migração cloud.

## Validação local

- 163 testes gerais passaram, incluindo verão/inverno, fronteira exata às 18h, quinta às 12h, semana histórica, política antiga e futura explícita.
- Integração num projeto demo: snapshot bloqueado às 12h, edição da foto às 14h de Lisboa, reconstrução da identidade corrente, semana anterior intacta, novo bloqueio às 18h, job antigo sem impedir a execução nova, execução repetida deduplicada e fotografia recusada depois do fecho.
- Nenhuma leitura ou escrita de documentos de produção foi necessária para desenvolver/testar esta alteração. Sem alteração de layout.

## Publicação

Não executada. Publicar o script seletivo e depois frontend:

```powershell
npm.cmd run deploy:weekly-close
npm.cmd run deploy:frontend
```

O script inclui os consumidores de histórico, eventos, coleções, percursos, manutenção e jogos já enumerados no [relatório das fusões](path-position-fusions-2026-10-21.md), incluindo o catálogo partilhado pendente, e acrescenta `ensureGameCards` e `maintenanceRead`. São seletores explícitos `functions:peladinhas:NOME`, não um deploy completo; regras/índices não mudam. Os triggers e os dois jobs de calendário precisam da mesma versão para não voltarem a aplicar o fecho anterior.

Depois da publicação, atualizar a aplicação; a semana corrente é reconciliada pelo acesso ou pelo job de abertura. O horário novo só estará ativo em produção após publicar ambas as partes. Não se confirmou configuração cloud nem se garantiu que as alterações estejam já disponíveis no site real.
