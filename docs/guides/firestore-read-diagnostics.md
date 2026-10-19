# Diagnósticos sem repetir leituras Firestore

[← Documentação](../README.md) · [Plano](../plans/firestore-read-reduction.md) · [Resultados de 19/10/2026](../reports/firestore-read-reduction-2026-10-19.md)

As sete auditorias abaixo usam `scripts/firestore-audit-cache.mjs`. Por defeito, analisam exclusivamente um snapshot local. Uma resposta ausente interrompe a análise sem contactar Google APIs. Não há recolha automática nem abertura de credenciais no modo offline.

```powershell
# Analisar novamente, sem rede nem novas leituras
node scripts/audit-mission-progress.mjs --snapshot test-results/firestore-audits/missions.json

# Recolha real deliberada, só quando necessária e autorizada
node scripts/audit-mission-progress.mjs --live --scope "eventos e progresso da liga" --max-reads 500 --snapshot test-results/firestore-audits/missions.json
```

`--scope` regista a finalidade; não constitui um filtro de documentos. Os filtros efetivos são os implementados pelo script. O orçamento contabiliza documentos REST devolvidos e consultas vazias, limita páginas/consultas e serializa pedidos para impedir que consultas simultâneas ultrapassem juntas o saldo disponível. Não equivale a faturação cloud: leituras de índices, regras e operações especiais não são medidas por este contador. Uma recolha interrompida pode ficar incompleta; não aumentar o orçamento automaticamente. Projeções reduzem transferência, sem garantir menos leituras faturadas.

| Script | Âmbito efetivo e paginação | Escritas |
| --- | --- | --- |
| `audit-carlos-ovr.mjs` | Utilizadores para localizar o jogador; ratings iniciais/comunitários, jogos, resumos, equilíbrios, recompensas, pesos, carta e histórico. Listagens paginadas. | Nenhuma. |
| `audit-weekly-growth.mjs` | Coleções de contexto da liga e histórico da semana anterior por jogador. Listagens paginadas. | Nenhuma. |
| `audit-mission-progress.mjs` | Eventos, jogos e recompensas; análise local das janelas e objetivos. Listagens paginadas. | Nenhuma. |
| `audit-path-difficulty.mjs` | Jogos, resumos, feedback e revisões por jogo. Listagens paginadas. | Nenhuma. |
| `audit-goalkeeping.mjs` | Jogos fechados, feedback e resumo por jogo. Listagens paginadas. | Só `--live --repair`: campos desatualizados do resumo, com precondição. No emulador demo, a reparação local continua disponível. |
| `audit-feedback-access.mjs` | Configuração Functions/Run, IAM/logs limitados, política, jogos/utilizadores e feedback do último jogo. Listagens Firestore paginadas. | Nenhuma. |
| `audit-function-deploy.mjs` | Estado e operações Functions, com página de operações limitada. Não consulta documentos Firestore. | Nenhuma. |

Os snapshots são ignorados pelo Git, em `test-results/firestore-audits/`. Guardam respostas e data, sem cabeçalhos de autorização. Podem conter dados pessoais: recolher apenas o necessário, não partilhar nem publicar esses ficheiros e apagá-los manualmente ao terminar, no máximo em sete dias. Depois de sete dias, o modo offline recusa usá-los; `--allow-stale-snapshot` permite uma análise histórica deliberada, sem renovar a recolha. A rejeição não elimina automaticamente ficheiros.

Para consumo e frequência de funções, preferir Cloud Monitoring em janelas equivalentes e sem ler documentos. Não somar séries antigas e atuais para a mesma operação, nem pedidos Cloud Run e execuções Functions como se fossem independentes. Uma contagem de pedidos não identifica diretamente leituras por função. A atribuição cloud e os conflitos `ABORTED` exigem observação própria; não justificar um recálculo global apenas para investigar consumo.

Os testes locais são reproduzíveis com `npm.cmd run test:read-safety` e `npm.cmd run test:reads`; o segundo usa exclusivamente um projeto demo e apaga os dados desse emulador entre cenários.
