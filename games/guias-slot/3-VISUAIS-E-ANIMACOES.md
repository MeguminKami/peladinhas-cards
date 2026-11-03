# Guia 3 — Visuais: arte, interface e animações

> **Para o agente:** És responsável pela fase 3 de uma slot. Já existem o motor (fase 1) e um jogo funcional com apresentação neutra (fase 2). Lê `AGENTS.md`, `docs/matematica.md`, `docs/eventos.md` e `docs/estrutura-ui.md` antes de começar. A tua tarefa é tudo o que é visual: a bíblia visual, as imagens (símbolos, fundos, logótipo, emblemas, molduras), a pele da interface (botões, ícones, barras, tipografia) e uma animação para **cada** evento do catálogo. Trabalhas sobretudo em `ui/fx-visual.js`, em CSS novo (`theme.css`, `presentation.css`, `responsive.css`…) e em `ui/art/`. **Não alteras a matemática, a sessão nem o fluxo de estados.** Se um efeito visual parecer exigir mudar a lógica, explica porquê no relatório em vez de o fazer. O som é de outra fase. Não removas as chamadas a `fx.audio`.

## Input do dono do jogo

```text
PASTA DO JOGO:
TEMA E HISTÓRIA EM 2-3 FRASES:
EMOÇÃO / AMBIENTE: [ex.: conto de fadas suave e luminoso | néon agressivo | bairro à noite]
ESTILO GRÁFICO: [ilustração pintada | 3D estilizado | cartoon | realista | pixel art]
PALETA DESEJADA (se houver):
REFERÊNCIAS: [ficheiros em ASSETS/, imagens de inspiração, pessoas reais com nome -> símbolo]
DIFERENÇAS VISUAIS ENTRE MODOS: [ex.: cada bónus com cor e cenário próprios]
NOMES TEMÁTICOS (bónus, poderes, ganhos grandes):
O QUE NÃO QUERO:
```

## 1. Bíblia visual primeiro (`docs/TEMA.md`)

Antes de gerar imagens, escreve conceito, paleta (com HEX), materiais, iluminação, contorno, tipografia, formas, hierarquia, personagens e diferenças entre modos. Inclui um **bloco de estilo** de 3 a 5 linhas a repetir em todos os prompts de imagem. É o que mantém tudo coerente.

Depois faz o **inventário** de todas as peças, numa tabela com ID, papel, dimensão do master, dimensão publicada, se precisa de transparência e destino:

- Símbolos normais e premium (escala aparente harmoniosa, silhuetas reconhecíveis em tamanho real de célula, valor crescente visível do primeiro normal ao último premium sem parecerem de jogos diferentes).
- Wild, scatter e outros símbolos especiais. «WILD» e «SCATTER» têm de ser legíveis, de preferência em texto HTML por cima do emblema, para animarem como uma peça única.
- Fundo/cenário (um por modo, se pedido), moldura da grelha, logótipo, emblemas dos bónus e da aposta extra, moldura dos avisos, arte do retrigger, efeitos (pó, brilhos), ícones da interface.

## 2. Produzir a arte

- Gera arte raster com a ferramenta de geração de imagens disponível. Usa **um prompt próprio por peça**, sempre com o bloco de estilo e as referências. Guarda os prompts em `docs/art/prompts.md`, ou na tabela do manifesto.
- **Primeiro uma amostra**: dois símbolos normais, dois premium e o wild, com qualidade final. Coloca-os no tabuleiro real e tira capturas em desktop e em telemóvel. Só depois de a amostra resultar é que produzes o resto.
- Fundo transparente verdadeiro nos símbolos (verifica o canal alpha e garante que não há um quadrado desenhado). Cabeças, cabelos, mãos e objetos nunca podem ficar cortados pela margem.
- **Pessoas reais de referência:** a correspondência referência → símbolo tem de ser explícita. Preserva o rosto e as características pedidas e ajusta pose, roupa e anatomia ao estilo. Não colas um rosto num corpo incompatível. As fotografias ficam em `ASSETS/` e **nunca** são publicadas.
- **Personagens e marcas de terceiros** (desenhos animados, mascotes, logótipos): não os reproduzas. Cria designs originais inspirados no ambiente pedido e assinala ao dono do jogo quando a referência for uma personagem protegida.
- Nada de emojis nem placeholders na versão final. Quando faltar uma peça, diz qual no relatório.
- **Texto da interface nunca vai dentro de bitmaps** (preços, botões, números, regras). Assim pode ser traduzido e atualizado.
- **Tipografia:** uma fonte com licença conhecida, alojada localmente em `ui/fonts/` como `.woff2`, com algarismos alinhados (lining, `font-variant-numeric: lining-nums tabular-nums`) nos valores. Nada de fontes carregadas de serviços externos.

