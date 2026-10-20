# Notificações da liga e do dispositivo

[← Documentação](../README.md) · [PWA](pwa.md) · [Publicação](deployment.md)

## O mesmo registo, duas apresentações

A origem é `users/{uid}/notifications`. O sino e a página **Notificações** mostram as mensagens da conta; Web Push apresenta as elegíveis no sistema operativo dos dispositivos ativados. Não são duas caixas de mensagens independentes.

| Na aplicação                              | No sistema operativo                                        |
| ----------------------------------------- | ----------------------------------------------------------- |
| Listas **Por ler** e **Histórico**.       | Alerta nativo após ativação do dispositivo.                 |
| Ler conserva o histórico da conta.        | Tocar fecha o alerta, abre o destino e confirma a leitura.  |
| Funciona com a sessão e rede disponíveis. | O service worker recebe o push mesmo sem uma janela aberta. |

O sistema operativo decide a apresentação final: banner, som, agrupamento e central de notificações. A existência de uma mensagem no sino não prova a entrega push.

## Lembretes de avaliações no painel de administração

Em **Administração → Jogos**, o botão **Avaliações** de cada jogo finalizado abre o estado das submissões por participante: concluído, parcial ou por iniciar. O total inclui a autoavaliação e todos os participantes, incluindo suplentes. Rascunhos não contam como submissões. Contas inativas ficam identificadas e não recebem lembretes.

O sino de cada linha envia um lembrete individual. A seleção de jogadores e **Lembrar selecionados** permite enviar em grupo; **Selecionar disponíveis** marca quem pode receber nesse momento. **Atualizar avaliações** volta a consultar o servidor. O painel apresenta contagens, sem revelar respostas ou classificações individuais.

Os endpoints `ratingSubmissionStatus` e `sendRatingReminders` exigem administrador ativo com capacidade de Jogos ou Avaliações. O envio reutiliza `users/{uid}/notifications`, o tipo `RATING_REQUIRED` e o push existente, com ligação direta ao formulário do jogo. O servidor volta a verificar participantes, estado do jogo, conta e submissões dentro da transação de entrega. Um participante que entretanto concluiu não recebe o lembrete.

Envios manuais e automáticos partilham os limites diários e o intervalo configurados em Manutenção, bem como o horário de silêncio. As pausas globais de notificações/avaliações e o modo apenas consulta são respeitados. Pedidos repetidos têm uma referência idempotente e os envios administrativos ficam na auditoria. O número apresentado confirma a criação da notificação no sino, sem afirmar entrega push num aparelho.

## Ativação e convite no início

A página Notificações tem **Ativar no telemóvel** ou **Ativar neste dispositivo**, conforme a plataforma. A permissão nativa só é pedida após o toque no botão.

No início, em larguras até 600 px e num ambiente compatível, quem ainda não ativou os alertas recebe o popup **A tua liga chama por ti.** O convite apresenta jogos, cartas e lembretes, e usa o mesmo processo de ativação do painel. **Agora não**, Escape ou fechar adiam o convite sete dias por conta e origem; a sessão também evita repeti-lo. O convite desaparece ao concluir a ativação e não substitui outro diálogo já aberto.

No iPhone/iPad sem instalação, o botão orienta primeiro a instalação. Quando a permissão está bloqueada, apresenta instruções para a permitir. Não pede autorização automaticamente ao mostrar o popup nem ao receber uma mensagem do ADMIN. A aplicação instalada também tem um convite compacto no início quando pertinente.

| Plataforma  | Requisito                                                                               |
| ----------- | --------------------------------------------------------------------------------------- |
| Android     | Browser compatível, permissão do site e alertas do navegador/app permitidos no sistema. |
| iPhone/iPad | iOS/iPadOS 16.4 ou posterior; instalar no ecrã inicial e abrir a app instalada.         |
| Computador  | Browser compatível e permissões do site e do sistema operativo.                         |
| Servidor    | Par VAPID correspondente, funções/regras pertinentes publicadas e subscrição válida.    |

Instalar a PWA e ativar notificações são ações diferentes. **Enviar teste** cria uma notificação só para o dispositivo atual, com intervalo mínimo de um minuto entre testes. **Desativar neste dispositivo** remove a subscrição e o registo; não altera a preferência de outros dispositivos.

## Entrega, leitura e recuperação

- `onNotificationPush` processa novos documentos ainda por ler. Registo e reconexão recuperam notificações elegíveis dos últimos sete dias; não repetem entregas concluídas.
- O fornecedor pode conservar entregas até sete dias, segundo o TTL. Com a app fechada, navegador e sistema gerem a entrega; não há polling da aplicação em segundo plano.
- Com a app visível, a recuperação é verificada a cada dez segundos, ao regressar à app e ao recuperar rede. Os pendentes são sincronizados em páginas de 100.
- O worker usa tags estáveis, recibos persistentes e a revisão da mensagem para evitar duplicados. Ignora mensagens expiradas, já lidas ou pertencentes a outra conta.
- Tocar abre apenas um destino permitido da aplicação e confirma a leitura. **Marcar como lida**, quando suportado, confirma sem abrir a página.
- Sem rede, a intenção de leitura fica em IndexedDB por conta. O worker volta a tentar ao abrir a app, recuperar ligação ou através de Background Sync quando disponível. Uma leitura antiga não consome uma revisão posterior da mensagem.
- Ler na app fecha os alertas locais. Outros dispositivos abertos reconciliam em tempo real; dispositivos fechados reconciliam ao reabrir. Não são enviados pushes silenciosos para remover alertas remotamente.
- Terminar sessão ou desativar limpa os alertas e badges locais. O badge depende do suporte da plataforma.

