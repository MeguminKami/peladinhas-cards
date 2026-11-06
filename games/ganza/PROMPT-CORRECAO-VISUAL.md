# Prompt — Correção visual do GANZÁ (LoFi pastel)

Copiar tudo a partir da linha seguinte e entregar ao Codex.

---

## Contexto

O GANZÁ está jogável e a matemática, a carteira e os testes estão bons. **Não mexas neles.** O problema é o visual: o jogo integrado não se parece com os estudos LoFi aprovados pelo dono. O dono escolheu a direção **LoFi pastel** e confirma-a. A referência visual é esta, por ordem de importância:

1. `games/ganza/revisao/lofi-progressao-4-volatilidades.png` (os quatro ambientes).
2. `games/ganza/revisao/style-frame-final.png`.
3. `games/ganza/DECISOES.md` (decisões do dono, continuam válidas).

Antes de mudar qualquer coisa, abre o jogo em `http://localhost:8080/#/casino` (ou `npm.cmd run dev --prefix games/ganza`), tira capturas em 1920×1080, 1366×768, 390×844 e 320×740 e põe-nas lado a lado com os estudos. Escreve em `revisao/correcao-visual/ANTES.md` a lista de diferenças que encontrares. Depois corrige.

## O que o dono rejeitou (tudo isto tem de desaparecer)

1. **Branco e creme a mais.** O cartão creme à volta do jogo, o cabeçalho creme, a barra de controlos creme, as pílulas cinzentas e o tabuleiro bege. O jogo parece uma página de formulário com uma imagem no meio.
2. **O WEED não está integrado.** É um retângulo recortado colado no canto superior esquerdo, com um rosto quase fotográfico que não combina com a pintura do fundo. Nos estudos ele está **dentro da cena**, sentado no terraço, encostado às almofadas, com a mesma luz e a mesma pintura do resto.
3. **O tabuleiro é um triângulo de papel bege** por cima de dois pedaços de cenário cortados. Nos estudos os pinos flutuam **sobre o mar**, dentro da paisagem, e a cena é uma só imagem contínua.
4. **As lanchas são silhuetas pequenas em duas filas desencontradas**, com etiquetas genéricas. Não se percebe que são lanchas de narcotráfico no mar da cena.
5. **Os controlos não têm tema.** São botões e `<select>` de sistema, iguais a qualquer formulário. Só o LARGAR tem cor.
6. A barra «0,35 DJC · 0,35× … 0 NO AR» é uma faixa técnica sem tema.

## O que tem de ficar

### Cena de ponta a ponta

- O iframe inteiro é a cena, **sem cartão creme nem moldura branca**. O fundo pintado LoFi ocupa todo o espaço e os elementos da interface ficam por cima dela, como num jogo de consola.
- Uma única ilustração contínua por volatilidade (Baixa, Média, Alta, Extrema), como nos estudos: céu ao pôr do sol com lua, costa marroquina, mar azul-turquesa, terraço em primeiro plano com almofadas e tapetes, lanternas, buganvílias, zellige, a crescer com a volatilidade como está em `DECISOES.md`.
- Gera o fundo em várias camadas (céu, costa, mar, terraço e primeiro plano) para haver parallax leve, reflexos na água, ondas, lanternas a tremeluzir, folhas a mexer e fumo. Nada parado.
- Paleta: pastel arco-íris com cores vivas, como nos estudos. Nenhuma área grande em branco ou creme liso. Os brancos só aparecem nas casas da costa, na lua e nos brilhos.

### Tabuleiro

- Sem triângulo de papel. Os pinos ficam **sobre o mar e o céu**, como nos estudos. Se for preciso legibilidade, usa uma veladura muito subtil (vidro fosco translúcido, véu de seda ou névoa) com bordas suaves, nunca uma forma opaca.
- Os pinos são pequenas bóias ou lanternas de vidro jade, pintadas no mesmo estilo, com brilho e sombra, e acendem ao toque.
- A bola de ganzá castanha-clara continua, com rasto de fumo e sombra na água por baixo.
- O tabuleiro continua a ser o foco e a ocupar a maior parte da área jogável, como o dono pediu.

### Lanchas

- **Uma só fila** de lanchas a flutuar no mar da cena, pintadas no mesmo estilo dos estudos (lancha preta semirrígida, com padrões marroquinos no casco nas volatilidades mais altas), com reflexo e espuma na água e balanço desfasado.
- O multiplicador está no casco num azulejo de zellige ou numa placa pintada, com cor por valor (pastel nas baixas, jade nas médias, dourado nas altas, rosa e violeta a brilhar nas máximas).
- Em 16 linhas e ecrã estreito, mantém uma fila: reduz a escala das lanchas, usa números compactos («9999×», «710×», «0,2×») e, se não couber, roda as placas na vertical. Duas filas só como último recurso, e nunca desencontradas.
- Arredonda a apresentação dos multiplicadores (por exemplo 709,64× aparece como 710×) só na etiqueta do casco. A tabela de probabilidades e a prova mostram o valor exato.

### WEED

