# Etapa 1 — Lógica, mecânicas, bónus e RTP

## Contexto para o agente

Vamos criar uma slot de raiz num projeto limpo. Este documento é uma instrução de trabalho para um agente que não conhece conversas anteriores. O desenvolvimento decorre em três etapas:

1. **Lógica:** discutir e implementar regras, mecânicas, bónus e matemática, sem gráficos.
2. **Protótipo visual básico:** tornar as mecânicas observáveis e decidir posições, áreas, controlos e menus em conjunto.
3. **Produção visual:** depois de o utilizador fornecer tema, imagens e cores, criar todos os visuais e animações com uma equipa de três agentes: o principal e dois em paralelo.

Estamos apenas na primeira etapa. Não antecipar o desenho da interface nem produzir arte final. O utilizador quer construir a ideia através de conversa, com um agente que toma iniciativa, faz perguntas e propõe alternativas.

## Conceito recebido — 30 de outubro de 2026

Esta secção regista as regras e a configuração inicial de desenvolvimento. O [motor local](src/engine.js), as [tabelas executáveis](src/config.js), os testes e o simulador estão implementados; os valores iniciais ainda não estão calibrados para o RTP pretendido. Consultar o [guia de execução](README.md) e o estado da medição na [formulação matemática](matematica.md).

### Regras confirmadas pela ideia inicial

