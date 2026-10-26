// Presentation placeholders. A game becomes playable only with its own local
// module AND an audited wallet settlement contract; never accept a client delta.
export const CASINO_CATALOG = Object.freeze([
  {
    id: "futebol",
    category: "slots",
    title: "Noite de Glória",
    label: "Futebol de Bairro. A sorte entra em campo.",
    description:
      "A slot da tua liga, com 40 linhas, poderes e duas noites de bónus.",
    art: "reels",
    thumbnail: "assets/games/futebol/assets/football/marketing/thumbnail-v1.webp",
    available: true,
  },
  {
    id: "blackjack",
    category: "tables",
    title: "Blackjack",
    label: "A próxima carta muda tudo.",
    description:
      "Uma mesa para pensar a próxima jogada. O jogo será disponibilizado depois da integração.",
    art: "cards",
  },
  {
    id: "roulette",
    category: "tables",
    title: "Roleta",
    label: "Todos os olhos na roda.",
    description:
      "O clássico de mesa terá o seu lugar no salão. Disponível após a integração do jogo.",
    art: "wheel",
  },
]);
