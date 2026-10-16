# Fidelidade da migração React

A referência é o frontend encontrado no início deste trabalho, depois do rollback. O snapshot de `index.html`, `js/` e `css/` foi guardado em `artifacts/migration/reference-source/` antes das alterações de implementação; os assets continuam a ser os originais do repositório.

## Captura reproduzível

`node scripts/migration-fidelity.mjs baseline` serve o snapshot original e grava imagens em `artifacts/migration/baseline/`. Cada nome segue `ROTA-LARGURA-TEMA.png`. O ficheiro `report.json` regista erros JavaScript, rotas indisponíveis e overflow horizontal por imagem.

Matriz: 1440, 768, 390 e 320 px de largura, com 960 px de altura; temas Club Original, Volt Arena, Champions Night e Ultimate 20. Rotas: início, jogadores, perfil, jogos, preparação e resultado do jogo, feedback, missões, eventos, administração, Card Lab, estatísticas, apoio e notificações. A entrada sem sessão também é capturada nas quatro larguras.

A baseline contém 320 capturas de rotas autenticadas, quatro de entrada, doze capturas adicionais da instalação e dos modais de instalação/temas, e três do menu mobile. Inclui também administração de jogadores, jogos, pesos do OVR, mensagens, manutenção e consulta de avaliações. O relatório consolidado das rotas não apresenta erros JavaScript nem overflow horizontal global. O seletor de ordenação das estatísticas existe mas é ocultado no desktop; a espera dessa rota usa a presença no DOM.

Inspeção manual inicial: início em 1440 e 320 px e estatísticas Ultimate em 390 px. A composição desportiva, as cartas e os temas são as referências a preservar. O pódio já apresenta separadores apertados e texto parcialmente cortado em 320 px, embora não provoque overflow global; esta é uma limitação preexistente a considerar na comparação.

## Contrato de dados de teste

Usam-se `tests/fixtures/db.js`, `tests/fixtures/auth.js` e `seedDocumentation` de `scripts/documentation-fixtures.mjs`. Intercetam-se os módulos Firebase, base de dados e autenticação; bloqueiam-se pedidos HTTPS externos e service workers. Não são consultados nem alterados dados de produção. `window.__testState` contém os dados de demonstração. O utilizador com sessão é Pedro Silva, administrador; `window.__guest` permite o ecrã de entrada. O seed importa os utilitários e o calendário semanal através dos módulos públicos existentes.

## Limitações

As imagens são de Chromium/Edge num ambiente isolado, com movimento reduzido, e mostram o viewport inicial de cada rota. Não substituem testes funcionais de todos os controlos, de persistência real ou de Safari. Fotografias externas não são carregadas. Datas e conteúdo semanal dependem da data de execução das fixtures. Uma comparação pixel a pixel deve acomodar dados temporais e estados automáticos do pódio; diferenças de composição devem ser verificadas manualmente.

## Validação da aplicação React

`node scripts/migration-fidelity.mjs verified` inicia Vite em modo `test`, com aliases para as fixtures, e grava a matriz da aplicação React numa pasta separada. Um terceiro argumento permite selecionar rotas, separadas por vírgulas; `admin-detail` seleciona as seis páginas administrativas. Cada relatório inclui overflow e percentagem de pixels cuja diferença de canal RGB excede 35. Esta métrica orienta a revisão manual; não é uma afirmação de identidade visual absoluta.

A execução completa em `artifacts/migration/verified/` concluiu as 320 capturas sem falhas de rota, erros JavaScript ou overflow horizontal global. A revisão encontrou e corrigiu a falta do seletor de perspetiva no perfil, a falta do menu administrativo no Card Lab, datas descartadas na lista de jogos e uma regressão no fundo das cartas durante a tipagem. As recapturas das cartas corrigidas ficam em `verified-cards/` e `verified-final/`. O pódio é fixado no modo OVR antes de cada imagem para evitar diferenças causadas pela sua rotação automática.

As páginas de administração, jogadores, estatísticas, apoio, Card Lab e notificações coincidem na comparação de pixels nas capturas revistas; pequenas diferenças em outras rotas correspondem sobretudo a datas geradas no momento da execução e animação/antialiasing. As métricas detalhadas e os erros por imagem permanecem nos relatórios dos respetivos diretórios.

