# GANZÁ, entrega local

## Visual Falésia

O [novo pedido](PROMPT-NOVO-VISUAL.md) substitui a apresentação descrita abaixo: falésia alaranjada independente, bóias suspensas, placa verde com cordel, lanchas de tubo colorido e quatro ambientes. [Entrega, capturas, vídeo e limitações](revisao/falesia/DEPOIS.md). Os parágrafos seguintes documentam as etapas anteriores.

## Correção visual LoFi pastel

O contrato [PROMPT-CORRECAO-VISUAL.md](PROMPT-CORRECAO-VISUAL.md) foi executado em 6 de novembro. Esta revisão substitui as descrições visuais anteriores: cena contínua, sem creme nem triângulo opaco, WEED sentado no terraço, oito poses pintadas num ciclo de 20 segundos, uma fila de lanchas e interface de zellige/latão sobre tecido escuro. Motor, tabelas, carteira e provas não foram alterados.

Ver [DEPOIS.md](revisao/correcao-visual/DEPOIS.md) para validação, diferenças restantes e acesso às 16 comparações, recorte alpha e vídeo. A medição dirigida em 1920×1080 com dez bolas simultâneas foi **59,999 FPS**, WebGL e qualidade completa, sem erros JS. As capturas e testes em telemóvel são emulação local, sem teste num aparelho físico. GIFs, MP4 e capa foram substituídos pela nova apresentação. A música final continua a cargo do dono.

## Integração no website e telemóvel, 6 de novembro de 2026

Build completa `npm.cmd run build:casino` concluída. GANZÁ disponível no catálogo do website de testes; abrir com `npm.cmd run dev:casino` e visitar `http://localhost:8081/#/casino`. Corrigida a altura do iframe para o espaço real sob o menu. O modo horizontal compacto mantém saída, saldo e controlos; os prémios ficam legíveis. O servidor de testes serve OGG e TTF com os tipos corretos.

O teste [website.mjs](tests/website.mjs) passou em 320×740, 390×844, 768×1024, 1366×768 e 844×390: sem overflow horizontal, sem scroll interno, controlos e iframe dentro do ecrã, uma aposta na carteira local e prova de resultado válida. Resultados e FPS do browser em [website-results.json](revisao/website-results.json), capturas `revisao/website-*.png`. Foi usado Edge headless com fixtures locais e origens externas bloqueadas; não é uma medição num telemóvel físico.

As cinco prompts prontas a copiar estão em [PROMPT-MUSICA.md](docs/PROMPT-MUSICA.md): base, atividade, prémio alto e duas vinhetas. A música final aguarda os ficheiros gerados pelo dono. Não houve deploy nem acesso ao Firebase real.

6 de novembro de 2026. **Jogo integrado e validado localmente**, pronto para a revisão final do dono. Sem publicação. A direção LoFi e as alterações posteriores substituem o Pop Art do contrato inicial. Ver [decisões](DECISOES.md).

## 1. Trabalho por fase

| Fase | Entrega |
| --- | --- |
| 1, motor e matemática | Motor puro e determinístico, percurso binomial antes da animação, 12 tabelas inteiras em ganza-v2, enumeração exata, testes e simulador. A versão anterior fica disponível para provas antigas. |
| 2, direção de arte | Estudos LoFi, fotografias indicadas usadas como referência direta do rosto e quatro ambientes progressivos. A instrução final do dono autorizou a conclusão com os materiais existentes. [Style frame final](revisao/style-frame-final.png). |
| 3, jogo jogável | Aposta, linhas, quatro volatilidades, lançamento com botão e Espaço, até dez bolas, autoplay com limites, histórico de 20 resultados, probabilidades e prova da jogada. |
| 4, arte e animação | Plinko em primeiro plano, bola castanha-clara, quatro cenários, pinos com resposta ao contacto, lanchas e ondas animadas, partículas e celebrações com salto. WEED PNG transparente, ciclo de 20 segundos, 24 poses geradas e 480 frames interpolados a 24 fps. Atlas carregados por segmentos. Composição WebGL com fallback Canvas e qualidade adaptativa. |
| 5, som | 44 composições em OGG e MP3, quatro variações por família, fontes CC0, panorama, reverberação curta, limitação de vozes e picos, ducking e volumes separados. Motor marítimo composto. Três guias musicais provisórios sincronizados e suporte a stingers finais. [Inventário e licenças](ASSETS.md). |
| 6, polimento e testes | Quatro viewports, destinos visuais, celebrações, teclado, autoplay, movimento reduzido, saldo grande, recuperação, carteira partilhada e recibos. Build local preparada e capa do catálogo atualizada. |
| 7, música | [Prompts completos em inglês](docs/PROMPT-MUSICA.md), 80 BPM, Ré menor, oito compassos e 24 segundos por camada, mais stingers, nomes de ficheiros e plano B. Música final a produzir pelo dono. |

