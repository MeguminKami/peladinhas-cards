# Escolhe o teu caminho!

[← Documentação](../README.md) · [Catálogo atual](path-mission-catalogue.md) · [Conceitos das cartas em código](../../js/path-card-designs.js) · [Validação da interface](../reports/path-interface-2026-10-19.md)

Referência do código local em 19 de outubro de 2026. Implementação e validação locais; publicação não executada. A atualização de variedade está descrita no [catálogo atual](path-mission-catalogue.md) e no [relatório v4](../reports/path-variety-2026-10-19.md).

## Escolher e preparar

A entrada própria em **Missões** mostra o percurso, a missão atual e o seu estado. Abre `#/missions/path`, também acessível pelo botão no próprio perfil. O seletor só abre por ação do jogador: **Escolher o meu caminho** ou **Mudar caminho**. Mostra apenas ícones e nomes dos atributos; recompensas e limites ficam no percurso e no tutorial. Explorar mostra uma especialização; **Ativar caminho** confirma a identidade escolhida. **Como funciona**, ao lado da ação principal, abre o tutorial visual.

São 12 especializações independentes. Cada uma tem 15 nós, ou 25 em Guarda-redes, agrupados em capítulos de cinco. Não há ramos Consistência/Ousadia. Os nós mostram avanço, estado e recompensa. Mudar de vista não substitui uma missão preparada; escolher outra proposta antes da abertura substitui a preparação sem perder progresso.

Cada nó revela três propostas guardadas pelo servidor. Sair, trocar de dispositivo ou consultar outra escolha não as volta a sortear. Após apuramento ou cancelamento de uma tentativa jogada, as propostas consumidas são retiradas e o conjunto seguinte dessa escolha é gratuito. Remover uma preparação conserva as propostas e o avanço.

## Risco, raridade e reroll

### Variedade no próximo jogo

O catálogo inclui participação em GR/DEF/MED/ALA/AV, não perder, avaliação geral, média entre critérios e comparação estrita («mais de»), além dos golos, assistências, contribuições, vitórias, golos da equipa e limite de golos sofridos. Cada modelo mantém ligação ao atributo do percurso e pode combinar requisitos por **E**. A média permite compensação entre os critérios selecionados; os mínimos individuais apresentados em separado continuam obrigatórios. Cada critério da média também exige sete votos válidos. A posição é a registada no jogo; uma posição diferente cancela a tentativa sem perder progresso. A exclusão «Não foi à baliza» continua a impedir a validação de GR, mesmo numa média.

As variantes de totais, sequências e médias de vários jogos do editor do admin convergem para requisitos do **único próximo jogo**: não contam jogos antigos, não há acumulação entre tentativas e não se inventam sequências dentro de um jogo. Não são sorteados objetivos de perder, empatar ou terminar sem sofrer golos. A correção defensiva de 20/10 também atualiza propostas guardadas e preparações sem jogo associado; preserva tentativas congeladas, pendentes, concluídas, recompensas e progresso.

Novos sorteios usam propostas v4: 15 modelos por cada um dos 12 atributos e das três fusões, num total de 225. Nos níveis intermédio e superior, as quatro especializações com vitória isolada excluem esse modelo, mantendo 14 opções. Cada proposta guarda título, modelo, família, condições, avanço e raridade no servidor. As condições combinam-se por **E**; uma contribuição é a soma de golos e assistências individuais, sem contar lances distintos.

O sorteio procura três famílias de objetivo diferentes, evita modelos repetidos e condições equivalentes e não atribui menos avanço a uma alternativa que implique todas as condições de outra. Admite repetição de família como fallback quando não existem três famílias compatíveis. As últimas três famílias de tentativas congeladas por percurso têm menor peso; o reroll reduz também o peso das famílias e modelos substituídos. São preferências, sem bloqueios nem saldo extra de reroll. A preparação, a lista de condições e a gestão mostram o objetivo completo; a lista de tentativas mostra votos por critério e o resultado regista cada condição.

As propostas normais dão 25%, 50% ou 100%. A terceira tem 4% de probabilidade de Ícone/150% e 1% de Ultimate/200%. As superfícies e os emblemas usam as raridades existentes. O avanço é explícito na proposta: a raridade não decide boosts nem altera as outras missões/eventos.

