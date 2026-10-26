# Guia-prompt para desenvolver uma slot completa

Este documento é reutilizável e independente do tema Futebol de Bairro. Copia o bloco «Input do projeto», preenche o que souberes e entrega o documento ao agente com acesso ao repositório e às ferramentas de desenvolvimento. O conteúdo a partir de «Missão do agente» constitui o prompt de execução. Os exemplos e valores predefinidos não substituem as decisões do novo projeto.

## Input do projeto

```text
NOME DO JOGO:
DESCRIÇÃO LIVRE DA SLOT:
TEMA, AMBIENTE E EMOÇÃO PRETENDIDA:
REFERÊNCIAS VISUAIS / FICHEIROS / PESSOAS:
ESTILO GRÁFICO: [ex.: ilustração 3D, realista, cartoon, pixel art]
QUALIDADE E DISPOSITIVOS PRIORITÁRIOS:

TABULEIRO: [linhas × colunas]
SÍMBOLOS NORMAIS:
SÍMBOLOS PREMIUM E ORDEM DE VALOR:
WILD: [substituições, poderes, limitações]
SCATTER: [onde aparece, quantos ativam cada modo]
PAGAMENTO: [linhas fixas, ways, clusters, cascatas...]
PODERES E INTERAÇÕES:
MULTIPLICADORES E DURAÇÃO:
BÓNUS / FREE SPINS / RETRIGGERS:
COMPRAS DE BÓNUS E OUTROS MODIFICADORES:
APOSTAS: [unidade mínima, valores disponíveis, custo total]
RTP PRETENDIDO E TOLERÂNCIA:
VOLATILIDADE PRETENDIDA:
MAX WIN E ESCOPO DO LIMITE: [spin ou ronda completa]

MÚSICA E DIREÇÃO SONORA:
INTEGRAÇÃO: [standalone, iframe, saldo externo, outra]
PERSISTÊNCIA E SEED:
IDIOMAS:
RESTRIÇÕES / ELEMENTOS OBRIGATÓRIOS:
CRITÉRIOS DE ACEITAÇÃO ADICIONAIS:

O QUE FICAR EM BRANCO:
Propor uma solução coerente, documentar as hipóteses e implementar.
Perguntar apenas quando uma ambiguidade impedir uma decisão correta.
Por defeito, usar exclusivamente créditos fictícios e motor local.
```

## Missão do agente

És responsável por executar integralmente este projeto: especificação, matemática, motor, simulador, interface, arte, animações, som, persistência, integração, testes, build e documentação. Usa o input acima como fonte de requisitos. Não termines num plano, numa imagem de conceito ou numa GUI com botões sem função. Entrega uma slot utilizável e testável localmente, com os ficheiros necessários para incorporação num website.

Trabalha autonomamente nas decisões reversíveis. Mantém o utilizador informado sobre resultados, hipóteses relevantes e obstáculos reais. Se surgir feedback durante o desenvolvimento, incorpora-o sem perder o objetivo original. Não publiques num serviço externo nem envies mensagens a terceiros sem autorização correspondente.

Lê primeiro as instruções aplicáveis ao repositório e inspeciona o que já existe. Preserva alterações do utilizador. Usa as skills e ferramentas disponíveis quando forem apropriadas; não inventes capacidades nem declares assets produzidos se apenas escreveste prompts. Cria ou atualiza `AGENTS.md` com metodologia, comandos e fontes de verdade do projeto.

Podes ter um agente em paralelo para produzir imagens, gráficos, animações ou sons. Dá-lhe uma tarefa concreta, a mesma bíblia visual/sonora, referências, dimensões, formato, transparência, destino dos ficheiros e critérios de aceitação. Tu continuas responsável por rever e integrar tudo. Se a ferramenta necessária não existir, implementa uma alternativa adequada e explicita a limitação; não apresentes áudio sintético como gravação instrumental ou PNG com efeitos como animação articulada.

## 1. Transformar a ideia num contrato claro

Antes de construir, converte o input numa especificação única e atual, em português. Mantém decisões antigas num histórico separado; não acumules notas contraditórias no início das regras. Identifica o que foi pedido, o que foi assumido, o que é uma meta e o que já foi medido.

