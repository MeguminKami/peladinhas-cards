import { useEffect, useRef } from 'react';
import type { PageContext, Player } from '../types';
import * as DB from '../../js/db.js';
import { ATTRIBUTES, FEEDBACK, completeInitial, completeFeedback, matchPerformance, formatDate, formatDateTime, asDate } from '../../js/utils.js';
import { lisbonDateInput, parseLisbonDateInput, formatMatchDate } from '../../js/match-time.js';
import { balancedTeams, teamBalance, balanceSignature, balanceMatches, BALANCE_SETTINGS } from '../../js/team-balance.js';
import { canEditRating, ratingEditDeadline } from '../../js/rating-window.js';
import { youtubeVideoId } from '../../js/youtube.js';
import { ASSET_PATHS, safeImage } from '../../js/assets.js';
import { compareEventRarity, eventRarityId } from '../../js/event-rarity.js';
import { eventIcon } from '../../js/icons.js';
import { eventEndLabel, eventEndMillis, medal, rewardText } from '../../js/event-model.js';
import { candidatesFor, votersFor, eventOutcome } from '../../js/event-rules.js';
import { applyPendingReads, queueNotificationReads, flushNotificationReads, pendingReadIds } from '../../js/notification-read-queue.js';
import { clearNativeNotifications } from '../../js/push.js';
import { friendlyError } from '../../js/ui.js';
import { Icon, Empty, PageHead, LinkButton } from '../shared/ui';
import { modal, toast, confirmDialog } from '../shared/overlays';
import { Card } from '../presentation/cards';
import { GamesPage, type GameListItem } from './games';
import { GamePage, type EditableGame } from './game-page';
import { gameParticipants, type GameTeams } from './game-domain';
import { TeamDraw } from './team-draw';
import { TeamBalancePanel, TeamBalanceAudit, type BalanceValue } from './team-balance';
import { TicketsPage } from './tickets';
import type { TicketService } from './contracts';
import { NotificationsPage } from './notifications';
import { MissionList, type Mission } from './missions';
import { EventsPage, type PublicEvent } from './events';
import { InitialRatingPage } from './initial-rating';
import { FeedbackPage, type FeedbackRecord } from './feedback';
import { LegacyEventPage, type LegacyEvent } from './legacy-event';
import { RarityBadge, RewardMarkers, type Reward } from './event-art';
import { historyForDisplay } from '../../js/card-history.js';
import { OvrAuditPage, type AuditSnapshot } from './ovr-audit';
import { AdminCardsPage, type CatalogTemplate } from './admin-cards';
import { WeeklyPhotoPage } from './weekly-photo';

const icon = (name: string) => <Icon name={name} />;
const attributes = ATTRIBUTES.map(([key, label]) => [key, label] as const);
const dimensions = FEEDBACK.map(([key, label]) => [key, label] as const);
const drawBalanced = balancedTeams as unknown as (players: { uid: string; ovr?: number }[], options: { previous: string }) => GameTeams;
const errorMessage = (error: unknown) => friendlyError(error);
const empty = (title: string, description = '') => <Empty title={title} description={description} />;

function DrawModal({ ctx, game, apply, close }: { ctx: PageContext; game: EditableGame; apply(teams: GameTeams): void; close(): void }) {
  const latest = useRef({ apply, close }); latest.current = { apply, close };
  useEffect(() => {
    const dismiss = modal('Escolher jogadores', <TeamDraw players={ctx.league.players} game={game} card={player => <Card player={player} size="sm" preview />} playersIcon={icon('players')} balance={(players, current) => drawBalanced(players, { previous: balanceSignature(current) })} apply={teams => { latest.current.apply(teams); dismiss(); }} notify={toast} errorMessage={errorMessage} />, () => latest.current.close());
    document.querySelector('.modal')?.classList.add('draw-selection-modal');
    return dismiss;
  }, []);
  return null;
}