Poupança de bateria, modo Não incomodar, permissões do sistema e políticas do navegador podem atrasar ou silenciar alertas. O texto pode aparecer no ecrã bloqueado conforme as opções do utilizador.

## Diagnosticar uma falha

1. Confirmar que a mensagem aparece no sino da conta certa.
2. Confirmar ativação, permissão do site e permissões de notificações do navegador/app no sistema operativo.
3. Usar **Enviar teste**. Uma mensagem de configuração indisponível indica que o servidor rejeitou o par VAPID antes de criar o teste.
4. Verificar a correspondência das chaves, sem imprimir a privada:

```powershell
npm.cmd run setup:push
node scripts/setup-push.mjs --verify-cloud
```

5. Se o segredo cloud foi alterado, confirmar que `pushDeviceAction` e `onNotificationPush` foram republicados para usar essa versão. Seguir o [procedimento seletivo](deployment.md).
6. Se o servidor confirma o envio mas o alerta não aparece, verificar o fornecedor, estado da subscrição, definições do sistema e um aparelho real.

A verificação local preserva o par existente. Se uma cópia do repositório tiver apenas a chave pública, recuperar a privada correspondente de forma segura; não rodar chaves para contornar a ausência do segredo. Numa instalação inteiramente nova, o script pode criar o par quando ambas estão ausentes.

## Servidor e proteção

| Função                  | Responsabilidade                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `pushDeviceAction`      | Registar, remover, testar e sincronizar o próprio dispositivo.                               |
| `onNotificationPush`    | Entregar, controlar concorrência, repetir falhas transitórias e retirar endpoints expirados. |
| `ackPushNotification`   | Confirmar uma revisão específica através do recibo e capacidade enviados no push encriptado. |
| `cleanupPushDeliveries` | Limpar diariamente recibos expirados, em lotes limitados.                                    |

O registo exige conta ativa, origem permitida, endpoint de fornecedor conhecido e chaves válidas. Há um limite de dez dispositivos por conta. O teste e o envio validam a chave privada e a sua correspondência com a pública.

`pushDevices` e `pushDeliveries` não são acessíveis pelo frontend, incluindo ADMIN. A capacidade de leitura tem 256 bits, é limitada a uma revisão e expira ao fim de 30 dias. Não concede consulta de dados nem operações noutras notificações. Os logs classificam a falha sem guardar o segredo nem o corpo da mensagem.

A pública está em `js/push-config.js`; a privada pertence a `.secret.local` e ao Firebase Secret Manager como `WEB_PUSH_PRIVATE_KEY`. O valor do segredo é apenas a chave, sem prefixo `WEB_PUSH_PRIVATE_KEY=`, aspas ou outros conteúdos. Git, exportação, Hosting e pacote de Functions excluem o ficheiro local privado.

## Publicar uma correção do segredo

Com autorização e acesso ao projeto:

```powershell
npm.cmd run setup:push:cloud
npx.cmd firebase deploy --project pedalinhas-cards --only "functions:peladinhas:pushDeviceAction,functions:peladinhas:onNotificationPush"
```

Acrescentar `npm.cmd run deploy:frontend` quando mudou o cliente. Publicar regras ou restantes funções apenas quando também mudaram ou numa instalação nova. O [guia de publicação](deployment.md) descreve esses âmbitos.

Uma mudança de domínio/subpasta exige rever `allowedPushScope` em `functions/push.js` e o endpoint permitido em `js/push-worker.js`. Uma nova origem exige nova ativação dos dispositivos; mudar apenas o repositório Git não tem esse efeito.

## Validação e estado registado

```powershell
npm.cmd run test:push
node tests/push-home-prompt.mjs
node --test tests/push-config.test.js
```

Os testes do worker cobrem alertas com app aberta e sem clientes abertos. Os testes de interface cobrem permissão por gesto, subscrição, teste, leituras, desativação, troca de conta e orientação iOS. O teste do popup cobre adiamento, acessibilidade, larguras 320/390/768/1440 e ativação. Os emuladores verificam envio simulado e privacidade; não comprovam a entrega através de Apple/Google.

Na intervenção registada em **17 de outubro de 2026**, o segredo cloud incompatível foi substituído pela privada correspondente ao par local e a comparação posterior passou. Não foi registado nessa intervenção o deploy das duas funções nem um teste de entrega num aparelho físico. Este é um registo histórico, não uma consulta permanente do estado de produção. O relatório histórico citado nessa intervenção não está disponível nesta cópia; confirmar novamente o estado cloud pelo procedimento acima, sem tomar esse registo como prova de entrega atual.

## Missões dos percursos e contexto do próximo jogo

O resumo em Missões e no início apresenta a missão escolhida para o próximo jogo e liga diretamente a `#/missions/path/{nodeId}`. A indicação de estado, prazo e votos nessa interface vem da tentativa; o relógio apresentado não decide o apuramento. A documentação e os testes dessa interface estão na [referência dos percursos](../reference/player-paths.md) e no [relatório local](../reports/path-interface-2026-10-19.md). A verificação de transporte push continua a exigir o procedimento próprio deste guia.


## Mensagens do ADMIN

Em ADMIN > Mensagens, escolher jogadores de um jogo (titulares e suplentes), jogadores selecionados ou todos os jogadores ativos. A contagem e os nomes mostram os destinatários antes do envio. Contas desativadas não recebem. O servidor confirma a seleção; o resultado conta notificações gravadas, não entregas push confirmadas. [Validação de 20/10/2026](../reports/admin-messages-2026-10-20.md).