### Pipeline de ficheiros

- Masters em PNG ao lado (fonte) e versão publicada em **WebP** com o mesmo nome. Pontos de partida: símbolos com 320 px de lado, qualidade 88; emblemas com 512 px; cenário no tamanho de apresentação, qualidade 80.
- O jogo só carrega WebP. Os PNG não são publicados e o script de build tem de os excluir.
- `ui/art/manifest.json` com, por peça: ficheiro, papel, dimensões reais, alpha, ferramenta, prompt ou origem e licença. As versões rejeitadas vão para um arquivo fora de `ui/art/`, ou são apagadas. Nunca ficam ao lado das ativas.

## 3. Pele da interface

- **Barra de controlos (por baixo do tabuleiro):** é a barra padrão de todas as slots (`ui/kit/`). Aqui **só** se cria `ui/tema-barra.css` com variáveis `--deck-*` (cores, fundos, bordas, sombras, fontes, formas, glifo e cores da velocidade, barras deslizantes, janela do Autoplay) e, se for preciso, `@font-face` e a opção `signature` dos ícones. Parte de `games/guias-slot/kit/barra-controlos/tema-sofia.css` e compara no `demo.html` desse kit. Não edites `ui/kit/barra.css` nem `barra.js`, não acrescentes seletores nem mudes tamanhos ou posições. Confirma com `node games/guias-slot/kit/verificar-kit.mjs <pasta-do-jogo>`.
- Restantes botões, interruptores, janelas e ícones do jogo (sprite SVG embutido no `game.html`, com um elemento de assinatura visual do tema), coerentes com o tema da barra.
- Mantém os três desenhos da fase 2 (`landscape`, `portrait`, `compact`) e a regra **sem scroll**. Revê a composição de cada um com capturas, porque a arte muda as proporções.
- Contraste suficiente, foco visível, áreas de toque e nomes acessíveis. Os estados (ativo, bloqueado, a aguardar) não podem depender só da cor.
- Os ícones de modo e os botões de compra usam a arte dos emblemas. O painel de regras é ilustrado com a arte do jogo.

## 4. Animações — um evento, uma animação

Cria em `docs/visuais-animacoes.md` uma tabela com **todos** os eventos de `docs/eventos.md`: evento → animação → duração em Normal → condição de conclusão → comportamento em Ultra → comportamento com movimento reduzido. Implementa-a em `fx-visual.js`, sempre através de `ui/tempo.js`:

- **Spin / queda:** o resultado final já faz parte do movimento. Nunca há troca visível de símbolo no fim. O ritmo depende só do que já está à vista, nunca do resultado ainda escondido.
- **Suspense de scatters:** só quando ainda é **possível**, segundo as regras, atingir mais um nível (ex.: 2 scatters à vista e espaço para o 3.º). Usa níveis crescentes: abrandar, feixe de luz na coluna, scatters pousados a pulsar, escurecer o resto da grelha e, no nível máximo, um tremor leve. Aplica o mesmo critério ao spin e às cascatas.
- **Prémios:** em Normal e Rápido, cada combinação é apresentada sozinha e a seguinte só começa quando a anterior acaba (destaque das células e valor que sobe e desvanece). Em Ultra, todas ao mesmo tempo. Com multiplicadores, mostra a conta: prémio → `× N` (com os wilds envolvidos a brilhar) → resultado. A soma do que aparece é igual ao total pago.
- **Escalões de ganho:** cor e tamanho do valor crescem com o múltiplo da aposta. Os limiares e os nomes temáticos estão documentados, por exemplo pequeno < 15× sem ecrã próprio e celebração crescente a partir de 15×. O contador avança por tempo real (nunca por frame), com a duração ajustada ao valor e efeitos que evoluem ao passar cada limiar. CONTINUAR só aparece no fim. Um toque revela o total e outro confirma a saída.
- **Cascatas:** os vencedores desfazem-se, os restantes caem e os novos entram. Sem saltos.
- **Poderes:** mostra a origem, a transferência, o nome temático e o impacto no alvo. Exemplo: o XP voa como poeira para a barra, a barra cheia vibra, a magia entra e os wilds pousam um a um. Cada poder tem tempo para ser lido, também no jogo normal.
- **Wilds com multiplicador:** mostram o valor, conservam-no visualmente e combinam-se de forma legível.
- **Entrada em bónus:** os scatters convergem e aparece uma introdução (emblema, nome, número de spins, uma frase sobre o que muda) que espera por CONTINUAR. O ambiente muda de modo (fundo, cor da moldura).
- **Retrigger:** `+N FREE SPINS` com a arte própria e a atualização do total. Continua com um toque, ou sozinho depois de cerca de 10 s, só no retrigger.
- **Fim de bónus:** espera por todos os prémios do último spin, faz uma transição cuidada e mostra o resumo com contagem animada. O ambiente do bónus mantém-se até à confirmação.
- **Compra de bónus:** um spin «teatral» com os scatters em posições aleatórias, diferente em cada compra. É só apresentação e não altera o resultado, o saldo nem os eventos do motor.
- **Limite atingido:** um painel próprio (MAX WIN) com o valor final.
- **Velocidades:** Normal e Rápido mantêm a coreografia completa. Ultra tem uma coreografia própria, mais curta (colunas quase juntas, ganhos em simultâneo, wilds em onda), e não é só tudo acelerado. Os toques que aceleram ou saltam (fase 2) têm de funcionar a meio de qualquer animação sem deixar elementos órfãos.
- **Movimento reduzido:** troca deslocações e tremores por fades curtos e mantém toda a informação.

