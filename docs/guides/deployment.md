# Publicação

[← Documentação](../README.md) · [Testes](testing.md) · [PWA](pwa.md) · [Push](notifications.md)

## Escolher o menor âmbito

Executar na raiz do projeto, com Node.js 22 e acesso ao Firebase **pedalinhas-cards**. Cliente e Functions usam `europe-west1`; a codebase das Functions chama-se `peladinhas`.

| Alteração                                       | Comando                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Só HTML, CSS, JavaScript do navegador ou assets | `npm.cmd run deploy:frontend`                                                                                       |
| Uma função                                      | `npx.cmd firebase deploy --project pedalinhas-cards --only functions:peladinhas:NOME`                               |
| Várias funções                                  | `npx.cmd firebase deploy --project pedalinhas-cards --only "functions:peladinhas:NOME1,functions:peladinhas:NOME2"` |
| Regras Firestore                                | `npx.cmd firebase deploy --project pedalinhas-cards --only firestore:rules`                                         |
| Índices Firestore                               | `npx.cmd firebase deploy --project pedalinhas-cards --only firestore:indexes`                                       |
| Regras Storage                                  | `npx.cmd firebase deploy --project pedalinhas-cards --only storage`                                                 |
| Preparar o frontend sem publicar                | `npm.cmd run build:hosting`                                                                                         |

Combinar apenas os seletores necessários. Quando cliente e servidor mudam, executar ambos os passos. Alterar um módulo partilhado exige identificar também as funções que o consomem.

`npm.cmd run deploy:backend` publica todas as Functions, Firestore e Storage. `npm.cmd run deploy` acrescenta Hosting. São opções amplas para uma instalação ou atualização que realmente exija todas essas áreas; não são o procedimento por defeito de uma correção.

## Preparar e validar

```powershell
npm.cmd ci
npx.cmd firebase login --reauth
npm.cmd run check
npm.cmd test
npm.cmd run test:docs
```

Acrescentar os testes adequados à alteração: emuladores para regras/servidor, browser para interface, PWA para cache/instalação e push para notificações. Os comandos estão no [guia de testes](testing.md). Deploys seletivos diretos pelo CLI não executam automaticamente todos os testes dos scripts npm.

Os scripts `deploy:*` verificam sintaxe e um conjunto de testes de lógica antes de chamar o Firebase. O `predeploy` de Hosting em `firebase.json` executa `build:hosting`; não é preciso preparar manualmente um segundo build para esse fluxo.

## Casos com código partilhado

- **Cache do início e recuperação horária:** publicar `npm.cmd run deploy:home-cache` e depois `npm.cmd run deploy:frontend`. O primeiro usa seletores explícitos de 21 funções e `firestore:rules`; consultar os [consumidores e a validação](../reports/home-read-cache-2026-10-21.md). A cache é criada quando necessária, sem recálculo da liga nem alteração de semanas fechadas.

- **Card Lab:** novos campos ou opções em `js/card-design.js` precisam de frontend e de `saveTheme`, que valida o mesmo esquema no servidor. CSS e mudanças visuais de paletas não exigem publicar Functions.
- **Avaliações e evolução:** `js/utils.js` e os módulos de cálculo/coleção são partilhados. Identificar os consumidores efetivos dos módulos alterados antes de preparar os seletores; o [relatório do update](../reports/path-update-2026-10-18.md) conserva o âmbito histórico daquela alteração, não uma lista universal para qualquer correção.
- **Push:** atualizar a chave privada no Secret Manager exige republicar `pushDeviceAction` e `onNotificationPush`. Atualizar apenas o frontend não ativa a nova versão do segredo nas funções.

Depois de publicar uma mudança de cálculo que afete dados existentes, usar **Administração → Manutenção → Recalcular liga**. A operação atualiza resumos e cartas em evolução; cartas de semanas fechadas conservam os snapshots.

## Configuração e reparação de push