A dificuldade usa os pontos permanentes efetivamente entregues por esta origem, incluindo fusões: fundamentos até +4, evolução desde +5 e fase final desde +10. A fase final pode propor 4 golos ou 4,5★ no desafio superior. Assistências isoladas não ultrapassam duas; Atitude tem parâmetros próprios. Os parâmetros de golos individuais, combinações, contribuições, golos de equipa e sofridos estão centralizados em `js/path-difficulty.js`, com uma revisão datada nas novas propostas. São provisórios, calibrados sobre dois jogos; não há adaptação automática durante o jogo. Consultar o [procedimento de revisão](../guides/path-calibration.md) e a [análise de 19/10/2026](../reports/path-goal-calibration-2026-10-19.md). Objetivos de missões/eventos criados manualmente conservam as metas configuradas pelo administrador.

Existe **um reroll por jogador e dia de Lisboa**, partilhado por todos os percursos e focos. Só renova o trio escolhido, exige propostas já reveladas e preserva os outros trios e o progresso. Renovar o trio da preparação remove essa escolha, para escolher novamente entre as novas propostas. A meia-noite de Lisboa repõe o saldo, incluindo mudanças de horário de verão. Pedidos concorrentes não permitem gastar mais de um.

## Abertura e fecho do próximo jogo

A missão preparada fica congelada quando o próximo jogo do jogador passa a **aberto**. Não se usa a hora agendada para adiar o bloqueio. Preparar, substituir, remover ou renovar fica bloqueado enquanto o jogador participa num jogo aberto. Consultar outros percursos continua possível.

`gameAction` abre o jogo e move a preparação para `pending` na mesma transação. A preparação lê também o registo `gameFlow/open`, pelo que pedidos concorrentes não permitem escolher depois da abertura. Não existe parâmetro para reservar um jogo posterior. Se não havia preparação, não se inventa uma para esse jogo.

Só pode existir um jogo aberto na liga. Rascunhos são ilimitados; jogos fechados em avaliação não ocupam essa vaga. A gestão mostra o nome e ligação do outro jogo aberto, conservando a possibilidade de guardar rascunhos. O servidor protege aberturas concorrentes. Jogos antigos já abertos não são fechados automaticamente: a gestão precisa de os resolver antes de abrir outro.

Uma participação acrescentada depois da abertura só pode congelar uma preparação que já existia antes dela. Preparações posteriores não contam retroativamente. Um jogo já usado não é reutilizado, incluindo quando o histórico compacto deixa de o mostrar; o índice privado `pathGameLinks` preserva essa associação.

No fecho, objetivos sem avaliações apuram imediatamente, incluindo combinações de golos, assistências, contribuições, vitória e golos da equipa. O servidor guarda os dados numéricos da tentativa e um hash dos dados completos do jogo. As contribuições individuais são compactas, evitando copiar extensas listas de marcadores para cada jogador. Qualquer avaliação na combinação faz a tentativa aguardar as 48 horas.

## Avaliações: 48 horas e sete votos

Uma missão que inclua avaliações aguarda **48 horas desde `closedAt`**, mesmo se já tiver sete votos. A interface mostra tempo restante e votos em cada critério. O relógio do navegador só apresenta a contagem; o servidor decide.

| Situação no instante das 48 horas | Resultado |
| --- | --- |
| Pelo menos sete votos válidos em todos os critérios, metas atingidas | Sucesso e avanço |
| Amostra suficiente, alguma meta falhada | Reinício apenas do nó em tentativa |
| Menos de sete votos em qualquer critério | Cancelamento sem perda do progresso anterior |

Não contam N/A, rascunhos, duplicados, valores inválidos, identidades fora da participação ou votos submetidos antes do fecho. Guarda-redes exige posição GR e respeita a autoavaliação N/A existente no instante de corte.

Nas propostas v4, não jogar a GR cancela sem penalização uma missão que exija essa posição. Isto aplica-se a todas as variantes de Guarda-redes e Fortaleza, incluindo as que só avaliam Defesa/Passe. Uma autoavaliação N/A de GR no corte também cancela. Nas missões mistas, falta de votos em qualquer critério cancela mesmo quando uma condição numérica já falhou. Propostas anteriores conservam os seus avaliadores.

`feedbackAction` escreve o voto e uma revisão completa imutável na mesma transação, com timestamp de commit do servidor. A correção administrativa também usa esse registo. A primeira edição de um voto anterior ao histórico conserva uma baseline da versão antiga.

O apuramento reconstrói a última versão de cada voto até ao corte, não o agregado atual. Edições ou submissões posteriores podem continuar a contar para o resto da aplicação, mas não mudam esta tentativa. Um processamento atrasado é idempotente e mantém o mesmo corte. Depois do prazo, a interface mostra **A apurar resultado** até à resposta do servidor.

