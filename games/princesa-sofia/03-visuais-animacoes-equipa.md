# Etapa 3 — Visuais e animações finais com três agentes

## Revisão de enquadramento e magia — 31 de outubro de 2026

Esta revisão substitui as descrições históricas de compra, XP e Wild abaixo.

- O widget usa a altura visível do navegador, descontando a sua posição e margem inferior. O cálculo de escala usa a altura da composição, sem incluir efeitos decorativos. O hover de Bónus mantém a geometria. A aposta no SPIN fica maior e a negrito.
- As introduções mantêm o ornamento PNG sobre a slot, com fundo próprio e texto maior dentro da zona central segura. Os nomes visíveis são Jardim Encantado, Baile ao Luar e Coroa da Aurora; a princesa deixa de representar qualquer bónus.
- A compra apresenta um spin simulado numa grelha completa, com entrada por colunas, contendo 3/4/5 Scatters. Depois as flores convergem ao centro e surge a introdução. A grelha é temporária: não altera resultados, saldo, probabilidades ou XP do motor.
- Os grupos de hits continuam a brilhar individualmente. Depois, todos os vencedores da cascata desintegram-se simultaneamente e enviam poeira para a barra de XP. A barra tem 22 px na composição e vibra com cores quando ativa a magia. Os novos Wilds entram sequencialmente, com poeira e uma fada que desaparece após cada colocação.
- [wild-emblem.png](ui/art/wild-emblem.png): novo PNG transparente, gerado com o pedido de uma gema hexagonal alongada de safira/ametista, centro azul profundo vazio, filigrana dourada e asas de fada violetas, sem texto ou pessoas. W/multiplicadores e a identificação WILD são texto sobreposto com contraste.
- [fairy-dust.png](ui/art/fairy-dust.png): PNG transparente gerado com uma fada a voar para a direita, asas e rasto cintilante em ciano, lavanda e dourado, sem rosto detalhado.
- [bonus-moon.png](ui/art/bonus-moon.png): edição do emblema lunar, removendo integralmente mulher, cabelo e vestido e substituindo-os por três pedras lunares azuis e estrelas; preserva crescente, lírio e transparência. Os três assets foram produzidos com a ferramenta integrada de geração de imagem.

Validação local: suite UI, suite de arte (incluindo widget em 1440×740, 1024×600, 390×568 e 640×240; fullscreen, menus e introduções) e suite de apresentação (hits sequenciais, dissolução conjunta, compra 3/4/5 sem alterar a grelha real e colocação sequencial de Wilds). Sem leituras cloud ou deploy.

## Revisão de hits, compra e legibilidade — 30 de outubro de 2026

Esta revisão substitui a apresentação de prémios/XP e as durações descritas nas secções históricas abaixo.

- Em `hits`, apresentar cada grupo individualmente, com brilho apenas nas posições desse grupo. O número tem apenas o montante recebido, sem unidade, rótulo, cálculo ou XP, na fonte temática; sobe e desvanece durante 1000 ms em Normal. Depois de todos os grupos, a remoção deduplicada de todos os vencedores acontece em conjunto na fase de cascata. Wilds partilhados participam em cada destaque sem desaparecer cedo.
- [payout-presentation.js](ui/payout-presentation.js) reparte apenas o crédito que o evento já autorizou, pela ordem dos hits, respeitando o teto. A diferença entre os arredondamentos acumulados preserva o crédito exato da sessão: a soma dos números dos grupos é igual à variação do ganho. Não altera o motor nem volta a creditar prémios. Grupos sem crédito efetivo não mostram um valor fictício.
- Removidos os rótulos de prémio, o aviso de XP, as partículas de XP e a celebração textual do ganho. A barra de XP continua a refletir o motor. Os flashes de entrada e de pares/cópias, e o brilho de antecipação no fim de spins sem gatilho, foram retirados.
- Entrada inicial do spin: 720 ms em Normal, com escalonamento por coluna; cascata: base de 500 ms. Rápido e Ultra conservam os fatores atuais. As animações de vitória, magia real e gatilho de bónus mantêm feedback próprio.
- Ao comprar comum/super/secret, [motion.js](ui/motion.js) mostra uma camada de apresentação com 3/4/5 flores a aparecer e convergir, seguida da introdução com Continuar. É uma simulação visual isolada: não escreve scatters no tabuleiro, não emite hits, XP, pagamentos ou um gatilho natural. O custo é cobrado uma vez e o motor entra diretamente nos free spins como antes.
- Scatter passa a incluir a palavra «Scatter» sobre a flor, incluindo na simulação. Wild mantém W/valor em primeiro plano, com ornamento branco/prata, cristal iridescente e traço temático escalável.
- Indicadores de próxima magia e spins têm fundos próprios. O ornamento PNG central recebe uma camada de fundo opaca com recorte arredondado, mantendo a apresentação sobre a slot. Todos os textos usam Cormorant Garamond local, reutilizado da arte tipográfica já existente no repositório e servido como WOFF2, sem pedidos remotos.

Verificação: `node --test tests/payout-presentation.test.js` (arredondamento e teto), `node tests/presentation.browser.js` (números sem labels/XP, hits sequenciais sem remoção prematura, simulações 3/4/5 sem modificar o board, fonte local e fundo da introdução), `npm.cmd run test:ui`, `node tests/art.browser.js` e documentação. O cenário local «Dois grupos» permite rever o comportamento no menu de demonstrações. A redução de movimento mostra o número estático, sem o deslocar. Acelerar fecha a contagem e o número flutuante, sem alterar valores.

