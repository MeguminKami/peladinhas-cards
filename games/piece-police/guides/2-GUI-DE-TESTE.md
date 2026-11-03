# Guia 2 — GUI de teste com todas as funcionalidades finais

> **Para o agente:** És responsável pela fase 2 de uma slot. A fase 1 já entregou o motor (`src/`), a configuração, o simulador e a documentação (`docs/matematica.md`, `docs/eventos.md`, `AGENTS.md`). Começa por ler esses ficheiros. A tua tarefa é um jogo **completamente jogável**, com todas as funcionalidades que a versão final terá: apostas, spin, velocidades, autoplay, compras, aposta extra, bónus, regras, histórico, ecrã inteiro, adaptação a qualquer ecrã, sessão e carteira. A apresentação é neutra: símbolos como blocos com texto, sem arte final nem animações elaboradas. Serve para analisar comportamentos. Também preparas os pontos de ligação onde as fases 3 (visual) e 4 (som) se vão encaixar sem mexer na lógica. **Não alteras a matemática.** Se encontrares um erro no motor, corrige-o em `src/`, acrescenta um teste, sobe a `MATH_VERSION` e assinala no relatório que o RTP tem de ser medido de novo.

## Input opcional do dono do jogo

```text
PASTA DO JOGO:
INTEGRAÇÃO: [standalone | casino Peladinhas | outro site]  (se vazio, usa o que está em docs/matematica.md)
SALDO DE TESTE INICIAL: [ex.: 10 000]
NOME DA MOEDA NA INTERFACE: [ex.: DJC]
VELOCIDADES: [ex.: Normal / Rápido / Ultra]
MERCADO REGULADO? [não | Reino Unido | outro]  (afeta turbo e tempo mínimo por jogada)
FUNCIONALIDADES EXTRA DE INTERFACE:
```

## 1. Ficheiros a criar

```text
game.html            a slot (uma única página que se adapta ao espaço)
ui/app.js            controlador: comandos, máquina de estados, percorre os eventos
ui/session.js        TestSession (saldo local) e HostSession (carteira do site)
ui/tempo.js          relógio único com velocidade (rate) para todas as esperas
ui/layout.js         escolhe o desenho e escala o jogo inteiro para caber
ui/kit/barra.js      barra de controlos PADRÃO (cópia sem alterações de games/guias-slot/kit/barra-controlos)
ui/kit/barra.css     idem
ui/tema-barra.css    tema da barra: nesta fase, vazio ou neutro (só variáveis --deck-*)
ui/fx-visual.js      ponto de ligação VISUAL (mínimo nesta fase; a fase 3 substitui)
ui/fx-audio.js       ponto de ligação de SOM (sem som nesta fase; a fase 4 substitui)
ui/debug.js          painel de diagnóstico (só com ?debug=1)
ui/*.css             base.css, layout.css (sem tema; a fase 3 acrescenta theme.css)
scripts/serve.js     servidor local de desenvolvimento (só ficheiros estáticos)
pc.html, telemovel.html, site.html   páginas de pré-visualização (molduras de tamanhos e simulação do site)
tests/*.browser.js   testes Playwright
docs/estrutura-ui.md
```

Usa HTML, CSS e JS com ES modules, sem build, no mesmo estilo da fase 1. O jogo importa o motor diretamente de `src/index.js`.

## 2. Separação de responsabilidades

- **O motor decide, a interface apresenta.** A interface nunca sorteia, nunca calcula prémios e nunca deduz acontecimentos comparando grelhas. Percorre `step.events` por ordem.
- **A sessão é o único ponto que movimenta saldo.** `app.js` pede à sessão para iniciar uma jogada e receber passos. Não mexe no saldo diretamente.
- **Pontos de ligação.** Para cada evento, `app.js` faz:

```js
fx.audio.play(evento, ctx);              // não bloqueia
await fx.visual.play(evento, ctx);       // a apresentação decide quanto tempo demora
```

  `ctx` dá acesso à grelha do DOM, às células, ao modo atual, à velocidade, ao `tempo` e a funções de atualização do HUD. Nesta fase, `fx-visual.js` faz apresentação mínima e legível (secção 4) e `fx-audio.js` não faz nada, mas regista o evento no painel de diagnóstico. As fases 3 e 4 substituem estes ficheiros mantendo a mesma assinatura. Documenta a assinatura e o `ctx` em `docs/estrutura-ui.md`.
