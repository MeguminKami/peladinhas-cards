# Catálogo de missões dos percursos

Referência do código local em 20 de outubro de 2026. [Funcionamento](player-paths.md) · [Validação](../reports/path-expansion-2026-10-20.md).

São **270 modelos**: 18 por cada um dos 12 atributos e das três fusões. Este inventário foi extraído de [path-missions.js](../../js/path-missions.js). Novas propostas são v4; propostas anteriores conservam as suas metas. Os parâmetros de golos foram revistos com dois jogos reais, incluindo combinações e corte das avaliações às 48 horas; continuam provisórios. [Revisão periódica](../guides/path-calibration.md).

## Como ler

Cada missão vale para o **próximo jogo** do jogador; todas as condições se ligam por **E**. Contribuições são golos + assistências individuais, sem identificação de lances distintos. Os exemplos usam fundamentos e dificuldade intermédia; vitória isolada usa a menor dificuldade, a única em que é elegível. As metas mudam por fase e nível antes do sorteio e ficam congeladas na proposta revelada.

Golos, assistências, resultado e posição são registos do jogo. As avaliações disponíveis são Ataque, Passe, Físico, Defesa, Guarda-redes, Atitude e Desempenho geral. Velocidade, Drible, Resistência, Posicionamento e Compostura recorrem a indicadores aproximados; não há registos de sprints, dribles, minutos, distância ou decisões sob pressão.

A posição GR é obrigatória em Guarda-redes e Fortaleza. Qualquer avaliação na missão exige sete votos válidos por critério no corte das 48 horas; missões sem avaliações apuram no fecho. Falta de amostra ou participação GR não elegível cancela sem perder progresso.

## Velocidade

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Base física | rating | Obtém pelo menos 3,5★ em Físico |
| Ritmo vencedor | result-quality | Vence o jogo **e** Obtém pelo menos 3★ em Físico |
| Arranque ofensivo | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Físico |
| Acelerar o ataque | combined-rating | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,25★ em Físico |
| Recuperar terreno | combined-rating | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Físico |
| Ritmo de circulação | combined-rating | Obtém pelo menos 3,25★ em Passe **e** Obtém pelo menos 3,25★ em Físico |
| Chegar para finalizar | action-quality | Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Físico |
| Dar seguimento | action-quality | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Físico |
| Cumprir o papel | games | Joga na posição ALA **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Físico |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Físico |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Físico |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Físico |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Passe e Físico **e** Obtém pelo menos 3,25★ em Físico |
| Exibição completa | combined-rating | Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Físico |
| Superar a fasquia | rating | Obtém mais de 3,5★ em Físico |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Físico |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Passe e Físico **e** Obtém pelo menos 3,25★ em Físico |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Físico |

## Finalização

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Qualidade ofensiva | rating | Obtém pelo menos 3,5★ em Ataque |
| Instinto de marcador | individual-action | Marca pelo menos 2 golos |
| Golo com assinatura | action-quality | Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Ataque |
| Marcar e servir | score-and-assist | Marca pelo menos 1 golo **e** Faz pelo menos 1 assistência |
| Produção com golo | contributions | Marca pelo menos 1 golo **e** Soma pelo menos 3 entre golos e assistências |
| Golo na vitória | result-action | Marca pelo menos 1 golo **e** Vence o jogo |
| Parte do ataque | team-action | Marca pelo menos 1 golo **e** A tua equipa marca pelo menos 7 golos |
| Finalizar com cabeça | action-quality | Marca pelo menos 1 golo **e** Obtém pelo menos 4★ em Atitude |
| Cumprir o papel | games | Joga na posição AV **e** Participa no jogo **e** Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Ataque |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Ataque |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Ataque |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Ataque |
| Equilíbrio de qualidades | ratingMean | Marca pelo menos 1 golo **e** Obtém média de pelo menos 3,5★ entre Ataque e Passe **e** Obtém pelo menos 3,25★ em Ataque |
| Exibição completa | action-quality | Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,5★ em Desempenho geral |
| Superar a fasquia | action-quality | Marca pelo menos 1 golo **e** Obtém mais de 3,5★ em Ataque |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Ataque |
| Qualidade ao serviço da equipa | ratingMean | Marca pelo menos 1 golo **e** A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Ataque e Passe **e** Obtém pelo menos 3,25★ em Ataque |
| Participação decisiva | action-quality | Marca pelo menos 1 golo **e** Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,5★ em Desempenho geral |