- Fica **dentro da cena**, no terraço, sentado nas almofadas com as placas ao lado, como nos estudos. Não é um retângulo nem um cartão.
- PNG com alpha limpo: sem halo, sem bordas claras, sem restos do fundo. Usa alpha pré-multiplicado e verifica o recorte ampliado a 400 % sobre fundo escuro e claro.
- O rosto tem a mesma pintura LoFi do resto da cena (pinceladas, cor e luz quente de pôr do sol), mantendo a semelhança com as fotografias. Não pode parecer uma fotografia colada numa pintura.
- Sombra de contacto nas almofadas, luz das lanternas no rosto e na roupa, e fumo que passa à frente e atrás dele.
- A animação de 20 segundos continua (a fumar, gestos, baforadas), mas sem saltos entre frames nem mudanças de recorte. Se a interpolação de frames produzir artefactos, usa menos poses bem desenhadas.
- Em telemóvel, o WEED fica no terraço do primeiro plano, mais pequeno, sem tapar o tabuleiro nem os controlos.

### Interface temática

Todos os controlos passam a pertencer ao mundo do jogo: azulejos de zellige, latão envelhecido, madeira pintada, tecido bordado e cores pastel. Sem controlos de sistema.

- **Cabeçalho:** logótipo GANZÁ em letras pintadas à mão no estilo LoFi, sobre a cena, sem faixa creme. O saldo fica numa placa de latão ou azulejo, legível.
- **Aposta:** placa de madeira pintada com o valor ao centro e botões ½, −, +, 2× como pequenos azulejos.
- **Linhas:** três azulejos (8, 12, 16) com o selecionado aceso. Nada de `<select>`.
- **Volatilidade:** quatro azulejos com um ícone de cada ambiente (onda calma, lanterna, medina, arco psicadélico) e o nome por baixo.
- **LARGAR:** o botão principal é um medalhão grande de latão e zellige, ou uma lanterna, com a bola de ganzá desenhada, que afunda ao carregar e brilha quando está pronto. Mostra «ESPAÇO» por baixo.
- **AUTO:** um azulejo com ícone de repetição e o mesmo menu de limites que já existe, redesenhado no tema.
- **Histórico:** as últimas 20 bolas em pequenos azulejos com a cor da lancha, numa faixa de tecido bordado ou madeira.
- **Verificar jogada** e o menu (≡): ícones pequenos em latão.
- A barra «0,35 DJC · 0,35× … 0 NO AR» desaparece. O último resultado aparece por cima da lancha onde caiu e no histórico. Se for preciso indicar bolas no ar, usa um contador pequeno junto ao LARGAR.
- Os painéis de controlos têm um fundo escuro e translúcido com textura (madeira escura ou tecido), para o texto ser sempre legível sobre a cena. Contraste mínimo AA em todos os números.
- Os diálogos (verificar jogada, probabilidades, autoplay, menu) seguem o mesmo tema.

### Animação e efeitos

- Mantém o que já existe (pinos a reagir, celebrações, partículas) mas no estilo LoFi: brilhos suaves, pétalas de buganvília e folhas a voar nos prémios, lanternas a acender em cadeia nos prémios altos, fogo de artifício pastel na carga completa.
- O ambiente de cada volatilidade muda com uma transição pintada (fundido, névoa ou pétalas), não com um corte.

## Como trabalhar

- Faz tudo sozinho, sem parar para perguntar. O dono pode estar fora.
- Trabalha em ciclos: muda, tira capturas nos quatro tamanhos, compara com os estudos, corrige. Repete até o jogo parecer o estudo em movimento.
- Não alteres `src/`, `tabelas/`, a carteira nem as provas de jogada. Não sobes a versão da matemática. Os testes atuais têm de continuar a passar.
- Não mexas em `functions/`, não leias nem escrevas dados reais do Firebase, não faças deploy, commit nem push.
- Atualiza `ASSETS.md` com a arte nova e `DECISOES.md` com as escolhas que fizeres.

## Critérios para dar por terminado

1. Nenhuma área grande em branco ou creme liso em nenhum dos quatro tamanhos.
2. O WEED está no terraço da cena, sem retângulo, sem halo e com a mesma pintura do fundo.
3. Os pinos estão sobre o mar, sem triângulo de papel.
4. As lanchas estão numa só fila no mar, legíveis a 320 px em 16 linhas.
5. Não há nenhum botão, `<select>` ou campo com aspeto de sistema.
6. Os quatro ambientes de volatilidade parecem os estudos LoFi correspondentes.
7. 60 fps com 10 bolas no ar em 1920×1080, sem erros na consola.
8. Os testes existentes (`npm.cmd test --prefix games/ganza`, `tests/browser.mjs`, `tests/final.mjs`, `tests/website.mjs`) passam.
9. `npm.cmd run build:casino` passa e o jogo aparece corrigido em `http://localhost:8080/#/casino`.

## Entrega

Deixa em `revisao/correcao-visual/`:

- As capturas de antes e depois nos quatro tamanhos e nas quatro volatilidades, lado a lado com o estudo correspondente.
- Um vídeo de 20 segundos do jogo corrigido (uma queda normal, um prémio alto e a troca de volatilidade).
- `DEPOIS.md` com o que mudou, o que foi testado, e o que ainda não ficou igual ao estudo, se houver.

Atualiza também os GIFs e o MP4 de `promo/` e a capa, para refletirem o visual novo.

Termina a resposta com **Deploy:** `.\deploy.ps1`, sem o executar.