- **Relógio único (`ui/tempo.js`).** Todas as durações no código estão em **ms da velocidade Normal**. A velocidade só muda o `rate` do relógio. Expõe `wait(ms)`, `animate(el, keyframes, {duration})` (Web Animations registadas, cujo `playbackRate` acompanha o `rate`) e `rate`. Mudar de velocidade a meio de uma animação é contínuo. Nada usa `setTimeout` ou `setInterval` diretamente.

## 3. Máquina de estados

Implementa estados explícitos e testa as transições:

```text
PRONTO → A_PEDIR (sessão.start; débito único) → A_APRESENTAR (passo n: eventos por ordem)
      → [ENTRADA_BÓNUS → FREE SPINS (passo n+1…) → RESUMO_BÓNUS]
      → A_CONFIRMAR (crédito do prémio) → PRONTO
Erros: SALDO_INSUFICIENTE, CARTEIRA_PENDENTE (repetir o mesmo id), ERRO_FATAL (mensagem + recuperar)
```

- O estado matemático, a liquidação na carteira e a apresentação são coisas separadas. O motor pode já ter terminado o bónus enquanto o ecrã ainda mostra o último free spin.
- Recarregar a meio, incluindo a meio de um bónus, retoma no passo confirmado sem sortear de novo.
- Durante uma jogada ficam bloqueados: mudar aposta, compras, aposta extra e renovar seed. Ficam ativos: volume, regras, velocidade e ecrã inteiro.

## 4. Apresentação neutra (o mínimo legível)

O objetivo é perceber tudo o que acontece sem arte:

- Cada célula mostra o ID e o nome curto do símbolo, com uma cor de fundo por categoria (normais em tons frios, premium em tons quentes, wild e scatter com contorno forte). A célula mostra também o multiplicador quando existir.
- Os eventos de prémio contornam as células vencedoras e mostram o valor da combinação. As cascatas tiram e põem símbolos com um fade curto. Os poderes destacam o alvo e escrevem o nome do poder.
- Há uma faixa de texto (ou o registo do painel de diagnóstico) que descreve cada evento por extenso: «Cluster de 7 × P3 = 1,20 × 2 = 2,40».
- Durações curtas, sempre via `tempo`, para o fluxo ser visível em Normal e quase instantâneo em Ultra.
- Os overlays (entrada de bónus, retrigger, resumo, ganho grande, limite atingido) são caixas simples com o texto certo, os números certos e o botão CONTINUAR.

## 5. Controlos e funcionalidades obrigatórias

Tudo tem de funcionar de verdade. Nada de botões falsos.

**A barra por baixo do tabuleiro não se desenha de raiz.** Usa a barra padrão de `games/guias-slot/kit/barra-controlos/` e segue o README dela:

1. Copia `barra.js` e `barra.css` para `ui/kit/` sem as alterar.
2. Monta a barra com `createControlDeck(...)` e liga os callbacks ao jogo: spin, aposta, autoplay, velocidade, volume, regras e sons de interface.
3. Informa a barra com `setBalance`, `setWin`, `setCost`, `setState`, `setTurbo` e `setExtraActive`.

A barra já traz o saldo, o ganho, as regras, o silêncio e as barras de Música e Efeitos, o − RODAR +, a aba e a janela do Autoplay, a velocidade e os três desenhos. Os itens abaixo dizem o que o **jogo** tem de fazer por trás de cada controlo e o que fica fora da barra (coluna lateral, faixa de estado, janelas). Se faltar alguma coisa à barra, **não a alteres na cópia**: descreve a falta no relatório. A melhoria é feita no kit e passa para todos os jogos. Confirma no fim com `node games/guias-slot/kit/verificar-kit.mjs <pasta-do-jogo>`.

- **HUD:** saldo, aposta, custo efetivo (quando há aposta extra), ganho do spin, ganho total da jogada, `free spins A / B` (A jogados, B total, atualizado nos retriggers), multiplicador global e progresso do poder (ex.: barra de XP), se existirem.
- **Aposta:** − / + e escolha direta numa lista. Bloqueada durante uma jogada.
- **SPIN:** carregar durante uma jogada acelera ou salta a apresentação desse spin (secção 6). Nunca cria uma fila de spins.
- **Velocidades:** Normal / Rápido / Ultra, guardadas nas preferências.
- **Autoplay:** painel ancorado ao botão, com quantidade (10 em 10 até 100, depois 100 em 100 até 500), iniciar e parar. Usa o mesmo comando do spin manual. Só os spins pagos contam para o lote. Parar termina depois da jogada atual. Pausa nos overlays que pedem confirmação e não retoma depois de um reload.
- **Compras de bónus:** janela com cada bónus, preço calculado para a aposta atual, descrição curta e confirmação. Se for possível mudar a aposta dentro da janela, os preços atualizam-se.
- **Aposta extra / Hunt / Ante:** interruptor com o custo real visível e um estado ativo inequívoco.
- **Regras:** painel com separadores, gerado **a partir da configuração** (tabela, pesos/raridade, multiplicadores, preços), nunca escrito à mão. Explica pagamentos, wild, scatter, poderes, bónus e compras, com exemplos de cálculo. Mostra a `MATH_VERSION`.
- **Histórico:** últimas jogadas com hora, aposta, custo, modo, prémio e versão. Clicar numa abre os passos e os eventos.
- **Som:** já existem música, efeitos e silêncio (barras e botão), guardados nas preferências, mesmo que nesta fase não haja som. A fase 4 só os liga.
- **Ecrã inteiro:** botão próprio. Esconde-se onde a API não existe (Safari no iPhone).
- **Movimento reduzido:** respeita `prefers-reduced-motion` e tem um interruptor nas definições.
- **Saldo insuficiente, carteira em espera e erros:** mensagens claras, sem perder a jogada.