## Passe

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Qualidade de passe | rating | Obtém pelo menos 3,5★ em Passe |
| Serviço de golo | individual-action | Faz pelo menos 1 assistência |
| Assistência com qualidade | action-quality | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Passe |
| Passe para ganhar | result-action | Faz pelo menos 1 assistência **e** Vence o jogo |
| Distribuir com critério | combined-rating | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Passe |
| Saída de jogo | combined-rating | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Passe |
| Passe na vitória | result-quality | Vence o jogo **e** Obtém pelo menos 3,25★ em Passe |
| Construção coletiva | team-quality | A tua equipa marca pelo menos 7 golos **e** Obtém pelo menos 3,25★ em Passe |
| Cumprir o papel | games | Joga na posição MED **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Passe |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Passe |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Passe |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Passe |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Atitude e Passe **e** Obtém pelo menos 3,25★ em Passe |
| Exibição completa | combined-rating | Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Passe |
| Superar a fasquia | rating | Obtém mais de 3,5★ em Passe |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Passe |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Atitude e Passe **e** Obtém pelo menos 3,25★ em Passe |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Passe |

## Drible

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Qualidade ofensiva | rating | Obtém pelo menos 3,5★ em Ataque |
| Resolver na frente | individual-action | Marca pelo menos 2 golos |
| Desequilibrar e contribuir | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Ataque |
| Presença ofensiva | combined-rating | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,25★ em Físico |
| Criar e servir | action-quality | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Ataque |
| Ligar a jogada | combined-rating | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,25★ em Passe |
| Atacar para ganhar | result-quality | Vence o jogo **e** Obtém pelo menos 3,25★ em Ataque |
| Talento com critério | combined-rating | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 4★ em Atitude |
| Cumprir o papel | games | Joga na posição ALA **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Ataque |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Ataque |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Ataque |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Ataque |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Ataque e Passe **e** Obtém pelo menos 3,25★ em Ataque |
| Exibição completa | combined-rating | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,5★ em Desempenho geral |
| Superar a fasquia | rating | Obtém mais de 3,5★ em Ataque |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Ataque |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Ataque e Passe **e** Obtém pelo menos 3,25★ em Ataque |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,5★ em Desempenho geral |

## Defesa

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Segurança defensiva | rating | Obtém pelo menos 3,5★ em Defesa |
| Resultado coletivo | victory | Vence o jogo |
| Defender para ganhar | result-quality | Vence o jogo **e** Obtém pelo menos 3★ em Defesa |
| Bloco sólido | solidity | A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3,25★ em Defesa |
| Compromisso defensivo | combined-rating | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Defesa |
| Defender e construir | combined-rating | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Passe |
| Presença nos duelos | combined-rating | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Físico |
| Defender e decidir | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Defesa |
| Cumprir o papel | games | Joga na posição DEF **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Defesa |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Defesa |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Defesa |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Defesa |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Defesa e Passe **e** Obtém pelo menos 3,25★ em Defesa |
| Exibição completa | combined-rating | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,5★ em Desempenho geral |
| Superar a fasquia | rating | Obtém mais de 3,5★ em Defesa |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Defesa |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Defesa e Passe **e** Obtém pelo menos 3,25★ em Defesa |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,5★ em Desempenho geral |

