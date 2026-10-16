// Prestige is presentation only; it never participates in reward calculations.
export const EVENT_RARITIES = Object.freeze({
  bronze: { name: "Bronze", level: 1 },
  silver: { name: "Prata", level: 2 },
  gold: { name: "Ouro", level: 3 },
  "special-gold": { name: "Especial Dourada", level: 4 },
  elite: { name: "Elite", level: 5 },
  icon: { name: "Ícone", level: 6 },
  ultimate: { name: "Ultimate", level: 7 },
});

export function eventRarityId(event) {
  return Object.hasOwn(EVENT_RARITIES, event?.rarity) ? event.rarity : "bronze";
}

export function rarityBadge(event) {
  const id = eventRarityId(event), rarity = EVENT_RARITIES[id];
  const jewels = Array.from({ length: rarity.level }, (_, i) => `<path d="m${4 + i * 3} 25 1-1 1 1-1 1Z"/>`).join("");
  return `<span class="event-rarity-badge" data-rarity="${id}" aria-label="Raridade: ${rarity.name}"><svg viewBox="0 0 30 30" fill="none" aria-hidden="true"><path class="rarity-crest" d="m15 2 10 5v10l-10 6L5 17V7Z"/><path class="rarity-jewel" d="m15 7 5 5-5 6-5-6Z"/><g class="rarity-stars">${jewels}</g></svg><span><strong>${rarity.name}</strong></span></span>`;
}

export function compareEventRarity(a, b) {
  return EVENT_RARITIES[eventRarityId(b)].level - EVENT_RARITIES[eventRarityId(a)].level;
}
