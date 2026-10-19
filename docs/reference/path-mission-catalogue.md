# Catálogo de missões dos percursos

Referência do código local em 19 de outubro de 2026. [Funcionamento](player-paths.md) · [Validação v4](../reports/path-variety-2026-10-19.md).

São **120 modelos**: oito por cada um dos 12 atributos e das três fusões. Este inventário foi extraído de [path-missions.js](../../js/path-missions.js). Novas propostas são v4; propostas anteriores conservam as suas metas. Os parâmetros de golos foram revistos com dois jogos reais, incluindo combinações e corte das avaliações às 48 horas; continuam provisórios. [Revisão periódica](../guides/path-calibration.md).

## Como ler

Cada missão vale para o **próximo jogo** do jogador; todas as condições se ligam por **E**. Contribuições são golos + assistências individuais, sem identificação de lances distintos. Os exemplos usam fundamentos e dificuldade intermédia; vitória isolada usa a menor dificuldade, a única em que é elegível. As metas mudam por fase e nível antes do sorteio e ficam congeladas na proposta revelada.

Golos, assistências, resultado e posição são registos do jogo. As avaliações disponíveis são Ataque, Passe, Físico, Defesa, Guarda-redes e Atitude. Velocidade, Drible, Resistência, Posicionamento e Compostura recorrem a indicadores aproximados; não há registos de sprints, dribles, minutos, distância ou decisões sob pressão.

A posição GR é obrigatória em Guarda-redes e Fortaleza. Qualquer avaliação na missão exige sete votos válidos por critério no corte das 48 horas; missões sem avaliações apuram no fecho. Falta de amostra ou participação GR não elegível cancela sem perder progresso.

## Velocidade

Na revisão `2026-10-19-goals`, os golos de equipa começam em 5 / 7 / 8 nas dificuldades acessível / exigente / difícil e chegam a 7 / 8 / 9 na fase final. Também foram revistos golos individuais, combinações, contribuições e sofridos. Os exemplos intermédios iniciais abaixo usam 7 golos de equipa, 3 contribuições e no máximo 7 sofridos. Nos percursos individuais as dificuldades correspondem a Bronze / Prata / Ouro; fusões têm raridades próprias. Propostas reveladas e tentativas escolhidas conservam os objetivos guardados. [Análise completa e limitações](../reports/path-goal-calibration-2026-10-19.md).

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Base física | Avaliação | Obtém pelo menos 3,5★ em Físico |
| Ritmo vencedor | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3★ em Físico |
| Arranque ofensivo | Ação com avaliação | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Físico |
| Acelerar o ataque | Avaliações combinadas | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,25★ em Físico |
| Recuperar terreno | Avaliações combinadas | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Físico |
| Ritmo de circulação | Avaliações combinadas | Obtém pelo menos 3,25★ em Passe **e** Obtém pelo menos 3,25★ em Físico |
| Chegar para finalizar | Ação com avaliação | Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Físico |
| Dar seguimento | Ação com avaliação | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Físico |

## Finalização

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Qualidade ofensiva | Avaliação | Obtém pelo menos 3,5★ em Ataque |
| Instinto de marcador | Ação individual | Marca pelo menos 2 golos |
| Golo com assinatura | Ação com avaliação | Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Ataque |
| Marcar e servir | Marcar e assistir | Marca pelo menos 1 golo **e** Faz pelo menos 1 assistência |
| Produção com golo | Contribuições | Marca pelo menos 1 golo **e** Soma pelo menos 3 entre golos e assistências |
| Golo na vitória | Resultado com ação | Marca pelo menos 1 golo **e** Vence o jogo |
| Parte do ataque | Ataque coletivo com ação | Marca pelo menos 1 golo **e** A tua equipa marca pelo menos 7 golos |
| Finalizar com cabeça | Ação com avaliação | Marca pelo menos 1 golo **e** Obtém pelo menos 4★ em Atitude |

## Passe

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Qualidade de passe | Avaliação | Obtém pelo menos 3,5★ em Passe |
| Serviço de golo | Ação individual | Faz pelo menos 1 assistência |
| Assistência com qualidade | Ação com avaliação | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Passe |
| Passe para ganhar | Resultado com ação | Faz pelo menos 1 assistência **e** Vence o jogo |
| Distribuir com critério | Avaliações combinadas | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Passe |
| Saída de jogo | Avaliações combinadas | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Passe |
| Passe na vitória | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3,25★ em Passe |
| Construção coletiva | Ataque coletivo com avaliação | A tua equipa marca pelo menos 7 golos **e** Obtém pelo menos 3,25★ em Passe |

## Drible

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Qualidade ofensiva | Avaliação | Obtém pelo menos 3,5★ em Ataque |
| Resolver na frente | Ação individual | Marca pelo menos 2 golos |
| Desequilibrar e contribuir | Ação com avaliação | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Ataque |
| Presença ofensiva | Avaliações combinadas | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,25★ em Físico |
| Criar e servir | Ação com avaliação | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Ataque |
| Ligar a jogada | Avaliações combinadas | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,25★ em Passe |
| Atacar para ganhar | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3,25★ em Ataque |
| Talento com critério | Avaliações combinadas | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 4★ em Atitude |