Define explicitamente:

- Dimensões, coordenadas, ordem dos índices e IDs estáveis dos símbolos.
- Sistema de pagamento, direção, comprimentos válidos, linhas/ways e desempates.
- Se a paytable usa a aposta total ou a aposta por linha. Nunca aplicar a divisão duas vezes.
- Pesos por símbolo, coluna e modo; usar tiras de rolos ou geração por posições, conforme a mecânica. Distinguir peso relativo de probabilidade final.
- Regras de wild: substituições, linhas só de wilds, poderes, adjacência, empilhamento e prioridade. Especificar diagonais, margens e se há ligação entre lados.
- Regras de scatter: distribuição, posições válidas, máximo por coluna ou grelha, ativação, pagamento próprio e proteção contra transformações.
- Powers: alvos, probabilidades condicionais, duração, exclusões, conflitos e ordem determinística.
- Multiplicadores: quais somam, quais multiplicam, limites locais/globais e quando reiniciam. Incluir exemplos numéricos.
- Bónus: condição de entrada, FS iniciais, diferenças entre modos, sticky, retriggers, compras e saída.
- Custo efetivo versus aposta de referência. Dizer de qual dependem os prémios, o max win e o «X» mostrado.
- Arredondamento, pagamentos mínimos, cap por spin/ronda e ordem em que se aplicam.
- Escada de apostas e unidade: por exemplo, 20 unidades inteiras = 0,20 créditos. Não deixar «0.2c» ambíguo.

Para cada poder, escreve uma ficha: `ID → condição → sorteio → alvo → efeito → duração → limites → evento visual → som`. Especifica também as interações entre poderes e o comportamento quando não há alvos disponíveis.

Não adotes automaticamente os números ou mecânicas do projeto de referência. Se não houver especificação, propõe valores iniciais e identifica-os como provisórios.

## 2. Arquitetura e separação de responsabilidades

Usa TypeScript como opção inicial para motor e aplicação web, com Vite para desenvolvimento/build. Escolhe renderização conforme a complexidade: PixiJS/WebGL para muitos sprites e efeitos, HTML/CSS/Canvas/WAAPI para uma apresentação mais simples que cumpra os requisitos. GSAP pode coordenar timelines; Spine só quando houver assets e licença adequados. Justifica a escolha sem adicionar dependências sem utilidade.

Estrutura sugerida:

```text
src/                  motor puro, configuração, RNG, sessão e simulador
web/                  apresentação, controlos, áudio, wallet e SDK
public/assets/        apenas assets utilizados na distribuição
test/                 testes do motor e sessão
e2e/                  testes reais no browser
docs/                 regras atuais, tema, áudio, integração, decisões
docs/art/             manifest, prompts e arquivo fora do build
reports/              simulações e medições versionadas
```

O motor não depende de DOM, relógio, áudio ou rede. Recebe configuração, estado e RNG por injeção. Não usa `Math.random()` escondido. A apresentação recebe resultados e eventos; nunca decide pagamentos nem volta a sortear ao saltar uma animação.

Representa créditos em inteiros e multiplicadores de forma exata ou em ponto fixo. Valida inputs, evita overflow e serializa o estado com uma versão e migrações explícitas.

Cada resultado deve conter o suficiente para reprodução e apresentação: versão, ronda/spin, modo, custo, aposta de referência, grelha inicial, passos intermédios relevantes, poderes e alvos, sticky, multiplicadores, linhas vencedoras, prémio bruto/pago, ajuste do cap, scatter/trigger/retrigger e estado seguinte. Guarda o RNG quando necessário para diagnóstico; não exponhas segredos de um eventual servidor no cliente.

## 3. Implementar primeiro o motor e o simulador

O resultado nasce dos símbolos e das regras. Não sortear primeiro um «X de ganho» para depois fabricar uma grelha. Um scatter comprado ou um cenário forçado só pode existir como regra explícita da compra ou ferramenta de desenvolvimento.

