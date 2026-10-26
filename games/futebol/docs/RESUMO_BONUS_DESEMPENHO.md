# Resumo final de bónus — desempenho

Contagem linear por requestAnimationFrame, com formatação e escrita no DOM apenas quando o texto muda. Largura reservada, dígitos tabulares e isolamento de pintura do contador. Removidos blur do backdrop, filtros SVG/luzes e brilho difuso do número. A entrada mantém animação da carta/taça; deixa de animar a opacidade de todo o ecrã. Confetti reduzido a 16 elementos e camadas de composição explícitas.

Após três intervalos acima de 22 ms, a apresentação reduz automaticamente as animações decorativas, mantendo contador, total e confirmação. Não modifica pagamentos, RNG ou duração matemática do bónus.

Verificação: e2e/summary-performance.spec.ts recupera uma ronda real antes do último FS, mede requestAnimationFrame durante a contagem, verifica o total confirmado e o fecho. e2e/bonus-pipeline.spec.ts cobre a ordem de saída dos FS.

Última medição local em Chromium headless a 1440×900, som desligado e primeiros 250 ms excluídos: 152 intervalos, média arredondada de 57 FPS, p95 de 24,2 ms, cinco intervalos acima de 25 ms. Não foi comprovado um mínimo de 60 FPS. Outros ensaios oscilaram entre 47 e 57 FPS; não são uma comparação controlada antes/depois. A medição é de callbacks, não de frames fisicamente apresentados. Necessário validar no dispositivo e browser finais.
