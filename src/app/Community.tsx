import { useState } from 'react';
import { ATTRIBUTES, average, calculateWeeklyTopPlayers, isoWeek, themeName } from '../../js/utils.js';
import { compareEventRarity, eventRarityId, EVENT_RARITIES } from '../../js/event-rarity.js';
import { Card } from '../presentation/cards';
import { HomePodium } from '../presentation/home-podium';
import { MissionList } from '../features/missions';
import { GameRows } from '../features/games';
import { participants } from '../../js/utils.js';
import { formatMatchDate } from '../../js/match-time.js';
import { ASSET_PATHS, safeImage } from '../../js/assets.js';
import { Empty, Icon, LinkButton, PageHead } from '../shared/ui';
import { InstallSpotlight } from './Pwa';
import { PushSettings } from './PushSettings';
import type { PageContext, Player, Timestamp } from '../types';

export function RarityBadge({event}: {event: object}) {
  const id = eventRarityId(event) as keyof typeof EVENT_RARITIES;
  const rarity = EVENT_RARITIES[id];
  return <span className="event-rarity-badge" data-rarity={id} aria-label={`Raridade: ${rarity.name}`}><svg viewBox="0 0 30 30" fill="none" aria-hidden="true"><path className="rarity-crest" d="m15 2 10 5v10l-10 6L5 17V7Z"/><path className="rarity-jewel" d="m15 7 5 5-5 6-5-6Z"/><g className="rarity-stars">{Array.from({length: rarity.level}, (_, i) => <path key={i} d={`m${4+i*3} 25 1-1 1 1-1 1Z`}/>)}</g></svg><span><strong>{rarity.name}</strong></span></span>;
}
export function RewardMarkers({rewards}: {rewards: unknown}) {
  if (!Array.isArray(rewards)) return null;
  const rows = rewards as {boosts?: Record<string, number>; specialId?: string}[];
  const stats = rows.some(row => Object.values(row.boosts || {}).some(value => value > 0));
  const cards = rows.some(row => row.specialId);
  return !stats && !cards ? null : <div className="event-reward-markers" aria-label="Tipos de recompensa">{stats && <span><Icon name="rewardStats"/>Melhorias de stats</span>}{cards && <span><Icon name="rewardCard"/>Carta especial</span>}</div>;
}
export function Missions({ctx, grouped = true, home = false}: {ctx: PageContext; grouped?: boolean; home?: boolean}) {
  const rows = home ? [...ctx.missions].sort(compareEventRarity).slice(0, 4) : ctx.missions;
  return <MissionList missions={rows} grouped={grouped} compareRarity={compareEventRarity} rarityId={eventRarityId} rarityBadge={mission => <RarityBadge event={mission}/>} rewardMarkers={rewards => <RewardMarkers rewards={rewards}/>} icon={name => <Icon name={name}/>}/>;
}
function RecentGames({ctx}: {ctx: PageContext}) {
  return <GameRows games={ctx.league.games.slice(0,3).map(game => ({...game, scheduledAt: game.scheduledAt as Timestamp | undefined}))} summaries={ctx.league.summaries} participants={participants} formatMatchDate={value => formatMatchDate(value)} gameIcon={<Icon name="games"/>} arrowIcon={<Icon name="arrow"/>}/>;
}
export function Home({ctx}: {ctx: PageContext}) {
  const [desktop, setDesktop] = useState(() => matchMedia('(min-width: 801px)').matches);
  // Placement follows the original installation campaign's responsive composition.
  useResponsiveDesktop(setDesktop);
  const me = ctx.league.players.find(player => player.uid === ctx.user.uid);
  const hour = Number(new Intl.DateTimeFormat('pt-PT', {timeZone:'Europe/Lisbon', hour:'numeric', hourCycle:'h23'}).format(new Date()));
  const canCreate = ['admin','dbs'].includes(ctx.user.role);
  const metrics = [
    ['OVR', me?.hasCard ? me.ovr : '—'],
    ['Forma', me?.aggregates.length ? average(me.aggregates.slice(-5).map(row => row.overall)).toFixed(1) : '—'],
    ['Jogos', me?.matchStats.played || 0], ['Vitórias', me?.matchStats.wins || 0], ['Golos', me?.matchStats.goals || 0], ['Assistências', me?.matchStats.assists || 0],
    ['% vitórias', `${me?.matchStats.winRate || 0}%`, true],
    ['Golos / jogo', me?.matchStats.played ? (me.matchStats.goals / me.matchStats.played).toLocaleString('pt-PT',{maximumFractionDigits:1}) : '0', true],
    ['Assist. / jogo', me?.matchStats.played ? (me.matchStats.assists / me.matchStats.played).toLocaleString('pt-PT',{maximumFractionDigits:1}) : '0', true],
  ] as const;
  return <><div className="dashboard-greeting"><div><p className="eyebrow">{ctx.league.cycle.weekId} / {ctx.league.cycle.phase === 'closed' ? 'CARTAS FECHADAS' : 'A TUA COMUNIDADE'}</p><h1>{hour < 12 ? 'Bom dia' : hour < 19 ? 'Boa tarde' : 'Boa noite'}, {ctx.user.displayName || ctx.user.username}.</h1><p>Pronto para mais uma Peladinha?</p></div>{canCreate && <LinkButton href="#/game/new" type="secondary" symbol="plus">Criar jogo</LinkButton>}</div><PushSettings invitation/>{!desktop && <InstallSpotlight/>}<section className="weekly-section"><div className="section-head"><div><p className="eyebrow">Os destaques da liga</p><h2>No topo da liga</h2></div><LinkButton href="#/ranking" type="ghost" symbol="trophy">Ver classificação completa</LinkButton></div><div id="home-podium"><HomePodium players={ctx.league.players.filter(player => player.hasCard)}/></div></section><div className="dashboard-columns"><section className="panel my-card-panel"><div className="section-head"><h2>A minha carta</h2><LinkButton href="#/profile" type="ghost">Ver perfil</LinkButton></div>{me ? <Card player={me}/> : <Empty title="Perfil em preparação"/>}<div className="metrics compact-metrics">{metrics.map(([label,value,extra]) => <div key={label} className={extra ? 'dashboard-extra-stat' : undefined}><small>{label}</small><b>{value}</b></div>)}</div><div className="my-card-actions"><LinkButton href="#/statistics" type="secondary" symbol="chart">Comparar na liga</LinkButton></div></section><section className="panel dashboard-missions content-stack"><div className="section-head"><h2>As tuas missões</h2><span className="pill">{ctx.missions.length} {ctx.missions.length === 1 ? 'pendente' : 'pendentes'}</span></div><Missions ctx={ctx} home grouped={false}/>{ctx.missions.length > 4 && <div className="missions-toolbar"><LinkButton href="#/missions" type="secondary">Ver todas as missões</LinkButton></div>}</section></div><section><div className="section-head"><h2>Últimas Peladinhas</h2><LinkButton href="#/games" type="ghost">Todos os jogos</LinkButton></div>{ctx.league.games.length ? <RecentGames ctx={ctx}/> : <Empty title="O próximo jogo começa aqui" description={canCreate ? 'Cria uma Peladinha e reúne os teus colegas.' : 'Assim que a liga marcar uma Peladinha, encontras aqui as equipas e os detalhes.'} symbol="games" action={canCreate && <LinkButton href="#/game/new" symbol="plus">Criar jogo</LinkButton>}/>}</section>{desktop && <InstallSpotlight/>}</>;
}
import { useEffect } from 'react';
function useResponsiveDesktop(change: (value: boolean) => void) {
  useEffect(() => {const query = matchMedia('(min-width: 801px)'); const update = () => change(query.matches); query.addEventListener('change', update); return () => query.removeEventListener('change', update);}, [change]);
}
const filters = {search:'', sort:'ovr', direction:'desc'};
const searchable = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function Players({ctx}: {ctx: PageContext}) {
  const [filter, setFilter] = useState({...filters});
  const update = (key: keyof typeof filters, value: string) => {Object.assign(filters,{[key]:value}); setFilter({...filters});};
  const rows = ctx.league.players.filter(player => searchable(`${player.username} ${player.displayName}`).includes(searchable(filter.search))).sort((a,b) => {
    const byName = (a.displayName || a.username).localeCompare(b.displayName || b.username, 'pt-PT');
    if (filter.sort === 'name') return filter.direction === 'desc' ? -byName : byName;
    if (a.hasCard !== b.hasCard) return a.hasCard ? -1 : 1;
    const value = (player: Player) => filter.sort === 'ovr' ? player.ovr : player.stats?.[filter.sort];
    return ((Number(value(a)) || 0)-(Number(value(b)) || 0)) * (filter.direction === 'asc' ? 1 : -1) || byName;
  });
  return <><PageHead tag="A comunidade" title="Jogadores" description="Cada carta tem uma história. As setas verdes e vermelhas mostram a variação face à semana anterior."/><div className="filters panel"><label className="search-field">Procurar<input id="search" placeholder="Nome ou username" value={filter.search} onChange={e => update('search',e.target.value)}/></label><label>Ordenar<select id="sort" value={filter.sort} onChange={e => update('sort',e.target.value)}><option value="ovr">OVR</option><option value="name">Nome</option>{ATTRIBUTES.map(([key,name]) => <option key={key} value={key}>{name}</option>)}</select></label><label>Por<select id="sort-direction" value={filter.direction} onChange={e => update('direction',e.target.value)}><option value="desc">Decrescente</option><option value="asc">Crescente</option></select></label></div><div id="player-grid" className="card-grid">{rows.length ? rows.map(player => <div key={player.uid} className="grid-player"><Card player={player} size="sm"/><span className="pill">{player.hasCard ? player.official ? 'Oficial' : 'Provisória' : 'Carta pendente'}</span></div>) : <Empty title={ctx.league.players.length ? 'Nenhum jogador encontrado' : 'Ainda não existem jogadores para mostrar'} description={ctx.league.players.length ? 'Experimenta outros filtros.' : 'Quando novos jogadores entrarem nas Peladinhas Cards, as suas cartas irão aparecer aqui.'} symbol="players"/>}</div></>;
}
export function Ranking({ctx}: {ctx: PageContext}) {
  const rows = calculateWeeklyTopPlayers(ctx.league.players.filter(player => player.hasCard)) as (Player & {weeklyPerformance?: number})[];
  return <><PageHead tag={isoWeek()} title="Ranking semanal" description="Média dos jogos da semana com pelo menos 2 avaliações válidas; desempate por OVR. Sem avaliações, o OVR serve de referência."/><div className="ranking-list">{rows.length ? rows.map((player,index) => <a key={player.uid} className="ranking-row panel" href={`#/player/${player.uid}`}><span className="ranking-number">{index+1}</span><img src={safeImage(player.photoURL)} alt="" data-fallback={ASSET_PATHS.avatar} onError={event => {event.currentTarget.src=ASSET_PATHS.avatar;}}/><div><b>{player.displayName || player.username}</b><small>{themeName(player.cardType)}</small></div><div><small>OVR</small><b>{player.ovr}</b></div><div><small>Forma semanal</small><b>{player.weeklyPerformance?.toFixed(2) || '—'}</b></div><Icon name="arrow"/></a>) : <Empty title="A classificação começa contigo" description="Conclui a autoavaliação para criares a tua carta." symbol="trophy" action={<LinkButton href="#/missions">Missões</LinkButton>}/>}</div></>;
}
