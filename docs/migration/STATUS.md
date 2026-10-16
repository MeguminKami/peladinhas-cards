# Migração React — registo operacional

## Contratos e proteção da referência

- Referência obrigatória: HEAD atual após rollback; o repositório estava limpo no início.
- A implementação publicada (`index.html`, `js/`, `css/`) fica intacta enquanto a substituição não passar os critérios de conclusão.
- Referências congeladas: `artifacts/migration/reference-source`; capturas originais: `artifacts/migration/baseline`. Nunca atualizar estas imagens para aceitar diferenças da migração.
- Aplicação React separada em `frontend/index.html` e `src/`; build de ensaio em `.firebase/react-site`, separado do Hosting atual.
- Navegação hash mantida. Avaliado React Router: não é necessário para preservar o contrato hash simples, e o router declarativo local não acrescenta dependências.
- Cálculos e regras JS existentes reutilizados; frontend novo com TypeScript strict, JSX e estado React. Sem biblioteca visual, Tailwind ou biblioteca de estado.
- Firebase modular npm resolvido no build, mantendo módulos de dados existentes. Fixtures apenas no modo explícito `test`.

## Responsáveis

- Coordenador: dependências/lockfile/configuração, app, integração, PWA e verificação final.
- Apresentação: cartas, pódio, estatísticas, perfil, entrada; depois administração de eventos.
- Funcionalidades: jogos, avaliações, missões, eventos públicos, notificações e apoio; depois auditoria/cartas administrativas.
- Fidelidade: capturas antes/depois, chrome, overlays e administração geral.

## Critérios de promoção

Todas as rotas integradas, sem fallback para HTML legado nas áreas React; TypeScript e build aprovados; testes de lógica/regras/backend pertinentes; tarefas reais de UI; comparações nos quatro temas e larguras 1440/768/390/320; Hosting/PWA/push; nenhuma alteração publicada em produção.

## Estado

Continuação em 16/10/2026: a entrada de desenvolvimento (`npm run dev`) passou para Vite e `build:hosting` passou a preparar o frontend React em `.firebase/site`. A versão anterior permanece no repositório e em `dev:legacy`, e o snapshot visual original continua intacto. Não foi executado qualquer deploy.

Concluído e confirmado: rotas React integradas, carregamento modular das áreas administrativas, preservação dos cálculos/serviços Firebase, PWA, push e editor especializado Card Lab. As interfaces usam JSX; o Card Lab mantém o seu motor imperativo numa fronteira isolada e documentada, conforme a exceção prevista no pedido original. React gere montagem, permissões, navegação, menu e desmontagem; o editor preserva geometria, importação/exportação, histórico e desenho existentes.

Correções da continuação: navegação bloqueada quando falha a gravação de rascunhos; formulário/hash e dados preservados para retry; menus administrativos repostos nas páginas específicas; controlos de instalação/tema repostos na entrada sem sessão; expiração automática de cartas e conclusão da instalação sincronizadas com a interface; toasts do editor encaminhados para o renderer React; proteção do servidor Vite contra caminhos codificados fora dos assets públicos.

Verificações recuperadas sem repetição desnecessária: 83 testes de lógica, 29 de regras Firestore e suite backend aprovada no emulador (saída de sucesso confirmada no registo existente). Backend, regras e módulos de cálculo não foram alterados na continuação.

Verificações da continuação: TypeScript strict, análise de imports não utilizados, build de produção, sintaxe ES Modules, documentação, fluxos React de apresentação/funcionalidades/administração, modais/teclado, navegação direta/refresh/histórico, instalação concluída, login/logout, privacidade do servidor local e Hosting real no emulador aprovados. PWA repetida devido às alterações da integração: raiz e subpasta, instalação, offline, exclusão de dados privados da cache e atualização aprovados (`.firebase/migration-pwa-validation.log`). Hosting aprovado em `.firebase/migration-hosting-validation.log`.

Referências e verificações visuais: consultar `docs/migration-fidelity.md`; novas comparações em `artifacts/migration/resume-*`, sem substituir baseline. Testes de apresentação em `tests/react-presentation.mjs`, funcionalidades em `tests/react-features.mjs`, navegação em `tests/migration-navigation.mjs`. O agregado `test:ui` usa os testes React; suites browser anteriores permanecem disponíveis como referência.

