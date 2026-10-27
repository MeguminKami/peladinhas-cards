# Instruções de desenvolvimento

## Objetivo e esforço

- Resolver o pedido com rigor e o menor trabalho necessário. O padrão é uma execução focada; aumentar o esforço quando o risco o justifica ou o utilizador pede uma análise aprofundada.
- Uma tarefa pequena não deve transformar-se numa auditoria, refatoração ou redesenho. Corrigir a causa dentro do âmbito pedido e preservar o comportamento restante.
- Não confundir poucas linhas com baixo risco: permissões, dinheiro/carteiras, cálculos, persistência e fechos semanais exigem atenção mesmo em alterações curtas.

## Fluxo de trabalho

1. Identificar o resultado pedido e a área afetada. Perguntar apenas se faltar uma decisão que bloqueie trabalho correto; resolver escolhas técnicas rotineiras autonomamente.
2. Localizar com `rg` os símbolos e ficheiros relevantes. Ler trechos dirigidos, o `AGENTS.md` aplicável e as dependências diretas; alargar a pesquisa apenas perante uma dúvida concreta.
3. Implementar nos componentes existentes. Seguir o percurso dos dados e os consumidores afetados quando houver lógica partilhada. Preservar alterações do utilizador e de outras tarefas.
4. Executar a validação proporcional abaixo. Corrigir problemas introduzidos pela alteração e concluir quando houver evidência suficiente.
5. Responder brevemente: resultado, verificações realizadas, limitações relevantes e comando de deploy.

## Evitar desperdício e desvios

- Não reler ficheiros já compreendidos nem repetir pesquisas e testes sem informação nova. Pedir apenas o output necessário; evitar ficheiros/logs inteiros e dumps de dados.
- Não explorar áreas sem relação com o pedido, instalar ferramentas ou criar infraestrutura para uma correção simples. Reutilizar scripts, fixtures e testes existentes.
- Não criar testes que apenas repetem a implementação, capturas sem utilidade ou relatórios por rotina. Criar um teste quando protege uma regra, reproduz uma regressão ou verifica um risco real.
- Depois de verificações suficientes passarem, parar. Ampliar testes apenas por mudança adicional, falha, dependência afetada ou incerteza concreta ainda não resolvida.
- Se uma abordagem falhar, usar a evidência para ajustar a hipótese. Não repetir a mesma tentativa nem mudar ferramentas em ciclo. Explicar um bloqueio real em vez de prolongar trabalho sem progresso.
- Não delegar por defeito. Usar agentes adicionais apenas quando o utilizador pedir delegação ou trabalho paralelo.

## Validação proporcional

Escolher o menor conjunto que verifica o comportamento alterado. Os exemplos orientam a decisão; não são uma lista cumulativa obrigatória.

| Tipo de alteração | Validação esperada |
| --- | --- |
| Documentação ou instruções | Rever conteúdo e ligações; executar `npm.cmd run test:docs` quando houver Markdown/documentação alterada. Sem build, browser ou suite de lógica. |
| Correção pequena de lógica, isolada e de baixo risco | Teste lógico dirigido ao caso alterado e limites relevantes; sintaxe do ficheiro quando útil. Sem browser, emuladores ou suite completa por rotina. |
| Texto ou ajuste visual pequeno num componente existente, sem alterar layout/interação | Revisão local; teste lógico se houver lógica. Não exigir capturas ou testes visuais só porque um ficheiro de UI mudou. |
| Layout, responsividade ou interação relevante | Inspecionar a área renderizada com dados locais; testar o fluxo afetado e os tamanhos que expõem o risco. Normalmente desktop e telemóvel; 320/390/768 px apenas quando grelhas, formulários ou ações o justificarem. |
| Cálculos partilhados, permissões, carteiras, persistência ou ciclos de jogo | Testes de regressão dirigidos, consumidores e casos de fronteira; emuladores locais quando a integração é material. Não substituir estes testes por revisão visual. |
| Mudança transversal ou pedido explícito de maior rigor | Ampliar a validação às integrações e fluxos afetados; suite geral quando houver motivo concreto. |