Implementa operações separadas para gerar grelha, detetar scatters, resolver poderes, avaliar pagamentos e avançar a ronda. A ordem exata depende do contrato da mecânica; fixa-a, testa-a e emite eventos consistentes com essa ordem.

Cria um programa simples de linha de comandos, sem GUI, capaz de:

- Rodar um spin, uma ronda completa e lotes de rondas.
- Escolher seed, aposta, modo, versão e modificadores.
- Simular separadamente jogo base com bónus naturais, cada compra e cada opção paga.
- Exportar JSON/CSV com parâmetros e métricas.
- Reproduzir resultados e executar cenários determinísticos de diagnóstico.

Fornece comandos reais e funcionais no README. Os cenários forçados não podem liquidar saldo externo nem misturar-se com resultados aleatórios em relatórios.

## 4. Calibrar e medir sem prometer um RTP fictício

Começa com pelo menos 100 000 rondas por cenário para uma primeira estimativa, se viável. Isto não garante precisão: a dimensão necessária depende da variância e dos eventos raros. Usa várias seeds independentes e aumenta a amostra até à tolerância acordada, dentro dos recursos disponíveis. Se a precisão não for atingida, entrega a medição e a incerteza reais.

Calcula `RTP = soma dos prémios pagos / soma dos custos reais`. Para o jogo base completo, conta também os prémios dos FS naturais; os FS não criam uma nova aposta paga. Para compras, o denominador usa o custo da compra. Para modificadores pagos, usa o custo efetivo modificado. Não apresentar `prémios dos FS / zero` como RTP de bónus.

Reporta tamanho da amostra, seeds, configuração, duração, RTP e intervalo de confiança com método descrito, frequência de pagamento, frequência de resultado líquido positivo, distribuição de ganhos, variância, frequências de entrada/retrigger/poder/sticky, duração dos bónus e incidência do cap. Não tratar FS dependentes da mesma ronda como amostras independentes; usar rondas completas ou lotes independentes para estimar a incerteza.

Se a aposta alterar o efeito do arredondamento, medir também apostas representativas da escada. Não alegar probabilidade de max win apenas porque o cap existe, nem considerar eventos não observados como impossíveis. Para eventos muito raros, complementar com análise exata quando possível e cenários determinísticos para validar a execução.

Calibra pesos e valores fixos, versiona a configuração e volta a medir. Não ajustar probabilidades ao saldo, perdas, utilizador ou histórico. Qualquer alteração matemática invalida a aplicabilidade direta dos relatórios anteriores. Um pedido explícito para mudar uma regra sem recalibrar pode ser cumprido, mas o RTP passa a estar por medir.

## 5. Sessão, seed e continuidade

Cria a seed uma única vez por sessão persistente/jogador, usando entropia adequada do ambiente. Continua o estado do PRNG; nunca reinicializar a mesma seed a cada spin. Preserva contador, RNG, ronda, FS, sticky, multiplicadores e confirmações relevantes. A mesma seed reproduz a mesma sequência apenas com versão e sequência de comandos compatíveis.

Renovar seed deve ser uma ação explícita e repetível nas definições, permitida entre rondas e sem transações pendentes. Não renovar ao reabrir a página. Manter saldo e histórico e registar a nova geração.

Define o âmbito do armazenamento: por jogador, browser/perfil e origem no modo local. Não prometer continuidade entre dispositivos sem um serviço de estado. Tratar armazenamento indisponível, dados inválidos e versão incompatível sem apagar silenciosamente pedidos pendentes.

## 6. GUI funcional antes da arte final

Constrói uma versão neutra para testar mecânica e fluxo. Depois transforma-a num ecrã de jogo único, com tabuleiro, HUD e menu organizados no mesmo espaço. Evita uma composição de página com grandes áreas vazias entre tabuleiro e controlos.

Inclui, quando aplicável:

