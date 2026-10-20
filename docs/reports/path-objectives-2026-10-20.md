# Correção dos objetivos dos percursos — 20/10/2026

A revisão anterior ajustou golos sofridos mas manteve objetivos de baliza inviolada e propostas antigas. Removidos do sorteio os modelos next-clean, next-draw e next-resilience: não pedir para perder ou empatar. O catálogo passa a 225 modelos, com 15 por percurso (14 nos níveis que excluem vitória isolada).

O snapshot de 19/10 contém dois jogos e quatro resultados de equipa: 5, 7, 8 e 9 golos. Não sustenta limites de zero, um ou dois golos nem probabilidades definitivas. Mantidos os limites calibrados 5–8 das novas propostas.

Na sincronização, propostas guardadas e preparações sem jogo recebem limites 8/7/5 segundo a dificuldade se exigiam baliza inviolada ou menos de cinco golos sofridos. Empate/derrota passam a uma contribuição (golo ou assistência), mantendo os restantes requisitos, avanão e raridade. Tentativas associadas a jogos, pendentes e histórico não são reescritos; não recalcular recompensas ou semanas fechadas.

Publicar getPath, pathAction, onPathGame, onPathSummary, settlePaths, gameAction e feedbackAction, e o frontend. Não foi executado deploy nem confirmada configuração cloud.

A linha redundante de participar no jogo deixa de aparecer quando existem outros requisitos. Objetivos antigos apenas de participação passam a uma contribuição.

Validação local: 34 testes de lógica e três cenários backend passaram. Build de hosting concluído. O teste de ligações documentais encontra três referências ao plano firestore-read-reduction.md, removido previamente no workspace e fora desta alteração.


As propostas novas de 150% e 200% usam o mesmo pequeno degrau adicional sobre 100%: +0,25 estrela num requisito de avaliação (prioritário), ou +1 numa meta numérica ofensiva quando não há avaliações. Só muda um requisito; limites defensivos e posições mantêm-se. No teto, mais de 4,75 estrelas passa a pelo menos 5, nunca mais de 5. As duas raridades têm o mesmo degrau; propostas já reveladas e tentativas existentes não são agravadas.
