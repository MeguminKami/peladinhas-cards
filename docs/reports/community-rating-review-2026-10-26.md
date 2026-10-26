# Avaliações da comunidade · exclusão e revisão única · 26/10/2026

## Comportamento implementado

A média dos 12 atributos externos na escala 0–20 tem de ser pelo menos 1,9 para a avaliação contar. Valores inferiores são totalmente excluídos da média, da contagem válida e da elegibilidade comunitária reconstruída para a coleção. A média exatamente 1,9 é aceite, incluindo valores decimais. A regra é exclusivamente de comunidade: a autoavaliação inicial e o feedback dos jogos mantêm as regras anteriores.

O limiar só existe no módulo de servidor [`community-rating-policy.js`](../../functions/community-rating-policy.js), fora dos assets públicos. Os avisos não revelam o limiar, a média ou o motivo numérico. O autor recebe:

> A tua avaliação de X precisa de revisão e não está a ser considerada. Revê os atributos para refletirem melhor aquilo que observaste em campo. Tens mais uma oportunidade para a submeter.

O perfil do autor mostra o pedido, e o perfil do jogador avaliado mostra o estado apenas ao próprio autor da avaliação. Existe também uma missão de revisão e uma notificação privada com ligação para o formulário. A notificação é atualizada no mesmo ID em vez de gerar duplicados; a sincronização de missões não cria uma segunda notificação para o mesmo pedido.

## Tentativas e edição

- A primeira submissão excluída recebe `reviewAttempts: 1`, estado `required`, um token de revisão e uma janela com a duração de edição configurada, sete dias por omissão.
- O prazo começa no pedido de revisão, permitindo uma oportunidade efetiva também para votos antigos cujo prazo original já terminou. Não altera a data original de submissão.
- Guardar alterações ou sair do formulário guarda apenas um rascunho. Numa avaliação já submetida, o rascunho não substitui os valores que estão em cálculo. É preciso carregar em **Concluir** ou **Submeter revisão definitiva**.
- A segunda submissão fica com `reviewAttempts: 2`: `accepted` se for válida, `ignored` se continuar excluída. Fica bloqueada em ambos os casos.
- IDs de submissão tornam as repetições de transporte idempotentes; o token impede que uma submissão antiga em duplicado consuma acidentalmente a revisão. Transações impedem duas revisões simultâneas.
- O pedido nunca aceita raterId ou contadores do cliente como autoridade. A autoria vem da sessão. As regras Firestore proíbem criar, editar ou apagar avaliações diretamente pelo browser. A correção administrativa normal também não reabre avaliações já sujeitas ao processo de revisão; o autor tem de concluir o seu processo.

As gravações passam pelo callable [`communityRatingAction`](../../functions/community-ratings.js). O frontend não decide se a nota passa no filtro. O formulário final fica bloqueado e a mensagem indica se a revisão conta ou foi excluída, sem revelar o mínimo.

## Avaliações existentes e histórico

`aggregateCommunity`, o cálculo das cartas, as referências reconstruídas de jogos e a elegibilidade da coleção usam o mesmo filtro. Ao recalcular a liga, as avaliações antigas excluídas são sinalizadas uma única vez e recebem a janela de revisão. Repetir o recálculo não renova o token/prazo nem dá outra tentativa. Não são apagados documentos nem alteradas cartas de semanas fechadas.

As cartas abertas podem recuperar OVR quando deixam de incluir votos excluídos, como os votos a zero encontrados na auditoria. Esta atualização não foi executada na base de dados real neste trabalho.

## Validação local

- `npm.cmd test`: **202 testes passaram**, incluindo a fronteira 1,9, médias de atributos diferentes, exclusão de rascunhos/incompletos, privacidade do aviso e bloqueio após revisão.
- **Cinco testes de integração no emulador** passaram: primeira exclusão, rascunhos, revisão válida ou excluída, tentativa extra bloqueada, repetição idempotente, concorrência, revisão de voto antigo, bloqueio de atalhos administrativos e preservação de carta fechada.
- **38 testes de regras Firestore** passaram, incluindo leitura privada e bloqueio de escritas diretas e de reinício dos contadores.
- `npm.cmd run test:community-review`: perfil privado, formulário com prazo novo, rascunho sem consumo e formulário final bloqueado; três temas a 320/390/768/1440 px. Capturas de desktop e telemóvel inspecionadas.
- Sintaxe dos módulos verificada; documentação validada com `npm.cmd run test:docs`.

Não foram feitos pedidos a Firestore/Storage real, deploy ou recálculo real nesta implementação.

## Publicação

O plano acumulado foi atualizado para **64 Functions**, incluindo `communityRatingAction`, as Functions que agregam a comunidade, geram/reconstroem cartas e elegibilidade, os consumidores partilhados e a cache/missões do início. Também exige `firestore:rules` e frontend. Storage e índices não mudaram.

```powershell
npm.cmd run deploy:updates -- --plan
npm.cmd run deploy:updates
```

O modo `--plan` imprime todos os comandos `npx.cmd firebase deploy --project pedalinhas-cards --only "…"`, sem contactar a cloud. Como a lista de Functions mudou, iniciar o plano completo; não reutilizar o número de retoma de uma versão anterior do plano. Os detalhes e seletores estão no [plano acumulado](deploy-updates-since-fusions-2026-10-26.md).

Depois de publicar, executar **Recalcular liga** na administração para excluir votos antigos dos agregados e emitir os avisos. Até esse recálculo, agregados já guardados podem continuar a refletir o estado anterior. Cartas fechadas permanecem intactas.
