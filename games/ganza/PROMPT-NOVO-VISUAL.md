# Prompt — GANZÁ, novo visual «Falésia»

Para colar numa conversa nova do Codex, com a imagem `revisao/referencia/falesia-aprovada.webp` anexada. Copiar tudo a partir da linha seguinte.

---

## O pedido

O GANZÁ (Plinko do WEED, em `games/ganza/`) já está jogável e estável: motor, tabelas, carteira, provas de jogada, som e testes. **Isso não se mexe.** Esta conversa é só sobre o visual.

A imagem anexada (também em `games/ganza/revisao/referencia/falesia-aprovada.webp`) é a **direção visual aprovada pelo dono**. Foi um estudo teu de uma conversa anterior que nunca chegou a ser implementado. O objetivo é que o jogo fique **assim**, vivo e animado, e com o ambiente a mudar consoante a dificuldade.

Esta direção substitui o visual atual e as prompts visuais anteriores (`PROMPT.md` na parte da direção de arte, `PROMPT-CORRECAO-VISUAL.md`). As regras de matemática, justiça, carteira e Firebase desses documentos continuam válidas.

Trabalha sozinho, sem parar para perguntar. Há tempo. Prefere qualidade a rapidez.

### Leitura antes de começar

- `AGENTS.md` da raiz e `games/ganza/AGENTS.md`.
- `games/ganza/DECISOES.md`, `RELATORIO.md`, `ASSETS.md` e `revisao/correcao-visual/DEPOIS.md` (estado atual e o que já foi tentado).
- `games/piece-police/docs/fase3/PESSOAS.md` (regras para o rosto do WEED).
- O código da apresentação em `games/ganza/ui/` (`scene.js`, `scene-lofi.js`, `webgl.js`, `app.js`, `game.css`, `lofi.css`), para reaproveitar o que serve e retirar o que fica obsoleto.

Antes de mudar qualquer coisa, abre o jogo (`npm.cmd run dev --prefix games/ganza`, ou o casino em `http://localhost:8080/#/casino`), tira capturas nas quatro dificuldades em 1920×1080 e 390×844 e compara com a imagem. Escreve as diferenças em `revisao/falesia/ANTES.md`.

## O que a imagem define

- **Composição:** o tabuleiro está **cravado na face de uma falésia** de rocha alaranjada. Os pinos são bóias verdes penduradas em argolas de latão presas à rocha. Por baixo, ao nível da água, há um pequeno cais de pedra com **uma só fila de lanchas**.
- **Lanchas:** semirrígidas pretas, cada uma com a **bóia de borda (o tubo) numa cor do arco-íris**, do vermelho-coral nas pontas ao violeta e rosa. A cor é a primeira leitura do valor. As cores refletem-se na água.
- **WEED:** sentado na beira da rocha à esquerda, em primeiro plano, de chapéu de pescador, casaco preto e verde, calças largas, ténis pretos, com uma placa na mão e uma pilha de placas atadas com cordel ao lado, em cima de um tapete. Por cima dele, uma pérgola com buganvílias e uma lanterna marroquina acesa.
- **Fundo:** pôr do sol com nuvens rosa e lilás, lua cheia, costa com casas brancas, palmeiras e farol, mar turquesa com reflexos dourados.
- **Primeiro plano:** hibiscos rosa à direita, folhas verdes em baixo à esquerda.
- **Estilo:** pintura digital pastel e luminosa, pinceladas suaves, luz quente de fim de tarde, cores vivas e puras. Nenhuma área em branco ou creme liso.
- **Objeto que cai:** a **placa verde embrulhada e atada com cordel**, como na imagem, com um rasto jade em arco quando é lançada. Isto substitui a bola castanha da decisão 8 de `DECISOES.md`. É uma mudança só visual e fica registada em `DECISOES.md`.

## Como construir (a imagem é um alvo, não um fundo)

A imagem não pode ser colada como fundo com os pinos desenhados por cima, porque os pinos, as lanchas e o número de linhas mudam. Recria a cena **em camadas separadas**, geradas com a imagem anexada como referência de estilo e de composição:

