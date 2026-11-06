# Falésia: revisão da composição

6 de novembro de 2026. Implementação e validação locais; sem consulta de dados reais, publicação, commit ou push.

## Resultado

- Falésia costeira pintada de novo, ligada às margens esquerda e inferior. A composição por colunas conserva o cais e abre o céu sobre a encosta. Céu, costa, mar, rocha, personagem, objetos e decoração continuam separados; nenhum resultado está pintado no fundo.
- WEED em primeiro plano à esquerda, cerca de 30% de largura efetiva no desktop, oito poses, sem plataforma retangular. Recorte novamente tratado por ImageGen, sombra de contacto, iluminação por dificuldade e balão com ponta ancorada à cara. No retrato fica acima e à esquerda da entrada.
- Tabuleiro expandido entre o cabeçalho e o cais. Em 1920×1080 e 16 linhas, a bóia mede aproximadamente 24 px de largura, com argola, volume e sombra.
- Lanchas frontais com proporção vertical preservada, casco/consola escuros, tubos por valor, reflexos e placas acima das consolas. Mantida uma única fila de 9/13/17 destinos.
- Logótipo legível sobre a vegetação. Retirado o losango solto da Extrema. Pérgola junto do WEED; iluminação e céu variam sem mudar a geometria do percurso.
- AUTO, verificação e histórico das últimas 20 jogadas integrados nos controlos. O histórico mostra resultados locais reais e permite deslocação horizontal dentro da faixa. Corrigida também a largura intermédia de tablet.

## Entrega visual

[Comparação Média / referência](comparacao-media.png), [maqueta Média](maqueta-media.png) e [vídeo de 20 segundos](jogo-20s.mp4).

As capturas `depois-LARGURA-DIFICULDADE.png` cobrem Baixa, Média, Alta e Extrema em 1920×1080, 1366×768, 390×844 e 320×740. [Medições e matriz de linhas](depois-results.json). [Movimento reduzido](reduced-390.png).

Materiais promocionais atualizados em [promo](../../promo/): capa, queda MP4 e dois GIFs. [Fontes e prompts](PROMPTS-ARTE.md).

## Validação

- `npm.cmd test --prefix games/ganza`: seis testes passaram, incluindo matemática, determinismo, carteira local e recuperação.
- `node games/ganza/tests/browser.mjs`: jogadas, bloqueio de configuração, recuperação, autoplay, movimento reduzido e dez placas simultâneas nos quatro tamanhos.
- `node games/ganza/tests/final.mjs`: teclado, autoplay, rejeição de aposta fracionária, diálogos, áudio e saldo grande.
- `node games/ganza/tests/website.mjs`: casino em fixtures, desktop/tablet/retrato/paisagem, controlos dentro do iframe, jogada e conferência da prova. A primeira execução detetou overflow no tablet; corrigido e repetido com sucesso.
- `node games/ganza/scripts/falesia-v2-review.mjs`: 16 capturas, 8/12/16 linhas nas quatro dificuldades, etiquetas sem cortes, histórico presente, bóias acima de 14 px em 1920, sem erros de consola e movimento reduzido.
- `node games/ganza/tests/visual.mjs`: posições laterais, etiquetas, probabilidades exatas, desempenho e destino da placa. O teste antigo que exigia WEED acima do tabuleiro no desktop foi atualizado para o contrato lateral.
- `npm.cmd run build:casino`: passou. Os bloqueios de criação de processos do sandbox foram resolvidos com execução autorizada fora dele.
- `npm.cmd run test:docs`: verificação documental executada após esta atualização.

## Diferenças que permanecem

A referência é um estudo com oito filas e sem controlos. A captura principal conserva as 16 filas selecionadas pelo jogo; a densidade é maior e a vila ocupa menos largura. No telemóvel de 320 px as placas de valor são verticais para manter uma só fila. O WEED continua a usar oito poses pintadas com transições e movimento procedural; não é animação redesenhada fotograma a fotograma. O sombreado noturno da rocha e personagem é uma transformação cromática da mesma pintura. Não foi realizado teste num aparelho físico nem certificação de desempenho em hardware externo.

Motor, tabelas, carteira, provas, Functions e Firebase preservados. As fotografias pessoais não entram na build. A publicação não foi executada.
