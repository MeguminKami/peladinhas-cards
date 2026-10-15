# Mudança de repositório

[← Documentação](../README.md) · [Arquitetura](../reference/architecture.md) · [Publicação](deployment.md)

## Preparar a cópia

O projeto está atualmente numa pasta do portefólio. Nenhum repositório novo foi criado nem nenhum remoto foi alterado. Para preparar o conteúdo isolado:

```powershell
npm.cmd run test:docs
npm.cmd run export:repo
```

A cópia fica em `.repository-export/peladinhas-cards/`. O inventário fica ao lado, em `.repository-export/inventory.json`. A exportação usa uma lista explícita de entradas; inclui aplicação, servidor, configurações públicas, regras, testes, scripts, documentação, originais de design e lockfile.

O comando `export:repo` valida automaticamente as ligações da documentação antes de copiar.

Não inclui `.git`, `node_modules`, `.firebase`, `test-results`, logs, ficheiros `.env*` ou `.secret*`. O script verifica ainda que o valor da chave VAPID local não aparece em nenhum ficheiro exportado, sem mostrar essa chave.

Esta cópia é uma fotografia do estado atual, incluindo alterações locais. Repetir a exportação depois de modificar o projeto. O script só recria a sua pasta de saída.

## Quando o destino estiver decidido

### Publicar na conta GitHub

No GitHub, abre [New repository](https://github.com/new), escolhe o nome `peladinhas-cards` e a visibilidade pretendida. Cria o repositório vazio, sem adicionar README, licença ou `.gitignore`: esses ficheiros já acompanham o projeto.

Se estiveres a usar a cópia com o primeiro commit preparado em `.repository-export/github/peladinhas-cards`, abre um terminal nessa pasta e executa:

```powershell
git push -u origin main
```

O Git pode pedir autenticação no GitHub pelo browser. Confirma antes com `git remote -v` que o destino corresponde à tua conta e ao nome escolhido. Para alterar o destino:

```powershell
git remote set-url origin https://github.com/TEU_UTILIZADOR/TEU_REPOSITORIO.git
```

Depois do envio, clona o novo repositório para uma pasta de trabalho definitiva fora do portefólio. A cópia de preparação pode continuar guardada até confirmares o conteúdo no GitHub. O projeto original e o histórico do portefólio ficam preservados.

Mudar apenas o repositório conserva o site em `https://pedalinhas-cards.web.app`, o projeto Firebase e as instalações existentes. Não é necessário ativar GitHub Pages. A chave privada VAPID e outras credenciais ficam fora do Git; a configuração do Secret Manager continua a ser uma operação separada.

Copiar o conteúdo da pasta exportada para a raiz do novo repositório, preservando os ficheiros ocultos `.gitignore` e `.firebaserc`. O `README.md` é a capa; a documentação e imagens usam caminhos relativos e acompanham a cópia.

Instalar com `npm ci`, validar `check`, `test:docs` e os testes adequados. Só depois criar o commit e associar o remoto escolhido. Não transportar o histórico Git do portefólio por acidente; preservar histórico ou iniciar uma história nova é uma decisão para o momento da migração.

## O que rever antes da primeira publicação

| Elemento            | Verificação                                                                                                                                                                 |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL da apresentação | O botão da demo no README deve apontar para o destino efetivamente publicado.                                                                                               |
| Firebase            | `js/config.js` e `.firebaserc`: conservar o projeto existente ou decidir uma instalação nova.                                                                               |
| Authentication      | Autorizar o novo domínio. O domínio técnico dos usernames existentes permanece igual.                                                                                       |
| Hosting/PWA         | Publicar `.firebase/site`, obtido com `build:hosting`; caminhos e cache usam o âmbito relativo.                                                                             |
| Web Push            | Atualizar `allowedPushScope` em `functions/push.js` para a nova origem/subpasta. Se mudar o projeto Firebase, atualizar também o endpoint permitido em `js/push-worker.js`. |
| VAPID               | Manter `js/push-config.js` e recuperar a chave privada correspondente por transferência segura, fora do Git. Preservar a versão no Secret Manager se o projeto for o mesmo. |
| Conta Firebase CLI  | Fazer login e confirmar permissões do projeto; não copiar credenciais da CLI para o repositório.                                                                            |
| CI/publicação       | Configurar depois de conhecer o repositório e alojamento; nenhuma automação de produção é inventada nesta preparação.                                                       |

Uma mudança de origem não transporta instalações PWA, localStorage, IndexedDB, sessões nem subscrições push do domínio antigo. Os utilizadores terão de abrir/instalar e ativar notificações na nova origem. Mudar apenas o repositório mantendo a URL pública não altera essa origem.
