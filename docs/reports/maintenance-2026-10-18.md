# Validação da Manutenção — 18 de outubro de 2026

Implementação local de configurações dinâmicas, limites de recompensas, disponibilidade, segurança, automatizações, diagnóstico, acessos, auditoria e recuperação. Referência funcional: [Manutenção](../reference/maintenance.md).

## Integração

- O cálculo de cartas, progressão, calendário, coleções, regras de eventos, votação e recompensas continua nos módulos existentes. O novo esquema parametriza esses consumidores.
- Recalcular reutiliza agregação e histórico existentes. Não altera snapshots semanais fechados.
- Os papéis de conta continuam em Jogadores, com alterações delegadas à operação segura do servidor. Não foi criada outra gestão de eventos, jogadores ou jogos.
- As escritas diretas continuam protegidas pelas regras Firestore/Storage. As operações callable carregam a política por pedido com isolamento assíncrono, permissões, quotas e verificação opcional App Check.
- Não há migração destrutiva nem necessidade de semear a configuração: o estado sem documento usa os valores iniciais. Novas coleções são criadas pelas operações autorizadas.

## Evidência local

| Verificação | Resultado |
| --- | --- |
| Sintaxe de módulos | Aprovada com `npm.cmd run check`. |
| Unidade e regressão de cálculos | 101 testes aprovados, incluindo reconstrução do histórico compactado, períodos, tetos, progressão e compatibilidade. |
| Backend existente | 46 testes aprovados em Firestore local: eventos, cartas, jogos, coleções, notificações e push simulado. |
| Regras Firestore | 34 testes aprovados: contas, propriedade, capacidades, edição, apenas consulta e sessões revogadas. |
| Manutenção e Storage | 14 testes aprovados com Firestore, Authentication e Storage locais; nenhuma omissão. |
| Interface | Rascunho, publicação, simulação, sete áreas, teclado e larguras 1440/768/390/320 px aprovados. Capturas de computador e telemóvel inspecionadas. |
| Documentação | Ligações locais verificadas com `npm.cmd run test:docs`. |
| Hosting | Build local de frontend/PWA concluído. |

Os testes de manutenção exercitam publicações concorrentes e versões obsoletas, isolamento entre pedidos, orçamentos partilhados, reclamações concorrentes, adiamento/entrega, bloqueios, proteção do último administrador completo, agendamento/cancelamento, simulação sobre agregados reais, exportação, retenção e recuperação de palavra-passe com autenticação real no emulador. Verificam a recusa de sessões antigas.

O runtime Java do emulador Storage apresentou uma exceção no encerramento, depois dos testes aprovados e da saída de sucesso. Não houve erro de asserção ou falha de operação durante os testes. Foram usados Node 24 e Java 21 localmente; o projeto declara Node 22 para Functions.

## Limites desta validação

Não foi executado deploy nem alterada a base cloud. IAM/faturação de backups, restauro de um backup real, domínios reCAPTCHA/App Check, execução cloud de Scheduler e entrega push num aparelho físico exigem verificação no projeto publicado. Backups Firestore não incluem Authentication/Storage; restauro não muda a ligação da aplicação.

A revisão posterior removeu o sistema de experiência de participação: configuração, níveis nos perfis, consultas e exportações, processamento no servidor e permissões de leitura específicas. As recompensas de atributos continuam no motor existente. Foram repetidos os 101 testes unitários, os 48 testes de regras/manutenção/Storage e a verificação da interface nas quatro larguras, além de sintaxe, documentação e build.

Mantém-se uma liga por projeto Firebase e os dias semanais existentes. As horas e duração das coleções são configuráveis com fronteiras de entrada seguras. Não foi criado um painel de faturação estimada ou um editor livre de documentos. Exportações muito grandes estão sujeitas às quotas configuradas e aos recursos do browser; para recuperação integral usar backups cloud.

A revisão foi preparada numa cópia isolada porque o caminho inicial da sessão apontava para a antiga demonstração. Os 52 ficheiros validados foram aplicados ao repositório principal `C:\Users\joaoc\Desktop\Projetos\peladinhas-cards` com verificação de hashes antes e depois da cópia, preservando alterações anteriores. Sintaxe, ligações da documentação e `git diff --check` foram confirmados novamente no repositório principal. Não foi executada publicação.
