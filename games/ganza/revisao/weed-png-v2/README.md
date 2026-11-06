# WEED a fumar, PNG v2

Asset de revisão para incorporar no canto da cena de Plinko. Ainda sujeito à aprovação visual do dono.

- [PNG animado para a cena](jogo/weed-fumar.png), versão leve a 128 × 128 px, alpha real, ciclo de 20 segundos.
- [Pacote PNG para o Plinko](weed-png-plinko.zip), sequência, oito atlas de 1024 × 1024 px e manifesto, a 128 × 128 px por frame.
- [PNG animado de maior resolução](weed-fumar-v2.png), master a 256 × 256 px, para revisão e eventual redimensionamento.
- [Pacote para integração](weed-png-v2.zip), sequência de 480 PNGs RGBA, oito atlas PNG e manifesto com coordenadas e tempos.
- [24 poses originais](poses/), extraídas da folha gerada com as duas fotografias indicadas pelo dono.
- [Folha de contacto](contacto.jpg), momentos sobre três fundos para inspecionar o recorte e o fumo.
- [Prévia](preview.html), abrir através do servidor local, para avaliar o PNG animado sobre fundos diferentes.
- [Manifesto](atlas/animation.json) e [validação](validacao.json).

## Incorporação

Para uma camada HTML simples, usar o PNG animado com um elemento `img`, reservar as dimensões e manter o fundo transparente. O formato é APNG, um PNG com animação, não um GIF renomeado. Browsers sem suporte a APNG mostram apenas o primeiro frame.

Para Canvas ou WebGL, usar a sequência ou os atlas. Cada frame tem 256 × 256 px, origem no canto superior esquerdo e ponto de apoio ao centro do bordo inferior. Reproduzir pelo tempo decorrido no ciclo de 20 000 ms, a 24 fps. Não fazer avançar um frame por cada `requestAnimationFrame`, pois a frequência do ecrã pode ser 60 ou 120 Hz.

Os oito atlas do master têm 2048 × 2048 px. Os da versão leve para o jogo têm 1024 × 1024 px. Cada um contém até 64 frames, com as regiões no respetivo manifesto. Há imagens transparentes na parte não utilizada do último atlas. Em telemóvel, carregar e conservar apenas o atlas atual e o seguinte para evitar manter todos os mapas descodificados em memória.

Em movimento reduzido, apresentar um frame de descanso. O fumo é semitransparente e não deve receber um fundo opaco nem ser pré-multiplicado duas vezes pelo renderer. Os ficheiros estão em alpha direto, RGBA.

## Produção e limites

Criado com o ImageGen integrado, não com a API CLI. [Prompt e referências](PROMPT.md). São **24 poses desenhadas pela ferramenta**, com **480 frames de reprodução interpolados**, não 480 desenhos independentes. A interpolação usa fluxo de movimento bidirecional, aplica a mesma deformação à cor e ao alpha e trata regiões que ficam ocultas. A montagem e a exportação são reproduzíveis no [script](../../scripts/weed-smoke-png-v2.py).

Os padrões na gola e nos punhos remetem para zellige. As baforadas alternam entre arabescos, anéis e uma folha. Mantêm-se a identidade das fotografias, o chapéu e a roupa jade. Fotografias não incluídas no pacote nem nos assets públicos.
