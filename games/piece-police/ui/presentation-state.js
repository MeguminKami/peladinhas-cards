/** Presentation memory only; never changes engine events, money or RNG. */
export const SPEED_RATES = Object.freeze({normal:1,fast:2,ultra:3.75});
export function createPresentationState(snapshot = {}) {
  const seen = new Set(Array.isArray(snapshot.seen) ? snapshot.seen.filter(id=>typeof id==='string').slice(0,10) : []);
  let party = snapshot.party === true;
  return {
    shouldExplain(id, bonus) { if(!bonus)return true;if(seen.has(id))return false;seen.add(id);return true; },
    activateParty() { const repeated=party;party=true;return repeated; },
    partyActive(model) { return model.partyMode || model.kind==='bonus' && model.bonusId==='police' && party; },
    snapshot() { return {seen:[...seen],party}; },
  };
}
