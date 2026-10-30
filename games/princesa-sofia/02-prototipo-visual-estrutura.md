# Etapa 2 — Protótipo visual básico e estrutura

## Estrutura atual: tabuleiro largo, barra única e popup de modos — 30 de outubro de 2026

Revisão pedida com referências de posições, sem reproduzir a arte gráfica das imagens:

- Tabuleiro desktop alargado de 600 para 700 px, mantendo a altura próxima de 506 px. As células têm proporção largura/altura de 1,18 em vez de quadradas: aproximadamente 105,67 × 89,55 px no desktop largo. Continuam seis colunas e cinco linhas. A barra de XP acompanha a largura por cima.
- Indicador de wilds subiu para junto do topo da slot: 24 px abaixo do início da moldura no desktop, 12 px no telemóvel. Por baixo fica um único botão Bónus, que abre os quatro modos. O botão destaca-se quando Hunt está ativo.
- Uma única barra inferior, com dois grupos. À esquerda, pela ordem: info → som/volume → saldo → ganho. À direita: valor da aposta → − / Rodar / + → autoplay por baixo do Rodar → velocidades. O Rodar é circular, de 80 px, e −/+ são círculos de 44 px. O botão autoplay mantém 44 px de altura para toque.
- Em ecrãs menores, os grupos quebram em linhas dentro da mesma barra, preservando a ordem e sem scroll horizontal. Não existe outra faixa separada de compra/Hunt.
- Popup Bónus com ajuste de aposta centrado por cima e quatro opções na ordem Bonus Hunt → Bónus → Super bónus → Secret bónus. Em desktop são quatro colunas; no telemóvel duas colunas, mantendo a ordem de leitura. Letras provisórias ocupam a reserva de arte, sem criar ilustrações finais.
- Hunt apresenta o custo por spin e Ativar/Desativar. As outras opções apresentam custo total e Comprar. Alterar a aposta no popup atualiza a aposta da barra, os quatro preços e as opções sem saldo. As regras de cobrança e pagamento não mudaram.

Verificação: teste de browser a 1400/768/390/320 px, proporção esticada das células, ordem dos dois grupos, posição dos wilds, autoplay abaixo do Rodar, popup com quatro opções, ajuste de aposta no painel, ativação/desativação Hunt, compras, foco e saldo. Inspeção visual do jogo e popup em desktop e telemóvel. Matemática e saldo continuam a usar o motor existente. As composições abaixo são registos históricos substituídos por esta revisão.

## Estrutura simplificada anterior — registo de 30 de outubro de 2026

Revisão pedida pelo utilizador: XP por cima, slot ao centro, indicadores dos wilds à esquerda e menu em baixo. O ecrã principal deixa de mostrar cabeçalho de marca, rótulo da etapa, crédito de teste, textos de ajuda, legenda 6×5, painel à espera de scatters, rodapé e demonstrações. As explicações ficam nas regras; as demonstrações passam para uma secção recolhida nesse painel. As mensagens de resolução continuam disponíveis ao leitor de ecrã, sem ocupar espaço visual. Erros e estado de autoplay só aparecem quando são necessários.

- Desktop: área de jogo de até 856 px, com colunas de 112 / 600 / 112 px e intervalos de 16 px. A coluna direita é uma reserva simétrica, mantendo o tabuleiro no centro. Os wilds ocupam a coluna esquerda, alinhados ao meio da slot. XP ocupa os 48 px acima do tabuleiro.
- Moldura: largura máxima de 600 px, padding de 12 px, borda de 1 px e separação de 8 px. Células de 89 px no desktop largo; moldura de aproximadamente 600 × 503 px.
- Menu: saldo, ganho, aposta, Rodar e autoplay na primeira faixa; regras, volume, velocidades, compra e Hunt na faixa inferior. Nenhuma função foi removida. As etiquetas foram reduzidas a Saldo / Ganho / Aposta e o custo do Hunt a 4×.
- Telemóvel: wilds continuam à esquerda, numa coluna de 72 px (58 px até 360 px); XP e slot ocupam a coluna ao lado. O menu quebra em linhas por baixo. Células medidas de 40,16 px a 390 px de viewport e 31,50 px a 320 px; continuam quadradas.
- A quantidade da próxima magia e o × são os únicos valores visíveis junto ao W. O contador de spins aparece nesse lado apenas dentro do bónus. Ativações, contexto de XP e nome do modo continuam acessíveis, sem texto permanente no ecrã normal.

