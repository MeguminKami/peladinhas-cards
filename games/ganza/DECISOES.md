# Decisões de GANZÁ

## Correções posteriores do dono, 6 de novembro de 2026

Retirados os hovers das lanchas; os detalhes exatos continuam no painel por clique e no nome acessível. Bangers local para título, lançamento e resultados, Segoe UI para números e controlos. A ganzá passa a castanha, incluindo peças na mão, pilha e peça em queda. O WEED passa para o topo da montanha, acima do primeiro pino, e lança de cima para baixo. Esta indicação substitui a cor verde e a posição lateral inferior do estudo anterior. Motor, valores, carteira e provas preservados. Prévia local em modo fixtures com 100 000 DJC de teste, sem crédito numa conta real.

## Falésia aprovada, 6 de novembro de 2026

O dono mandou executar o [novo contrato visual](PROMPT-NOVO-VISUAL.md) integralmente, sem perguntas. A [referência Falésia](revisao/referencia/falesia-aprovada.webp) substitui as direções visuais anteriores. A placa verde embrulhada e atada com cordel substitui a bola castanha da decisão 8; muda apenas a apresentação.

- Falésia limpa, bóias em argolas, lanchas, placa, WEED, pérgola, rocha com tapete e flores são assets separados. O renderer posiciona os destinos a partir dos mesmos bits do motor.
- A cor do tubo depende do multiplicador, nunca da dificuldade. Os quatro ambientes pintados e a mistura sonora dependem exclusivamente da dificuldade selecionada; transição de 1,25 s. Nada depende de saldo, perdas ou resultados futuros.
- O WEED usa oito poses pintadas com as fotografias autorizadas como referência, respiração, transições curtas, lançamento, polegar, gesto de pé e balanço na celebração máxima. Sem fotografia publicada ou interpolação do rosto.
- Som de ambiente no bus existente: ondas locais e desenho sonoro sintetizado de aves, grilos, sinos distantes e pad. Não são novas gravações documentais nem voz do WEED.
- Motor, tabelas, versão matemática, carteira, provas e Functions preservados. Nenhum dado real consultado. Sem deploy, commit ou push.

Ver [entrega e limites](revisao/falesia/DEPOIS.md). As decisões abaixo mantêm valor histórico quando divergem deste contrato.

## Músicas completas e transições

O dono escolheu base longa de cerca de três minutos e gravações curtas para os outros momentos. Como são músicas completas, a mistura usa crossfade de 1,2 segundos e baixa a base enquanto entra a música do momento. A base continua a avançar, sem reiniciar a cada prémio. A Carga Completa tem prioridade sobre a outra vinheta. Não se pressupõe sincronização de stems nem fase igual. Os cortes exatos estão no inventário musical; não foi forçada duração de 24 segundos após retirar a introdução. A nova base longa aguarda localização do ficheiro.

## Bolas simultâneas e mensagens

O dono retirou o máximo de dez bolas simultâneas. Lançamentos continuam serializados durante a gravação de cada débito, sem um teto fixo de bolas no ar; saldo, recibos e liquidação individual mantêm-se. Mensagens normais e resultados nunca herdam a apresentação de erro de uma falha anterior. Recuperar a carteira limpa esse estado antes de retomar as bolas.

## Ajuste de contraste e som ambiente

Por indicação do dono, pinos com centro jade luminoso e contorno duplo escuro/claro para separação do mar e do céu. Aposta em placa dourada com números escuros, preservando o desenho e as dimensões. Retirado o loop contínuo de água; os salpicos pontuais de resultados mantêm-se. Os 24 segundos dos guias musicais correspondem a oito compassos de 4/4 a 80 BPM, não a um limite de duração dos ficheiros entregues pelo dono.

## Correção visual expressamente aprovada, 6 de novembro de 2026

O [contrato de correção](PROMPT-CORRECAO-VISUAL.md) confirma a direção LoFi pastel e substitui os estados de espera descritos abaixo. A referência prioritária é a progressão dos quatro ambientes, mesmo onde o style frame anterior diverge dela.

