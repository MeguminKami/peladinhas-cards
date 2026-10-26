# Manutenção e operações

A área **Administração → Manutenção** centraliza regras globais e ferramentas operacionais. Jogadores, jogos, avaliações, eventos, mensagens, apoio, temas e pesos OVR continuam nas áreas existentes. As ferramentas de manutenção reutilizam os mesmos cálculos, recompensas e automatizações.

## Organização

| Área           | Operações disponíveis                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Páginas da aplicação | Início e cartas, Jogos, Avaliações, Missões e caminhos, Eventos e votações, Jogadores, App e notificações. Rascunho conjunto, simulação e publicação. |
| Recompensas    | Consulta de entregas, pendências, revogações e exportação.                                                                           |
| Automatizações | Estado das tarefas, falhas, limites de pedidos e execução manual das tarefas existentes.                                                 |
| Diagnóstico    | Inconsistências, referências órfãs, cartas em falta e sinais de votação a rever; pré-visualização e recálculo por jogador, jogo ou liga. |
| Acessos        | Capacidades administrativas e recuperação de conta com revogação de sessões.                                                             |
| Histórico      | Versões, autor, motivo, alterações agendadas/canceladas e auditoria pesquisável. Uma versão anterior pode tornar-se um novo rascunho.    |
| Recuperação    | Agendamento de backups Firestore, restauro numa base separada, acompanhamento da operação, exportação e limpeza controlada.              |

## Configurações com efeito real

Os valores iniciais estão em `js/system-policy.js`. Não é necessário criar documentos manualmente. A ausência de configuração mantém os valores de compatibilidade. O formulário e a validação do servidor usam o mesmo esquema; campos desconhecidos e combinações inválidas são rejeitados.

- **Recompensas:** teto temporário por atributo e por prémio, teto permanente acumulado, orçamentos por jogador/dia, semana e mês e subtetos semanais para missões/eventos. Zero desativa um orçamento, sem desativar os tetos por atributo. Os orçamentos contam bónus de atributos efetivamente entregues, incluindo prémios antigos; não contam evolução normal por jogo. Os períodos usam Lisboa, semana civil iniciada à segunda-feira e mês civil. A política de excesso permite reduzir, rejeitar sem consumir a missão, ou adiar o prémio completo. Uma pendência não altera atributos; o processamento periódico tenta entregá-la uma única vez quando existir disponibilidade. Um teto permanente esgotado pode impedir a entrega indefinidamente.
- **Regras:** janela de edição de avaliações, mínimo comunitário para carta oficial, peso da autoavaliação, repetições, vencedores, votos e disponibilidade de prémios permanentes/mensais. A janela fica gravada na primeira submissão; avaliações antigas mantêm sete dias. Limites de criação são validados ao guardar desafios; não reescrevem desafios anteriores. Os limites globais de entrega são aplicados no momento do pagamento.
- **Progressão:** velocidade e ganhos/perdas máximos. Ausências não descontam atributos nem OVR; os antigos parâmetros de inatividade são ignorados. Os jogos usam a versão em vigor na respetiva data. Alterar hoje uma regra não reinterpreta jogos antigos. Recalcular usa o motor existente e preserva cartas fechadas.
- **Disponibilidade:** apenas consulta com aviso público, registos, jogos, avaliações, missões, eventos/votações e recebimento de recompensas. Os bloqueios são aplicados no servidor e nas regras das escritas diretas. Os administradores mantêm acesso às operações de recuperação.
- **Automatizações:** cartas semanais, desafios/expirações, coleções, lembretes e limpeza. Execuções têm estado, bloqueio de concorrência e registo de falhas. Desafios com erro são assinalados individualmente, permitindo processar os restantes.
- **Calendário:** dia da semana, hora e minutos de abertura e fecho das cartas, em Lisboa; meses por época/ano de coleção. A compatibilidade mantém quinta-feira às 12h e quarta-feira às 18h desde 21/10/2026, preservando o fecho histórico anterior às 12h. Alterações exigem publicação numa nova abertura futura; o botão «Usar próxima abertura» preenche esse instante. Alterações às coleções exigem uma fronteira futura comum dos períodos atuais. Os IDs continuam a usar semanas ISO e as cartas fechadas não são reabertas pelas novas definições. No salto de primavera, um horário recorrente inexistente avança para depois da mudança da hora; no outono usa-se a ocorrência mais tardia.
- **Notificações:** interruptor global, silêncio dos lembretes, quantidade diária, intervalo e atraso do primeiro lembrete pós-jogo. O silêncio e quotas referem-se aos lembretes; mensagens operacionais não são apresentadas como lembretes.
- **Proteção:** limites por operação/utilizador/minuto e limite total; App Check opcional para alterações callable; retenção de notificações lidas e estados antigos. A chave pública reCAPTCHA é configurada e testada antes de exigir App Check.

