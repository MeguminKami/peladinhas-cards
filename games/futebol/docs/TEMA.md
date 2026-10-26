# Futebol de Bairro — Noite de Glória

> Celebrações de ganho implementadas: Golo / Belo Golo / Golaço sem overlay; contador monetário progressivo a partir de 15× com nomes e efeitos por escalão. Sons sintetizados opcionais. [Funcionamento e limiares](ANIMACOES_DE_GANHO.md).
> Atualização vigente: **0.5.0**. Três Scatters nos dois bónus atribuem +5 FS; contador de FS sob o global; festejo por clique ou 10 s. [Regras, frequência proposta e restauro](RETRIGGER_0_5_0.md). Esta atualização prevalece sobre as notas históricas abaixo. RTP atual não medido.
**Ajuste 2.1:** WILD original restaurado com a palavra WILD; an?ncio animado com nome, carta e tema de cada poder roubado; c?lulas mais altas no computador. Ver `art/REVISAO_V2.md`. Esta prefer?ncia mais recente prevalece sobre a indica??o anterior de retirar todo o texto dos s?mbolos.
**Revis?o 2 implementada:** quatro premium s?o cartas de jogadores em bronze, prata, ouro e violeta; WILD e Scatter ampliados, sem texto nem hover nos s?mbolos. Fontes locais Oxanium e Barlow Condensed, consola personalizada, global ? esquerda, roletas, suspense, roubo vis?vel e fixa??o dourada. Esta revis?o prevalece sobre as propostas da amostra 1 abaixo. Ver [art/REVISAO_V2.md](art/REVISAO_V2.md).
Bíblia visual, inventário de produção e prompts de design. Versão artística 1.0 — 24/10/2026.

Este documento define a próxima fase de arte e animação. Não significa que os assets aqui descritos já foram produzidos. O ponto de partida é a GUI funcional em ecrã único existente no projeto. A matemática de referência é a configuração 0.3.1; `MATEMATICA.md` e `src/config.ts` prevalecem sobre qualquer ilustração ou exemplo visual.

**Produção iniciada:** a amostra 1 já inclui cenário, dez símbolos PNG, UI temática e primeiras animações ligadas à lógica. Consultar `art/PRODUCAO.md` e `art/manifest.json` para distinguir os assets entregues das camadas, rigs, áudio e acabamentos ainda previstos neste catálogo.

## 1. Visão criativa

Uma slot passada num campo de futebol de bairro durante um torneio noturno. A experiência celebra fintas improvisadas, equipamentos usados, rivalidades entre amigos e o golo decisivo. A sensação é de competição, convívio e conquista: um pequeno campo pode ser o palco de uma grande noite.

O estilo é uma ilustração 3D estilizada: volumes expressivos, materiais claros, contornos reconhecíveis e iluminação cinematográfica controlada. Não é fotorrealismo, pixel art, desenho infantil ou uma imitação de uma marca de futebol existente.

Não usar logótipos de clubes, patrocinadores, marcas de equipamento, jogadores reais, rostos de celebridades ou cânticos reconhecíveis. O craque do Wild é um adulto fictício, original e consistente em todas as poses. O bairro também é fictício, com personalidade própria e sem um monumento identificável como elemento central.

### Nomenclatura única

| Elemento | Nome para apresentação |
|---|---|
| Jogo | Futebol de Bairro |
| Subtítulo | Noite de Glória |
| Jogo base | Torneio Noturno |
| Bónus normal, 3 scatters | Final do Bairro |
| Bónus superior, 4 scatters | Noite de Glória |
| P1 | Toque de Classe |
| P2 | Arranque Explosivo |
| P3 | Camisola 10 |
| P4 | Glória do Bairro |
| Wild sticky | Craque Fixo |

Os nomes dos poderes são rótulos artísticos. Os IDs N1–N4/P1–P4/W/S continuam disponíveis em desenvolvimento, histórico técnico e mapeamento de assets.

## 2. Contrato com a lógica

- Tabuleiro com 6 colunas e 4 linhas; 40 linhas de pagamento fixas, da esquerda para a direita, a partir da primeira coluna. Não substituir por ways, clusters ou cascatas.
- Dez tipos de símbolo: quatro normais, quatro premium, Wild e Scatter.
- Wild substitui pagadores. Scatter não é substituído nem consumido pelos poderes.
- Roubo apenas por adjacência imediata em cima, baixo, esquerda ou direita. Não desenhar roubos diagonais, através de margens ou entre símbolos distantes.
- P1 dá ×2 ao wild nas linhas que o usam. Multiplica o global final: uma linha com esse wild e global ×5 recebe fator ×10. Vários P1 têm limite local ×8 por linha. P1 não aumenta o global de outras linhas.
- P2 converte a posição imediatamente acima e abaixo do wild em wilds simples, quando forem alvos válidos. Não expande a coluna inteira.
- P3 sorteia uniformemente 2–10 posições normais para converter em camisolas P3. Se houver menos normais, converte os disponíveis. Não transforma premiums, scatters ou wilds.
- P4 soma +2, +3 ou +5 ao global inicial ×1. Todas as ativações somam; +2 e +3 dão global ×6. O global reinicia em cada spin; não acumula entre free spins.
- Todos os roubos são decididos sobre o tabuleiro inicial. Apresentar expansões e depois conversões sobre os destinos efetivamente devolvidos pelo motor; não criar poderes recursivos.
- Três scatters dão 10 FS normais; quatro dão 10 FS superiores. Ambos têm 10, não 15 ou 20. Sem reativações nesta versão.
- Compras custam 90× e 220× a aposta. Compras entram no bónus diretamente; não fabricar um spin de ativação com scatters.
- Wilds sticky só no superior: 12% por wild sorteado diretamente. Permanecem na posição até ao fim do bónus; poderes antigos expiram e podem ser roubados novamente no FS seguinte. Wilds criados por expansão não ganham sticky nem roubam nesse spin.
- Roubo condicionado a premium vizinho: 12% no base, 35% no normal, 100% no superior. Sem vizinho, não há poder para roubar, mesmo no superior.
- Máximo acumulado de 10 000× a aposta de referência por ronda. Ao atingir o teto, a ronda termina; não mostrar FS fictícios posteriores.
- O motor determina os resultados antes da apresentação. Animação, áudio, velocidade, pausa e saltar efeitos não mudam o pagamento.

Animações não devem sugerir uma segunda oportunidade, jackpot progressivo, medidor que garanta prémios, pick bonus, compra melhorada, multiplicador persistente ou outro recurso matemático que não existe.

## 3. Direção artística comum

### Paleta e materiais

