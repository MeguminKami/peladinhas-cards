# Testes e validação

[← Documentação](../README.md) · [Desenvolvimento](development.md) · [Publicação](deployment.md)

## Escolher pelo tipo de alteração

Os scripts npm existentes estão em `package.json`. Os ficheiros `.mjs` indicados abaixo são executados diretamente com Node e não pressupõem um alias npm adicional.

| Alteração                       | Verificação inicial                                        |
| ------------------------------- | ---------------------------------------------------------- |
| Módulos JavaScript              | `npm.cmd run check`                                        |
| Cálculos e regras do produto    | `npm.cmd test`                                             |
| Markdown e referências locais   | `npm.cmd run test:docs`                                    |
| Permissões Firestore            | `npm.cmd run test:rules`                                   |
| Servidor                        | `npm.cmd run test:backend` ou cenário dirigido no emulador |
| Navegação e interface geral     | `npm.cmd run test:ui`, `npm.cmd run test:review`           |
| Instalação, cache e atualização | `npm.cmd run test:pwa`                                     |
| Notificações                    | `npm.cmd run test:push`, testes backend/regras pertinentes |
| Pacote público                  | `npm.cmd run test:hosting`                                 |

Testes adequados à mudança devem passar antes da publicação. Não interpretar a execução de um cenário dirigido como execução de toda a suite de backend ou de todas as rotas.

## Variedade de missões dos percursos

```powershell
npm.cmd run test:paths:variety
npm.cmd run test:paths:variety:ui
npx.cmd firebase emulators:exec --config firebase.backend.json --project demo-peladinhas-variety --only firestore "node --test --test-concurrency=1 tests/path-variety.backend.test.js"
```

Cobrem catálogo v4, condições compostas, sorteio diverso, compatibilidade, janela de votos e integração com a abertura/fecho do jogo. O browser usa dados fictícios e verifica as condições nas propostas, preparação, tentativas e revisão administrativa. Resultados datados e limitações no [relatório de variedade](../reports/path-variety-2026-10-19.md). Para uma alteração isolada, executar apenas os cenários afetados ou ainda não validados.

## Regressões de cartas e Card Lab

```powershell
node tests/card-lab.mjs
node tests/card-lab-elements.mjs
node tests/card-lab-admin-photo.mjs
node tests/card-lab-lighting.mjs
node tests/card-lab-state.mjs
node tests/card-symbols.mjs
node tests/weekly-comparison.mjs
npm.cmd run test:card-collection
```

Cobrem catálogo e modelos nativos, 50 paletas, galerias de elementos, fotografia do ADMIN, iluminação/traçado, projetos e migração de fundos antigos, símbolos e comparação semanal permanente. Não há dependência de instalar DIN/Posterama para verificar o uso correto dos fallbacks.

## Feedback e guarda-redes

```powershell
npm.cmd run test:feedback
node tests/goalkeeper-ui.mjs
node --test tests/logic.test.js
npm.cmd run test:rules
```

O formulário cobre estrelas, zero, N/A, teclado/toque, rascunhos, submissão, prazo de edição, equipas e temas. O cenário de guarda-redes verifica N/A bloqueado nos colegas, explicação visível e restantes dimensões editáveis. As regras verificam que uma autoavaliação submetida com N/A impede novas notas numéricas de colegas.

Para a integração específica do agregado e correção administrativa:

```powershell
npx.cmd firebase emulators:exec --config firebase.backend.json --project demo-peladinhas-backend --only firestore "node --test --test-name-pattern=goalkeeper tests/backend.test.js"
```

O cenário valida a média nula, contagem zero, indicador público `goalkeepingEligible: false` e normalização da correção administrativa. A lógica pura testa também votos anteriores, ordem das respostas, rascunhos e zero válido.

## Resultados, jogos e início

```powershell
node tests/mobile-event-results.mjs
npm.cmd run test:game-layout
npm.cmd run test:home-card
node tests/home-podium-fit.mjs
```

Os resultados de eventos usam nomes e recompensas longas. O teste de jogos verifica layout e controlos em 1440/768/390/320 px e preservação do estilo das cartas dentro das equipas. O teste do início compara a altura dos painéis com diferentes quantidades de missões. O pódio verifica três lugares, diferença de altura das bases e enquadramento em janelas de PC, incluindo 1366×768 e 1280×720.

