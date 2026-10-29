# Como publicar as alterações

[Projeto](README.md) · [Documentação](docs/README.md) · [Guia técnico](docs/guides/deployment.md)

**Deploy significa enviar as alterações deste computador para a aplicação online.** O registo local acompanha o que publicaste através destes comandos, mesmo depois de várias conversas.

## Um comando para o dia a dia

Depois de trabalhares durante horas ou várias conversas, usa este mesmo comando para publicar. Não precisas de guardar os comandos indicados em cada conversa nem de executar `deploy:status`, `deploy:plan` e `deploy:pending` separadamente.

Na raiz do projeto, executa no PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deploy.ps1
```

O [script](deploy.ps1) mostra as pendências, dá 60 segundos à análise das Functions e publica. Se existir um plano interrompido compatível com os ficheiros atuais e que cubra todas as pendências, retoma esse plano. Caso contrário, prepara um plano novo, preservando os registos das etapas concluídas. Sem pendências, termina sem publicar.

O comando permite executar este script mesmo quando a política local bloqueia `.ps1`, sem alterar permanentemente essa política. Se o teu PowerShell já permitir scripts, podes usar apenas `.\deploy.ps1`.

**Este comando publica de verdade, sem pedir outra confirmação.** Espera por “Plano concluído” e não alteres código enquanto corre. Se der erro, resolve a causa e volta a executar o mesmo comando; não há tentativas automáticas.

Para veres o que faria sem publicar nem aceder à cloud:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deploy.ps1 -Simular
```

Se ainda houver partes sem histórico, o script para e explica. Só quando quiseres também publicá-las, usa:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deploy.ps1 -Inicializar
```

Isso pode publicar todas as partes ainda por confirmar. Não precisas desta opção no uso normal depois da primeira publicação completa. O ajuste de 60 segundos aplica-se à execução do script; o valor anterior do terminal é restaurado no fim.

**Resumo:** no dia a dia, corre o script sem opções; para apenas consultar, acrescenta `-Simular`; usa `-Inicializar` apenas quando quiseres publicar partes que ainda não têm histórico. Se falhar, resolve a causa e volta a correr o script. As etapas concluídas mantêm o seu registo.

Os comandos seguintes são a alternativa manual; não precisas de os executar quando usas o script.

## Se já tens um deploy a correr

**Espera que o terminal termine. Não abras outro deploy ao mesmo tempo.** Os testes iniciais podem demorar e passar algum tempo sem mostrar mensagens.

- **“Plano concluído”**: a publicação desse plano terminou.
- **Erro**: segue a secção “Se der erro” abaixo.
- Publicar só **hosting** atualiza o site; não publica Functions nem regras.

## O que faz cada comando?

| Comando | O que faz | Publica? |
| --- | --- | --- |
| `npm.cmd run deploy:status` | Mostra o que falta publicar segundo o registo deste computador. | Não |
| `npm.cmd run deploy:plan` | Mostra as etapas que seriam publicadas. | Não |
| `npm.cmd run deploy:pending` | Verifica o código, publica pendências e guarda o progresso. | Sim |
| `npm.cmd run deploy:resume` | Continua um deploy interrompido, saltando etapas concluídas. | Sim |

Não precisas de executar todos em sequência. No dia a dia, basta **ver o estado e publicar**.

## Primeira utilização: criar o registo

**Este passo é feito uma vez por alvo neste computador. Se já o começaste, não o repitas enquanto estiver a correr.**

O script não conhece os teus deploys antigos. Por isso mostra **“por confirmar”**. Isso não significa que essas partes estejam avariadas ou em falta na aplicação online.

Quando quiseres publicar todas as partes por confirmar e começar a acompanhá-las, executa na raiz do projeto:

```powershell
npm.cmd run deploy:pending -- --initialize
```

**Este comando publica de verdade.** Pode incluir o site, todas as Functions e regras/índices. A primeira execução pode ser longa.

`--initialize` significa: “publicar também as partes que ainda não têm registo”. Não é apenas configuração nem simulação.

Espera por **“Plano concluído”**. Só as etapas concluídas ficam registadas. Se publicaste apenas o site antes, as restantes partes continuam por confirmar até serem publicadas por este fluxo.

## Depois: a rotina normal

Depois de fazeres alterações, começa por:

```powershell
npm.cmd run deploy:status
```

Lê o resultado:

- **“Sem pendências”**: não precisas de publicar segundo o registo local.
- **“Alterado”**: há ficheiros diferentes da última publicação registada.
- **“Por confirmar”**: essa parte ainda não tem histórico neste computador. Usa o passo da primeira utilização quando quiseres publicá-la.

Para publicar as alterações com histórico:

```powershell
npm.cmd run deploy:pending
```

Espera por **“Plano concluído”**. O script verifica o código antes de publicar e guarda o progresso automaticamente. Para veres as etapas antes de decidir, usa `npm.cmd run deploy:plan`.

## Se der erro

### Se aparecer “Cannot determine backend specification. Timeout after 10000”

O Firebase não conseguiu terminar a identificação das Functions em dez segundos. Para dar até 60 segundos a essa análise e retomar o mesmo plano, executa estas duas linhas no **mesmo terminal PowerShell**:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "60"
npm.cmd run deploy:resume
```