## Físico

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Presença física | rating | Obtém pelo menos 3,5★ em Físico |
| Resultado coletivo | victory | Vence o jogo |
| Força na vitória | result-quality | Vence o jogo **e** Obtém pelo menos 3★ em Físico |
| Presença defensiva | combined-rating | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Físico |
| Presença na frente | action-quality | Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Físico |
| Força com critério | combined-rating | Obtém pelo menos 3,25★ em Passe **e** Obtém pelo menos 3,25★ em Físico |
| Impor e contribuir | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Físico |
| Força coletiva | result-quality | Vence o jogo **e** Obtém pelo menos 3,75★ em Atitude **e** Obtém pelo menos 3★ em Físico |
| Cumprir o papel | games | Joga na posição DEF **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Físico |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Físico |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Físico |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Físico |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Passe e Físico **e** Obtém pelo menos 3,25★ em Físico |
| Exibição completa | combined-rating | Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Físico |
| Superar a fasquia | rating | Obtém mais de 3,5★ em Físico |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Físico |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Passe e Físico **e** Obtém pelo menos 3,25★ em Físico |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Físico |

## Guarda-redes

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Segurança na baliza | rating | Joga na posição GR **e** Obtém pelo menos 3,5★ em Guarda-redes |
| Baliza protegida | solidity | Joga na posição GR **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Primeiro passe | combined-rating | Joga na posição GR **e** Obtém pelo menos 3,25★ em Guarda-redes **e** Obtém pelo menos 3,25★ em Passe |
| Comando da área | combined-rating | Joga na posição GR **e** Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Muralha vencedora | result-quality | Joga na posição GR **e** Vence o jogo **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Organização defensiva | combined-rating | Joga na posição GR **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Assistência da baliza | action-quality | Joga na posição GR **e** Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Solidez com distribuição | solidity | Joga na posição GR **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3★ em Guarda-redes **e** Obtém pelo menos 3★ em Passe |
| Cumprir o papel | games | Joga na posição GR **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Somar sem perder | nonLoss | Joga na posição GR **e** Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Equilíbrio com qualidade | draw | Joga na posição GR **e** Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Qualidade na adversidade | loss | Joga na posição GR **e** Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Equilíbrio de qualidades | ratingMean | Joga na posição GR **e** Obtém média de pelo menos 3,5★ entre Guarda-redes e Passe **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Exibição completa | combined-rating | Joga na posição GR **e** Obtém pelo menos 3,25★ em Guarda-redes **e** Obtém pelo menos 3,5★ em Desempenho geral |
| Superar a fasquia | rating | Joga na posição GR **e** Obtém mais de 3,5★ em Guarda-redes |
| Não dar espaço ao golo | cleanSheet | Joga na posição GR **e** A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Qualidade ao serviço da equipa | ratingMean | Joga na posição GR **e** A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Guarda-redes e Passe **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Participação decisiva | action-quality | Joga na posição GR **e** Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Guarda-redes **e** Obtém pelo menos 3,5★ em Desempenho geral |

## Resistência

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Base física | rating | Obtém pelo menos 3,5★ em Físico |
| Resultado coletivo | victory | Vence o jogo |
| Motor vencedor | result-quality | Vence o jogo **e** Obtém pelo menos 3★ em Físico |
| Compromisso total | combined-rating | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Físico |
| Campo inteiro | combined-rating | Obtém pelo menos 3★ em Ataque **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Físico |
| Fôlego criativo | action-quality | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Físico |
| Sustentar o bloco | solidity | A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3,25★ em Físico |
| Equilíbrio na vitória | result-quality | Vence o jogo **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Físico |
| Cumprir o papel | games | Joga na posição MED **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Físico |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Físico |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Físico |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Físico |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Passe e Físico **e** Obtém pelo menos 3,25★ em Físico |
| Exibição completa | combined-rating | Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Físico |
| Superar a fasquia | rating | Obtém mais de 3,5★ em Físico |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Físico |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Passe e Físico **e** Obtém pelo menos 3,25★ em Físico |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Físico |