## Defesa

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Segurança defensiva | Avaliação | Obtém pelo menos 3,5★ em Defesa |
| Resultado coletivo | Vitória | Vence o jogo |
| Defender para ganhar | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3★ em Defesa |
| Bloco sólido | Solidez | A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3,25★ em Defesa |
| Compromisso defensivo | Avaliações combinadas | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Defesa |
| Defender e construir | Avaliações combinadas | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Passe |
| Presença nos duelos | Avaliações combinadas | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Físico |
| Defender e decidir | Ação com avaliação | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Defesa |

## Físico

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Presença física | Avaliação | Obtém pelo menos 3,5★ em Físico |
| Resultado coletivo | Vitória | Vence o jogo |
| Força na vitória | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3★ em Físico |
| Presença defensiva | Avaliações combinadas | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Físico |
| Presença na frente | Ação com avaliação | Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Físico |
| Força com critério | Avaliações combinadas | Obtém pelo menos 3,25★ em Passe **e** Obtém pelo menos 3,25★ em Físico |
| Impor e contribuir | Ação com avaliação | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Físico |
| Força coletiva | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3,75★ em Atitude **e** Obtém pelo menos 3★ em Físico |

## Guarda-redes

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Segurança na baliza | Avaliação | Joga na posição GR **e** Obtém pelo menos 3,5★ em Guarda-redes |
| Baliza protegida | Solidez | Joga na posição GR **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Primeiro passe | Avaliações combinadas | Joga na posição GR **e** Obtém pelo menos 3,25★ em Guarda-redes **e** Obtém pelo menos 3,25★ em Passe |
| Comando da área | Avaliações combinadas | Joga na posição GR **e** Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Muralha vencedora | Resultado com avaliação | Joga na posição GR **e** Vence o jogo **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Organização defensiva | Avaliações combinadas | Joga na posição GR **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Assistência da baliza | Ação com avaliação | Joga na posição GR **e** Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Solidez com distribuição | Solidez | Joga na posição GR **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3★ em Guarda-redes **e** Obtém pelo menos 3★ em Passe |

## Resistência

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Base física | Avaliação | Obtém pelo menos 3,5★ em Físico |
| Resultado coletivo | Vitória | Vence o jogo |
| Motor vencedor | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3★ em Físico |
| Compromisso total | Avaliações combinadas | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Físico |
| Campo inteiro | Avaliações combinadas | Obtém pelo menos 3★ em Ataque **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Físico |
| Fôlego criativo | Ação com avaliação | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Físico |
| Sustentar o bloco | Solidez | A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3,25★ em Físico |
| Equilíbrio na vitória | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Físico |

## Visão de jogo

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Leitura do jogo | Avaliação | Obtém pelo menos 3,5★ em Passe |
| Encontrar o colega | Ação individual | Faz pelo menos 1 assistência |
| Ver e executar | Ação com avaliação | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Passe |
| Ligar o ataque | Avaliações combinadas | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,25★ em Passe |
| Criador coletivo | Ataque coletivo com ação | Faz pelo menos 1 assistência **e** A tua equipa marca pelo menos 7 golos |
| Ler e contribuir | Ação com avaliação | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Passe |
| Criar para ganhar | Resultado com ação | Faz pelo menos 1 assistência **e** Vence o jogo |
| Criatividade validada | Ação com avaliação | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Ataque |

## Posicionamento

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Leitura defensiva | Avaliação | Obtém pelo menos 3,5★ em Defesa |
| Organização vencedora | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3★ em Defesa |
| Disponível para construir | Avaliações combinadas | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Passe |
| Equilíbrio entre setores | Avaliações combinadas | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,25★ em Defesa |
| Fechar espaços | Solidez | A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3,25★ em Defesa |
| Disciplina coletiva | Avaliações combinadas | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Defesa |
| Apoio à criação | Ação com avaliação | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Defesa |
| Saída vencedora | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Passe |

## Jogo de equipa

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Espírito coletivo | Avaliação | Obtém pelo menos 4★ em Atitude |
| Servir o colega | Ação individual | Faz pelo menos 1 assistência |
| Ganhar juntos | Vitória | Vence o jogo |
| Ao serviço dos outros | Ação com avaliação | Faz pelo menos 1 assistência **e** Obtém pelo menos 4★ em Atitude |
| Ligação coletiva | Avaliações combinadas | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Passe |
| Compromisso vencedor | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 4★ em Atitude |
| Todos contam | Ataque coletivo com avaliação | Soma pelo menos 3 entre golos e assistências **e** A tua equipa marca pelo menos 7 golos **e** Obtém pelo menos 4★ em Atitude |
| Ajudar a defender | Avaliações combinadas | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Defesa |