function GameRoute({ ctx, id }: { ctx: PageContext; id: string }) {
  const saved = ctx.league.games.find(game => game.id === id) as EditableGame | undefined;
  const frozenFor = (game: EditableGame) => {
    const balances = ctx.league.balances as (BalanceValue & { id: string; playerOvr?: Record<string, number> })[] | undefined;
    return game.status === 'closed' ? balances?.find(value => value.id === id && balanceMatches({ ...saved, teamA: game.teamA, teamB: game.teamB }, value)) : undefined;
  };
  const balance = (game: EditableGame) => {
    const frozen = frozenFor(game);
    const value = (frozen || teamBalance(game, ctx.league.players)) as BalanceValue;
    const ranked = gameParticipants(game).map(uid => ctx.league.players.find(player => player.uid === uid)).filter((player): player is Player => !!player).map(player => ({ ...player, ovr: frozen?.playerOvr?.[player.uid] ?? player.ovr, hasCard: Number.isFinite(frozen?.playerOvr?.[player.uid]) || player.hasCard })).filter(player => player.hasCard && Number.isFinite(player.ovr)).sort((a, b) => b.ovr - a.ovr || a.uid.localeCompare(b.uid));
    return <TeamBalancePanel balance={value} ranked={ranked} admin={ctx.user.role === 'admin'} plusIcon={icon('plus')} card={player => <Card player={player} size="sm" preview />} details={() => modal('Equilíbrio das equipas', <TeamBalanceAudit balance={value} closed={game.status === 'closed'} frozen={!!frozen} attempts={BALANCE_SETTINGS.attempts} tolerance={BALANCE_SETTINGS.tolerance} />)} />;
  };
  return <GamePage key={id} ctx={ctx} id={id} saved={saved} players={ctx.league.players} summary={ctx.league.summaries.find(row => row.id === id)?.players || {}} dimensions={dimensions} dateInput={lisbonDateInput} parseDate={parseLisbonDateInput} videoId={value => youtubeVideoId(value) ?? null} initialPerformance={matchPerformance} save={(gameId, data) => DB.saveGame(gameId, data, ctx.user)} remove={gameId => DB.callAdmin('deleteGame', { gameId })} confirm={confirmDialog} notify={toast} errorMessage={errorMessage} balance={balance} draw={(game, apply, close) => <DrawModal ctx={ctx} game={game} apply={apply} close={close} />} card={player => <Card player={player} size="sm" preview />} referenceOvr={uid => saved && frozenFor(saved)?.playerOvr?.[uid]} icon={icon} formatDate={formatMatchDate} />;
}

async function renderInitial(ctx: PageContext, targetId?: string, adminInitial = false) {
  const self = adminInitial || !targetId;
  if (!adminInitial && targetId === ctx.user.uid) throw Error('Não podes avaliar-te nesta missão.');
  const uid = targetId || ctx.user.uid;
  const player = ctx.league.players.find(value => value.uid === uid);
  if (!player) return ctx.render(<Empty title="Jogador não encontrado" description="Volta à lista de missões." action={<LinkButton href="#/missions" type="secondary">Missões</LinkButton>} />);
  const saved = await DB.read(self ? `initialRatings/${uid}` : `communityRatings/${ctx.user.uid}_${uid}`);
  const initial = { ...Object.fromEntries(attributes.map(([key]) => [key, 0])), ...(saved?.ratings20 || {}) };
  ctx.render(<InitialRatingPage key={`${uid}-${self}`} self={self} adminInitial={adminInitial} playerName={player.displayName || player.username} initial={initial} locked={!canEditRating(saved, new Date(), self)} deadline={ratingEditDeadline(saved, self)} attributes={attributes} complete={completeInitial} save={(values, submit) => self ? DB.saveInitial(uid, values, submit) : DB.saveCommunity(ctx.user.uid, uid, values, submit)} onComplete={async () => { await ctx.refresh(); ctx.go(adminInitial ? '#/admin' : '#/missions'); }} notify={toast} errorMessage={errorMessage} checkIcon={icon('check')} arrowIcon={icon('arrow')} />);
}

async function renderFeedback(ctx: PageContext, id: string, editing = false) {
  const game = ctx.league.games.find(value => value.id === id);
  if (!game || game.status !== 'closed' || !gameParticipants(game).includes(ctx.user.uid)) return ctx.render(<Empty title="Avaliação indisponível" description="Podes avaliar os teus colegas depois de o jogo terminar." symbol="games" action={<LinkButton href="#/games" type="secondary">Ver jogos</LinkButton>} />);
  const existing = await DB.myFeedback(id, ctx.user.uid) as FeedbackRecord[];
  ctx.render(<FeedbackPage key={`${id}-${editing}-${existing.filter(row => row.submitted).length}`} uid={ctx.user.uid} gameId={id} game={game} users={ctx.league.users} existing={existing} editing={editing} dimensions={dimensions} canEdit={canEditRating} deadline={ratingEditDeadline} complete={completeFeedback} save={(target, values, submitted) => DB.saveFeedback(id, ctx.user.uid, target, values, submitted)} reload={async next => { await ctx.refresh(); await renderFeedback(ctx, id, next); }} safeImage={safeImage} avatar={ASSET_PATHS.avatar} icon={icon} notify={toast} errorMessage={errorMessage} />);
}

