# Modelo base de uma carta

Contrato obrigatório para criar ou alterar cartas Peladinhas Cards, independentemente da edição ou da área onde aparecem. Complementa o [AGENTS.md](../../AGENTS.md). Uma edição muda a apresentação gráfica; o conteúdo e o comportamento continuam a seguir as regras comuns.

## 1. Conteúdo obrigatório

Uma carta deve representar o jogador e a semana/contexto corretos, com:

- Nome do jogador, com o fallback de identidade existente.
- Fotografia do jogador ou avatar padrão.
- OVR e respetivo rótulo.
- Posição principal e bandeira do país, quando definidos nos dados.
- Clube favorito, quando escolhido: emblema por baixo da bandeira, através de `clubBadge` de [club-badge.js](../../js/club-badge.js). Reutilizar o mesmo snapshot nas cartas e previews; não consultar a API para renderizar. Ver [seleção de clubes](../guides/football-clubs.md).
- Oito atributos, na ordem e com as abreviaturas oficiais da tabela abaixo.
- Indicadores de evolução e playstyles quando o jogador cumpre as regras existentes.

| Ordem | Campo | Atributo | Rótulo |
| --- | --- | --- | --- |
| 1 | `pace` | Velocidade | VEL |
| 2 | `shooting` | Finalização | FIN |
| 3 | `passing` | Passe | PAS |
| 4 | `dribbling` | Drible | DRI |
| 5 | `defending` | Defesa | DEF |
| 6 | `physical` | Físico | FIS |
| 7 | `goalkeeping` | Guarda-redes | GR |
| 8 | `stamina` | Resistência | RES |

Usar a definição `ATTRIBUTES` de [utils.js](../../js/utils.js), sem manter uma lista alternativa por edição. A carta apresenta estes oito atributos também para guarda-redes; a posição influencia os cálculos através das regras existentes, sem substituir a lista apresentada por estatísticas de outro jogo.

O nome da edição, o tier, o preço, os requisitos e as ações pertencem à ficha ou catálogo, fora da carta. Não escrever «THE ULTIMATE», «V2» ou títulos de edição no interior. A raridade deve reconhecer-se pelos materiais, desenho e acabamento.

## 2. Dados e regras comuns

- Usar os dados oficiais do contexto apresentado. Uma pré-visualização com o mesmo jogador e contexto deve ter os mesmos valores da carta no perfil. Um histórico representa a sua semana, sem receber valores atuais.
- A aparência não calcula OVR, não concede bónus e não muda atributos. Não preencher atributos em falta com o OVR, valores de demonstração ou o requisito mínimo da edição.
- Desde a progressão v3, conservar decimais nos cálculos e nos campos exatos guardados; `stats` é a projeção inteira de apresentação. O OVR é ponderado a partir dos valores exatos e arredondado no fim. Ver [progressão](progression.md) para expectativas por atributo e versões históricas.
- Reutilizar `cardStatsMarkup`, `cardOvrTrend` e `cardPlaystyles` de [card-player-content.js](../../js/card-player-content.js). Não copiar a lógica para um renderer novo.
- Respeitar os estados existentes: com `hasCard === false`, mostrar «—» no OVR e nos atributos e não apresentar evolução nem playstyles. Com carta existente e atributo ausente, respeitar o fallback comum, atualmente `0`.
- Comparar evolução apenas com os valores permanentes da semana anterior válida, através de [weekly-comparison.js](../../js/weekly-comparison.js). Não tratar bónus temporários como evolução permanente. Sem comparação válida, não inventar setas. A variação apresentada e as setas comparam os dois valores permanentes arredondados às unidades (atual menos anterior); valores que resultam no mesmo inteiro não indicam subida ou descida. Preservar os decimais nos cálculos e dados guardados.
- Os playstyles usam os ícones partilhados dos atributos elegíveis com valor de pelo menos 90, ordenados por valor, com um máximo de três. Não inventar outro limiar ou outra regra por edição.
- Escapar nomes e texto variável, validar imagens pelo mecanismo existente e garantir identificadores SVG únicos para várias cartas na mesma página.

## 3. Fotografia e composição