- Grelha 6×5, com pagamentos por grupos de símbolos iguais ligados horizontal ou verticalmente. Diagonais não ligam grupos; não existem linhas de pagamento.
- Dez símbolos regulares: cinco normais, menos valiosos, e cinco premium, mais valiosos, com raridades crescentes. Identificadores N1–N5 e P1–P5; pesos, pagamentos e XP seguem a ordem global N1 a P5 nas tabelas atuais.
- Existe um símbolo scatter e existem wilds.
- O prémio máximo é 10 000× a aposta, acumulando toda a jogada paga: spin base, cascatas, bónus e spins adicionais originados. Ao atingir ou ultrapassar o teto, creditar apenas o necessário para totalizar exatamente 10 000× e terminar imediatamente a jogada, incluindo cascatas, magias e free spins restantes. Emitir um evento de MAX WIN para a apresentação futura mostrar um ecrã com «MAX WIN». Não aplicar tetos separados por hit ou free spin, nem pagar o prémio total novamente ao mostrar esse ecrã.
- Um grupo começa a pagar com cinco símbolos. A tabela tem seis escalões, sendo o primeiro 5 e o último 18+. O tamanho máximo físico de um grupo é 30.
- Ao sortear um dos cinco símbolos normais para uma posição, existe 52% de probabilidade de colocar outro igual numa posição vizinha desocupada, horizontal ou vertical. Se não existir vizinha válida, não se gera a cópia. A probabilidade aplica-se por símbolo sorteado, não por spin. A implementação escolhe uniformemente entre vizinhas válidas, permite apenas uma segunda cópia com a probabilidade própria de 25% e aplica a mesma regra nas cascatas.
- Os grupos vencedores desaparecem; os símbolos restantes caem e entram símbolos novos, permitindo cascatas. Wilds usados num hit desaparecem; os não usados permanecem durante as cascatas com o seu multiplicador individual. Nenhum wild sobrevive à passagem para outro spin, incluindo spins de bónus.
- Os resultados são gerados aleatoriamente com probabilidades explícitas configuráveis. A decisão inicial de não simular foi substituída pelo pedido explícito de formular, simular e calibrar para RTP de 98%–100%. O plano atual inclui 1 000 000 de jogadas base completas com os bónus obtidos e 100 000 compras de cada tipo de bónus, com análise separada. Ver a [formulação matemática](matematica.md). Não afirmar um RTP medido ou validado com base apenas na configuração de probabilidades.
- O XP é ganho apenas nos grupos vencedores e depende da quantidade de símbolos e da raridade, com influência pequena, mas existente, da raridade. Para XP contam apenas os símbolos regulares, usando a raridade do grupo: quatro iguais mais um wild formam um hit de cinco mas geram XP de quatro. Wilds continuam a contar no tamanho do hit e no pagamento; um hit só de wilds gera zero XP.
- No jogo base, a barra mantém XP durante as cascatas do mesmo spin, mas reinicia a cada novo spin. O XP do jogo base nunca passa para o bónus, mesmo que o spin que o ativa também tenha hits. A entrada no bónus começa com a barra vazia; durante o bónus, o progresso da barra mantém-se entre spins. Ao regressar ao jogo base, não se recupera XP anterior.
- Os três bónus começam com 12 spins. Encher a barra ativa a magia sem acrescentar spins. Apenas scatters podem conceder os retriggers previstos.
- Quando uma cascata enche a barra, primeiro pagam-se os grupos que geraram esse XP, removem-se os vencedores e deixam-se cair e entrar os símbolos. Antes de avaliar ou pagar quaisquer novos grupos, a magia esvazia a barra e lança os wilds no tabuleiro. Só depois se avalia o tabuleiro resultante. A magia coloca o XP exatamente a zero e descarta todo o excedente do preenchimento; esse excedente não gera ativações adicionais. Wilds só substituem os cinco símbolos normais ou os cinco premium, nunca scatters nem wilds existentes.
- Um wild pode participar em todos os grupos a que esteja fisicamente ligado. Para cada símbolo regular, apurar separadamente os componentes ligados por passos horizontais ou verticais, atravessando apenas esse símbolo e wilds. Outro símbolo regular, um scatter ou uma diagonal não serve de ponte. Um wild ligado apenas ao grupo de N1 não conta no grupo de P1. Se estiver ligado a ambos por percursos válidos, participa em ambos, incluindo quantidade, multiplicador e XP de cada hit; é removido fisicamente apenas uma vez. Cada posição conta apenas uma vez dentro do mesmo grupo, mesmo que existam vários percursos até ela.
- No jogo base, a barra exige mais XP e cada preenchimento espalha aleatoriamente de um a três wilds, sem multiplicador.
- Três scatters ativam o comum. A magia começa em 2 wilds de ×1 e alterna +1 wild / +1×. Ao atingir seis wilds, cada barra seguinte acrescenta +1×.
- Quatro scatters ativam o super. A magia começa em 2 wilds de ×2 e alterna +2× / +1 wild. Ao atingir seis wilds, cada barra seguinte acrescenta +2×.
- Cinco scatters ativam o secret. A magia começa em 2 wilds de ×2; cada barra seguinte acrescenta +1 wild e +2×. Após seis wilds, continua +2× por barra.
- Wilds multiplicadores no mesmo hit somam os seus valores. Exemplo: um hit com wilds ×2 e ×3 aplica ×5 ao prémio desse grupo. Wilds que sobrevivam conservam o seu valor individual, permitindo coexistirem valores diferentes.
- Todos os bónus começam com 12 spins. Os gatilhos no jogo base são contagens exatas: 3 scatters para o comum, 4 para o super e 5 para o secret. Não usar «5 ou mais» nem criar outros escalões. A geração no jogo base está limitada a cinco scatters por spin completo, incluindo as cascatas.
- No jogo base, cada posição sorteada usa a probabilidade correspondente ao próximo scatter: primeiro, segundo, terceiro, quarto ou quinto, de acordo com a contagem atual. Após gerar um scatter, atualizar imediatamente a contagem antes de sortear outra posição. Com cinco scatters, a probabilidade de gerar outro passa a zero. A contagem reinicia no spin seguinte; não sortear antecipadamente uma quantidade nem garantir qualquer scatter. Os cinco valores de probabilidade ainda estão por definir e são configurados separadamente dos valores do bónus.
- Contar scatters uma única vez no fim de cada spin completo, depois de terminarem todos os hits, cascatas e eventuais magias. Isto aplica-se a cada spin do jogo base e a cada spin do bónus; não acumular scatters entre spins. Não ativar nem atribuir spins adicionais durante uma cascata ainda em curso.
- Durante um bónus, exatamente dois scatters dão mais dois spins e exatamente três scatters dão mais quatro spins. Não adicionar os escalões propostos de quatro ou cinco scatters nem promover o tipo de bónus.
- No bónus, a geração está limitada a três scatters por spin completo, incluindo todos os preenchimentos de cascatas. A geração ocorre individualmente por posição: com zero scatters no spin usa-se a probabilidade configurada para o primeiro; com um, a do segundo; com dois, a do terceiro; com três, a probabilidade de outro scatter é zero. Atualizar a contagem imediatamente após cada scatter gerado, antes de sortear a posição seguinte. Não sortear previamente uma quantidade de scatters por spin nem garantir que sai pelo menos um: cada posição pode falhar o sorteio. Os valores das três probabilidades ainda estão por definir.