## Revisão de cor e controlos — 30 de outubro de 2026

Pedido: distinguir os símbolos pela cor, aumentar Bónus e previsão de wilds, reduzir transparência do menu e tematizar velocidade. Os onze PNGs foram editados individualmente com `image_gen`; as variantes `*-color.png` em [ui/art](ui/art) são consumidas pela grelha e pelo catálogo através de [symbols.js](ui/symbols.js). As versões anteriores ficam preservadas. Não foram alterados IDs, raridades, pagamentos ou regras.

| Símbolo | Cor alvo predominante / pedido de edição |
| --- | --- |
| Sofia | Branco-pérola e azul-gelo no vestido/véu; reflexos de prata; rosto, sardas, sinais, pele e cabelo preservados |
| João | Azul-real/cobalto na capa e casaco, sombras azul-marinho, bordados dourados discretos; rosto preservado |
| Misty | Verde-esmeralda nas fitas e tecido, pelo branco/castanho e marcações preservados |
| Miffy 1 | Rosa-coral no vestido, sombras framboesa e rosas mais intensas; peluche branco |
| Miffy 2 | Laranja-tangerina nas riscas, tons de mel e creme no pelo, focinho mostarda |
| Folha | Verde vivo com sombras verde-floresta e orvalho claro; remover dominante rosa/dourada |
| Laço | Turquesa/ciano com dobras verde-petróleo e bordado prateado; substituir o rosa |
| Lua | Amarelo-dourado e mel, recortes âmbar e realces creme; retirar a dominante lavanda |
| Coração | Vermelho-rubi com facetas vinho e reflexos vermelhos; retirar o quartzo rosa pálido |
| Cristal | Violeta-ametista dominante com sombras índigo; reduzir o branco/dourado |
| Scatter | Fúcsia/magenta nas pétalas, bordos brancos e folhas verdes, estames laranja |

Prompt comum: editar apenas as cores do PNG fornecido, preservar geometria, desenho, textura, identidade e transparência; tornar a cor alvo dominante e legível a 64 px, sem redesenhar nem acrescentar molduras/texto. O prompt específico é a descrição da linha acima. Os rostos e o pelo usam cores naturais; a cor alvo aplica-se ao vestuário/tecidos. Modo utilizado: ferramenta integrada, não CLI.

Em [presentation.css](ui/presentation.css), o botão Bónus aumenta para 96×124 na composição larga e 84×110 em retrato, com ícone maior; a coluna lateral e a previsão de wilds acompanham o aumento. A barra de controlos fica aproximadamente 97% opaca, incluindo Hunt. O seletor de velocidade mantém os três estados e os nomes acessíveis, com estrelas, moldura curva e acabamentos rosa/marfim, azul e violeta para Normal/Rápido/Ultra.

Verificação: suite UI (widget/fullscreen, 320–1600 px e controlos), suite de arte (carregamento/transparência, menus e apresentações dos três bónus), revisão visual desktop/telemóvel e documentação. Sem deploy e sem leituras cloud.

## Produção integrada — continuação de 30 de outubro de 2026

O utilizador pediu explicitamente continuar a produção. Esta secção substitui as pendências da amostra histórica abaixo; não exige nova aprovação para continuar. A matemática, os IDs e as probabilidades mantêm-se.

- Premium completos em PNG transparente: P5 Sofia revista, P4 João (traços das duas fotografias), P3 Misty (marcações brancas/castanhas), P2 Miffy 1 (vestido rosa com rosas), P1 Miffy 2 (peluche creme com roupa laranja às riscas). Cinco normais substituídos por ilustração polida: folhas com orvalho, laço de seda, lua de marfim, coração de quartzo e cristal. O [catálogo visual](ui/symbols.js) mantém a ordem do motor.
- [Arte](ui/art): cenário de jardim ao pôr do sol/noite, logo oficial, quatro ícones de bónus com ornamentação crescente e um ornamento PNG transparente reutilizado nas entradas, conclusões e MAX WIN. Textos continuam HTML para legibilidade. Não há caixa ou fundo fullscreen nas apresentações; mantêm semântica modal e foco, posicionadas sobre o tabuleiro.
- [Layout](ui/layout.js): duas composições proporcionais, com expansão acima de escala 1. Células mantêm 1,18 em fullscreen; todos os controlos crescem com o jogo. Em retrato os controlos têm duas filas e a compra duas colunas. Regras em secções evitam uma página longa reduzida ou scroll.
- [Movimento](ui/motion.js): cascatas com remoção deduplicada, queda dos nós sobreviventes e entrada das substituições; convergência dos scatters comum/super/secret; percursos apenas para destinos reais de magia e subida apenas de multiplicadores que aumentaram. As coordenadas respeitam a escala da composição.
- [Apresentação](ui/presentation.js): entrada sequenciada antes de disponibilizar ações, prémios por grupo, contagens, partículas de XP, pares/cópias já gerados, feedback de liquidação, retrigger e patamares de celebração. Valores finais provêm do motor e da sessão; os efeitos não movimentam dinheiro.

### Cobertura e contratos de animação atuais