| Função | Cor de referência | Aplicação |
|---|---|---|
| Azul noite | `#101E3C` | Céu, áreas profundas e painéis |
| Azul de equipamento | `#2457B7` | Camisola, cordão, detalhes de identidade |
| Verde relvado | `#226B49` | Campo e ambiente |
| Verde luz | `#83BC74` | Destaques secundários de relvado |
| Laranja torneio | `#F28A36` | Cone, chuteiras e ações secundárias |
| Dourado | `#E4BC63` | Troféu, carta Wild e destaques premium |
| Branco de projetor | `#EFF5FF` | Texto, bola e iluminação principal |
| Violeta holográfico | `#8777D8` | Scatter e bilhete da final |
| Grafite metálico | `#25313E` | Estrutura do marcador e controlos |

As cores são guias de produção, ajustáveis por contraste. Não fazer uma interface inteira dourada: reservar o dourado para hierarquia premium, poderes e celebração.

Materiais: metal pintado ligeiramente gasto, borracha mate, tecido encorpado, plástico desportivo, couro sintético e metal dourado com reflexos largos. Desgaste discreto; sujidade e microtexturas nunca prejudicam a silhueta.

### Câmara, iluminação e escala

- Símbolos em vista frontal com ligeiro ângulo de três quartos e pouca distorção de perspetiva. Manter a orientação coerente entre gerações.
- Luz principal branca vindo de cima e da esquerda; recorte azul pelo lado oposto; reflexo quente subtil no metal premium.
- Premiums têm mais profundidade e acabamento, sem parecerem pertencer a outro jogo.
- Símbolos devem funcionar a 48 px e manter hierarquia a 64–128 px. Contorno, massas e contraste são mais importantes do que detalhe microscópico.
- Reservar aproximadamente 12–16% de margem para movimento. Ajustar escala pelo peso visual, não apenas pela caixa geométrica.
- Efeitos podem ultrapassar a caixa do símbolo numa camada própria, sem cobrir o valor global ou a aposta.

### Texto e identidade

Logótipo original de tipografia desportiva compacta: “FUTEBOL DE BAIRRO”, com “NOITE DE GLÓRIA” num segundo nível. Pode integrar linhas de campo e um pequeno feixe de projetor, evitando escudos que remetam a clubes existentes.

Usar uma família de display condensada para títulos, com boa leitura, e uma sans-serif para controlos e valores. A escolha/licença da fonte será validada na produção. Usar algarismos tabulares para saldo, prémios, aposta e contadores.

Texto funcional é aplicado por código ou vetor, não desenhado em imagens geradas: evita erros, permite PT-PT e mantém nitidez. Isto inclui WILD, SCATTER e o número 10 da camisola, em camadas separadas que visualmente integram o asset.

## 4. O ecrã de jogo é um único espaço

A slot ocupa o viewport, sem estrutura de website, cartões editoriais ou scroll na área principal. A arte reveste a estrutura funcional já aprovada, não a substitui por uma página promocional.

### Zonas do ecrã

| Zona | Conteúdo | Tratamento visual |
|---|---|---|
| Topo | Identidade pequena, histórico, definições, regras, fullscreen | Barra discreta de marcador desportivo |
| HUD superior | Modo, FS restantes, estado e global | Placas luminosas com valores em runtime |
| Centro | Tabuleiro 6×4 | Marcador integrado na estrutura do campo |
| Faixa de resultado | Mensagem, pagamento e nome de evento | Legível, sem competir com o tabuleiro |
| Consola inferior | Saldo, ganho do spin/ronda, aposta, velocidade, SPIN | Metal pintado e botões desportivos táteis |
| Ações secundárias | Duas compras e Último spin | Botões compactos, custos sempre visíveis |
| Rodapé mínimo | Créditos fictícios, versão/estado técnico e estatísticas | Sem publicidade ou navegação de website |

Orientações de referência: 1920×1080 horizontal e 1080×1920 vertical. Os elementos são adaptativos; não exportar um único screenshot esticado. A grelha e as posições reais vêm do layout, não de coordenadas pintadas no fundo. Validar também 320×568, 390×844, 844×390 e 1280×720.

No vertical, reorganizar o HUD e a consola; preservar as seis colunas e as quatro linhas. As janelas secundárias podem ter scroll interno. Em ecrã inteiro, manter uma saída clara. Respeitar áreas seguras do dispositivo.

## 5. Cenário e moldura

### Ambiente base — Torneio Noturno

Campo urbano rodeado por prédios baixos, redes metálicas, murais originais de futebol e pequenas bancadas. Céu azul profundo com uma faixa residual de pôr do sol. Projetores iluminam o relvado; público em silhuetas adultas e variadas, com movimentos discretos. A energia vem da luz e da presença do bairro, não de uma multidão detalhada em primeiro plano.

O centro atrás do tabuleiro deve ser calmo e escuro. Os pontos de interesse ficam nas laterais e no topo. Balizas, bolas decorativas e publicidade fictícia não devem parecer símbolos jogáveis ou valores de prémio.

### Moldura dos rolos

Marcador desportivo de metal azul-grafite pintado, com cantos arredondados, pequenas fixações, proteção lateral e detalhes de rede. Separadores de coluna finos, sem cortar símbolos. Luzes nos cantos comunicam modo e evento. Criar partes adaptáveis, não uma moldura com o tabuleiro e as palavras colados numa imagem.

### Camadas de produção

1. Céu sem texto, com variantes de cor por modo.
2. Prédios e silhuetas de antenas/janelas.
3. Murais originais e vedação posterior.
4. Bancadas e público, separados em massas próximas e distantes.
5. Campo, linhas decorativas e balizas periféricas.
6. Estrutura de cada projetor, luz desligada e emissão separada.
7. Feixes, névoa ligeira, poeira e reflexos.
8. Moldura posterior do tabuleiro.
9. Grelha/símbolos e efeitos de jogo.
10. Moldura frontal, HUD e interface.

Partículas, feixes e iluminação têm alpha e intensidade próprios. Parallax subtil, desligável com movimento reduzido. Não deslocar o cenário tanto que o campo pareça mudar de geografia.

## 6. Inventário dos dez símbolos