## Visão de jogo

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Leitura do jogo | rating | Obtém pelo menos 3,5★ em Passe |
| Encontrar o colega | individual-action | Faz pelo menos 1 assistência |
| Ver e executar | action-quality | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Passe |
| Ligar o ataque | combined-rating | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,25★ em Passe |
| Criador coletivo | team-action | Faz pelo menos 1 assistência **e** A tua equipa marca pelo menos 7 golos |
| Ler e contribuir | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Passe |
| Criar para ganhar | result-action | Faz pelo menos 1 assistência **e** Vence o jogo |
| Criatividade validada | action-quality | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Ataque |
| Cumprir o papel | games | Joga na posição MED **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Passe |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Passe |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Passe |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Passe |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Atitude e Passe **e** Obtém pelo menos 3,25★ em Passe |
| Exibição completa | combined-rating | Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Passe |
| Superar a fasquia | rating | Obtém mais de 3,5★ em Passe |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Passe |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Atitude e Passe **e** Obtém pelo menos 3,25★ em Passe |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Passe |

## Posicionamento

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Leitura defensiva | rating | Obtém pelo menos 3,5★ em Defesa |
| Organização vencedora | result-quality | Vence o jogo **e** Obtém pelo menos 3★ em Defesa |
| Disponível para construir | combined-rating | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Passe |
| Equilíbrio entre setores | combined-rating | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,25★ em Defesa |
| Fechar espaços | solidity | A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3,25★ em Defesa |
| Disciplina coletiva | combined-rating | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Defesa |
| Apoio à criação | action-quality | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Defesa |
| Saída vencedora | result-quality | Vence o jogo **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Passe |
| Cumprir o papel | games | Joga na posição DEF **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Defesa |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Defesa |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Defesa |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Defesa |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Defesa e Passe **e** Obtém pelo menos 3,25★ em Defesa |
| Exibição completa | combined-rating | Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,5★ em Desempenho geral |
| Superar a fasquia | rating | Obtém mais de 3,5★ em Defesa |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Defesa |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Defesa e Passe **e** Obtém pelo menos 3,25★ em Defesa |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,5★ em Desempenho geral |

## Jogo de equipa

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Espírito coletivo | rating | Obtém pelo menos 4★ em Atitude |
| Servir o colega | individual-action | Faz pelo menos 1 assistência |
| Ganhar juntos | victory | Vence o jogo |
| Ao serviço dos outros | action-quality | Faz pelo menos 1 assistência **e** Obtém pelo menos 4★ em Atitude |
| Ligação coletiva | combined-rating | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Passe |
| Compromisso vencedor | result-quality | Vence o jogo **e** Obtém pelo menos 4★ em Atitude |
| Todos contam | team-quality | Soma pelo menos 3 entre golos e assistências **e** A tua equipa marca pelo menos 7 golos **e** Obtém pelo menos 4★ em Atitude |
| Ajudar a defender | combined-rating | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Defesa |
| Cumprir o papel | games | Joga na posição MED **e** Participa no jogo **e** Obtém pelo menos 3,5★ em Atitude |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,5★ em Atitude |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,5★ em Atitude |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,5★ em Atitude |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Atitude e Passe **e** Obtém pelo menos 3,5★ em Atitude |
| Exibição completa | combined-rating | Obtém pelo menos 3,5★ em Atitude **e** Obtém pelo menos 3,5★ em Desempenho geral |
| Superar a fasquia | rating | Obtém mais de 4★ em Atitude |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,5★ em Atitude |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Atitude e Passe **e** Obtém pelo menos 3,5★ em Atitude |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,5★ em Atitude **e** Obtém pelo menos 3,5★ em Desempenho geral |