Todos os efeitos respeitam redução de movimento; o cenário e o brilho da magia pausam quando a página está oculta. Durações abaixo são normais; para rápido/ultra multiplicam por `SPEEDS` (0,32 / 0,035), exceto microinterações decorativas de 160–340 ms, que não bloqueiam o jogo. `Acelerar` cancela o movimento do tabuleiro e termina contagens no valor exato; mudar velocidade cancela a fase atual e aplica a nova velocidade às seguintes. A camada flutuante temporária limpa-se no final e no cancelamento.

| IDs / variantes | Evento / elementos e sequência | Duração normal | Final / cenários locais verificados |
| --- | --- | --- | --- |
| LOAD, ENTRY, ERROR | Descodificar todos os assets, logo/XP/moldura/lateral/controlos em sequência, símbolos por colunas, desbloquear | 520 ms + 300 ms | Pronto ou erro com jogo bloqueado; carregamento local e falha dirigida |
| N1–N5, P1–P5, W, S | `spin-start`, saída anterior, entrada/assentamento; especiais têm arte/brilho próprio e W mostra valor | saída 120 ms, entrada 260 ms com atraso por coluna | Todas as imagens carregadas e escalas verificadas; catálogo e preview incluem os dez |
| HITS, SPECIAL | `hits`, destaque dos participantes e valores dos grupos, contagem do total limitado pelo motor | brilho 400 ms, contagem 450 ms | Demonstração hit e MAX WIN; prémio de grupo identificado como anterior ao teto |
| CASCADE, PAIRS | `refill`, remover cada posição uma vez, conservar identidade dos sobreviventes, gravidade e substituições, pares emitidos pelo motor | 360 ms × fases 0,55 / 0,8 / 0,8 | Suite UI e teste dirigido contra `compactBoard`, escalas 0,5 e 1,6 |
| XP, MAGIC-BASE | `xp-gained`, partículas até barra, agregado; `magic` após queda, emissão, destinos reais, reset a zero | partículas 260 ms; magia 450 ms | Demonstração magia, limites e ordem cobertos por regressões do motor |
| MAGIC-COMMON/SUPER/SECRET | Nível e previsão seguinte, destinos reais, valores antigos → novos só nos W que sobem; regressa ao indicador seguinte | 450 ms, mensagem 1 s | Demonstrações e regressões dos três modos; sem animação fictícia para posições indisponíveis |
| SCATTER-COMMON/SUPER/SECRET | `bonus-start`, clones das flores convergem com rotação/brilho próprios, depois ornamento com ícone, spins e explicação | 650 ms + atrasos | Os três gatilhos naturais verificados em browser; originais conservados |
| BUY-COMMON/SUPER/SECRET | Compra com preço visível, introdução PNG e Continuar, sem distribuição de scatters fictícia | espera de confirmação | Compra/lock/settlement verificados; os três modos usam a mesma entrada parametrizada |
| FREE-SPIN, RETRIGGER, END | Contadores reais, `retrigger` converge flores e mostra +spins sem reset, resumo com total e spins reais, volta ao base | retrigger 400 ms, contagem final 700 ms | Comum/super/MAX WIN percorridos até fim; secret introdução e motor cobertos |
| WIN, MAX, BALANCE | `round-end` distingue zero ganho, ganho e patamares de 20× e 100×; MAX WIN termina conforme evento, contagem e saldo exatos | ganho 450 ms; saldo 400 ms | Patamares são apenas apresentação; saldo e crédito único nos 31 testes do motor/sessão |
| MENUS, HUNT, AUTO, SPEED, SOUND, FULLSCREEN, DEMO | Hover/foco/premido/disabled, Hunt âmbar, ícones por raridade, abertura, foco/Escape, controlos reais e adaptação proporcional | 160–340 ms | Suite UI: menus, teclado, autoplay/paragem, Hunt, volume, velocidades, demonstrações, fullscreen e redução de movimento |

Responsabilidade: principal (arte, integração, texto, testes); agente de tema (layout e CSS); agente de movimento (cascatas, scatters e magia). Abertura/fecho sem um efeito próprio continua a usar o comportamento nativo dos diálogos; os ícones têm entrada animada. O som permanece opcional e o volume está nos controlos, não num novo menu. Acessibilidade não depende do som.

### Produção de assets e prompts

Ferramenta integrada `image_gen`, um pedido por asset, guardado nesta pasta a partir do original gerado. Direção comum: PNG transparente, recorte orgânico sem moldura quadrada/redonda, pintura de conto anime suave, materiais detalhados, rosa/lavanda/marfim/dourado e luz de pôr do sol, leitura a 80–100 px. Os rostos humanos preservam as fotografias; a Sofia revista é referência de acabamento.