Verificado no browser a 1400/768/390/320 px: XP acima da slot, wilds à esquerda, menu abaixo, grelha 6×5 quadrada, ausência de overflow, foco/Tab/Escape, compras, demonstrações dentro das regras, autoplay, sons, velocidades, liquidação e MAX WIN. Os textos e dimensões da primeira estrutura abaixo são um registo histórico, substituído por esta revisão. A matemática não mudou.

## Primeira estrutura implementada — registo histórico de 30 de outubro de 2026

O utilizador aceitou os parâmetros da etapa 1 para avançar para este protótipo. Isso não transforma as estimativas de RTP anteriores em validação teórica. As tabelas e regras do motor foram preservadas. A composição abaixo é uma primeira proposta funcional para experimentar e ajustar em conjunto; a estrutura visual ainda não foi aprovada e não foi iniciada a arte final.

Executar nesta pasta: `npm.cmd run dev`, abrir `http://127.0.0.1:4175`. O [guia de execução](README.md) inclui testes e API. O protótipo usa apenas módulos e créditos locais, sem pedidos cloud.

### Dimensões e divisões

- Contentor exterior de no máximo 944 px, centrado. Em desktop, margens internas de 32 px dão uma área útil de 880 px. Todos os blocos principais partilham os mesmos alinhamentos laterais.
- Área de jogo desktop: tabuleiro com largura máxima de 600 px, separação de 24 px e painel lateral de 256 px quando existe a largura máxima. O painel adapta-se até ao mínimo de 180 px antes da mudança de composição.
- Moldura do tabuleiro: margem interna de 16 px, borda de 1 px e intervalos de 8 px entre células. Seis colunas e cinco linhas, sempre com células quadradas. Com 600 px exteriores, a célula mede aproximadamente 87,67 px e a moldura mede 504,33 px de altura. Fórmula: `célula = (largura - 2 × (padding + borda) - 5 × intervalo) / 6`.
- XP ocupa 52 px acima da moldura. O painel lateral começa alinhado com o topo da moldura. Legenda de dimensões, conectividade e scatters fica abaixo do tabuleiro.
- Controlos principais: faixa com padding de 16 px, intervalos de 16 px, botão Rodar de 144 × 64 px no desktop largo e ajuste de aposta com botões de 44 × 44 px. Compra e Hunt ocupam duas colunas iguais na faixa seguinte.
- Até 950 px: margem interna de 24 px e controlos reorganizados em duas linhas, conservando a hierarquia. Até 700 px: contentor de no máximo 560 px com padding de 16 px; painel lateral passa para duas colunas por baixo da grelha; prémio fica numa linha própria.
- No telemóvel: moldura com padding de 10 px e intervalo de 6 px; barra de XP com 48 px reservados; Rodar ocupa uma coluna de 100 px e duas linhas. A grelha mantém seis colunas mesmo a 320 px, sem scroll horizontal da página. Há scroll vertical natural para os controlos; a versão portrait não comprime toda a slot para caber numa única altura.
- Dimensões medidas em browser: células de 87,66 px a 1400 px de viewport, 73,66 px a 768 px, 51 px a 390 px e 39,33 px a 320 px. Pequenas diferenças de centésimos resultam da distribuição de pixels da grelha.

### Mapa de ecrãs e componentes

