# Animações da apresentação v2

Camada DOM/Web Animations programada, com arte estática; não representa rigs articulados nem GIFs finais.

- Seis faixas verticais deslocam símbolos decorativos continuamente, com paragens escalonadas e revelação do tabuleiro real. O motor nunca usa os símbolos decorativos.
- Wilds já fixos ficam ancorados e visíveis. As novas ancoragens recebem flash e acabamento dourado persistente.
- Após dois ou três scatters revelados, as colunas restantes recebem suspense dourado e velocidade reduzida até à própria paragem. Não existe fabricação de resultados.
- Roubo premium → wild com raio e esfera em movimento; identificação geométrica persistente. P2 e P3 atingem exclusivamente os destinos do evento real. P4 envia energia ao indicador global e atualiza a soma.
- Velocidade super mantém feedback breve. Concluir, abortar ou ocultar o separador limpa as camadas e entrega o desenho final ao chamador.
- Compra de bónus usa `presentBonusActivation`, uma cerimónia explicitamente visual de três/quatro scatters sem avaliação, prémios ou consumo de RNG.

Integração: `Snapshot.sticky` permite diferir a nova ancoragem até à sua animação. O chamador deve desenhar o resultado final após concluir/abortar. `Options` mantém os callbacks existentes; o módulo importa o próprio CSS.

Verificar em browser: seis colunas em movimento, wild fixo imóvel, dois/três scatters e suspensão, quatro poderes e alvos reais, novo sticky, compra dos dois modos, Concluir em cada fase e mudança de separador. Confirmar que saldo, RNG e resultado permanecem idênticos com normal/rápido/super e animações interrompidas.