| Assets | Pedido específico / referências |
| --- | --- |
| `joao.png` | Busto do homem exato das duas fotografias, cabelo curto escuro, sobrancelhas, olhos, nariz, barba e bigode; casaco marfim, gola bordada lavanda e capa |
| `misty.png` | Cão branco e castanho da foto, orelhas pontiagudas, marcações preservadas, pose sentada e laço lavanda |
| `miffy1.png` | Coelho branco de peluche, olhos pontuais e boca X, vestido rosa com três rosas |
| `miffy2.png` | Peluche creme real, focinho mostarda, orelhas suaves e roupa laranja/branca com risca rosa |
| `n1.png`–`n5.png` | Folhas verde-sálvia com veios/orvalho; laço de seda rosa bordado; lua de marfim com estrela pendente; coração de quartzo; fragmento de cristal lavanda luminoso. Volume e textura, menos elaborados que personagens |
| `bonus-common.png` | Lírio rosa sobre ramo de madeira e pérolas |
| `bonus-super.png` | Lua de marfim, lírio e estrelas, ornamentação intermédia |
| `bonus-secret.png` | Coroa de cristal, lírios e fitas lavanda, ornamentação máxima |
| `bonus-hunt.png` | Bússola âmbar em estrela irregular, folhas verdes e flor central |
| `notice-frame.png` | Ramos de madeira curvos, pérolas, lírios, tecido lavanda e estrelas; centro e exterior transparentes para título/descrição/botão |
| `logo.png` | Texto exato «Princesa Sofia», Princesa pequeno e Sofia expressivo, marfim/dourado/lavanda com lírio e tiara |
| `scene.png` | Jardim encantado ao pôr do sol e noite estrelada, palácio distante, montanhas azuis/lavanda, ramos de madeira, flores e folhagem; sem interface |

Os PNGs ainda conservam resolução alta; não foi feita medição de fluidez num telemóvel físico nem certificação de desempenho. Não se declara cobertura visual exaustiva de todos os limites raros, apesar das regressões lógicas. Não houve cloud nem deploy.

Validações: `node --test tests/engine.test.js tests/session.test.js` (31 testes); `npm.cmd run test:ui`; `node tests/art.browser.js`; documentação com `npm.cmd run test:docs` na raiz do repositório. Screenshots de desktop, retrato, menus e apresentações foram revistos localmente.

## Amostra integrada — histórico de 30 de outubro de 2026

Estado: **amostra para feedback, produção completa pendente**. A etapa não está concluída. Direção: conto ilustrado, rosa/lilás/ivório, madeira rosada, ameixa para contraste e magia branca iridescente. A Sofia deve preservar o aspeto da mulher das fotografias, incluindo proporções, sardas e sinais; a primeira imagem idealizada foi substituída por uma versão com maior fidelidade. Confirmar a semelhança com o utilizador antes de multiplicar as ilustrações.

Executar `npm.cmd run dev` e abrir o endereço apresentado. Não há leituras cloud. O servidor local serve agora PNG e SVG. A matemática e os pagamentos não foram alterados.

### Inventário da amostra

| ID | Implementação / assets | Evento e sequência | Duração normal / rápido / ultra | Final, interrupção e acessibilidade | Verificação |
| --- | --- | --- | --- | --- | --- |
| ART-SOFIA | [Sofia revista](ui/art/sofia-v2.png), PNG transparente; P5 | Entrada e destaque na grelha; imagem com recorte próprio | Usa os efeitos abaixo | Mantém identidade P5 e pagamentos | PNG e aplicação inspecionados; falta feedback de semelhança |
| ART-SCATTER | [Lírio](ui/art/scatter.png), PNG transparente; S | Variante própria de brilho; destaque no gatilho | Usa SCATTER abaixo | Não muda contagem nem posição | Carregamento e demonstrações comum/super verificadas |
| ART-NORMAL | [Símbolos](ui/symbols.js), folha, laço, lua, coração, cristal | N1–N5, vetores simples para amostra | Usa os efeitos abaixo | IDs e hierarquia preservados | Grelha e escalas 320–1600 px verificadas |
| ART-PENDING | P1 Miffy 2, P2 Miffy 1, P3 Misty, P4 João | Apenas nomes provisórios, não arte final | Não aplicável | Não considerar produção concluída | Produção após feedback |
| UI-THEME | [Tema](ui/theme.css) | Logo tipográfico provisório, moldura, menus e Hunt âmbar | Botões 160 ms; XP 7 s ambiente | Redução de movimento remove transições; página oculta pausa ambiente | Desktop/telemóvel, widget/fullscreen, foco e Escape |
| LOAD | [Aplicação](ui/app.js) | Descodificar PNGs, entrada, desbloquear ações; falha mostra erro | Entrada 300 ms, redução imediata | Falha mantém ações de jogo bloqueadas; recarregar para repetir | Validado com assets locais e teste de falha dirigido |
| SPIN | [Movimento](ui/motion.js) | `spin-start`: entrada por coluna, assentamento | 260 ms × SPEEDS; atraso por coluna de 7% | Acelerar cancela; redução/ocultação termina no resultado exato | Suite browser; não inclui saída final da grelha anterior |
| HIT | [Movimento](ui/motion.js) | `hits`: brilho e pulso dos participantes | 400 ms × SPEEDS | Sem alterar crédito; acelerar cancela; redução imediata | Cenário hit e pagamentos/settlement |
| MAGIC | [Movimento](ui/motion.js) | `magic`: escala e brilho apenas nas posições colocadas | 400 ms × SPEEDS | Destinos do motor; sem inventar wilds; redução imediata | Cenário magia; falta percurso do emissor e evolução individual |
| SCATTER | [Movimento](ui/motion.js) | `bonus-start`: os scatters oscilam e brilham antes do aviso | 500 ms × SPEEDS | Sem antecipar o evento; redução imediata | Demonstrações comum/super; falta convergência e PNGs dos três bónus |