### Seis escalões definidos para a tabela

| Escalão | Quantidade de símbolos ligados |
| --- | --- |
| 1 | 5 |
| 2 | 6–7 |
| 3 | 8–10 |
| 4 | 11–14 |
| 5 | 15–17 |
| 6 | 18+ |

Estes escalões cobrem todos os tamanhos premiados sem sobreposição. Cada símbolo terá os seus seis valores de pagamento, ainda por calibrar; 18+ é um escalão de pagamento, não um limite de tamanho do grupo.

### Progressão confirmada da magia nos bónus

Numerar as ativações desde `k = 1` no início de cada novo bónus. O contador mantém-se entre os spins desse bónus, incluindo spins adicionais; reinicia apenas num novo bónus. Os wilds no tabuleiro continuam a desaparecer na passagem de spin, mas o progresso da magia e o XP parcial mantêm-se durante o bónus.

| Ativação | Comum | Super | Secret |
| --- | --- | --- | --- |
| 1 | 2 wilds ×1 | 2 wilds ×2 | 2 wilds ×2 |
| 2 | 3 wilds ×1 | 2 wilds ×4 | 3 wilds ×4 |
| 3 | 3 wilds ×2 | 3 wilds ×4 | 4 wilds ×6 |
| 4 | 4 wilds ×2 | 3 wilds ×6 | 5 wilds ×8 |
| 5 | 4 wilds ×3 | 4 wilds ×6 | 6 wilds ×10 |

- Comum alterna +1 wild / +1×. Super alterna +2× / +1 wild. Secret acrescenta ambos a cada barra.
- A quantidade está limitada a seis wilds simultâneos, incluindo existentes. Ao atingir seis, todas as barras seguintes melhoram o multiplicador: +1 no comum, +2 no super/secret.
- A magia melhora também os multiplicadores dos wilds sobreviventes; nunca reduz um multiplicador maior. Scatters não são substituídos. Se faltarem posições elegíveis, ignorar os wilds que não couberem.
- Somar os multiplicadores dos wilds ligados a cada hit nos três bónus. A evolução reinicia no bónus seguinte.

### Propostas para discutir

- Configuração inicial de XP definida para desenvolvimento: `quantidade × (1 + 0,02 × índice_de_raridade)`, com índice de 0 a 9, de N1 a P5. A raridade acrescenta no máximo 18%; os multiplicadores monetários não multiplicam XP. A quantidade inclui os wilds fisicamente ligados usados em cada grupo. Barras atuais: jogo normal 39 XP, comum 18,80 XP, super 17,10 XP e secret 16,50 XP, sem alteração do limiar conforme sobe o nível. A [formulação matemática](matematica.md) contém a tabela completa de XP por símbolo e intervalo. Estes valores ainda precisam de calibração de RTP.

### Configuração matemática atual

