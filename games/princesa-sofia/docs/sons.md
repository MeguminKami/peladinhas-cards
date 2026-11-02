# Sons e músicas

## Músicas

Loops em [ui/audio/music](../ui/audio/music) (`.opus`), um por modo: `theme-base` (jogo normal), `theme-hunt`, `theme-bonus-common` (Jardim Encantado), `theme-bonus-super` (Baile ao Luar, 10% mais baixo), `theme-bonus-secret` (Coroa da Aurora). Os originais antes do loop estão em `*.full.opus`; refazer os loops com `python scripts/loop-music.py`.

- **Transições:** a faixa que sai perde agudos (filtro) e baixa; a que entra abre e sobe num crossfade de potência constante de 2,2 s, sem silêncio. Base e Hunt são descodificados no primeiro clique; o tema do bónus começa a carregar quando as flores convergem ou na compra. Ligar o Hunt troca a música de imediato.
- **Duck:** a música baixa durante magia, introduções, MAX WIN e suspense de flores (18% por nível).

## Efeitos

Ficheiros em [ui/audio/sfx](../ui/audio/sfx). Paleta: caixa de música (celesta), marimba, pads suaves e pó de fada, em dó pentatónico. **Sem harpa** e sem agudos agressivos (pouca energia entre 2 e 5 kHz).

| Momento | Ficheiro | Como soa |
| --- | --- | --- |
| Cada coluna a pousar | `reel-land` | Nota de marimba; as 6 colunas sobem na escala (arpejo); toques mais agudos nos símbolos em suspense |
| Prémios | `hit-small` / `hit-medium` / `hit-large` / `hit-epic` | 2 notas curtas → arpejo de 3 e 5 notas → corrida de caixa de música com acorde |
| WILD a pousar | `wild-place` | Cristal redondo, uma nota acima a cada WILD; também no "× N" do cálculo do ganho |
| Flor a pousar | `scatter-land` | Sino doce, uma nota acima a cada flor |
| Suspense de flores | `scatter-anticipation` | Pad a pulsar e pó de fada a subir, mais agudo a cada nível |
| Flores a juntar | `scatter-converge` | Frase de caixa de música em dó maior com baixo de marimba |
| Entrada no bónus | `bonus-trigger` | Acorde quente a abrir |
| Introduções | `intro-common` / `intro-super` / `intro-secret` | Arpejo luminoso / pequena valsa / coro suave e sinos lentos |
| XP, magia | `xp-fly`, `magic-ready`, `magic-cast` | Sopro com pó de fada; acorde suspenso; corrida de caixa de música e acorde que floresce |
| Retrigger, compra, fim, MAX WIN | `retrigger`, `purchase-flowers`, `bonus-end`, `max-win` | Fanfarras curtas no mesmo estilo |
| Interface | `ui-*` | Cliques e toques curtos e discretos |

`manifest.json` lista os sons já normalizados (volume final no ficheiro) e variantes opcionais tocadas ao acaso.

## Mistura e sincronia (`ui/app.js`, `ui/audio-bus.js`)

- Ambiente comum: corte suave de agudos, compressor leve e reverberação curta gerada.
- Cada repetição varia ligeiramente o volume; os sons com notas ficam afinados (≤ 6 cêntimos) para não desafinarem com a marimba.
- **Sobreposição** (`sfxRules`): prioridade e intervalo mínimo por som; no máximo 6 vozes, sai a mais fraca; os grandes momentos (magia, prémio épico, flores, bónus) fazem sair os sons pequenos e silenciam-nos 0,7 s.
- **Sincronia:** os sons de queda tocam no impacto do símbolo (84% da queda; 78% no suspense); a cascata soa no primeiro símbolo novo a pousar; todos os efeitos são descodificados no primeiro clique.
- Volume em duas barras (Música e Efeitos, curva quadrática) e silêncio geral.

## Trocar sons — página de teste

`npm.cmd run dev` e abrir `/audio-lab.html`: cada momento tem as variantes **Atual** (original), **Caixa de música**, **Harpa e cristal**, **Pó de fada** e **Spin (novo)** (o conjunto em uso), tocadas com o mesmo ambiente do jogo e por cima da música; "Simular um spin" junta as escolhas. **Guardar e aplicar ao jogo** grava `audio-lab/choices.json` e copia os escolhidos para `ui/audio/sfx/` (ou `npm.cmd run audio:apply`).

- Gerar variantes sintetizadas: `python scripts/synthesize-sfx-v2.py audio-lab/candidates` (numpy, scipy, ffmpeg).
- Gerar variantes ElevenLabs com a chave do `.env`: `npm.cmd run audio:candidates` (ou `python scripts/generate-sfx-candidates.py --only intro-secret --n 2`).
