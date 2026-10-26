# Integração de saldo do website — 26 de outubro de 2026

Os dois SDKs aceitam carteira externa e modo integrado obrigatório, com identidade estável do jogador, inicialização aguardável e estado consultável pelo website. O saldo inicial integrado é zero internamente e aparece como traço até confirmação; não existe fallback para fundos locais. Sessões de website e standalone são separadas.

`createHttpWallet` delega leitura e liquidação nos endpoints configurados pelo website, com cookies da mesma origem, CSRF configurável, JSON, sem cache e chave de idempotência. Os dois jogos podem usar a mesma conta. Atualizações externas chegam via updateBalance; o website pode verificar busy/pending/roundActive e canLeave antes de navegar.

Não há nome/símbolo de moeda na apresentação, fichas, aria-labels ou resultados. Valores são inteiros de escala 100 na API e apresentados com duas casas decimais. Carteira, estado e regras não usam conversões de câmbio.

IDs de sessão e operação previnem colisões após limpar armazenamento ou após uma recusa definitiva. Operações pendentes são persistidas antes do pedido; timeout/5xx repetem ID e conteúdo. Só uma rejeição autenticada explicitamente não aplicada permite descartar o candidato, preservar RNG/cartas/estado e atualizar o saldo. Respostas inválidas nunca introduzem saldo alternativo. O bridge iframe mantém validação de origem e source e suporta a mesma distinção.

Validação: 39 testes lógicos/contrato/RPC; 24 cenários de browser desktop/mobile afetados, incluindo troca entre jogos com o mesmo saldo HTTP, atualização externa, saldo zero, espera do host, recusa sem débito, nova tentativa com ID diferente, erro depois de aplicar e recuperação única. Regressões de blackjack/roleta e fallback incluídas. Testes reais dos SDKs compilados confirmam que as recusas são reconhecidas entre bundles separados, sem depender da identidade do construtor. Os endpoints foram simulados nos testes; nenhum servidor externo foi contactado.

Entregues contrato de integração, exemplo com dois jogos e host-website.html em cada ZIP, SDKs compilados e testes de carteira portáveis. O backend principal, autenticação real, base de dados e autoridade de sorteio/estado do servidor pertencem ao website e não estão implementados neste repositório. A ligação final exige configurar/implementar esses endpoints no website; não foi publicada qualquer alteração externa.
