# Integração da RIFT//CORE no site principal

Matemática atual: **rift-4.15**. Entradas 3→CORE (8 FS), 4→RIFT (10 FS),
5→OVERDRIVE (12 FS), 6→OVERDRIVE (14 FS). Compras usam os mesmos portais;
OVERDRIVE comprado tem 33,33% de chance de 6. Consultar
[pagamentos, probabilidades e RTP atuais](./RTP-v4.15.md).
Atualizar motor e configuração em conjunto no host Node, quando aplicável.
Os bónus usam perfis próprios reforçados de Wilds e poderes, definidos em math-config.js. O ganho da rodada e
o ganho acumulado do bónus são separados; o saldo visual só inclui este
último após continuar no resumo final. A liquidação da carteira não muda.

Este documento é para o agente que gere o site. O pacote inclui a slot e os adaptadores; é necessário ligar o adaptador ao backend, autenticação e base de dados existentes. Não foi feita nenhuma ligação a um site externo nesta entrega.

## Resultado pretendido

- Os valores aparecem apenas como números, por exemplo `1 000,00`, sem `CR`, `€`, `$` ou nome de moeda. A preferência antiga de moeda é ignorada e o seletor foi removido.
- O site é a autoridade do saldo. O iframe não pode criar créditos, escolher os ganhos ou efetuar uma liquidação local.
- O backend calcula cada resultado e confirma o débito e o ganho na mesma transação. O navegador recebe os símbolos/eventos já confirmados e apresenta as animações.
- Apostas: débito por spin pago. Compra de bónus: débito único na confirmação. Free spins: custo zero, com ganhos liquidados pelo backend.
- Preços atuais: CORE 80×, RIFT ASCENSION 220×, OVERDRIVE 450×. Usar sempre a configuração do motor, sem duplicar preços no site.

## Ficheiros do ZIP da aplicação

Extrair o conteúdo para uma pasta pública, por exemplo `/games/rift/`. Preservar as subpastas e os caminhos relativos.

| Ficheiro | Uso |
|---|---|
| `index.html`, JS e CSS da raiz | Aplicação do iframe |
| `site-wallet.js` | Cliente de comunicação da slot com o pai |
| `integration/host.js` | Adaptador a importar/copiar para o frontend do site |
| `integration/round-service.mjs` | Serviço a importar no backend Node.js |
| `integration/server-engine.mjs` | Motor de backend com RNG criptográfico Node |
| `engine*.js`, `math-config*.js` | Dependências de matemática; manter os caminhos relativos |
| `build-manifest.json` | SHA256 dos ficheiros entregues |

`integration/server-engine.mjs` é gerado a partir do mesmo motor de pagamentos. A diferença é o sorteio com `node:crypto.randomInt`, em vez do gerador determinístico da demonstração local. Não importar este módulo no navegador. A resposta do serviço remove seed/estado interno do RNG. Os relatórios de RTP são estimativas, não certificação do sistema integrado.

## 1. Frontend do site

A capa para o catálogo está em `assets/cover/rift-core-overdrive-800x1200.webp`: 800×1200 px, fundo opaco, 244374 bytes (menos de 250 KB). Há também o PNG 800×1200 e o original PNG 1024×1536 na mesma pasta. Mostrar em proporção 2:3, preferencialmente `object-fit: contain`; evitar recortes que atinjam o logótipo. Margem segura de 8%, sem texto essencial no canto superior esquerdo. Estes ficheiros já estão no ZIP.

Copiar `integration/host.js` para os módulos do site ou servir o módulo na mesma origem do site. Criar o iframe e montar o adaptador:

```html
<iframe id="rift" title="RIFT CORE" allow="fullscreen; autoplay"
        allowfullscreen style="width:100%;height:900px;border:0"></iframe>
```