1. Céu (gradiente e nuvens em 2–3 planos, para deriva lenta), lua.
2. Costa ao longe (vila, palmeiras, farol com feixe a rodar).
3. Mar (com animação de ondas e reflexos em shader ou sprites em ciclo).
4. Falésia **sem pinos** pintados: a face da rocha fica limpa para o jogo colocar as argolas e as bóias como sprites, conforme 8, 12 ou 16 linhas.
5. Cais de pedra e lanchas (lancha base e tubo colorível, ou uma lancha por cor).
6. WEED (ver abaixo).
7. Pérgola, buganvílias, lanterna e tapete.
8. Primeiro plano (hibiscos e folhas), com parallax ligeiro.

- **Pinos:** sprite de bóia verde com argola de latão, sombra na rocha, e estado aceso quando a placa lhe toca (brilho jade e um pequeno balanço da bóia na argola).
- **Placa:** sprite com rotação, ligeiro achatamento ao bater, rasto jade e pó de rocha nos impactos.
- **Número de lanchas:** 9, 13 ou 17, conforme as linhas, sempre numa fila. A cor do tubo segue o valor do multiplicador (escala do arco-íris do baixo ao alto, com as máximas a brilhar). O multiplicador aparece pintado numa pequena placa ou bandeira por cima de cada lancha, legível. Em ecrã estreito e 16 linhas, as lanchas encolhem, os números ficam compactos (por exemplo «710×» em vez de «709,64×», só na etiqueta) e a fila continua a ser uma só.
- **Queda numa lancha:** salpico, a lancha afunda e volta com balanço, o tubo brilha, o número salta. Nos prémios altos a lancha arranca e volta, com esteira na água.

Guarda as fontes em `art-src/falesia/` e os ficheiros finais otimizados (WebP, atlas) em `ui/art/falesia/`. Regista tudo em `ASSETS.md`. Retira do jogo a arte e o código do visual anterior que deixarem de ser usados.

## O WEED

- Usa o WEED da imagem anexada como referência de pose, roupa e pintura, e as fotografias de `games/piece-police/INSPIRATION/WEED/` para a semelhança do rosto, como está em `DECISOES.md`. As fotografias nunca entram nos ficheiros publicados.
- O rosto tem a mesma pintura do resto da cena. Não pode parecer uma fotografia colada.
- PNG com alpha limpo (pré-multiplicado, sem halo), sentado **na rocha da cena**, com sombra de contacto e a luz quente da lanterna e do pôr do sol.
- Animado de verdade, com partes separadas ou poses bem desenhadas e transições suaves, sem saltos de recorte:
  - Inativo: respira, pisca, abana a cabeça ao ritmo, balança o pé, olha para o mar. Variações de vez em quando: fuma e solta fumo, acena, coça o bigode, olha para a lua.
  - Lançar: pega numa placa da pilha e atira-a para o topo da falésia com um gesto preguiçoso (o arco jade da imagem).
  - Acompanha a placa com os olhos.
  - Reações: encolher de ombros (baixo), polegar para cima (médio), de pé a apontar (alto), dança (máximo).
- Em telemóvel fica na beira da rocha, mais pequeno, sem tapar pinos, lanchas nem controlos.

## As quatro dificuldades mudam o ambiente

A dificuldade (Baixa, Média, Alta, Extrema) muda **o ambiente**, não a interface nem o tabuleiro. A falésia, os pinos, as lanchas e a sua legibilidade ficam iguais nas quatro. Muda a hora, a luz, o céu, a decoração e a intensidade psicadélica. Cada uma é uma variante pintada das mesmas camadas:

| Dificuldade | Ambiente |
| --- | --- |
| **Baixa** | Fim de tarde dourado e calmo, céu azul com nuvens leves, mar sereno, a vila iluminada pelo sol, lanterna apagada. Gaivotas a passar. O WEED descontraído. |
| **Média** | O pôr do sol da imagem: nuvens rosa e lilás, lua a nascer, a lanterna acende, buganvílias em flor, primeiros fios de fumo jade com folhas a flutuar. |
| **Alta** | Crepúsculo violeta: céu roxo e magenta, lua grande, luzes da vila e do farol acesas, mais lanternas penduradas na pérgola, a rocha com reflexos rosa, fumo em arabescos, pétalas a voar, reflexos de néon pastel na água. |
| **Extrema** | Noite psicadélica: céu com aurora em arco-íris e padrões de zellige a girar devagar entre as estrelas, lua com halo de cores, mar que reflete tudo em espiral, falésia com veios a brilhar, lanternas a flutuar, fumo em anéis e folhas. O WEED com olhos semicerrados e um sorriso maior. Sempre legível. |