export async function renderFeatureRoute(ctx: PageContext, parts: string[]): Promise<boolean> {
  const [area, id, action] = parts;
  if (area === 'games') ctx.render(<GamesPage ctx={ctx} games={ctx.league.games as GameListItem[]} summaries={ctx.league.summaries} participants={gameParticipants} formatMatchDate={formatMatchDate} gameIcon={icon('games')} arrowIcon={icon('arrow')} plusIcon={icon('plus')} />);
  else if (area === 'game') { if (action === 'feedback') await renderFeedback(ctx, id); else ctx.render(<GameRoute key={id} ctx={ctx} id={id} />); }
  else if (area === 'tickets') ctx.render(<TicketsPage key={id || 'list'} ctx={ctx} id={id} service={DB as unknown as TicketService} formatDate={formatDate} confirm={confirmDialog} notify={toast} errorMessage={errorMessage} plusIcon={icon('plus')} arrowIcon={icon('arrow')} emptyIcon={icon('ball')} />);
  else if (area === 'notifications') ctx.render(<NotificationsPage uid={ctx.user.uid} items={applyPendingReads(ctx.user.uid, ctx.notifications)} go={ctx.go} queueReads={queueNotificationReads} flushReads={flushNotificationReads} clearNative={clearNativeNotifications} pendingIds={pendingReadIds} onChange={items => { ctx.notifications = items; }} notify={toast} formatDate={formatDate} medal={medal} checkIcon={icon('check')} bellIcon={icon('bell')} />);
  else if (area === 'missions') {
    if (id === 'self' || id === 'new') await renderInitial(ctx, id === 'new' ? action : undefined);
    else ctx.render(<><PageHead tag="A tua evolução" title="Missões" description="Acompanha os teus objetivos e as avaliações por concluir." /><div className="missions-workspace content-stack"><div className="missions-toolbar"><LinkButton href="#/events" type="secondary">Calendário e histórico de eventos</LinkButton></div><MissionList missions={ctx.missions as Mission[]} compareRarity={compareEventRarity} rarityId={eventRarityId} rarityBadge={mission => <RarityBadge event={mission} />} rewardMarkers={rewards => <RewardMarkers rewards={rewards as Reward[] | undefined} />} icon={icon} /></div></>);
  }
  else if (area === 'events') ctx.render(<EventsPage load={async () => (await DB.callAdmin('listEvents', { scope: 'all' })).data as PublicEvent[]} compareRarity={compareEventRarity} endMillis={eventEndMillis} endLabel={eventEndLabel} rarityId={eventRarityId} rarityBadge={event => <RarityBadge event={event} />} eventIcon={event => icon(eventIcon(event))} formatDate={formatDate} displayName={uid => ctx.league.users.find(user => user.uid === uid)?.displayName || uid || ''} arrowIcon={icon('arrow')} />);
  else if (area === 'event') {
    const event = await DB.eventDetails(id);
    if (!event) ctx.render(empty('Evento indisponível', 'Esta votação terminou ou não está disponível para a tua conta.'));
    else if (event.schemaVersion === 2) { const { managedEventPage } = await import('./managed-event'); await managedEventPage(ctx, event); }
    else {
      const saved = await DB.read(`events/${id}/votes/${ctx.user.uid}`);
      ctx.render(<LegacyEventPage key={id} ctx={ctx} event={event as LegacyEvent} saved={saved} available={event.status === 'open' && +asDate(event.endsAt) > Date.now() && votersFor(event, ctx.league.users, ctx.league.games).includes(ctx.user.uid)} candidates={question => candidatesFor(event, question, ctx.league.users, ctx.league.games)} displayName={uid => ctx.league.users.find(user => user.uid === uid)?.displayName || uid} rarityId={eventRarityId(event)} rarityBadge={<RarityBadge event={event} />} arrowIcon={icon('arrow')} emptyIcon={icon('ball')} formatDate={formatDateTime} outcome={eventOutcome(event, ctx.league.users)} rewardText={rewardText} vote={answers => DB.callAdmin('voteEvent', { eventId: id, answers })} notify={toast} errorMessage={errorMessage} />);
    }
  }
  else if (area === 'admin' && id === 'card-types') ctx.render(<AdminCardsPage ctx={ctx} uid={action} created={await DB.list('cardThemes') as CatalogTemplate[]} />);
  else if (area === 'admin' && id === 'card-photo') {
    const player = ctx.league.players.find(value => value.uid === action);
    ctx.render(player ? <WeeklyPhotoPage key={action} ctx={ctx} player={player} /> : <><PageHead tag="Administração" title="Cartas" /><Empty title="Sem jogadores" description="Adiciona jogadores para consultar as cartas." /></>);
  }
  else if (area === 'admin' && id === 'support') ctx.render(<TicketsPage admin ctx={ctx} service={DB as unknown as TicketService} formatDate={formatDate} confirm={confirmDialog} notify={toast} errorMessage={errorMessage} plusIcon={icon('plus')} arrowIcon={icon('arrow')} emptyIcon={icon('ball')} />);
  else if (area === 'admin' && id === 'ovr') {
    const player = ctx.league.players.find(value => value.uid === action);
    if (ctx.user.role !== 'admin') ctx.render(empty('Acesso reservado'));
    else if (!player) ctx.render(empty('Jogador não encontrado'));
    else if (!player.hasCard) ctx.render(<Empty title="Carta pendente" description="O jogador precisa de concluir a autoavaliação." action={<LinkButton href={`#/player/${action}`}>Ver perfil</LinkButton>} />);
    else { const history = historyForDisplay(player, await DB.history(action)).sort((a: AuditSnapshot, b: AuditSnapshot) => b.weekId.localeCompare(a.weekId)); ctx.render(<OvrAuditPage key={action} ctx={ctx} player={player} history={history} initialWeek={parts[3]} />); }
  }
  else if (area === 'admin' && id === 'initial') { if (ctx.user.role !== 'admin') ctx.render(empty('Acesso reservado')); else await renderInitial(ctx, action, true); }
  else return false;
  return true;
}
