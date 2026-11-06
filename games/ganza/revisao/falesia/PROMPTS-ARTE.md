# Fontes e prompts da Falésia

6 de novembro de 2026. Ferramenta: **ImageGen integrado**, sem CLI ou API alternativa. Direção aprovada: [referência](../referencia/falesia-aprovada.webp). Fontes preservadas em `../../art-src/falesia/`; finais em `../../ui/art/falesia/`.

## Conjunto de prompts utilizado

Todos pedem pintura digital pastel luminosa, pinceladas suaves, cores puras, luz quente de fim de tarde e consistência com a referência. Sem texto, interfaces ou marcas na arte.

1. **cliff.png:** objeto isolado em alpha real, falésia alaranjada frontal, trapezoide largo, parede limpa, fissuras suaves e cais estreito na base. Sem pinos, plantas, pessoas, barcos, céu ou água. O tabuleiro é montado pelo renderer.
2. **environments.png:** folha 2×2 de quatro costas horizontais. Céu nos 55% superiores; vila branca, palmeiras e farol ao longe à direita; mar nos 45% inferiores. Esquerda e centro livres para a falésia. Variantes dourada diurna, rosa/lilás de pôr do sol, violeta/magenta e noite com aurora. Sem objetos de jogo ou primeiro plano.
3. **portraits.png:** quatro painéis verticais independentes lado a lado, cada um 1:2, céu nos 65% superiores e mar nos 35% inferiores; as mesmas quatro horas e vila ao fundo à direita. Sem recortar a pintura horizontal.
4. **actor.png:** folha 4×2 com oito poses completas, escala e âncora consistentes. Imagem aprovada como referência de roupa e pintura; duas fotografias autorizadas como referência de identidade. Chapéu escuro, casaco preto/verde, calças largas, ténis pretos, placa com cordel. Poses: sentado com placa; olhos fechados e cabeça para o mar; fumar; tocar no bigode; preparar lançamento; braço lançado para cima à direita; polegar; de pé a apontar. Rosto todo pintado, sem colagem fotográfica, sem cenário e com alpha real.
5. **objects-alpha.png:** três células iguais: bóia jade com corda curta, argola e fixação de latão; semirrígida preta frontal com tubo turquesa; placa verde retangular embrulhada e atada com cordel. A primeira geração tinha fundo branco. Segunda chamada de edição por ImageGen removeu fundo, linhas separadoras e sombra de chão, preservando os objetos e o alinhamento. É essa versão com alpha que o jogo usa.
6. **decor.png:** três células iguais isoladas em alpha: pérgola de madeira com buganvílias e lanterna marroquina; rocha alaranjada com tapete vermelho e pilha de três placas; hibiscos rosa com folhas verdes.

## Preparação e integração

[prepare-falesia.py](../../scripts/prepare-falesia.py) recorta as células e normaliza os limites e âncoras. Ao calcular limites ignora alpha até 32/255, evitando que resíduos quase invisíveis encolham os objetos. Mantém o alpha gerado dentro do recorte e não substitui fundos por chroma key. WebP qualidade 90; WEED em atlas PNG RGBA 1536×1024.

O renderer guarda a composição estática por dificuldade e dimensão em cache; cada objeto continua a ter fonte e posição próprias. Bóias, personagem, placa, lanchas, reflexos, luz, fumo e flores são desenhados separadamente. Tubos recebem rotação de matiz em pequenos sprites em cache, mantendo material e casco preto. Céu, costa e água usam planos recortados das pinturas contínuas; não há reconstrução tridimensional de objetos ocultos.

As fotografias não foram copiadas para as fontes desta entrega nem para a publicação. O ambiente sonoro adicional é síntese local, não nova recolha de som externo.

## Correção castanha

ImageGen integrado, edições precisas com alpha real e as imagens finais como alvos. `actor-brown.png`: mudar apenas as placas verdes nas oito poses para castanho, preservando casaco verde, rosto, células 4×2 e dimensões. `parcel-brown.png`: bloco castanho com reflexos âmbar, mantendo cordel e silhueta. `ledge-brown.png`: mudar só as três placas da pilha para castanho, preservando tapete, rocha e plantas.
