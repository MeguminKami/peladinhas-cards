# Maestro — configuração 0.5.1

Quando pelo menos um Wild rouba Passes de Maestro (P3), o motor sorteia um único premium para essa jogada: P1, P2, P3 ou P4, com 25% de probabilidade cada, independentemente da raridade normal dos símbolos.

Todos os poderes P3 dessa jogada convertem os seus alvos para esse mesmo premium. Cada ativação continua a sortear uniformemente de 2 a 10 posições normais sem reposição, limitada às posições ainda elegíveis depois das expansões e conversões anteriores. Os símbolos criados não originam roubos adicionais. A escolha expira no fim do spin; a próxima jogada com P3 faz um novo sorteio, em qualquer modo.

Cada evento regista `conversionSymbol`, usado pela animação, avaliação e reprodução do resultado. Eventos históricos sem esse campo continuam a ser apresentados como conversões para P3. O restauro de sessões 0.5.0 mantém saldo, RNG, retrigger pendente e resultados já confirmados.

Esta alteração muda a matemática. RTP da configuração 0.5.1 ainda não medido; resultados das versões anteriores não validam esta versão.
