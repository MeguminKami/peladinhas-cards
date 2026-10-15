# Coleção especial de cartas

[← Cartas e avaliações](cards-and-ratings.md)

Dez edições visuais disponíveis em **Administração → Cartas** e no seletor de estilo base do **Card Lab**. O catálogo permite ampliar cada edição e experimentar a fotografia de um jogador.

| Edição    | ID estável  | Material e identidade                       |
| :-------- | :---------- | :------------------------------------------ |
| Apogeu    | `apogee`    | Safira, ouro, facetas e moldura de campeão  |
| Legado    | `legacy`    | Marfim, veios minerais e colunas douradas   |
| Titã      | `titan`     | Obsidiana escovada e placas de cobre        |
| Supernova | `supernova` | Nebulosa ametista, órbitas e estrelas       |
| Aurora    | `aurora`    | Opala holográfica e ondas iridescentes      |
| Eclipse   | `eclipse`   | Ónix, coroa solar e detalhes de ouro        |
| Inferno   | `inferno`   | Rubi vulcânico, fraturas e reflexos âmbar   |
| Glacial   | `glacial`   | Cristal polar, facetas de gelo e prata azul |
| Dinastia  | `dynasty`   | Veludo imperial, filigrana e ouro antigo    |
| Carnaval  | `carnival`  | Rosa elétrico, turquesa, fitas e confetes   |

Os desenhos são originais em SVG/CSS, inspirados na linguagem de cartas de coleção de [EA SPORTS FC 26 ICONS](https://www.ea.com/en/games/ea-sports-fc/fc-26/features/fc-26-icons) e nas campanhas do [Ultimate Team 26](https://www.ea.com/games/ea-sports-fc/fc-26/news/fc-26-icons-edition). Não dependem de imagens ou logótipos da EA. Conservam o espaço protegido para nome, OVR e oito atributos; a fotografia fica acima dos efeitos e dos ornamentos. Cada edição ajusta o fundo dos atributos ao contraste da sua paleta.

## Estado da atribuição

**Só pré-visualização.** Ainda não existem missões, condições de desbloqueio ou atribuições destas dez cartas. O catálogo identifica-as como «Nova edição · Atribuição por definir». O Card Lab permite experimentar as edições, mas desativa a gravação de composições baseadas nelas.

`js/card-collection.js` mantém os IDs e metadados. `CATALOG_THEMES` inclui estas edições para apresentação; `THEMES` conserva apenas os tipos já elegíveis para recompensas. `validReward` rejeita os novos IDs e os cálculos automáticos de desempenho não os atribuem. A integração futura das missões escondidas deve ativar explicitamente a elegibilidade, definir as condições e testar a atribuição antes de permitir a gravação no Card Lab.

Verificação: `npm run test:card-collection` testa os dez nomes e ampliações no catálogo, materiais distintos, camadas abaixo do retrato, ecrãs de 320/390 px e o estado de pré-visualização no Card Lab. `npm test` verifica também que os IDs ainda não são recompensas válidas.
