# Revisão visual 2 — Futebol de Bairro

Implementação de 24/10/2026. Mantém a matemática 0.3.1 e o estado das sessões.

- Fontes locais: Barlow Condensed para interface e Oxanium para números e destaques.
- Consola inferior com módulos recortados, compras ilustradas e botão SPIN com aros próprios; adaptações para telemóvel e orientação horizontal.
- Regras com imagens, ordem do mais comum ao mais raro, probabilidades por posição livre e pagamentos por linha de 3, 4, 5 e 6 símbolos. Três tabelas refletem os fatores efetivos de cada modo. Consultar uma tabela não muda a sessão.
- Seis faixas verticais animadas com Web Animations API; começam juntas e param por coluna. Wilds já fixos permanecem ancorados.
- P1 Talento de Bronze, P2 Velocidade de Prata, P3 Maestro de Ouro e P4 Lenda da Final são quatro cartas de jogadores originais, com retratos, poses, molduras e cores diferentes. Raridade crescente acompanha bronze → prata → ouro → violeta.
- Símbolos sem letras, números, títulos de hover ou rótulos sobrepostos. As descrições acessíveis continuam disponíveis. Poderes usam emblemas geométricos.
- Novo WILD largo, com estrela e moldura douradas; novo Scatter com bilhete e bola maiores. Seis PNG originais com transparência, sem processamento destrutivo.
- Aquisição de sticky com flash, ancoragem e aura dourada persistente; sobrevive à recarga da sessão.
- Roubo visível por feixe e energia do premium para o Wild, mensagem fora do tabuleiro, impacto nos alvos e emblema persistente. P4 envia energia ao multiplicador global à esquerda. Velocidades rápidas encurtam os efeitos; a preferência de movimento reduzido simplifica-os.
- Compra de bónus apresenta um spin de ativação com três ou quatro scatters antes do primeiro FS. Esta cerimónia é decorativa: não constitui uma ronda base sorteada, não paga e não avança o RNG. O primeiro FS é confirmado uma única vez antes da apresentação.
- Depois de dois scatters revelados, a próxima coluna recebe brilho e abrandamento. Com três, continua a procurar o quarto no jogo base. Na cerimónia normal termina a procura ao terceiro.

Os efeitos são animações de código sobre PNGs, não GIFs nem personagens articuladas. Áudio e rigs continuam pendentes. O botão CONCLUIR revela o resultado confirmado sem alterar saldo, RNG ou pagamentos.

Assets ativos em `public/assets/football/symbols/`: `p1-player-v2.png`, `p2-player-v2.png`, `p3-player-v2.png`, `p4-player-v2.png`, `w-player-v2.png` e `s-ticket-v2.png`. Os quatro normais e o cenário anteriores permanecem ativos. Os seis masters substituídos estão preservados.

Prompts exatos e origens: [PROMPTS_SIMBOLOS_V2.json](PROMPTS_SIMBOLOS_V2.json). Inventário: [manifest.json](manifest.json). Implementação dos efeitos: [ANIMACOES_V2.md](ANIMACOES_V2.md).

Verificação automatizada em `e2e/visual-v2.spec.ts`: faixas realmente em movimento, suspense com velocidade reduzida, cerimónia sem spin pago adicional, aquisição e persistência sticky, energia de roubo, emblemas, posição do global e regras ilustradas. Capturas em `test-results/v2-*.png` são geradas pela execução dos testes.

## Ajuste 2.1 ? WILD e an?ncio de poderes

Por prefer?ncia do utilizador, o WILD ativo regressa a `w-player.png`, com a palavra **WILD** na placa dourada, desenhada como texto n?tido da interface. ? a exce??o expl?cita ? regra anterior de s?mbolos sem texto; os restantes continuam sem r?tulos nem hover. O master `w-player-v2.png` fica preservado como alternativa inativa.

Cada roubo apresenta uma faixa animada sobre o tabuleiro, com a carta do jogador, o nome do poder e a sua consequ?ncia. Toque de Classe usa emblema de multiplica??o e fa?scas bronze; Arranque Explosivo usa rastos de velocidade azuis; Passes de Maestro usa cartas em leque douradas; Gl?ria do Bairro usa coroa, raios e brilho violeta. A faixa acompanha a energia e os impactos nos s?mbolos. Dura 1,5 s em normal, 1,05 s em r?pido e 0,7 s em super; movimento reduzido usa apresenta??o est?tica de 0,75 s. CONCLUIR e mudar de separador limpam a apresenta??o.

O tabuleiro de computador mant?m a largura e as propor??es da revis?o 2, com aproximadamente 10% mais altura por c?lula em 1280 ? 720: ligeira redu??o dos espa?os do cabe?alho, mensagens e consola. Mant?m quatro filas, seis colunas e todos os controlos dentro do ecr?. A arte mant?m as propor??es, sem esticar rostos.

Prefer?ncia posterior: Scatter original `s-ticket.png` restaurado. A composi??o larga do tabuleiro ? limitada a uma propor??o de refer?ncia pr?xima de 3,05:1 para evitar que janelas altas estiquem excessivamente as c?lulas. Os normais ficam ligeiramente menores que cartas premium, WILD e Scatter.

Corre??o posterior: removido o limite de propor??o 3,05:1. Reposto o dimensionamento fluido original, com acr?scimo de 10% calculado sobre a altura original do tabuleiro, usando espa?o das linhas de estado e mensagem. Em ecr?s sem espa?o, o acr?scimo ? limitado para preservar a leitura. Scatter recebe a palavra SCATTER na faixa do bilhete; WILD e SCATTER s?o as exce??es expl?citas aos s?mbolos sem texto.
