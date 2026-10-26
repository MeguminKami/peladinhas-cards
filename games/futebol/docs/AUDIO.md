# Áudio — Futebol de Bairro

Implementação original por síntese Web Audio em `web/audio.ts`. Não utiliza gravações, samples, melodias de terceiros ou downloads externos. A sequência musical, os timbres e os efeitos são definidos no código. Não existe locução ou canto gravado; a bancada é uma textura sintetizada de ruído filtrado e palmas de percussão, não uma gravação realista de adeptos.

## Música e mistura

- Base: 105 BPM, baixo, melodia curta, harmonia, percussão e ambiente discreto.
- Final do Bairro: 120 BPM; Noite de Glória: 128 BPM, com camada de metais sintéticos.
- Entrada e resumo: arranjo mais calmo, sem bateria principal.
- Grande vitória: 116 BPM, acrescentando metais nos escalões superiores, com pulsos ligados ao contador e resolução final.
- Quatro volumes persistentes: geral, música, efeitos e ambiente, além do interruptor geral.
- O volume geral também tem uma barra permanente no menu principal, sincronizada com Definições e disponível durante os spins.

Um scheduler agenda notas antecipadamente no relógio de áudio. Não depende dos FPS nem usa o RNG matemático. Sons prioritários reduzem música e ambiente com transições suaves. Compressor no master, envelopes sem cortes secos, buffer de ruído reutilizado e limite de 64 vozes. As notas terminadas desligam e libertam os seus nós.

## Eventos

Cliques, mudança de aposta, arranque e rotação, seis paragens de coluna, Wild, Scatters progressivos, suspense, carregamento e aplicação dos quatro poderes, conversão Maestro, aquisição sticky, linhas pagas, escalões de vitória, contador, resolução, entrada em bónus, retrigger e resumo final.

Os eventos seguem a apresentação: som de Scatter na aterragem real, poderes em sequência, painel de entrada antes da música de FS e resolução de fim apenas depois da última vitória. A contagem não cria um som por frame: os pulsos são limitados a cerca de nove por segundo. O número máximo de acentos de conversão é limitado por ativação.

O browser só cria/ativa o contexto após interação do utilizador. Mudar de separador suspende o áudio e cancela rotação e suspense. Retomar não repete eventos passados. Concluir uma apresentação cancela os efeitos pendentes. Sem suporte de áudio, o jogo continua visualmente. Preferências antigas são completadas com os volumes por defeito.

## Limites desta produção

Esta é uma banda sonora procedural funcional, com instrumentos sintetizados. Não equivale a gravação de orquestra, bancada real, locutor ou produção musical de estúdio. Pode ser substituída por stems gravados/licenciados mantendo a mesma ligação aos eventos. Não houve alteração da matemática 0.5.1 nem nova medição de RTP.