Responsáveis: principal (arte, integração e validação), agente de tema (CSS) e agente de movimento (módulo). Camadas: cenário, moldura, grelha, arte, efeitos; os movimentos decorrem dentro das células, sem recalcular resultados. As velocidades são lidas de `SPEEDS` em [session.js](ui/session.js); mantêm-se as pausas de apresentação existentes. Não há nova coreografia completa de cascatas nesta amostra.

### Arte e prompts usados

Ferramenta integrada `image_gen`, com as referências locais. [Primeira versão](ui/art/sofia.png) preservada apenas como variante descartada; não é consumida pelo jogo.

- Sofia revista: retrato recortado da mulher exata das fotografias 2, 3 e 5, fidelidade acima da estilização; preservar rosto oval alongado, sobrancelhas naturais, olhos castanhos de tamanho real, nariz, boca, sardas e sinais; cabelo castanho solto; expressão calma; vestido branco de gola alta, véu lavanda, tiara fina e cristal de magia; traço pintado com influência anime no vestuário; fundo transparente, sem moldura nem texto.
- Scatter: lírio rosa de seis pétalas com bordos brancos, estames dourados/laranja e folhas verde-sálvia, baseado na flor fornecida; pintura suave de conto anime, legível a 96 px, recorte irregular, transparência e brilhos discretos, sem texto nem moldura.

### Pendências reais

A lista obrigatória abaixo permanece por concluir: personagens P1–P4, arte final dos normais e logo, cenário ilustrado, ícones por raridade, avisos de bónus em PNG sobre a slot, explicações com catálogo visual, cascatas em três fases e identidade de sobreviventes, percursos da magia, evolução dos wilds, pares/cópias, contagens e celebrações graduadas, entradas/saídas e retriggers distintos dos três bónus, estados auxiliares e inventário de cobertura final. Os avisos atuais ainda são os diálogos do protótipo. Não confundir a amostra e os testes dos fluxos com cobertura final das animações.

Validação: `npm.cmd run test:ui` (grelha 320–1600 px, widget/fullscreen, paisagem 844×390, menus/foco, autoplay, Hunt, saldo, bónus/MAX WIN e redução de movimento); `node --test tests/session.test.js` (cinco testes). Revisão visual das capturas desktop e telemóvel. Não foi executado deploy.

## Contexto para o agente

Estamos na etapa final de uma slot criada de raiz. Na primeira etapa foram decididas e validadas as regras e a matemática, sem gráficos. Na segunda foi criado um protótipo básico para decidir áreas, posições, controlos, menus e apresentação das mecânicas.

Agora o utilizador vai fornecer o tema, imagens de referência e cores. A partir desse input, queremos **visuais e animações para todos os elementos e estados aplicáveis ao jogo**, com uma direção artística coerente.

Ler a especificação do motor, decisões e resultados matemáticos, o protótipo aprovado, o mapa de estados, o inventário de assets e o roteiro de animações. Consultar os [guias da etapa 1](01-logica-mecanicas-rtp.md) e [etapa 2](02-prototipo-visual-estrutura.md) para compreender o processo. Se faltarem entregáveis, esclarecer as lacunas antes de assumir decisões.

## Início e direção artística

- Se o tema, as imagens ou as cores ainda não tiverem sido fornecidos, pedir esses materiais antes de produzir a arte final.
- Interpretar as referências e apresentar uma proposta concreta: linguagem visual, paleta, tipografia, materiais, símbolos, ambiente e estilo de movimento.
- Explicar como a proposta se aplica à estrutura aprovada. Perguntar apenas sobre escolhas artísticas relevantes ainda em aberto.
- Mostrar uma amostra representativa integrada, incluindo movimento, para recolher feedback antes de multiplicar a produção por todos os elementos.
- Continuar a dar ideias e a discutir soluções com o utilizador durante a execução. Resolver detalhes técnicos autonomamente e confirmar alterações relevantes à direção aprovada.
- Preservar regras, pagamentos e probabilidades. Se uma ideia visual exigir mudar uma mecânica ou estrutura aprovada, explicitar a alteração e obter uma decisão antes de a implementar.

## Equipa obrigatória: agente principal e dois agentes em paralelo

Nesta etapa, o utilizador pede explicitamente uma equipa de três agentes. O agente principal deve criar dois agentes adicionais e distribuir trabalho em paralelo, depois de estabelecer a direção comum e os contratos necessários.

Distribuição inicial recomendada, ajustável ao projeto:

| Responsável | Trabalho |
| --- | --- |
| Agente principal | Direção artística, conversa com o utilizador, estrutura partilhada, integração, revisão e validação do conjunto. |
| Agente 2 | Arte e componentes visuais: símbolos, grelha, fundos, molduras, controlos, menus, painéis e variantes de estado. |
| Agente 3 | Movimento e efeitos: rotação e paragem dos rolos, prémios, mecânicas especiais, bónus, transições e microinterações. |

Antes do trabalho paralelo, combinar dimensões, âncoras, camadas, nomes de assets, interfaces de componentes, eventos, durações e propriedade dos ficheiros. Atribuir áreas de edição distintas para evitar conflitos. Partilhar referências e decisões com ambos; nenhum deles deve depender de conhecer a conversa original.

Os agentes colaboram quando houver dependências. O principal mantém-se responsável por integrar as entregas e resolver diferenças de estilo, desempenho e comportamento. Não basta juntar três resultados isolados.

## Anima??es obrigat?rias: o que tens de fazer