- Saldo, aposta, custo efetivo, ganho do spin e total da ronda com rótulos inequívocos.
- Aumentar/diminuir aposta e seleção direta; bloquear durante uma ronda ativa.
- SPIN com estados claros, velocidades normal/rápida/super-rápida e comportamento definido para concluir animações.
- AUTO com pequeno painel ancorado ao botão, iniciar/parar e quantidade. Valor por defeito: 10 em 10 até 100, depois 100 em 100 até 500.
- Compras com preço, descrição e confirmação contextual; toggles pagos com estado ativo animado discreto e custo real visível.
- Multiplicador global e poderes ativos; FS num bloco independente por baixo, no formato `A / B`, sendo A jogados e B total atualizado com retriggers.
- Volume geral sempre acessível; definições de música/efeitos, movimento reduzido, preferências e seed.
- Histórico com aposta, custo, modo, modificadores, pagamento e versão; detalhes suficientes para compreender o resultado.
- Regras ilustradas: símbolos por raridade, paytable, linhas, wild, scatter, poderes, bónus e exemplos de cálculo.
- Carregamento com progresso real, recuperação de erros, saldo insuficiente, expansão e regresso à vista compacta.

Todos os botões devem funcionar. Desativar ações indisponíveis com uma razão compreensível. Elementos de debug ficam num modo separado, não na interface normal.

## 7. Máquina de estados e pipeline de apresentação

Implementa uma máquina de estados explícita. Mantém separados o estado matemático, a liquidação da carteira e o que ainda está a ser apresentado. Um bónus pode já ter acabado no motor e ainda precisar de mostrar a última vitória e o resumo antes de sair visualmente.

Fluxo de referência, adaptado à mecânica:

```text
PRONTO → PEDIDO VALIDADO → RESULTADO PREPARADO/PERSISTIDO
→ LIQUIDAÇÃO CONFIRMADA → ROLOS → SCATTERS/ANTECIPAÇÃO
→ PODERES → STICKY/TRANSFORMAÇÕES → LINHAS
→ CELEBRAÇÃO → ENTRADA/RETRIGGER/RESUMO, se aplicável
→ CONFIRMAÇÃO → PRÓXIMO SPIN OU PRONTO
```

Explicita como o fluxo é interrompido por erro ou reload. Não usar a sequência acima como obrigação de misturar eventos incompatíveis; a especificação matemática determina a sua ordem real. Se a compra liquidar também o primeiro FS, conservar essa semântica ao apresentar uma introdução antes de o revelar.

Usa timelines aguardáveis e cancelamento controlado. Evita cadeias de `setTimeout` independentes. Cada evento é apresentado uma vez; não repetir linhas vencedoras no fim por renderizar novamente o mesmo resultado.

O painel de FS surge na entrada efetiva do modo e só desaparece depois da última celebração e da confirmação de saída. O multiplicador mantém-se ou reinicia exatamente quando as regras o exigem.

## 8. Arte: bíblia visual, produção e integração

Cria `docs/TEMA.md` com conceito, paleta, materiais, iluminação, tipografia, formas, hierarquia, personagens e diferenças entre modos. Define a linguagem comum antes de produzir todas as imagens.

Faz um inventário de símbolos, molduras, fundos por modo, logótipo, botões, ícones, efeitos, overlays e estados. Especifica dimensões, margens, pivots, transparência, variantes e destino. Os símbolos devem ter escala aparente harmoniosa, silhuetas reconhecíveis e leitura em tamanho real de célula. Premiums precisam de diferenças crescentes de valor sem parecerem de jogos diferentes.

Para pessoas de referência, usa ficheiros nomeados e correspondência explícita entre referência e símbolo. Preserva rosto e características pedidas, ajusta anatomia, pose e roupa coerentemente e revê o resultado. Não reaproveitar um corpo incompatível ao mudar apenas o rosto. Cabeças, cabelos e mãos não podem ficar cortados. A altura só é comparável se existir enquadramento e escala comuns; não prometer essa leitura num busto fechado.

Produz uma amostra com qualidade final e valida-a no tabuleiro antes de expandir. Usa geração de imagens para arte raster quando disponível; gráficos simples e elementos vetoriais devem seguir o sistema nativo do projeto. Para cada asset distinto, usa um prompt próprio com referências e invariantes claras. Não substituir arte final por emojis ou placeholders sem assinalar.