- Cena contínua em todo o iframe, interface sobreposta em tecido escuro, latão e azulejos. Sem triângulo opaco, cartão creme ou barra técnica visível. Mensagens de estado continuam acessíveis a leitores de ecrã e os erros surgem numa pequena placa.
- Pinos jade sobre a paisagem; centro deslocado à direita no desktop para reservar o terraço à personagem. No telemóvel, tabuleiro centrado e WEED pequeno no primeiro plano, abaixo das lanchas, sem cobrir o percurso.
- Composições verticais específicas evitam comprimir a paisagem horizontal. As máscaras suaves das cinco camadas derivam da mesma pintura para preservar continuidade; não são cinco cenários diferentes montados lado a lado.
- WEED de corpo inteiro em oito poses bem desenhadas num ciclo de 20 segundos, com transições curtas suaves. Substitui a interpolação densa que podia deformar o rosto. Alpha limpo, sombra de contacto e fumo em dois planos. Mantém a referência às fotografias indicadas.
- Uma fila de 17 lanchas em 16 linhas. No telemóvel, placas verticais compactas. Apenas a etiqueta arredonda valores de 100× ou mais, por exemplo 709,64× → 710×. O nome acessível, o painel de probabilidades e a prova conservam o valor exato.
- Azulejos acionam os estados de linhas e volatilidade existentes. Os selects internos ficam invisíveis, como adaptadores da apresentação, sem alterar o pedido, a matemática, a carteira ou a prova.
- Grandes prémios usam pétalas, lanternas e fogo de artifício pastel. Retiradas as grelhas de retratos e cartões opacos do estilo anterior.
- Nenhuma alteração em src/, tabelas/, carteira, funções ou áudio. Sem Firebase real, deploy, commit ou push.

## Alterações expressas do dono, 6 de novembro de 2026

Estas instruções substituem as partes correspondentes do [contrato inicial](PROMPT.md).

1. A direção Pop Art foi rejeitada. A nova direção é **LoFi, com cores vivas, cores puras e tons pastel inspirados no arco-íris**. As imagens de estudo ficam em [revisao](revisao/). A aplicação do estilo ao jogo aguarda aprovação das imagens pedida pelo dono.
2. O rosto deve partir diretamente das duas fotografias em `../piece-police/INSPIRATION/WEED/`. O dono indicou explicitamente esta nova referência. A folha anterior deixa de ser a única referência. As fotografias nunca entram nos ficheiros públicos.
3. São **quatro volatilidades**, designadas provisoriamente Baixa, Média, Alta e Extrema, com 8, 12 e 16 linhas. Existem 12 tabelas na versão `ganza-v2`. O RTP continua no intervalo 98,99–99,01%. O máximo de 9 999× fica reservado a 16 linhas em Extrema.
4. A intensidade psicadélica e a presença visual marroquina crescem com a volatilidade. Baixa tem costa tranquila. Média acrescenta lanternas, tecidos e zellige. Alta intensifica medina, arcos, fumo e folhas. Extrema acrescenta geometria, repetições e paisagem surreal. Os elementos decorativos preservam a leitura do percurso e dos valores.
5. Essa progressão visual depende da volatilidade escolhida. Não depende do saldo, perdas, histórico nem de antecipações de resultados.
6. O Plinko é o foco, em primeiro plano, ocupando a maior parte da área jogável. O WEED é uma personagem de apoio num canto. O dono rejeitou a composição em que o tabuleiro parecia um elemento do fundo.
7. O WEED deve ter um ciclo animado de 20 segundos a fumar, com gestos e baforadas diferentes. O rosto parte das fotografias indicadas. O GIF de revisão não equivale à integração final no jogo.
8. O objeto que cai passa a ser uma **bola de ganzá castanha-clara**, mate e orgânica, em vez de uma placa verde embrulhada. Esta alteração é visual, sem mudança de percurso, probabilidades ou pagamentos.
9. O dono pediu mais imagens, maior fluidez e temática no WEED, com entrega em PNG para incorporar na cena. A revisão v2 tem 24 poses de origem, fumo com arabescos, anéis e folha, e zellige na gola e nos punhos. A entrega passa a PNG animado com alpha, sequência e atlas PNG. As imagens ficam em revisão antes da integração.