Esta sec??o ? uma ordem de produ??o, n?o uma lista de sugest?es nem uma descri??o do que j? est? pronto. **Tens de criar, integrar e verificar cada anima??o abaixo.** Uma pausa no c?digo, uma troca instant?nea de texto, uma imagem est?tica ou um prompt de arte n?o contam como anima??o final. As variantes sem movimento s?o alternativas de acessibilidade, n?o substituem a vers?o animada normal.

O ?mbito ? o jogo atual: grelha 6?5, grupos, cascatas, XP, magia, wilds, jogo base, Hunt e b?nus comum/super/secret. Parte de [ui/app.js](ui/app.js), [ui/prototype.css](ui/prototype.css), [ui/session.js](ui/session.js), dos eventos de [src/engine.js](src/engine.js) e da configura??o de [src/config.js](src/config.js). O prot?tipo indica os gatilhos; tens de produzir o movimento final, incluindo onde hoje s? h? atualiza??o de estado. Valores, limites, quantidades, pre?os e pagamentos v?m do motor: n?o copiar n?meros desatualizados de textos ou inventar regras para justificar um efeito.

### Entrada, ambiente e s?mbolos

- [ ] Tens de fazer a entrada do jogo: fundo, moldura, grelha, s?mbolos, XP, painel de magia e controlos aparecem numa sequ?ncia curta e coerente; s? disponibilizar a??es quando estiverem prontas.
- [ ] Tens de fazer a transi??o de carregamento para jogo pronto e o feedback de falha de carregamento, sem apresentar elementos em falta como se estivessem conclu?dos.
- [ ] Tens de fazer o movimento ambiente do cen?rio e os estados de repouso dos elementos tem?ticos que a dire??o art?stica aprovar. Mant?m os n?meros e controlos leg?veis; pausa efeitos cont?nuos quando a p?gina estiver oculta.
- [ ] Tens de fazer a entrada, assentamento, destaque vencedor e sa?da de **cada um dos dez s?mbolos regulares**, N1?N5 e P1?P5. Podes partilhar a t?cnica, mas tens de verificar todos os assets, escalas e recortes.
- [ ] Tens de fazer as variantes pr?prias de scatter e wild: entrada, assentamento, presen?a especial, participa??o no resultado e sa?da quando o motor a determinar. N?o tratar os s?mbolos especiais apenas como imagens regulares de outra cor.
- [ ] Tens de fazer a entrada e atualiza??o dos n?meros dos wilds, com ?rea leg?vel para valores grandes e sem tapar a sua identidade.

### Jogada, grupos e cascatas

- [ ] Tens de fazer a resposta ao Rodar: premir, aceitar a jogada, bloquear a??es incompat?veis e mostrar a passagem para Acelerar ou Parar auto conforme o estado real.
- [ ] Tens de fazer a sa?da da grelha anterior e a entrada da nova grelha em `spin-start`, com movimento por colunas e assentamento. A grelha final tem de corresponder ao evento; n?o gerar s?mbolos ou resultados adicionais para a anima??o.
- [ ] Tens de fazer o destaque de cada grupo em `hits`: identificar as c?lulas ligadas, salientar os s?mbolos vencedores e mostrar o respetivo pr?mio. Nos hits simult?neos, tornar todos os grupos compreens?veis, incluindo wilds partilhados, sem os remover antes da apresenta??o dos grupos que os usam.
- [ ] Tens de fazer a passagem do pr?mio dos grupos para o ganho acumulado, com contagem leg?vel e valor final exato. Distinguir o pr?mio apresentado do cr?dito efetivamente permitido pelo teto do motor.
- [ ] Tens de fazer a sa?da das posi??es vencedoras uma ?nica vez por c?lula, mesmo quando pertencem a v?rios grupos.
- [ ] Tens de fazer a cascata em tr?s fases vis?veis: remo??o, queda dos sobreviventes por gravidade e entrada dos s?mbolos de substitui??o. Preservar a identidade dos sobreviventes e terminar exatamente no tabuleiro de `refill`.
- [ ] Tens de fazer o assentamento ap?s cada cascata e a passagem ? avalia??o seguinte, repetindo a sequ?ncia completa enquanto existirem hits.
- [ ] Tens de apresentar os pares e c?pias j? resolvidos pelo motor na entrada inicial e nos preenchimentos. Animar as duas c?lulas sem inventar uma duplica??o posterior ? avalia??o ou uma c?pia recursiva.
- [ ] Tens de fazer o fim de spin sem pr?mio e o fim de spin com pr?mio, com regresso claro ao repouso; uma jogada sem ganho n?o pode receber a celebra??o de uma vit?ria.
- [ ] Tens de fazer o tratamento visual do pr?mio especial de uma grelha s? de wilds/scatters quando ocorrer, usando os participantes e o pagamento do motor, sem fabricar grupos regulares.

### XP, ativa??o de magia e evolu??o dos wilds