Após fechar o jogo, pode preparar-se outra missão num nó disponível, enquanto as anteriores ficam imutáveis em avaliação. Os nós que uma tentativa pode afetar, incluindo eventual excedente, ficam reservados. A falta de votos não obriga a gastar um reroll para continuar.

## Avanço e recompensas

Cada nó termina nos **100%**. Todo o excedente percorre os seguintes da mesma especialização ou combinação; pode concluir vários nós numa tentativa. Nunca atravessa para outra stat nem desbloqueia uma fusão por saltar requisitos. No último nó, o excedente é registado e explicado sem gerar pontos adicionais.

Cada nó concluído tem uma entrega própria, estável e única: no máximo +1 por atributo, até três atributos diferentes. Vários nós concluídos significam várias entregas; o teto e os orçamentos consideram as entregas anteriores da mesma transação. Falhar reinicia só o nó tentado; cancelar ou remover preparação não apaga progresso.

Os limites próprios são **+15 em cada atributo de campo e +25 em GR**, somando todas as rotas e fusões deste sistema. As outras origens não consomem esta margem. A stat apresentada continua limitada a 99. Os orçamentos periódicos e as pausas globais continuam aplicáveis. A antevisão indica +0 quando já não há margem; a carta final continua conquistável.

## Fusões e focos

Ao conquistar o marco 5 de uma especialização, aparece a possibilidade de melhorar a outra. Com os dois marcos, **Unificar e ativar** substitui as duas entradas de origem por uma entrada no seletor, preservando todos os dados.

| Fusão | Origens | Carta |
| --- | --- | --- |
| Atacante completo | Finalização + Passe | Dupla Ameaça |
| Fortaleza | Defesa + Guarda-redes | Fortaleza |
| Motor criativo | Resistência + Visão de jogo | Dínamo |

Dentro de cada fusão há três focos: as duas especializações individuais e a combinação. A combinação tem cinco nós com missões híbridas. Não salta etapas nem torna obrigatória a evolução do outro atributo para continuar uma rota individual. Pontos das três opções partilham o mesmo acumulado de cada stat.

## Cartas permanentes

As 15 cartas mantêm os IDs existentes. Todas têm [conceito próprio em código](../../js/path-card-designs.js), silhueta, composição vetorial, material e motivos individuais; não são apenas recolorações. A antevisão explica o conceito. A revelação usa movimento específico da edição e respeita redução de movimento.

A especialização entrega a carta no nó 15, ou 25 em GR; a combinação entrega-a no quinto nó. A carta é permanente e não atribui stats ocultas. O prémio especial não duplica uma carta já conquistada. Aparências antigas recebem o desenho revisto sem retirar a conquista.

## Migração e revisões

Os IDs antigos, ofertas, avanços, entregas e cartas continuam reconhecidos. Propostas guardadas são atualizadas para `proposalVersion: 3` sem sortear novamente metas, raridades ou percentagens. Todas as tentativas ainda por apurar passam à validação de sete votos/48 horas; as antigas já associadas a um jogo são movidas para `pending`, sem poderem ser substituídas por uma nova preparação. Conservam a associação, a meta, a percentagem e uma cópia da proposta anterior para auditoria. Se o prazo original de 48 horas já passou sem a amostra necessária, cancelam sem perder progresso; resultados já apurados não são reabertos. Mantém-se a elegibilidade anterior à carta da etapa 10/fusão quando aplicável.

A atualização v4 não converte propostas v3 nem as volta a sortear. Só propostas novas, incluindo rerolls autorizados, usam o catálogo v4. O estado continua na versão 1, com `recentPathFamilies` aditivo; os avaliadores e textos anteriores mantêm-se. Não é necessário recalcular dados existentes ou semanas fechadas.

Propostas antigas dos ramos alternativos continuam acessíveis numa secção recolhida do seletor. `PATH_VERSION = 1` continua compatível; `activePath`, `unifiedFusions`, `pending` e metadados são aditivos.

Correções dos dados do jogo colocam o percurso em revisão administrativa. Para uma tentativa ainda em avaliação, a decisão pode conservar o registo numérico do fecho e retomar o apuramento; para uma conquista já validada, conserva a conquista. A ação em `#/admin/paths` exige motivo e não permite editar pontos manualmente. Alterações normais dos votos posteriores ao corte não reabrem conquistas.

Os cálculos futuros das cartas abertas usam o novo teto. Não foi executado recálculo de dados existentes. Os snapshots de semanas fechadas continuam preservados pelo fluxo de `buildHistory`.