## Notificações

```powershell
npm.cmd run test:push
npm.cmd run test:game-ratings
node tests/push-home-prompt.mjs
node --test tests/push-config.test.js
```

O worker usa IndexedDB real no browser com transporte simulado. A cobertura inclui clientes abertos/fechados, deduplicação, expiração, leituras e destinos permitidos. O popup testa ausência de pedido nativo antes do clique, adiamento, contas separadas, teclado, redução de movimento e ativação.

A correspondência de chaves cloud é uma verificação operacional distinta:

```powershell
node scripts/setup-push.mjs --verify-cloud
```

Exige autenticação/autorização no projeto real, apenas consulta e compara, e não deve ser confundida com um teste isolado. Não imprime a chave privada. Não executar escritas cloud como parte de testes locais.

## Browsers, dispositivos e dimensões

Os scripts usam Edge no Windows quando configurado e Chromium nos restantes ambientes. Para instalar os motores necessários:

```powershell
npx.cmd playwright install chromium
npx.cmd playwright install webkit
node tests/review.mjs --webkit
node tests/feedback.mjs --webkit
node tests/push-worker.mjs --webkit
```

Instalar e executar com o mesmo `PLAYWRIGHT_BROWSERS_PATH`, caso esteja definido. Não depender de um caminho de cache específico de outro computador.

Rever desktop, uma largura intermédia próxima de 768 px e mobile de 320/390 px. Acrescentar nomes/números longos, estados vazio/carregamento/erro, painéis abertos, foco por teclado e `prefers-reduced-motion`. Os cenários de review incluem também larguras e orientações adicionais definidas no próprio script. As capturas ficam em `test-results/`; alguns testes de push guardam evidências em `artifacts/push/`.

WebKit no computador ajuda a detetar diferenças de Safari, mas não substitui um iPhone físico. Conferir também a interface renderizada: sintaxe ou build sem erros não validam contraste e espaçamento.

## Emuladores e fixtures

`test:rules` usa o Firestore de `firebase.json` com um projeto `demo-*`. `test:backend` usa `firebase.backend.json`, cuja porta Firestore é 8086. As regras usam a porta 8085 na configuração atual. São necessários Java 21 e as dependências do projeto. Confirmar o processo dono de uma porta ocupada antes de iniciar ou encerrar emuladores.

Os testes de regras apagam os dados do projeto emulado. Os testes de UI substituem Firebase/Auth por fixtures e não usam contas de produção; a navegação pode manter dados em cache, pelo que uma alteração das fixtures deve ser seguida de refresh do contexto antes da leitura. O teste de feedback faz isso explicitamente.

## Limites da evidência

Os testes de backend injetam um transportador push simulado e não enviam alertas reais. Instalação nativa, permissões do sistema, entrega Apple/Google, IAM e faturação exigem confirmação nos ambientes correspondentes.

O [relatório de interface](../reports/path-interface-2026-10-19.md) e o [relatório v4](../reports/path-variety-2026-10-19.md) distinguem os conjuntos efetivamente executados. Para publicação, seguir os [seletores por área](deployment.md); testes ou comandos documentados não equivalem a um deploy.

## Regressões da interface compacta dos percursos

Usar `npm.cmd run test:paths:variety:ui` para as interações afetadas. Rever missão de meta única e composta, propostas antigas, preparação a 0%/75%, fase congelada/em avaliação, atributos com limite atingido, fusão com duas recompensas, carta final e remoção da escolha. O resumo só deve mostrar detalhes quando existe tentativa e a ligação deve abrir o nó correto, mesmo após explorar outro percurso.

Na composição, confirmar **A tua missão · No próximo jogo**, tema da raridade, objetivo legível, recompensa sem caixa, par atributo/valor com tipografia uniforme e avisos **Se falhares** / **Podes mudar**. Verificar também setas entre nós, limites de texto/valores, 1440/768/390/320 px, quatro temas, foco, teclado e redução de movimento. Os scripts ad hoc e as capturas em `test-results/` são evidência local, não uma suite portátil garantida após exportação. Não repetir suites sem relação com a alteração; resultados datados no [relatório de interface](../reports/path-interface-2026-10-19.md).