| Área / ecrã | Conteúdo e comportamento |
| --- | --- |
| Topo | Identidade provisória Peladinhas, nome do jogo, regras, botão de silenciar e barra de volume 0–100%. Mantém-se fora dos painéis de jogo; os dialogs modais têm foco próprio. |
| Tabuleiro | N1–N5, P1–P5, S e W em blocos; números individuais dos wilds, destaques de hits e posições colocadas pela magia. Usa os tabuleiros produzidos pelo motor. |
| XP e próxima magia | XP atual/limiar, progresso, quantidade e multiplicador da próxima ativação e contador de ativações. No base reinicia entre spins; no bónus acompanha o estado persistente. |
| Estado de bónus | Tipo, spins restantes e regras de retrigger. Entrada natural apresenta um painel de 12 spins; os free spins decorrem automaticamente depois de Continuar. |
| Prémio e saldo | Saldo inicial de teste de 10 000 créditos, aposta base e prémio acumulado da jogada. O saldo é debitado uma vez e recebe a liquidação final uma vez. Mudar a aposta não reinterpreta o prémio anterior. |
| Rodar | Inicia uma jogada; durante apresentação passa a Acelerar, que termina os atrasos restantes sem voltar a sortear. Em autoplay passa a Parar auto. Espaço com foco no corpo também ativa este controlo. |
| Velocidade | Normal, Rápido e Ultra. Escalam os atrasos de apresentação em 1 / 0,32 / 0,035; não mudam a matemática. Podem ser alteradas durante a jogada. A preferência de redução de movimento elimina os atrasos visuais. |
| Aposta | Select e botões −/+. Valores de teste: 0,20; 0,40; 0,60; 0,80; 1; 1,50; 2; 3; 4; 5; 10; 20; 50 créditos. Bloqueada durante a jogada e autoplay. |
| Comprar bónus | Modal com três opções, preços reais de configuração de 80× / 225× / 316× e custo calculado com a aposta escolhida. Cada botão identifica o preço antes de iniciar a compra. Opções sem saldo ficam desativadas. |
| Bonus Hunt | Toggle com estado e custo 4× explícitos. Bloqueado durante jogo/autoplay. Não muda os preços das compras nem os valores de prémio da aposta base. |
| Autoplay | Modal com barra indexada: 10,20,30,40,50,60,70,80,90,100,200,300,400,500. Seleção inicial de 50. Mostra custo por spin e custo máximo da sequência. |
| Parar autoplay | Cancela os spins pagos ainda por iniciar; a jogada atual, incluindo bónus, termina e liquida normalmente. Para também ao entrar num bónus, atingir MAX WIN ou faltar saldo. O bónus obtido continua após a confirmação de entrada. |
| Regras | Modal com conectividade, wilds, XP, scatters, bónus, Hunt, teto e tabela executável dos 60 pagamentos. A tabela pode deslocar-se dentro do painel no telemóvel. |
| Resumo do bónus | Painel com prémio total e número de free spins efetivamente jogados, incluindo retriggers. Fechar retoma a área normal. |
| MAX WIN | Painel próprio com o rótulo e pagamento máximo do motor. Termina toda a jogada, sem atribuir outro crédito ao fechar. |
| Erro | Mensagem acessível em área reservada. Saldo insuficiente não inicia a jogada; falha do motor restaura o saldo local anterior e não conserva prémios parciais. Não há recuperação persistida após recarregar a página. |
| Demonstrações | Área recolhida separada: cluster de 5, magia, entrada comum/super/secret e MAX WIN. Marca visível de demonstração; sessão e saldo separados da sessão normal. |

### Separação do motor e apresentação

[ui/session.js](ui/session.js) controla a transação local e as seleções de autoplay. [ui/app.js](ui/app.js) consome os eventos do motor por ordem; [ui/prototype.css](ui/prototype.css) define a geometria. O motor e as suas tabelas não foram duplicados na interface. A tabela de regras e preços lê a configuração executável.

