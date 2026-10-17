# Desenvolvimento local

[← Documentação](../README.md) · [Arquitetura](../reference/architecture.md) · [Testes](testing.md)

## Arranque rápido

| Requisito              | Quando é necessário                                          |
| :--------------------- | :----------------------------------------------------------- |
| **Node.js 22**         | Instalar dependências, executar scripts e servir o frontend. |
| **Java 21**            | Testes com emulador Firestore.                               |
| **Python + fonttools** | Apenas para regenerar fontes.                                |

```powershell
npm.cmd ci
npm.cmd run dev
```

**Abrir:** `http://localhost:8080` · **Outra porta:** `npm.cmd run dev -- --port 8081`

```mermaid
flowchart TB
    classDef default fill:#11251d,stroke:#42e66c,color:#f4f7f5,stroke-width:1px;
    A["Editar"] --> B["Verificar sintaxe e lógica"]
    B --> C["Rever no browser"]
    C --> D["Corrigir e validar"]
```

> **Frontend local não significa Firebase emulado.** O servidor usa a configuração de `js/config.js`. Para explorar sem dados reais, usar os [testes com fixtures](testing.md).

| Guardar no Git                           | Manter local                                                     |
| :--------------------------------------- | :--------------------------------------------------------------- |
| Código, regras, documentação e lockfile. | `.secret.local`, dependências, builds, logs e capturas de teste. |

Os comandos usam `npm.cmd` no Windows; em macOS/Linux, usar `npm`.

---

<details>
<summary><strong>Procedimentos completos e detalhes técnicos</strong></summary>

## Ambiente

O projeto usa HTML, CSS e ES Modules diretamente no browser. Não precisa de um bundler para desenvolvimento. Os scripts e o servidor usam **Node.js 22**, conforme `package.json`. Os emuladores Firestore precisam de **Java 21** no ambiente usado pelo projeto. A geração de fontes é opcional e usa Python com `fonttools`.

Na raiz do projeto:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre `http://localhost:8080`. O servidor de desenvolvimento serve apenas os ficheiros públicos, incluindo os recursos PWA; não disponibiliza `.secret.local`, código de servidor ou documentação. A porta pode ser alterada com `npm.cmd run dev -- --port 8081`.

Em macOS/Linux, usa `npm` em vez de `npm.cmd`. Um servidor HTTP é necessário; abrir `index.html` com `file://` não carrega os módulos corretamente.

## Firebase

A configuração pública da Web App está em [`js/config.js`](../../js/config.js). A instalação existente aponta para **`pedalinhas-cards`**; a grafia do ID não é igual à do nome da aplicação. `.firebaserc` é a associação local e os scripts de publicação usam o ID da configuração explicitamente.

Servir o frontend localmente **não muda o Firebase para emuladores**. A aplicação usa o projeto configurado. Para explorar a interface sem dados reais, usa os testes Playwright e as fixtures locais, descritos no [guia de testes](testing.md).

Para uma instalação independente:

1. Registar uma Web App no projeto Firebase e copiar a configuração para `js/config.js`.
2. Ativar Authentication com Email/Password e autorizar as origens utilizadas.
3. Preparar Firestore e Storage, e publicar regras, índices e Functions pelo [guia de publicação](deployment.md).
4. Criar a primeira conta pela aplicação; para iniciar a administração, definir `users/{uid}.role` como `admin` no Firestore e voltar a iniciar sessão.
5. Rever as origens push e o endpoint de confirmação antes de usar outro projeto ou domínio, conforme o [guia de migração](repository-migration.md).

O login apresenta username e password. O username é convertido internamente num email técnico em `auth.weeklyfc.app`; manter esse domínio numa instalação com contas existentes. Cliente e Functions usam `europe-west1`.

## Alterações que atravessam cliente e servidor

O cálculo de avaliações em `js/utils.js` é importado pelas Functions; alterar esse módulo exige rever os consumidores backend, não apenas o frontend. O esquema do Card Lab em `js/card-design.js` também é validado por `saveTheme` no servidor.

Depois de alterar a regra de guarda-redes, os resumos existentes precisam de **Administração → Manutenção → Recalcular liga** após a publicação. Novas autoavaliações submetidas são processadas por `onFeedback`; cartas de semanas fechadas mantêm os snapshots. Usar fixtures ou emuladores para testar, sem modificar dados de produção.

Para o Card Lab, consultar a [referência dedicada](../reference/card-lab.md); para os scripts de regressão recentes, consultar [testes](testing.md).

## Ciclo de trabalho

Editar o módulo ou estilo correspondente, verificar sintaxe e lógica, e rever o resultado no browser. Para alterações de UI, testar desktop, mobile, os quatro temas e os estados relevantes; compilar sem erros não confirma o layout.

```powershell
npm.cmd run check
npm.cmd test
```

O service worker pode continuar a servir uma versão anterior já instalada. Para trabalhar diretamente sobre os ficheiros, usa um perfil de desenvolvimento separado e desregista o worker em DevTools → Application → Service Workers. Os testes comuns de UI bloqueiam service workers; os testes PWA usam o worker real.

## Ficheiros locais

`node_modules/`, `.firebase/`, `test-results/`, `.repository-export/` e logs são gerados localmente e ignorados pelo Git. `package-lock.json` deve acompanhar o repositório para que `npm.cmd ci` reproduza as dependências.

`.secret.local` contém a chave privada VAPID. Não entra em Git, Hosting, no pacote de Functions nem na exportação do repositório. É necessária uma cópia segura dessa chave para conservar subscrições push existentes; não a substituir por uma nova por conveniência.

</details>