Preservar o par VAPID: chave pública em `js/push-config.js`, privada em `.secret.local` e no Secret Manager. A privada não faz parte de um clone/exportação. Não gerar um par novo para corrigir uma chave cloud incompatível com subscrições existentes.

```powershell
npm.cmd run setup:push
node scripts/setup-push.mjs --verify-cloud
```

O primeiro comando valida o par local existente. Num projeto ainda sem qualquer chave, pode criar o par; não deve ser usado como substituto de recuperar uma privada em falta. O segundo consulta e compara a chave cloud sem apresentar o segredo; exige acesso ao Firebase e não publica nada.

Se for necessário corrigir o segredo, com autorização para essa alteração de produção:

```powershell
npm.cmd run setup:push:cloud
npx.cmd firebase deploy --project pedalinhas-cards --only "functions:peladinhas:pushDeviceAction,functions:peladinhas:onNotificationPush"
```

Se também mudou o cliente, publicar `npm.cmd run deploy:frontend`. Instalações novas precisam das restantes funções/regras pertinentes; ver [push](notifications.md). Consultar erros reais de IAM antes de alterar permissões.

## Pacote público e origens

Hosting publica `.firebase/site`: entradas web, `js/`, `css/`, `assets/`, manifest, worker gerado e página offline. O build calcula o inventário e hash da PWA; documentação, originais, testes, servidor e segredos ficam de fora. O pacote de Functions usa a raiz para poder importar os módulos de cálculo partilhados; as exclusões estão em `firebase.json`.

A aplicação configurada é [pedalinhas-cards.web.app](https://pedalinhas-cards.web.app/). Autorizar as origens em Authentication. Firebase Hosting e GitHub Pages são distribuições independentes: Pages deve receber o conteúdo preparado de `.firebase/site`, mantendo o âmbito da demo. Publicar apenas as funções/regras Firebase que mudaram. Uma nova origem/subpasta exige rever autenticação, âmbito PWA e `allowedPushScope`; ver [migração](repository-migration.md).

## Confirmar depois de publicar

Confirmar login, permissões, fotografias, jogos, avaliações, eventos, cartas e histórico nos fluxos alterados. Rever mobile e desktop, teclado e redução de movimento. Na PWA, confirmar atualização adiada, reabertura e recuperação offline.

Para push, usar **Enviar teste** depois de ativar o dispositivo, verificar o alerta nativo com a aplicação aberta e fechada e confirmar leitura. Mocks, um build e uma chave VAPID válida não comprovam a entrega Apple/Google nem a apresentação no sistema operativo.

```powershell
npx.cmd firebase functions:list --project pedalinhas-cards
npx.cmd firebase hosting:sites:list --project pedalinhas-cards
```

Preparar ficheiros ou escrever estes comandos não os executa. Os [relatórios de validação local](../reports/path-interface-2026-10-19.md) distinguem as verificações realizadas de publicações e verificações cloud.

## Percursos: separar catálogo e interface

As alterações de composição em `js/paths.js`, entrada em `js/missions.js`, navegação em `js/app.js` e `css/paths.css` são frontend: publicar com `npm.cmd run deploy:frontend`. Documentação não exige deploy.

O catálogo v4 altera módulos partilhados e exige também as oito Functions consumidoras identificadas no [relatório v4](../reports/path-variety-2026-10-19.md#publicação-seletiva). Publicar só o frontend não substitui esse passo se o catálogo ainda estiver por publicar. Para esta v4, não houve alteração de regras/índices nem é necessário recalcular dados existentes ou semanas fechadas. O [relatório da interface](../reports/path-interface-2026-10-19.md) não afirma execução de deploy.

O wrapper `deploy:frontend` executa os testes explicitamente listados em `scripts/deploy.mjs`; não equivale a toda a suite `npm.cmd test`, aos testes dirigidos v4 ou à validação visual. Executar os cenários afetados antes da publicação.