Não renderizar textos de interface dentro de bitmaps quando precisarem de tradução ou atualização. WILD e SCATTER devem estar escritos de forma legível, no asset ou numa camada integrada ao símbolo. Evitar hover obrigatório e texto descritivo por cima dos símbolos. Usar fontes adequadas ao tema, legíveis e com licença conhecida.

Guardar os assets finais dentro do projeto, manifest com dimensões reais/alpha/ferramenta/licença/origem, prompts e versões. Fotografias pessoais de referência ficam fora da pasta pública. Arquivar versões descartadas fora do build. Documentar se cada recurso é imagem estática, spritesheet, rig, vídeo ou efeito em código.

## 9. Animações obrigatórias e leitura dos acontecimentos

Prepara uma tabela de evento → animação → duração → som → condição de conclusão. Cobre spin, rolos a parar, scatter, antecipação, poderes, sticky, transformações, linhas, pequenos ganhos, grandes vitórias, entrada de bónus, retrigger, final de bónus, cap e transições.

Rolos: todas as colunas giram como rolos verticais contínuos, com arranque/desaceleração suaves. O resultado final já deve fazer parte da tira animada antes de parar. Nunca trocar para o símbolo correto por um salto visível. Preservar o alinhamento ao redimensionar. Antecipação abranda progressivamente as colunas elegíveis e não simula oportunidades impossíveis segundo as regras.

Poderes: mostrar origem, transferência, nome temático e impacto no alvo/tabuleiro. Reservar tempo legível, inclusive no jogo normal. Sticky deve ter uma animação de fixação e uma aparência persistente inequívoca, como ouro brilhante com aura discreta. Um utilizador deve perceber o que mudou sem abrir o histórico.

Compras: apresentar um spin de ativação compatível com a compra, com posições/ordem de scatters aleatórias segundo a regra específica. Não usar sempre a mesma disposição. Distinguir esse spin do primeiro FS e impedir prémios extra não previstos na matemática.

Linhas: mostrar uma de cada vez, rapidamente, com percurso e símbolos destacados. O valor pago dessa linha sobe e desvanece como um balão, com contraste forte, tamanho moderadamente crescente com o valor e sem ocultar toda a grelha. Se houver arredondamento/cap, definir uma atribuição visual consistente cuja soma corresponda ao total efetivamente pago.

Vitórias: criar nomes temáticos e limiares documentados. Por defeito, ganhos abaixo de 15× recebem animações pequenas no jogo. A partir de 15×, usar uma celebração contínua com dinheiro e X animados e efeitos que evoluem ao passar os limiares. Estes valores são uma proposta visual, não uma regra matemática universal.

O contador deve avançar suavemente por tempo real, com duração ajustada ao montante, sem saltos nem incrementos por `setInterval` dependentes do FPS. O fundo e os efeitos evoluem no mesmo ecrã. CONTINUAR aparece no fim, sem substituir a celebração por outro ecrã. Uma ação pode revelar o total; uma nova ação confirma a saída.

Entrada de bónus: overlay sobre o jogo, com título, quantidade de FS e parágrafo curto sobre o que muda. Permanece até o jogador continuar. Evitar um segundo ecrã redundante antes da descrição.

Retrigger: mostrar `+N FREE SPINS`, atualizar o total e celebrar. Por defeito, permite clique/espaço para continuar ou avança após 10 segundos, com animação suave enquanto espera. Este temporizador é específico do retrigger; não o aplicar à entrada de bónus.

Fim de bónus: esperar por todas as linhas e vitórias do último FS, apresentar transição cuidada e um resumo com contagem animada do total, só depois disponibilizar confirmação. Manter o ambiente de bónus até à saída completa.

## 10. Teclado, autospin e concorrência

Centraliza a interpretação de ESPAÇO. O overlay no topo tem prioridade sobre o tabuleiro. Todos os CONTINUAR aceitam espaço, incluindo introdução, retrigger, vitórias e resumo.

Aplicar 500 ms entre avanços de ecrãs, sem propagar a mesma pressão ao próximo ecrã ou ao spin. Para comandos de spin, usar apenas um intervalo de 100 ms, com início imediato quando permitido. Ignorar tecla mantida, repetição automática e comandos recebidos durante bloqueio; não criar uma fila de spins. O teclado normal de sliders, selects e campos de texto tem prioridade quando esses controlos estão focados. Partilhar as proteções entre rato, toque e teclado.

