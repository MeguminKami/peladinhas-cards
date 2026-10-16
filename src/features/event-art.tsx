import { EVENT_RARITIES, eventRarityId } from '../../js/event-rarity.js';
import { Icon } from '../shared/ui';

export function RarityBadge({ event }: { event: { rarity?: unknown } }) {
  const id = eventRarityId(event) as keyof typeof EVENT_RARITIES;
  const rarity = EVENT_RARITIES[id];
  return <span className="event-rarity-badge" data-rarity={id} aria-label={`Raridade: ${rarity.name}`}><svg viewBox="0 0 30 30" fill="none" aria-hidden="true"><path className="rarity-crest" d="m15 2 10 5v10l-10 6L5 17V7Z" /><path className="rarity-jewel" d="m15 7 5 5-5 6-5-6Z" /><g className="rarity-stars">{Array.from({ length: rarity.level }, (_, index) => <path key={index} d={`m${4 + index * 3} 25 1-1 1 1-1 1Z`} />)}</g></svg><span><strong>{rarity.name}</strong></span></span>;
}
export interface Reward { boosts?: Record<string, number>; specialId?: string }
export function RewardMarkers({ rewards = [] }: { rewards?: Reward[] }) {
  const stats = rewards.some(reward => Object.values(reward.boosts || {}).some(value => value > 0));
  const cards = rewards.some(reward => reward.specialId);
  if (!stats && !cards) return null;
  return <div className="event-reward-markers" aria-label="Tipos de recompensa">{stats && <span><Icon name="rewardStats" />Melhorias de stats</span>}{cards && <span><Icon name="rewardCard" />Carta especial</span>}</div>;
}
