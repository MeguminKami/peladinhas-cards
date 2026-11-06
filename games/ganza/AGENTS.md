# Contrato de desenvolvimento de GANZÁ

Ler o [contrato inicial](PROMPT.md), as [decisões posteriores](DECISOES.md) e o [relatório](RELATORIO.md). As instruções mais recentes do dono prevalecem. O Pop Art inicial foi substituído por LoFi.

- A direção vigente é [Falésia](PROMPT-NOVO-VISUAL.md), aprovada pelo dono. Falésia alaranjada com bóias jade em argolas, lanchas com tubos coloridos e placa castanha embrulhada e atada com cordel. Substitui as direções visuais anteriores, sem mudar matemática, carteira nem provas.
- Rosto baseado nas fotografias autorizadas em `../piece-police/INSPIRATION/WEED/`. Preservar identidade e dignidade. Fotografias nunca entram na build. O ciclo PNG do WEED dura 20 segundos. A correção pastel usa oito poses pintadas de corpo inteiro, com transições curtas suaves, substituindo os 480 frames interpolados anteriores.
- A apresentação usa camadas em `ui/art/falesia/`, com WEED em primeiro plano à esquerda, a lançar para a entrada do tabuleiro (no retrato pode ficar acima), uma fila de lanchas e controlos temáticos sobrepostos. As etiquetas podem arredondar, mas probabilidades, nomes acessíveis e provas mantêm os valores exatos. As pinturas antigas ficam apenas como fontes históricas, fora da build.
- Quatro volatilidades, Baixa, Média, Alta e Extrema, em 8, 12 e 16 linhas. São 12 tabelas. Alvo 99%, enumeração exata no intervalo 98,99–99,01%. Máximo 9 999× apenas em 16 linhas, Extrema. Nenhum multiplicador zero.
- Percurso binomial primeiro, um bit equiprovável por linha. Nunca sortear o prémio para fabricar o percurso. Resultado independente de saldo e histórico.
- Motor puro, determinístico, sem DOM, rede, relógio, Math.random ou estado global entre jogadas. Valores inteiros, pagamento floor(aposta × multiplicador / 100). Apostas públicas em DJC inteiros para não introduzir perda de RTP por arredondamento.
- Tabelas separadas, versionadas. Alterações matemáticas exigem nova versão, testes e simulação com seed de validação distinta de calibração. Nunca escrever «RTP confirmado» nem «certificado».
- Compromisso SHA-256 antes de animar, seed revelada após liquidar. Recebimentos e débitos têm idempotência e gravação durável. A carteira segue o caminho local da Princesa Sofia.
- Sem alteração a Functions ou acesso ao Firebase real sem autorização específica. Não executar deploy, commit ou push por inferência. Para este trabalho o dono proibiu essas operações.
- Respeitar movimento reduzido, não esconder saldo ou ações com celebrações, bloquear configuração enquanto há bolas ou liquidações. Validar os quatro tamanhos de referência e destinos visuais quando mudar trajetórias.
- PNGs de trabalho, folhas, fotografias e relatórios ficam fora da build. Publicar apenas game.html, ui, src e tabelas pelo script de build existente. Não adicionar serviços externos em runtime.
