# Fluidez das cores do Card Lab — 20/10/2026

O caminho rápido existente já preservava a carta e as imagens, mas cada evento do seletor de cor ou RGB atualizava estilos e controlos imediatamente. A pré-visualização passa a agrupar eventos no próximo frame e lê os valores finais do formulário. O evento `change` aplica a última cor sem esperar; reconstruir a carta ou sair do editor cancela trabalho pendente. O histórico continua a agrupar alterações e os valores guardados não dependem do frame.

## Validação local

`node tests/card-lab-colors.mjs` verifica rajadas de 120 eventos, retenção da carta/imagem, ausência de substituições de DOM, atualização final, cinco canais de cor, RGB/transparência, desfazer/refazer, gravação e iluminação. As rajadas aplicam duas escritas de estilo na carta para cor primária e uma para RGB, em vez de pintar em cada evento. Também verifica larguras de 1440/768/390/320 px e redução de movimento.

As medições sintéticas confirmam o agrupamento e o estado final; não medem a fluidez do seletor nativo do sistema nem garantem FPS num aparelho físico. Não houve alterações cloud nem publicação. Deploy apenas de frontend: `npm.cmd run deploy:frontend`.
