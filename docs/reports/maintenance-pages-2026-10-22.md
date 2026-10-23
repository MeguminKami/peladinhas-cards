# Manutenção por páginas e calendário configurável — 22/10/2026

[← Documentação](../README.md) · [Guia de manutenção](../reference/maintenance.md)

## Organização e interface

As definições globais estão distribuídas por sete páginas: Início e cartas, Jogos, Avaliações, Missões e caminhos, Eventos e votações, Jogadores, App e notificações. Um catálogo único associa cada campo a uma página; um teste rejeita campos esquecidos ou repetidos. As ferramentas de prémios, automatizações, diagnóstico, acessos e recuperação permanecem disponíveis. As páginas incluem ligações contextuais às áreas que editam conteúdos, equipas, OVR, cartas e desafios.

O formulário usa uma navegação lateral em desktop e uma grelha de opções no telemóvel. Mudar de página ou consultar outra ferramenta mantém os ajustes por guardar em memória. Esses ajustes mantêm a revisão de origem: uma publicação concorrente de outro admin não passa a ser silenciosamente substituída depois de navegar entre ferramentas. É apresentado um aviso para rever a versão mais recente. O rascunho guardado continua privado no servidor. A indicação de ajustes, a simulação e a publicação incluem todas as páginas, mesmo quando os campos estão recolhidos.

A simulação mantém o cálculo hipotético existente e mostra quantos jogadores têm variação no OVR. O histórico apresenta versões, autor, data, motivo e comparação antes/depois por campo. As operações têm nomes legíveis, pesquisa e detalhes recolhidos, sem grandes blocos JSON na leitura principal. Recuperar uma versão continua a criar um rascunho, sem a publicar automaticamente.

## Calendário

O esquema partilhado passa a incluir `cycle.openDay`, `openMinute`, `closeDay` e `closeMinute`, além das horas existentes. Os dias usam a convenção JavaScript: domingo 0, segunda 1, até sábado 6. Formulários antigos sem estes quatro campos mantêm os valores de compatibilidade; valores inválidos explícitos são rejeitados.

O admin pode escolher os dias e os minutos de abertura e fecho. Uma alteração ao calendário é publicada numa abertura futura no novo dia/hora, com pelo menos um minuto de antecedência. «Usar próxima abertura» calcula essa data em Lisboa. Publicar não altera imediatamente o calendário ativo quando a entrada em vigor é futura.

O cálculo usa um ciclo por semana ISO. Uma abertura futura declarada determina o início dessa semana, evitando uma abertura no dia antigo e outra no dia novo com o mesmo ID. Se a abertura seguinte chegar antes do fecho anterior, essa abertura termina o ciclo anterior. A regra histórica que estendeu o fecho de 21/10/2026 das 12h para as 18h conserva a sua migração específica; novas alterações não desbloqueiam cartas já fechadas.

As fases e verificações de edição respeitam o minuto escolhido. As tarefas de manutenção continuam horárias: a materialização de um fecho ou abertura pode ocorrer na execução horária seguinte. Não foi aumentada a frequência de leituras. O horário de verão/inverno usa `Europe/Lisbon`; uma hora recorrente inexistente na primavera avança após o salto e a hora duplicada de outono usa a ocorrência mais tardia. O auxiliar de primeira publicação evita agendar um instante local inexistente.

## Validação local

- Testes puros: esquema, compatibilidade, dias e minutos, horários de verão/inverno, identidade das semanas, troca de dia, preservação histórica e cobertura dos campos por página.
- Browser: rascunho, publicação, simulação, sete páginas e ferramentas, navegação sem perder ajustes, comparação histórica, teclado e larguras de 320, 390, 768 e 1440 px; os quatro temas foram verificados com fixtures.
- Emulador Firestore: publicação numa sexta-feira às 18h15, rejeição de outros dias/minutos, ativação futura, permissões, concorrência, orçamentos, recompensas adiadas e resgate idempotente. Foram aprovados 13 testes; um teste de recuperação de conta foi omitido porque o emulador Auth não foi iniciado para esta verificação. O fluxo de recuperação não foi alterado.

As capturas ficam em `test-results/maintenance-*.png`. Foram inspecionadas imagens de desktop e telemóvel. Não houve consulta à base real ou ao Storage de produção, nem deploy. Testes locais não confirmam configuração cloud ou entrega push num aparelho.

Comandos reutilizáveis: `npm.cmd run test:maintenance-pages`, `npm.cmd run test:maintenance-calendar:backend`, `npm.cmd test`, `npm.cmd run test:docs`, `npm.cmd run check` e `npm.cmd run build:hosting`.

A suite geral passou **170 testes**, incluindo seis novos cenários de organização/calendário. A verificação de sintaxe e a preparação do pacote frontend/PWA também passaram. Os testes dirigidos de calendário/publicação foram repetidos depois de validar segundos inválidos e a hora duplicada de outono.

## Publicação

Publicar primeiro `npm.cmd run deploy:maintenance-pages`, depois `npm.cmd run deploy:frontend`. O script enumera seletores individuais das 58 funções exportadas na codebase `peladinhas`, incluindo os consumidores do calendário e da política partilhados: cartas, avaliações, desafios, percursos, início, notificações, manutenção e operações autorizadas. Não é um deploy de regras, índices ou Storage.

Não é necessário alterar manualmente configurações antigas nem recalcular semanas fechadas. Os novos valores só passam a operar depois de o admin publicar a configuração correspondente. A ausência de uma nova publicação mantém os dias e horas atuais.

## Correção de publicação - 22/10/2026

Ao publicar alterações ao calendário com entrada em vigor vazia, o formulário propõe a próxima abertura do novo horário e mostra a data e hora de Lisboa na confirmação. Datas preenchidas manualmente são preservadas. O servidor continua a validar a ativação numa abertura futura. Removido o segundo aviso de erro: `busy` já o apresenta. Correção apenas frontend; publicar com `npm.cmd run deploy:frontend`. Teste de browser com fixtures verifica preenchimento automático e confirmação sem publicar.

## Revisão do calendário e tetos - 22/10/2026

Corrigida a data automática que podia ficar associada a uma abertura anterior depois de editar novamente o horário. Datas manuais incompatíveis são agora rejeitadas no formulário antes da confirmação. O resumo separa ativo, proposta e agendamento; o sucesso indica quando a configuração ficou agendada.

Acrescentado resumo expansível de tetos por origem, alimentado pelos valores editados e pela função de limites do ETC. Não foram alterados os tetos, o motor de calendário ou os cálculos de recompensas. Esta revisão requer apenas frontend. Testes locais: nove casos de calendário/limites e browser nos quatro temas e larguras 320/390/768/1440, incluindo data sugerida atualizada, data manual incompatível e tetos expandidos. Sem acesso cloud e sem deploy.
