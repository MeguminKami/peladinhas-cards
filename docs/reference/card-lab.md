# Card Lab

[← Documentação](../README.md) · [Cartas e avaliações](cards-and-ratings.md) · [Catálogo](card-collection.md)

O Card Lab é a bancada de composição de cartas reservada a ADMIN. Os controlos editam o projeto e a carta mostra imediatamente o resultado. As alterações são guardadas em `cardThemes` por `saveTheme`; criar um projeto não atribui automaticamente uma carta a um jogador.

## Percurso de criação

A bancada tem uma altura própria ajustada ao ecrã, sem descontar o título, a navegação de administração ou a barra do projeto. **Centrar editor** desloca a página até ao início das ferramentas, abaixo do cabeçalho. O menu mantém deslocação independente e a carta cresce até ao maior tamanho que cabe na pré-visualização. No telemóvel, a carta aparece acima das ferramentas e a altura disponível respeita a navegação inferior. A deslocação do botão é imediata quando há preferência por movimento reduzido.

| Ferramenta | Conteúdo                                                           |
| ---------- | ------------------------------------------------------------------ |
| Modelos    | Todas as cartas de `CATALOG_THEMES` e **Do zero**.                 |
| Composição | Organização dos elementos, silhuetas e posições.                   |
| Cores      | Cinco cores editáveis e 50 paletas vibrantes com nomes próprios.   |
| Materiais  | Iluminação, fundos, ornamentos, acabamentos e traçado.             |
| Símbolos   | Emblemas, marcas de água, tamanho, posição, rotação e intensidade. |
| Texto      | Fontes, tamanhos, fundo do nome e elementos visíveis.              |
| Foto       | Enquadramento, deslocação, ampliação, rotação, recorte e cor.      |
| Projetos   | Biblioteca, nova composição e importação/exportação JSON.          |

Os menus usam ícones próprios, cabeçalhos consistentes e secções expansíveis com operação por teclado. As animações respeitam `prefers-reduced-motion`. A carta mantém-se visível; o scroll fica nos controlos da ferramenta.

## Modelos e elementos

Escolher um modelo conserva o desenho nativo com `preserveOriginal: "yes"`, incluindo ao guardar sem alterações. Editar um controlo visual passa para composição personalizada. **Original** significa conservar a camada nativa do modelo, não uma superfície vazia.

Silhuetas, ornamentos e símbolos têm nome próprio e pré-visualização em galerias. Os 56 ornamentos distribuem-se por Essenciais, Geometria e tecnologia, Luz e natureza, Emblemas e gravuras, Festa e movimento, e Percursos pessoais. Novos ornamentos sem categoria atribuída aparecem automaticamente em Outras edições. Os IDs das edições continuam internos para compatibilidade com projetos guardados.

**Do zero** começa com cor sólida, sem decoração, acabamento, iluminação nem moldura. A fotografia de exemplo é sempre a do ADMIN autenticado. A identidade e os temas premiados desse jogador não devem voltar a aplicar-se por cima do projeto.

## Cores e materiais

Cada paleta define superfície primária, superfície secundária, texto, traçado e luz. As 50 combinações têm nomes próprios; os IDs existentes foram preservados. Escolher uma paleta num fundo Original passa para Diagonal para tornar as cores visíveis; um fundo personalizado já escolhido é mantido.

Os seletores de cor e os valores RGB/transparência do fundo do nome atualizam diretamente as variáveis CSS da carta. Após a primeira edição de um modelo nativo, estes ajustes não recriam a fotografia nem os símbolos e não percorrem novamente todas as ferramentas. Desfazer/refazer e guardar conservam os valores finais.

O **Bicolor** mistura as duas cores por degradê, sem divisão brusca. Os controlos de **Distribuição e intensidade** só aparecem quando têm efeito:

- Diagonal e Bicolor: ângulo e distribuição.
- Halo: distribuição e posição horizontal/vertical.
- Acabamento ativo: intensidade; Original e Sem efeito não mostram este ajuste.

Uma superfície personalizada remove as texturas e os reflexos nativos que poderiam ocultar a escolha. **Sem efeito** também suprime essas camadas nativas. **Original** conserva o acabamento do modelo. Projetos antigos com `texture: "diagonal"` ou `"radial"`, sem fundo explícito em `design`, recuperam esse fundo através de `cardTemplateDesign`.

## Luz e traçado

**Iluminação** oferece Luz original, Luz dirigida e Sem luz. A luz dirigida controla intensidade, direção e difusão sobre a carta e o brilho exterior. A cor está em **Cores → Luz**. Estes controlos não apagam ilustrações desenhadas como parte dos ornamentos.

