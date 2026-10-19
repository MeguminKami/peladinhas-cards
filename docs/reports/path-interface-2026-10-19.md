# Interface dos percursos — composição final e documentação

Data: 19 de outubro de 2026, Europe/Lisbon.

[Documentação](../README.md) · [Referência funcional](../reference/player-paths.md) · [Catálogo atual](../reference/path-mission-catalogue.md) · [Implementação v4](path-variety-2026-10-19.md)

## Estado local

Os refinamentos da interface estão implementados no código local. Não foi executado deploy, recálculo de produção, consulta cloud ou teste em aparelho físico nesta sequência de alterações. A implementação do catálogo e apuramento v4 tem o seu próprio relatório; esta revisão de documentação não reexecuta esses testes nem muda os seus resultados.

## Composição final

| Área | Comportamento implementado |
| --- | --- |
| Entrada em Missões/início | Apresentação simples sem tentativa; resumo completo apenas com missão preparada ou pendente. |
| Resumo da missão escolhida | Objetivo em primeiro plano, contexto do nó, tema da raridade, avanço, progresso e recompensa integrados. Sem painel lateral nem avisos explicativos repetidos. Estado/votos aparecem quando a tentativa está associada ao jogo. |
| Ligação do resumo | Abre `#/missions/path/{nodeId}` diretamente no nó apresentado, mesmo depois de explorar outro percurso. A escolha/remoção atualiza o resumo em memória. |
| Missão preparada no mapa | Cabeçalho compacto com atributo, número/nome do nó, raridade e estado; objetivo delimitado por uma faixa da raridade e identificado por **A tua missão · No próximo jogo**. |
| Progresso e prémio | Progresso do nó, avanço se cumprires e recompensa numa faixa de apoio. O valor e o atributo usam a mesma tipografia e cor: **+1 Drible**. Sem caixa própria nem número percentual gigante. |
| Recompensa limitada | `+0` acompanhado de **Limite atingido**; a carta permanente continua identificada quando aplicável. Em nós concluídos, usam-se os montantes entregues disponíveis no registo. |
| Textos de apoio | Apuramento numa linha; **Se falhares** com ícone/título vermelhos; **Podes mudar até à abertura do jogo, sem perder progresso** com ícone de informação. O parágrafo redundante de entrega/excedente foi retirado da missão preparada. |
| Ações | **Alterar missão** e **Remover escolha** antes da abertura; depois do congelamento, escolha protegida e acesso ao jogo quando disponível. |
| Ligações do mapa | Setas fixas de 24 px, centradas no intervalo entre nós. Contínuas nos troços desbloqueados e tracejadas nos bloqueados; sem sobrepor cartões. |

A remoção de texto e a integração visual não alteram a regra de entrega aos 100%, o excedente, os limites por atributo, o saldo de reroll ou os critérios do servidor. A posição GR e a janela de votos continuam nas regras da referência funcional.

## Fontes da implementação

- `js/paths.js`: resumo, missão preparada, recompensas, mapa e sincronização da entrada em memória.
- `js/missions.js`: dados da entrada, incluindo recompensas e identidade do jogador.
- `js/app.js`: destino direto do nó.
- `css/paths.css`: composição compacta, ligações e adaptação por largura/contendor.
- `js/event-rarity.js` e `css/experience.css`: nomes, emblemas e tokens de raridade reutilizados.

## Validação executada durante os refinamentos

`npm.cmd run test:paths:variety:ui` passou após a composição final: propostas, escolha por teclado, foco no nó, condições compostas, preparação, tentativa pendente, contagens por critério, apresentação numérica, gestão de revisões e redução de movimento.

Verificações adicionais em browser com fixtures, sem contas de produção:

- Larguras de 1440, 768, 390 e 320 px e quatro temas da aplicação.
- Missão única antiga de 4★ em Ataque e combinações de várias condições.
- Preparação, tentativa congelada/em avaliação, progressos 0% e 75%, missão numérica, remoção da escolha, fusão e carta final.
- Uma e duas recompensas, atributo com teto atingido e homogeneidade visual do valor/atributo.
- Ausência de overflow da página ou corte nos contentores alterados; alinhamento de setas entre nós, inclusive com um nó expandido.
- Abertura direta do nó pelo resumo e adaptação do mesmo componente na coluna do início.

Foram inspecionadas capturas de desktop e telemóvel. Os scripts ad hoc e imagens estão em `test-results/path-connectors/`, `path-rewards/`, `path-spotlight/`, `path-spotlight-v2/`, `path-prepared-integrated/` e `path-prepared-compact/`; são artefactos locais e podem não acompanhar uma exportação. As composições intermédias nessas pastas não definem o produto final: a referência é o código e a descrição acima.

Os testes de lógica, sorteio e emulador do catálogo v4 continuam registados em [Variedade de missões](path-variety-2026-10-19.md). Não se afirma nova execução da suite geral, publicação ou entrega push com base nestas capturas.

## Revisão dos Markdown

Foram revistos os Markdown existentes do projeto, preservando os relatórios de 18 de outubro como registos históricos e acrescentando ligações ao estado atual. A referência dos percursos, índices, guias, design e instruções de contribuição foram alinhados com o código e os scripts atuais.

Os antigos ficheiros de `docs/plans/`, `docs/deploy-feedback-fixes.md` e `docs/reports/experience-review.md` não existem nesta cópia. As ligações operacionais foram corrigidas para referências existentes; os documentos históricos não foram reconstruídos. O novo catálogo foi extraído dos 120 modelos de `js/path-missions.js`, com exemplos por fase/nível e sem afirmar calibração cloud.

`npm.cmd run test:docs` passou: **25 documentos e 268 referências locais válidas**. O verificador cobre README, docs e design; o `AGENTS.md` foi revisto à parte. No total, os 24 Markdown que já existiam foram atualizados e foram acrescentados este relatório e o catálogo atual, perfazendo 26 ficheiros. Não foram repetidas suites de código nesta revisão exclusivamente documental.

## Publicação

As alterações de interface descritas aqui são frontend:

```powershell
npm.cmd run deploy:frontend
```

Documentação, por si só, não exige publicação. Se o catálogo v4 também estiver por publicar, executar adicionalmente o deploy seletivo das oito Functions indicado no [relatório v4](path-variety-2026-10-19.md#publicação-seletiva). Não publicar regras/índices por causa destes refinamentos visuais. Os requisitos de uma atualização anterior ainda não publicada continuam a ter o seu âmbito próprio.
