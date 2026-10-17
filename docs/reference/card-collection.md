# Coleção especial de cartas

[← Cartas e avaliações](cards-and-ratings.md)

Dezanove edições visuais disponíveis em **Administração → Cartas** e na secção **Modelos** do **Card Lab**. O catálogo permite ampliar cada edição e experimentar a fotografia de um jogador.

| Edição        | ID estável      | Material e identidade                                           |
| :------------ | :-------------- | :-------------------------------------------------------------- |
| TOTY          | `toty`          | Azul imperial, filigrana, louros e moldura dourada simétrica    |
| TOTS          | `tots`          | Azul elétrico e fragmentos de cristal com incrustações douradas |
| ICON          | `icon`          | Marfim, arco clássico, mármore e louros                         |
| FUT HEROES    | `fut-heroes`    | Cobre escovado, placas de armadura e retícula cinematográfica   |
| FUT BIRTHDAY  | `fut-birthday`  | Rosa e azul, moldura de fitas, confetes e bolhas                |
| ONES TO WATCH | `otw`           | Ónix violeta, chevrons luminosos e moldura segmentada           |
| FUTURE STARS  | `future-stars`  | Moldura holográfica, estrelas em planos digitais e circuitos    |
| FUTTIES       | `futties`       | Esmalte magenta, arabescos e joias douradas                     |
| SHAPESHIFTERS | `shapeshifters` | Placas verdes assimétricas, circuitos e energia fluorescente    |
| Apogeu        | `apogee`        | Safira, ouro, facetas e moldura de campeão                      |
| Legado        | `legacy`        | Marfim, veios minerais e colunas douradas                       |
| Titã          | `titan`         | Obsidiana escovada e placas de cobre                            |
| Supernova     | `supernova`     | Nebulosa ametista, órbitas e estrelas                           |
| Aurora        | `aurora`        | Opala holográfica e ondas iridescentes                          |
| Eclipse       | `eclipse`       | Ónix, coroa solar e detalhes de ouro                            |
| Inferno       | `inferno`       | Rubi vulcânico, fraturas e reflexos âmbar                       |
| Glacial       | `glacial`       | Cristal polar, facetas de gelo e prata azul                     |
| Dinastia      | `dynasty`       | Veludo imperial, filigrana e ouro antigo                        |
| Carnaval      | `carnival`      | Rosa elétrico, turquesa, fitas e confetes                       |

Os desenhos são originais em SVG/CSS, inspirados na linguagem de cartas de coleção de [EA SPORTS FC 26 ICONS](https://www.ea.com/en/games/ea-sports-fc/fc-26/features/fc-26-icons) e nas campanhas do [Ultimate Team 26](https://www.ea.com/games/ea-sports-fc/fc-26/news/fc-26-icons-edition). Não dependem de imagens ou logótipos da EA. Conservam o espaço protegido para nome, OVR e oito atributos; a fotografia fica acima dos efeitos e dos ornamentos. Cada edição ajusta o fundo dos atributos ao contraste da sua paleta.

## Estado da atribuição

Quinze edições têm [condições de conquista e validade](card-unlocks.md). Apogeu (design original), Legado, Titã e Carnaval (design original) ficam em reserva para atribuição automática. O ADMIN pode usar as dezanove edições no Card Lab para criar e guardar composições personalizadas, incluindo as que estão em reserva. Apogeu usa o visual TOTY, Equipa da Época usa TOTS e Carnaval usa FUT BIRTHDAY, evitando prémios duplicados.

`js/card-collection.js` mantém os IDs e metadados, incluindo os nove temas de `js/card-fut-themes.js`. `CATALOG_THEMES` inclui todas as edições para apresentação; `THEMES` inclui apenas as elegíveis para recompensas. `js/card-achievements.js` centraliza pistas e durações. Os critérios exatos ficam em `functions/card-unlock-rules.js`, fora dos recursos públicos, e `functions/card-collection.js` guarda as conquistas no servidor.

Verificação: `npm run test:card-collection` testa nomes, materiais distintos, camadas abaixo do retrato, ecrãs de 320/390 px e a distinção entre cartas ativas e designs em reserva. Produz também duas folhas de comparação dos nove temas FUT: com jogador (`test-results/card-fut-themes.png`) e apenas molduras e materiais (`test-results/card-fut-frames.png`). `npm test` verifica condições de conquista, validades e os IDs elegíveis para recompensas.
