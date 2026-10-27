# Qualidade da interface

[Instruções de desenvolvimento](../../AGENTS.md)

Consultar apenas as partes relevantes para a interface alterada. Para correções locais, reutilizar o componente existente. Estudar as referências de composição em desenhos novos ou reformulações relevantes. A extensão dos testes segue a matriz de risco do AGENTS.md.

## Direção de arte e qualidade da interface

- Não colocar títulos, nomes de edição, nomes de tier ou rótulos como «THE ULTIMATE» e «V2» no topo nem no interior das cartas. O nome da edição pertence ao catálogo ou à ficha, fora da carta. Dentro da carta, preservar a identidade do jogador, OVR, posição, atributos e símbolos gráficos. O tier deve reconhecer-se pelo desenho, materiais e acabamento, sem títulos acrescentados.

- Tratar cada alteração de interface como trabalho de produto e direção de arte. Entregar uma composição intencional, reconhecível como Peladinhas Cards, com hierarquia, acabamento e comportamento completos; cumprir a funcionalidade não basta para considerar a interface pronta.
- Antes de desenhar, estudar a implementação atual do bloco de instalação da APP (`installSpotlight` em `js/pwa.js`, estilos `.install-*` em `css/experience.css`) e do ecrã de entrada (`.auth-*` e respetiva composição). São referências de qualidade: tipografia expressiva, contraste controlado, ilustração integrada, profundidade, movimento e ações claras. Confirmar os ficheiros atuais por pesquisa se estas referências mudarem.
- Transportar esse cuidado para novas áreas sem copiar mecanicamente o telefone, as órbitas ou o mesmo cartão. Criar soluções próprias para o conteúdo: resultados com presença, progresso legível, comparações claras, recompensas com identidade e estados vazios que orientem a próxima ação. As páginas de gestão exigem o mesmo acabamento, adaptado à densidade de trabalho.
- Definir primeiro o foco da página, a informação indispensável e a ação principal. Construir a composição em torno disso, com uma leitura evidente entre título, conteúdo, estado e ações. Preferir texto curto e concreto; usar divulgação progressiva para detalhes secundários.
- Usar escala tipográfica, alinhamentos, proporções, cor e espaço para criar hierarquia. Não resolver todas as secções com uma grelha de painéis idênticos. Evitar decoração sem função, excesso de molduras, sombras e gradientes concorrentes, ou blocos promocionais grandes em tarefas operacionais.
- Respeitar os tokens, temas e componentes existentes. Explorar a identidade desportiva e das cartas com escolhas visuais específicas, sem introduzir uma linguagem gráfica diferente em cada página. Manter contraste e legibilidade nos temas suportados; cor nunca deve ser o único sinal de estado.
- Escolher ícones que expliquem ações e distingam modalidades, mantendo o mesmo sistema visual. Não reutilizar um ícone genérico para conceitos diferentes quando isso dificulta a leitura. Ações só com ícone precisam de nome acessível.

## Movimento e interação

- Desenhar o comportamento juntamente com o aspeto: estados normal, hover, foco por teclado, pressionado, desativado, carregamento, sucesso e erro, conforme se apliquem. O utilizador deve perceber imediatamente o que pode fazer e o resultado da ação.
- Usar animações para orientar a atenção, explicar mudanças e dar personalidade. Microinterações costumam funcionar entre 120–220 ms; entradas e expansões entre 200–400 ms. Estes valores são referências, não motivos para contrariar um componente existente bem resolvido.
- Reservar movimento contínuo para ilustrações ou momentos de destaque, discreto e sem competir com formulários, tabelas ou leitura. Não animar todas as linhas nem repetir entradas a cada atualização de dados. Não atrasar ações para terminar uma animação.
- Preferir `transform` e `opacity`, evitar alterações de layout durante animações e reservar as dimensões de conteúdo assíncrono. Respeitar `prefers-reduced-motion`, mantendo conteúdo e controlos imediatamente disponíveis quando o movimento é reduzido.
- Não acrescentar bibliotecas de animação para efeitos simples já possíveis com CSS ou APIs existentes.

## Espaçamento, formulários e densidade

- Nunca deixar botões, labels, valores ou secções visualmente colados. Usar uma escala consistente, normalmente baseada em 4/8 px, e declarar espaçamentos no contentor com `gap` sempre que possível.
- Como ponto de partida, reservar 6–8 px entre label e campo, 8–12 px entre controlos da mesma ação, 16–24 px entre grupos de campos e 24–32 px entre secções. Ajustar pela hierarquia e pelo espaço disponível, preservando sempre uma separação percetível.
- Dar espaço interno suficiente a botões e campos; procurar alvos táteis de pelo menos 44 × 44 px. Separar ações destrutivas das ações principais por posição, estilo e espaço. Evitar filas de botões pequenos difíceis de tocar.
- Manter labels junto dos respetivos campos, sem ambiguidades de associação. Reservar espaço próprio para ajuda, unidades, validação e erros; nunca sobrepor texto ao controlo nem usar placeholder como único label.
- Nos grupos de ações, manter alinhamento horizontal quando couber. Em ecrãs estreitos, escolher conscientemente entre quebra, empilhamento e deslocação local, preservando a ordem e a descoberta das ações. Nunca cortar ações nem provocar deslocação horizontal da página inteira.
- Dimensionar a informação para os valores reais: nomes longos, acentos, emojis, datas, números máximos e casas decimais com vírgula. Reservar largura para números e unidades; usar algarismos tabulares em resultados e avaliações para evitar saltos de alinhamento.
- Evitar larguras mínimas e somas fixas de colunas que ultrapassem o contentor. Usar `minmax(0, 1fr)`, `min-width: 0`, quebra de texto e adaptação por contentor quando adequado. Não esconder overflow para disfarçar conteúdo cortado.
- Compactar removendo redundância, reduzindo decoração e recolhendo detalhes. Não obter densidade à custa de fontes minúsculas, alvos táteis reduzidos ou desaparecimento de espaço entre elementos. Não criar grandes áreas vazias em redor de informação pequena.

## Composição das missões dos percursos

- Identificar o objetivo de uma tentativa por «A tua missão · No próximo jogo»; em tentativas congeladas, deixar claro que a escolha já foi associada ao jogo.
- Preferir um bloco compacto com o tema da raridade: contexto do nó no cabeçalho, objetivo evidente e progresso/avanço/recompensa numa faixa de apoio. Evitar saltos excessivos de tamanho tipográfico e painéis laterais só para números.
- Incorporar a recompensa à frente de «Recompensa do nó», sem caixa própria. O valor e o atributo (por exemplo, «+1 Drible») usam a mesma cor, fonte, peso e tamanho. Preservar a distinção entre avanço percentual e pontos de atributo.
- Preservar o aviso «Se falhares» com ícone e destaque vermelho e o aviso com ícone de informação sobre poder mudar até à abertura do jogo. Não remover regras de comportamento ao compactar a interface.
- No resumo de Missões/início, mostrar o detalhe da tentativa apenas quando há uma missão preparada ou pendente; sem escolha, manter a apresentação simples. A ligação deve abrir o nó da missão apresentada.