Uma jogada em apresentação bloqueia aposta, compra, Hunt e demonstrações. Regras e volume continuam acessíveis; um painel aberto pausa a apresentação. Velocidade e Acelerar afetam apenas a espera. O saldo de teste não é uma carteira real e reinicia ao recarregar, tal como a sessão do motor.

### Sequência e pontos para arte/animação final

| Gatilho | Sequência provisória | Interrupção e estado final |
| --- | --- | --- |
| `spin-start` | Mostrar a grelha do motor, modo, XP inicial e contador de spins. Sinal sonoro curto. | Velocidade/atalho só aceleram a apresentação. A grelha final permanece exata. |
| `hits` → `xp-gained` | Destacar a união dos grupos, mostrar prémio acumulado e encher a barra. | Sem novo sorteio nem crédito duplicado; XP limita a largura visual a 100%. |
| `refill` | Mostrar as posições removidas e a grelha já preenchida. | Na arte final reservar camadas independentes para saída, queda e entrada. Não antecipar o próximo pagamento. |
| `magic` | Barra a zero, realçar os novos wilds e mostrar a evolução da próxima magia. | Antes da avaliação seguinte. Preservar valores individuais dos wilds antigos. |
| `bonus-start` | Mudar contexto e mostrar painel de entrada. | Aguardar Continuar, com foco preso no painel e retorno ao controlo de origem. |
| `retrigger` | Atualizar spins restantes e anunciar +2/+4. | Não criar cobrança ou reiniciar a evolução da magia. |
| `max-win` | Mostrar o ecrã MAX WIN e depois o resultado terminal. | Não executar novos spins. Fechar não liquida novamente. |
| Fim de bónus | Resumo do prémio acumulado e spins jogados. | Aguardar confirmação, depois contexto base com XP vazio. |

Inventário para a etapa 3: dez imagens de símbolos regulares, scatter, wild com área livre para ×, moldura com seis colunas/cinco linhas, fundo, identidade/título, elementos de XP e magia, ícones de controlo consistentes, estados de botões, ecrãs de entrada/saída/MAX WIN e sons de spin/hit/magia/bónus. Usar o quadrado interior de cada célula como caixa do asset; reservar o canto inferior direito para multiplicadores. Tabuleiro, símbolos, destaques e efeitos devem ter camadas próprias. A geometria responsiva e o espaço dos números não devem depender da imagem final.

### Verificação e decisões ainda abertas

Passaram 35 testes lógicos e de sessão, mais o teste de browser `npm.cmd run test:ui`. Foram verificados desktop e larguras 768/390/320 px, ausência de overflow horizontal, células quadradas, controlos sem cortes, regras/tabela, foco/Tab/Escape, quantidades de autoplay, velocidade, volume, Hunt, apostas, compras indisponíveis por saldo, bloqueios, paragem de auto, bónus, MAX WIN, prémio grande e redução de movimento. A execução de browser usa o Playwright já existente no repositório e, neste ambiente, o Edge instalado. Não houve pedidos externos.

O utilizador ainda precisa de experimentar e opinar sobre: painel lateral versus indicadores acima/abaixo da grelha, altura total no telemóvel, posição e dimensão do Rodar, clareza dos × e dos painéis de compra/auto. Não tratar este primeiro protótipo como layout final aprovado. A etapa 3 continua dependente dessa aprovação e das referências artísticas.

## Contexto para o agente

Estamos a criar uma slot em três etapas: lógica e matemática; protótipo visual básico; arte e animações finais. Esta é a segunda etapa. O objetivo é ver as mecânicas acontecerem e decidir, em conversa com o utilizador, a estrutura de todos os elementos antes de produzir os gráficos finais.

Não tens de conhecer a conversa anterior. Lê a especificação, as decisões, os testes e os resultados matemáticos deixados pela primeira etapa, seguindo o [guia da etapa 1](01-logica-mecanicas-rtp.md). Se esse contexto estiver em falta, identifica o que falta e pede apenas o necessário; não inventes regras nem assumas que a matemática está aprovada.