## Compostura

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Cabeça fria | rating | Obtém pelo menos 4★ em Atitude |
| Serenidade na vitória | result-quality | Vence o jogo **e** Obtém pelo menos 3,75★ em Atitude |
| Decidir com critério | combined-rating | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Passe |
| Finalizar com cabeça | action-quality | Marca pelo menos 1 golo **e** Obtém pelo menos 4★ em Atitude |
| Segurança atrás | combined-rating | Obtém pelo menos 4★ em Atitude **e** Obtém pelo menos 3,25★ em Defesa |
| Contribuir com critério | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 4★ em Atitude |
| Qualidade ofensiva | combined-rating | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 4★ em Atitude |
| Controlar e ganhar | result-quality | Vence o jogo **e** Obtém pelo menos 3,75★ em Atitude **e** Obtém pelo menos 3★ em Passe |
| Cumprir o papel | games | Joga na posição MED **e** Participa no jogo **e** Obtém pelo menos 3,5★ em Atitude |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,5★ em Atitude |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,5★ em Atitude |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,5★ em Atitude |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Atitude e Passe **e** Obtém pelo menos 3,5★ em Atitude |
| Exibição completa | combined-rating | Obtém pelo menos 3,5★ em Atitude **e** Obtém pelo menos 3,5★ em Desempenho geral |
| Superar a fasquia | rating | Obtém mais de 4★ em Atitude |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,5★ em Atitude |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Atitude e Passe **e** Obtém pelo menos 3,5★ em Atitude |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,5★ em Atitude **e** Obtém pelo menos 3,5★ em Desempenho geral |

## Atacante completo

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Dupla qualidade | combined-rating | Obtém pelo menos 3,5★ em Ataque **e** Obtém pelo menos 3,5★ em Passe |
| Marcar e servir | score-and-assist | Marca pelo menos 1 golo **e** Faz pelo menos 1 assistência |
| Golo construído | action-quality | Marca pelo menos 1 golo **e** Obtém pelo menos 3,25★ em Passe |
| Criar com ameaça | action-quality | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Ataque |
| Produção completa | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3★ em Ataque **e** Obtém pelo menos 3★ em Passe |
| Dupla vencedora | result-quality | Vence o jogo **e** Obtém pelo menos 3★ em Ataque **e** Obtém pelo menos 3★ em Passe |
| Golo e criação coletiva | team-quality | Marca pelo menos 1 golo **e** A tua equipa marca pelo menos 7 golos **e** Obtém pelo menos 3★ em Passe |
| Assistir e finalizar | action-quality | Marca pelo menos 1 golo **e** Faz pelo menos 1 assistência **e** Obtém pelo menos 3★ em Ataque |
| Cumprir o papel | games | Joga na posição MED **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Ataque |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Ataque |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Ataque |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Ataque |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Ataque e Passe **e** Obtém pelo menos 3,25★ em Ataque |
| Exibição completa | combined-rating | Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,5★ em Desempenho geral |
| Superar a fasquia | rating | Obtém mais de 3,5★ em Ataque |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Ataque |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Ataque e Passe **e** Obtém pelo menos 3,25★ em Ataque |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Ataque **e** Obtém pelo menos 3,5★ em Desempenho geral |