| ID | Desenho obrigatório | Distinção e partes para animar |
|---|---|---|
| N1 | Cone de treino laranja, base larga, faixa clara, ligeiramente usado | Triângulo simples; corpo, base e sombra separados |
| N2 | Apito prateado arredondado com cordão azul enrolado | Orifício reconhecível; corpo, cordão e reflexo |
| N3 | Garrafa desportiva verde robusta, tampa contrastante, gotas | Perfil cilíndrico; corpo, tampa, gotas e brilho |
| N4 | Meião azul e branco às riscas, dobrado, pequena marca de relva | Tecido macio; dobra superior, corpo e ponta |
| P1 | Bola branca com painéis azul-escuros, costuras, marcas ligeiras | Massa circular, salto/rotação; bola, sombra e reflexos |
| P2 | Par compacto de chuteiras laranja/coral, atacadores e sola visível | Silhueta diagonal; cada chuteira, atacadores, sola e relva |
| P3 | Camisola azul intenso, detalhes dourados e número 10 central | Sem patrocinador/emblema; corpo, mangas, gola e decal 10 |
| P4 | Taça dourada de pegas largas, pequena bola no topo e fitas azuis/laranja | Maior destaque premium; taça, base, bola, fitas e reflexos |
| W | Carta dourada com craque fictício adulto confiante, bola debaixo do braço | Retrato original, moldura metálica e faixa WILD; rosto, tronco, braço, bola, carta e letras separados |
| S | Bilhete diagonal da final, recortes laterais, holograma azul/violeta e estádio pequeno | Faixa SCATTER; bilhete, holograma, ilustração do estádio e letras separados |

O número 10 identifica o símbolo P3; não é uma quantidade de FS, multiplicador ou prémio. O Wild não é uma carta colecionável de uma franquia existente. O Scatter tem silhueta horizontal/diagonal claramente diferente da carta vertical do Wild.

### Estados de cada símbolo

Todos têm: estático, idle opcional, entrada/paragem, seleção informativa, vencedor, escurecido e saída para o spin seguinte. Premiums adicionam estado “fonte de roubo”. Wild adiciona entrada de carta, roubo, P1/P2/P3/P4, confirmação sticky e sticky em repouso. Scatter adiciona entrada, contagem e ativação do modo correto.

Não criar dezenas de imagens quase iguais quando a alteração pode ser tint, deformação, rotação, rig ou shader. Estados de poderes devem partilhar o mesmo craque e a mesma carta.

## 7. Linhas, números e informação variável

### Linhas de pagamento

As 40 trajetórias são geradas por código a partir de `config.lines`, não pintadas nos símbolos ou no cenário. A linha percorre os centros das células reais. No pagamento, iluminar apenas a sequência paga de 3–6 posições; uma consulta de regras pode mostrar o percurso completo.

| Recurso | Especificação |
|---|---|
| Numeração | 01–40, com pequenas etiquetas na margem da grelha |
| Traço | Núcleo claro e halo estreito; símbolo permanece visível |
| Cores | Paleta de 8 cores reutilizável com número obrigatório; não depender de 40 cores distintas |
| Vitória conjunta | Mostrar símbolos participantes e total, sem um emaranhado de 40 traços |
| Vitória individual | Ciclar por linha ou permitir seleção em Último spin |
| Consulta | Realce estático de uma linha escolhida e respetivos símbolos |
| Movimento reduzido | Traço estático e mudança simples de opacidade |

Fitas da taça, linhas decorativas do relvado e trajetórias de poderes não devem parecer linhas de pagamento. Usar geometria, duração e tratamento diferentes.

### Números e letras necessários

Suportar 0–9, vírgula decimal, separador de milhares, sinal de menos, mais, percentagem e ×; números com largura estável, sem saltos no alinhamento. Exemplos a validar: 0,20; 7,50; 10; +2; ×5; 10 000×; valores longos de saldo; pagamentos de valor zero; resultado líquido negativo.

Valores devem vir de dados reais: aposta da escada, preços 90×/220×, FS 0–10, saldo, ganho do spin, ganho acumulado, número da ronda, multiplicador global e indicação de teto. Não escrever valores finais em texturas de painéis.

Arte de tipografia para celebrações pode usar lettering vetorial próprio, mas o valor variável mantém camada independente. Localização PT-PT com acentos: Bónus, Glória, Definições, Prémio.

## 8. UI: todos os componentes e estados

| Família | Elementos |
|---|---|
| Identidade | Logótipo completo, versão compacta, símbolo de app/favicon e splash |
| Ação principal | SPIN circular com seta de rotação; CONCLUIR; PRÓXIMO FS; CONTINUAR; TENTAR NOVAMENTE |
| Aposta | Menos, seletor/placa de valor, mais, lista/modal da escada, bloqueio durante ronda |
| Velocidade | Normal, rápida e super-rápida; ícones de uma/duas/três setas com rótulos |
| Bónus | Botões Final do Bairro/Noite de Glória, preço, 10 FS, confirmação e cancelar |
| HUD | Saldo fictício, ganho do spin, ganho da ronda, global, FS restantes, modo e estado |
| Navegação local | Histórico, Definições, Regras, Último spin, RTP/sessão, fullscreen/sair |
| Áudio previsto | Som geral, música, efeitos, mute; só expor controlos funcionais quando áudio existir |
| Acessibilidade | Movimento reduzido, destaque de linhas, foco visível, rótulos e mensagens de estado |
| Janelas | Cabeçalho, fechar, voltar, continuar, separadores, scroll interno, paginação e backdrop |
| Dados | Tabela de pagamentos, linhas, histórico, filtros, detalhe da ronda/spin e exportação |
| Sistema | Loading real, recurso em falta, erro recuperável, saldo insuficiente, sessão recuperada e versão incompatível |
| Desenvolvimento | Repor/adicionar créditos fictícios, exportar sessão e identificação de configuração |

Botões têm repouso, hover, foco, pressionado, desativado e ocupado. Compras têm custo legível antes da confirmação. Ícones vectoriais simples, com a mesma espessura de traço. Não converter um ícone de moeda em símbolo de dinheiro real.

Tocar em CONCLUIR termina apenas a apresentação já determinada; não usar o rótulo “parar rolos” de forma a sugerir controlo sobre o resultado. Durante espera real sem resultado, apresentar estado ocupado, não uma falsa opção de parar.

O painel de regras explica a tabela efetiva por modo, fatores fixos vigentes e as quatro direções de roubo. Ler valores da configuração: a arte não fixa ×2,72/×11,77/×3 em imagens. O histórico diferencia custo, pagamento e resultado líquido; rever uma ronda não executa o motor.

## 9. Três ambientes, uma geografia

| Modo | Cenário e luz | Moldura/HUD | Ambiente animado |
|---|---|---|---|
| Torneio Noturno | Azul profundo e verde, últimos tons quentes no céu | Azul-grafite e acentos laranja | Público discreto, projetores estáveis |
| Final do Bairro | Mesmo campo, noite mais azul, projetores adicionais acesos | Aro azul elétrico suave e placas douradas pequenas | Bancadas mais vivas e luzes sincronizadas |
| Noite de Glória | Mesmo campo, noite intensa, iluminação branca/dourada e recorte violeta subtil | Destaque dourado elegante, marca própria para sticky | Fitas periféricas, público reforçado e feixes mais presentes |

