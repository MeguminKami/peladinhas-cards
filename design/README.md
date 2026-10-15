# Recursos de design

[← Documentação](../docs/README.md)

`design/` preserva as fontes de trabalho. `assets/` contém os recursos que a aplicação entrega ao utilizador. Os originais foram movidos sem alteração dos ficheiros; os caminhos públicos WebP/WOFF continuam iguais.

| Origem                                     | Derivado utilizado                                       | Regeneração                            |
| :----------------------------------------- | :------------------------------------------------------- | :------------------------------------- |
| `sources/playstyles/*.png`                 | `../assets/playstyle/*.webp` · máximo 256 px             | `node scripts/optimize-playstyles.mjs` |
| `sources/fonts/manrope-variable.ttf`       | `../assets/fonts/manrope-*.woff` · pesos 400/600/700/800 | `python scripts/generate-fonts.py`     |
| [`../assets/logo.svg`](../assets/logo.svg) | `../assets/pwa/*.png`                                    | `node scripts/generate-pwa-icons.mjs`  |

Executar os comandos a partir da raiz do projeto. A geração de WebP/ícones usa Playwright; a de fontes usa `fonttools`, instalado opcionalmente com `python -m pip install -r design/requirements.txt`. A licença Manrope acompanha os ficheiros distribuídos em [`assets/fonts/OFL-Manrope.txt`](../assets/fonts/OFL-Manrope.txt).

Os oito PNG originais de playstyles ocupam mais de 7 MB; os derivados WebP usados pelo frontend ocupam cerca de 107 KB. `design/` não faz parte do pacote Hosting nem do pacote de Functions, mas faz parte da exportação do código para o futuro repositório.

Os recursos da apresentação ficam em [`docs/media/`](../docs/media/). O hero SVG existente mantém a identidade do projeto; as capturas são regeneradas com dados fictícios através de `npm run docs:images`.
