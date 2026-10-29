import { shopFunds, payFromCasinoFunds } from "./casino-shop-payment.js";
// Public, static catalogue. Opening it never needs a wallet or player read.
export const SHOP_CARDS = Object.freeze(
  [
    // Minimums match calculateBaseCard / BASE_EDITIONS: bronze 50, silver 65, gold 75.
    {
      id: "bronze-foundry",
      name: "Bronze Forjado",
      rarity: "Especial",
      group: "metals",
      price: 1000,
      minOvr: 50,
      description: "Cobre escovado, rebites e a marca de quem começa no campo.",
    },
    {
      id: "silver-mirror",
      name: "Prata Reflexo",
      rarity: "Especial",
      group: "metals",
      price: 2500,
      minOvr: 65,
      description: "Prata polida e cortes de luz. Precisão em cada detalhe.",
    },
    {
      id: "gold-vault",
      name: "Ouro Reserva",
      rarity: "Especial",
      group: "metals",
      price: 4000,
      minOvr: 75,
      description:
        "Ouro gravado e geometria de cofre. Uma conquista para guardar.",
    },
    {
      id: "platinum-prism",
      name: "Platina · Prisma",
      rarity: "Prestígio I",
      group: "metals",
      price: 5000,
      minOvr: 85,
      description:
        "Platina lapidada e reflexos ciano. O primeiro passo para além do ouro.",
    },
    {
      id: "palladium-flare",
      name: "Paládio · Aurora",
      rarity: "Prestígio II",
      group: "metals",
      price: 8000,
      minOvr: 88,
      description: "Paládio espelhado, esmalte coral e lâminas de luz magenta.",
    },
    {
      id: "iridium-pulse",
      name: "Irídio · Pulso",
      rarity: "Prestígio III",
      group: "metals",
      price: 12000,
      minOvr: 90,
      description:
        "Metal iridescente, violeta saturado e um pulso que atravessa a liga.",
    },
    {
      id: "rhodium-crown",
      name: "Ródio · Coroa",
      rarity: "Prestígio IV",
      group: "metals",
      price: 18000,
      minOvr: 93,
      description:
        "Ródio luminoso, verde elétrico e nervuras de uma coroa desportiva.",
    },
    {
      id: "osmium-apex",
      name: "Ósmio · Apogeu",
      rarity: "Prestígio V",
      group: "metals",
      price: 25000,
      minOvr: 95,
      description:
        "Azul-cobalto, prata branca e facetas em estrela. O topo da coleção metálica.",
    },
    {
      id: "blackjack-private",
      name: "Blackjack · Sala Privada",
      rarity: "Rara",
      group: "games",
      price: 5000,
      minOvr: 80,
      description:
        "Feltro verde, madeira escura e marfim. Um ás de espadas sela a moldura da sala privada.",
    },
    {
      id: "roulette-european",
      name: "Roleta · Último Instante",
      rarity: "Épica",
      group: "games",
      price: 7500,
      minOvr: 85,
      description:
        "Latão, madeira polida e a roda vermelha e preta. A bola suspensa guarda o instante antes do resultado.",
    },
    {
      id: "cardoso-asphalt",
      name: "Cardoso Road · Fuga ao Óleo",
      rarity: "Épica",
      group: "games",
      price: 6500,
      minOvr: 82,
      description:
        "Ferro de ginásio, borracha e óleo âmbar. Dez etapas e uma corrente partida para fugir ao caos.",
    },
    {
      id: "rift-core",
      name: "RIFT//CORE · Overdrive",
      rarity: "Lendária",
      group: "games",
      price: 12000,
      minOvr: 90,
      description:
        "Titânio negro, energia ciano e violeta. Uma fratura luminosa expõe o reator dimensional.",
    },
    {
      id: "glory-night",
      name: "Futebol de Bairro · Noite de Glória",
      rarity: "Épica",
      group: "games",
      price: 9000,
      minOvr: 88,
      description:
        "Campo noturno, vedação e projetores. O azul-noite encontra o dourado de uma final do bairro.",
    },
  ].map(Object.freeze),
);

// Retain earlier local purchases without keeping these editions on sale.
export const SHOP_ARCHIVED_CARDS = Object.freeze(
  [
    {
      id: "peladinhas-founders",
      name: "Fundadores da Liga",
      rarity: "Épica",
      group: "club",
      price: 11000,
      minOvr: 80,
      description: "O emblema, a comunidade e as raízes de Peladinhas Cards.",
    },
    {
      id: "peladinhas-tactics",
      name: "Visão de Jogo",
      rarity: "Lendária",
      group: "club",
      price: 15000,
      minOvr: 85,
      description:
        "Linhas de passe e desenho tático para quem vê a próxima jogada.",
    },
    {
      id: "casino-royal",
      name: "Royal do Bairro",
      rarity: "Lendária",
      group: "club",
      price: 25000,
      minOvr: 90,
      description:
        "Obsidiana, filigrana e rubis. A assinatura máxima do casino.",
    },
  ].map(Object.freeze),
);

export function buyShopCard(state, id) {
  const card = SHOP_CARDS.find((item) => item.id === id);
  if (!card) throw Error("Esta carta não existe no catálogo.");
  if (
    !Array.isArray(state.owned) ||
    !Number.isSafeInteger(state.balance) ||
    state.balance < 0 ||
    !Number.isFinite(state.ovr)
  )
    throw Error("Os dados locais são inválidos. Repõe a demonstração.");
  if (state.owned.includes(id))
    throw Error("Esta carta já faz parte da tua coleção.");
  if (state.ovr < card.minOvr)
    throw Error(
      `Precisas de ${card.minOvr} OVR. O teu jogador tem ${state.ovr} OVR.`,
    );
  const available = shopFunds(state);
  if (available < card.price)
    throw Error(
      `Saldo insuficiente. Faltam ${new Intl.NumberFormat("pt-PT").format(card.price - available)} DJC.`,
    );
  return {
    ...payFromCasinoFunds(state, card.price),
    owned: [...state.owned, id],
  };
}