Não trocar cidade, câmara ou posição das bancadas entre modos. O bónus superior tem identidade clara mesmo sem partículas ou som. Usar título, moldura e HUD, não apenas cor.

### Mudança do base para Final do Bairro

1. Revelar os três scatters reais e destacar os seus bilhetes.
2. Contar visualmente 1/3, 2/3, 3/3 em posições reais; manter o tabuleiro legível.
3. Os bilhetes emitem um reflexo para um painel de acesso à final.
4. Sweep curto dos projetores nas margens; escurecer temporariamente o campo, sem flash de ecrã inteiro.
5. Acender a iluminação do modo normal e transformar as placas da moldura.
6. Mostrar “FINAL DO BAIRRO”, “10 FREE SPINS” e aposta de referência; botão CONTINUAR.
7. No primeiro FS, mostrar contador de 10 e a fase seguinte conforme o evento real do motor.

### Mudança do base para Noite de Glória

1. Contar os quatro scatters reais, sem fingir um quarto bilhete quando só existem três.
2. Reflexo holográfico mais intenso e uma breve abertura luminosa da rede nas margens.
3. Projetores branco-dourados acendem em sequência; fitas entram pelas laterais.
4. Atualizar céu/luzes e moldura para o modo superior.
5. Mostrar “NOITE DE GLÓRIA”, “10 FREE SPINS”, indicação de Craque Fixo e aposta; CONTINUAR.
6. Entrar no tabuleiro sem colocar wilds sticky que o motor ainda não atribuiu.

Compras reutilizam o destino visual e o painel de entrada, partindo da confirmação de compra. Não mostram uma grelha inventada de scatters. Ao recuperar uma sessão em FS, carregar diretamente o modo e stickies guardados; uma breve mensagem de retoma substitui a entrada longa.

### Fim e regresso

Mostrar o tabuleiro do último spin, pagar o resultado já determinado e abrir resumo: nome do modo, quantidade de spins executados, total pago, aposta de referência, custo da ronda/compra e resultado líquido. Não creditar o total uma segunda vez.

CONTINUAR atenua os projetores especiais, retira fitas temporárias, remove as marcas sticky expiradas e devolve o ambiente ao Torneio Noturno. Não prolongar artificialmente o bónus quando atingiu o teto.

## 10. Catálogo de animações dos símbolos

Tempos abaixo são propostas de direção, não temporizadores do motor. Uma animação de vitória normal dura cerca de 450–850 ms; premium pode usar 700–1 200 ms. Loops ambientais são lentos, com pausas e fases desencontradas.

| Asset | Idle | Entrada/paragem | Vitória |
|---|---|---|---|
| Cone | Quase imóvel | Compressão mínima da base | Inclina 8–12°, recupera com peso |
| Apito | Reflexo ocasional | Pequeno assentamento | Roda ligeiramente; duas linhas gráficas de som |
| Garrafa | Gota ou reflexo raro | Impacto plástico curto | Reflexo ascendente e 2–4 gotas |
| Meião | Pequena respiração do tecido | Dobra assenta | Desenrola uma ponta e volta à forma |
| Bola | Suspensão quase impercetível | Pequeno ressalto | Salto com rotação e sombra coerente |
| Chuteiras | Atacador move discretamente | Assentamento das solas | Arranque curto e partículas de relva |
| Camisola 10 | Tecido suave | Mangas assentam | Abre ao vento; número 10 recebe luz |
| Troféu | Fitas lentas | Peso e oscilação das fitas | Eleva ligeiramente; reflexo atravessa o metal |
| Wild | Pose confiante, respiração discreta | Carta colocada em campo; aro ilumina | Craque reage; arco de projetor contorna a carta |
| Scatter | Holograma lento | Bilhete lançado, endireita e assenta | Estádio acende; reflexo acompanha os recortes |

Evitar que todos os símbolos estejam sempre a saltar. Um tabuleiro sem pagamento deve permanecer calmo. Textos WILD/SCATTER não deformam ao ponto de perder leitura.

## 11. Coreografia dos poderes e sticky

### Roubo: linguagem visual comum

Destacar o wild e o premium-fonte reais; um passe curto de energia liga os centros pela direção ortogonal válida. O premium não desaparece. A carta recebe um emblema do poder, a cor muda discretamente e o efeito seguinte respeita a lista de eventos.

Quando a tentativa falha, usar no máximo um pulso discreto; não reproduzir uma aquisição bem-sucedida. Não animar uma escolha de vizinho diferente do efetivamente roubado.

### P1 — Toque de Classe

Um reflexo de bola percorre a carta, com selo ×2 junto do wild. Ao pagar uma linha que o usa, mostrar a ligação entre a linha, o fator local e o global no HUD. Exemplo pedagógico: “Linha ×2 ×5 = ×10”. Global continua ×5; o ×10 é o fator combinado dessa linha, não um novo global.

Com vários P1, mostrar o fator local combinado limitado a ×8 e depois o global, sem multiplicar o global uma vez por wild. Sem linha vencedora, o poder pode ativar mas não inventa pagamento.

### P2 — Arranque Explosivo

Partículas de relva partem do wild para cima e para baixo, apenas até às posições realmente convertidas. Cada destino revela uma carta Wild simples; no máximo dois destinos por ativação. Scatter, margens e wilds existentes interrompem os efeitos que não têm alvo. Não mostrar expansão horizontal nem coluna inteira.

### P3 — Camisola 10

Apresentar a quantidade pedida de 2 a 10 e, quando diferente, a quantidade efetivamente convertida. Feixes/passses azuis e dourados chegam às posições normais escolhidas, revelando camisolas P3 por flip ou mudança de material curta. Pode agrupar por pequenos lotes para não demorar dez efeitos sequenciais.

Preservar o tabuleiro: não deslocar fisicamente os símbolos para outra célula. Se não houver normais, indicar “Sem alvos” de forma discreta, sem inventar conversões. Não fazer a nova camisola originar outro roubo no mesmo spin.

### P4 — Glória do Bairro

Fitas de luz da taça atravessam a carta e chegam ao HUD global. Mostrar “+2”, “+3” ou “+5” e a atualização anterior → seguinte. Exemplo: ×1 → +2 → ×3 → +3 → ×6. O HUD estabiliza antes da liquidação das linhas. Usar mais, não um sinal de multiplicação, na aquisição.

### Craque Fixo

Um aro de relvado iluminado e um pequeno pino ancoram a carta à célula. Aplicar a marca FIXO em texto/vetor, além da cor. No spin seguinte, as outras posições movem-se; a carta mantém a posição. Limpar emblemas de poderes antigos, preservando a marca sticky. Uma nova aquisição de poder tem a sua própria animação.