## Dados e publicação

- `pathStates/{uid}`: preparação, tentativas pendentes, focos unificados, propostas, nós e últimas 30 tentativas; histórico integral em `attempts` e ações em `audit`.
- `eventRewards`: entregas `source: "path"`, com IDs estáveis, recompensa configurada e efetiva.
- `gameFlow/open`: singleton privado de concorrência; `gameAudit`: alterações de ciclo pelo servidor.
- `games/{gid}/pathVoteRevisions`: versões privadas dos votos, inacessíveis pelo navegador, incluindo administradores.
- `pathGameLinks/{gid}/players/{uid}`: associação duradoura para revisão e proteção contra reutilização.

O cliente não escreve jogos, feedback, progresso, propostas ou entregas diretamente. Callables verificam identidade, capacidades, políticas, transições e dados. Triggers, a tarefa de cinco minutos e a atualização explícita retomam apuramentos pendentes.

Consultar [testes e publicação da atualização anterior](../reports/path-update-2026-10-18.md) e o [deploy seletivo da variedade v4](../reports/path-variety-2026-10-19.md). Para a v4, publicar Functions consumidoras e frontend; não houve alterações de regras ou índices nesta atualização. Se a atualização anterior também estiver por publicar, os seus requisitos continuam aplicáveis.

As antevisões das cartas explicam os requisitos de desbloqueio: concluir a 100% o nó 15 do atributo (25 em GR); nas fusões, conquistar o marco 5 nas duas origens, ativar a fusão e concluir os cinco nós de Combinação. Os conceitos artísticos estão em `js/path-card-designs.js`.

O nó selecionado expande dentro do mapa com estado, progresso, recompensa e propostas. Não existe um painel lateral separado; selecionar outro nó transfere a expansão e mantém o foco no título.

A missão preparada usa uma composição compacta com o tema da raridade. O cabeçalho reúne atributo, número/nome do nó, raridade e estado. O objetivo fica delimitado e identificado por **A tua missão · No próximo jogo**; metas únicas aparecem diretamente e combinações mostram todas as condições. Progresso do nó, avanço se cumprires e recompensa partilham uma faixa de apoio, sem anel grande nem painel lateral. O par **+1 Drible**, por exemplo, usa a mesma cor, fonte, tamanho e peso, à frente de **Recompensa do nó**, sem caixa própria. O texto redundante de entrega/excedente foi retirado deste bloco; a regra de entrega aos 100% mantém-se.

O apuramento aparece numa linha própria. **Se falhares** conserva ícone e título vermelhos; o rodapé mantém o ícone de informação, a regra **Podes mudar até à abertura do jogo, sem perder progresso** e as ações **Alterar missão** / **Remover escolha**. Tentativas congeladas apresentam o estado e prazo aplicáveis e não permitem alterar a escolha.

Em Missões e no resumo do início, o bloco fica detalhado apenas quando existe uma missão preparada ou pendente. Mostra objetivo, nó, raridade, progresso, avanço e recompensa; em avaliação, inclui estado e votos por critério. Sem tentativa, mantém a apresentação de descoberta. A ligação `#/missions/path/{nodeId}` abre diretamente o nó mostrado. Ao escolher, alterar ou remover a preparação, o resumo em memória é atualizado sem esperar pela renovação geral dos dados.

O cabeçalho «Escolhe o teu caminho» usa título destacado a negrito e o ícone do percurso à direita. Na lista de Missões e na seleção dos quatro itens do início, o percurso tem prioridade, seguido das avaliações, antes das restantes missões e eventos. Em Missões, «Calendário e histórico de eventos» fica no final da lista.

As ligações entre nós são setas de 24 px centradas no intervalo, sem invadir cartões nem esticar o traço à largura do mapa. Troços desbloqueados usam linha contínua; os bloqueados, tracejado. O mesmo desenho serve especializações e fusões. Para a apresentação final e os testes, consultar o [relatório de interface](../reports/path-interface-2026-10-19.md).


As propostas novas de 150% e 200% usam o mesmo pequeno degrau adicional sobre 100%: +0,25 estrela num requisito de avaliação (prioritário), ou +1 numa meta numérica ofensiva quando não há avaliações. Só muda um requisito; limites defensivos e posições mantêm-se. No teto, mais de 4,75 estrelas passa a pelo menos 5, nunca mais de 5. As duas raridades têm o mesmo degrau; propostas já reveladas e tentativas existentes não são agravadas.