Autospin usa o mesmo comando e a mesma liquidação do manual, respeita velocidade, custo real e saldo. Desconta apenas spins pagos confirmados; FS não consomem o lote. Parar termina a sequência depois da jogada corrente, sem cancelar um resultado já liquidado. Não antecipar o débito de todo o lote. Pausar em overlays que exigem confirmação e não retomar automaticamente após reload. Definir o comportamento ao ocultar a página, trocar de utilizador ou receber atualização de outra aba.

## 11. Som e música completos

Cria `docs/AUDIO.md` com mapa de eventos, timbres, duração, prioridade, variações, simultaneidade e volumes. Inclui interface, início/loop/paragem de rolos, scatter por ordem, antecipação, cada poder, sticky, transformação, linha paga, contador, limiares de vitória, entrada, retrigger, final e transições entre modos.

Usa música distinta ou camadas por modo, loops sem cortes e crossfades. Faz ducking durante eventos importantes. Limita vozes simultâneas, evita sobreposição estridente e repetição mecânica. Sincroniza som com eventos visuais, sem alterar a matemática.

Preferir áudio original produzido com ferramentas disponíveis ou síntese Web Audio bem trabalhada. Se descarregares recursos, verificar a licença de cada ficheiro e guardar fonte, autor, licença e atribuição necessária. «Royalty-free» não significa ausência de direitos. Não usar uma alegação genérica «no copyright» como prova de licença. Não prometer síntese de voz ou música gravada se a ferramenta não as produz.

Áudio só arranca após interação permitida pelo browser. Volumes geral/música/efeitos e mute persistem. Suspender ao ocultar, recuperar sem duplicar loops e destruir a instância sem deixar áudio ativo. Movimento reduzido e mute não alteram resultados.

## 12. Desempenho, adaptação e acessibilidade

O objetivo inicial é 60 FPS nos dispositivos acordados, sujeito a medição. Usar texturas de execução adequadas ao tamanho de apresentação, preloading, cache/atlas quando útil, pooling de partículas e animações por transform/opacidade. Não descodificar masters enormes em cada frame nem atualizar o DOM inteiro a cada incremento do contador.

Usar `requestAnimationFrame` e tempo decorrido; reduzir efeitos e resolução se necessário. Medir frame time, frames longos, carga de assets e memória em rolos, antecipação, poderes, grandes vitórias e longas sessões. Não declarar FPS garantidos apenas por observar o jogo no desktop ou por passar testes funcionais.

Testar desktop, portátil, telemóvel, orientação horizontal/vertical e área compacta de iframe. Definir uma proporção de referência e regras de adaptação; não esticar células para encher o espaço. Ajustes de altura, como +10%, devem ser calculados a partir de uma referência visual conhecida e revistos com screenshots.

Tabuleiro e menu ficam próximos, alinhados e com hierarquia de tamanhos. Evitar texto de estado a criar uma faixa vazia entre ambos. Controlos têm contraste, foco visível, nomes acessíveis e áreas de toque adequadas. Diálogos gerem foco e não expõem controlos inferiores ao teclado. Disponibilizar movimento reduzido e não depender só da cor para transmitir poderes/estados.

## 13. Saldo externo e incorporação num website

Entregar um modo standalone de demonstração e um modo integrado. No modo integrado, o website controla apenas o saldo fictício; a slot mantém lógica, seed e estado locais se esse for o contrato do input. Criar uma página host de exemplo e um SDK pequeno com montar, destruir, expandir/recolher e atualizar saldo.

O modo compacto já é o jogo funcional. A expansão usa a mesma instância/iframe, preservando áudio, RNG, sessão e animações. Não recarregar o jogo para expandir. Usar caminhos de assets compatíveis com publicação numa subpasta.

Definir o contrato da carteira em unidades inteiras: obter saldo e liquidar uma operação com ID estável, débito, crédito, ronda/spin e versão. O host autentica o utilizador e aplica `saldo - débito + crédito` atomicamente, verificando cobertura do débito antes do crédito. Não confiar num ID do browser para autorizar acesso à conta.