A carteira usa o caminho local da Princesa Sofia. Cada aposta é debitada no start e o resultado guardado é creditado no settle, após a queda. Saldo, pendência e recibo ficam na mesma transação estrita de IndexedDB. O histórico do casino identifica GANZÁ. A escala é 100 cêntimos por DJC, com apostas públicas inteiras de 1 a 10 000 DJC para preservar o RTP perante o arredondamento monetário.

## 2. Testes e resultados

- `npm.cmd test --prefix games/ganza`, seis testes passaram. Cobrem binomial enumerada, simetria, RTP, máximo, determinismo, inteiros, independência, conversão DJC, débito, compromisso, recuperação e rejeição de pedidos inválidos.
- `node games/ganza/tests/integration.mjs`, passou com fixtures e IndexedDB locais. Repetir start ou settle não duplica dinheiro, payload divergente com o mesmo ID falha, reload recupera a mesma bola sem seed antecipada, saldo e histórico conferem e o iframe real apresenta e verifica a prova. [Resultados](revisao/wallet-results.json).
- `node games/ganza/tests/browser.mjs`, passou nos quatro tamanhos, uma bola e dez simultâneas, destino correspondente ao motor, configuração bloqueada em voo, prémio máximo saltável, autoplay com limite e recarga durante a queda. Sem erros JS, scroll ou controlos fora do ecrã. [Resultados](revisao/browser-results.json).
- `node games/ganza/tests/final.mjs`, passou. Espaço lança, mas não lança bolas manuais durante autoplay. Aposta fracionária é rejeitada sem débito. Escape fecha o dialog. Os 44 efeitos descodificam, as três camadas usam o mesmo instante inicial e o contexto de áudio arranca com gesto. Saldo de 10 mil milhões de DJC cabe no cabeçalho de 320 px. [Resultados](revisao/final-results.json).
- Regressão da carteira existente: 13 testes de casino e sessão passaram, e o teste de carteira local passou os cenários de checkpoints, resposta perdida, falta de espaço, saída offline e separadores exclusivos.
- `node scripts/build-casino-ganza.mjs`, passou. A montagem foi testada com os ficheiros de assets gerados. `npm.cmd run test:docs` passou, além da revisão das ligações desta pasta. A build não comprova deploy.
- GIFs e MP4 verificados por Pillow e ffprobe. [Metadados](revisao/media-results.json). MP4 com H.264 e AAC, 1280 × 720. As gravações têm 12 fps de exportação, diferentes da taxa de renderização do jogo.

### Ecrãs e desempenho

Medição local em Edge headless, com menu descontado da altura disponível. As larguras de telemóvel são emulação no computador, não um aparelho físico.

| Janela | Menu | FPS com dez bolas | Destinos visuais |
| --- | --- | --- | --- |
| 1920 × 1080 | 86 px | 60.00 | corresponderam ao motor |
| 1366 × 768 | 86 px | 59.99 | corresponderam ao motor |
| 390 × 844 | 70 px | 59.98 | corresponderam ao motor |
| 320 × 740 | 70 px | 60.00 | corresponderam ao motor |

Foram inspecionadas as capturas de [320 px](revisao/jogo-320.png) e [1366 px](revisao/jogo-1366.png), o recorte e fumo da personagem e os momentos de resultado. As lanchas alternam a altura das etiquetas para permitir ler os 17 valores a 320 px. Não há flashes globais, tremores ou desalinhamento de impressão. Movimento reduzido fixa a personagem e remove partículas e movimento decorativo, mantendo a queda legível.

### RTP