## Consultar os tetos de stats

Em **Início e cartas**, abrir **Tetos de stats e recompensas** para comparar jogos, missões, eventos e ETC. Missões e eventos também apresentam este resumo na sua página de configuração. Os valores seguem o formulário em edição; quando diferem, o resumo indica também o valor ativo. Alterar o rascunho não altera os pagamentos antes da publicação e entrada em vigor.

Distinguir a escala final 0–99, os ganhos/perdas por jogo, os bónus temporários acumulados, a soma por prémio temporário, os permanentes acumulados e os orçamentos por origem/período. O ETC tem teto permanente próprio de +15 por atributo e +25 a GR, independente do teto permanente partilhado por missões e eventos. Os orçamentos gerais também se aplicam ao ETC com contabilização própria. Zero nos orçamentos significa sem teto de orçamento, não ausência de limites por atributo.

### Rever o calendário antes de publicar

O resumo distingue o calendário ativo, a proposta por publicar e agendamentos futuros existentes. A sugestão automática de entrada em vigor acompanha alterações posteriores à abertura. Uma data preenchida manualmente é preservada e validada antes da confirmação; deve coincidir com uma abertura futura do novo horário, com mais de um minuto de antecedência. O botão «Usar próxima abertura» volta a ativar a sugestão automática. O sucesso distingue configuração agendada de configuração aplicada agora. A semana atual e cartas fechadas são preservadas.

## Persistência e segurança

`settings/system` contém a revisão e cronologia pública, sem segredos. Revisões antigas são compactadas em diferenças; as duas mais recentes mantêm configuração completa para as regras Firestore. `systemVersions` conserva versões completas privadas; `systemDrafts/{uid}` guarda o rascunho do autor. A publicação usa transação e revisão esperada, impedindo sobrescritas entre administradores. Só existe um agendamento pendente. Publicar elimina o rascunho, mas não modifica dados de jogadores.

`systemAudit`, `systemJobs` e `systemRateLimits` registam operações, tarefas e limites. Recompensas reutilizam `eventRewards`, incluindo os estados pendente e revogado. Os índices e regras necessários estão nos ficheiros Firebase existentes.

As permissões são verificadas em cada operação. Administradores sem lista de capacidades mantêm acesso total; uma lista restringe as áreas. Só administradores completos distribuem capacidades. É preservado pelo menos um administrador completo. Alterações de papel/estado em Jogadores reutilizam a operação segura do servidor. Recuperar uma conta exige autenticação recente, motivo, palavra-passe com pelo menos 12 caracteres e revoga as sessões existentes. Palavras-passe não entram na auditoria.

### Recuperação pelo próprio jogador

Além da recuperação manual em Manutenção descrita acima, **Jogadores → Reset password** permite autorizar o próprio jogador a escolher a nova password. Exige capacidade `access` e login do admin nos últimos cinco minutos. Um admin com capacidades limitadas não pode recuperar a conta de um administrador completo. Confirmar a identidade por um canal conhecido antes de entregar o código.

`passwordRecoveryAction` gera um código aleatório de uso único, válido por uma hora, ou revoga a autorização. Uma nova autorização substitui a anterior. O código só é apresentado nessa resposta; apenas o hash fica em `passwordRecoveries/{uid}`, sem leitura ou escrita direta pelo cliente, incluindo administradores. A password atual continua válida até concluir a recuperação.

No login, **Recuperar password** pede username, código, nova password e confirmação (6–128 caracteres, sujeita também à política Firebase Auth do projeto). `completePasswordRecovery` verifica autorização, validade e estado ativo, consome o código com exclusão transacional e atualiza a mesma conta Firebase Auth. Revoga sessões anteriores e atualiza `tokensValidAfter`; o cliente entra com a nova password. Perfil, jogos, cartas e avaliações conservam o mesmo UID. Ações são auditadas sem códigos nem passwords.

