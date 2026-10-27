# Futebol de Bairro — integração num website

Guia reutilizável para novos projetos: [guia-prompt de desenvolvimento completo de uma slot](docs/GUIA_DESENVOLVIMENTO_SLOT.md), com bloco de input, metodologia, produção de assets, simulação, GUI e integração.

Slot de entretenimento com **créditos fictícios**, motor TypeScript local e interface isolada num iframe. O website controla o saldo; a slot controla símbolos, pagamentos calculados, bónus, animações, seed e sequência RNG. Configuração matemática **0.7.0**, RTP desta versão ainda não medido.

## Executar e testar

Requer Node.js 24.16+ e npm.

```sh
npm ci
npm run dev
```

- `http://127.0.0.1:5173/host-demo.html`: website de exemplo, saldo exterior, slot compacta e expansão.
- `http://127.0.0.1:5173/`: protótipo independente com carteira fictícia local, para desenvolvimento.
- `embed.html`: entrada de integração; deve ser aberta pelo SDK num iframe, com origem e utilizador definidos.

```sh
npm run check
npm test
npx playwright install chromium
npm run test:gui
npm run build
```

No PowerShell pode usar-se `npm.cmd` / `npx.cmd`. Para usar um Chromium já instalado nos testes: definir `PLAYWRIGHT_CHROMIUM_EXECUTABLE` com o caminho do executável.

## Publicar

Publicar **o conteúdo de `dist/`**, mantendo a estrutura. Não publicar `src/`, `web/`, `docs/`, `reports/`, `node_modules/` ou arte arquivada. Não é necessário um servidor Node para servir a slot; é uma aplicação estática. Servir por HTTPS, ou localhost no desenvolvimento, com os tipos MIME corretos.

O build usa caminhos relativos e pode ser colocado, por exemplo, em `/jogos/futebol/`, incluindo os assets. `slot-host.js` é o módulo público do SDK. `host-demo.html` e o ficheiro `assets/demo-*.js` são exemplos e podem ser excluídos da publicação final. `index.html` é o protótipo independente e também pode ser excluído se só for utilizada a integração.

O iframe pode ter a mesma origem do website ou uma origem HTTPS dedicada. A política `frame-ancestors` da slot deve permitir o website. Se o website aplicar CSP, deve permitir a origem da slot em `frame-src`, os módulos necessários e os seus assets. Não colocar o iframe num sandbox com origem opaca: esta versão precisa de armazenamento local e Web Locks.

## Ligar ao website

```html
<div id="slot"></div>
<script type="module">
  import { mountSlot } from '/jogos/futebol/slot-host.js';

  async function request(path, body) {
    const response = await fetch(path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? {'Content-Type': 'application/json'} : {},
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.message || 'Erro de saldo');
      // Só marcar definitive quando a API garante que NÃO liquidou o pedido.
      error.definitive = data.definitive === true;
      throw error;
    }
    return data;
  }

  const slot = mountSlot(document.querySelector('#slot'), {
    src: '/jogos/futebol/embed.html',
    playerId: 'id-estavel-do-utilizador-autenticado',
    getBalance: async () => (await request('/api/game-wallet')).balance,
    settle: async transaction => request('/api/game-wallet/settle', transaction)
  });

  // Depois de o website alterar o saldo por outra ação:
  // await slot.refreshBalance();
  // slot.expand(); slot.collapse(); slot.destroy();
</script>
```

Estas rotas são um contrato de exemplo; o repositório não inclui uma API de carteira de produção. O utilizador autenticado deve ser identificado pelo website, não confiando num `playerId` recebido do browser para autorizar acesso a saldos.

`getBalance()` devolve um inteiro com o saldo em cêntimos de créditos fictícios. `settle()` recebe:

```json
{
  "id": "uuid-unico-e-estavel-desta-operacao",
  "debit": 20,
  "credit": 36,
  "roundId": 12,
  "spin": 1,
  "configVersion": "0.7.1"
}
```

E devolve:

```json
{"balance": 100016}
```

Todos os valores são **inteiros**, nunca floats monetários: `20` significa `0,20` créditos. A operação deve verificar se o saldo cobre `debit` **antes** de considerar `credit`, e aplicar atomicamente `saldo - debit + credit`. O spin base debita a aposta; a compra debita 90× ou 220×; cada FS seguinte tem débito zero e crédito próprio. A compra mantém a regra existente: o custo e o primeiro FS pertencem à mesma operação.

## Requisito indispensável: idempotência

A carteira do website deve guardar a operação por **utilizador + `id`**, juntamente com os valores aceites. Repetir o mesmo pedido não pode voltar a debitar ou creditar. Reutilizar o mesmo `id` com valores diferentes deve ser rejeitado. A resposta de repetição pode devolver o saldo atual autoritativo, preservando a confirmação da operação já executada.

A slot guarda um pedido local antes de contactar a carteira. Se a resposta se perder, conserva o resultado e o RNG seguintes, bloqueia novas jogadas e recupera o mesmo pedido após recarregar. Não volta a sortear. Só avança o estado local confirmado depois da resposta da carteira. Um erro com `definitive: true` significa que a carteira garante que nada foi liquidado e permite abandonar esse pedido. Timeouts e erros ambíguos conservam o pedido pendente.

