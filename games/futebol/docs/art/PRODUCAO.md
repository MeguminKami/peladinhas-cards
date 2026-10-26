# Produção artística — amostra 1

> Integração: `public/assets/football/` contém apenas a arte ativa. Variantes antigas estão em `docs/art/archive/symbols/` e não seguem no build. O manifesto foi atualizado com os caminhos arquivados. As descrições de versões abaixo são históricas.

**Revis?o 2 implementada:** quatro premium s?o cartas de jogadores em bronze, prata, ouro e violeta; WILD e Scatter ampliados, sem texto nem hover nos s?mbolos. Fontes locais Oxanium e Barlow Condensed, consola personalizada, global ? esquerda, roletas, suspense, roubo vis?vel e fixa??o dourada. Esta revis?o prevalece sobre as propostas da amostra 1 abaixo. Ver [REVISAO_V2.md](REVISAO_V2.md).
Data: 24/10/2026. Tema: **Futebol de Bairro — Noite de Glória**. Matemática preservada: 0.3.1.

## Entregue no projeto

- Um cenário noturno ilustrado, com campo, prédios, vedação, murais e projetores.
- Dez símbolos individuais em PNG com alpha: cone, apito, garrafa, meião, bola, chuteiras, camisola, troféu, carta Wild e bilhete Scatter.
- Identidade tipográfica e emblema SVG original; UI azul-grafite/dourada e moldura adaptativa de marcador desportivo, desenhadas por código.
- Número 10, WILD, SCATTER, valores, multiplicadores e rótulos como camadas de texto; não estão colados no raster.
- GUI temática em ecrã único, com todos os controlos e janelas existentes.
- Nomes Torneio Noturno, Final do Bairro e Noite de Glória, com variações de iluminação/aro por modo.
- Carregamento real dos onze recursos, progresso e repetição em caso de erro.
- Primeiro spin completo com movimento visual, revelação dos símbolos e apresentação de poderes a partir dos eventos reais.
- P1 local × global, expansão P2, conversão P3, adições P4 e confirmação de sticky; modo super-rápido/reduzido agrupa a apresentação e preserva o estado final.
- Realce de vitórias e trajetórias SVG baseadas nas linhas pagas. Uma trajetória de cada vez; a seleção em Último spin permite consultar outra linha sem jogar.
- Painéis de compra/entrada com ilustração, resumo e primeira celebração com troféu quando há ganho líquido e retorno alto.
- Preview inicial identificado como apresentação, sem criar ronda, consumir RNG ou mexer em saldo.

## Ficheiros

| Local | Conteúdo |
|---|---|
| `public/assets/football/backgrounds/` | Cenário PNG original |
| `public/assets/football/symbols/` | Dez masters PNG originais |
| `public/assets/football/brand-mark.svg` | Emblema original de UI |
| `web/theme.ts` | Mapeamento dos símbolos/nomes, camadas textuais e preloader |
| `web/football.css` | Aplicação temática, moldura, estados e animações CSS |
| `web/presentation.ts` | Sequência visual baseada nos eventos e cancelamento seguro |
| `web/main.ts` | Integração dos controlos, tabuleiros e janelas |
| `docs/art/manifest.json` | Inventário dos assets produzidos e estado de produção |
| `docs/art/PROMPTS_MASTER.json` | Prompts exatas do cenário, premiums, W e S |
| `docs/art/PROMPTS_NORMAIS.md` | Prompts exatas dos quatro símbolos normais |

Todas as imagens raster desta entrega foram geradas pela ferramenta integrada **image_gen**, com chamadas separadas por asset. Os originais foram copiados do diretório de imagens geradas para o workspace, preservando o alpha, sem pintura de fundo, crop ou remoção por script. Os quatro normais foram produzidos em paralelo por um agente usando a mesma direção artística.

Tamanhos efetivos: símbolos quadrados de 1254×1254, exceto o bilhete em 1536×1024; o layout usa contain e escala por célula. Cenário em 1672×941. Os tamanhos são os realmente devolvidos pela ferramenta, não os tamanhos nominais propostos na bíblia. Os dez símbolos têm alpha zero nos cantos, verificado por leitura de pixel e teste de browser.

## Limites da amostra

Esta é uma primeira amostra integrada, não a conclusão de todo o catálogo do TEMA.md:

- O cenário é uma imagem composta. Camadas editáveis independentes de cidade, público, céu e projetores ainda estão por produzir.
- Os modos reutilizam esse cenário com filtros e iluminação de código; não são ainda três masters de ambiente separados nem composições verticais exclusivas.
- Símbolos são masters estáticos com transformações/efeitos CSS. Não existem rigs Spine, personagens articuladas, animações de tecido independentes ou spritesheets de frames desenhados.
- A apresentação usa DOM e animações CSS, coordenadas por `presentation.ts`. Não foi feita nesta amostra a migração do tabuleiro para PixiJS/GSAP; a separação da orquestração permite essa evolução.
- A transição de ambiente usa mudança de iluminação e painéis ilustrados, ainda sem a coreografia completa de projetores, fitas e bancadas definida no tema.
- Há primeiras animações de vitória e poderes, não todas as animações individuais do catálogo. Não há áudio.
- Os PNGs são masters com cerca de 20 MB no conjunto dos dez símbolos. Atlas, variantes 256/512, compressão e medições de desempenho em dispositivos reais pertencem à otimização seguinte; não se declara 60 FPS medido nesta entrega.

## Verificação

Validações de referência: TypeScript, build Vite, testes do motor/sessão e testes Playwright. Os testes de GUI cobrem compras, dez FS, restauro, saldo, velocidades, enquadramento em cinco viewports, carregamento/alpha dos dez símbolos e cenário do superior recuperado. Os resultados correntes devem ser confirmados no terminal da execução que acompanha a entrega.

Prompts e fontes ficam registados no projeto para reproduzir a direção artística. A ferramenta não garante que uma nova geração produza pixels idênticos; preservar estes masters como referência para iterações.
# Atualização dos premiums personalizados

P2 e WILD vigentes: `p2-personal-v3.png` e `w-personal-v3.png`. Identidade anterior do P2 transferida para WILD; P2 usa a nova fotografia do homem careca de óculos, com corpos refeitos. Ver [P2_WILD_IDENTIDADES_V3.md](P2_WILD_IDENTIDADES_V3.md). Versões anteriores arquivadas fora do build.

P4 vigente: `p4-personal-v3.png`, retrato desportivo de tronco com camisola folgada, gola fechada e braços cruzados. Substitui o enquadramento da v2; ver [P4_DESPORTIVA_V3.md](P4_DESPORTIVA_V3.md).

Revisão vigente: `p1-personal-v2.png` a `p4-personal-v2.png`. Proporções físicas revistas, P2 e P4 com corpo reconstruído e P1 mais frontal. Ver [PREMIUM_PESSOAS_V2.md](PREMIUM_PESSOAS_V2.md) para prompts e ficheiros; v1 arquivada fora da distribuição pública.

P1–P4 usam agora `p1-personal-v1.png` a `p4-personal-v1.png`, com as pessoas das quatro fotografias fornecidas pelo utilizador. P3 está careca, sem chapéu. Prompts e correspondências em [PREMIUM_PESSOAS.md](PREMIUM_PESSOAS.md); dimensões reais no manifest. As quatro cartas anteriores estão arquivadas fora da distribuição pública. As notas seguintes descrevem entregas anteriores.

