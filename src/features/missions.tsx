import type { CSSProperties, ReactNode } from 'react';
import { FeatureEmpty } from './presentation';

export interface Mission {
  id: string; type: string; title: string; description: string; done: number; total: number;
  href: string; icon: string; rarity?: string; eventDescription?: string; hiddenCard?: boolean;
  rewards?: unknown;
}
export interface MissionListProps {
  missions: Mission[]; grouped?: boolean;
  compareRarity(a: Mission, b: Mission): number;
  rarityId(mission: Mission): string;
  rarityBadge(mission: Mission): ReactNode;
  rewardMarkers(rewards: unknown): ReactNode;
  icon(name: string): ReactNode;
}
export function MissionList({ missions, grouped = true, compareRarity, rarityId, rarityBadge, rewardMarkers, icon }: MissionListProps) {
  const visible = missions.filter(mission => !mission.hiddenCard && mission.type !== 'HIDDEN_CARD');
  if (!visible.length) return <FeatureEmpty title="Tudo tratado!" description="Não tens missões pendentes neste momento. Volta depois da próxima Peladinha." icon={icon('check')} action={<a className="btn btn-secondary" href="#/games">{icon('arrow')}Ver jogos</a>} />;
  const ordered = [...visible].sort(compareRarity);
  const competitions = ordered.filter(mission => mission.type === 'COMPETITION_OBJECTIVE');
  const remaining = ordered.filter(mission => mission.type !== 'COMPETITION_OBJECTIVE');
  const cards = (entries: Mission[]) => <div className="mission-list">{entries.map(mission => {
    const competition = mission.type === 'COMPETITION_OBJECTIVE';
    const percentage = Math.round(mission.done / mission.total * 100);
    return <a key={mission.id} className={`mission${competition ? ' mission-competition' : ''}${mission.rarity ? ' event-rarity-surface' : ''}`} data-rarity={mission.rarity ? rarityId(mission) : undefined} href={mission.href}><div className="mission-symbol">{icon(mission.icon)}</div><div className="mission-content"><div className="mission-heading"><h3>{mission.title}</h3>{mission.rarity && rarityBadge(mission)}{mission.eventDescription?.trim() && <p className="mission-event-description">{mission.eventDescription.trim()}</p>}{competition && <span className="mission-competition-label">Competição</span>}</div><p>{mission.description}</p>{rewardMarkers(mission.rewards)}<div className="progress"><span style={{ '--progress': `${percentage}%` } as CSSProperties} /></div><small>{mission.done} / {mission.total} · {percentage}%</small></div><span className="mission-arrow">{icon('arrow')}</span></a>;
  })}</div>;
  if (!grouped) return cards(ordered);
  if (!competitions.length) return cards(remaining);
  return <div className="mission-groups"><section className="mission-competitions" aria-label="Competições em curso"><div className="mission-group-head"><h2>Competições em curso</h2><span className="pill">{competitions.length} {competitions.length === 1 ? 'ativa' : 'ativas'}</span></div>{cards(competitions)}</section>{!!remaining.length && <section className="mission-group"><div className="mission-group-head"><h2>Missões</h2></div>{cards(remaining)}</section>}</div>;
}