## Fortaleza

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Dupla muralha | combined-rating | Joga na posição GR **e** Obtém pelo menos 3,5★ em Defesa **e** Obtém pelo menos 3,5★ em Guarda-redes |
| Bloco protegido | solidity | Joga na posição GR **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3,25★ em Defesa |
| Fortaleza vencedora | result-quality | Joga na posição GR **e** Vence o jogo **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Guarda-redes |
| Segurança coletiva | solidity | Joga na posição GR **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Guarda-redes |
| Organizar e distribuir | combined-rating | Joga na posição GR **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Guarda-redes **e** Obtém pelo menos 3★ em Passe |
| Comando coletivo | combined-rating | Joga na posição GR **e** Obtém pelo menos 3,75★ em Atitude **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Guarda-redes |
| Solidez para ganhar | solidity | Joga na posição GR **e** Vence o jogo **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3★ em Defesa |
| Saída protegida | solidity | Joga na posição GR **e** A tua equipa sofre no máximo 7 golos **e** Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Passe |
| Cumprir o papel | games | Joga na posição GR **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Somar sem perder | nonLoss | Joga na posição GR **e** Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Equilíbrio com qualidade | draw | Joga na posição GR **e** Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Qualidade na adversidade | loss | Joga na posição GR **e** Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Equilíbrio de qualidades | ratingMean | Joga na posição GR **e** Obtém média de pelo menos 3,5★ entre Defesa e Passe **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Exibição completa | combined-rating | Joga na posição GR **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes **e** Obtém pelo menos 3,5★ em Desempenho geral |
| Superar a fasquia | combined-rating | Joga na posição GR **e** Obtém mais de 3,5★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Não dar espaço ao golo | cleanSheet | Joga na posição GR **e** A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Qualidade ao serviço da equipa | ratingMean | Joga na posição GR **e** A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Defesa e Passe **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes |
| Participação decisiva | action-quality | Joga na posição GR **e** Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,25★ em Defesa **e** Obtém pelo menos 3,25★ em Guarda-redes **e** Obtém pelo menos 3,5★ em Desempenho geral |

## Motor criativo

| Modelo | Família | Objetivo no próximo jogo |
| --- | --- | --- |
| Motor com visão | combined-rating | Obtém pelo menos 3,5★ em Passe **e** Obtém pelo menos 3,5★ em Físico |
| Fôlego criativo | action-quality | Faz pelo menos 1 assistência **e** Obtém pelo menos 3,25★ em Físico |
| Produção em movimento | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3★ em Passe **e** Obtém pelo menos 3★ em Físico |
| Motor vencedor | result-quality | Vence o jogo **e** Obtém pelo menos 3★ em Passe **e** Obtém pelo menos 3★ em Físico |
| Criar para ganhar | result-quality | Faz pelo menos 1 assistência **e** Vence o jogo **e** Obtém pelo menos 3★ em Físico |
| Criar em conjunto | team-quality | Faz pelo menos 1 assistência **e** A tua equipa marca pelo menos 7 golos **e** Obtém pelo menos 3★ em Físico |
| Energia com critério | combined-rating | Obtém pelo menos 3,75★ em Atitude **e** Obtém pelo menos 3★ em Passe **e** Obtém pelo menos 3★ em Físico |
| Ligação entre setores | combined-rating | Obtém pelo menos 3★ em Defesa **e** Obtém pelo menos 3★ em Passe **e** Obtém pelo menos 3★ em Físico |
| Cumprir o papel | games | Joga na posição MED **e** Participa no jogo **e** Obtém pelo menos 3,25★ em Físico |
| Somar sem perder | nonLoss | Termina o jogo sem perder **e** Obtém pelo menos 3,25★ em Físico |
| Equilíbrio com qualidade | draw | Termina o jogo empatado **e** Obtém pelo menos 3,25★ em Físico |
| Qualidade na adversidade | loss | Mesmo com derrota, cumpre os restantes requisitos **e** Obtém pelo menos 3,25★ em Físico |
| Equilíbrio de qualidades | ratingMean | Obtém média de pelo menos 3,5★ entre Passe e Físico **e** Obtém pelo menos 3,25★ em Físico |
| Exibição completa | combined-rating | Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Físico |
| Superar a fasquia | rating | Obtém mais de 3,5★ em Físico |
| Não dar espaço ao golo | cleanSheet | A tua equipa termina sem sofrer golos **e** Obtém pelo menos 3,25★ em Físico |
| Qualidade ao serviço da equipa | ratingMean | A tua equipa marca pelo menos 7 golos **e** Obtém média de pelo menos 3,5★ entre Passe e Físico **e** Obtém pelo menos 3,25★ em Físico |
| Participação decisiva | action-quality | Soma pelo menos 3 entre golos e assistências **e** Obtém pelo menos 3,5★ em Desempenho geral **e** Obtém pelo menos 3,25★ em Físico |
