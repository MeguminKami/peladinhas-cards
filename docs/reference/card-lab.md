# Card Lab

[← Documentação](../README.md) · [Cartas e avaliações](cards-and-ratings.md) · [Catálogo](card-collection.md)

O Card Lab é a bancada de composição de cartas reservada a ADMIN. Os controlos editam o projeto e a carta mostra imediatamente o resultado. As alterações são guardadas em `cardThemes` por `saveTheme`; criar um projeto não atribui automaticamente uma carta a um jogador.

## Percurso de criação

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

Silhuetas, ornamentos e símbolos têm nome próprio e pré-visualização em galerias. Os 41 ornamentos distribuem-se por Essenciais, Geometria e tecnologia, Luz e natureza, Emblemas e gravuras, e Festa e movimento. Os IDs das edições continuam internos para compatibilidade com projetos guardados.

**Do zero** começa com cor sólida, sem decoração, acabamento, iluminação nem moldura. A fotografia de exemplo é sempre a do ADMIN autenticado. A identidade e os temas premiados desse jogador não devem voltar a aplicar-se por cima do projeto.

## Cores e materiais

Cada paleta define superfície primária, superfície secundária, texto, traçado e luz. As 50 combinações têm nomes próprios; os IDs existentes foram preservados. Escolher uma paleta num fundo Original passa para Diagonal para tornar as cores visíveis; um fundo personalizado já escolhido é mantido.

O **Bicolor** mistura as duas cores por degradê, sem divisão brusca. Os controlos de **Distribuição e intensidade** só aparecem quando têm efeito:

- Diagonal e Bicolor: ângulo e distribuição.
- Halo: distribuição e posição horizontal/vertical.
- Acabamento ativo: intensidade; Original e Sem efeito não mostram este ajuste.

Uma superfície personalizada remove as texturas e os reflexos nativos que poderiam ocultar a escolha. **Sem efeito** também suprime essas camadas nativas. **Original** conserva o acabamento do modelo. Projetos antigos com `texture: "diagonal"` ou `"radial"`, sem fundo explícito em `design`, recuperam esse fundo através de `cardTemplateDesign`.

## Luz e traçado

**Iluminação** oferece Luz original, Luz dirigida e Sem luz. A luz dirigida controla intensidade, direção e difusão sobre a carta e o brilho exterior. A cor está em **Cores → Luz**. Estes controlos não apagam ilustrações desenhadas como parte dos ornamentos.

**Traçado junto ao perímetro** oferece original, sem moldura, linha, dupla, luminosa, tracejada e cantos. O painel ajusta espessura, distância ao perímetro e opacidade; a cor está em **Cores → Moldura**. Ajustar o traçado original através das barras seleciona uma linha personalizada. **Sem moldura** oculta também os contornos nativos internos, sem remover automaticamente todos os outros ornamentos.

## Texto, fotografia e símbolos

Não há uma segunda pré-visualização de texto no formulário: o resultado é mostrado na carta. DIN Pro Condensed Regular, Medium e Bold, e Posterama 1927 Bold usam `local()`; os ficheiros dessas fontes não são distribuídos. Na ausência das fontes instaladas, aplicam-se os fallbacks do catálogo.

A fotografia vem do perfil do ADMIN atual, inclusive ao abrir modelos, importar projetos ou usar desfazer/refazer. O editor permite alterar o seu enquadramento, não selecionar a fotografia de outro jogador através do projeto.

Os símbolos usam SVG normalizado, centrado junto à parte inferior, com espaço até ao limite e sem nomes de edição sobrepostos. Um símbolo escolhido substitui o nativo. Tamanho e posição podem ser ajustados.

## Guardar e retomar

Guardar um projeto novo cria um ID. Reabrir pela biblioteca e guardar alterações mantém o ID; guardar uma cópia cria outro. Escolher um modelo do catálogo desassocia o projeto anteriormente aberto, evitando gravá-lo por engano. A importação JSON inicia uma nova composição. Desfazer/refazer conserva os valores do projeto.

O esquema é validado por `validCardDesign` no browser e em `saveTheme`. Novos campos/opções exigem publicar ambos os consumidores; mudar apenas CSS ou o conteúdo visual de uma paleta é uma alteração de frontend.

## Implementação e verificação

`js/card-lab.js` gere o projeto; `js/card-lab-interface.js` os menus; `js/card-studio-elements.js` os nomes e categorias; `js/card-studio-catalog.js` as opções e paletas; `js/card-design.js` valida e aplica o desenho. `css/card-lab.css` define a bancada e as regras partilhadas das cartas ficam em `css/cards.css` e `css/responsive.css`.

```powershell
node tests/card-lab.mjs
node tests/card-lab-elements.mjs
node tests/card-lab-admin-photo.mjs
node tests/card-lab-lighting.mjs
node tests/card-lab-state.mjs
```

Consultar [testes](../guides/testing.md) e [publicação seletiva](../guides/deployment.md). As capturas de demonstração não confirmam que a mesma versão já tenha sido publicada.

## Temas de missão e cartas dos percursos

A composição de missões em `js/paths.js` usa os tokens de raridade de `css/experience.css` e regras próprias de `css/paths.css`. As cartas finais `path-*` têm conceitos em `js/path-card-designs.js` e requisitos na [referência dos percursos](player-paths.md). Alterar a apresentação de uma missão não altera projetos guardados do Card Lab nem os critérios de conquista; a edição de projetos continua a seguir o esquema e o fluxo de publicação descritos nesta referência.
