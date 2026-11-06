# Próxima conversa — revisão dos efeitos e músicas Acidwave

## Atualização posterior, 05-11-2026

**Músicas entregues e integradas:** os cinco MP3 do dono estão em ui/audio/music, com [manifesto](ui/audio/music/manifest.json). O dono pediu transições sempre suaves. [Leitor musical](ui/music-player.js) e [preparação dos loops](ui/music-loop.js) fazem crossfades de potência constante de 2 segundos, preservando a faixa anterior durante a carga. Não reiniciar música por spin, nem mudar afinação/velocidade no Turbo. Laboratório inclui seletor dos cinco modos e volume musical. Ler [sons](docs/sons.md) para pontos de loop, testes e limitações. Os MP3 originais mantêm-se intactos. Antes de publicação futura, ainda faltam loops comprimidos de entrega separados das fontes e teste em aparelhos reais. Não houve deploy. Esta atualização substitui as referências a músicas pendentes no histórico abaixo.

**Revisão mais recente:** o dono rejeitou os sons demasiado iguais. A primeira paleta foi substituída, mantendo os 62 IDs, por composições explícitas com fontes de vidro, metal, madeira, corda, ar, mecanismos, bolhas, bateria e cortes digitais. Cada fusão tem uma sequência própria. O laboratório tem agora Comparar personagens e Comparar fusões. Manifesto de efeitos versão 2. A nova paleta ainda precisa de aprovação auditiva do dono, os testes técnicos não a comprovam.

O dono aprovou que o agente escolha a direção sonora, recusou vozes e decidiu gerar as músicas pessoalmente no Suno com os prompts recebidos. Autorizou entretanto os efeitos de todo o jogo. Primeira versão de 62 efeitos sintetizados localmente, integrada em [fx-audio](ui/fx-audio.js), [barramento](ui/audio-bus.js) e [catálogo](ui/audio-catalog.js). Existem WAV e [manifesto](ui/audio/sfx/manifest.json), [gerador](scripts/synthesize-sfx.js), [laboratório](audio-lab.html) e testes. Detalhes e limitações atuais em [sons](docs/sons.md), que prevalece sobre o estado histórico abaixo.

Passaram testes dirigidos e Edge local, incluindo AFTERPARTY completo em Normal e Turbo. Não houve escuta humana pelo agente, medição LUFS/true peak nem teste Safari/iPhone físico. Não há músicas carregadas nem transições musicais. O dono deve rever os efeitos e entregar as músicas. Uma versão por efeito, sem pipeline de candidatos/guardar escolhas. Nenhuma mudança de matemática, cloud, commit ou deploy. Não voltar a perguntar se quer vozes nem gerar músicas por iniciativa própria.

## Passagem anterior, para contexto

Estado de passagem em 05-11-2026. O dono pediu preparar a fase de som e música, com prompts para gerar as músicas, e conversar sobre a direção antes de produzir. Não começar outra revisão visual nem reconstruir o jogo.

## Ler primeiro

1. [AGENTS.md](AGENTS.md) e [guia do projeto](GUIA-DO-PROJETO.md).
2. [Plano sonoro e cinco prompts](docs/sons.md), preparado nesta conversa.
3. [Guia de som existente](guides/4-SOM-E-MUSICA.md), [eventos](docs/eventos.md), [interface](docs/estrutura-ui.md) e [animações](docs/visuais-animacoes.md).
4. [Tema Acidwave](docs/TEMA.md), usando os nomes atuais abaixo quando o histórico visual mostrar nomes antigos.

## Estado real

- Motor atual pp-v7. Não alterar matemática, tabelas numéricas, RNG, pagamentos, carteira ou sessão para fazer som. A integração com o casino real continua fora do âmbito.
- [fx-audio.js](ui/fx-audio.js) ainda é um stub sem som. Recebe eventos, mudanças de modo, volumes e desbloqueio. Não existe barramento de áudio, música, SFX ou página de audição implementados.
- O [Guia 4](guides/4-SOM-E-MUSICA.md) é o plano existente. O [plano sonoro](docs/sons.md) acrescenta os 29 tipos de evento, as dez fusões, interface, proposta de paleta e prompts completos por modo.
- O dono quer os prompts das músicas. Primeiro discutir gosto, BPM, vozes e ferramenta, depois receber as faixas ou uma instrução explícita para as gerar. Não presumir uma chave, conta ou serviço pago. Nenhum segredo foi lido.
- Músicas propostas: base e MAIS SCATTERS 126 BPM, AFTERPARTY 128, VIP 132, POLICE PARTY 138, Ré menor. São propostas para discutir, não aprovações nem assets existentes.

