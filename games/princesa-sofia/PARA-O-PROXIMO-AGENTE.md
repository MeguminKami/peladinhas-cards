# Para o próximo agente: incorporar a Princesa Sofia no site do casino

O jogo está terminado. A tua tarefa é colocá-lo na página do casino do site Peladinhas Cards, por baixo do menu do site, sem alterar o jogo.

## Lê por esta ordem

1. **[INTEGRACAO.md](INTEGRACAO.md)** — como incorporar: iframe + `ui/embed.js`, HTML/CSS a colar, ficheiros a publicar, cabeçalhos de segurança.
2. **[AGENTS.md](AGENTS.md)** — regras fixas do jogo. Não as alteres (matemática, barras de XP, preços, sem scroll).
3. [README.md](README.md) — visão geral, comandos e organização. Detalhes em [docs/](docs/).

## Ver o resultado esperado

```powershell
npm.cmd run dev:site    # o jogo por baixo de uma simulação do menu do site
npm.cmd run dev:pc      # tamanhos de PC (botão "Com menu do site")
npm.cmd run dev:telemovel
```

`site.html` + `ui/site.css` são o modelo: no site real, troca o cabeçalho simulado pelo verdadeiro e mantém só o bloco `.game-slot` com o iframe e o `<script type="module" src=".../ui/embed.js">`.

## Lista de passos

- [ ] Publicar `game.html`, `ui/` e `src/` num caminho do site (ex.: `/jogos/princesa-sofia/`). Não publicar `scripts/`, `tests/`, `audio-lab/`, `docs/`, `relatorios/`, `ASSETS/`, `.env`, nem as páginas de pré-visualização.
- [ ] Na página do casino: iframe `data-sofia-game` por baixo do menu + `ui/embed.js` (ver INTEGRACAO.md). A página não deve ter scroll vertical enquanto o jogo está aberto.
- [ ] Iframe com `allow="fullscreen; autoplay" allowfullscreen`.
- [ ] Se o jogo ficar noutra origem: `Content-Security-Policy: frame-ancestors <site>` nessa origem. Tipos MIME: `.opus` → `audio/ogg`, `.woff2` → `font/woff2`.
- [ ] Testar no PC (1920×1080, 1366×768), num telemóvel real em vertical e horizontal, e no Safari do iPhone: sem scroll, controlos visíveis, som depois do primeiro toque.
- [ ] Ligar o item de menu do casino à página do jogo.

## Em aberto (não bloqueia a incorporação)

- **Saldo:** ✅ ligado ao casino com as regras da Rift (ver «Saldo, apostas e contas» no [INTEGRACAO.md](INTEGRACAO.md)). Fora do casino continua com créditos de teste.
- **RTP não certificado:** a Coroa da Aurora mediu 104,9% numa amostra de 10 000 compras (ver [docs/matematica.md](docs/matematica.md)). Qualquer recalibração tem de respeitar o AGENTS.md.
- **Sons:** as introduções dos bónus e o MAX WIN são sintetizados. Há um script para gerar versões na ElevenLabs (`npm.cmd run audio:candidates`, chave no `.env`) e uma página para escolher (`/audio-lab.html`).
- **Testes de browser:** um passo do saldo das demonstrações (`tests/prototype.browser.js`) e um da poeira de XP (`tests/presentation.browser.js`) já falhavam antes das últimas revisões. Os 53 testes do motor (`npm.cmd test`) passam.
