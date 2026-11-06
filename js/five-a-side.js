// Display-only slots: never change roster order, captaincy or recorded positions.
export const FIVE_A_SIDE_POSITIONS = [
  { x: 9, y: 26, label: 'Defesa' },
  { x: 9, y: 74, label: 'Defesa' },
  { x: 25, y: 50, label: 'Meio-campo' },
  { x: 41, y: 26, label: 'Ataque' },
  { x: 41, y: 74, label: 'Ataque' },
];

export function createFiveAsidePlacement(seed) {
  const teams = new Map();
  return (side, starters) => {
    let slots = teams.get(side);
    if (!slots) {
      // Stable pseudo-random draw per match and side, including after reopening.
      let state = 2166136261;
      for (const char of seed + side) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
      const ids = [...starters].sort();
      for (let i = ids.length - 1; i > 0; i--) {
        state += 0x6d2b79f5;
        let n = Math.imul(state ^ state >>> 15, state | 1);
        n ^= n + Math.imul(n ^ n >>> 7, n | 61);
        const j = Math.floor(((n ^ n >>> 14) >>> 0) / 4294967296 * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      slots = Array.from({ length: 5 }, (_, i) => ids[i] || null);
    }
    slots = slots.map(uid => starters.includes(uid) ? uid : null);
    for (const uid of starters) {
      if (!slots.includes(uid) && slots.includes(null)) slots[slots.indexOf(null)] = uid;
    }
    teams.set(side, slots);
    return [...slots];
  };
}
