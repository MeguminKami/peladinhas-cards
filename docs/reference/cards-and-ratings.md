# Cartas, avaliações e OVR

[← Documentação](../README.md) · [Progressão por jogo](progression.md) · [Eventos](events-and-missions.md)

## Da primeira carta à carta oficial

A autoavaliação completa dos 12 atributos usa a escala 0–20 e permite criar a primeira carta. Desde o primeiro voto externo completo, a base usa 20% da autoavaliação e 80% da média externa. Com três avaliações externas completas, a carta passa a oficial.

Os valores são convertidos para a escala 0–99 da carta. Avaliações da comunidade, feedback de jogos e recompensas têm responsabilidades distintas: a comunidade estabelece a base; os jogos alimentam a progressão; os eventos aplicam recompensas validadas pelo servidor.

## Atributos e OVR

A carta acompanha velocidade, finalização, passe, drible, defesa, físico, guarda-redes, resistência, visão de jogo, posicionamento, jogo de equipa e compostura. O OVR é a média ponderada dos 12 atributos segundo a posição principal: GR, DEF, ALA, MED ou AV.

Cada conjunto de pesos soma 100%. A administração pode editar pesos e presets; o painel de auditoria apresenta os valores, pesos, contributos e arredondamento. A posição altera os pesos do OVR, não os atributos do jogador.

A penalização por inatividade começa após quatro jogos consecutivos da liga sem participação e pode chegar a dez pontos de OVR. O cálculo considera as regras de entrada do jogador e a participação, incluindo suplentes, implementadas em `js/utils.js`.

## Jogos, forma e estatísticas

O feedback de jogo usa a escala de estrelas. Guarda-redes N/A é excluído da média dessa dimensão. Dimensões não avaliadas não inventam uma avaliação. A evolução guarda decimais entre jogos e apresenta atributos arredondados na carta.

A fórmula considera avaliações absolutas e relativas às duas equipas, resultado, margem, golos e assistências, com ganhos/perdas limitados, boost de OVR baixo e desaceleração dos atributos elevados. Ver [a fórmula e simulação reproduzível](progression.md).

No início, “A minha carta” apresenta OVR, forma recente, jogos, vitórias, golos e assistências. A forma resume as últimas cinco avaliações agregadas de jogo disponíveis; “—” indica ausência de dados, não uma classificação de zero. Os totais de jogos e contribuições vêm de jogos finalizados.

O ranking semanal considera o ciclo e exige pelo menos duas avaliações recebidas para a forma semanal. O OVR serve de desempate e de referência quando faltam avaliações semanais. A página de estatísticas permite comparar a liga e ordenar os jogadores.

## Ciclo semanal

O ciclo abre à quinta-feira às 20:00 e fecha à quarta-feira às 12:00, em Lisboa. A pausa dura até à quinta-feira seguinte às 20:00. A conversão respeita inverno/verão e não depende do fuso do dispositivo.

Uma carta fechada preserva atributos, OVR, especiais, posição e aparência. O histórico semanal permite ampliar essas cartas e consultar a evolução. Alterações posteriores não devem reescrever a memória visual de uma semana fechada.

## Identidade e recompensas

Há seis raridades base e cartas especiais reconhecidas por performances/recompensas. O Card Lab é um estúdio para compor estilos com modelos, paletas, camadas, molduras, fontes, efeitos e fotografia; inclui desfazer/refazer, importação/exportação JSON e composições guardadas.

Eventos e missões podem atribuir stats temporárias ou permanentes, cartas semanais, prestígio e conquistas. Elegibilidade, limites e privacidade estão na [referência de eventos e missões](events-and-missions.md).

## Implementação

[`js/utils.js`](../../js/utils.js) contém o cálculo de atributos, OVR e estatísticas; [`js/card-week.js`](../../js/card-week.js) define o ciclo. [`js/data.js`](../../js/data.js) combina dados e snapshots para apresentação. A escrita dos agregados/histórico e a validação de operações protegidas pertencem às Functions e às regras Firestore.