## 6. Ritmo, teclado e turbo

- **ESPAÇO:** é interpretado num único sítio. Se houver um overlay aberto, ESPAÇO = CONTINUAR. Se não, ESPAÇO = spin. Os campos focados (sliders, selects) têm prioridade.
- **Proteções:** 500 ms mínimos entre avanços de overlays, e a mesma tecla nunca passa para o ecrã seguinte. 100 ms mínimos entre comandos de spin. Ignora a repetição automática do teclado. As mesmas proteções valem para rato e toque.
- **Toques durante um spin:** o 1.º acelera esse spin 3× de forma suave, o 2.º acelera 8× e deixa a jogada seguinte pronta a arrancar, o 3.º salta o resto da apresentação desse spin (só desse spin, nunca do bónus inteiro).
- **Turbo automático:** dois toques em 1,2 s, ou um toque até 0,7 s depois do fim de uma jogada, fazem a jogada seguinte correr em Ultra, e o botão de velocidade mostra «Turbo». Ao fim de cerca de 1,8 s sem toques volta à velocidade escolhida. Manter o ESPAÇO premido dá turbo contínuo.
- **Mercados regulados:** constantes no topo de `app.js`, `MIN_CYCLE_MS`, `TURBO_ALLOWED` e `HOLD_TO_SPIN`. Para o Reino Unido: 2500 ms, `false` e `false`.
- **Arranque imediato:** ao tocar no spin, a grelha começa logo a sair enquanto o pedido segue para a carteira. Assim a latência fica escondida.

## 7. Sessão e carteira (`ui/session.js`)

Duas implementações com a mesma interface: `balance`, `start(request)` e `step(roundId, index)`.

- **TestSession** (pré-visualizações e standalone): saldo local de teste, motor no próprio browser e seed criada uma vez por sessão. Renovar a seed é uma ação explícita, só entre jogadas.
- **HostSession** (dentro de um site, ex.: casino Peladinhas): ativa com `game.html?wallet=host&parentOrigin=<origem>`. Fala com a página-mãe por `postMessage` num canal com versão (`<jogo>:v1`) e com os pedidos `connect`, `start` e `step`. Cada pedido leva um id idempotente: `roundId` para o `start` e `roundId-index` para cada `step`.
  - O `start` debita o custo uma única vez. O prémio é creditado quando o último passo é entregue.
  - Pede `withFirstStep: true` no `start` para poupar uma ida e volta. Enquanto apresenta o passo n, pede já o passo n+1.
  - Valida a origem e a janela de cada mensagem. Nunca usa `postMessage('*')`.
  - Um timeout conserva o pedido pendente e repete-o com o **mesmo id**. Só desiste perante uma rejeição definitiva da carteira.
  - O saldo mostrado fica retido até ao fim da contagem do prémio. Publica-o em `html[data-casino-balance]` para o cabeçalho do site não mostrar o prémio antes do tempo.
- Cria uma página de teste com uma **carteira simulada** (latência configurável, ex.: 150 ms, e falhas injetáveis) para testar o HostSession sem o site real.
- Integração no casino Peladinhas: segue o modelo da Princesa Sofia (`games/princesa-sofia/INTEGRACAO.md`, `js/casino-sofia-host.js`, `js/casino-sofia-local.js`, `scripts/build-casino-sofia.mjs`). O motor corre do lado do site, dentro da carteira local partilhada, e o jogo só apresenta. Se o pedido incluir a integração, implementa os ficheiros equivalentes para este jogo e um teste `test:casino:<jogo>`.

## 8. Adaptação ao ecrã — nunca há scroll