Um sticky ganho no último FS pode receber um pulso de confirmação, mas não sugere um FS adicional. Ao sair do modo superior, retirar as âncoras em conjunto e mostrar o estado final correto.

## 12. Spin completo e sincronização

### Animações de interface e ambiente

| Sistema | Animações a preparar |
|---|---|
| Loading/entrada | Progresso real, brilho curto da identidade, campo a ganhar luz e entrada dos controlos |
| Botões | Compressão no toque, hover, foco estático, ocupado e transição para desativado |
| Diálogos | Entrada/saída com dissolve e deslocamento pequeno; backdrop independente |
| Aposta | Mudança direta do valor e feedback do controlo; nunca contar através de apostas não selecionadas |
| Saldo | Atualização do custo e do pagamento confirmado, sem animação que atrase a autoridade do valor |
| FS/global | Mudança de dígitos, realce da operação e estabilização do valor; sem saltos de largura |
| Rolos | Arranque, velocidade constante, desfoque, desaceleração, paragem por coluna e pequeno assentamento |
| Tabuleiro | Escurecimento seletivo, halos de células, transição inicial/final e limpeza para o spin seguinte |
| Fundo | Público, fitas, névoa e luzes em loops subtis desencontrados |
| Poderes simultâneos | Fila por fase e agrupamento de destinos, preservando os eventos individuais no detalhe |
| Ganhos | Realce conjunto, ciclo individual de linhas, contador e celebração adequada |
| Orientação/resize | Reposicionar sem deslocar símbolos entre células nem repetir animação matemática |
| Interrupção/retoma | Pausar ou concluir a apresentação, restaurar modo e HUD, sem nova entrada paga |

Animações de interface de 120–220 ms como referência, sem atrasar a resposta ao input. Menus não fazem o campo girar ou afastar a câmara. Foco de teclado deve ser visível também quando não há hover.

Ordem visual de referência:

1. Validar comando, bloquear aposta e compras; feedback do botão e som curto.
2. Começar movimento dos rolos quando o adaptador dispõe dos dados necessários. Mostrar espera honesta se ainda não existir resposta.
3. Movimento com símbolos de preenchimento sem significado matemático; não usar a animação para escolher resultados. Stickies ficam ancorados.
4. Paragens escalonadas de seis colunas e revelação do tabuleiro inicial real.
5. Resolver a apresentação dos roubos e poderes sobre esse tabuleiro, por fases do motor.
6. Fixar tabuleiro final e global; realçar símbolos/linhas vencedoras.
7. Contar o pagamento já liquidado e mostrar o acumulado da ronda.
8. Se aplicável, entrada de bónus, próximo FS, resumo ou término por teto.

O contador de FS deve deixar claro “restantes” ou “spin atual de 10”; não misturar convenções. O histórico técnico já distingue tabuleiro inicial/final: a apresentação não deve apagar essa distinção.

### Perfis de velocidade

| Sequência | Normal | Rápida | Super-rápida |
|---|---:|---:|---:|
| Movimento base dos rolos | 900 ms | 450 ms | 150 ms |
| Intervalo entre paragens | 100–120 ms | 40–60 ms | 0–20 ms |
| Roubo individual | 400–600 ms | 200–300 ms | Resumo visual em lote |
| Conversão de destinos P3 | 500–900 ms total | 250–450 ms total | Revelação conjunta |
| Destaque inicial do ganho | 500–700 ms | 250–350 ms | 100–150 ms |
| Mudança de ambiente | 1,2–1,8 s | 0,6–0,9 s | Dissolve de 200–350 ms |

São orçamentos iniciais de apresentação. Muitos eventos não multiplicam indefinidamente o tempo: usar fila visual por fases e agrupamento. Uma entrada de bónus deve terminar num estado legível, mesmo em super-rápida. CONCLUIR leva todas as camadas ao estado final sem executar novamente efeitos com consequências no saldo.

Movimento reduzido: sem camera shake, parallax, zoom forte ou flashes; substituir movimentos por dissolves curtos e realces estáticos. Evitar flashes estroboscópicos em qualquer perfil.

## 13. Prémios, grandes eventos e informação honesta

| Classe funcional | Limiar sobre a aposta de referência | Nome artístico proposto | Apresentação |
|---|---|---|---|
| Sem pagamento | 0 | Sem pagamento | Mensagem curta e neutra |
| Pagamento comum | >0 e <20× | Pagamento | Realce de símbolos e contador discreto |
| Prémio alto | ≥20× e <50× | Grande Jogada | Projetores laterais e partículas de relva |
| Prémio muito alto | ≥50× e <100× | Golaço | Arco de luz e confetes azuis/laranja |
| Prémio extraordinário | ≥100×, abaixo do teto | Noite Memorável | Público, fitas e painel de prémio maior |
| Máximo da ronda | Teto acumulado de 10 000× | Glória Máxima | Taça, luz dourada e aviso de ronda concluída |

Os limiares classificam apresentação; não acrescentam pagamentos. O nome da celebração não altera a matemática. O ecrã de máximo usa o acumulado da ronda, não exige que o último spin isolado pague 10 000×.

Usar partículas de relva, luz e confetes; evitar chuva de moedas como linguagem dominante deste tema. O valor numérico deve permanecer o elemento mais legível da celebração. Preparar lettering, placa de valor, entradas, loop curto e saída separados.

Nas compras, um pagamento abaixo do custo pode exceder 20× a aposta de referência. Mostrar retorno, custo e líquido claramente; adotar apresentação neutra para perda líquida, sem uma mensagem que declare lucro. Pagamentos iguais ao custo também não são lucro.

O número mostrado é o pagamento exato do motor. Não interpolar até um valor superior para depois corrigir para baixo. Click/tap no contador termina a contagem no valor real.

## 14. Ecrãs e sobreposições necessários

