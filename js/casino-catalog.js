// Presentation placeholders. A game becomes playable only with its own local
// module AND an audited wallet settlement contract; never accept a client delta.
import * as config from "./config.js";
export const LOCAL_CASINO_TABLES = config.runtimeMode === "fixtures";
export const CASINO_CATALOG = Object.freeze([
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
    available: LOCAL_CASINO_TABLES,
    category: "slots",
    title: "Rift Core Overdrive",
    label: "Abre a fenda. Liberta o núcleo.",
    description: "Uma matriz de energia, cascatas e três modos de bónus.",
    thumbnail: "assets/casino/covers/rift-core-overdrive.webp",
    art: "reels",
  },
  {
    id: "blackjack",
    available: LOCAL_CASINO_TABLES,
    category: "tables",
    title: "Blackjack",
    label: "A próxima carta muda tudo.",
    description:
      "Uma mesa para pensar a próxima jogada. O jogo será disponibilizado depois da integração.",
    art: "cards",
    thumbnail: "assets/casino/covers/blackjack.webp",
  },
  {
    id: "roulette",
    available: LOCAL_CASINO_TABLES,
    category: "tables",
    title: "Roleta",
    label: "Todos os olhos na roda.",
    description:
      "O clássico de mesa terá o seu lugar no salão. Disponível após a integração do jogo.",
    art: "wheel",
    thumbnail: "assets/casino/covers/roleta-europeia.webp",
  },
]);