O SDK valida origem e janela das mensagens; o destino não usa `*`. Os pedidos são serializados no website e, para o mesmo utilizador/origem, por Web Locks no jogo. O website continua responsável pela concorrência e idempotência da sua carteira, incluindo entre dispositivos. Tokens de autenticação ficam no website: não devem ser enviados no URL do iframe.

## Vista compacta e expansão

O tabuleiro tem prioridade de espaço: cabeçalho compacto, coluna lateral estreita e compras reunidas no botão redondo **COMPRA DE BÓNUS**. Esse botão abre as duas opções com os preços da aposta atual; escolher uma mantém o passo de confirmação antes de cobrar. No desktop, a consola ocupa uma única faixa com marcadores, emblema Bonus Hunt, volume, aposta, velocidade, SPIN e AUTO. No telemóvel os grupos adaptam-se à largura. O estilo do menu segue o painel de estádio azul e dourado. Este layout aplica-se ao projeto principal e ao pacote de integração.

O SDK cria uma área com proporção 16:10 e altura mínima de 360 px. O jogo adapta os controlos ao tamanho do iframe, sem navegar para outra página. O website pode ajustar o tamanho do contentor depois de `mountSlot`; no telemóvel, recomenda-se uma área vertical com altura suficiente para tabuleiro e menus.

O botão de expansão ocupa a janela do website com o **mesmo iframe**, mantendo estado, seed, animações e áudio. Um novo clique, ou Escape fora dos diálogos, regressa à área compacta. A expansão não exige permissão de fullscreen do browser. `expand()`, `collapse()` e `destroy()` estão disponíveis ao website. No protótipo independente, o botão mantém a função de fullscreen nativo.

## Bonus Hunt

O interruptor Bonus Hunt, junto às compras de bónus, cobra 3× a aposta base por spin normal e aumenta em 50% relativo a chance de cada quantidade positiva de Scatters. Chance de pelo menos um Scatter: 25% → 37,5%. Prémios e teto continuam a usar a aposta base; nos FS o boost não se aplica. O seletor de aposta mostra o custo real em verde quando o Hunt está ativo, mantendo internamente a aposta base para calcular prémios. O custo real é enviado à carteira exterior e usado pelos spins automáticos. Consultar `docs/BONUS_HUNT_0_6_0.md` para distribuição, regras e simulação.

## Barra de espaços

ESPAÇO inicia/conclui spins e confirma os ecrãs CONTINUAR: entrada de bónus, retrigger, vitórias e resumo final. Durante uma contagem, revela primeiro o valor final; uma nova pressão confirma a saída. Os avanços entre ecrãs têm intervalo de 500 ms. Os comandos de spin por ESPAÇO têm apenas 100 ms de intervalo, sem atraso antes de iniciar a roleta. Tecla mantida e pressões durante esse intervalo são ignoradas, sem fila de comandos. Inputs de volume, selects e campos de texto conservam o comportamento de teclado habitual.

## Spins automáticos

O botão AUTO abre um pequeno painel junto ao botão, com seletor de 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400 ou 500 spins pagos. Cada jogada usa a velocidade selecionada e o mesmo fluxo de saldo/idempotência de um spin manual; não há débito antecipado de todo o lote.

O contador desconta apenas depois de confirmar cada spin pago. Free spins não descontam do lote e seguem a preferência de avanço dos FS. Entradas de bónus, grandes vitórias e resumos mantêm as confirmações manuais. O botão AUTO ou SPIN permite parar sem interromper a jogada já confirmada. A aposta fica bloqueada durante o plano; a velocidade pode ser alterada.

A sequência termina ao atingir a quantidade escolhida, por falta de saldo ou erro, e é cancelada ao ocultar a página ou receber atualização de outra aba. O plano não é retomado automaticamente após reload. Parar durante os FS pausa também o seu avanço automático até uma nova ação manual.

## Seed e continuidade

Na primeira utilização é criada uma seed por `crypto.randomUUID()`. A seed inicial, o estado atual do RNG e o contador de rondas ficam guardados. Reabrir o jogo **retoma o estado RNG**, sem voltar ao primeiro spin da seed. A seed não é renovada automaticamente ao fechar ou reabrir a página.

Em **Definições → Sequência do jogo → Renovar seed**, o utilizador pode criar uma nova seed, repetidamente, a pedido. Só é permitido entre rondas, sem FS, retrigger ou pedido de saldo pendente, e depois de fechar o resumo. A renovação mantém saldo, histórico e contador de rondas, e inicia uma nova sequência RNG identificada por uma geração. Sessões antigas sem a seed textual original conservam o seu RNG; o texto só passa a estar disponível quando for criada uma nova seed.

O estado é separado por `playerId` estável, na origem da slot:

- `slot-local-v1:player:<playerId codificado>`: sessão, seed/RNG, histórico e cache do saldo exterior.
- Sufixo `:wallet-pending`: pedido de carteira ainda não confirmado localmente.
- Sufixo `:preferences`: volumes e outras preferências.
- Sufixo `:bonus-entry`: confirmação da entrada no bónus.

