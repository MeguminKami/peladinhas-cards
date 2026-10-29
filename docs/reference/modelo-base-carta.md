# Modelo base de uma carta

Contrato obrigatório para criar ou alterar cartas Peladinhas Cards, independentemente da edição ou da área onde aparecem. Complementa o [AGENTS.md](../../AGENTS.md). Uma edição muda a apresentação gráfica; o conteúdo e o comportamento continuam a seguir as regras comuns.

## 1. Conteúdo obrigatório

Uma carta deve representar o jogador e a semana/contexto corretos, com:

- Nome do jogador, com o fallback de identidade existente.
- Fotografia do jogador ou avatar padrão.
- OVR e respetivo rótulo.
- Posição principal e bandeira do país, quando definidos nos dados.
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
- Reutilizar `cardStatsMarkup`, `cardOvrTrend` e `cardPlaystyles` de [card-player-content.js](../../js/card-player-content.js). Não copiar a lógica para um renderer novo.
- Respeitar os estados existentes: com `hasCard === false`, mostrar «—» no OVR e nos atributos e não apresentar evolução nem playstyles. Com carta existente e atributo ausente, respeitar o fallback comum, atualmente `0`.
- Comparar evolução apenas com os valores permanentes da semana anterior válida, através de [weekly-comparison.js](../../js/weekly-comparison.js). Não tratar bónus temporários como evolução permanente. Sem comparação válida, não inventar setas.
- Os playstyles usam os ícones partilhados dos atributos elegíveis com valor de pelo menos 90, ordenados por valor, com um máximo de três. Não inventar outro limiar ou outra regra por edição.
- Escapar nomes e texto variável, validar imagens pelo mecanismo existente e garantir identificadores SVG únicos para várias cartas na mesma página.

## 3. Fotografia e composição

A fotografia tem de ficar contida numa área quadrada, dimensionada para dar espaço próprio ao OVR, posição, país, nome e atributos. Deve ter o mesmo enquadramento entre edições da mesma família, sem se esticar, invadir texto ou ultrapassar a moldura.

- Preservar a proporção da imagem. Aplicar foco, zoom e modo de ajuste dentro da área reservada, com recorte limitado ao quadrado.
- Não reutilizar cegamente coordenadas e dimensões de uma carta com geometria diferente. Um zoom, rotação ou posição guardados nunca devem permitir que a fotografia invada outras zonas.
- Na loja, reutilizar `.sca-photo-frame` de [casino-shop-art.css](../../css/casino-shop-art.css) e o tratamento da fotografia de [casino-shop-art.js](../../js/casino-shop-art.js). O quadrado atual tem largura de 46% da carta; a altura deriva de `aspect-ratio: 1`.
- Reutilizar a validação e as opções de [card-photo.js](../../js/card-photo.js). Se o formato já tiver um editor de fotografia, preservar a compatibilidade e verificar o enquadramento antes de alterar a geometria existente.
- Sem fotografia ou com erro de carregamento, mostrar o avatar padrão; não criar uma identidade fictícia para o jogador.

A composição deve ter leitura clara: OVR/posição/país, fotografia, nome e atributos. Apresentar os atributos em duas linhas de quatro, com valor acima do rótulo. Reservar espaço para setas e playstyles sem os sobrepor a números ou à identidade.

Respeitar a proporção da família existente, os tamanhos de carta e o desenho responsivo. A carta normal e a loja têm geometrias próprias; não esticar uma para imitar a outra. Usar escala relativa à carta para que texto, fotografia e símbolos cresçam juntos. Garantir contraste, algarismos tabulares, nomes longos legíveis e separação entre elementos.

## 4. Componentes e integração

A entrada comum de apresentação é `card()` em [cards.js](../../js/cards.js). Os desenhos da loja usam [casino-shop-art.js](../../js/casino-shop-art.js), mantendo o mesmo conteúdo partilhado. Uma nova edição deve integrar-se nesses caminhos, em vez de criar uma carta independente com regras próprias.

Verificar os consumidores aplicáveis: loja, pré-visualização ampliada, catálogo/álbum, ADMIN, seletor de cartas, perfil, início e histórico. Uma edição reconhecida pelo catálogo deve ser reconhecida pelo renderer e pelo seletor quando o jogador tem direito a usá-la.

- Propriedade e disponibilidade seguem [card-achievements.js](../../js/card-achievements.js). Respeitar duração, expiração, revogação e seleção válida.
- Uma compra da loja concede o acabamento permanente e disponibiliza-o em **Perfil → Escolher carta**. Não o selecionar automaticamente. A descoberta no álbum público não concede propriedade.
- Validar no servidor a compra, a atribuição e a seleção; o cliente não pode conceder cartas a si próprio. Reutilizar a transação de [casino-shop.js](../../functions/casino-shop.js) para compras da loja.
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
