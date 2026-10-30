# Cenários por dificuldade

## Revisão de 26/10/2026

Os recursos ativos são agora quatro panoramas PNG **2172 × 724 (3:1)** gerados pela ferramenta integrada image_gen. O pedido definiu uma composição panorâmica 3:1; estas são as dimensões reais devolvidas pela ferramenta.

- `Fácil` (ficheiro histórico removido): cave barata e degradada, ferrugem, pintura descascada, bancos remendados.
- `Normal` (ficheiro histórico removido): ginásio de bairro convencional, equipamento funcional, branco/cinzento/azul.
- `Difícil` (ficheiro histórico removido): sala de powerlifting séria, betão, ferro pesado, correntes e luz vermelha controlada.
- `Extremo` (ficheiro histórico removido): fábrica infernal de fritura, óleo incandescente, máquinas colossais e energia roxa/lima.

Prompt comum: «ONE ultra-wide 3:1 panoramic background for side scrolling arcade game. Premium detailed stylized 3D commercial game render. Side-on architectural elevation, straight horizon, slight floor view, no fisheye. All wall and equipment detail upper 55%; lower 45% continuous empty dark rubber gameplay floor. No people, characters, letters, logos or UI.» As quatro variantes acrescentam os ambientes descritos acima; fácil e normal excluem luxo e fantasia, difícil exclui esculturas de comida, extremo introduz fritadeiras gigantes e canais de óleo atrás do piso jogável.

O [renderer](./scene.mjs) aplica **uma única escala** aos dois eixos e recorta o excedente. No telemóvel vê-se uma janela central do panorama, sem comprimir a imagem. O teste de apresentação cobre esta invariância. A [galeria](./art-gallery.html) mostra as imagens integrais. Os recursos abaixo pertencem à primeira versão, preservada como referência.

## Primeira versão, substituída

Gerados em 26/10/2026 com a ferramenta integrada `image_gen`, em quatro pedidos independentes. Todos os ficheiros são PNG de 1536 × 1024, sem texto nem personagens. O cenário original foi preservado.

| Dificuldade | Recurso | Direção visual |
| --- | --- | --- |
| Fácil | `gym-easy.png` (ficheiro histórico removido) | Ginásio luminoso, luz natural, verde lima e turquesa |
| Normal | `gym-normal.png` (ficheiro histórico removido) | Ginásio extravagante, roxo/ciano e pôr do sol |
| Difícil | `gym-hard.png` (ficheiro histórico removido) | Pesos pesados e fritadeiras, luz laranja e vermelha |
| Extremo | `gym-extreme.png` (ficheiro histórico removido) | Ginásio infernal de fritadeiras, rave roxa, verde ácido e fogo |

## Prompts de produção

Especificação comum: «Generate ONE landscape 1536x1024 premium stylized 3D cartoon fitness arcade background for Cardoso Road. Side-on slightly elevated view for horizontal sidescrolling game. All detail upper 60%; lower 40% EMPTY wide continuous dark rubber floor for large hero and monster overlays, subtle reflections. No actual people or monsters, no text, letters, labels, logos, UI, no foreground obstructions. Strong depth and controlled contrast, wide full bleed.»

- Fácil: «Inviting huge clean modern Portuguese gym, friendly lime and turquoise LED accents, soft daylight, spacious recognizable dumbbell racks and cardio machines. Bright polished playful game art, detailed sculpted materials and controlled depth. Rich warm friendly lighting, clear readable silhouette separation.»
- Normal: «An extravagant energetic modern fitness gym, neon purple cyan magenta LED lighting and warm sunset window accents, mirrored wall, benches weights treadmills and protein supplement shelving arranged behind an open horizontal side-scroller stage. Rich sculpted materials, readable depth, vibrant controlled contrast, moderate tempting chaotic gym energy.»
- Difícil: «A dangerous wonderfully ridiculous heavyweight gym invaded by fried-food temptations, industrial gym machinery, racks of huge dumbbells, hot orange red lighting mixing dark electric purple accents, deep-fryer kitchen machines and burger-like sculptural decor only in back wall, warm oil-vapor atmosphere. Rich high-end sculpted cartoon materials, dramatic compelling scene, clear silhouette contrast, ominous but fun not horror.»
- Extremo: «The ultimate hilariously manic infernal gym rave: monstrous industrial dumbbell racks and enormous deep fryer machinery on back wall, purple laser LED strips, electric acid lime and fiery crimson orange accents, wild angular gym architecture and stylized oily molten pipes, theatrical steam high in background. An ultra energetic fever-dream gym scene, polished commercial cartoon 3D game environment, still visually readable.»

## Composição e integração

Manter a proporção natural ao desenhar no Canvas: dimensionar com uma única escala, com recorte quando necessário. Nunca atribuir uma largura e altura independentes à imagem. O piso vazio permite sobrepor os sprites existentes. As imagens não incluem probabilidades ou regras de jogo.