Ao trocar de utilizador, destruir a instância anterior com `destroy()` e montar outra com o novo `playerId`.

O saldo local é apenas uma **cache** da carteira exterior. A versão integrada não disponibiliza adicionar saldo ou repor a carteira nas Definições. Exportar a sessão permanece disponível.

Esta continuidade é por browser/perfil e origem, não por conta em qualquer dispositivo. Limpar o armazenamento, usar modo privado ou bloquear armazenamento de terceiros pode perder/impedir a continuidade. Para sincronizar entre dispositivos seria necessário um serviço de estado adicional; não faz parte da arquitetura pedida, em que só o saldo é externo. Não apagar um pedido pendente como forma de resolver um erro de carteira.

## Integração Peladinhas Cards

Neste repositório, a fonte publicada é `games/futebol`; `casino_temp` é apenas uma pasta de receção. O adaptador envia aposta, modalidade, Bonus Hunt, snapshot completo e conclusão do bónus ao host. As jogadas são confirmadas localmente em IndexedDB, com sincronização online à entrada/saída, no fim do bónus ou a pedido. Preservar `web/wallet.ts` e `web/host-sdk.ts` ao importar atualizações. Consultar o [guia do casino](../../docs/guides/casino.md) para testes e publicação.

## Limite do modelo local

É um jogo de entretenimento com créditos fictícios. O motor e o RNG locais podem ser inspecionados e alterados pelo utilizador. O contrato da carteira não transforma resultados calculados no browser em resultados confiáveis para dinheiro real. Não existe integração de pagamentos reais neste projeto.

## Organização

| Diretório/ficheiro | Função |
|---|---|
| `src/` | Motor puro, RNG, sessão e CLI de simulação |
| `web/` | Interface, animações, áudio, ponte da carteira e SDK |
| `public/assets/football/` | Apenas os assets utilizados na versão atual |
| `embed.html` | Página inserida no website |
| `host-demo.html` | Website de exemplo com carteira fictícia exterior |
| `test/`, `e2e/` | Testes matemáticos e de integração/interface |
| `docs/` | Regras, decisões, produção e documentação histórica |
| `docs/art/archive/` | Variantes antigas, excluídas do build |
| `reports/`, `examples/` | Simulações históricas e exemplo de tabuleiro |
| `dist/` | Resultado publicável de `npm run build` |

O README anterior foi preservado em `docs/HISTORICO_README.md`; os seus números e versões são históricos. As regras atuais estão em `docs/MATEMATICA.md` e `docs/MAESTRO_0_5_1.md`. Os sons são sintetizados no browser, conforme `docs/AUDIO.md`.


## Transi??es dos bónus ? 2026-10-26

Na compra, ativação natural e retrigger, os Scatters vis?veis convergem
para o centro do campo antes da explica??o. No fim do bónus, a transi??o
?Apito final? dura 2 segundos antes do resumo; conserva a grelha da ?ltima
jogada. Movimento reduzido dispensa a espera. Interromper a apresentação
remove os efeitos sem alterar resultados, saldo ou RNG.

O contador avan?a após a apresentação dos rolos. Num retrigger, o total
adicional s? aparece quando abre a explica??o do prolongamento. Novos
spins ficam bloqueados enquanto decorre a transi??o de fecho.

Os testes visuais precisam do servidor deste projeto. A configuração
recusa reutilizar automaticamente um servidor que já ocupe a porta.
Pode escolher outra porta em PowerShell:

```powershell
$env:FOOTBALL_TEST_PORT='5177'
npm.cmd run test:gui -- e2e/bonus-transitions.spec.ts e2e/retrigger.spec.ts e2e/bonus-pipeline.spec.ts e2e/reel-fluid.spec.ts e2e/reel-start-continuity.spec.ts
```

Valida??o local e build não significam publica??o. Para publicar atrav?s
do site principal, usar `npm.cmd run deploy:frontend` na raiz do reposit?rio.

Valida??o local em 2026-10-26: TypeScript, build, 50 testes unit?rios e
16 testes de browser sobre transi??es, retrigger, fecho e continuidade dos
rolos. Capturas inspecionadas a 320, 390, 768 e 1440 px, em Edge headless.
Não houve altera??o da matem?tica nem verifica??o num aparelho real.

## Maestro 0.7.0

P3 converte qualquer símbolo exceto Wild, incluindo premiums e Scatters, sem repetir alvos na mesma jogada. As quantidades 2?10 t?m pesos 18/16/14/12/11/9/8/7/5%. Mant?m o destino premium equiprov?vel partilhado. Scatters iniciais preservam bónus e retriggers, apresentados no final do spin. Ver [regras 0.7.0](docs/MAESTRO_0_7_0.md).

## Sticky 0.7.1

O b?nus superior aumenta de 12% para 18% a chance de cada Wild eleg?vel ficar sticky (+50% relativo). O b?nus normal continua sem sticky. O contador avan?a no in?cio da anima??o do spin corrente. Snapshots 0.7.0 conservam saldo e RNG ao migrar. RTP 0.7.1 ainda n?o medido.