| ID | Ecrã/estado | Conteúdo e comportamento |
|---|---|---|
| SCR-01 | Carregamento | Identidade, progresso real, estado dos recursos e repetir se falhar |
| SCR-02 | Entrada | Campo e título, tocar para começar/ativar áudio quando existir |
| SCR-03 | Base pronto | Tabuleiro, HUD e consola completos |
| SCR-04 | Spin/espera | Estado ocupado, rolos ou espera, sem comandos duplicados |
| SCR-05 | Avaliação | Poderes, global e linhas; estados inicial/final coerentes |
| SCR-06 | Entrada Final do Bairro | Três scatters ou compra, título, 10 FS e aposta |
| SCR-07 | FS normal | Cenário normal de bónus, contador e ganho acumulado |
| SCR-08 | Entrada Noite de Glória | Quatro scatters ou compra, título, 10 FS e sticky explicado |
| SCR-09 | FS superior | Ambiente superior, stickies, poderes e contador |
| SCR-10 | Resumo de bónus | Total, custo, líquido e regressar ao base |
| SCR-11 | Celebrações | Três intensidades e estado de máximo, sempre saltáveis |
| SCR-12 | Escolha de aposta | Escada real, seleção ativa e limites |
| SCR-13 | Confirmação de compra | Nome, aposta, preço total, 10 FS, confirmar/cancelar |
| SCR-14 | Definições | Velocidade, movimento, linhas e futuro áudio funcional |
| SCR-15 | Regras | Símbolos, tabela, fatores, 40 linhas, poderes, custos e teto |
| SCR-16 | Histórico | Lista paginada e filtros com custo/pago/líquido |
| SCR-17 | Detalhe/Último spin | Símbolos, eventos, global, linhas e revisão sem jogar |
| SCR-18 | RTP/sessão | Estatísticas locais separadas das estimativas de simulação |
| SCR-19 | Saldo insuficiente | Mensagem clara e acesso a créditos de teste quando permitido |
| SCR-20 | Retoma | Modo e FS reais recuperados, sem repetir entrada longa |
| SCR-21 | Erro/recursos | Repetir ação segura, fechar, exportar ou repor conforme o caso |
| SCR-22 | Pausa/foco | Ao ocultar aba ou abrir menu, pausar apresentação/auto-FS com estado preservado |

Não criar uma página HTML independente por ecrã. São estados e camadas do mesmo espaço. Menus devem funcionar sobre o cenário de qualquer modo, com contraste suficiente e foco de teclado correto.

## 15. Pacote de assets e contratos de entrega

### Inventário de produção

| Família/IDs | Entregáveis |
|---|---|
| BRAND-01…03 | Logótipo completo, compacto, ícone |
| BG-BASE/BONUS/SUPER | Camadas e variantes do mesmo campo, horizontal/vertical |
| FRAME-01… | Moldura adaptativa, cantos, separadores, detalhes de rede e luzes por modo |
| SYM-N1…N4 | Quatro símbolos normais e partes animáveis |
| SYM-P1…P4 | Quatro premiums e partes animáveis |
| SYM-W/S | Carta/ilustração do craque e bilhete, sem texto variável colado |
| W-POWER-01…04 | Emblemas dos quatro poderes e efeitos da carta |
| W-STICKY | Aro/pino, confirmação, loop e saída |
| HUD-01… | Placas de saldo/ganhos/aposta/global/FS/modo |
| BTN-01… | Spin e componentes dos restantes botões com estados |
| ICON-01… | Histórico, definições, regras, som, velocidade, fullscreen, fechar, voltar, mais/menos |
| PANEL-01… | Base de diálogos, separadores, tabelas, scroll e campos |
| FX-REEL/LINE | Desfoque dos rolos, impacto, halo de linha, etiquetas e highlights |
| FX-P1…P4 | Roubo, selo local, expansão, conversões e adição global |
| FX-SCATTER | Holograma, bilhete ativado, contagem e feixes |
| FX-BONUS-01/02 | Transições de entrada/saída e luzes dos dois modos |
| WIN-01…04 | Três placas de prémio e placa de máximo, lettering separado |
| PARTICLE-01… | Relva, poeira, brilhos, confetes e fitas, em elementos reutilizáveis |
| UI-TEXT/NUM | Fonte/lettering vetorial, dígitos e glifos de apoio se necessários |
| AUDIO-PLAN | Mapa de sons e sincronização, para produção posterior |

### Formatos e tamanhos

- Símbolos: masters quadrados 1024×1024 com alpha; Wild pode ter master 1536×1536 para detalhe de personagem, mantendo o mesmo enquadramento final. Versões de runtime normalmente 256/512 px conforme dispositivo.
- Cenários: masters horizontais 3840×2160 e verticais 2160×3840 ou camadas com área suficiente para crop; sem upscale artificial obrigatório. As duas composições devem partilhar os mesmos elementos e luz.
- UI e ícones: SVG/elementos vetoriais ou geometria de código sempre que apropriado. Painéis raster: bordas preparadas para nine-slice, com centro escalável e sem letras.
- Fontes e texto em runtime; não gerar um atlas raster de todos os valores de saldo possíveis.
- VFX: pequenas texturas com alpha e geometria/shaders reutilizáveis. Não exportar um vídeo de ecrã inteiro para cada prémio.
- Rig articulado quando justificar: ficheiros editáveis e runtime compatível com a versão escolhida. Spritesheets só para efeitos difíceis de representar por rig/shader, com atlas gerado a partir de frames consistentes.
- Testar margens alpha em fundos claros/escuros para evitar halos. Não remover fundo pintando um quadriculado; transparência deve ser real.

Cada asset deve registar: ID, nome, modo, função, dimensões, alpha, área segura, pivot normalizado, limites do movimento, estados/animações, duração, loop, marcador de eventos, dependências, prioridade e licença/origem.

Exemplo de nomes: `sym_p3_jersey_master.png`, `sym_w_player_body.png`, `sym_w_frame.png`, `fx_p4_add_glow.png`, `bg_final_floodlight_emission.png`. Evitar `final_final2.png`.

Organização proposta para produção futura:

```text
art/source/{brand,backgrounds,symbols,ui,fx,animation}/
public/assets/football/{brand,backgrounds,symbols,ui,fx,fonts}/
docs/art/manifest.json
docs/art/previews/
```

O atlas, os recortes e os mapas de UV são exportados por ferramentas a partir de assets aprovados. Uma imagem gerada de uma folha com vários símbolos serve como contacto visual, não substitui os ficheiros individuais.

## 16. Áudio previsto e pontos de sincronização

Ainda que esta fase seja gráfica, reservar eventos para áudio: UI/confirmar/cancelar, aceleração e paragem de cada rolo, scatter 1–4, entrada de cada bónus, roubo, P1, P2, P3, P4, sticky, linha, contagem de prémio, três intensidades de celebração, máximo e resumo.

Ambientes: campo ao longe, rede/relva discreta, reação curta da bancada, batida desportiva original e variações por modo. Evitar apitos agressivos repetidos em cada pequeno ganho e sobreposição de dezenas de sons de linha. Priorizar fala visual e valores. Música, efeitos e master separados; áudio só após interação permitida pelo browser.

## 17. Prompt mestre para executar a produção visual

Copiar o bloco seguinte para orientar a fase de criação. Este documento acompanha a prompt como referência integral.

