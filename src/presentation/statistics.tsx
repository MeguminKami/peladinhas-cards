import { useState } from 'react';
import { average } from '../../js/utils.js';
import { Empty } from '../shared/ui';
import type { PageContext } from '../types';
interface StatisticsRow {uid:string;name:string;position:string;ovr:number|null;form:number|null;[key:string]:string|number|null}


const columns = [['name','Jogador'],['position','Posição'],['ovr','OVR'],['played','Jogos'],['wins','Vitórias'],['draws','Empates'],['losses','Derrotas'],['winRate','Vitórias (%)'],['goals','Golos'],['assists','Assistências'],['goalsFor','Golos da equipa'],['goalsAgainst','Golos sofridos'],['form','Forma / 5']];
export function statisticsPage(ctx: PageContext) { ctx.render(<StatisticsPage ctx={ctx}/>); }
export function StatisticsPage({ ctx }: { ctx: PageContext }) {
  const [sort, setSort] = useState({ key: 'goals', direction: 'desc' });
  const closed = ctx.league.games.filter((g) => g.status === 'closed');
  const goals = closed.reduce((n: number, g) => n + g.score.teamA + g.score.teamB, 0);
  const players:StatisticsRow[] = ctx.league.players.map((p) => ({ ...p.matchStats, uid:p.uid, name: p.displayName || p.username, position: p.primaryPosition || '—', ovr: p.hasCard ? p.ovr : null, form: p.aggregates.length ? average(p.aggregates.map((a) => a.overall)) : null })).sort((a:StatisticsRow,b:StatisticsRow) => {
    if(a[sort.key] == null) return b[sort.key] == null ? 0 : 1;
    if(b[sort.key] == null) return -1;
    const difference = typeof a[sort.key] === 'string' ? String(a[sort.key]).localeCompare(String(b[sort.key]), 'pt-PT') : Number(a[sort.key])-Number(b[sort.key]);
    return difference * (sort.direction === 'asc' ? 1 : -1) || a.name.localeCompare(b.name);
  });
  const choose = (key: string) => setSort({key, direction: ['name','position'].includes(key) ? 'asc' : 'desc'});
  return <><header className="page-head"><div><p className="eyebrow">A liga em números</p><h1>Estatísticas</h1></div></header><div className="metrics statistics-metrics">{[['Jogadores',ctx.league.players.length],['Jogos finalizados',closed.length],['Golos da liga',goals],['Assistências',ctx.league.players.reduce((n:number,p)=>n+p.matchStats.assists,0)],['Golos por jogo',closed.length ? (goals/closed.length).toFixed(1) : '—']].map(([label,value])=><div key={label}><small>{label}</small><b>{value}</b></div>)}</div><section className="panel statistics-panel"><div id="statistics-controls" className="statistics-controls"><label>Ordenar por<select id="statistics-sort" value={sort.key} onChange={e=>choose(e.target.value)}>{columns.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Ordem<select id="statistics-direction" value={sort.direction} onChange={e=>setSort({...sort,direction:e.target.value})}><option value="desc">Maior primeiro</option><option value="asc">Menor primeiro</option></select></label></div><div id="statistics-table">{players.length ? <table className="statistics-table"><thead><tr>{columns.map(([id,label])=><th key={id} scope="col" className={`stat-${id}`} aria-sort={id===sort.key ? sort.direction==='asc' ? 'ascending':'descending':'none'}><button type="button" data-stat-sort={id} onClick={()=>id===sort.key ? setSort({...sort,direction:sort.direction==='asc'?'desc':'asc'}) : choose(id)}>{label}<span aria-hidden="true">{id===sort.key ? sort.direction==='asc'?'↑':'↓':'↕'}</span></button></th>)}</tr></thead><tbody>{players.map((p)=><tr key={p.uid}>{columns.map(([id,label])=><td key={id} className={`stat-${id}`} data-label={label}>{id==='name' ? <a href={`#/player/${p.uid}`}>{p.name}</a> : id==='form' ? p.form?.toFixed(2) ?? '—' : id==='winRate' ? `${p.winRate}%` : p[id] ?? '—'}</td>)}</tr>)}</tbody></table> : <Empty title="Ainda sem jogadores"/>}</div></section></>;
}