- [ ] Tens de fazer o feedback de XP obtido nos hits, a sua passagem para a barra em `xp-gained`, o enchimento e a atualiza??o do valor num?rico. Agregar os ganhos simult?neos como o motor; a largura da barra nunca ultrapassa 100%.
- [ ] Tens de fazer a indica??o de barra completa e a prepara??o da magia. Respeitar a ordem dos eventos: a coloca??o acontece depois do preenchimento e antes da avalia??o seguinte.
- [ ] Tens de fazer a ativa??o tem?tica da magia: rea??o do elemento respons?vel pela magia, emiss?o do efeito, percurso at? ?s c?lulas de destino e transforma??o/coloca??o dos wilds nas posi??es de `magic`. O aspeto do emissor depende do tema aprovado; os destinos v?m do motor.
- [ ] Tens de fazer o esvaziamento da barra e o regresso a zero, sem transportar visualmente XP excedente que o motor descartou.
- [ ] Tens de fazer a magia do jogo base com a quantidade efetivamente colocada e sem multiplicador num?rico inventado.
- [ ] Tens de fazer a magia de **cada b?nus**, comum, super e secret: destacar o n?vel atingido, a quantidade de wilds, o multiplicador e a previs?o da pr?xima ativa??o. N?o basta mudar a cor do painel entre os tr?s modos.
- [ ] Tens de fazer a eleva??o dos wilds j? existentes nos b?nus quando `applyMagic` aumentar o seu valor: destacar cada wild afetado e animar a passagem do valor antigo para o novo. Preservar valores que j? sejam superiores; n?o animar uma redu??o inexistente.
- [ ] Tens de fazer o an?ncio da evolu??o da magia, incluindo os aumentos de quantidade e/ou multiplicador que realmente ocorrerem, e o regresso do painel ao estado de pr?xima magia.
- [ ] Tens de fazer os casos de limite: quantidade pedida diferente da colocada, grelha sem destinos dispon?veis, limite de wilds e evolu??o apenas dos wilds existentes. Nunca lan?ar efeitos para c?lulas que n?o recebem wilds.
- [ ] Tens de fazer a persist?ncia visual de XP, n?vel e wilds entre os passos em que o motor os conserva. No base, mostrar a reposi??o no spin seguinte; ao entrar/sair de um b?nus, apresentar os resets definidos pelo estado real.

### Scatters, b?nus e free spins

- [ ] Tens de fazer a chegada e o destaque dos scatters, conservando-os nas posi??es e cascatas em que o motor os mant?m.
- [ ] Tens de fazer a antecipa??o de b?nus quando o estado apresentado a justificar, sem sugerir um scatter que n?o chegou nem mostrar o resultado futuro antes do seu evento. Qualquer suspense ? apenas apresenta??o.
- [ ] Tens de fazer a confirma??o do gatilho natural e a entrada **distinta para comum, super e secret**, com destaque dos scatters, identifica??o do b?nus, spins atribu?dos e bot?o Continuar.
- [ ] Tens de fazer as entradas por compra dos tr?s b?nus, a partir da op??o escolhida e do custo confirmado. A compra entra diretamente nos free spins: n?o criar uma distribui??o de gatilho nem pagamento de entrada fict?cios.
- [ ] Tens de fazer a transi??o do cen?rio, grelha, XP, magia e indicadores para cada um dos tr?s b?nus, preservando a estrutura aprovada e a leitura dos controlos.
- [ ] Tens de fazer o in?cio de cada free spin, a atualiza??o do contador de spins restantes, as cascatas, a magia e a acumula??o de pr?mio durante todo o b?nus.
- [ ] Tens de fazer o retrigger: destacar os scatters relevantes, anunciar os spins adicionais emitidos em `retrigger` e atualizar o contador. Cobrir todos os valores de retrigger existentes na configura??o; n?o reiniciar XP, evolu??o ou pr?mio nem cobrar outra entrada.
- [ ] Tens de fazer o ?ltimo free spin, a conclus?o do b?nus, a entrada do resumo e a contagem do pr?mio total e dos spins efetivamente jogados, incluindo retriggers.
- [ ] Tens de fazer o fecho do resumo e o regresso ao jogo base, com remo??o dos efeitos do b?nus e reposi??o dos indicadores corretos. Fechar o painel nunca volta a creditar o pr?mio.

### Pr?mios, MAX WIN e saldo

- [ ] Tens de fazer celebra??es graduadas para os patamares de pr?mio definidos com o utilizador: entrada, destaque, contagem e sa?da. Definir os limiares antes da integra??o; n?o os apresentar como novas regras de pagamento.
- [ ] Tens de fazer a celebra??o **MAX WIN** a partir de `max-win`, com r?tulo, valor efetivo do teto, interrup??o das sequ?ncias que j? n?o se aplicam e passagem ao resultado terminal. N?o continuar cascatas, magia, retriggers ou free spins depois desse evento.
- [ ] Tens de fazer a contagem final e o feedback de atualiza??o do saldo na liquida??o de `round-end`, exatamente uma vez. Distinguir saldo, ganho acumulado e pr?mio do ?ltimo grupo.
- [ ] Tens de fazer a acelera??o/fecho das contagens e celebra??es quando o controlo existente o permitir, terminando imediatamente no valor correto sem repetir pagamentos nem perder o painel obrigat?rio.

### Controlos, menus e estados auxiliares

