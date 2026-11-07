# GANZÁ

Plinko LoFi privado do WEED para o casino Peladinhas, com créditos fictícios DJC. Quatro volatilidades, 8, 12 e 16 linhas, costa marroquina progressiva e bola de ganzá castanha-clara. [Contrato inicial](PROMPT.md), [decisões atuais](DECISOES.md), [relatório](RELATORIO.md).

Na raiz do repositório:

O clique inicia imediatamente o gesto e a placa até à entrada do tabuleiro, sem esperar pelo áudio ou pela carteira. A confirmação durável corre em paralelo; só depois de recebida a jogada e publicado o compromisso a placa percorre as bóias. Se a confirmação demorar, permanece na entrada; se falhar, a preparação visual é retirada e surge a recuperação. A preparação não inventa percurso nem prémio. O teste de lançamento inclui resposta atrasada e rejeitada da carteira.

As oito poses da personagem e os seus filtros de cor são preparados antes da primeira aposta. Durante a animação, as filas de bóias imóveis reutilizam o desenho anterior; apenas as filas atingidas são redesenhadas. A carteira reutiliza o motor importado na ligação inicial, evitando um novo import assíncrono em cada lançamento ou liquidação. `node tests/casino-ganza-launch.mjs` mede o clique e o desenho no casino completo com fixtures locais e CPU limitada, verifica a reutilização das poses e confirma o destino da bola. As medições são locais e não certificam o desempenho num aparelho físico.

À entrada, o jogo prepara em memória todas as pinturas (retrato e paisagem), efeitos, música e ambientes, com progresso de carregamento e LARGAR desativado até concluir. O primeiro gesto ativa o som já descodificado. Falhas de áudio ficam silenciosas, com limite de 12 segundos por pedido; não impedem jogar. Depois de preparado, mudar de dificuldade e lançar bolas não descarrega recursos. A cache HTTP pode reutilizar os ficheiros entre entradas; a preparação em memória é repetida em cada abertura. A carteira mantém a confirmação de sessão e sincronização em lote. Regressão: `node tests/casino-ganza-audio-latency.mjs` verifica preparação com rede lenta e 20 jogadas por tamanho sem novos pedidos de recursos.

```powershell
npm.cmd run dev --prefix games/ganza
npm.cmd test --prefix games/ganza
npm.cmd run tabelas --prefix games/ganza
npm.cmd run sim --prefix games/ganza
npm.cmd run test:browser --prefix games/ganza
node games/ganza/tests/integration.mjs
node scripts/build-casino-ganza.mjs
```

Abrir `http://127.0.0.1:4186/games/ganza/game.html`. A prévia usa apenas créditos locais. A carteira do casino só é escolhida com `wallet=host` num iframe da mesma origem.

Espaço ou **LARGAR** lança uma bola. É possível manter até dez em voo. Autoplay lança uma de cada vez e tem limites de ganho e perda. Linhas e volatilidade ficam bloqueadas enquanto há bolas, liquidações ou autoplay. As apostas são inteiras, de 1 a 10 000 DJC, representadas em cêntimos na carteira. O botão ½ arredonda para baixo, com mínimo de 1 DJC.

**Verificar jogada** revela seed e percurso após a liquidação. **Definições → Recuperar carteira** retoma pedidos cuja resposta se perdeu. Não voltar a apostar por tentativa de compensação de um erro.

As demonstrações `?demo=lancha&k=0`, `?demo=max`, `?demo=carga` e `?demo=chuva` funcionam apenas em localhost, fora da carteira do casino. Nunca debitam ou creditam e não alteram o motor.

Ver [integração](INTEGRACAO.md), [matemática](docs/matematica.md), [assets](ASSETS.md) e [prompts da música](docs/PROMPT-MUSICA.md). A música final é feita pelo dono. A configuração atual inclui guias instrumentais provisórios.