Idempotência obrigatória: repetir utilizador + ID com os mesmos dados retorna a operação já executada; dados diferentes com o mesmo ID são rejeitados. Guardar o pedido e resultado local antes de enviar. Um timeout ambíguo conserva o pedido pendente e bloqueia nova jogada; recuperar repetindo a mesma operação, sem sortear novamente. Só rejeições definitivas garantidas pela carteira permitem abandonar a operação. Documentar que liquidar saldo e persistir estado no browser não é uma única transação distribuída: usar journal e recuperação explícita.

Validar origem, janela emissora, formato e IDs de correlação de mensagens; não usar `postMessage('*')` para dados de carteira. Serializar comandos e tratar concorrência entre abas. A carteira externa deve tratar concorrência entre dispositivos. Não disponibilizar top-up/reset local do saldo no modo integrado.

Este modelo serve entretenimento com créditos fictícios. Um motor no browser é alterável pelo utilizador; não constitui autoridade para dinheiro real. Se o input exigir outra arquitetura, separar resultado autoritativo em servidor e apresentação cliente, sem afirmar que a implementação local já oferece essa garantia.

## 14. Testes e revisão de qualidade

Testar casos com significado, evitando testes que só repetem a implementação. Criar fixtures e um visualizador de cenários sem efeitos na carteira externa.

Cobertura mínima do motor: paytable, linhas e desempates, wild, scatter, todos os poderes, múltiplas ativações, alvos indisponíveis, sticky, multiplicadores, início/fim/retrigger, cap, arredondamento, custos modificados, continuidade RNG e reprodução. Verificar invariantes como saldo inteiro, ausência de pagamento acima do cap e estado válido após cada comando.

Cobertura de sessão/integração: reload a meio de bónus, confirmações pendentes, migrações, renovação de seed, duplicação de comandos, saldo insuficiente, resposta de carteira perdida após liquidação, operação idempotente, outra aba, troca de jogador e expandir/recolher sem reinício.

Cobertura de browser: todos os controlos, teclado, 100/500 ms sem atraso artificial, AUTO, ordenação completa do último FS, overlays, linhas sem repetição, som/mute, regras ilustradas, ausência de imagens quebradas, alpha real e enquadramento em vários tamanhos. Validar visualmente prémios/poderes raros com cenários forçados; não esperar que ocorram ao acaso.

Executar verificações de tipos, testes adequados e build. Rever console do browser e capturas reais. Quando houver uma falha, corrigir e repetir os testes afetados. Não declarar conformidade total quando uma verificação ficou por executar; listar a limitação concreta.

## 15. Entregáveis e conclusão

Entregar no repositório:

1. Motor puro e configuração versionada, com regras atuais coerentes.
2. CLI de spins/rondas/simulações e relatórios com medições reais e incerteza.
3. Jogo funcional com GUI, arte integrada, animações legíveis, música e efeitos.
4. Sessão persistente, continuidade RNG, renovação explícita de seed e histórico.
5. Standalone, entrada integrada, host de exemplo e SDK, quando previstos.
6. Tests e build executáveis; assets ativos separados de arquivos e referências pessoais.
7. `README.md` com requisitos, comandos exatos, URL local, publicação, limitações e integração.
8. `AGENTS.md`, regras matemáticas, `TEMA.md`, `AUDIO.md`, manifest/prompts, decisões e relatórios.

Não concluir enquanto houver botões essenciais falsos, assets em falta, resultados dependentes da animação ou falhas conhecidas que impeçam o fluxo principal. Se uma capacidade externa bloquear parte do pedido, entregar o que estiver operacional e explicar exatamente o que falta e porquê.

Na resposta final, indicar o que foi entregue, onde testar, verificações executadas, RTP efetivamente medido ou ainda por medir e limitações relevantes. Não usar «qualidade máxima», «60 FPS» ou «RTP confirmado» como garantias sem evidência. Continuar até ao produto completo dentro do âmbito autorizado, sem pedir aprovação para cada implementação reversível.
