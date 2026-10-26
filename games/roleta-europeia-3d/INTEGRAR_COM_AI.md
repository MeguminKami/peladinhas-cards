# Integração no website principal

Blackjack e roleta usam **o saldo do website**, sem nome nem símbolo de moeda. O SDK integrado não atribui saldo inicial, não faz top-up e não usa saldo de demonstração como alternativa se o website falhar. A mesma carteira pode servir os dois jogos.

## Montagem por SDK

Servir `dist/sdk/` por HTTP(S), preservando o CSS e os chunks `three-*.js`. Carregar `blackjack.css` ou `roleta.css`. O website fornece o identificador estável do jogador autenticado e os seus próprios endpoints:

```js
import {mount, createHttpWallet} from './sdk/blackjack.js'; // ou roleta.js
const wallet = createHttpWallet({
  game: 'blackjack', // 'roulette' para a roleta
  balanceUrl: '/api/games/balance',
  settleUrl: '/api/games/settle',
  headers: () => ({'X-CSRF-Token': website.csrfToken})
});
const handle = mount(document.querySelector('#game'), {
  mode: 'integrated', playerId: String(website.authenticatedUser.id), wallet
});
await handle.ready;
// Quando o saldo mudar fora do jogo:
const refreshed = await handle.updateBalance();
// false: existe animação/pedido pendente; voltar a tentar quando ficar livre.
const status = handle.getSessionStatus();
// Antes de mudar de jogo ou de rota:
if (handle.canLeave()) handle.destroy();
// handle.expand() mantém a instância e carteira.
```

O adaptador usa cookies da mesma origem, `cache: no-store`, JSON e `Idempotency-Key`. Aceita endpoints e cabeçalhos configuráveis, incluindo função assíncrona para renovar CSRF. Para uma API noutra origem, configurar CORS restrito e `credentials: 'include'` quando esse for o contrato do website. Nenhuma credencial fica embutida no jogo.

`mode: 'integrated'` exige carteira e playerId; configuração incompleta falha antes de montar. O saldo aparece como `—` até ser confirmado. Zero é válido e permanece zero. `ready` rejeita se a primeira sincronização falhar; os controlos continuam bloqueados e permitem recuperar. O playerId apenas separa sessões locais; a API obtém a identidade pela autenticação do website.

Também é possível fornecer diretamente `{getBalance, settle}`, sem o adaptador HTTP. Os dois SDKs exportam Wallet, WalletOperation, MountOptions, HttpWalletOptions, WalletDeclinedError e BALANCE_SCALE.

## Valores sem moeda

Os montantes da API são **inteiros não negativos**, exceto `entries[].amount`, que tem sinal. A escala fixa é `BALANCE_SCALE = 100`:

| API | Apresentação |
|---:|---:|
| 0 | 0,00 |
| 20 | 0,20 |
| 12550 | 125,50 |

Não enviar números decimais, texto formatado, nome de moeda ou símbolo. O website converte o seu armazenamento para esta escala na fronteira da API, mantendo aritmética inteira. Fichas, mínimos, regras e pagamentos mantêm a mesma escala.

## Endpoints que o website deve implementar

Os URLs são configuráveis. Este repositório entrega o cliente e o contrato; não contém o backend do website principal.

### Saldo

`GET /api/games/balance` autenticado, sem cache:

```json
{"balance":12550}
```

### Operação atómica

`POST /api/games/settle`, com Idempotency-Key igual a operation.id:

```json
{
  "game":"roulette",
  "operation":{
    "id":"identificador-persistido-unico",
    "debit":1500,
    "credit":36000,
    "entries":[
      {"id":"1:debit","amount":-1500,"label":"Apostas"},
      {"id":"1:credit","amount":36000,"label":"Retorno"}
    ]
  }
}
```

Resposta de sucesso, incluindo numa repetição da mesma operação:

```json
{"balance":47050}
```

Neste exemplo, o saldo anterior era 12550: `12550 - 1500 + 36000 = 47050`.

O backend deve autenticar, validar jogo/montantes, verificar que as somas das entries correspondem a debit/credit e aplicar as suas regras de autorização. Deve serializar por conta, verificar saldo >= debit antes do retorno, debitar/creditar numa única transação e guardar o recibo por conta e ID. Mesmo ID e conteúdo devolvem o recibo original; conteúdo diferente com o mesmo ID é rejeitado. Não confiar em identidade, saldo, resultado ou crédito propostos pelo browser; a autoridade é o website. Os motores puros em src/engine.ts e regras versionadas estão incluídos para validação pelo integrador. Não foi implementada aqui a autoridade de sorteio/estado do servidor do website.

Blackjack pode enviar entrada inicial, extras de seguro/split/double e retorno em operações distintas; uma ação pode agrupar extra e retorno. Roleta envia custo do plano e retorno na mesma operação. O site não deve lançar um segundo débito/crédito por fora de settle.

### Rejeição confirmada sem aplicação

Só quando garante que **não aplicou** a operação, o backend pode devolver HTTP 4xx:

```json
{"applied":false,"balance":200,"error":"Saldo insuficiente"}
```

O SDK abandona apenas o candidato recusado, mantém cartas/RNG/estado anteriores e usa o saldo confirmado, permitindo corrigir a aposta. Uma tentativa posterior terá um novo ID. Uma carteira personalizada deve lançar `new WalletDeclinedError(message, balance)` apenas com essa mesma garantia.

### Timeout, 5xx ou resposta ambígua

Mantêm a operação pendente e bloqueiam nova ação. «Recuperar» reenvia exatamente o ID e conteúdo persistidos, inclusive após reload. Não eliminar pedidos pendentes, inventar saldo local ou sortear outro resultado como recuperação. IDs de sessão/operação evitam reutilização depois de limpar o armazenamento.

## Iframe

`iframeWallet(hostOrigin, window.parent)` mantém o contrato RPC atelier-wallet-v1. Usar origem exata, sem `*`; cliente e host validam origem e event.source.

- Pedido: `{channel, requestId, method:'balance'|'settle', operation?}`.
- Sucesso: `{channel, requestId, ok:true, balance}`.
- Erro ambíguo: `{channel, requestId, ok:false, error}`.
- Rejeição garantida: acrescentar `applied:false` e, opcionalmente, balance válido.

O host resolve a conta autenticada. Ao remover, chamar wallet.destroy() e handle.destroy(). A integração direta por SDK é o caminho mais simples quando ambos estão no mesmo website.

## Exemplos e entrega

`examples/website-host.html` demonstra a troca de jogos com a mesma API e um cabeçalho de saldo controlado pelo host. Definir window.ATELIER_WEBSITE com playerId autenticado, endpoints e CSRF. Em cada ZIP, host-website.html usa o SDK compilado e o mesmo contrato. Estes exemplos não criam saldo nem simulam o backend.

host-exemplo.html é apenas demonstração local da interface Wallet; a sua carteira local não deve ser usada em produção. Sem wallet e sem modo integrado, o standalone continua disponível para demonstração/testes.

Antes de publicar: ligar endpoints reais, validar autenticação/CSRF, saldo zero, concorrência entre jogos, recusa sem aplicação, timeout após aplicação, reload e mudança de conta. Cada ZIP é autónomo e contém recursos locais, código, testes, build, SDK e documentação. Nenhum website externo foi publicado ou alterado nesta entrega.
