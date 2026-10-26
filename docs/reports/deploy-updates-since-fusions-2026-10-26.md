# Publicar atualizações desde as fusões · 26/10/2026

## Âmbito revisto localmente

Commit indicado pelo utilizador: **`b3af042`**, `feat: add new path fusions and ultimate requirements; update weekly close schedule`. A comparação usa o seu pai (`b3af042^`), incluindo esse commit, os posteriores até `58de9e1` e as alterações locais desta conversa. Não foi consultada a configuração publicada na cloud, pelo que este relatório identifica o que deve ser publicado para cobrir esse intervalo, sem afirmar que cada recurso está desatualizado no servidor.

O intervalo inclui fusões/Ultimate e fecho semanal, missões e prazos de notificações, coleção e catálogo, Sucata, mínimos de avaliações, cache do início e respetivos sinais, processamento horário de feedback, integração do casino e carteira/sessões. O trabalho local acrescenta a remoção da penalização de inatividade, progressão v2 e o guia em Jogadores.

Áreas necessárias:

- **Firestore rules:** novos acessos de leitura aos sinais `homeSignals` e `eventSignals`.
- **Functions:** 64 exports atuais identificados nominalmente. O intervalo altera `functions/policy-runtime.js` e módulos partilhados consumidos pelas famílias de funções, incluindo manutenção, notificações, push, recuperação de conta e casino. O deploy só de `deploy:progression` não cobre todo este conjunto.
- **Hosting:** interface, assets, catálogo, guia, PWA e slot integrada.

Não há diferenças em `storage.rules` ou `firestore.indexes.json` neste intervalo; esses seletores não entram no plano. Os ficheiros novos locais, ainda não commitados, também são publicados a partir do disco. Não é necessário fazer commit para executar o deploy.

## Um comando para publicar

Na raiz do projeto:

```powershell
npm.cmd run deploy:updates
```

O script valida a configuração, correspondência das Functions exportadas, sintaxe, documentação, os testes de `npm.cmd test` e o build. Depois publica, em sequência:

1. Regras Firestore.
2. Oito grupos de Functions, até oito Functions por grupo.
3. Frontend e PWA.

As dez etapas usam o projeto explícito `pedalinhas-cards` e seletores explícitos. O script usa a CLI já instalada localmente. Não executa um deploy global, não força remoções, não faz tentativas automáticas de contornar faturação e não altera quotas.

Se faltarem dependências depois do pull:

```powershell
npm.cmd ci
npm.cmd ci --prefix games/futebol
```

### Rever o plano sem cloud

```powershell
npm.cmd run deploy:updates -- --plan
```

Imprime os comandos exatos `npx.cmd firebase deploy --project pedalinhas-cards --only "…"` de cada etapa. Este modo não chama a CLI Firebase nem as APIs Google e não executa deploy. O manifesto auditável é [`scripts/deploy-updates.json`](../../scripts/deploy-updates.json); a implementação é [`scripts/deploy-updates.mjs`](../../scripts/deploy-updates.mjs).

### Retomar depois de um erro

O script para no primeiro erro e mostra o número da etapa. Por exemplo:

```powershell
npm.cmd run deploy:updates -- --from-stage 5
```

Repete a etapa 5 e continua até ao fim, sem voltar a executar as publicações das etapas 1–4. As verificações locais repetem-se. Uma etapa com erro pode ter publicado parte do seu grupo; o script não a marca como concluída nem afirma rollback. Repetir o grupo permite à CLI verificar/atualizar as suas funções.

O erro Cloud Billing 429 reportado é um limite de frequência. O plano em grupos reduz o número de Functions publicadas em paralelo, mas não garante eliminar esse limite específico. Se reaparecer, aguardar 2–3 minutos sem outros deploys e retomar a etapa indicada. Não iniciar vários comandos de deploy ao mesmo tempo.

## Depois da publicação

Executar **Recalcular liga** na administração para atualizar cartas abertas e remover penalizações antigas de inatividade ainda guardadas. Jogos encerrados desde 26/10 usam v2; anteriores conservam a fórmula da sua data. Semanas fechadas não devem ser reescritas. A base comunitária continua variável, pelo que votos a zero continuam a exigir uma decisão separada sobre validação; publicar este conjunto não remove avaliações existentes.

## Validação realizada

- Comparação local do histórico e dos ficheiros desde `b3af042^`.
- Dois testes do plano passaram: cobertura integral sem repetições, seletores/codebase, máximo de oito por grupo, exclusão de Storage/índices e validação de retoma.
- Execução de `--plan`: 64 Functions e dez etapas, sem pedidos cloud.
- Ligações da documentação validadas com `npm.cmd run test:docs`.

Não foi executado deploy, recálculo real, consulta de dados Firestore/Storage ou verificação do estado publicado para preparar este plano.