- O jogo é desenhado numa largura de referência e escalado por inteiro (`transform: scale`) para caber no espaço disponível. Os símbolos nunca deformam (`object-fit: contain`).
- **Três desenhos**, escolhidos pela forma do espaço: `landscape` (computador, coluna lateral + grelha + barra de controlos), `portrait` (telemóvel ao alto, grelha a toda a largura, saldo/ganho grandes, spin grande) e `compact` (espaço baixo e largo, como telemóvel na horizontal ou 1366×768 com o menu do site: grelha ao centro e controlos numa coluna à direita).
- Escala máxima de 1,6. Quando o jogo encolhe, os rótulos pequenos são reforçados para nunca ficarem abaixo de cerca de 9 px reais, e os botões pequenos ganham uma área de toque invisível de pelo menos 40 px reais.
- Telemóveis: `viewport-fit=cover`, margens seguras, `text-size-adjust: 100%`, sem zoom por duplo toque.
- **Teste obrigatório sem scroll** (documento e barra de controlos, em widget e em ecrã inteiro): 1920×1080, 1440×900, 1366×768 com menu de 86 px, 1280×720, 390×844 vertical e horizontal, 360×640, iPad vertical e horizontal, e uma janela estreita de 320 px.
- O tabuleiro e os controlos ficam próximos, sem faixas vazias entre eles.

## 9. Painel de diagnóstico (`?debug=1`)

É o que torna esta GUI útil para analisar comportamentos. Nunca aparece no modo normal.

- **Seed:** ver, definir e renovar.
- **Cenários forçados** vindos de `scenario()` do motor: entrada em cada bónus, retrigger, cada poder, ganho grande, limite atingido, grelha sem prémios e outros que façam sentido. Marcados como forçados, nunca liquidam saldo do site.
- **Registo de eventos** em tempo real, com o JSON do passo atual e do estado.
- **Passo a passo:** pausa depois de cada evento e avança à mão.
- **Simulação rápida** de N jogadas num Web Worker, com RTP, frequência de bónus e prémio máximo. Serve para confirmar que o browser usa o mesmo motor da fase 1.
- **Desempenho:** FPS, tarefas longas e latência da carteira por pedido (também com `?perf=1`).

## 10. Testes de browser (Playwright)

No mínimo, `tests/prototype.browser.js` cobre:

- Todos os botões e janelas abrem, funcionam e fecham. Teclado (ESPAÇO e proteções de 100/500 ms) e toque.
- Uma jogada base, uma compra de cada bónus até ao resumo, um retrigger e o limite atingido, via cenários forçados.
- O saldo mostrado bate certo com a sessão depois de cada jogada. O ganho mostrado é igual à soma dos eventos.
- Reload a meio de um bónus retoma no passo certo sem débito duplicado. O HostSession com latência e com falha de rede repete com o mesmo id.
- Autoplay: conta só spins pagos, para corretamente e pausa nos overlays.
- Sem scroll em todos os tamanhos da secção 8, em widget e em ecrã inteiro.
- Nenhum erro na consola.

## 11. Entregáveis

1. `game.html` e `ui/` jogáveis, com TestSession e HostSession, e a barra padrão ligada (`verificar-kit.mjs` sem erros).
2. Pontos de ligação `fx-visual.js`, `fx-audio.js` e `tempo.js` documentados em `docs/estrutura-ui.md`.
3. Painel de diagnóstico, páginas de pré-visualização e `npm run dev` (servidor local) no README.
4. Testes de browser a passar, mais os testes do motor da fase 1.
5. README atualizado com comandos, URLs locais e o que publicar.

## 12. Relatório final

Responde com: URL local e comandos, lista das funcionalidades com o estado de cada uma (feita e testada / feita sem teste / em falta), tamanhos de ecrã verificados (com capturas guardadas em `test-results/`), comportamentos estranhos encontrados no motor (com o cenário que os reproduz), alterações feitas a `src/` (idealmente nenhuma) e limitações.

## Erros comuns a evitar

- Calcular ou corrigir prémios na interface.
- Usar `setTimeout` soltos: mudar a velocidade a meio deixa de ser contínuo e o som desalinha.
- Fazer de ESPAÇO uma fila de spins, ou deixar o mesmo toque fechar um overlay e lançar o spin seguinte.
- Esconder o overflow (`overflow: hidden`) sem garantir que tudo cabe. Isso não resolve o scroll, só esconde controlos.
- Escrever as regras à mão, para depois ficarem desatualizadas quando a matemática muda.
- Esconder o painel de free spins antes de terminar a última celebração do bónus.