```js
import {mountRift} from '/integrations/rift-host.js';

const destroyRift = mountRift({
  iframe: document.getElementById('rift'),
  gameUrl: '/games/rift/index.html', // também pode ser uma origem diferente
  request: async (action, payload, operationId) => {
    const response = await fetch('/api/games/rift', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        // Incluir aqui o mecanismo CSRF habitual do site, se aplicável.
      },
      body: JSON.stringify({id: operationId, action, payload}),
    });
    const body = await response.json();
    if (!response.ok) {
      const error = new Error(body.error?.message || 'Operação recusada');
      error.code = body.error?.code;
      error.publicMessage = body.error?.message;
      throw error;
    }
    return body;
  },
  onBalance: balance => {
    // Atualizar o saldo no cabeçalho do site; balance é um número sem moeda.
    updateSiteBalance(balance);
  },
  onError: error => console.error(error),
});

// Ao desmontar a página: destroyRift(). Ao trocar de utilizador, destruir e
// recriar o iframe. Não reutilizar a sessão visual de outro utilizador.
```

O adaptador acrescenta automaticamente `?wallet=host&parentOrigin=<origem-exata-do-site>`. Não usar `*` no postMessage. Ambos os lados validam a origem e a janela remetente. `parentOrigin` não é uma credencial: a autenticação continua no backend do site.

Um iframe sem `demo=1` exige a ligação ao site. Se faltar configuração ou o site não responder, o jogo não passa para o saldo local. A abertura direta fora de iframe continua a ser uma demonstração local; não usar esse modo para créditos do site.

Se o site aplicar sandbox ao iframe, permitir pelo menos `allow-scripts allow-same-origin`; sem a origem real a validação das mensagens e o armazenamento de recuperação não funcionam. Ajustar `frame-src` no site e `frame-ancestors` no alojamento da slot para as origens autorizadas. Não impor `X-Frame-Options: DENY` à slot.

## 2. Endpoint do backend

Runtime de referência: Node.js com ES modules e `node:crypto`. O agente pode adaptar o endpoint ao framework existente. O serviço não contém uma carteira de demonstração nem autenticação própria: recebe o utilizador autenticado e uma implementação transacional do armazenamento do site.

```js
import {createRiftService} from '/caminho/slot/integration/round-service.mjs';

const handleRift = createRiftService({transact: transactRiftAccount});

// Exemplo conceptual Express; aplicar autenticação/CSRF/limites do próprio site.
app.post('/api/games/rift', requireUser, async (req, res) => {
  try {
    const result = await handleRift(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    const status = error.code === 'UNAUTHENTICATED' ? 401 : 409;
    res.status(status).json({
      error: {
        code: error.code || 'SITE_REJECTED',
        message: error.publicMessage || 'Não foi possível confirmar a operação.',
      },
    });
  }
});
```

Não aceitar `playerId`, saldo, ganhos, grelhas, seed ou estado de sessão enviados pelo navegador como autoridade. O serviço só usa os campos de ação validados e gera os resultados no servidor. O utilizador vem da sessão autenticada do endpoint.

## 3. Contrato obrigatório de `transactRiftAccount`

```js
async function transactRiftAccount(playerId, operationId, fingerprint, callback) {
  // Implementar na base de dados existente, na MESMA transação da carteira.
  // callback é síncrono e recebe um rascunho mutável:
  // { balanceCents: inteiro, rift: objeto persistente ou null }
  // Retornar o resultado de callback depois do COMMIT.
}
```

Implementar estes passos numa transação real:

1. Bloquear a linha da carteira do utilizador (`SELECT ... FOR UPDATE` ou equivalente). Este bloqueio deve coordenar também depósitos, levantamentos e os outros jogos do site.
2. Consultar um recibo persistente por `(playerId, operationId)`. Se existir, comparar `fingerprint`: se for igual, devolver a resposta gravada, sem chamar `callback`; se for diferente, rejeitar a reutilização do identificador.
3. Carregar `balanceCents` da carteira real e `rift` da sessão persistente. Trabalhar numa cópia/rascunho, nunca numa referência que sobreviva a um rollback.
4. Executar `const result = callback(account)`. O serviço atualiza `account.balanceCents` e `account.rift` com o resultado completo da jogada.
5. Persistir saldo, sessão e recibo `{fingerprint, result}` atomicamente. Se o site tiver ledger, registar a operação e os movimentos de aposta/ganho na mesma transação. `result.state.pending.cost` e `.win` identificam os montantes confirmados de `play`.
6. Efetuar COMMIT e devolver `result`. Em qualquer exceção, fazer ROLLBACK, incluindo alterações à sessão/RNG.

