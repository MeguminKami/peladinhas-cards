# Acompanhamento das avaliações por jogo — 18 de outubro de 2026

Em Administração → Jogos, cada jogo finalizado passa a ter **Avaliações**. O diálogo apresenta participantes, equipa, quantidade enviada/esperada, rascunhos e estados concluído/parcial/por iniciar. A autoavaliação e os suplentes seguem o formulário de avaliações existente. As contas inativas são identificadas e excluídas dos envios.

O administrador pode atualizar a lista, lembrar uma pessoa ou selecionar um grupo. O servidor calcula os pendentes diretamente em `games/{gid}/feedback`; não há contadores ou registos de submissão paralelos. A resposta administrativa não contém classificações nem respostas individuais.

`ratingSubmissionStatus` e `sendRatingReminders` verificam identidade, conta ativa e capacidade administrativa de Jogos ou Avaliações. O envio usa as proteções existentes de quotas de pedidos, App Check quando obrigatório, pausa de avaliações e apenas consulta. A transação de notificação volta a verificar jogo, participante, conta e submissões, consultando apenas as avaliações do destinatário. Jogos reabertos ou em eliminação não recebem lembretes.

O envio reutiliza `RATING_REQUIRED`, a caixa `users/{uid}/notifications`, o destino do formulário e o transporte push existente. Os lembretes automáticos usam a mesma verificação de pendentes e partilham quota diária, intervalo e silêncio com os manuais. Cada pedido tem referência idempotente e uma entrada na auditoria administrativa. Os resultados confirmam notificações criadas, sem prometer push no dispositivo.

Os testes de concorrência identificaram uma falha de inicialização paralela de leituras no emulador; as duas leituras de quota passaram a usar `Transaction.getAll`, conservando a transação única e evitando iniciar leituras concorrentes antes da abertura da transação.

## Validação local

- 101 testes unitários e de cálculos aprovados.
- 54 testes de backend aprovados: 46 regressões existentes e oito verificações do acompanhamento e envio de lembretes.
- Cobertura de autorizações, rascunhos, autoavaliação, contas inativas, destinatários fora do jogo, envios concorrentes, deduplicação, quotas partilhadas com automatizações, conclusão após abrir a lista, pausas, silêncio, App Check e jogo reaberto.
- Interface aprovada em 1440/768/390/320 px: seleção, envio individual/grupo, atualização, erro/repetição e teclado. Capturas de computador e telemóvel inspecionadas.
- Sintaxe, ligações da documentação e build Hosting verificados.

Não foi executado deploy nem testada entrega push num aparelho físico. Os testes backend usam Firestore local e os testes de interface usam fixtures, com transporte push verificado pela regressão existente.

## Publicação

O frontend e as funções precisam de publicação. O script `node scripts/maintenance-release.mjs` apresenta os comandos seletivos com todos os nomes afetados pelos módulos partilhados, incluindo os novos endpoints e os consumidores do serviço de notificações. Não são necessários novos índices ou permissões de cliente para esta funcionalidade. Não existe migração de dados nem recálculo de cartas.