Os valores desta secção são as tabelas de `sofia-growth-4`, preservadas em `sofia-growth-4-hunt-3` com a revisão do Bonus Hunt. Não são probabilidades medidas de prémio nem garantem RTP. Os seis escalões foram aumentados por fatores de aproximadamente 1,5; 3; 6; 12; 24 e 48 face à versão inicial, com arredondamento ao centésimo, favorecendo sobretudo os clusters grandes. Não substituem as regras confirmadas e ainda precisam de calibração.

#### Símbolos, pagamentos e XP

Primeiro sortear se a posição recebe scatter usando a probabilidade do modo e da contagem atual. Se não receber scatter, sortear um dos dez símbolos pela distribuição abaixo, que soma 100%. Assim, a probabilidade do símbolo regular numa posição sorteada é `(1 - probabilidade_scatter_atual) × probabilidade_condicional`. Uma posição ocupada por uma cópia de par não recebe um novo sorteio independente.

Todos os pagamentos são múltiplos da aposta total, por grupo vencedor, antes dos multiplicadores dos wilds. A proposta usa a mesma distribuição e tabela em todos os modos e preenchimentos; as diferenças entre modos vêm dos scatters e da magia.

| Símbolo | Probabilidade condicional | 5 | 6–7 | 8–10 | 11–14 | 15–17 | 18+ | XP por posição do hit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N1 | 18% | 0,15× | 0,45× | 1,50× | 6,00× | 24,00× | 96,00× | 1,00 |
| N2 | 16% | 0,18× | 0,54× | 1,80× | 7,20× | 28,80× | 120,00× | 1,02 |
| N3 | 14% | 0,23× | 0,66× | 2,40× | 9,60× | 38,40× | 144,00× | 1,04 |
| N4 | 12% | 0,30× | 0,90× | 3,00× | 12,00× | 48,00× | 192,00× | 1,06 |
| N5 | 10% | 0,38× | 1,20× | 3,90× | 15,60× | 62,40× | 240,00× | 1,08 |
| P1 | 9% | 0,60× | 1,80× | 6,00× | 24,00× | 96,00× | 384,00× | 1,10 |
| P2 | 7% | 0,90× | 2,70× | 9,00× | 36,00× | 144,00× | 576,00× | 1,12 |
| P3 | 6% | 1,20× | 3,60× | 12,00× | 48,00× | 192,00× | 768,00× | 1,14 |
| P4 | 5% | 1,50× | 4,50× | 15,00× | 60,00× | 240,00× | 960,00× | 1,16 |
| P5 | 3% | 2,25× | 7,50× | 24,00× | 96,00× | 384,00× | 1440,00× | 1,18 |

Exemplo de XP: seis posições num hit de P3, incluindo os wilds usados, geram `6 × 1,14 = 6,84 XP`, independentemente do multiplicador monetário. O motor guarda XP e prémios normalizados em centésimos inteiros, acumula toda a jogada e arredonda por defeito apenas na liquidação para unidades de crédito.

#### Scatters por posição sorteada

| Scatter que se tenta gerar | Jogo base | Qualquer bónus |
| --- | --- | --- |
| Primeiro | 3,01% | 3,00% |
| Segundo | 2,01% | 1,20% |
| Terceiro | 0,655% | 0,30% |
| Quarto | 0,15% | 0% |
| Quinto | 0,04% | 0% |
| Após atingir o limite | 0% | 0% |

Estas são probabilidades locais, condicionadas pela contagem atual; não são a probabilidade final de entrar num bónus ou ganhar spins. As cascatas criam novas oportunidades de sorteio. Proposta: scatters não pagam um prémio monetário próprio, apenas ativam bónus ou atribuem spins adicionais.

#### Magia e escolha de posições

