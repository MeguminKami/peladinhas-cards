# Avaliações na app instalada — 19/10/2026

## Queixa e evidência

Queixa de «não tens permissões» ao avaliar o último jogo na app instalada. Sem identificação do jogador nem captura/código do erro, não é possível associar a queixa a um pedido concreto ou inspecionar o worker desse aparelho.

Auditoria cloud apenas de leitura, concluída às 20:00 de Lisboa:

- `feedbackAction`, em `europe-west1`, está `ACTIVE`. Foi observada uma publicação em curso no início da consulta, concluída às 19:55 de Lisboa por uma execução externa a esta auditoria. Não foi executado deploy nesta investigação.
- Invocação do callable acessível ao SDK, com autenticação Firebase validada no handler. A política está normal, avaliações ativas e App Check não obrigatório. O nome frontend `callAdmin` é um wrapper de SDK, não uma exigência de perfil ADMIN para `feedbackAction`.
- Último jogo encerrado em 18/10/2026: dez participantes, zero perfis em falta/desativados; sete DBS, dois membros e um ADMIN. Existem 80 documentos de avaliações submetidas e um rascunho; não se conclui que as avaliações sejam de 80 pessoas diferentes.
- Na amostra dos logs recentes, 114 respostas HTTP 200 e 46 preflights 204. Uma consulta separada de HTTP ≥400 nos sete dias anteriores retornou zero entradas, sem paginação pendente. Uma tentativa anterior atingiu quota de leitura de logs; a consulta foi repetida com sucesso. A ausência de logs não prova o estado de um aparelho nem identifica um erro de Firestore.
- O `js/db.js` publicado usa o callable `feedbackAction` e não uma transação direta de escrita em feedback. O service worker publicado tem versão `20d2fbf80e43196f`.

## Avaliação

Não foi encontrado um bloqueio atual do callback para membros/DBS elegíveis. O dispositivo não é um critério de autorização; contam a conta autenticada, estado ativo, participação do autor e alvo, jogo encerrado, validade dos valores e janela de edição.

A principal hipótese é uma versão antiga em cache na PWA. O worker mantém HTML/módulos da versão instalada até a atualização ser ativada; uma versão antiga que ainda tente escrever feedback diretamente no Firestore recebe recusa, porque as regras atuais exigem o callable que grava também a revisão imutável. Essa falha não aparece como uma chamada recusada ao `feedbackAction`. Esta hipótese é coerente com a queixa na app e com o erro genérico, mas **não foi reproduzida no aparelho afetado nem confirmada como causa**.

Pedir atualização pelo aviso «A tua liga tem novidades» → «Atualizar», conservando escolhas ainda não guardadas. Depois repetir no jogo. Se persistir na versão atual, recolher jogador, hora e mensagem/código exato para cruzar a ocorrência, em vez de alterar permissões sem causa demonstrada. Não se alteraram regras, contas, votos ou configuração cloud.

## Verificação local

- Dois testes dirigidos no emulador Firestore passaram. Um reproduz a composição de dez participantes do jogo (sete DBS, dois membros e ADMIN): todos guardam rascunho e submetem; ADMIN exterior ao jogo e conta desativada continuam recusados. Outro verifica GR não aplicável, valores completos e janela de edição. Os testes invocam o handler em emulador, não a sessão real do telemóvel.
- `npm.cmd run test:feedback` passou em Chromium com toque, larguras móveis, rascunhos, submissão e edição. Corrigida uma expectativa desatualizada do teste sobre o texto de «7 dias»: o texto atual explica que a janela não reinicia e a duração aparece dinamicamente.
- O teste do worker real valida em raiz e subpasta a manutenção de versão, atualização adiada e ativada, recuperação offline e exclusão de APIs privadas do cache. Foram corrigidos obstáculos das fixtures: convite push antes do fluxo de instalação, imports relativos do stub em subpasta e seletor duplicado de convite inline/popup. Estes ajustes não alteram a app publicada.

Ferramenta reutilizável: `node scripts/audit-feedback-access.mjs`; `--errors-only` evita a amostra geral e consulta apenas recusas HTTP, reduzindo leituras de logs. Só produz agregados e estado técnico; não imprime nomes, votos individuais ou tokens. Requer sessão Firebase autorizada.

Sem alterações de runtime ou publicação necessária. Não se afirma validação física em Android/iPhone.
