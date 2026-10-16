import { loadLeague } from '../../js/data.js';
import { loadProfile } from '../../js/auth.js';
import { refreshMissionsForCurrentUser } from '../../js/missions.js';
import { applyPendingReads } from '../../js/notification-read-queue.js';
import * as DB from '../../js/db.js';
import { effectiveUser } from '../app/Chrome';
import type { League, Mission, Notice, User } from '../types';

/** The existing calculation pipeline is reused unchanged at the data boundary. */
export interface Session {realUser: User | null; user: User | null; league: League | null; missions: Mission[]; notifications: Notice[]}
export async function loadSession(hash: string): Promise<Session> {
  const realUser = await loadProfile() as User | null;
  const user = effectiveUser(realUser);
  if (!user || user.disabled) return {realUser, user, league: null, missions: [], notifications: []};
  if (['#/profile', `#/player/${user.uid}`].includes(hash)) await DB.callAdmin('ensureHistory', {}).catch(() => {});
  const league = await loadLeague() as unknown as League;
  const missions = await refreshMissionsForCurrentUser(user, league) as Mission[];
  const notifications = applyPendingReads(user.uid, await DB.syncNotifications(user.uid, missions)).sort((a: Notice,b: Notice) => (b.createdAt?.seconds || 0)-(a.createdAt?.seconds || 0)) as Notice[];
  return {realUser, user, league, missions, notifications};
}