Por omissão, a fotografia fica contida numa área quadrada, dimensionada para dar espaço próprio ao OVR, posição, país, nome e atributos. Deve ter o mesmo enquadramento entre edições da mesma família, sem se esticar, invadir texto ou ultrapassar a moldura. A edição manual ADMIN descrita abaixo é uma exceção explícita: permite posicionamento livre fora da moldura.

- Preservar a proporção da imagem. Aplicar foco, zoom e modo de ajuste dentro da área reservada, com recorte limitado ao quadrado.
- Não reutilizar cegamente coordenadas e dimensões de uma carta com geometria diferente. Um zoom, rotação ou posição guardados nunca devem permitir que a fotografia invada outras zonas.
- Na loja, reutilizar `.sca-photo-frame` de [casino-shop-art.css](../../css/casino-shop-art.css) e o tratamento da fotografia de [casino-shop-art.js](../../js/casino-shop-art.js). O quadrado fica a 33% da esquerda, com largura de 54% da carta e a base a 56% da altura, junto ao nome; a altura deriva de `aspect-ratio: 1`.
- Nas fotografias existentes sem posicionamento livre, aplicar os controlos guardados numa camada `.sca-photo-transform` dentro desse quadrado, usando `cardPhotoStyles(design, { bounded: true })`.
- O editor ADMIN usa `placement: "free"`: arrastar move sempre, Tamanho amplia proporcionalmente e Rotação roda. Posição e recorte ficam em opções avançadas; não apresentar modos Mover/Tamanho/Ampliar concorrentes. Os ajustes atualizam os estilos da fotografia sem reconstruir a carta. Setas movem 1 ponto percentual; Shift acelera para 5 e Alt afina para 0,1.
- Converter o enquadramento anterior com `freePhotoDesign()` ao abrir o editor. Guardar o marcador de posicionamento livre com a fotografia semanal: a imagem pode ultrapassar a silhueta tanto na prévia como no perfil, catálogo e histórico respetivo, mantendo nome, OVR e atributos por cima. Fotografias antigas e semanas fechadas não são reescritas. Repor ajustes recupera posição/tamanho/rotação sem apagar a imagem; Usar fotografia do perfil mantém a reposição semanal existente.
- Reutilizar a validação e as opções de [card-photo.js](../../js/card-photo.js). Se o formato já tiver um editor de fotografia, preservar a compatibilidade e verificar o enquadramento antes de alterar a geometria existente.
- Sem fotografia ou com erro de carregamento, mostrar o avatar padrão; não criar uma identidade fictícia para o jogador.

A composição deve ter leitura clara: OVR/posição/país, fotografia, nome e atributos. Apresentar os atributos em duas linhas de quatro, com valor acima do rótulo. Reservar espaço para setas e playstyles sem os sobrepor a números ou à identidade.

Na loja, desenhar os acabamentos para a geometria base: cantos ligados às laterais, pedras assentes em encaixes, coroas e louros unidos ao rebordo e remates próprios no topo e no fundo. Reutilizar [casino-shop-frame-art.js](../../js/casino-shop-frame-art.js). Não obter ornamentos recortando ou esbatendo outra moldura. Adornos podem prolongar-se ligeiramente para o exterior (até 15 unidades no topo, 8 nas laterais e 7 no fundo do desenho SVG de 300 × 420), sem reduzir o corpo nem invadir o conteúdo; reservar espaço nos contentores. Evitar pontas cortadas e linhas soltas.

Nas edições de prestígio e premium, acrescentar placas pretas, encaixes cinzentos e metal escuro entre os adornos coloridos, preservando a progressão visual. As cinco cartas de jogos usam cenários próprios sob a fotografia: feltro/cartas/fichas no Blackjack, roda/bola na Roleta, tubos/correntes/óleo no Cardoso, reator/fraturas no RIFT e campo/rede/projetores no Futebol de Bairro. Conter estes cenários no corpo e proteger a leitura do OVR e símbolos; não alterar os dados do jogador.