```text
Cria a direção gráfica e os assets da slot web “Futebol de Bairro — Noite de Glória”, seguindo docs/TEMA.md, AGENTS.md e a matemática atual do projeto. O produto já tem GUI funcional em ecrã único: preserva todos os comandos e estados, substituindo a apresentação genérica por uma identidade visual consistente.

CONCEITO
Torneio noturno num campo urbano fictício, com prédios, redes metálicas, murais originais, bancadas de bairro e projetores. Competição, convívio, improviso e conquista. Ilustração 3D estilizada com volumes expressivos e leitura imediata. Azul noite, verde relvado, laranja e dourado. Materiais claros, acabamento premium e desgaste subtil. Sem clubes/marcas/jogadores reais.

DEZ SÍMBOLOS
N1 cone laranja; N2 apito prateado com cordão azul; N3 garrafa verde; N4 meião azul/branco dobrado. P1 bola branca/azul; P2 par de chuteiras laranja/coral; P3 camisola azul/dourada nº10; P4 taça dourada com bola e fitas azul/laranja. W carta dourada com adulto fictício original segurando bola, faixa WILD. S bilhete holográfico azul/violeta para a final, estádio e faixa SCATTER. Produz assets individuais, transparentes, com escala e iluminação coerentes. Texto e nº10 em camadas vetoriais/runtime.

ESPAÇO DE JOGO
Grelha 6×4, 40 linhas por código. Interface ocupa o viewport, com tabuleiro ao centro, HUD de modo/FS/global e consola inferior com saldo, ganhos, aposta, velocidade, spin circular, duas compras e Último spin. Histórico, regras, definições e RTP/sessão são sobreposições. Preparar horizontal e vertical sem scroll da página principal.

MODOS
Base Torneio Noturno; normal Final do Bairro (3 scatters, 10 FS); superior Noite de Glória (4 scatters, 10 FS). Mesmo campo e mesma geografia, com iluminação/moldura/ambiente diferentes. Criar entradas, loops, resumos e saídas de ambos os bónus. Compras 90×/220× entram diretamente, sem falso spin de scatters.

PODERES
Roubo só em cima/baixo/esquerda/direita. P1 mantém wild ×2 e multiplica o global nas linhas elegíveis; local combinado limitado a ×8. P2 expande uma célula acima e abaixo, se válidas. P3 converte 2–10 normais em P3, limitado aos alvos reais. P4 adiciona +2/+3/+5 ao global inicial ×1; todas as ativações somam, sem acumular entre spins. Sticky só no superior e apenas quando devolvido pelo motor. Não criar cascatas, respins, jackpots, reativações ou novas probabilidades.

ANIMAÇÃO E UI
Cobrir idle/entrada/paragem/vitória/escurecido; quatro roubos; expansão; conversão; adição ao global; sticky; scatter e transições; linhas; prémios altos e máximo. Botões com repouso, hover, foco, pressionado, desativado e ocupado. Modos normal/rápido/super-rápido e movimento reduzido. Valores vêm do motor. Saltar apresentação mantém o resultado final exato.

ENTREGAS
Produzir primeiro uma amostra final de cenário+moldura+dez símbolos+HUD+um spin completo. Usá-la como referência para todas as gerações seguintes. Depois entregar camadas editáveis, imagens com alpha, vetores, rigs/timelines ou spritesheets realmente utilizáveis, manifesto por asset e previews de todos os estados. Nunca substituir a entrega por um mockup único, por assets com letras erradas ou por um tabuleiro pintado no fundo. Validar leitura a 48px, contraste, margens, enquadramento e comportamento em computador/telemóvel.

Não alterar o motor matemático. Distinguir conceito, asset produzido, animação implementada e entrega validada. Só declarar concluído o que existir e funcionar no projeto.
```

## 18. Prompts de produção por família

### Prefixo visual comum para imagens

Adicionar a todos os pedidos de raster e fornecer as imagens aprovadas como referência quando existirem:

> Para o mesmo jogo original “Futebol de Bairro — Noite de Glória”: ilustração 3D estilizada de alta qualidade, materiais táteis bem definidos, volumes expressivos e silhueta clara em miniatura. Azul profundo, verde relvado, laranja e dourado controlado. Câmara frontal com ligeiro três quartos, luz branca superior esquerda, recorte azul e reflexos quentes subtis. Sem marcas, clubes, jogadores reais, texto acidental, watermark ou fundo quadriculado pintado. Coerência rigorosa com as referências aprovadas.

### Cenários: prompts específicos

**BG-BASE:** “Cria um campo de futebol de bairro fictício ao anoitecer, com prédios baixos, vedação de rede metálica, murais originais sem texto legível, pequenas bancadas e projetores. Céu azul profundo com último brilho de pôr do sol; relvado verde. Composição para slot em ecrã único: zona central escura e calma para sobrepor grelha 6×4; detalhes interessantes nas margens. Sem tabuleiro, símbolos, HUD ou botões pintados. Preparar camadas independentes de céu, cidade, público, campo e luz.”

**BG-BONUS:** “Usando o cenário base aprovado, cria a variante Final do Bairro. Conserva exatamente campo, câmara, prédios e bancadas. Noite azul mais intensa, projetores adicionais e reflexos azuis, público discretamente mais ativo. Centro continua limpo; sem acrescentar símbolos ou texto. Separar emissão dos projetores e feixes para transição animada.”

**BG-SUPER:** “Usando o mesmo cenário aprovado, cria Noite de Glória, a versão superior. Iluminação branca/dourada de final, céu profundo, fitas azuis/laranja apenas nas laterais, público mais presente e recorte violeta subtil. Preservar geografia, câmara e área limpa do tabuleiro. Intensidade elegante, sem explosão de dourado que reduza o contraste.”

### Símbolos: pedidos individuais

Aplicar prefixo comum; pedir um único símbolo isolado por ficheiro, alpha real, enquadramento quadrado e margem de 12–16%. Não pedir os dez numa única folha como entrega final.