- A troca de dificuldade é uma **transição animada** de 1–1,5 s (a luz muda, o céu escurece ou clareia, as lanternas acendem ou apagam, o fumo entra ou sai), nunca um corte seco.
- O ambiente depende **só** da dificuldade escolhida. Nunca do saldo, das perdas, do histórico nem do resultado que vem aí.
- O som de ambiente acompanha: ondas e gaivotas na Baixa, grilos e lanternas na Média, vila ao longe na Alta, um pad etéreo por baixo na Extrema. Reaproveita o motor de som existente.

## Interface por cima da cena

A imagem não tem interface. Desenha-a tu, para pertencer a esta cena e nunca a tapar demasiado:

- O iframe inteiro é a cena, sem cartões creme nem molduras brancas.
- **Computador:** controlos numa faixa em baixo, sobre uma base de pedra esculpida ou madeira escura translúcida com um friso de zellige. Logótipo GANZÁ pintado à mão no céu, em cima à esquerda ou ao centro. Saldo numa placa de latão em cima à direita.
- **Telemóvel na vertical:** recompõe a cena (céu e lua em cima, falésia com os pinos ao centro, lanchas por baixo, WEED na rocha ao lado ou em baixo, controlos ao alcance do polegar). Gera as camadas na proporção vertical em vez de só cortar a horizontal.
- **Controlos:** aposta numa placa de madeira com azulejos ½, −, +, 2×. Linhas em três azulejos (8, 12, 16). Dificuldade em quatro azulejos com um ícone de cada ambiente (sol, pôr do sol, lua, aurora). LARGAR como medalhão de latão e zellige com uma placa desenhada, que afunda ao carregar (também barra de espaço). AUTO, histórico das últimas 20 jogadas em pequenos tubos coloridos como os das lanchas, e ícones de latão para verificar jogada e menu. Nada de `<select>` nem botões de sistema.
- Contraste AA em todos os números. Os diálogos (verificar, probabilidades, autoplay, menu) com o mesmo tema.
- Mantém todas as funções atuais da interface. Só muda o aspeto e a disposição.

## Qualidade técnica

- 60 fps em portátil com 10 placas no ar. Qualidade adaptativa em telemóvel.
- Pré-carregar só a dificuldade ativa e carregar as outras em fundo.
- `prefers-reduced-motion` e «Efeitos reduzidos»: sem tremores nem céu a girar, transições suaves, queda e resultados claros.
- Sem erros na consola. Sem scroll nem overflow em 1920×1080, 1366×768, 390×844 e 320×740 (com o menu do site).

## Limites

- Não alteres `src/`, `tabelas/`, a carteira, as provas de jogada nem a versão da matemática. A placa a cair tem de terminar sempre na lancha que o motor decidiu.
- Não mexas em `functions/`, não leias nem escrevas dados reais do Firebase, não faças deploy, commit nem push.
- Os testes atuais têm de continuar a passar: `npm.cmd test --prefix games/ganza`, `tests/browser.mjs`, `tests/final.mjs`, `tests/website.mjs`. Ajusta seletores dos testes se a interface mudar, sem enfraquecer o que verificam.

## Como trabalhar

Ciclos curtos: gerar ou ajustar camadas, integrar, capturar, comparar com a imagem, corrigir. Repete até o jogo na dificuldade Média parecer a imagem em movimento, e as outras três parecerem variações coerentes da mesma cena.

## Entrega

Em `revisao/falesia/`:

- Capturas de cada dificuldade em 1920×1080, 1366×768, 390×844 e 320×740, e uma montagem da dificuldade Média lado a lado com a imagem de referência.
- Um vídeo de 30 segundos: quedas, um prémio alto e a troca pelas quatro dificuldades.
- `DEPOIS.md` com o que mudou, o que foi testado e o que ainda difere da imagem.

Atualiza `promo/` (GIFs, MP4 e capa), `ASSETS.md` e `DECISOES.md`, e corre `npm.cmd run build:casino` na raiz para o jogo aparecer atualizado no casino local.

Termina com **Deploy:** `.\deploy.ps1`, sem o executar.
