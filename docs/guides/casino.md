# Casino e Djabucoin

[← Documentação](../README.md) · [Desenvolvimento](development.md) · [Publicação](deployment.md)

O salão vive em `#/casino`, sem ligações nos menus. O Hosting e o servidor local redirecionam `/casino` para essa rota. Isto esconde a descoberta da página; não é um controlo de acesso. Qualquer membro autenticado e ativo que conheça a rota pode entrar.

## Economia

Cada conta recebe **100 DJC uma vez**. Uma peladinha concluída em que a conta participe rende **20 DJC**, incluindo suplentes, sem depender da vitória. O crédito é atribuído pelo servidor na transição para `closed`, uma vez por jogador/jogo. Não há recálculo dos jogos anteriores nem alterações às semanas fechadas. Reaberturas, correções de resultados e eliminação posterior do jogo não retiram nem repetem créditos já atribuídos. Contas desativadas não recebem prémios.

Os valores são inteiros em centésimos: **100 unidades = 1 DJC**. A slot conserva as apostas originais: o mínimo de 20 unidades corresponde a 0,20 DJC. Não há depósitos, compras, transferências, levantamentos ou valor monetário.

O modelo está em [casino-economy.js](../../js/casino-economy.js). Os consumidores de servidor são `getCasinoWallet`, `settleCasinoSlot`, `casinoSession` e `onCasinoGame`, definidos em [casino.js](../../functions/casino.js). O protocolo de confirmação de sessões está em [casino-session-model.js](../../js/casino-session-model.js), consumido por `casinoSession`. Alterar cálculos partilhados exige republicar os consumidores afetados e o frontend. Mudar constantes não migra carteiras existentes automaticamente; qualquer migração deve ser explícita e nunca recalcular semanas fechadas.

## Atualizar a slot

A fonte publicada é `games/futebol`. A pasta `casino_temp` serve apenas para receber versões externas e não entra no deploy. Para alterações seguintes, editar diretamente `games/futebol`; ao importar uma nova versão, comparar e preservar `web/wallet.ts` e `web/host-sdk.ts`, que contêm o contrato da carteira local. Não substituir a pasta ativa sem reconciliar estes adaptadores.

Depois de integrar, executar `npm.cmd run check --prefix games/futebol`, `npm.cmd test --prefix games/futebol` e `npm.cmd run test:casino`. Publicar com `npm.cmd run deploy:frontend`, que volta a compilar a slot. Não é necessário publicar Functions para alterações apenas na apresentação ou nos assets da slot.

## Jogo independente

A slot fornecida foi movida de `casino_temp/Futebol-de-Bairro-Noite-de-Gloria` para [games/futebol](../../games/futebol/README.md). Mantém motor, arte, áudio, seed, RNG, bónus e testes próprios. Não se alterou a matemática 0.6.0; o RTP desta versão continua por medir. O SDK inclui aposta, modalidade, Bonus Hunt, snapshot completo seguinte e indicação de bónus concluído. O snapshot é entregue apenas ao host local, nunca ao servidor.

O salão monta `embed.html` pelo SDK `mountSlot`, carregado apenas ao escolher **Jogar agora**. Fechar, navegar ou mudar de identidade destrói a instância. Expandir/recolher usa o mesmo iframe. O SDK verifica origem, janela, jogador e canal; não envia tokens no URL. O jogador enviado ao iframe identifica o armazenamento local; o servidor usa exclusivamente `request.auth.uid` para autorizar a carteira.

Cada jogo futuro deve ter o seu próprio pacote estático, SDK/adaptador e contrato de liquidação. Blackjack e Roleta são, por agora, espaços de catálogo com informação e estado «Em breve», sem apostas.

## Chamadas e leituras

- Entrada: perfil e política globais, sem carregar a liga ou recalcular cartas. Primeiro recuperar confirmações pendentes; depois abrir/retomar uma sessão exclusiva de carteira em `casinoSession`. A política permite inicializar App Check numa entrada direta.
- Cada spin, incluindo FS: **zero chamadas ao servidor**. O SDK fala com o host local; saldo, totais de apostas/prémios e snapshot completo do jogo são guardados juntos numa transação IndexedDB antes de confirmar a jogada ao iframe. Não há lotes por quantidade de spins, polling ou temporizadores de gravação online.
- Bónus: uma confirmação após o resultado do último FS concluir a ronda, incluindo retriggers. Não guardar online a cada FS. A animação e o resumo visual não alteram o resultado já concluído.
- Saída: navegar na aplicação, fechar o jogo, ocultar o documento ou abandonar a página tenta sincronizar as alterações. Sair da rota/fechar a página também tenta libertar a sessão exclusiva; ocultar uma aba guarda sem libertar para manter continuidade. Regressar à aba verifica/recupera a carteira.
- Terminar sessão: o casino tenta guardar/libertar a carteira antes de remover a autenticação. Se a rede falhar, o pedido continua durável para a próxima entrada; não se impede o logout.
- **Atualizar saldo** é uma confirmação/consulta manual e atualiza o iframe sem o reiniciar. Filtrar jogos, consultar movimentos e expandir o iframe não fazem pedidos.
- Uma abertura nova ou confirmação usa quatro leituras no servidor: política, utilizador, carteira e documento da sessão; duas escritas: carteira e sessão. Repetir uma confirmação já aceite ou consultar uma sessão aberta usa quatro leituras e nenhuma escrita. São contagens estruturais sem retries do Firestore, não medições de faturação cloud.
- O prémio de futebol usa três leituras por participante (recibo, utilizador e carteira), e duas escritas quando o crédito é novo. Atualizações que não transitam para `closed` saem antes de qualquer leitura. Há retry do evento e recibo permanente contra duplicação.