O endpoint público limita tentativas por IP e respeita App Check quando exigido. Se a alteração no Auth falhar, o código não volta a ficar utilizável: tentar o login com a nova password e, se necessário, gerar nova autorização. Uma operação interrompida em processamento bloqueia novas autorizações durante cinco minutos. Não é necessário migrar utilizadores nem alterar regras Firestore.

Publicação seletiva: `npm.cmd run deploy:frontend` e `npx.cmd firebase deploy --only "functions:peladinhas:passwordRecoveryAction,functions:peladinhas:completePasswordRecovery"`. A operação antiga de Manutenção mantém o seu comportamento.

O diagnóstico não aplica sanções automáticas. A limpeza mostra a quantidade antes de confirmar e elimina apenas notificações lidas antigas, contadores expirados e estados de tarefas concluídas antigos; preserva jogos, recompensas e auditoria. Exportações usam coleções autorizadas e paginação; não existe editor livre da base de dados.

## Backups e condições cloud

O painel chama a API real de backups Firestore com a identidade da função. São necessárias faturação e permissões IAM adequadas para listar backups, gerir agendamentos e restaurar. A configuração cloud não é criada implicitamente. Consultar a [documentação de backups](https://firebase.google.com/docs/firestore/backups) e [permissões Firestore](https://firebase.google.com/docs/firestore/security/iam).

O restauro cria **outra base de dados** e devolve uma operação consultável. Não troca a aplicação para essa base. Um backup Firestore não inclui contas Firebase Authentication nem ficheiros Storage. A exportação JSON é uma ferramenta de inspeção/portabilidade e não substitui recuperação de desastre. As operações cloud são rejeitadas explicitamente no emulador.

App Check exige registo do website e domínios no Firebase/reCAPTCHA; a chave pública pode ser publicada pelo painel antes de exigir tokens. A opção do painel protege as operações callable de alteração. A imposição adicional de App Check em Firestore/Storage é uma configuração própria da consola Firebase e requer preparar o arranque público da aplicação. Ver [App Check](https://firebase.google.com/docs/app-check/cloud-functions).

## Validação e publicação

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run test:maintenance
npm.cmd run test:rules
npm.cmd run test:backend
npm.cmd run test:maintenance:ui
npm.cmd run test:docs
npm.cmd run build:hosting
```

Os testes de manutenção usam Firestore, Authentication e Storage locais; nunca devem apontar para produção. O teste visual cobre 1440, 768, 390 e 320 px. O relatório datado distingue emuladores, interface e configuração cloud.

Para publicar a reorganização por páginas e o calendário configurável de 22/10/2026, usar `npm.cmd run deploy:maintenance-pages` e depois `npm.cmd run deploy:frontend`. O primeiro script enumera as 58 funções consumidoras dos módulos partilhados; não publica regras ou índices. [Validação e âmbito](../reports/maintenance-pages-2026-10-22.md).

Para obter os seletores da instalação inicial completa da manutenção, incluindo regras e índices:

```powershell
node scripts/maintenance-release.mjs
```

O comando acima apenas imprime os comandos de publicação. Executar os comandos impressos pela ordem indicada: índices, funções da codebase `peladinhas`, regras Firestore/Storage e frontend. As funções antigas também precisam de publicação porque importam os motores e proteções partilhados. Não é necessário recalcular semanas fechadas; ficam preservadas. Depois da publicação, validar IAM de backups, App Check, tarefas agendadas e entrega push num aparelho real.

A aplicação continua a representar uma liga por projeto Firebase. Gestão de múltiplas ligas exigiria isolamento de dados, regras e migração próprios. Não são apresentados valores de custo cloud estimados como faturação real. A cronologia pública tem uma margem de segurança de 850 KB; atingir esse limite exige migração planeada, sem apagar o histórico.

## Operação dos percursos v4

O catálogo v4 preserva propostas guardadas, conquistas e snapshots; não requer recálculo de semanas fechadas nem de dados existentes. Guardar uma nova configuração ou publicar CSS não deve ser usado para voltar a sortear propostas reveladas. Os tetos próprios dos percursos (+15 por atributo e +25 em GR), os orçamentos de recompensa e a pausa global continuam aplicáveis. Apuramentos e revisões administrativas seguem a [referência dos percursos](player-paths.md); os consumidores a publicar constam do [relatório v4](../reports/path-variety-2026-10-19.md#publicação-seletiva). A confirmação cloud é independente dos testes locais de interface.