- [ ] Tens de fazer as microintera??es de todos os bot?es e op??es aplic?veis: hover, foco de teclado, premido, selecionado, desativado e ocupado. Incluir Rodar/Acelerar, aposta ?/+, B?nus, Hunt, autoplay, velocidade, regras, som e expans?o.
- [ ] Tens de fazer a altera??o de aposta e do custo apresentado nas op??es de compra, com transi??o curta que n?o esconda o valor a confirmar.
- [ ] Tens de fazer a ativa??o/desativa??o de Hunt e a atualiza??o visual do custo, sem multiplicar os pr?mios ou os indicadores que continuam referidos ? aposta base.
- [ ] Tens de fazer a abertura/fecho dos menus de b?nus, autoplay, regras/pagamentos e som, com fundo modal, entrada do conte?do e retorno ao controlo de origem. Preservar foco, Escape e pausa da apresenta??o onde j? se aplicam.
- [ ] Tens de fazer o feedback do seletor de quantidade de autoplay, in?cio da sequ?ncia, atualiza??o das jogadas restantes e pedido de paragem. A jogada em curso termina; a anima??o n?o pode iniciar outra aposta depois da paragem.
- [ ] Tens de fazer a paragem de autoplay por entrada em b?nus, MAX WIN e saldo insuficiente, com indica??o clara do motivo e continuidade correta da jogada atual.
- [ ] Tens de fazer a mudan?a entre Normal, R?pido e Ultra, incluindo durante uma apresenta??o, e a a??o Acelerar. Adaptar as dura??es sem saltar estados indispens?veis ? compreens?o.
- [ ] Tens de fazer o feedback de volume e mute, mantendo toda a informa??o compreens?vel com som desligado.
- [ ] Tens de fazer a transi??o entre widget e ecr? inteiro e a adapta??o a mudan?as de dimens?o/orienta??o, conservando a jogada. N?o permitir scroll horizontal ou vertical no jogo ou controlos; seguir [AGENTS.md](AGENTS.md), que prevalece sobre descri??es antigas da etapa 2.
- [ ] Tens de fazer a entrada e sa?da das mensagens de saldo insuficiente e erro, com leitura acess?vel e estado final utiliz?vel; uma falha n?o pode receber a celebra??o de sucesso.
- [ ] Tens de fazer a entrada/sa?da do modo de demonstra??o e o reset de cada cen?rio, conservando a marca de demonstra??o e a separa??o do saldo normal.

### Contrato de execu??o e prova de cobertura

Para **cada tarefa acima**, registar no invent?rio: identificador, gatilho/evento, elementos e assets, sequ?ncia, dura??o por velocidade, camadas, estado final, comportamento ao acelerar/interromper, variante de redu??o de movimento, respons?vel, implementa??o e cen?rio local de verifica??o. Uma tarefa com v?rios modos ou s?mbolos exige registar a cobertura de cada variante, mesmo quando partilham c?digo.

Cruzar esta lista com todos os eventos do motor (`spin-start`, `hits`, `xp-gained`, `refill`, `magic`, `spin-end`, `bonus-start`, `retrigger`, `max-win`, `round-end`), todos os controlos e todos os estados do prot?tipo. **Se encontrares outra anima??o necess?ria, acrescenta-a e executa-a; esta lista n?o autoriza omitir estados que ficaram fora dela.** Se uma categoria n?o existir no jogo, justificar a n?o aplica??o com refer?ncia ao c?digo ou ? decis?o aprovada; n?o criar uma mec?nica nova para marcar a caixa.

N?o marcar uma tarefa como conclu?da s? porque existe um asset ou um efeito isolado. S? marcar depois de estar integrada na sequ?ncia real e verificada. Elementos informativos podem permanecer est?ticos por legibilidade, mas essa escolha n?o elimina as transi??es e o feedback obrigat?rio dos eventos que os atualizam. A atualiza??o da documenta??o nesta conversa n?o equivale ? execu??o desta etapa de produ??o.

## Qualidade e comportamento

- Usar ferramentas de imagem quando forem adequadas à arte raster e componentes de código ou vetores quando forem adequados a elementos escaláveis. Ler as instruções das ferramentas e skills disponíveis antes de as usar.
- Criar os assets finais necessários; não terminar apenas com descrições ou prompts.
- Manter leitura clara de símbolos, aposta, saldo, prémios e controlos durante efeitos e celebrações.
- Garantir que toda a animação termina num estado consistente e que aceleração, salto ou interrupção não alteram resultados, saldo ou pagamentos.
- Respeitar redução de movimento e evitar flashes agressivos. Garantir feedback compreensível sem depender apenas de cor ou som.
- Ajustar resolução, compressão, camadas e efeitos ao desempenho de desktop e telemóvel.
- Não acrescentar som como dependência obrigatória sem o discutir com o utilizador. Se existir, prever mute e manter o jogo compreensível sem áudio.

## Validação e conclusão

Verificar o jogo integrado em desktop e telemóvel, percorrendo todos os estados do inventário através de cenários locais reproduzíveis. Verificar cortes, sobreposições, menus, foco, controlos, transições, carregamento de assets, fluidez e redução de movimento. Executar as regressões pertinentes do motor e da ligação à interface.

Apresentar o resultado ao utilizador e incorporar o feedback. Só dar a etapa por concluída quando os visuais e animações previstos estiverem integrados, os problemas relevantes estiverem resolvidos e quaisquer limitações estiverem claramente identificadas.

Entregar o projeto funcional, o inventário atualizado, a localização dos assets e os comandos reais para executar e validar. Distinguir o que foi implementado do que foi efetivamente testado. Publicação e integração com dinheiro ou dados reais exigem um âmbito próprio; esta etapa não autoriza deploy automático.
