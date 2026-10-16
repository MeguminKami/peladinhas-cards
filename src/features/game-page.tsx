import { useState, type FormEvent, type ReactNode } from 'react';
import type { FeatureContext, Timestamp } from './contracts';
import { FeatureEmpty, FeatureHeading } from './presentation';
import { TeamBuilder, type TeamPlayer } from './team-builder';
import { GameVideo, MatchPerformance, MatchRatings } from './game-sections';
import { captureMatchPositions, gameParticipants, moveTeamPlayer, serializePerformance, type GameTeams, type PerformanceCount, type TeamKind, type TeamSide } from './game-domain';

export interface EditableGame extends GameTeams {
  id?: string; title: string; location?: string; notes?: string; status: string;
  scheduledAt?: Timestamp | Date | string | null; youtubeVideoId?: string;
  positions?: Record<string, string>; score: Record<TeamSide, number>;
}
export interface GamePageProps {
  ctx: FeatureContext & { refresh(): Promise<void> };
  id: string; saved?: EditableGame; players: (TeamPlayer & { primaryPosition?: string })[];
  summary: Record<string, Record<string, number | undefined>>;
  dimensions: readonly (readonly [string, string])[];
  dateInput(value: Timestamp | Date | string | null | undefined): string;
  parseDate(value: string): unknown;
  videoId(value: string): string | null;
  initialPerformance(uid: string, game: EditableGame): PerformanceCount;
  save(id: string | undefined, data: Record<string, unknown>): Promise<string>;
  remove(id: string): Promise<unknown>;
  confirm(message: string): Promise<boolean>;
  notify(message: string, type?: string): void;
  errorMessage(error: unknown): string;
  balance(game: EditableGame): ReactNode;
  draw(game: EditableGame, apply: (teams: GameTeams) => void, close: () => void): ReactNode;
  card(player: TeamPlayer): ReactNode;
  referenceOvr?(uid: string): number | undefined;
  icon(name: string): ReactNode;
  formatDate(value: Timestamp | Date | string | null | undefined): string;
}
export function GamePage(props: GamePageProps) {
  const { saved, ctx } = props;
  const [game, setGame] = useState<EditableGame>(() => saved ? structuredClone({ ...saved, scheduledAt: props.dateInput(saved.scheduledAt), createdAt: null, closedAt: null, updatedAt: null }) : { title: '', location: '', notes: '', status: 'draft', scheduledAt: '', teamA: { starters: [], bench: [] }, teamB: { starters: [], bench: [] }, score: { teamA: 0, teamB: 0 } });
  const [performance, setPerformance] = useState<Record<string, PerformanceCount>>(() => Object.fromEntries(gameParticipants(game).map(uid => [uid, props.initialPerformance(uid, game)])));
  const [pending, setPending] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [youtube, setYoutube] = useState(game.youtubeVideoId ? `https://www.youtube.com/watch?v=${game.youtubeVideoId}` : '');
  const manager = ['admin', 'dbs'].includes(ctx.user.role);
  const editable = manager && (game.status !== 'closed' || ctx.user.role === 'admin');
  if (props.id !== 'new' && !saved) return <FeatureEmpty title="Jogo não encontrado" description="Pode ter sido eliminado." action={<a className="btn btn-secondary" href="#/games">{props.icon('arrow')}Ver jogos</a>} icon={props.icon('ball')} />;
  if (!saved && !manager) return <FeatureEmpty title="Acesso reservado" description="Só DBS e administradores podem criar jogos." action={<a className="btn btn-primary" href="#/games">{props.icon('arrow')}Ver jogos</a>} icon={props.icon('ball')} />;
  const update = <K extends keyof EditableGame>(key: K, value: EditableGame[K]) => setGame(current => ({ ...current, [key]: value }));
  const move = (uid: string, team?: TeamSide, kind?: TeamKind) => {
    try { setGame({ ...game, ...moveTeamPlayer(game, uid, props.players, team, kind) }); }
    catch (error) { props.notify(props.errorMessage(error), 'error'); }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editable || pending) return;
    const action = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value || 'save';
    if (action === 'close' && !(manager && game.status === 'open')) return;
    if (action === 'close' && (!game.teamA.starters.length || !game.teamB.starters.length)) return props.notify('Adiciona pelo menos um titular em cada equipa.', 'error');
    const video = props.videoId(youtube);
    if (video === null) return props.notify('Introduz um link de vídeo válido do YouTube.', 'error');
    setPending(true);
    try {
      const data = { title: game.title.trim(), location: (game.location || '').trim(), notes: (game.notes || '').trim(), youtubeVideoId: video, scheduledAt: props.parseDate(String(game.scheduledAt || '')), teamA: game.teamA, teamB: game.teamB, positions: captureMatchPositions(game, props.players), performance: serializePerformance(game, performance, game.score), score: game.score, status: action === 'close' ? 'closed' : action === 'open' ? 'open' : action === 'draft' ? 'draft' : game.status };
      const id = await props.save(saved?.id, data);
      props.notify(action === 'close' ? 'Jogo encerrado.' : saved ? 'Jogo guardado.' : 'Jogo criado.');
      await ctx.refresh(); ctx.go(`#/game/${id}`);
    } catch (error) { props.notify(props.errorMessage(error), 'error'); }
    finally { setPending(false); }
  };
  const share = async () => {
    if (!saved) return props.notify('Guarda o jogo antes de partilhar.');
    const url = new URL(location.href); url.hash = `/game/${props.id}`;
    try { if (navigator.share) await navigator.share({ title: saved.title, text: `${saved.title} · ${props.formatDate(saved.scheduledAt)}`, url: url.href }); else { await navigator.clipboard.writeText(url.href); props.notify('Link do jogo copiado.'); } }
    catch (error) { if (!(error instanceof Error) || error.name !== 'AbortError') props.notify('Não foi possível partilhar o jogo. Copia o endereço da página.', 'error'); }
  };
  const remove = async () => {
    if (pending || !await props.confirm('Eliminar este jogo e todas as suas avaliações e estatísticas?')) return;
    setPending(true);
    try { await props.remove(props.id); await ctx.refresh(); ctx.go('#/games'); }
    catch (error) { props.notify(props.errorMessage(error), 'error'); }
    finally { setPending(false); }
  };
  return <><FeatureHeading tag="Peladinha" title={saved?.title || 'Criar jogo'} description={editable ? 'Escolhe as equipas e guarda o jogo.' : 'Equipas e resultado desta Peladinha.'} /><form id="game-form" className="content-stack game-workspace" onSubmit={event => void submit(event)}><div id="game-details" className="panel game-details-panel"><div className="form-grid"><label>Título<input name="title" required maxLength={80} value={game.title} disabled={!editable || pending} onChange={event => update('title', event.target.value)} /></label><label>Data e hora (Lisboa)<input type="datetime-local" name="scheduledAt" required value={String(game.scheduledAt || '')} disabled={!editable || pending} onChange={event => update('scheduledAt', event.target.value)} /></label><label>Local<input name="location" maxLength={120} value={game.location || ''} disabled={!editable || pending} onChange={event => update('location', event.target.value)} /></label><input type="hidden" name="notes" value={game.notes || ''} />{editable && <label>Vídeo no YouTube (opcional)<input type="url" name="youtubeUrl" maxLength={500} placeholder="https://www.youtube.com/watch?v=…" value={youtube} disabled={pending} onChange={event => { setYoutube(event.target.value); event.target.setCustomValidity(props.videoId(event.target.value) === null ? 'Introduz um link de vídeo válido do YouTube.' : ''); }} /></label>}</div></div><div id="team-builder" className="content-stack"><TeamBuilder game={game} players={props.players} editable={editable && !pending} card={props.card} closeIcon={props.icon('close')} balance={props.balance(game)} move={move} draw={() => setDrawOpen(true)} referenceOvr={props.referenceOvr} /></div><div id="game-result" className="panel score-panel"><div className="score-heading"><h2>Resultado</h2></div><div className="score"><label>Equipa A<input type="number" min={0} max={999} name="scoreA" value={game.score.teamA} disabled={!editable || pending} onChange={event => update('score', { ...game.score, teamA: Number(event.target.value) })} /></label><b>—</b><label>Equipa B<input type="number" min={0} max={999} name="scoreB" value={game.score.teamB} disabled={!editable || pending} onChange={event => update('score', { ...game.score, teamB: Number(event.target.value) })} /></label></div><div id="match-performances"><MatchPerformance game={game} players={props.players} values={performance} editable={editable && !pending} onChange={(uid, key, value) => setPerformance(current => ({ ...current, [uid]: { goals: current[uid]?.goals || 0, assists: current[uid]?.assists || 0, [key]: value } }))} /></div></div>{saved?.status === 'closed' && <div id="game-ratings"><MatchRatings game={saved} players={props.players} uid={ctx.user.uid} summary={props.summary} dimensions={props.dimensions} /></div>}<div id="game-video"><GameVideo id={props.videoId(youtube)} /></div><div className="game-actionbar"><a className="btn btn-ghost" href="#/games">{props.icon('arrow')}Todos os jogos</a><button type="button" id="share-game" className="btn btn-ghost" onClick={() => void share()}>Partilhar jogo</button>{editable && <div className="actions"><button className={`btn btn-primary${pending ? ' is-loading' : ''}`} name="action" value="save" disabled={pending} aria-busy={pending}>Guardar jogo</button>{saved && game.status === 'draft' ? <button className="btn btn-secondary" name="action" value="open" disabled={pending}>Abrir jogo</button> : saved && game.status === 'open' ? <><button className="btn btn-secondary" name="action" value="draft" disabled={pending}>Tornar rascunho</button><button className="btn btn-success" name="action" value="close" disabled={pending}>Encerrar jogo</button></> : null}</div>}{saved && (ctx.user.role === 'admin' || (ctx.user.role === 'dbs' && game.status !== 'closed')) && <div className="actions"><button type="button" id="delete-game" className="btn btn-danger" disabled={pending} onClick={() => void remove()}>Eliminar jogo</button></div>}{saved?.status === 'closed' && gameParticipants(saved).includes(ctx.user.uid) && <a className="btn btn-primary" href={`#/game/${props.id}/feedback`}>{props.icon('missions')}Avaliar jogadores</a>}</div></form>{drawOpen && props.draw(game, teams => { setGame(current => ({ ...current, ...teams })); setDrawOpen(false); }, () => setDrawOpen(false))}</>;
}
