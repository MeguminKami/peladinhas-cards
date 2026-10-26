export const CASINO_TABLES_ENABLED = true;
export const CASINO_CATALOG = Object.freeze([
  { id: "cardoso-road", category: "slots", title: "Cardoso Road", label: "Fuga ao Óleo. Arrisca o próximo passo.", description: "Dez passos até à Sofia. Sem óleo. Sem bolo. Só gains.", art: "reels", thumbnail: "assets/casino/covers/cardoso-road.webp", available: true },
  {
    id: "futebol",
    category: "slots",
    title: "Noite de Glória",
    label: "Futebol de Bairro. A sorte entra em campo.",
    description:
      "A slot da tua liga, com 40 linhas, poderes e duas noites de bónus.",
    art: "reels",
    thumbnail: "assets/games/futebol/assets/football/marketing/capa-vertical-800x1200-v1.webp",
    available: true,
  },
  {
    id: "rift",
    available: CASINO_TABLES_ENABLED,
    category: "slots",
    title: "Rift Core Overdrive",
    label: "Abre a fenda. Liberta o núcleo.",
    description: "Uma matriz de energia, cascatas e três modos de bónus.",
    thumbnail: "assets/casino/covers/rift-core-overdrive.webp",
    art: "reels",
  },
  {
    id: "blackjack",
    available: CASINO_TABLES_ENABLED,
    category: "tables",
    title: "Blackjack",
    label: "A próxima carta muda tudo.",
    description:
      "Uma mesa para pensar a próxima jogada, com cinco lugares e divisões de mãos.",
    art: "cards",
    thumbnail: "assets/casino/covers/blackjack.webp",
  },
  {
    id: "roulette",
    available: CASINO_TABLES_ENABLED,
    category: "tables",
    title: "Roleta",
    label: "Todos os olhos na roda.",
    description:
      "A roda europeia com apostas no tapete e saldo partilhado.",
    art: "wheel",
    thumbnail: "assets/casino/covers/roleta-europeia.webp",
  },
]);
