# Prompt — GANZÁ, ajustes ao visual «Falésia»

Para colar na conversa do Codex que implementou `PROMPT-NOVO-VISUAL.md`, com as duas imagens anexadas. Copiar tudo a partir da linha seguinte.

---

## Ponto de situação

O dono viu o resultado: **está quase, mas não é isto.** A interface de baixo está no bom caminho. O que falha é a **composição da cena**, que se afastou da imagem aprovada.

- Referência aprovada: `games/ganza/revisao/referencia/falesia-aprovada.webp`.
- Estado atual rejeitado (Extrema, 1183 px): `games/ganza/revisao/referencia/estado-rejeitado-extrema.webp`.

Abre as duas lado a lado antes de mexer em nada. Continua a trabalhar sozinho, sem parar para perguntar. Os limites de `PROMPT-NOVO-VISUAL.md` continuam: sem tocar em `src/`, `tabelas/`, carteira, provas, `functions/`, Firebase, deploy, commit ou push.

## O que está errado e como deve ficar

### 1. A falésia virou uma ilha

**Agora:** um rochedo isolado, em forma de bolo, no meio do mar, com o tabuleiro pintado por cima e água à volta.

**Deve ficar:** como na referência, uma **falésia alta da costa**, que entra pela esquerda e ocupa a altura toda da cena. A rocha nasce fora do ecrã à esquerda e em baixo, a face lisa onde estão os pinos fica virada para nós, e a falésia acaba à direita a descer para o mar, com a vila e o farol ao fundo. Não é um objeto pousado na água: é terra firme, com vegetação no topo e rochas na base.

### 2. O WEED está pequeno, longe e colado

**Agora:** um boneco pequeno no topo do rochedo, sentado num bloco retangular com tapete, com recorte visível, sem ligação ao chão e sem a luz da cena.

**Deve ficar:** como na referência, **grande, em primeiro plano, à esquerda**, sentado na beira de uma rocha que faz parte da falésia, com a pilha de placas ao lado em cima do tapete e a pérgola com buganvílias e a lanterna **por cima dele**. Na referência ocupa cerca de 35 % da largura e quase toda a altura da cena. Em computador, aponta para 25–35 % da largura, sem tapar os pinos.

- Nada de bloco ou plataforma retangular: o assento é a rocha pintada da própria cena.
- Recorte limpo, sem halo, sem sombra quadrada. Sombra de contacto na rocha.
- Luz quente da lanterna e do ambiente (pôr do sol, crepúsculo ou aurora, conforme a dificuldade) na cara e na roupa.
- O balão de fala («Calma, que vai.») sai **da boca do WEED**, com ponta a apontar para ele. Hoje está colado debaixo do logótipo.

### 3. Os pinos são pontos minúsculos

**Agora:** bolinhas verdes de poucos píxeis. Não se vêem bóias nem argolas.

**Deve ficar:** bóias verdes com **argola de latão** visível, como na referência. Em 16 linhas há muitos pinos, por isso:

- O tabuleiro ocupa **mais altura**: do topo da falésia (logo abaixo do logótipo) até ao cais, cerca de 70–75 % da altura da cena.
- O tamanho do pino sai do espaçamento: cerca de 45–55 % da distância entre pinos, com um mínimo de 14 px em computador. Em 8 e 12 linhas ficam maiores, como na referência.
- A bóia tem volume (luz em cima, sombra em baixo), a argola e uma pequena sombra na rocha.

### 4. As lanchas parecem discos voadores

**Agora:** pequenas formas redondas coloridas, como carrinhos de choque ou discos, alinhadas na água.

**Deve ficar:** **lanchas semirrígidas reais**, vistas de ¾ como na referência, com casco e consola pretos, motor, e o tubo colorido à volta. Atracadas lado a lado num **cais de pedra** na base da falésia, com reflexos coloridos na água.

- Mantém uma só fila e a cor do tubo por valor.
- As etiquetas dos multiplicadores estão boas. Põe-nas como pequenas bandeiras ou placas pintadas presas à lancha, com a mesma legibilidade.
- Com 17 lanchas, cada uma fica estreita: desenha a lancha de frente ou de ¾ apertado para caber, mas tem de continuar a parecer uma lancha.

### 5. Logótipo e elementos soltos

- O logótipo GANZÁ e o texto «PELADINHAS · A FALÉSIA» estão tapados pelas buganvílias. As flores ficam atrás do texto ou afastam-se, e o logótipo fica todo legível.
- A pérgola e a lanterna estão encostadas à margem esquerda, longe do WEED. Juntam-se ao WEED, como na referência.
- O losango geométrico que flutua junto à lua na Extrema parece um elemento de interface perdido. Ou se integra num padrão de zellige no céu, maior e coerente, ou sai.

### 6. Interface

Está próxima do pretendido. Ajustes:

- A segunda faixa em baixo, só com AUTO e Verificar jogada, gasta altura à cena. Junta AUTO, Verificar jogada e o histórico das últimas 20 jogadas numa só faixa com os controlos, ou passa AUTO para junto do LARGAR e Verificar para um ícone.
- O histórico das últimas jogadas desapareceu. Repõe-no (pequenos tubos coloridos como os das lanchas).
- A escala da cena tem de aproveitar o espaço ganho.

## As quatro dificuldades

Os ajustes 1 a 5 aplicam-se às quatro dificuldades. A composição (falésia, WEED, tabuleiro, cais) é **a mesma** nas quatro, e muda só a luz, o céu e a decoração, como está em `PROMPT-NOVO-VISUAL.md`. A **Média** tem de ficar praticamente igual à referência.

Em telemóvel na vertical, mantém a lógica: falésia a ocupar a altura, WEED na rocha em primeiro plano (em baixo à esquerda ou por cima do tabuleiro, mas grande o bastante para se reconhecer a cara), lanchas no cais, controlos em baixo.

## Como trabalhar

1. Primeiro, faz uma **maqueta estática** da Média em 1920×1080 com as camadas novas e põe-na lado a lado com a referência em `revisao/falesia-v2/comparacao-media.png`. Revê tu mesmo os seis pontos acima e corrige até baterem certo.
2. Depois integra no jogo, aplica às quatro dificuldades e faz as versões de telemóvel.
3. Em cada ciclo, tira capturas e compara com a referência. Para quando a Média parecer a referência em movimento.

## Critérios para dar por terminado

1. A falésia entra pela esquerda e ocupa a altura da cena. Não há rochedo isolado no mar.
2. O WEED está em primeiro plano à esquerda, com 25–35 % da largura em computador, sentado na rocha, sem bloco retangular, sem halo, com a luz da cena e o balão a sair dele.
3. Os pinos são bóias com argola visíveis, com pelo menos 14 px em 16 linhas em 1920×1080.
4. As lanchas parecem lanchas semirrígidas num cais de pedra, numa só fila, com etiquetas legíveis a 320 px em 16 linhas.
5. O logótipo está todo legível e não há elementos soltos sem sentido.
6. O histórico de jogadas voltou e a interface usa uma só faixa em baixo.
7. A Média em 1920×1080, lado a lado com a referência, tem a mesma composição.
8. Os testes atuais passam e `npm.cmd run build:casino` passa.

## Entrega

Em `revisao/falesia-v2/`: a comparação da Média com a referência, capturas das quatro dificuldades em 1920×1080, 1366×768, 390×844 e 320×740, um vídeo de 20 segundos e um `DEPOIS.md` com o que mudou e o que ainda difere. Atualiza `ASSETS.md`, `DECISOES.md` e `promo/`.

Termina com **Deploy:** `.\deploy.ps1`, sem o executar.