Foi corrigido um problema de espaçamento já presente na versão original: abaixo de 1100 px, os campos dos detalhes de jogo tinham labels encostados ao campo anterior. A regra existente passa a usar 16 px de separação vertical. As capturas `verified-spacing/` documentam esta melhoria responsiva permitida; o desktop de 1440 px mantém a composição original.

Testes de interação executados:

- `node tests/migration-overlays.mjs`: foco preso no modal com Tab/Shift+Tab, fundo inerte, Escape e reposição de foco, temas, confirmação/cancelamento, navegação mobile em 320 px e toasts acessíveis.
- `node tests/migration-admin.mjs`: validação e persistência dos pesos por posição, predefinições, envio de mensagens e recuperação de erro, proteção da própria role, confirmação/cancelamento de alteração de role e eliminação de jogo, acesso administrativo reservado e recuperação de falha de carregamento.

Ambos usam exclusivamente fixtures locais, bloquearam rede externa e terminaram sem erros JavaScript não tratados. Estes testes não substituem testes das regras Firebase e do backend.


## Continuação de 16 de outubro de 2026

A recuperação confirmou os relatórios existentes em vez de assumir conclusão pela presença de componentes. `verified` contém 320 imagens e zero erros/overflow, mas inclui diferenças de cartas posteriormente corrigidas; as recapturas `verified-final` e `verified-spacing` são necessárias para interpretar o estado final. A métrica elevada dos detalhes de jogo mobile (`game-setup` até 14,45%; `game-result` até 8,42%) corresponde à separação vertical de 16 px entre campos: o painel e o conteúdo seguinte descem 48 px; a revisão das imagens confirmou esta correção responsiva, mantendo o desktop.

A continuação capturou 64 comparações atuais de perfil, Card Lab, preparação e resultado em `resume-verified`, com as quatro larguras e quatro temas, sem falhas de rota, erros JavaScript ou overflow global. Foram inspecionados perfil a 320 px, Card Lab a 390 px e preparação a 390 px contra os originais.

As lacunas da matriz inicial foram completadas em `resume-baseline-extra` (snapshot original, separado e preservado) e `resume-verified-extra`: ranking, histórico de tickets, tickets administrativos, gestão de eventos, catálogo de cartas, auditoria OVR e edição de perfil. São 112 comparações adicionais nos quatro temas e quatro larguras, sem falhas/erros/overflow. Ranking, tickets, auditoria OVR e editor de perfil tiveram 0% de diferença; eventos e catálogo até 0,01% (datas/conteúdo temporal). A revisão de eventos em 320 px, catálogo em 390 px e auditoria em 320 px confirmou a composição original. Foi identificada e corrigida a falta de menu administrativo no histórico de tickets administrativos; a recaptura `resume-verified-support-fixed` confirmou 0% de diferença nas 16 combinações, sem erros ou overflow.

O registo no passo de perfil também foi capturado em full-page nas quatro larguras em `resume-baseline-auth`, `resume-verified-auth` e `resume-verified-auth-fixed`. A revisão em 320 px não confirmou sobreposição do rodapé aos campos; houve uma regressão real no cabeçalho sem sessão, que omitia instalar e selecionar tema. `Chrome.tsx` voltou a apresentar ambos os controlos com a estrutura e ordem originais. O teste de overlays passou após acrescentar abertura de tema/instalação sem sessão, Escape, recuperação de foco e ausência de overflow a 320 px.

O harness aceita `--reference` para servir exclusivamente o snapshot numa nova pasta e `--compare=NOME_DA_PASTA` para comparar com referências adicionais. Capturas de referência existentes são protegidas contra sobrescrita. Exemplo: `node scripts/migration-fidelity.mjs nova-revisao ranking,tickets --compare=resume-baseline-extra`. Os oito PNG de cada execução de registo (quatro entradas e quatro passos de perfil) não fazem parte do contador de rotas autenticadas do relatório.

Limitações mantidas: Chromium/Edge com fixtures e rede externa bloqueada; screenshots de rotas mostram o primeiro viewport. Não se afirma inspeção visual de todos os painéis expandidos, de todas as combinações de erros ou de cada modal possível. A cobertura funcional complementar permanece nos testes de migração e apresentação; produção não foi consultada nem alterada.

Após a integração de sessão/navegação da continuação, `node tests/migration-admin.mjs` voltou a passar: pesos e predefinições, mensagens, falhas recuperáveis, roles, confirmação de eliminação, proteção de acesso e recuperação de carregamento. O erro Firebase registado nessa execução é a falha intencional da fixture; não houve pageerror não tratado.
