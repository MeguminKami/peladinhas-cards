# Etapa 3 — Visuais e animações finais com três agentes

## Contexto para o agente

Estamos na etapa final de uma slot criada de raiz. Na primeira etapa foram decididas e validadas as regras e a matemática, sem gráficos. Na segunda foi criado um protótipo básico para decidir áreas, posições, controlos, menus e apresentação das mecânicas.

Agora o utilizador vai fornecer o tema, imagens de referência e cores. A partir desse input, queremos **visuais e animações para todos os elementos e estados aplicáveis ao jogo**, com uma direção artística coerente.

Ler a especificação do motor, decisões e resultados matemáticos, o protótipo aprovado, o mapa de estados, o inventário de assets e o roteiro de animações. Consultar os [guias da etapa 1](01-logica-mecanicas-rtp.md) e [etapa 2](02-prototipo-visual-estrutura.md) para compreender o processo. Se faltarem entregáveis, esclarecer as lacunas antes de assumir decisões.

## Início e direção artística

- Se o tema, as imagens ou as cores ainda não tiverem sido fornecidos, pedir esses materiais antes de produzir a arte final.
- Interpretar as referências e apresentar uma proposta concreta: linguagem visual, paleta, tipografia, materiais, símbolos, ambiente e estilo de movimento.
- Explicar como a proposta se aplica à estrutura aprovada. Perguntar apenas sobre escolhas artísticas relevantes ainda em aberto.
- Mostrar uma amostra representativa integrada, incluindo movimento, para recolher feedback antes de multiplicar a produção por todos os elementos.
- Continuar a dar ideias e a discutir soluções com o utilizador durante a execução. Resolver detalhes técnicos autonomamente e confirmar alterações relevantes à direção aprovada.
- Preservar regras, pagamentos e probabilidades. Se uma ideia visual exigir mudar uma mecânica ou estrutura aprovada, explicitar a alteração e obter uma decisão antes de a implementar.

## Equipa obrigatória: agente principal e dois agentes em paralelo

Nesta etapa, o utilizador pede explicitamente uma equipa de três agentes. O agente principal deve criar dois agentes adicionais e distribuir trabalho em paralelo, depois de estabelecer a direção comum e os contratos necessários.

Distribuição inicial recomendada, ajustável ao projeto:

| Responsável | Trabalho |
| --- | --- |
| Agente principal | Direção artística, conversa com o utilizador, estrutura partilhada, integração, revisão e validação do conjunto. |
| Agente 2 | Arte e componentes visuais: símbolos, grelha, fundos, molduras, controlos, menus, painéis e variantes de estado. |
| Agente 3 | Movimento e efeitos: rotação e paragem dos rolos, prémios, mecânicas especiais, bónus, transições e microinterações. |

Antes do trabalho paralelo, combinar dimensões, âncoras, camadas, nomes de assets, interfaces de componentes, eventos, durações e propriedade dos ficheiros. Atribuir áreas de edição distintas para evitar conflitos. Partilhar referências e decisões com ambos; nenhum deles deve depender de conhecer a conversa original.

Os agentes colaboram quando houver dependências. O principal mantém-se responsável por integrar as entregas e resolver diferenças de estilo, desempenho e comportamento. Não basta juntar três resultados isolados.

## Cobertura visual e de movimento

Converter o inventário da segunda etapa numa lista verificável de cobertura. Incluir todos os elementos existentes e respetivos estados, por exemplo:

- Fundo, ambiente, grelha, rolos, símbolos e variantes especiais.
- Botões, ícones, tipografia, painéis, menus, regras, tabela de pagamentos e definições.
- Estados normal, hover, foco, premido, selecionado, desativado e carregamento, quando aplicáveis.
- Início da jogada, movimento e paragem dos rolos, destaque de combinações e contagem de prémios.
- Wilds, scatters, cascatas, multiplicadores e outras mecânicas que existam neste jogo.
- Antecipação, entrada, execução, retrigger, conclusão e resumo dos bónus.
- Escalas de celebração para diferentes prémios e transições entre estados.
- Feedback de erro, saldo insuficiente e restantes estados previstos no protótipo.

Para cada item, registar asset ou componente, estados cobertos, animação ou feedback previsto e situação de integração. Um elemento pode usar feedback discreto ou manter-se estático por legibilidade; essa escolha deve ser explícita. Não inventar mecânicas para preencher esta lista e não deixar placeholders por esquecimento.

## Qualidade e comportamento

- Usar ferramentas de imagem quando forem adequadas à arte raster e componentes de código ou vetores quando forem adequados a elementos escaláveis. Ler as instruções das ferramentas e skills disponíveis antes de as usar.
- Criar os assets finais necessários; não terminar apenas com descrições ou prompts.
- Manter leitura clara de símbolos, aposta, saldo, prémios e controlos durante efeitos e celebrações.
- Garantir que toda a animação termina num estado consistente e que aceleração, salto ou interrupção não alteram resultados, saldo ou pagamentos.
- Respeitar redução de movimento e evitar flashes agressivos. Garantir feedback compreensível sem depender apenas de cor ou som.
- Ajustar resolução, compressão, camadas e efeitos ao desempenho de desktop e telemóvel.
- Não acrescentar som como dependência obrigatória sem o discutir com o utilizador. Se existir, prever mute e manter o jogo compreensível sem áudio.

## Validação e conclusão

Verificar o jogo integrado em desktop e telemóvel, percorrendo todos os estados do inventário através de cenários locais reproduzíveis. Verificar cortes, sobreposições, menus, foco, controlos, transições, carregamento de assets, fluidez e redução de movimento. Executar as regressões pertinentes do motor e da ligação à interface.

Apresentar o resultado ao utilizador e incorporar o feedback. Só dar a etapa por concluída quando os visuais e animações previstos estiverem integrados, os problemas relevantes estiverem resolvidos e quaisquer limitações estiverem claramente identificadas.

Entregar o projeto funcional, o inventário atualizado, a localização dos assets e os comandos reais para executar e validar. Distinguir o que foi implementado do que foi efetivamente testado. Publicação e integração com dinheiro ou dados reais exigem um âmbito próprio; esta etapa não autoriza deploy automático.