## 5. Desempenho

- Anima só `transform` e `opacity`. **Não animes** `filter` (blur, drop-shadow), `box-shadow` nem `backdrop-filter`, nem sequer em fundos «parados». Obrigam a redesenhar em cada frame e pesam muito em telemóveis.
- Pré-carrega e descodifica (`img.decode()`) toda a arte antes do primeiro spin, com progresso real no ecrã de carregamento. Os temas dos bónus podem carregar quando os scatters convergem.
- Reutiliza os elementos das partículas (pool) e limita a quantidade. Usa `requestAnimationFrame` e tempo decorrido. Não reescrevas o DOM inteiro a cada incremento do contador.
- Mede com o painel de desempenho da fase 2 (`?perf=1`) num perfil de telemóvel com CPU 4× mais lenta: spin, suspense máximo, cascatas longas, celebração grande e um bónus inteiro em Ultra. Indica os FPS medidos. Não prometas «60 FPS» sem números.

## 6. Verificação

- `tests/art.browser.js`: todas as imagens existem e carregam (nenhum 404), as dimensões batem com o manifesto, o alpha é real e não há texto cortado.
- Capturas de cada evento importante, via cenários forçados do painel de diagnóstico (entrada em cada bónus, retrigger, cada poder, ganho grande e cada limiar, limite atingido, resumo), nos três desenhos. Olha para as capturas antes de dar por concluído.
- Repete o teste «sem scroll» da fase 2 com a arte final.
- Os testes da fase 1 e da fase 2 continuam a passar.

## 7. Entregáveis

1. `ui/art/` (WebP publicados, PNG de origem, `manifest.json`), `ui/fonts/` e o sprite de ícones.
2. `ui/fx-visual.js` com todos os eventos e o CSS do tema e das animações.
3. `docs/TEMA.md`, `docs/visuais-animacoes.md` e os prompts.
4. Script de build/publicação atualizado para excluir masters PNG, referências e páginas de pré-visualização.
5. Capturas finais em `test-results/` e testes a passar.

## 8. Relatório final

Responde com: lista de peças produzidas (e as em falta), as capturas mais representativas (desktop, telemóvel vertical e horizontal, entrada em bónus, ganho grande), a tabela de eventos com o estado de cada animação, os FPS medidos e em que condições, o peso total da arte publicada e as limitações (ex.: peças com qualidade abaixo da amostra aprovada).

## Erros comuns a evitar

- Gerar todas as imagens antes de validar uma amostra no tabuleiro real.
- Pôr textos de interface dentro das imagens.
- Trocar o símbolo no fim da queda, ou dar suspense a uma situação que as regras já tornaram impossível.
- Animar `filter` ou `box-shadow` em loop.
- Animações com `setTimeout` fora do relógio, que deixam de acompanhar a velocidade e o som.
- Publicar os PNG gigantes ou as fotografias de referência.