Entrega local concluída. O menu do apoio administrativo foi corrigido e recapturado nas 16 combinações (0% de diferença). O editor de eventos foi comparado em 36 estados adicionais: votação, competição e missão; cinco passos e preview; 320/1440 px. Foram corrigidas diferenças de ordem, agrupamento e texto; dimensões e campos finais coincidem, sem erros ou overflow, com diferença residual máxima de 0,024%. Referências e tentativas anteriores continuam preservadas.

Build final de produção, `check` (incluindo TypeScript strict e imports sem uso) e `test:docs` aprovados após as correções. O resultado está preparado em `.firebase/site`, com inventário/hash PWA e verificação de ausência de código privado. O Hosting emulado já confirmou cabeçalhos, bundles e bloqueio de ficheiros internos; as alterações posteriores afetam componentes, não a configuração de Hosting.

Teste adicional `tests/migration-push.mjs` aprovado na interface React: pedido de permissão durante o gesto, ativação, envio de teste, reconexão, cancelamento da subscrição e orientação quando a permissão está bloqueada. Usa o mock estabelecido em `tests/push-ui.mjs` e fixtures locais; não envia notificações reais.

Sem pendências conhecidas de implementação ou regressões relevantes nas áreas verificadas. Limitações de ambiente: Chromium/Edge e fixtures; não foram certificados Safari, entrega push em aparelhos reais, autenticação de produção ou upload binário real. Estes limites não foram apresentados como verificações executadas. Nenhum dado real foi alterado, nenhum ficheiro existente foi apagado e nenhum deploy foi executado.

## Executar e validar

`npm run dev` inicia Vite em `http://127.0.0.1:5173`; usa o Firebase configurado. Para demonstração isolada, `npm run dev:react:test`. `npm run build` gera o Hosting e `npm run preview` permite rever esse build.

`npm run check`, `npm test`, `npm run test:ui`, `npm run test:visual`, `npm run test:pwa`, `npm run test:hosting` e `npm run test:docs` são os comandos principais. Regras/backend mantêm `test:rules` e `test:backend` com emuladores. No PowerShell deste ambiente, usar `npm.cmd`.

Publicação necessária apenas quando autorizada pelo utilizador: `npm run deploy:frontend`. Não há alterações de funções ou regras a publicar nesta migração.

## Ambiente

Correção posterior de `npm run dev`: o utilizador apresentou um ecrã sem estilos. No servidor em execução, os quatro CSS respondiam corretamente e um browser novo apresentava o layout esperado; a interferência de cache/service worker foi tratada como hipótese, não como estado diretamente inspecionado no browser do utilizador. O arranque DEV agora remove exclusivamente o worker `sw.js` e as caches `peladinhas:SCOPE:` desta aplicação, recarregando antes de montar React se ainda houver controlo por esse worker. Não altera dados nem caches de outras aplicações; produção não executa esta limpeza. Os assets do servidor Vite usam `Cache-Control: no-store`.

`node tests/development-cache.mjs` reproduziu um worker antigo que devolve CSS vazio: a aplicação recuperou o estilo, manteve a cache de outra aplicação e não apresentou overflow ou erros JavaScript em 390 px. Screenshot inspecionada em `.firebase/dev-cache-fixed-390.png`; desktop também verificado num browser novo. Build de produção aprovado após a correção. Para um documento antigo já retido pelo worker, reiniciar o servidor e usar Ctrl+F5 permite carregar o novo arranque.

- Node disponível: 24.16.0; o projeto pede Node 22. Usar Node 22 na validação de release.
- PowerShell bloqueia `npm.ps1`: usar `npm.cmd` neste ambiente.
- Git exige `git -c safe.directory=C:/Users/Joao/Desktop/Projetos/peladinhas-cards ...` por diferença de proprietário no sandbox; configuração global não foi alterada.
- Referência técnica confirmada na documentação oficial de Vite, React createRoot e SDK modular Firebase.