Guardar valores monetários/unidades em centésimos inteiros: `300,00` equivale a `30000`. O adaptador aceita saldo não negativo até `1000000000000` centésimos; adaptar e voltar a testar antes de suportar saldos superiores. As respostas para a interface usam números com duas casas. Não usar o saldo do iframe para atualizar a carteira. A sessão `rift` contém progresso de bónus, grelha, histórico, estado privado do motor e revisão; fica no backend, nunca em armazenamento local como autoridade.

Usar uma restrição UNIQUE em `(player_id, operation_id)` na tabela de recibos. Os recibos têm de sobreviver a recarregamentos e reinícios do servidor. Não voltar a executar uma operação antiga por ter eliminado o seu recibo; definir retenção/arquivo de identificadores com o mecanismo de idempotência existente do site. Um Map em memória, localStorage ou uma simples sequência de chamadas separadas `debit` e `credit` não implementam este contrato.

O serviço deve poder ser chamado em várias instâncias: o bloqueio e a idempotência são na base de dados, não no processo Node. A revisão evita dois pedidos concorrentes avançarem a mesma sessão. Cada operação do adaptador tem um UUID; uma resposta perdida é repetida com o mesmo UUID.

## 4. Protocolo e recuperação

O adaptador já implementa o protocolo. Para referência:

```js
// Iframe → site
{channel:'rift-core:v1', type:'request', id:'uuid', action:'connect', payload:{}}
{channel:'rift-core:v1', type:'request', id:'uuid', action:'play', payload:{
  expectedRevision: 3,
  sessionId: 'sessao-opaca-devolvida-pelo-backend',
  previousRecordId: 'id-da-última-jogada-confirmada',
  bet: 1, hunt: false, buy: null // ou 'core', 'rift', 'overdrive'
}}

// Site → iframe, apenas após confirmação do backend
{channel:'rift-core:v1', type:'response', id:'mesmo-uuid', ok:true,
 result:{sessionId:'sessao-opaca', revision:4, state:/* snapshot público devolvido pelo serviço */}}
```

- `connect` carrega a sessão e o saldo real; cria a sessão sem debitar se ainda não existir.
- `play` calcula e liquida um spin ou uma ativação de compra. Em FS, o custo é zero. Não criar endpoints de «creditar o ganho indicado pelo cliente».
- A resposta já inclui o pagamento confirmado. As animações não enviam pedidos adicionais de ganho.
- O pedido em dúvida fica em sessionStorage apenas como UUID/ação para repetição idempotente; não como carteira. Não regenerar o UUID ao repetir uma operação por timeout.
- Um recarregamento recupera a última jogada confirmada e o bónus. `previousRecordId` permite avançar após a apresentação anterior; sem correspondência o backend recusa o avanço.
- Se a sessão tiver mudado noutro separador, a revisão é recusada e a slot sincroniza o estado. Não autorizar um segundo débito com uma revisão antiga.
- Cada ação é vinculada ao `sessionId` criado pelo backend para a conta. Um pedido guardado antes de logout/troca de conta não pode debitar a conta seguinte. O agente deve continuar a destruir e recriar o iframe ao mudar de utilizador; `sessionId` não substitui a autenticação do endpoint.
- Não atualizar o motor de uma sessão de bónus a meio: manter a versão original até terminar ou encaminhar sessões pela versão. O serviço recusa uma ronda de outra versão em vez de a recalcular silenciosamente.

## 5. Verificação antes de publicar no site

Verificar na infraestrutura real do site:

- O saldo inicial corresponde à conta e não aos 1000 da demonstração.
- Uma aposta paga e uma compra debitam uma vez; cancelar uma compra não debita.
- Repetir o mesmo UUID, perder a resposta e recarregar não duplicam o débito.
- FS não cobram; os ganhos e a conclusão do bónus ficam persistidos.
- Saldo insuficiente, logout, sessão expirada e duas abas não criam crédito nem permitem fallback local.
- Todos os montantes mostram apenas o número, inclusive no histórico e na compra.

Na entrega, os testes incluem transações, idempotência, concorrência, saldo insuficiente, FS e ausência de confiança em ganhos do cliente. O QA no navegador usa iframe entre origens diferentes, perde intencionalmente uma resposta após o débito e confirma recuperação sem nova cobrança. A base de dados e a autenticação reais do site ainda precisam da implementação acima.