| ID | Continuação da prompt |
|---|---|
| N1 | “Cone de treino laranja ligeiramente gasto, base larga e faixa clara. Silhueta triangular compacta, plástico mate com volume claro; sombra separável. Sem letras.” |
| N2 | “Apito prateado arredondado com pequeno cordão azul enrolado. Orifício legível e reflexos metálicos largos, sem exagerar o brilho; cordão não sai da área segura.” |
| N3 | “Garrafa desportiva verde robusta, tampa contrastante e poucas gotas grandes. Forma cilíndrica legível, plástico tátil sem marca, texto ou rótulo comercial.” |
| N4 | “Meião azul e branco às riscas, dobrado sobre si próprio, com textura suave e pequena marca de relva. Massa compacta, dobras simples, sem perna ou personagem.” |
| P1 | “Bola de futebol branca com painéis azul-escuros, costuras claras e marcas subtis de utilização, ângulo dinâmico mas silhueta circular limpa, luz de projetor, sem marca.” |
| P2 | “Par de chuteiras laranja e coral formando uma composição compacta, atacadores definidos e parte de uma sola visível, pose de arranque, materiais premium sem logótipos.” |
| P3 | “Camisola azul intenso com gola/detalhes dourados, corpo e mangas expressivos, tecido encorpado com leve movimento. Centro reservado para aplicar decal vetorial 10. Sem patrocínio, escudo, palavras ou dígitos gerados.” |
| P4 | “Taça dourada de bairro com pegas largas, pequena bola no topo, base robusta e fitas azuis/laranja. Forma reconhecível e brilho elegante, peças separáveis, sem inscrições.” |
| W | “Carta de jogador especial com adulto fictício original, expressão confiante e acolhedora, bola debaixo do braço. Carta metálica dourada com recortes desportivos e halo de projetor. Corpo maioritariamente frontal, rosto original e faixa inferior vazia para WILD vetorial. Separar personagem, bola, moldura e efeitos. Não imitar cartas de marcas existentes.” |
| S | “Bilhete diagonal da final de um torneio de bairro, cantos recortados e holograma azul/violeta, pequena ilustração de estádio iluminado ao centro. Faixa ampla vazia para SCATTER vetorial. Silhueta claramente diferente da carta Wild; sem personagem, números de série ou texto aleatório.” |

### Moldura e consola

> Desenha componentes de um marcador desportivo azul-grafite para envolver grelha 6×4, com metal pintado, pequenas fixações, detalhes de rede e emissões luminosas separadas. Criar cantos, laterais, separadores e consola inferior adaptáveis. Não colar símbolos, números, logótipos, pagamentos ou botões funcionais numa imagem única. Reservar áreas claras para HUD e rótulos em runtime. Variantes Torneio Noturno, Final do Bairro e Noite de Glória mantêm a geometria.

### Botões, ícones e painéis

> Cria um sistema vetorial coerente de UI desportiva: spin circular, setas, mais/menos, seletor de aposta, velocidades, histórico, definições, regras, fullscreen, fechar e voltar. Estados repouso/hover/foco/pressionado/desativado/ocupado. Placas e painéis adaptáveis, sem texto rasterizado. Alto contraste em azul-grafite, branco e acentos laranja/dourado. Mesma espessura de traço; reconhecer ícones a 20–24 px e preservar alvos de toque adequados. Não incluir controlos fictícios sem função.

### Efeitos e transições

> Produz elementos transparentes reutilizáveis de luz de projetor, energia de passe, relva, poeira, confetes, fitas e holograma. Separar emissão, núcleo e halo. Criar efeitos para roubo ortogonal, expansão vertical de até dois alvos, conversão de 2–10 normais, incremento +2/+3/+5 no HUD e âncora sticky. Efeitos nunca tapam os símbolos, valores ou resultados. Propor versão reduzida sem movimento e orçamentos de duração para três velocidades. Não gerar um vídeo achatado que substitua o tabuleiro.

### Entradas de bónus e prémios

> Cria painéis/ornamentos separados para Final do Bairro e Noite de Glória, com área de título vetorial, 10 FREE SPINS, aposta real e botão CONTINUAR. Criar também as placas Grande Jogada, Golaço, Noite Memorável e Glória Máxima, com valor numérico independente. Projetores, rede, fitas e taça são linguagem comum. Os fundos e contadores permanecem legíveis; evitar texto gerado incorreto e números fixos embutidos.

### Prompt de implementação das animações

```text
Implementa as animações a partir dos assets aprovados e do catálogo em docs/TEMA.md. Usa o resultado estruturado do motor, com tabuleiro inicial/final, eventos, alvos, linhas e próximo estado. Não sorteies alvos ou prémios na camada visual.

Organiza timelines por fases: rolos → tabuleiro inicial → roubos → P2 → P3 → global P4 → linhas/P1 → pagamento → bónus/resumo. Os fatores P1 são locais às linhas e o global entra uma única vez. Uma ativação P4 aparece como soma no HUD. Não repetir poderes de stickies do spin anterior.

Define para cada animação nome, duração, easing, pivot, camadas, loop, marcadores de evento e estado terminal. Suporta normal/rápida/super-rápida, concluir apresentação, reduzir movimento, mudança de orientação e retoma. Cancelar uma timeline deve aplicar um snapshot visual final coerente, sem novo comando ao motor, sem pagamento duplicado e sem listeners pendurados.

Usa PixiJS para o tabuleiro e composição gráfica, timelines GSAP para coordenação e Spine apenas se houver assets/rig/licença compatíveis. Não afirmar que uma imagem estática é um rig ou uma animação terminada. Entrega uma demonstração reproduzível por cenário de teste, incluindo zeros, vários poderes, falta de alvos, sticky, entrada/saída dos dois bónus e teto acumulado.
```

## 19. Plano de execução e validação

1. **Referência artística:** aprovar composição do campo, luz, paleta e um contacto dos dez símbolos. Ajustar diferenças de escala antes de multiplicar variantes.
2. **Amostra com acabamento final:** um cenário base, moldura, dez símbolos, HUD, consola e uma jogada completa. Validar no browser em horizontal e vertical.
3. **Poderes:** apresentar os quatro com alvos forçados de teste, incluindo múltiplos P4 e P1 × global; depois sticky e ausência de alvos.
4. **Bónus:** produzir variantes de iluminação, entradas, FS, resumo e regresso, incluindo compras e recuperação de sessão.
5. **Celebrações e sistema:** três intensidades de prémio, máximo, menus, loading, erros e acessibilidade.
6. **Otimização:** atlas, compressão, descarregamento de recursos, níveis de efeito e medições de frame time nos dispositivos suportados.

Critérios de aceitação:

- Dez símbolos reconhecíveis em miniatura, sem confundir W/S, N3/relvado ou P3/número de FS.
- Mesma personagem, materiais, câmara e luz em toda a família de assets.
- Interface inteira num único espaço; nenhum botão essencial fica cortado ou depende de scroll da página.
- Todos os rótulos e valores reais são corretos e legíveis, incluindo líquido negativo e teto.
- Todas as transições mostram o modo verdadeiro e preservam contadores, stickies e estado da ronda.
- Sem efeitos em alvos inexistentes, roubos diagonais ou poderes recursivos.
- Normal, rápida, super-rápida e concluir apresentação chegam ao mesmo resultado final.
- Navegação por teclado, foco, fechar diálogos e movimento reduzido funcionam.
- Objetivo de 60 FPS validado por medição; reduzir partículas/qualidade conforme dispositivo, sem degradar legibilidade.
- Previews não substituem ficheiros editáveis e assets individuais; manifesto identifica o que está pronto, experimental ou pendente.

Não há necessidade de criar toda a arte antes de verificar o primeiro spin. A amostra com acabamento final estabelece a linguagem que todos os restantes elementos devem seguir.