| Parâmetro | Proposta inicial |
| --- | --- |
| Limiar de XP no jogo base | 39 XP |
| Limiar no comum | 18,80 XP |
| Limiar no super | 17,10 XP |
| Limiar no secret | 16,50 XP |
| Magia base: lançar 1 wild | 50% |
| Magia base: lançar 2 wilds | 35% |
| Magia base: lançar 3 wilds | 15% |
| Wilds naturais no sorteio de símbolos | 0%; criados apenas pela magia |
| Posições da magia | Sorteio uniforme sem reposição entre símbolos regulares elegíveis |
| Vizinha de um par | Sorteio uniforme entre vizinhas ortogonais livres |
| Aplicação dos pares | Preenchimento inicial e entradas de cascatas; cópias não geram outras cópias |
| Ordem técnica de geração | Colunas da esquerda para a direita; posições livres de baixo para cima, após compactar as colunas |

A chance de tentar criar um par é de 52% (com 25% de tentar uma segunda cópia junto da primeira, sem recursão) para símbolos normais; a quantidade e o multiplicador dos wilds nos bónus seguem a progressão confirmada, sem sorteio adicional. Uma magia que encheu a barra ocorre sempre, não tem uma segunda probabilidade de ativação.

### Bonus Hunt

- Entrada `hunt`: custo de 4× a aposta base por jogada, debitado/registado uma única vez. Os pagamentos e MAX WIN de 10 000× continuam referidos à aposta base.
- Para aproximar o RTP da meta, o utilizador autorizou aumentar o fator de scatter de 1,53 para 1,94. O objetivo anterior de aproximadamente 3× entradas em bónus deixa de limitar este ajuste. Aplicar o fator a cada probabilidade de scatter por posição no spin base e em todas as suas cascatas, mantendo a dependência da contagem atual e o limite de cinco scatters. Arredondar à parte por milhão mais próxima e limitar a probabilidade a 100%. Não sortear diretamente uma probabilidade de entrada no bónus.

| Próximo scatter | Base normal | Bonus Hunt |
| --- | --- | --- |
| Primeiro | 3,01% | 5,8394% |
| Segundo | 2,01% | 3,8994% |
| Terceiro | 0,655% | 1,2707% |
| Quarto | 0,15% | 0,291% |
| Quinto | 0,04% | 0,0776% |
| Após cinco | 0% | 0% |

- São mantidos pagamentos, pesos condicionais dos símbolos, pares, XP, magia e gatilhos exatos de 3/4/5. Alterar a chance de scatter altera naturalmente a probabilidade absoluta de sair um símbolo regular, porque as probabilidades da posição continuam a somar 100%.
- O boost termina quando se entra num bónus; os free spins e retriggers usam as probabilidades normais do bónus obtido, sem custos adicionais.
- O pedido inicial «3× chance de obter bónus» referia-se à frequência agregada, atingida aproximadamente na versão anterior. A revisão atual favorece o RTP e gera uma frequência maior; ver o histórico de medição na formulação matemática. A frequência final tem incerteza estatística e não é uma garantia por sessão.

### Regras de fronteira confirmadas

- Ecrã exclusivamente com wilds e scatters: todos os casos recebem o mesmo pagamento base, igual ao símbolo mais caro no escalão 18+. No jogo base, isto abrange 25–30 wilds com zero a cinco scatters; no bónus, 27–30 wilds com zero a três scatters. Na tabela inicial proposta, corresponde a P5 / 18+, ou 1 440× a aposta antes dos multiplicadores. A regra confirmada referencia a tabela, não fixa os valores ainda propostos dessa tabela.
- Este resultado é um único prémio especial do ecrã, não dez prémios por substituição dos dez símbolos nem prémios separados pelos componentes que os scatters possam isolar. Aplicar a regra existente de somar os multiplicadores dos wilds participantes; sem multiplicadores, aplicar apenas o pagamento base. Os scatters não entram na quantidade de wilds, no multiplicador ou no XP do hit. Usar a raridade de P5 para o XP e retirar os wilds usados como num hit normal, salvo se o MAX WIN já tiver encerrado a jogada.
- A exceção acima inclui o caso confirmado de quatro ou cinco scatters no jogo base. Não cria pagamentos independentes para componentes só de wilds num tabuleiro que ainda tenha símbolos regulares.
- MAX WIN: o teto, o âmbito da jogada completa, o encerramento imediato e o ecrã «MAX WIN» estão confirmados nas regras acima. A implementação visual pertence às etapas posteriores; o motor deve emitir o evento e o resultado final sem depender da interface.