**Traçado junto ao perímetro** oferece original, sem moldura, linha, dupla, luminosa, tracejada e cantos. O painel ajusta espessura, distância ao perímetro e opacidade; a cor está em **Cores → Moldura**. Ajustar o traçado original através das barras seleciona uma linha personalizada. **Sem moldura** oculta também os contornos nativos internos, sem remover automaticamente todos os outros ornamentos.

## Texto, fotografia e símbolos

Não há uma segunda pré-visualização de texto no formulário: o resultado é mostrado na carta. **Original do modelo** é a escolha inicial para nome, OVR, atributos, legendas e posição; editar outro elemento conserva a família, peso e proporções nativas. Os tamanhos permitem ampliar ou reduzir essa tipografia. **Peladinhas Sans** está incluída na aplicação e pode ser escolhida explicitamente. DIN Pro Condensed Regular, Medium e Bold, e Posterama 1927 Bold usam `local()`; os ficheiros dessas fontes não são distribuídos. O menu indica se estão instaladas ou se será usada uma substituição local. As restantes fontes opcionais usam as famílias e fallbacks do catálogo.

Em **Composição → OVR + posição + país**, uma grelha direcional oferece a posição original e oito desvios mínimos de 1 ponto percentual: acima, abaixo, esquerda, direita e diagonais. Cada opção posiciona o bloco completo perto da âncora nativa (10% horizontal, 12% vertical), mantendo a mesma ordem, alinhamento, espaçamento, fontes e tamanhos. As posições são predefinidas, não acumulativas. A escolha suporta guardar, importar, desfazer e refazer. As barras de posição ficam recolhidas para ajustes manuais.

A fotografia vem do perfil do ADMIN atual, inclusive ao abrir modelos, importar projetos ou usar desfazer/refazer. O editor permite alterar o seu enquadramento, não selecionar a fotografia de outro jogador através do projeto.

Os símbolos usam SVG normalizado, centrado junto à parte inferior, com espaço até ao limite e sem nomes de edição sobrepostos. Um símbolo escolhido substitui o nativo. Tamanho e posição podem ser ajustados.

## Guardar e retomar

Guardar um projeto novo cria um ID. Reabrir pela biblioteca e guardar alterações mantém o ID; guardar uma cópia cria outro. Escolher um modelo do catálogo desassocia o projeto anteriormente aberto, evitando gravá-lo por engano. A importação JSON inicia uma nova composição. Desfazer/refazer conserva os valores do projeto.

O esquema é validado por `validCardDesign` no browser e em `saveTheme`. Novos campos/opções exigem publicar ambos os consumidores; mudar apenas CSS ou o conteúdo visual de uma paleta é uma alteração de frontend.

As opções de fonte `original` e `peladinhas`, e o campo `ratingLayout` (`original`, `compact`, `sidecar`), exigem publicar o frontend e a função `saveTheme`. As posições predefinidas usam `ratingLayout: "original"` e os campos existentes `ratingX`/`ratingY`; os outros valores de layout continuam aceites para projetos anteriores. Os projetos existentes mantêm as fontes e coordenadas guardadas até uma nova escolha. Não é necessário recalcular dados.

## Implementação e verificação

`js/card-lab.js` gere o projeto; `js/card-lab-interface.js` os menus; `js/card-studio-elements.js` os nomes e categorias; `js/card-studio-catalog.js` as opções e paletas; `js/card-design.js` valida e aplica o desenho. `css/card-lab.css` define a bancada e as regras partilhadas das cartas ficam em `css/cards.css` e `css/responsive.css`.

```powershell
node tests/card-lab.mjs
node tests/card-lab-colors.mjs
node tests/card-lab-elements.mjs
node tests/card-lab-admin-photo.mjs
node tests/card-lab-lighting.mjs
node tests/card-lab-state.mjs
```

Consultar [testes](../guides/testing.md) e [publicação seletiva](../guides/deployment.md). As capturas de demonstração não confirmam que a mesma versão já tenha sido publicada.

## Temas de missão e cartas dos percursos

A composição de missões em `js/paths.js` usa os tokens de raridade de `css/experience.css` e regras próprias de `css/paths.css`. As cartas finais `path-*` têm conceitos em `js/path-card-designs.js` e requisitos na [referência dos percursos](player-paths.md). Alterar a apresentação de uma missão não altera projetos guardados do Card Lab nem os critérios de conquista; a edição de projetos continua a seguir o esquema e o fluxo de publicação descritos nesta referência.