- Uma alteração pequena e simples pode ficar concluída com testes lógicos dirigidos, sem validação visual. Se muda geometria ou interação de forma relevante, avaliar o resultado renderizado.
- Em UI relevante, verificar cortes, sobreposições, overflow e estados afetados; teclado, foco e redução de movimento quando a interação mudar. Testar estados extremos pertinentes, sem montar uma bateria universal para cada correção.
- Dizer exatamente o que foi verificado. Se uma validação necessária não foi possível, indicar a limitação; nunca afirmar que houve teste visual, consulta cloud ou deploy sem o executar.

## Firebase e dados reais

- Desenvolvimento e testes usam código, fixtures, snapshots e emuladores locais. Não recorrer à cloud automaticamente quando faltarem dados ou um teste falhar.
- Antes de qualquer leitura da base de dados ou Storage reais, obter autorização explícita e aguardar. Explicar finalidade, coleções/ficheiros e estimativa ou limite de leituras. Se o custo for incerto, propor uma consulta limitada.
- A regra inclui SDK, REST, scripts, callables, auditorias e navegação/testes que façam leituras indiretas. A autorização vale apenas para o âmbito e limite aprovados; não perguntar novamente dentro desse âmbito.
- Ficheiros e emuladores locais não exigem autorização. Não executar deploy por inferir autorização a partir de um pedido de desenvolvimento.

## Contratos do produto

- **Cartas:** antes de criar ou alterar uma carta, ler o [modelo base](docs/reference/modelo-base-carta.md), incluindo previews, catálogo, perfil e histórico. Reutilizar componentes e regras partilhadas para identidade, dados, atributos, evolução, playstyles, propriedade e seleção. Uma aparência nova não autoriza mudar cálculos ou dados existentes.
- Uma mudança autorizada desse contrato exige atualizar o guia e consumidores na mesma tarefa. Preservar snapshots de semanas fechadas; indicar se dados abertos precisam de recálculo.
- Não colocar nomes de edição, tier ou rótulos como «THE ULTIMATE» e «V2» dentro das cartas. A edição identifica-se fora da carta; o tier reconhece-se pelo desenho.
- **Interface:** ao alterar UI, consultar apenas as secções aplicáveis da [referência visual](docs/reference/interface-quality.md). Manter identidade Peladinhas, tokens, componentes, legibilidade, espaçamento e acessibilidade. Não redesenhar a página inteira para corrigir um detalhe.
- **Missões dos percursos:** seguir também a composição e avisos obrigatórios na mesma referência. Compactar sem remover regras de comportamento.

## Documentação e entrega

- Atualizar documentação quando mudar comportamento, contrato ou procedimento; não produzir um relatório novo por cada tarefa pequena.
- Antes de documentar comandos, confirmar os scripts/configuração pertinentes em `package.json` e `firebase.json`. Guias descrevem procedimentos atuais; relatórios registam resultados datados.
- Distinguir implementação, testes locais, configuração cloud verificada e publicação executada. Build/captura não comprova deploy nem entrega push num aparelho.
- Usar sempre `npm.cmd` e `npx.cmd`. Consultar [DEPLOY.md](DEPLOY.md) quando o pedido envolver publicação ou acompanhamento de pendências.
- Terminar cada resposta final com **Deploy:** e a instrução mínima adequada. Sem alterações publicáveis: **Deploy:** não é necessário.
- Preferir o tracker com âmbito explícito para manter os recibos: frontend `npm.cmd run deploy:pending -- --only hosting`; servidor com os seletores exatos `functions:peladinhas:NOME`; regras/índices apenas `firestore:rules`, `firestore:indexes` ou `storage`. Explicar `--initialize` só se necessário; não sugerir inicialização global por defeito.
- Identificar consumidores de módulos partilhados, incluindo todos os passos quando frontend e backend mudam. O tracker ainda pode marcar todas as Functions conservadoramente; isso não prova que todas sejam consumidoras efetivas.
- Se for preciso usar o CLI diretamente, indicar `npx.cmd firebase deploy --only "SELETORES"` e avisar que não atualiza os recibos. Não recomendar deploy completo por defeito nem afirmar publicação sem confirmação.
