# Integração no casino

## Abrir o website de testes

As fixtures do servidor local persistem a confirmação da carteira entre abas, tal como o progresso guardado em IndexedDB. Uma confirmação de teste antiga que tenha perdido a sequência pode ser reconstruída a partir do último estado confirmado local, conservando o lote pendente e o saldo. Esta recuperação existe apenas nas fixtures; não altera o protocolo nem as validações da carteira publicada. Regressão: `node tests/casino-fixture-recovery.mjs`.

Na raiz do projeto, executar `npm.cmd run dev:casino` e abrir `http://localhost:8081/#/casino`. Escolher **GANZÁ → Jogar agora**. O comando prepara os jogos antes de arrancar o website com fixtures locais; não necessita de Firebase real. Os prompts das cinco peças estão em [PROMPT-MUSICA.md](docs/PROMPT-MUSICA.md).

A altura do iframe acompanha o espaço disponível sob o menu e as mudanças de orientação. Na horizontal com pouca altura, GANZÁ usa uma barra compacta com saldo e saída. Testado em 320×740, 390×844, 768×1024, 1366×768 e 844×390, incluindo aposta e verificação do resultado. O teste [website.mjs](tests/website.mjs) usa o website de fixtures em `http://127.0.0.1:8089`; aceita outra origem local em `GANZA_SITE_URL`.

O catálogo e a montagem estão em `js/casino-catalog.js`, `js/casino.js` e `js/casino-ganza-host.js` na raiz. Segue-se o modelo local da Princesa Sofia, sem novas Functions.

`node scripts/build-casino-ganza.mjs`, executado na raiz, prepara `assets/games/ganza/`. Está incluído em `build:casino` e, por consequência, na build de Hosting. O destino é verificado antes de limpar a pasta gerada. Não são copiados art-src, fotografias, revisão, testes, scripts nem relatórios.

## Carteira

O iframe abre `game.html?wallet=host&parentOrigin=<origem>`. Canal `ganza:v1`, pedidos `connect`, `start`, `settle`, cada um com ID idempotente. O host valida origem, janela de origem e ação. O iframe não importa Firebase e não é autoridade monetária.

O host usa `ganzaRequest` da carteira local partilhada. O redutor está em `js/casino-ganza-local.js`. O pedido start gera seed, fixa percurso e pagamento, guarda compromisso e debita. O settle credita o pagamento guardado. A escrita estrita em IndexedDB inclui saldo, pendências e recibo numa única transação. Falhas de gravação não publicam o estado novo.

A unidade é o cêntimo de DJC, como `DJABUCOIN.scale = 100`. Uma aposta visível de 1 DJC debita 100 unidades. As apostas novas são múltiplos de 100, de 100 a 1 000 000 unidades. Resultados pendentes antigos liquidam pelo valor guardado, sem voltar a calcular com novas tabelas.

Recibos dos últimos 512 pedidos permitem recuperar respostas perdidas sem duplicar dinheiro. Repetir o mesmo ID com valores diferentes falha. Connect devolve as bolas pendentes sem a seed. Reabrir retoma a apresentação. Não existe um máximo fixo de bolas pendentes; cada lançamento continua a exigir saldo e uma gravação durável do débito. A navegação não muda de jogo enquanto houver pendências. O movimento local no histórico identifica-se como GANZÁ.

O saldo local é publicado em `html[data-casino-balance]`, em unidades internas; o jogo não mostra uma segunda placa de saldo. A cada 30 segundos o host verifica o estado local e só tenta confirmar se houver movimentos pendentes, nenhuma bola por liquidar e nenhum envio em curso. Sem alterações, não faz pedidos de rede. A saída mantém o ciclo de confirmação/fecho existente. Ver [pipeline, recuperação e testes exigentes](docs/SINCRONIZACAO-CARTEIRA.md).

## Prévia e dimensão

Sem wallet=host, só existe carteira de teste local em localStorage, protegida por navigator.locks. Não é uma carteira financeira nem consulta dados reais. O iframe usa a altura disponível, sem scroll. Cabeçalho, controlos, histórico e saldo são HTML acessível. O tabuleiro é uma camada Canvas composta em WebGL, com fallback Canvas. O WEED usa atlas PNG com alpha.

Os testes de [integração](tests/integration.mjs) substituem db.js por fixtures locais e bloqueiam origens externas. Verificam recibos, alterações de payload, reload, saldo, histórico e o iframe real. Não comprovam configuração cloud ou publicação.
