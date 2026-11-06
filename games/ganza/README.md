# GANZÁ

Plinko LoFi privado do WEED para o casino Peladinhas, com créditos fictícios DJC. Quatro volatilidades, 8, 12 e 16 linhas, costa marroquina progressiva e bola de ganzá castanha-clara. [Contrato inicial](PROMPT.md), [decisões atuais](DECISOES.md), [relatório](RELATORIO.md).

Na raiz do repositório:

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
