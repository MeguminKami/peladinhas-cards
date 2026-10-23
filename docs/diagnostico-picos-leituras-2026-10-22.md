# Picos de leituras — 22 de outubro de 2026

## Âmbito e evidência

Consulta autorizada a Cloud Logging entre 16:30 e 17:10 de Lisboa
(15:30–16:10 UTC), limitada a 200 entradas, por ordem cronológica.
Não foram lidos documentos do Firestore nem ficheiros ou metadados do Storage.
A resposta atingiu o limite e contém apenas o período entre 16:50:37 e
16:56:55 de Lisboa. Não foi pedida a página seguinte.

Nesse excerto, os pedidos HTTP com resposta 200 foram:

| Serviço | Pedidos |
| --- | ---: |
| listEvents | 8 |
| getHome | 7 |
| ensureHistory | 3 |
| getEvent | 5 |
| getPath | 1 |
| pushDeviceAction | 3 |
| onHomeSource | 106 |

As chamadas internas a outras funções não aparecem necessariamente como pedidos
HTTP separados. As 106 execuções do trigger não equivalem a 106 reconstruções
da cache: o trigger também recebe escritas de coleções que ignora.

## Diagnóstico

O excerto confirma navegação e carregamentos de dados durante o pico.
Não contém pedidos aos serviços de tarefas horárias. Isto não exclui tarefas
noutra parte do intervalo, que ficou fora da amostra.

O código local explica a amplificação das leituras:

- `js/app.js` usa o modelo compacto de `getHome` apenas no início. Ao sair
  para uma página que precisa do modelo completo, chama `loadLeague`.
  Nas navegações seguintes, um modelo com mais de 30 segundos pode ser
  atualizado de novo.
- `js/data.js` carrega as coleções completas `communitySummaries` e
  `eventRewards`, além de chamar `openEvents`, que usa `listEvents`.
- `functions/events.js` executa a consulta `events WHERE status IN (...)`
  em cada chamada de listagem ativa. Este é um caminho compatível com a
  consulta apresentada na captura.
- `functions/home-cache.js` também lê as duas coleções completas quando
  reconstrói a cache partilhada da liga. Alterações nas fontes invalidam-na.
- `ensureHistory`, quando não passa a verificação de atualidade de cinco
  minutos, chama `buildHistory`, cujo `collectionContext` lê essas coleções
  completas mesmo para reconstruir apenas um jogador.
- Os detalhes de uma missão em `functions/event-management.js` leem a
  coleção completa de recompensas para desbloqueios e progresso.

A conclusão mais sustentada é amplificação de leituras por carregamentos
de navegação, detalhes de missões e possíveis reconstruções de histórico/cache.
Os logs não registam o número de documentos lidos por execução nem os acertos
da cache, pelo que não permitem atribuir exatamente os valores 660/408/253
da captura a cada função. O código publicado não foi descarregado para
comparação com o código local.

Correção à hipótese inicial: o polling de 60 segundos de resultados de eventos
é um fallback quando não existe `watchEventSignals`. Não há evidência para
atribuir estas oito chamadas de listagem a esse polling.

## Possibilidades de correção

1. Reduzir o carregamento global nas páginas de detalhe: obter os dados de
   que a página precisa, preservando atualizações por revisão e após escritas.
   Este é o alvo mais direto para as leituras de ambas as coleções.
2. Partilhar a cache da liga entre o início e os restantes consumidores,
   mantendo uma projeção adequada às permissões. A projeção atual do início
   não substitui diretamente o modelo completo.
3. Especializar o contexto de histórico de um jogador ou reutilizar um contexto
   por revisão. Não basta remover o limite de cinco minutos: é necessário
   continuar a observar alterações de avaliações, recompensas e regras.
4. Separar nas missões os dados pessoais de desbloqueio dos dados necessários
   à classificação de todos os participantes. Filtrar todas as recompensas
   apenas pelo utilizador alteraria o progresso dos restantes participantes.
5. Acrescentar métricas agregadas de acerto/reconstrução da cache e leituras
   por operação para permitir atribuição exata em picos futuros.

Estas melhorias são viáveis, mas exigem implementação e verificação local de
atualidade, permissões e progresso das missões. Não foram alterados cálculos,
frontend ou funções neste diagnóstico. Não houve deploy. Uma redução
percentual não pode ser prometida a partir desta amostra.