### Implementação e calibração pendente

1. Pares: vizinhas uniformes, sem recursão das cópias, no preenchimento inicial e cascatas; ordem de geração conforme a configuração acima. Gerar pares não garante grupos premiados.
2. Resolução do tabuleiro: o prémio especial de ecrã apenas com wilds e scatters e o tratamento de posições insuficientes para a magia estão confirmados acima; não há decisão pendente nestes dois casos.
3. XP: fórmula, tabela e limiares iniciais implementados acima e na formulação matemática; falta calibrar os valores. A origem do XP, a contagem dos wilds, a persistência por modo, o momento da magia e o descarte do excedente estão confirmados acima.
4. Bónus: os cinco valores de probabilidade de scatter no jogo base e os três no bónus estão implementados conforme as tabelas, sujeitos a calibração. A sequência de progressão, a ausência de teto de nível e o tratamento de posições insuficientes estão confirmados.
5. Matemática: calibrar probabilidades, pagamentos e preços das compras conforme a [formulação matemática](matematica.md). Faixas confirmadas: comum 80×–100×, super 200×–240× e secret 300× ou mais. O âmbito e o encerramento pelo prémio máximo de 10 000× estão confirmados.

### Estado da etapa

Motor independente da interface, tabelas, testes dirigidos, eventos e simulador implementados. O [guia de execução](README.md) documenta a API e comandos locais. O utilizador aceitou os parâmetros atuais e autorizou explicitamente a etapa 2; o [protótipo estrutural](02-prototipo-visual-estrutura.md) está ligado ao motor sem alterar a matemática. A validação estatística do RTP continua pendente e não é comprovada por essa aceitação.

## Orientações para a conversa

- Pedir ao utilizador a ideia inicial, caso ainda não a tenha apresentado. Se já a apresentou, partir dela sem pedir que a repita.
- Resumir o que foi entendido e, **depois da ideia inicial**, tomar a iniciativa de fazer perguntas concretas para desenvolver o conceito.
- Trabalhar um assunto de cada vez, com poucas perguntas por ronda. Evitar um questionário longo logo no início.
- Dar ideias próprias: apresentar duas ou três alternativas quando houver uma escolha relevante, recomendar uma e explicar o efeito na experiência e na matemática.
- Usar exemplos de jogadas para discutir regras. Identificar ambiguidades, conflitos, casos extremos e mecânicas que possam tornar-se pouco interessantes.
- Explicar termos como RTP, volatilidade e frequência de prémios em linguagem simples quando aparecerem.
- Distinguir ideias propostas, decisões confirmadas e questões em aberto. Não transformar silêncio em aprovação de uma mecânica.
- Resolver escolhas técnicas rotineiras autonomamente. Confirmar com o utilizador decisões que mudem a experiência ou as regras.
- Implementar, testar e simular partes já acordadas enquanto a conversa evolui; não inventar regras em falta para declarar o jogo concluído.

## Assuntos a decidir progressivamente

Abordar apenas o que for aplicável ao conceito:

- Grelha, rolos, símbolos e forma de pagar: linhas, ways, clusters ou outra.
- Valor da aposta, tabela de pagamentos, combinações e ordem de resolução dos prémios.
- Wilds, scatters, substituições, cascatas, multiplicadores e respetivos limites.
- Gatilhos de bónus, free spins, retriggers, persistência de estados e condições de saída.
- Compra de bónus ou outros modos, apenas se fizerem parte da ideia; custo e matemática próprios.
- RTP alvo, volatilidade desejada, frequência de prémios, frequência dos bónus e prémio máximo.
- O que constitui uma jogada completa, como se cobra a aposta e como se liquidam todos os prémios dessa jogada.
- Casos de fronteira: prémios simultâneos, acumulações, limites, arredondamentos e interrupções.

