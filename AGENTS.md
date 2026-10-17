# Instruções do projeto

## Direção de arte e qualidade da interface

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

## Critério de conclusão para alterações visuais

- Inspecionar a interface renderizada, além de ler o código. Para alterações relevantes de layout, verificar pelo menos um desktop e um telemóvel; quando houver grelhas, formulários ou grupos de ações, incluir larguras de 320/390 px e uma intermédia próxima de 768 px, conforme os testes disponíveis.
- Confirmar que não existem sobreposições, texto cortado, labels encostados, botões sem separação, valores desalinhados ou overflow horizontal da página. Verificar também painéis expandidos, nomes e números longos e estados vazios/carregamento/erro aplicáveis.
- Verificar foco visível, operação por teclado e redução de movimento nas interações alteradas. Capturar imagens quando ajudarem a avaliar composição e espaçamento; deixar animações estabilizarem antes de avaliar a imagem.
- Corrigir os problemas encontrados antes de declarar a interface concluída. Se não for possível validar visualmente, indicar essa limitação na resposta final, sem afirmar que o resultado foi verificado.
- Implementar a solução nos componentes e regras existentes sempre que possível. Evitar acumular overrides contraditórios no fim das folhas de estilo; consolidar as regras afetadas e manter o âmbito da alteração claro.

## Indicação de deploy nas respostas

- Terminar sempre cada resposta final com uma indicação curta, em português, de como fazer o deploy mais rápido adequado às alterações discutidas ou realizadas.
- Se não houver alterações que precisem de publicação, terminar com: **Deploy:** não é necessário.
- Para alterações apenas no frontend (HTML, CSS, JavaScript do navegador e assets), indicar `npm run deploy:frontend`.
- Para alterações no servidor, identificar todas as funções afetadas, incluindo as que importam módulos partilhados alterados, e indicar um deploy seletivo: `npx firebase deploy --only functions:peladinhas:NOME`. Para várias funções, separar os seletores por vírgulas dentro de aspas.
- Para alterações às regras ou índices, indicar apenas os seletores necessários: `firestore:rules`, `firestore:indexes` ou `storage`. Combinar seletores quando necessário.
- Quando frontend e backend mudarem, indicar ambos os passos necessários. Não recomendar apenas frontend se existirem alterações de backend ainda por publicar no âmbito do trabalho.
- Consultar a configuração e os scripts atuais antes de indicar comandos. Não recomendar deploy completo por defeito; `deploy:backend` publica todas as funções e as regras, e `deploy` publica todas as áreas.
- Esta indicação é uma instrução para o utilizador, não uma autorização para executar um deploy. Não afirmar que uma alteração foi publicada sem confirmação da execução.
- Usa sempre npm.cmd e npx.cmd