## Como conduzir a colaboração

- Começar por resumir o jogo e apresentar a tua própria proposta visual básica: distribuição das áreas, hierarquia, controlos e forma de mostrar as mecânicas.
- Explicar a proposta através de um esquema simples ou de um primeiro protótipo local. Usar blocos, letras, números, formas e cores provisórias.
- Pedir opinião sobre decisões concretas: posição do bónus, leitura dos multiplicadores, espaço dos controlos ou comportamento do menu, por exemplo.
- Trabalhar em ciclos curtos: propor, mostrar, ouvir, ajustar. O utilizador participa na definição das áreas e elementos; não entregar um layout final fechado numa única ronda.
- Sugerir soluções quando detetares confusão, excesso de informação ou falta de feedback. Explicar os compromissos sem impor preferências como decisões finais.
- Não dedicar esta etapa a ilustrações, texturas ou efeitos finais. As animações provisórias servem apenas para compreender sequência, duração e interação.

## O que construir e decidir

Criar uma interface local ligada ao motor real da primeira etapa. A interface mostra os resultados do motor; não recria a matemática nem altera probabilidades.

Mapear as áreas necessárias ao jogo, incluindo quando aplicável:

- Grelha e identificação dos símbolos.
- Saldo de teste, aposta, prémio da jogada e prémio acumulado.
- Botão de jogar, ajuste de aposta e estados de indisponibilidade.
- Contadores, multiplicadores, medidores e indicadores próprios das mecânicas.
- Entrada, execução, retrigger e resumo de saída dos bónus.
- Menu, regras, tabela de pagamentos, definições e controlos de som.
- Modos adicionais apenas se já estiverem acordados, com os respetivos fluxos e confirmações.
- Estados de carregamento, erro, saldo insuficiente e recuperação quando forem aplicáveis ao protótipo.

Decidir para cada elemento: função, posição, dimensão relativa, prioridade, condições de visibilidade e comportamento durante cada estado. Definir o que se mantém visível quando um painel ou bónus ocupa o ecrã.

## Estrutura para receber a arte final

- Separar motor, controlo da apresentação e componentes visuais.
- Definir uma sequência de apresentação dos eventos: resultado, destaque dos prémios, alterações de estado e transições de bónus.
- Impedir ações incompatíveis enquanto uma jogada está em resolução. Saltar ou acelerar uma animação nunca pode alterar o resultado ou liquidar o prémio novamente.
- Organizar os pontos de substituição dos placeholders por arte: dimensões, proporções, âncoras, camadas, recortes e estados.
- Reservar espaço para números grandes, textos longos e os estados mais carregados do jogo.
- Definir comportamento em desktop e telemóvel com o utilizador, incluindo orientação e adaptação de menus e controlos.
- Criar cenários locais de demonstração para observar prémios, bónus e casos raros sem depender da sorte. Identificar claramente esse modo e mantê-lo separado do sorteio normal.
- Evitar arquitetura genérica excessiva: preparar os elementos que este jogo realmente precisa.

## Validação e entrega

Inspecionar o protótipo renderizado em desktop e telemóvel e percorrer as mecânicas acordadas. Verificar cortes, sobreposições, overflow, legibilidade, foco, teclado e ações durante as transições. Confirmar que a interface mostra os prémios e estados do motor corretamente.

Manter um mapa de ecrãs e estados, um inventário de componentes e assets necessários e um roteiro de animações futuras. Para cada animação, indicar gatilho, elementos envolvidos, sequência, possibilidade de interrupção e estado final. Registar decisões, pendências e comandos reais de execução.

A etapa fica pronta quando o utilizador concorda com a estrutura e consegue compreender as mecânicas no protótipo. Não declarar aprovação por falta de resposta nem começar a arte final antes de receber o tema e as referências.

Entregar o protótipo e estes registos com o [guia da etapa 3](03-visuais-animacoes-equipa.md), para que outro agente consiga continuar sem conhecer esta conversa.