A primeira linha só ajusta o tempo de espera nesse terminal. A segunda retoma a publicação e salta as etapas concluídas. Não precisas de repetir `--initialize`. O ajuste é suportado pelo [Firebase](https://firebase.google.com/docs/functions/tips#avoid_deployment_timeouts_during_initialization).

Se voltar a falhar aos 60 segundos, envia a nova saída; não continues a aumentar o limite. É necessário investigar o carregamento das Functions. Este ajuste não altera o tempo máximo de execução das funções em produção.

### Outros erros

**Não comeces tudo de novo imediatamente.** As etapas que terminaram ficam guardadas.

Se o problema já estiver resolvido e não alteraste código, continua com:

```powershell
npm.cmd run deploy:resume
```

Se disser que os ficheiros mudaram, volta à rotina normal para criar um plano novo. Se ainda houver partes “por confirmar”, usa o comando da primeira utilização.

Erros de permissões/API precisam de correção; erros de quota podem exigir esperar. Se não perceberes o erro, envia a parte final da saída do terminal antes de tentares outros comandos.

## O que precisas de saber

- **Site / Hosting**: páginas, estilos, imagens e código do browser.
- **Functions**: código que corre no servidor.
- **Regras**: permissões de acesso aos dados e ficheiros.
- **Índices**: configuração que suporta consultas à base de dados.

Nesta versão, uma mudança no servidor ou num módulo que ele importa pode marcar **todas as Functions**. A escolha exata dos consumidores por função ainda não está implementada.

O histórico fica em **`.deploy/`** neste computador. Não apagues essa pasta: perderias o registo. Não vai para o Git. Deploys feitos por comandos antigos ou noutra máquina não atualizam este histórico.

Functions que constem do histórico mas já não estejam exportadas no código geram um aviso, sem bloquear a publicação das restantes pendências. Os recibos antigos são preservados. Este fluxo não elimina essas Functions da cloud; essa remoção exige revisão manual separada.

“Plano concluído” confirma o sucesso indicado pelo Firebase. Testar a aplicação nos aparelhos e recalcular dados, quando necessário, são passos separados. Consulta o [guia técnico](docs/guides/deployment.md).

<details>
<summary>Opções avançadas — abrir apenas quando precisares</summary>

Para ver e publicar apenas o site:

```powershell
npm.cmd run deploy:plan -- --only hosting
npm.cmd run deploy:pending -- --only hosting
```

Se ainda estiver “por confirmar”, acrescenta `--initialize` ao segundo comando. Publicar só o site deixa Functions e regras pendentes.

`--only` também aceita `functions`, `firestore:rules`, `firestore:indexes`, `storage` ou um seletor exato como `functions:peladinhas:saveTheme`. Não escolhas uma função isolada sem confirmar os restantes consumidores afetados.

O lote normal tem quatro Functions. Para criar um plano com lotes de duas, usa `npm.cmd run deploy:pending -- --batch-size 2`. São aceites lotes de uma a oito.

Uma etapa com erro pode ter publicado parte do lote. A retoma repete esse lote para o confirmar. Não há tentativas automáticas.

Não edites código durante o deploy. Alterações podem invalidar a retoma. Uma build de Hosting que falhe depois de gerar assets também pode exigir um plano novo.

Se o terminal foi fechado abruptamente, pode ficar `.deploy/running.lock`. Só remove esse ficheiro depois de confirmar que nenhum deploy está ativo. Nunca apagues o histórico para resolver um lock.

Os recibos ficam em `.deploy/state.json`; o plano e progresso em `.deploy/plan.json`. Num clone novo, o estado volta a “por confirmar”.

O script valida sintaxe, regiões, documentação, testes do tracker e os testes configurados em `npm.cmd test`. Para Functions, verifica os módulos gerados do blackjack; se estiverem desatualizados, executa `npm.cmd run build:blackjack:server`, revê as alterações e prepara um plano novo. Essa verificação exige as dependências de `games/blackjack-3d`. Executa também os testes específicos da alteração.

Para testar o mecanismo localmente: `npm.cmd run test:deploy-tracker` e `npm.cmd run test:docs`.

O registo considera ficheiros locais, incluindo alterações sem commit. Mudanças nos scripts e dependências podem marcar publicação de forma conservadora. Não deteta alterações manuais na cloud, segredos, APIs ou IAM; não apaga Functions removidas nem recalcula dados automaticamente.

A preparação local não consulta Firebase. Leituras reais para diagnósticos ou testes continuam sujeitas à autorização prevista no projeto. Os comandos antigos continuam disponíveis, mas não atualizam estes recibos.

</details>