## Contratos atuais da apresentação

- Identidade Acidwave, títulos Rubik Glitch e textos de interface Oxanium. Manrope continua em alguns textos extensos da ajuda.
- Símbolos aprovados: N1 Bob Joint, N2 Copo de shot, N3 Cope Cannister (botija de Copium), N4 Pastilha vermelha «Move», N5 Selo colorido. Scatter é o Passe da Afterparty amarelo com a palavra Scatter em vermelho.
- O símbolo DW chama-se apenas Joiner. É um wild que multiplica o multiplicador do grupo. Não escrever Distintivo ou JOINER WILD nos textos novos. Os identificadores internos antigos mantêm-se por compatibilidade.
- 3 Scatters no bónus dão +5 rodadas grátis, até ao limite configurado. Dois não dão retrigger. Não mudar essa regra como parte do áudio.
- Normal 1×, Rápido 2×, Turbo 3,75×. Não acelerar a música nem mudar-lhe a afinação. Limitar sons repetitivos no Turbo.
- Introdução com seis cenas, espera real de 1,5 segundos antes de CONTINUAR, JOGAR no fim e opção de não repetir. As explicações são sempre visíveis. Preferência local pp-intro-v1-hidden.
- Bónus e fusões têm resumos curtos e confirmação manual. A ajuda preserva os detalhes completos. Fundos das descrições com 96 % de opacidade. A primeira fusão de cada tipo é explicada uma vez por bónus.
- Título e contador do bónus centrados no topo. O painel duplicado com nome, contador e ganho à esquerda foi removido nesta passagem, preservando o registo de eventos e o resumo final.
- Barra móvel compacta, grelha sem faixa vazia abaixo e áreas seguras da notch. A pré-visualização transmite margens ao iframe. Isto foi validado com simulações locais, não num iPhone físico.
- Não usar ponto e vírgula como substituto de vírgulas em textos. Não delegar por defeito.

## Ambiente e validação

Scripts existentes, confirmados em [package.json](package.json):

```text
npm.cmd run dev
npm.cmd test
npm.cmd run test:intro -- --edge
npm.cmd run test:acidwave -- --edge
npm.cmd run verificar:kit
```

No repositório principal, npm.cmd run test:docs verifica a documentação. Não existem ainda scripts audio:apply ou audio:candidates. Os testes de browser usam Playwright instalado e Edge. Os cenários são locais e não exigem cloud.

Há muitas alterações não commitadas de toda esta fase e de trabalho anterior. Preservá-las. Não fazer git reset, git clean, checkout de ficheiros, commit ou deploy por inferência. As últimas alterações são verificadas no fecho desta passagem. Não transformar a preparação de som numa nova calibração de RTP.

## Limpeza desta passagem

Removidos oito WebP substituídos fora do manifesto atual, dois designs rejeitados, dois WebP retirados e capturas/saídas de teste sem referências documentais. Masters aprovados, fotografias de referência, relatórios de matemática e evidências citadas foram preservados. As ligações históricas dos WebP removidos apontam para os masters originais. Os logs preview-server.log e preview-server-error.log ficaram por estarem em uso. Não terminar processos do dono para os apagar.

## Primeira resposta na próxima conversa

Conversar sobre a direção: acid house e breaks de afterparty, intensidade crescente até ao POLICE PARTY, sem sirenes realistas nem agudos agressivos. Mostrar os prompts já preparados, perguntar se o dono quer vozes originais das personagens ou apenas efeitos e confirmar a ferramenta das músicas. Depois aprovar uma amostra de som antes da produção extensa. Nenhum áudio foi ainda escutado, medido ou certificado. Não afirmar que a fase sonora já está pronta.
