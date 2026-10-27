# Direção de arte dos premium do Bairro

27/10/2026. Referências analisadas: os quatro símbolos ativos em `games/futebol/web/theme.ts`. O pedido é reinterpretar os seus elementos numa carta completa de jogador. As descrições abaixo foram entregues a um agente de direção de arte para criar os acabamentos, sem inserir as imagens dos símbolos nas cartas.

## P1 · Talento de Bronze

O símbolo tem um escudo simétrico angular, com ombros inclinados, lados longos e base em ponta larga. A moldura espessa é feita de cobre e bronze em vários níveis: chanfros largos, relevos convexos, gravura fina e recessos castanho quase negro. As superfícies alternam cobre claro, caramelo e bronze queimado. As arestas interiores e exteriores recebem luz âmbar e laranja, com pequenos reflexos amarelo-branco nas junções.

O fundo apresenta microtextura geométrica e lâminas diagonais de cobre polido. A camisola verde esmeralda com gola e debruns marfim contrasta com a luz quente; há um recorte azul frio no lado oposto. A personagem segura uma bola preta e branca. A carta deve traduzir o bronze gravado, as diagonais e o verde em arquitetura e esmalte, mantendo a identidade do jogador da aplicação.

## P2 · Velocidade de Prata

O escudo de prata branca é mais curvilíneo, com pontas superiores e inferiores e ressaltos recortados nos ombros. Fitas de metal curvam-se como lâminas na base. Os chanfros alternam branco especular e cinza gelo, separados por cavidades azul noite. Esmalte cobalto e azul elétrico ocupa os intervalos entre os perfis de prata.

Duas gemas azuis em losango, com múltiplas facetas e engastes duplos, marcam os lados. O fundo tem trama fina e rastos diagonais de luz ciano que sugerem velocidade. Os pontos mais luminosos aparecem nas junções. A personagem careca, de óculos escuros, veste laranja com linhas amarelas e transporta uma bola. A carta deve explorar a prata, as gemas e a direção das linhas de velocidade.

## P3 · Maestro de Ouro

A moldura é arquitetónica e imponente, em ouro amarelo com zonas profundas de sombra. Uma coroa recortada integra o contorno superior, combinando pontas facetadas de ouro com incrustações triangulares violeta. Uma grande ametista em losango marca o topo; outras gemas ocupam os lados e a ponta inferior. As facetas vão do roxo escuro ao lavanda, com reflexos rosa e brancos.

Folhas largas de ouro esculpido sobem pelos lados, separadas por sulcos fundos. No interior, um fundo violeta irradia luz lilás, acompanhado por fitas douradas em leque e partículas discretas de ouro. A personagem de braços cruzados veste roxo, branco e dourado. A carta deve transmitir autoridade e ritmo através da coroa, do leque, das folhas e das ametistas.

## P4 · Rainha da Final

O escudo combina obsidiana negra e ouro polido. Ombros e flancos são construídos com segmentos pontiagudos que lembram pétalas ou lâminas esculpidas. O ouro alterna superfícies lisas, gravações minuciosas e chanfros quentes; os painéis negros são facetados e refletores. Diamantes brancos em losango ocupam o topo, os lados e os cantos inferiores, com facetas transparentes, cinzentas e azuladas e brilhos estelares.

O fundo negro tem textura fina e diagonais douradas próximas da linguagem art déco. Partículas de ouro e luz de recorte acompanham a figura de cabelo castanho encaracolado e camisola esmeralda com debruns dourados. A carta deve usar preto, ouro, diamantes e esmalte esmeralda numa composição de troféu e final, com o jogador como foco.

## Restrições de composição

- Cada acabamento ocupa a silhueta, o fundo e o perímetro da carta inteira.
- O retrato, o nome, a posição, o OVR e os atributos do jogador preservam a sua hierarquia.
- Os nomes de edição, códigos P1–P4 e títulos de tier ficam no catálogo, fora da carta.
- Os materiais devem ter profundidade por camadas, chanfros, luz e gravação. Os quatro acabamentos precisam de identidades distinguíveis.
- Não incorporar os PNGs dos símbolos como emblemas, retratos ou cartas pequenas dentro de outra moldura.
- Preservar 70 OVR e os preços de 8 000, 10 000, 12 000 e 15 000 DJC.

Implementação concluída em SVG/CSS nativos nos módulos existentes. Os quatro PNGs deixaram de ser consumidos pelo renderer; o retrato comum do jogador voltou a ocupar o centro. Gradientes e padrões usam identificadores únicos em cada renderização.

Validação em 27/10/2026: sete testes de catálogo e render passaram, incluindo ausência de imagens embutidas, preservação da identidade, unicidade de IDs e resolução de referências SVG. A interface passou os testes de compra, saldo, requisitos, coleção, persistência, teclado e movimento reduzido. As quatro cartas foram inspecionadas em desktop, telemóvel e lupa; sem overflow a 320, 390, 768 e 1440 px. Capturas em `artifacts/casino-shop/premium-redrawn-*.png` e `artifacts/casino-shop/football-p*-redrawn-detail.png`. Sem acesso ao Firebase real ou ao Storage e sem publicação.