A quantidade de chamadas depende de entradas, saídas, bónus concluídos e ações explícitas, não do número de spins. Por exemplo, 20 jogadores com uma sessão diária cada e sem bónus/ocultações adicionais fazem cerca de 40 chamadas de sessão, mesmo com 20 000 spins. Os pedidos auxiliares de autenticação/perfil/política e eventuais reenvios são adicionais.

A quota das alterações é mantida na própria carteira e usa o menor dos limites configurados por operação e total por minuto. Evita os documentos de rate limit separados usados noutras funções. Esta quota é local ao casino; não soma pedidos de outras áreas. Mantém autenticação, revogação, conta ativa, política global e App Check quando exigido. Modo apenas leitura bloqueia abertura/confirmação de sessões; progresso pendente conserva-se no dispositivo até ser possível confirmar. A consulta antiga `getCasinoWallet` permanece para compatibilidade, com três leituras e uma escrita de quota.

## Persistência e limites

O [controlador local](../../js/casino-local-wallet.js) guarda uma sessão por utilizador na base IndexedDB `peladinhas-casino`, store `sessions`. Cada gravação inclui saldo local, gastos/prémios acumulados, snapshot do motor, RNG, estado de bónus, revisão e última operação. A fonte da slot conserva a sua cache original em localStorage; o IndexedDB permite recuperar uma jogada já aceite pelo host mesmo quando o iframe não recebeu a resposta. Preferências sem movimentos monetários continuam na cache da slot.

`casinoWallets/{uid}` guarda o saldo confirmado, revisão, participação, quota, últimos 12 movimentos e `activeCasinoSession`. `sessions/{id}` guarda apenas a última sequência confirmada, totais acumulados, impressão digital, saldo aceite e estado aberto/fechado. Não guarda spins individuais, tabuleiros ou RNG. Os recibos antigos `operations/{id}`, os antigos metadados `slotStreams` e os recibos de futebol `matchAwards/{gid}` são conservados. Não ativar TTL em recibos de idempotência sem outro protocolo que impeça replays.

As regras existentes negam acesso direto a estas coleções, incluindo escrita por membros e administradores. Só as Functions acedem aos saldos. Uma sessão ativa impede outro dispositivo de abrir a carteira. Web Locks impedem duas abas de usar simultaneamente a carteira local. A sessão não expira nem liberta moedas automaticamente: sem receber o saldo final, o servidor não pode saber se houve perdas locais.

O host local verifica saldo **antes** de somar prémios, custos da aposta/compra/Hunt, ordem dos FS, teto de 10 000× por ronda e limites inteiros. O servidor verifica identidade, posse da sessão, sequência, totais inteiros não decrescentes e saldo final válido. Aplica apenas a diferença desde a confirmação anterior, preservando prémios de futebol creditados entretanto. Repetir a mesma sequência e totais não reaplica dinheiro; reutilizá-la com dados diferentes falha. A última confirmação de uma sessão fechada continua recuperável mesmo depois de outra sessão ser aberta.

O motor e o RNG continuam no navegador. **Estes controlos não provam que um prémio foi produzido por um motor intacto**; um cliente modificado pode fabricar resultados dentro dos limites. Esta é uma moeda de entretenimento, conforme o modelo local pedido. Uma economia competitiva resistente a fraude precisaria de validação/replay confiável ou motor no servidor, com outro custo e contrato.

A confirmação online é gravada em IndexedDB antes do envio e só é removida após guardar a resposta. Timeout ou resposta perdida conservam ID, sequência e totais; reentrar repete exatamente essa confirmação antes de abrir outra sessão. A rede não mantém o bloqueio de escrita local: novos spins podem ser guardados durante uma confirmação lenta, e a resposta não apaga esses movimentos posteriores. Não há reenvios periódicos automáticos.