O tema artístico pode ficar para a terceira etapa. Aqui bastam identificadores de símbolos e descrições funcionais.

## Implementação e validação

- Criar um motor independente da apresentação, executável por testes e simulações, sem interface gráfica.
- Separar configuração de probabilidades e pagamentos das regras e das ferramentas de simulação, sem construir infraestrutura desnecessária.
- Permitir execuções reproduzíveis com seed e cenários controlados para verificar regras raras. Não confundir aleatoriedade de teste com uma solução adequada para produção com dinheiro real.
- Produzir resultados e eventos estruturados: grelha, combinações, prémios, transições e estado do bónus. A apresentação futura deve conseguir explicar o resultado sem voltar a sortear ou calcular prémios.
- Usar unidades e arredondamentos explícitos; evitar erros de saldo por ponto flutuante.
- Testar as regras acordadas, transições de estado e limites relevantes, incluindo ausência de cobrança duplicada e de pagamento duplicado.
- Executar simulações reproduzíveis para calibração e validação independente conforme a [formulação matemática](matematica.md). Probabilidades configuradas não comprovam um RTP; registar amostras, seeds, configuração, resultados e incerteza antes de afirmar validação.
- Contar os pagamentos de free spins e bónus na jogada paga que os originou. Modos comprados usam o seu custo efetivo e uma análise separada.
- Não ajustar probabilidades ao jogador, ao saldo ou aos resultados recentes para forçar um RTP. Alterações matemáticas devem ser explícitas e versionadas.
- Usar apenas créditos e dados locais nesta etapa. Não integrar carteiras reais nem publicar por iniciativa própria.

## Entrega e passagem à etapa seguinte

Manter no projeto uma especificação de regras e um registo curto de decisões, atualizados durante o trabalho. Registar a configuração matemática, comandos reais de execução e testes, resultados obtidos, limitações e questões pendentes. Não inventar comandos antes de existir a respetiva implementação.

A etapa fica pronta quando as regras e probabilidades estão decididas, o motor funciona, os testes relevantes passam e a validação independente sustenta o RTP pretendido nos quatro modos. O RTP permanece não validado enquanto esses resultados não existirem. Confirmar com o utilizador a passagem ao protótipo; não avançar automaticamente.

Para a próxima conversa, entregar este contexto persistido e o motor, juntamente com o [guia da etapa 2](02-prototipo-visual-estrutura.md). Um agente novo deve conseguir continuar sem acesso ao histórico da conversa.

A magia coloca no máximo seis wilds no tabuleiro, incluindo os que já existem. A quantidade por ativação cresce de dois até seis nos três bónus; o multiplicador continua a crescer pelas regras de super e secret. Wilds existentes e os seus multiplicadores são preservados. A revisão `sofia-xp-evolution-6-52-25-v2` usa duplicação vizinha de 52% e uma segunda tentativa de 25%; pagamentos ajustados por modo. Wilds não geram XP e a barra não acrescenta spins. A validação local de 100 000 apostas normais e 10 000 compras de cada bónus está no [relatório atual](rtp-evolution-validation.json): estimativas pontuais entre 96% e 99%, com sementes usadas no ajuste, sem comprovar essa faixa para o RTP real.

Na evolução atual de XP, wilds sobreviventes recebem o novo multiplicador da magia sem perder um multiplicador maior que já possuam. As melhorias pertencem ao bónus e reiniciam na próxima jogada. Cada bónus começa com 12 spins; XP não gera spins e wilds não geram XP. O pagamento mínimo de um hit é 0,25× a aposta (0,05 numa aposta de 0,20). MAX WIN: 10 000×.