## Escolhas técnicas anteriores

- Carteira local com o padrão da Princesa Sofia, recibos idempotentes, gravação estrita e recuperação de placas pendentes. Sem alterações a Functions, acesso real ao Firebase, deploy, commit ou push.
- Valores monetários inteiros, percurso binomial decidido antes de apresentar a queda, compromisso SHA-256 e revelação da seed após liquidação.
- O estudo original em 8 linhas e risco médio teve pontas próximas de 64×. Pontas de 100× com centro de 0,35× seriam incompatíveis com RTP de 99%. Em v2 esse perfil passa a Alta, e Média fica entre Baixa e Alta.
- A versão `ganza-v1` é conservada para conferir provas de jogadas antigas. Novas jogadas usam `ganza-v2`.
- O renderer inicial combina desenho em Canvas com composição WebGL, shader de meio-tom e desalinhamento. Esses efeitos pertencem ao estilo rejeitado e terão de ser substituídos no novo acabamento LoFi.
- Os sons marítimos e materiais usam fontes CC0 com cópias das páginas e licenças em `art-src/audio/`. O motor de lancha é um substituto sonoro, ainda não uma gravação de motor fora de borda. As reações vocais do WEED estão pendentes.
- Os três guias musicais locais são provisórios de desenvolvimento. A música final continua a cargo do dono. A prompt musical final deve ser escrita após a aprovação e integração do novo estilo.

## Estado de aprovação

O estudo [progressão LoFi](revisao/lofi-progressao-4-volatilidades.png) é uma proposta, não uma aprovação presumida. O dono deve avaliar o rosto, a paleta e a diferença entre os quatro ambientes antes da substituição da arte do jogo.

## Conclusão autorizada pelo dono

Em 6 de novembro o dono pediu para terminar o jogo com base no material existente. Esta instrução autoriza integrar a revisão LoFi, os quatro cenários, a bola castanha e o PNG animado, sem novo ponto de espera. A revisão estética final continua disponível ao dono.

- Apostas públicas inteiras de 1 a 10 000 DJC, guardadas em cêntimos. Isto evita reduzir o RTP por truncatura em apostas fracionárias. O botão metade arredonda para baixo, com mínimo de 1 DJC.
- O motor sonoro usa composição de gravações CC0 marítimas. A reação do WEED fica na animação, sem inventar uma voz da pessoa. O cameo policial opcional foi omitido.
- A música final continua a ser entregue pelo dono, como previsto. Guias provisórios, configuração e prompts prontos ficam no projeto.
- Não foi executado deploy, commit ou push, nem houve acesso a dados reais do Firebase.

## Ajustes de composição Falésia, 6 de novembro de 2026

O [pedido de ajustes](PROMPT-FALESIA-AJUSTES.md) prevalece sobre a indicação anterior de WEED pequeno no topo: personagem lateral em primeiro plano, falésia contínua da costa e tabuleiro alto. A ganzá castanha permanece. Controlos, AUTO, verificação e histórico partilham a mesma faixa. As quatro dificuldades usam a mesma geometria, com céu e luz diferentes. Só mudou a apresentação; percurso, valores, carteira e provas mantêm-se. [Entrega e limitações](revisao/falesia-v2/DEPOIS.md).

## Falas e fumo removidos

Por pedido do dono, retirados os bal?es de fala e o fumo animado nas quatro dificuldades. Mantidas as poses, as restantes anima??es e as mensagens funcionais de estado e erro. As capturas e os v?deos da revis?o anterior s?o hist?ricos e ainda mostram estes elementos.

## Marca, saldo visível e histórico inferior

Por pedido do dono, a marca passa a um desenho vetorial original GANZÁ: medalhão jade/latão, placa lançada em arco e proa de lancha. Retirada a placa de saldo do cabeçalho; o saldo interno, a validação das apostas e a integração com a carteira mantêm-se. O histórico conserva as últimas 20 jogadas na ordem cronológica inversa, numa faixa inferior da largura do jogo. O resultado mais recente fica à esquerda e tem maior dimensão; os restantes seguem para a direita, com deslocação horizontal em ecrãs estreitos. Não se ordenam resultados pelo valor.
