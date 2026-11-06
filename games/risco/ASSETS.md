# Recursos e origem

Uso privado. Sem fotografias pessoais nos ficheiros finais, sem publicação executada.

| Recurso | Origem e estado |
| --- | --- |
| [bathroom.png](art-src/bathroom.png) → [bathroom.webp](ui/art/bathroom.webp) | ImageGen integrado, criado nesta tarefa. Conversão WebP qualidade 87. |
| [casino-thumbnail.png](art-src/casino-thumbnail.png) → [casino-thumbnail.webp](ui/art/casino-thumbnail.webp) | Thumbnail ImageGen própria, com a folha tatuada aprovada e a identidade original como referências. Título RISCO em lima, rosto e manga de caveiras em grande, vidro/reflexos e cenário Acidwave. WebP 800×1200, qualidade 88. Copiada automaticamente para a capa do catálogo na build. |
| [lcd-states-approval.png](art-src/lcd-states-approval.png) | Estudo inicial ImageGen com a [folha aprovada](../piece-police/art-src/characters/CHR-P5-SHEET.png) como referência, substituído pela revisão tatuada e não integrado. |
| [lcd-cocaine-tattoo-approval.png](art-src/lcd-cocaine-tattoo-approval.png) | Mesma identidade, colete sem mangas, manga direita de caveiras/rosas, pose de cheirar e paragem. ImageGen integrado com referência aprovada. **Aprovado pelo dono com «Sim aprovo».** |
| [lcd-cocaine-atlas.png](art-src/lcd-cocaine-atlas.png) → [atlas final](ui/art/lcd-cocaine-atlas.webp) | ImageGen integrado com a folha original e a revisão tatuada como referências. Alpha real, grelha 4×4, antecipação, oito poses de inalação e quatro de paragem/recuo. Margens normalizadas, WebP final aprovado e ativo. |
| [lcd-approved-portrait.webp](ui/art/lcd-approved-portrait.webp) | Retrato anterior [chr-p5-port.webp](../piece-police/ui/art/chr-p5-port.webp), conservado como fallback, substituído em cena pelo atlas aprovado. |
| [Oxanium.woff2](ui/fonts/Oxanium.woff2) | Fonte local do Peace Police, licença [OFL](ui/fonts/Oxanium-OFL.txt). |
| Linha, pó, gráfico, partículas e rig | Procedurais em [scene.js](ui/scene.js), sem biblioteca de assets. |
| Promo | GIFs, MP4 e capa exportados pelo próprio renderer via [promo.mjs](scripts/promo.mjs), com o atlas tatuado aprovado. A cópia de revisão em art-src/character-preview fica como histórico. |

## Prompts de arte

Folha: preservar rosto, cabelo curto, bigode fino, barba no queixo, óculos geométricos e casaco violeta da referência. Acidwave, luz lima/magenta/ciano, doze painéis iguais. Poses alinhar, calmo, ansioso, alucinado, glitch, lenda, três posições da fungada, cabeça atrás, encolher de ombros, traído. Caricatura simpática, sem texto ou logótipos. Mostrada ao dono antes de integrar.

Revisão tatuada: a mesma identidade com colete preto/violeta sem mangas e uma manga direita de caveiras, rosas e fumo em preto/cinzento. Três vistas para aprovação, rosto legível, pose sobre vidro negro a cheirar e pose a parar. O atlas derivado pede 16 poses de tronco com braços completos e alpha, câmara e escala estáveis, oito poses de ciclo e quatro de recuo, sem mesa nem pó no bitmap para os animar separadamente. Os prompts usaram as duas referências, sem fotografias pessoais.

Cenário: casa de banho de discoteca às 5 h, azulejo roxo preto, espelho rachado, néon lima, reflexos magenta/ciano, fumo, cartaz rave fictício rasgado, mesa de vidro preto em perspetiva, cartão/notas à esquerda e copo à direita. Centro escuro para HUD, sem pessoas, pó ou letras.

## Som

[synth.js](ui/synth.js) produz síntese original. [export-audio.mjs](scripts/export-audio.mjs) exporta WAV PCM mono 48 kHz / 16 bits com medição K-weighted e gating, alvo −16 LUFS e limitador a 0,98. Sons muito curtos ficam até −16,72 LUFS após limitar, conforme [medições](ui/audio/normalization.json). Sem amostras copiadas.

| Ficheiro | Construção |
| --- | --- |
| card.wav | Ruído e ressonância plástico/vidro |
| puff.wav | Ruído filtrado e brilho agudo |
| milestone.wav | Sinos ascendentes |
| sniff-loop.wav | Inalação contínua sintetizada, apenas durante a subida |
| crash.wav | Corte da inalação, glitch e impacto grave |
| crash-double.wav | Corte, stutter duplo e impacto grave |
| instant.wav | Sopro curto e boing |
| cashout.wav | Tríade brilhante |
| betrayed.wav | Oscilador modulado, sem fala |
| loss.wav | Estalo grave |
| max.wav | Acordes ascendentes e percussão |
| ui.wav | Clique sinusoidal |

Cada efeito tem também OGG Opus a 96 kbit/s, codificado pelo AudioEncoder nativo do Edge e encapsulado em Ogg por [compress-audio.mjs](scripts/compress-audio.mjs). Os ficheiros são descodificados novamente no browser para verificar formato e duração. O runtime prefere OGG onde suportado e usa WAV como fallback. Música **provisória**, original em Web Audio a 124 BPM / Lá menor. As faixas finais vêm do dono, ver [prompts](docs/PROMPT-MUSICA.md).
