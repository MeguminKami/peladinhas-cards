# Metodologia do projeto

## Objetivo
Criar uma slot de entretenimento para browser, exclusivamente com créditos fictícios, com qualidade elevada de apresentação e um motor matemático verificável. A primeira fase é inteiramente independente de tema, arte, áudio e animações.

## Fonte de verdade
- Configuração vigente **0.7.0**: `docs/MAESTRO_0_7_0.md`. P3 converte não-Wilds com distribuição ponderada e preserva Scatters iniciais.
- Configuração anterior **0.6.0**: `docs/BONUS_HUNT_0_6_0.md`. Hunt custa 3× mas prémios/cap usam a aposta base; Scatters positivos +50% relativo, sem boost nos FS. Preservar o indicador no histórico e no custo enviado à carteira. RTP não medido.
- Integração atual: `README.md` / `docs/INTEGRACAO.md`. `embed.html` usa saldo externo via SDK, estado e seed locais por jogador, recuperação idempotente de pedidos pendentes e expansão do mesmo iframe. Nunca renovar automaticamente a seed nem disponibilizar top-up local na versão integrada.
- Configuração atual **0.5.1**: Maestro converte para um premium equiprovável, partilhado no mesmo spin. Consultar `docs/MAESTRO_0_5_1.md`. RTP não medido nesta versão.
- Consultar `docs/MATEMATICA.md` para as regras e hipóteses numéricas atuais.
- A configuração 0.5.0 permite retrigger de +5 FS nos dois bónus e guarda a confirmação do festejo. Consultar `docs/RETRIGGER_0_5_0.md`; não assumir um máximo fixo de dez FS nem apresentar RTP antigo como válido para esta versão.
- Consultar `docs/SERVIDOR.md` para a arquitetura futura de servidor; `docs/GUI_FASE_1.md` para controlos, estrutura e estado de implementação do protótipo local. A GUI local já existe; o servidor de jogo ainda não.
- Consultar `docs/TEMA.md` para a direção artística Futebol de Bairro — Noite de Glória, inventário de assets, animações, modos e prompts de produção. Preservar o mapeamento dos dez símbolos e a matemática ao aplicar a arte.
- Consultar `docs/art/PRODUCAO.md` e `docs/art/manifest.json` para o estado real dos assets. A amostra temática já existe; não apresentar imagens estáticas com efeitos CSS como rigs ou animações finais completas.
- Distinguir sempre valores propostos, valores medidos e metas. Nunca apresentar RTP, volatilidade ou frequência como confirmados sem simulação e respetivo relatório.
- Registar alterações matemáticas com uma versão de configuração; resultados de versões diferentes não devem ser misturados.
- O resultado de uma jogada é gerado por símbolos e regras. Nunca sortear um multiplicador de prémio para depois fabricar um tabuleiro compatível.
- Roubo de poderes usa as quatro direções ortogonais: cima, baixo, esquerda e direita. Sem diagonais nem ligação entre margens.

## Arquitetura
- TypeScript para o motor, ferramentas de simulação e aplicação; Vite para desenvolvimento e build.
- Motor puro, independente de DOM, PixiJS, relógio, áudio e rede. Receber configuração, estado e fonte de aleatoriedade por injeção.
- Separar geração de símbolos, deteção de scatters, poderes, avaliação de linhas, atribuição de prémios e transições de bónus.
- Produzir um registo de eventos suficiente para reproduzir e apresentar cada jogada.
- Gerador pseudoaleatório com seed para simulações e reprodução de erros. Não usar aleatoriedade global escondida.
- Créditos e apostas em unidades inteiras; multiplicadores em representação exata ou ponto fixo. Definir arredondamento explicitamente.
- A apresentação consome o resultado do motor; saltar animações ou mudar a sua velocidade nunca muda prémios.
- A seed inicia a sequência uma vez; continuar/restaurar o RNG ou usar derivação criptográfica por contador. Nunca reiniciar a mesma seed por pedido.
- Persistir resultado, saldo fictício, estado da ronda e avanço RNG/contador atomicamente, com idempotência e concorrência controlada por jogador, quando o serviço for implementado.
- Preferências e velocidade só afetam apresentação. Bloquear alteração da aposta durante a ronda e impedir comandos de spin duplicados.

## Matemática e verificação
- Primeiro regras escritas, depois motor, depois simulações, depois calibração, finalmente apresentação.
- Testar pagamentos, substituição de wilds, adjacência, ordem dos poderes, sticky, scatters, limites, arredondamento e transições de estado.
- Simular jogo base, bónus natural e cada compra separadamente. Incluir o custo da compra no denominador do seu RTP.
- Medir RTP com intervalo de confiança, frequência de prémios e bónus, distribuição de ganhos, duração e volatilidade. Usar amostras independentes e múltiplas seeds.
- Não corrigir RTP por manipulação adaptativa dos resultados, saldo, histórico de perdas ou comportamento do utilizador.
- Manter um modo de desenvolvimento para forçar tabuleiros e eventos, claramente separado do modo aleatório.

## Apresentação, quando a matemática estiver estabilizada
- PixiJS para renderização; WebGL como base inicial de compatibilidade.
- GSAP para sequências e transições; Spine, sujeito a licença, para animações articuladas que o justifiquem.
- Shaders e partículas com orçamento de desempenho; arte consistente, símbolos legíveis e áudio sincronizado via Web Audio.
- HTML/CSS para menus, ajuda e definições; não acoplar componentes de interface à matemática.
- Objetivo de 60 FPS nos dispositivos suportados, validado em dispositivos reais; adaptar resolução e efeitos.
- Tratar carregamento, interrupções, mudança de separador, orientação, múltiplos toques e retoma.
- Produzir primeiro uma amostra pequena com acabamento final antes de expandir a arte.

## Colaboração
- Documentação e comunicação em português.
- Preservar escolhas explícitas do utilizador; assinalar interpretações e propostas ainda não confirmadas.
- Não integrar pagamentos, depósitos, levantamentos ou dinheiro real.
