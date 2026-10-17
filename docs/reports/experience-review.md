# Revisão da experiência e validações

[← Documentação](../README.md) · [Testes](../guides/testing.md) · [Publicação](../guides/deployment.md)

Este relatório regista desenvolvimento e verificações. Os guias descrevem os procedimentos atuais; um resultado local não comprova publicação nem entrega de notificações num dispositivo físico.

## Estado registado em 17 de outubro de 2026

| Área               | Implementação revista                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Início             | Saudação por horário; pódio ajustado à janela, bases de alturas distintas e legenda à direita; sem os controlos retirados de classificação/pausa.  |
| Painéis pessoais   | Carta e missões com a mesma altura quando lado a lado; sem o bloco de próximo jogo na carta pessoal.                                               |
| Jogo               | Cartas das equipas maiores, sem redução por transform; títulos da equipa deixam de alterar a cor/tipografia do nome nas cartas.                    |
| Mobile             | Resultados de eventos/missões em blocos por jogador e recompensa; contadores de golos/assistências alinhados sem dividir labels em letras.         |
| Feedback           | Autoavaliação pós-jogo com o mesmo peso de cada colega; N/A submetido em guarda-redes tem autoridade sobre as notas desse critério.                |
| Card Lab           | Oito ferramentas, galerias por elemento, 50 paletas vibrantes, foto do ADMIN, luz configurável, traçado removível e estados de projetos coerentes. |
| Notificações       | Convite móvel com permissão por clique, adiamento de sete dias e processo de instalação/permissões quando necessário.                              |
| Comparação semanal | Valores permanentes; bónus temporários não provocam setas.                                                                                         |

## Card Lab e cartas

A bancada mantém a carta visível e o scroll na ferramenta. Ícones, cabeçalhos, labels e expansões têm linguagem consistente e operação por teclado; animações respeitam redução de movimento. Os modelos preservam o desenho nativo enquanto não são editados; **Do zero** começa sem decoração, efeito, luz ou moldura.

A revisão corrigiu a reaplicação da carta premiada do jogador sobre o projeto, as texturas nativas que persistiam num fundo personalizado, a interpretação de fundos antigos e a gravação acidental sobre o projeto anterior ao escolher outro modelo. O traçado removido inclui as linhas internas nativas. Símbolos normalizados ficam centrados na zona inferior, sem nomes de edição sobrepostos. As legendas dos atributos alinham com o número e não com o conjunto número/seta.

As 50 paletas usam nomes próprios e combinações de superfície, texto, traçado e luz. Trinta partem das referências cromáticas fornecidas; vinte foram criadas adicionalmente. Os IDs foram conservados. O Bicolor tem transição por degradê. DIN Pro/Posterama são referências locais com fallback, não assets distribuídos.

## Autoridade da autoavaliação de guarda-redes

`calculateGameAggregate` exclui a dimensão quando encontra a autoavaliação submetida com N/A. Resumos guardam média nula, contagem válida zero e o indicador público de elegibilidade. Os colegas veem N/A bloqueado e uma explicação, sem acesso às respostas individuais dos restantes jogadores. Regras impedem novas notas incompatíveis; correções administrativas de respostas de colegas conservam N/A.

Rascunhos não impõem a exclusão; zero continua a ser nota válida. Depois de publicar, **Recalcular liga** atualiza dados antigos e cartas em evolução. Semanas fechadas mantêm os snapshots. Os consumidores backend e comandos estão no [procedimento seletivo](../deploy-feedback-fixes.md).

## Push: diagnóstico, correção e limite da confirmação

O diagnóstico de 15 de outubro identificava uma configuração VAPID inválida. Na intervenção posterior, em **17 de outubro**, foi confirmado que a privada cloud não correspondia à pública da app. O par local foi validado; `setup:push:cloud` guardou a privada correspondente e `--verify-cloud` confirmou a correspondência depois da alteração, sem expor chaves privadas nem rodar a pública.

Essa intervenção não registou a republicação de `pushDeviceAction`/`onNotificationPush` nem entrega num aparelho físico. Atualizar o segredo não demonstra que as revisões das funções já o usam. Confirmar a publicação e executar um teste nativo depois; ver [notificações](../guides/notifications.md).

O popup móvel **A tua liga chama por ti.** foi testado sem pedir autorização antes do toque, com adiamento, mudança de conta e ativação. A ilustração é HTML/CSS e não introduz imagens de marketing externas. Os testes do worker confirmaram a chamada de apresentação nativa com e sem clientes abertos, em ambiente simulado.

## Evidência local executada

- Suite de lógica: **90 testes passaram** na última execução registada antes desta revisão documental.
- Regras Firestore: **31 testes passaram** no emulador, incluindo bloqueio de notas de guarda-redes incompatíveis.
- Backend dirigido: passou o cenário `goalkeeper` de `tests/backend.test.js`, com agregação e correção administrativa. Isto não equivale à execução de toda a suite backend.
- Passaram os cenários de feedback, formulário de guarda-redes bloqueado, resultados móveis, edição/layout de jogo, painéis pessoais e enquadramento do pódio.
- Passaram os testes de ciclo push, interface de ativação e popup móvel, com transporte/serviços simulados.
- Sintaxe, preparação de Hosting e referências da documentação foram verificadas. As capturas inspecionadas incluem desktop e mobile, com 320/390 px nos fluxos alterados.

Os comandos reproduzíveis estão no [guia de testes](../guides/testing.md). Os números acima são evidência datada, não uma garantia de contagem fixa em futuras versões.

## Infraestrutura e recursos preservados

A interface mantém os temas existentes, Manrope local, ícones partilhados, navegação inferior mobile e modais com foco contido/restaurado. Originais ficam em `design/sources/`; recursos públicos em `assets/`; capturas de demonstração em `docs/media/`.

A PWA usa manifest e âmbito relativos, inventário/hash gerados no build, cache separado por versão e recuperação offline. Não faz cache de pedidos Firebase nem gravações privadas. Atualizações aguardam aceitação em vez de recarregar formulários automaticamente. Push mantém uma fila de leitura própria, independente do cache de recursos.

GitHub guarda o código; Hosting e serviços Firebase são publicações separadas. Exportar ou testar não publica. Não foi executado um deploy como parte desta atualização de Markdown.