Respeitar a proporção da família existente, os tamanhos de carta e o desenho responsivo. As cartas da loja usam a mesma caixa da carta normal (proporção `0.67` e `--card-width`) e a mesma ordem de leitura: OVR/posição/país à esquerda, fotografia à direita, nome e atributos em baixo. A loja reutiliza o corpo base do Card Lab (`DEFAULT_CARD_OUTLINE` com `expandCardOutline`) e as classes de conteúdo da carta normal. Cada edição acrescenta materiais e ornamentos à periferia desse corpo, sem encolher a área útil nem criar proporções próprias por edição. Usar escala relativa à carta para que texto, fotografia e símbolos cresçam juntos. Garantir contraste, algarismos tabulares, nomes longos legíveis e separação entre elementos.

## 4. Componentes e integração

A entrada comum de apresentação é `card()` em [cards.js](../../js/cards.js). Os desenhos da loja usam [casino-shop-art.js](../../js/casino-shop-art.js), mantendo o mesmo conteúdo partilhado. Uma nova edição deve integrar-se nesses caminhos, em vez de criar uma carta independente com regras próprias.

O editor ADMIN de fotografia semanal usa `currentCardTheme()` de [cards.js](../../js/cards.js) para abrir a mesma aparência apresentada no perfil, incluindo a escolha explícita da carta base. Ajustar a fotografia não altera essa escolha.

Verificar os consumidores aplicáveis: loja, pré-visualização ampliada, catálogo/álbum, ADMIN, seletor de cartas, perfil, início e histórico. Uma edição reconhecida pelo catálogo deve ser reconhecida pelo renderer e pelo seletor quando o jogador tem direito a usá-la.

- Propriedade e disponibilidade seguem [card-achievements.js](../../js/card-achievements.js). Respeitar duração, expiração, revogação e seleção válida.
- Uma compra da loja concede o acabamento permanente e disponibiliza-o em **Perfil → Escolher carta**. Não o selecionar automaticamente. A descoberta no álbum público não concede propriedade.
- Validar no servidor a compra, a atribuição e a seleção; o cliente não pode conceder cartas a si próprio. Reutilizar a transação de [casino-shop.js](../../functions/casino-shop.js) para compras da loja.
- O início e o perfil abrem o mesmo seletor de aparência. Escolher uma carta no popup apenas marca a opção; «Guardar» confirma a seleção no servidor e «Cancelar» ou fechar descarta a escolha. As ações ficam centradas no topo, acima das cartas.
- Preservar outras conquistas, atributos e semanas fechadas. Uma aparência nova não exige recalcular jogadores ou reescrever históricos.

## 5. Critério de conclusão

Antes de considerar uma carta concluída:

1. Comparar o conteúdo com uma carta normal do mesmo jogador/contexto: identidade, país, posição, OVR, os oito valores e rótulos, evolução e playstyles.
2. Inspecionar a carta renderizada no catálogo, numa pré-visualização ampliada e no perfil/seletor aplicáveis. Verificar desktop, 320/390 px e uma largura próxima de 768 px, sem overflow ou sobreposições.
3. Verificar nome longo, OVR/atributos nos limites, posição GR, fotografia vertical/horizontal com zoom, avatar padrão, ausência de carta e evolução indisponível. As setas não podem deslocar os valores.
4. Testar teclado, foco visível e movimento reduzido nas interações alteradas. A cor não deve ser o único sinal de estado.
5. Quando há aquisição, verificar compra/atribuição → coleção → disponibilidade no perfil → seleção → apresentação, incluindo repetição de compra e preservação de semanas fechadas.
6. Executar os testes locais relevantes e `npm.cmd run test:docs`. Documentar limitações de validação e os componentes que precisam de publicação.

Para cartas da loja, os testes existentes são `tests/casino-shop.test.js`, `tests/casino-shop.backend.test.js` e `tests/casino-shop-integrated.mjs`; os procedimentos estão no [guia da loja](../guides/casino-shop.md#desenvolvimento-e-verificação). Usar fixtures e emuladores; leituras do Firebase ou Storage reais continuam sujeitas à autorização definida no AGENTS.md.

Este guia define o contrato de desenvolvimento. Não é uma declaração de que todos os desenhos anteriores já foram auditados ou migrados para esta composição. Ao alterar uma família existente, corrigir e validar os seus consumidores dentro do âmbito da tarefa.