Seed `validacao-ganza-v2-20261106`, versão `ganza-v2`, **1 000 000 de bolas por tabela, 12 milhões no total**, usando o mesmo motor do jogo. Os intervalos de 95% são aproximações normais, particularmente largos na Extrema. O RTP exato vem da enumeração, não da amostra. [JSON com frequências, desvio padrão e máximos](relatorios/simulacao.json), [CSV](relatorios/simulacao.csv).

| Linhas | Volatilidade | RTP exato % | RTP simulado % | IC95% % |
| --- | --- | --- | --- | --- |
| 8 | Baixa | 99.000000 | 98.8579 | 98.5417 a 99.1741 |
| 8 | Média | 99.000000 | 98.8751 | 98.2995 a 99.4507 |
| 8 | Alta | 99.000000 | 99.5937 | 98.4861 a 100.7013 |
| 8 | Extrema | 99.000000 | 98.8359 | 97.1163 a 100.5555 |
| 12 | Baixa | 99.000488 | 98.9410 | 98.7269 a 99.1552 |
| 12 | Média | 99.000000 | 99.2531 | 98.6767 a 99.8294 |
| 12 | Alta | 98.999512 | 99.1626 | 98.0404 a 100.2847 |
| 12 | Extrema | 99.001953 | 103.4543 | 98.8936 a 108.0150 |
| 16 | Baixa | 99.002258 | 99.1452 | 98.9660 a 99.3244 |
| 16 | Média | 99.004089 | 99.2091 | 98.7486 a 99.6696 |
| 16 | Alta | 99.002106 | 98.6723 | 98.0002 a 99.3444 |
| 16 | Extrema | 98.997925 | 96.4594 | 85.4739 a 107.4448 |

## 3. Revisão final do dono

O jogo foi concluído pela autorização de terminar com os materiais existentes. Permanecem para a tua apreciação estética o estilo LoFi integrado, o rosto e ciclo do WEED, a intensidade dos quatro ambientes e a mistura sonora. Isto não é uma aprovação visual tua presumida. As escolhas estão em [DECISOES.md](DECISOES.md), e há um [vídeo de 20 segundos](revisao/momentos-principais.mp4).

## 4. Limites e pendências externas

- Falta a música final que o contrato atribui ao dono. Os guias provisórios estão explicitamente identificados na configuração e inventário.
- Não houve teste num telemóvel físico nem revisão auditiva do dono. A descodificação, sincronização e controlos sonoros foram testados localmente.
- As reações do WEED são visuais, sem uma voz emprestada ou inventada. O cameo policial era opcional e foi omitido para preservar a direção LoFi.
- Carteira local para créditos fictícios, com as limitações de autoridade local descritas na [integração](INTEGRACAO.md). Não houve consulta ou escrita de dados reais do Firebase.
- Esta tarefa não escreveu em functions/. Existem alterações nesse diretório no working tree, fora das escritas desta tarefa, que foram preservadas. Não houve commit, push ou deploy.

## 5. Música e ficheiros para o grupo

- [Prompt da música, cinco partes e plano B](docs/PROMPT-MUSICA.md).
- [Queda GIF](promo/queda.gif), 6 segundos, 720 × 405, loop com transição de fecho.
- [Queda MP4 com som](promo/queda.mp4), 6 segundos, 1280 × 720.
- [Carga completa GIF](promo/carga-completa.gif), 11 segundos, 720 × 405.
- [Capa final](promo/capa.webp), também copiada para assets/casino/covers/ganza.webp no site.
- [WEED PNG e materiais de origem](revisao/weed-png-v2/README.md), integrados nos atlas do jogo.

## Abrir e publicar

Na raiz, `npm.cmd run dev --prefix games/ganza`, depois abrir `http://127.0.0.1:4186/games/ganza/game.html`. Não abrir o ficheiro diretamente com file://, porque os módulos precisam de servidor HTTP.

Publicação futura, apenas quando o dono decidir: `.\deploy.ps1`. Esse comando não foi executado e pode incluir pendências de outras conversas.

## Revisão da composição Falésia

A [revisão Falésia](revisao/falesia-v2/DEPOIS.md) corrige a costa, a escala e posição lateral do WEED, bóias, proporções das lanchas e integração do histórico nos controlos. Substitui a descrição de personagem pequena no topo. Inclui comparação, 16 capturas e vídeo de 20 segundos; validação local, sem publicação.
