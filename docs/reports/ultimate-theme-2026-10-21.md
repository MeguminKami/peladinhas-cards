# Ultimate 20: cor e legibilidade — 21/10/2026

[← Documentação](../README.md) · [Testes](../guides/testing.md)

Após a revisão das referências fornecidas pelo utilizador, o tema Ultimate 20 usa uma base cinzenta de estádio, sem branco nem violeta pastel como fundo principal. A textura diagonal discreta, o cabeçalho grafite e as ações coral/ciano aproximam a direção visual dos menus FUT 20. O texto dos menus é escuro sobre cinzento; as missões e competições têm superfícies grafite com texto claro e cores de prestígio luminosas.

As sete raridades distinguem explicitamente dois contextos: cores escuras nos menus cinzentos e cores luminosas nos painéis grafite. Barras multicoloridas Elite/Ultimate, medalhas do pódio, estrelas, autoavaliação, equipas, indicadores de evolução, competição e destaques do Card Lab recebem cores adequadas ao respetivo fundo. O pódio tem bases mais definidas e valores legíveis. As paletas das cartas são independentes do tema da interface.

## Validação local

`node tests/ultimate-theme.mjs` usa fixtures e bloqueio de serviços de produção. Verifica início, missões, missão escolhida e estatísticas a 1440, 768, 390 e 320 px, conforme os cenários, sem deslocação horizontal da página. Produz 19 capturas locais em `test-results/ultimate-*.png`. Foram inspecionadas capturas de desktop, de largura intermédia e de telemóvel.

Os **31 casos** de contraste de texto e ações da galeria e do cabeçalho da página passaram o limite de **4,5:1**, com mínimo medido de **4,73:1**. Esta medição cobre os componentes e fundos verificados; não constitui uma certificação de todos os ecrãs ou de todos os pontos de gradientes. Também foram verificados foco visível, sequência por teclado, apresentação com movimento reduzido, persistência do tema e cor da interface do navegador. Club, Volt e Champions conservam a cor original da raridade Ouro.

Não houve acesso à base de dados ou ao Storage reais. As capturas usam jogadores e estados fictícios. Não foi executado deploy.

## Manutenção e publicação

Os tokens e as adaptações Ultimate estão agrupados no início de `css/styles.css`. As cores partilhadas de estrelas, evolução e pormenores de raridade usam variáveis com os valores anteriores como fallback para os restantes temas. A descrição e as amostras do seletor estão em `js/themes.js`.

Para novas cores de texto, verificar a combinação real de fundo e estado. Usar texto escuro nas superfícies cinzentas e texto claro nos painéis grafite. Não reutilizar cores de um destes contextos no outro sem verificar contraste. As cores coral/ciano das ações são independentes da cor de leitura dos links e labels.

Publicar apenas o frontend com `npm.cmd run deploy:frontend`. Não há alterações de servidor, regras ou índices neste trabalho.
