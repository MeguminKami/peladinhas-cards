# Contador de vitórias — otimização

A contagem usa requestAnimationFrame e tempo decorrido. Nas celebrações grandes, a progressão é linear por segmento para evitar a paragem aparente em cada limiar. O X usa o valor contínuo, sem esperar pelo arredondamento dos cêntimos; dinheiro e X continuam a terminar no prémio confirmado.

Os elementos numéricos têm dimensões reservadas, dígitos tabulares e isolamento de layout/pintura. Foram retirados a mutação de data-value por frame, o blur do backdrop, o brilho difuso do texto atualizado e transições de cor/fundo que provocavam repintura adicional. Os fundos mantêm crossfades de opacidade e os efeitos usam camadas próprias.

Medição de diagnóstico em Chromium headless local, viewport 1440×900, celebração de 200000 unidades com aposta de 20, efeitos ativos, sem som, cinco segundos de observação e primeiros 400 ms excluídos: 276 intervalos, média arredondada de 60 FPS, percentil 95 de 16,9 ms e um intervalo superior a 25 ms. A medição observa callbacks de animação; não comprova frames apresentados fisicamente no ecrã. Não garante um mínimo de 60 FPS em qualquer dispositivo, com áudio ou durante tarefas concorrentes. Validar também no browser e equipamento finais.

Testes de regressão em e2e/wins.spec.ts cobrem escalões, total final, confirmação, interrupção e movimento reduzido. O teste observa agora o montante visível em vez de exigir um atributo de diagnóstico atualizado por frame. Não há alterações matemáticas.