Fechar o navegador não garante tempo para enviar. Nesse caso, o progresso continua local e será recuperado na próxima entrada no mesmo navegador/origem, sem novo sorteio. Não apagar IndexedDB, `:wallet-pending` ou os dados da slot para resolver erros. Perder ambos os armazenamentos antes de sincronizar pode perder progresso e deixar a carteira bloqueada para assistência; o servidor não possui esse snapshot. Uma entrada nova exige ligação para reconciliar a sessão. Uma sessão já aberta pode continuar a guardar spins sem rede.

Na atualização da primeira versão, um pedido antigo por spin é confirmado pelo endpoint antigo antes de abrir a nova sessão; bónus em curso conservam RNG e metadados de ronda. Depois de ativar `sessionProtocol: 2`, a API por spin só devolve recibos já aplicados e rejeita novas jogadas de bundles antigos, para não contornar a sessão exclusiva.

## Preparar e testar

Para trabalhar apenas no casino com **1000 DJC fictícios**, executar `npm.cmd run dev:casino` e abrir `http://localhost:8081/#/casino`. Este servidor usa fixtures, sem Firebase real. O saldo inicial aplica-se a uma carteira de teste nova; as jogadas seguintes conservam o progresso local. A porta 8081 separa este teste do desenvolvimento habitual na porta 8080.

O catálogo apresenta duas slots, Blackjack e Roleta. Só Noite de Glória está integrada; os restantes jogos continuam em preparação. A slot abre num ecrã dedicado, com uma barra compacta que reúne nome, saldo, atualização e os controlos Voltar/Fechar jogo. «Centrar jogo» alterna o enquadramento ao espaço disponível sem recriar o iframe nem reiniciar a ronda. O destaque de entrada está preservado em `js/casino-spotlight.js` para futura inclusão no início da aplicação; ainda não está montado nessa página.

### Capas dos jogos

Pedir a cada autor uma capa vertical **800 × 1200 px (2:3)**, em **WebP**, sRGB, fundo opaco, idealmente até **250 KB**. Entregar também o original PNG. A composição deve incluir a arte e o logótipo/nome do jogo, legíveis em miniatura, com margem segura de 8%. Evitar texto essencial no canto superior esquerdo, reservado ao estado do jogo. Não incluir botões, saldo ou etiquetas «Disponível»/«Em breve», que pertencem à interface. Usar nomes como `noite-de-gloria-cover.webp`, com o mesmo formato para a segunda slot, Blackjack e Roleta. A imagem horizontal atual de Noite de Glória é provisória e mantém-se inteira até receber a capa vertical.

Usar Node.js **24.16+** para a slot; o runtime Firebase das Functions continua em **22**.

```powershell
npm.cmd ci
npm.cmd ci --prefix games/futebol
npm.cmd run build:casino
npm.cmd run dev
```

Abrir `http://localhost:8080/#/casino`. O modo padrão usa fixtures e saldo fictício local; não consulta Firebase real.

```powershell
npm.cmd run check --prefix games/futebol
npm.cmd test --prefix games/futebol
npm.cmd run test:casino
npm.cmd run test:casino:backend
npm.cmd run test:docs
npm.cmd run build:hosting
```

O teste backend usa Java 21 e um projeto `demo-`, com Firestore 8188, hub 4488 e logging 4588, em [firebase.casino.json](../../firebase.casino.json). Não reutilizar um emulador de produção nem apagar dados de outro processo para libertar uma porta.

[build-casino.mjs](../../scripts/build-casino.mjs) compila o pacote e copia só o embed, SDK e assets para `assets/games/futebol`. Hosting executa esta preparação automaticamente. Fontes, documentação, demonstração e dependências da slot ficam fora do site. Os assets do casino são excluídos da pré-cache PWA para não descarregar o jogo ao instalar a aplicação; precisam de rede ao carregar. As builds são geradas e ignoradas no Git. A exportação do repositório inclui as fontes e os dois lockfiles.

## Publicar

Instalar primeiro as dependências da slot na máquina de publicação. Para a primeira publicação de todo o casino, publicar as quatro funções e depois Hosting:

```powershell
npx.cmd firebase deploy --only "functions:peladinhas:getCasinoWallet,functions:peladinhas:settleCasinoSlot,functions:peladinhas:onCasinoGame,functions:peladinhas:casinoSession"
npm.cmd run deploy:frontend
```

Não é necessária mudança de regras, índices, Storage ou recálculo histórico. Não usar deploy completo. Publicar `onCasinoGame` ativa os créditos em futuros fechos de jogos, mesmo que o salão continue fora dos menus. A publicação não foi executada durante o desenvolvimento; a verificação cloud e num aparelho real é um passo separado.

Se a primeira versão já estiver publicada, esta mudança exige apenas `casinoSession`, `settleCasinoSlot` (bloqueio de bundles antigos) e frontend. Não é preciso republicar `onCasinoGame` nem `getCasinoWallet` só para esta atualização.