## Compostura

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Cabeça fria | Avaliação | Obtém pelo menos 4★ em Atitude |
| Serenidade na vitória | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3,75★ em Atitude |
| Decidir com critério | Avaliações combinadas | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Passe |
| Finalizar com cabeça | Ação com avaliação | Marca pelo menos 1 golo **e** Obtém pelo menos 4★ em Atitude |
| Segurança atrás | Avaliações combinadas | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Defesa |
| Contribuir com critério | Ação com avaliação | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 4★ em Atitude |
| Qualidade ofensiva | Avaliações combinadas | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 4★ em Atitude |
| Controlar e ganhar | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3,75★ em Atitude **e** Obtém pelo menos 3★ em Passe |

## Atacante completo

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Dupla qualidade | Avaliações combinadas | Obtém pelo menos 3,5★ em Ataque **e** Obtém pelo menos 3,5★ em Passe |
| Marcar e servir | Marcar e assistir | Marca pelo menos 1 golo **e** Faz pelo menos 1 assistência |
| Golo construído | Ação com avaliação | Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Passe |
| Criar com ameaça | Ação com avaliação | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Ataque |
| Produção completa | Ação com avaliação | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3★ em Ataque **e** Obtém pelo menos 3★ em Passe |
| Dupla vencedora | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3★ em Ataque **e** Obtém pelo menos 3★ em Passe |
| Golo e criação coletiva | Ataque coletivo com avaliação | Marca pelo menos 1 golo **e** A tua equipa marca pelo menos 7 golos **e** Obtém pelo menos 3★ em Passe |
| Assistir e finalizar | Ação com avaliação | Marca pelo menos 1 golo **e** Faz pelo menos 1 assistência **e** Obtém pelo menos 3★ em Ataque |

## Fortaleza

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Dupla muralha | Avaliações combinadas | Joga na posição GR **e** Obtém pelo menos 3,5★ em Defesa **e** Obtém pelo menos 3,5★ em Guarda-redes |
| Bloco protegido | Solidez | Joga na posição GR **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3,25★ em Defesa |
| Fortaleza vencedora | Resultado com avaliação | Joga na posição GR **e** Vence o jogo **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Guarda-redes |
| Segurança coletiva | Solidez | Joga na posição GR **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Guarda-redes |
| Organizar e distribuir | Avaliações combinadas | Joga na posição GR **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Guarda-redes **e** Obtém pelo menos 3★ em Passe |
| Comando coletivo | Avaliações combinadas | Joga na posição GR **e** Obtém pelo menos 3,75★ em Atitude **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Guarda-redes |
| Solidez para ganhar | Solidez | Joga na posição GR **e** Vence o jogo **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3★ em Defesa |
| Saída protegida | Solidez | Joga na posição GR **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Passe |

## Motor criativo

| Modelo | Família do objetivo | Condições de exemplo no próximo jogo |
| --- | --- | --- |
| Motor com visão | Avaliações combinadas | Obtém pelo menos 3,5★ em Passe **e** Obtém pelo menos 3,5★ em Físico |
| Fôlego criativo | Ação com avaliação | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Físico |
| Produção em movimento | Ação com avaliação | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3★ em Passe **e** Obtém pelo menos 3★ em Físico |
| Motor vencedor | Resultado com avaliação | Vence o jogo **e** Obtém pelo menos 3★ em Passe **e** Obtém pelo menos 3★ em Físico |
| Criar para ganhar | Resultado com avaliação | Faz pelo menos 1 assistência **e** Vence o jogo **e** Obtém pelo menos 3★ em Físico |
| Criar em conjunto | Ataque coletivo com avaliação | Faz pelo menos 1 assistência **e** A tua equipa marca pelo menos 7 golos **e** Obtém pelo menos 3★ em Físico |
| Energia com critério | Avaliações combinadas | Obtém pelo menos 3,75★ em Atitude **e** Obtém pelo menos 3★ em Passe **e** Obtém pelo menos 3★ em Físico |
| Ligação entre setores | Avaliações combinadas | Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Passe **e** Obtém pelo menos 3★ em Físico |

## Sorteio e manutenção

O servidor escolhe três propostas com prioridade para famílias diferentes, sem modelos repetidos, equivalências ou dominância simples indevida. As últimas três famílias congeladas por percurso e o trio substituído pelo reroll têm menor peso. O reroll continua único por dia e jogador, em Lisboa.

Fases: fundamentos até +4, evolução desde +5 e final desde +10 pontos efetivamente entregues nesta origem; fusões conservam o cálculo pelos atributos envolvidos. Mudar nomes, metas, raridade ou avanço não cria um modelo novo. Alterações de catálogo não devem reescrever propostas reveladas, conquistas ou semanas fechadas.

Ao alterar o catálogo, atualizar este inventário a partir do código, executar os [testes dirigidos](../guides/testing.md#variedade-de-missões-dos-percursos) e identificar todos os consumidores a publicar. As melhorias de apresentação descritas no [relatório de interface](../reports/path-interface-2026-10-19.md) não mudam as recompensas nem o apuramento.
