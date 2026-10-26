# Continuidade e autoridade do servidor

Estado: arquitetura de servidor especificada para implementação futura. O repositório tem motor, simulador e GUI com saldo fictício/sessão locais. Ainda não tem servidor de jogo, base de dados, autenticação nem endpoint de spin. O servidor Vite serve apenas os ficheiros da GUI.

## Seed e continuidade

A seed inicia uma sequência de aleatoriedade. Criar um gerador novo com a mesma seed a cada pedido repetiria a sequência inicial. Cada spin consome vários sorteios, incluindo símbolos, scatters, roubos, poderes e stickies; o número de sorteios pode variar. Não assumir um número fixo de chamadas RNG por spin.

Há duas estratégias válidas, que não devem ser misturadas dentro da mesma ronda:

| Estratégia | Estado persistido | Continuidade |
|---|---|---|
| Gerador contínuo por jogador | Estado interno completo, algoritmo e versão | Restaurar o estado, gerar o spin e guardar o estado seguinte |
| Sequência derivada por spin | Identificador do jogador, contador monotónico, versão do segredo e algoritmo | Derivar uma sequência nova e independente para cada spin confirmado |

O `SeededRandom` atual usa FNV-1a e Mulberry32, adequado para testes reproduzíveis. `state()` exporta o estado e `SeededRandom.restore(estado)` restaura-o com validação. A GUI já usa esta estratégia para continuar após recarga. Nunca usar `new SeededRandom(String(estadoGuardado))` como restauro: isso volta a aplicar o hash e produz outro estado.

Para um servidor que exija imprevisibilidade, usar um gerador criptográfico. Não expor estado RNG, seeds secretas ou segredos do servidor ao browser. Uma seed pública por jogador, sozinha, não torna a sequência imprevisível.

## Estratégia proposta para servidor

Preferir uma sequência criptográfica derivada por spin confirmado, com contador interno para os sorteios desse spin. Conceito:

```text
chaveDoSpin = HMAC-SHA-256(segredoVersionado,
    codificar(dominio, jogadorId, contadorSpin, configHash))
blocoAleatorio = HMAC-SHA-256(chaveDoSpin, codificar(contadorBloco))
```

Especificar codificação inequívoca, domínios e versões; não concatenar strings ambíguas. Converter bytes em escolhas uniformes por rejeição, evitando viés de módulo. Esta é uma proposta de protocolo, ainda não implementada nem validada.

O contador avança por spin do motor, incluindo cada free spin. O contador de rondas é separado. Assim, os free spins retomam o estado matemático da mesma ronda, mas recebem uma nova sequência aleatória. O algoritmo e a configuração ficam fixos até terminar a ronda, mesmo que o servidor receba uma atualização.

## Estado persistido por jogador

- Identificador, saldo fictício inteiro e revisão usada no controlo de concorrência.
- Contadores monotónicos de spins e rondas; não repor ao recarregar, iniciar sessão ou terminar um bónus.
- Estratégia RNG, algoritmo e versão do segredo; ou estado RNG completo, se escolhida a estratégia contínua.
- Ronda ativa: identificador, configuração imutável/hash, aposta de referência, modo, FS restantes, posições sticky, ganho acumulado e estado de conclusão.
- Pedidos processados: chave de idempotência, conteúdo do comando, resultado persistido e relação com a ronda/spin.
- Histórico de movimentos do saldo e resultados matemáticos necessários para auditoria e repetição visual.

O estado de apresentação e as preferências não integram a matemática. O servidor não espera uma animação para tornar um resultado durável.

## Transação de um comando

1. Autenticar o jogador e validar o formato do comando.
2. Abrir transação e bloquear o estado desse jogador, ou aplicar controlo otimista de revisão com repetição segura.
3. Consultar a chave de idempotência no âmbito do jogador. Mesmo comando já confirmado: devolver exatamente o resultado guardado. Mesma chave com conteúdo diferente: rejeitar conflito.
4. Validar estado da ronda, aposta, saldo e configuração no servidor. Não aceitar prémios, tabuleiros ou estado RNG enviados pelo cliente como resultados autoritativos.
5. Reservar o próximo contador, obter aleatoriedade e executar o motor.
6. Descontar o custo uma única vez no início de uma ronda paga/compra; free spins custam zero. Creditar cada pagamento confirmado uma única vez. O ganho acumulado do bónus é informativo e não deve ser creditado novamente no fim.
7. Guardar atomicamente resultado, estado seguinte, saldo, movimento, contador e resposta idempotente.
8. Confirmar a transação e devolver a resposta. Se a transação falhar, nenhum destes efeitos fica confirmado.

Pedidos concorrentes, incluindo de duas abas, são serializados por jogador. Um segundo comando incompatível com uma ronda ativa é rejeitado ou recebe o estado atualizado; nunca abre duas rondas sobre o mesmo saldo inicial.

Se a ligação cair depois da confirmação, repetir a mesma chave devolve o mesmo resultado. Se cair antes, o comando pode ser novamente processado sem cobrança dupla. A recuperação usa `GET session` para devolver saldo, revisão, ronda ativa e último resultado confirmado.

## Contrato lógico, independente de transporte

| Operação proposta | Conteúdo | Efeito |
|---|---|---|
| `GET session` | Sessão autenticada | Recupera estado e capacidades dos controlos |
| `POST round` | Idempotência, revisão, aposta inteira, tipo base/compra normal/compra superior | Inicia a ronda e resolve o primeiro spin |
| `POST round/{id}/next` | Idempotência e revisão | Resolve um FS pendente, sem nova aposta |
| `GET history` | Cursor e limite | Consulta resultados confirmados do jogador |
| `GET result/{id}` | Identificador autorizado | Consulta resultado e eventos para apresentação |

Resposta: IDs de ronda/spin, contador, versão/hash matemático, revisão, custo, pagamento, saldo, resultado estruturado e próximo estado. Valores monetários inteiros; usar strings decimais caso excedam a precisão segura de JSON/JavaScript. Seeds e segredos não fazem parte da resposta.

Ao retomar uma ronda, não gerar novamente spins confirmados. Recuperar o último resultado e continuar apenas os FS pendentes. Repetir uma apresentação usa o resultado guardado e nunca chama o motor.

## Verificação obrigatória antes da integração

- Reiniciar o processo não repete nem perde spins.
- Pedido repetido, perda de resposta e repetição após timeout não cobram nem pagam duas vezes.
- Duas abas concorrentes não reutilizam contador ou saldo.
- Falha de transação não deixa saldo, resultado e estado divergentes.
- Atualização de configuração não altera bónus em curso.
- Cliente não altera aposta de um FS nem resultados matemáticos.
- Restauro RNG, se usado, reproduz a sequência; gerador criptográfico recebe testes próprios de conversão uniforme.

## Extensão de estado para retriggers (0.5.0)

O futuro serviço deve confirmar atomicamente o resultado, os +5 FS, `remaining`, `totalFreeSpins`, global, sticky e contador/RNG. O evento de retrigger inclui identidade de ronda e spin. Um pedido idempotente separado reconhece o festejo; não atribui novamente FS nem avança RNG. Enquanto pendente, a sessão local bloqueia o próximo spin. A apresentação de 10 s é do cliente e não altera o resultado. Recarregar recupera o evento pendente. Esta continua a ser uma especificação futura de servidor: o protótipo implementa estas garantias em sessão local.
