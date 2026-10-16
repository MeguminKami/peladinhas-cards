import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { GameTeams } from './game-domain';
import { gameParticipants } from './game-domain';
import { FeatureEmpty, FeatureHeading } from './presentation';
import { RatingField, feedbackScale } from './rating-field';
import { useRatingDraft, type RatingValues } from './use-rating-draft';

export interface FeedbackRecord { targetId: string; submitted?: boolean; ratings?: RatingValues; [key: string]: unknown }
export interface FeedbackUser { uid: string; displayName?: string; username?: string; primaryPosition?: string; photoURL?: string }
interface ReviewController { values(): RatingValues; flush(): Promise<unknown> }
export interface FeedbackPageProps {
  uid: string; gameId: string; game: GameTeams & { status: string; title: string }; users: FeedbackUser[]; existing: FeedbackRecord[];
  editing?: boolean;
  dimensions: readonly (readonly [string, string])[];
  canEdit(record: FeedbackRecord, now: Date): boolean;
  deadline(record: FeedbackRecord): Date | null;
  complete(values: RatingValues): boolean;
  save(target: string, values: RatingValues, submitted: boolean): Promise<unknown>;
  reload(editing: boolean): Promise<void>;
  safeImage(value?: string): string; avatar: string;
  icon(name: string): ReactNode;
  notify(message: string, type?: string): void;
  errorMessage(error: unknown): string;
}

function PlayerReview({ props, target, side, row, readonly, pending, open, setOpen, close, register }: {
  props: FeedbackPageProps; target: string; side: 'A' | 'B'; row?: FeedbackRecord; readonly: boolean; pending: boolean; open: boolean;
  setOpen(): void; close(): void; register(target: string, controller?: ReviewController): void;
}) {
  const player = props.users.find(value => value.uid === target);
  const name = player?.displayName || player?.username || 'Jogador';
  const self = target === props.uid;
  const draft = useRatingDraft(row?.ratings || {}, values => props.save(target, values, false), error => props.notify(props.errorMessage(error), 'error'));
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (readonly) { register(target); return; } register(target, { values: () => draft.current.current, flush: draft.flush }); return () => register(target); }, [readonly, target, register, draft.flush]);
  const count = props.dimensions.filter(([key]) => Number.isFinite(draft.values[key]) || (key === 'goalkeeping' && draft.values[key] === null)).length;
  return <details name="match-feedback" className={`panel feedback-review${self ? ' feedback-self-review' : ''} ${row?.submitted ? 'feedback-completed' : ''}`} open={open} onToggle={event => { if (event.currentTarget.open && !open) setOpen(); else if (!event.currentTarget.open && open) close(); }}><summary className="feedback-player"><span className="feedback-avatar"><img src={props.safeImage(player?.photoURL)} alt="" width={48} height={48} onError={event => { if (!event.currentTarget.src.endsWith(props.avatar)) event.currentTarget.src = props.avatar; }} /><i aria-hidden="true">{side}</i></span><span className="feedback-player-name"><strong>{name}{self ? ' (Tu)' : ''}</strong><small>{player?.primaryPosition || 'Jogador'} · {props.game[side === 'A' ? 'teamA' : 'teamB'].bench.includes(target) ? 'Suplente' : 'Titular'}</small></span><span className={`pill feedback-status ${row?.submitted ? 'success' : ''}`}>{row?.submitted ? dirty ? 'Enviada · em edição' : 'Enviada' : dirty || row ? 'Rascunho' : 'Por avaliar'}</span><span className="feedback-toggle" aria-hidden="true">{props.icon('arrow')}</span></summary><form className="rating-form feedback-form" data-target={target} data-submitted={readonly} data-was-submitted={!!row?.submitted} aria-label={`Avaliar ${name}`} onSubmit={event => event.preventDefault()}>{self && <p className="feedback-self-notice">{props.icon('profile')}Esta é a tua autoavaliação</p>}<div className="feedback-form-status"><span data-rating-count>{count} / {props.dimensions.length} dimensões</span><span className={`save-state${draft.state.startsWith('Erro') ? ' error' : ''}`} role="status">{!dirty ? row?.submitted ? 'Concluída' : row ? 'Guardado' : 'Escolhe as estrelas' : draft.state}</span></div><div className="feedback-fields">{props.dimensions.map(([key, label], index) => <RatingField key={key} uid={target} dimension={key} name={label} value={draft.values[key]} readonly={readonly || pending} index={index} onChange={value => { setDirty(true); draft.change(key, value); }} />)}</div>{row?.submitted && <div className="feedback-sent"><span className="pill success">Avaliação enviada</span></div>}</form></details>;
}

export function FeedbackPage(props: FeedbackPageProps) {
  const targets = [...new Set(gameParticipants(props.game))].sort((a, b) => Number(a === props.uid) - Number(b === props.uid));
  const [localSubmitted, setLocalSubmitted] = useState(new Set<string>());
  const isCompleted = (uid: string) => localSubmitted.has(uid) || props.existing.some(row => row.targetId === uid && row.submitted);
  const completed = targets.filter(isCompleted).length;
  const [open, setOpen] = useState<string | undefined>(targets.find(uid => !isCompleted(uid)) || targets[0]);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const controllers = useRef(new Map<string, ReviewController>());
  const register = useRef((target: string, controller?: ReviewController) => { if (controller) controllers.current.set(target, controller); else controllers.current.delete(target); }).current;
  const headings = useRef<Record<string, HTMLHeadingElement | null>>({});
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  if (props.game.status !== 'closed' || !targets.includes(props.uid)) return <FeatureEmpty title="Avaliação indisponível" description="Podes avaliar os teus colegas depois de o jogo terminar." icon={props.icon('games')} action={<a className="btn btn-secondary" href="#/games">{props.icon('arrow')}Ver jogos</a>} />;
  const teams = (['A', 'B'] as const).map(side => { const team = props.game[side === 'A' ? 'teamA' : 'teamB']; const players = targets.filter(uid => [...team.starters, ...team.bench].includes(uid)); return { side, players, completed: players.filter(isCompleted).length, own: [...team.starters, ...team.bench].includes(props.uid) }; }).filter(team => team.players.length);
  const submitted = props.existing.filter(row => row.submitted);
  const editable = submitted.filter(row => props.canEdit(row, new Date(now)));
  const remaining = editable.length ? Math.min(...editable.map(row => +(props.deadline(row) || new Date(0)))) - now : 0;
  const minutes = Math.max(1, Math.ceil(remaining / 60000));
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60);
  const deadlineLabel = remaining > 0 ? `Restam ${days ? `${days}d ` : ''}${hours ? `${hours}h ` : ''}${minutes % 60}min` : 'Prazo de edição terminado';
  const canSubmit = targets.some(target => { const row = props.existing.find(value => value.targetId === target); return !localSubmitted.has(target) && (!row?.submitted || (props.editing && props.canEdit(row, new Date(now)))); });
  const submit = async () => {
    if (pending) return;
    const entries = [...controllers.current.entries()];
    const incomplete = entries.find(([, controller]) => !props.complete(controller.values()));
    if (incomplete) { setOpen(incomplete[0]); props.notify('Avalia todas as dimensões de todos os jogadores antes de submeter.', 'error'); return; }
    setPending(true);
    try { await Promise.all(entries.map(([, controller]) => controller.flush())); for (const [target, controller] of entries) { await props.save(target, controller.values(), true); setLocalSubmitted(current => new Set([...current, target])); } props.notify('Avaliações submetidas.'); await props.reload(false); }
    catch (error) { props.notify(props.errorMessage(error), 'error'); }
    finally { setPending(false); }
  };
  return <><FeatureHeading tag="Pós-jogo" title={`Avaliar ${props.game.title}`} description="Escolhe as estrelas para cada jogador. Cinco estrelas é a avaliação máxima." action={<a className="btn btn-ghost" href={`#/game/${props.gameId}`}>{props.icon('arrow')}Ver jogo</a>} /><div className="feedback-workspace content-stack"><section className="panel feedback-overview"><div className="section-head"><div><span className="eyebrow">AVALIAÇÃO DO JOGO</span><h2>{completed === targets.length && targets.length ? 'Tudo enviado' : 'O jogo, pela tua perspetiva'}</h2></div><span className={`pill ${completed === targets.length && targets.length ? 'success' : ''}`}>{completed} / {targets.length} enviadas</span></div><div className="progress" role="progressbar" aria-label="Avaliações enviadas" aria-valuemin={0} aria-valuemax={targets.length || 1} aria-valuenow={completed}><span style={{ '--progress': `${targets.length ? Math.round(completed / targets.length * 100) : 0}%` } as CSSProperties} /></div><p>Os rascunhos ficam guardados. No final, usa «Submeter» para enviar todas as avaliações. O prazo de edição é de 7 dias a partir da primeira submissão. A tua autoavaliação conta como uma avaliação, com o mesmo peso das restantes. As avaliações enviadas ficam concluídas e as respostas individuais não são mostradas aos outros jogadores.</p><div className="feedback-team-shortcuts">{teams.map(team => <button key={team.side} type="button" className={`feedback-team-shortcut feedback-team-${team.side.toLowerCase()}`} data-feedback-team={team.side} onClick={() => { const heading = headings.current[team.side]; heading?.focus({ preventScroll: true }); heading?.parentElement?.parentElement?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); }}><span>Equipa {team.side}</span><small>{team.own ? 'A tua equipa' : 'Adversários'} · {team.completed}/{team.players.length} enviadas</small>{props.icon('arrow')}</button>)}</div><div id="feedback-edit-slot">{!!submitted.length && <div className="feedback-edit-bar"><button type="button" className="btn btn-secondary" id="edit-game-feedback" disabled={props.editing || remaining <= 0 || pending} onClick={() => { void Promise.all([...controllers.current.values()].map(controller => controller.flush())).then(() => props.reload(true)).catch(() => {}); }}>{props.icon('edit')}<span>{remaining <= 0 ? 'Edição encerrada' : props.editing ? 'A editar avaliações' : 'Editar avaliações enviadas'}</span></button><div className="feedback-edit-time"><strong data-edit-remaining>{deadlineLabel}</strong><span>Prazo contado desde a primeira submissão</span></div><span className="feedback-info"><button type="button" className="feedback-info-button" aria-label="Informação sobre o prazo de edição" aria-describedby="feedback-edit-help">i</button><span className="feedback-info-tooltip" id="feedback-edit-help" role="tooltip">Tens 7 dias após a primeira submissão para editar cada avaliação. Alterar ou voltar a submeter não reinicia o prazo. Depois, a edição fica bloqueada.</span></span></div>}</div><details className="feedback-guide"><summary>Como usar a escala</summary><p>Toca numa estrela para preencher todas até à escolhida. Usa 0 estrelas para a classificação mínima e «Não jogou à baliza» quando guarda-redes não se aplica.</p><div className="feedback-scale">{feedbackScale.map((label, value) => <span key={value}><b>{value}</b>{label}</span>)}</div></details></section><div className="feedback-grid">{teams.length ? teams.map(team => <section key={team.side} className={`feedback-team feedback-team-${team.side.toLowerCase()}`} id={`feedback-team-${team.side}`} aria-labelledby={`feedback-team-heading-${team.side}`}><div className="feedback-team-heading"><span className="feedback-team-letter" aria-hidden="true">{team.side}</span><div><p>{team.own ? 'A tua equipa' : 'Equipa adversária'}</p><h2 ref={node => { headings.current[team.side] = node; }} id={`feedback-team-heading-${team.side}`} tabIndex={-1}>Equipa {team.side}</h2></div><span className="feedback-team-count">{team.completed}<span> / {team.players.length} enviadas</span></span></div><div className="feedback-team-players">{team.players.map(target => { const existingRow = props.existing.find(value => value.targetId === target); const row = localSubmitted.has(target) ? { ...existingRow, targetId: target, submitted: true } : existingRow; const readonly = localSubmitted.has(target) || !!row?.submitted && (!props.editing || !props.canEdit(row, new Date(now))); return <PlayerReview key={target} props={props} target={target} side={team.side} row={row} readonly={readonly} pending={pending} open={open === target} setOpen={() => setOpen(target)} close={() => setOpen(undefined)} register={register} />; })}</div></section>) : <FeatureEmpty title="Não há colegas para avaliar" description="Este jogo só tem um participante." icon={props.icon('players')} />}</div>{canSubmit && <div className="feedback-submit"><button type="button" className={`btn btn-primary feedback-submit-button${pending ? ' is-loading' : ''}`} disabled={pending} aria-busy={pending} onClick={() => void submit()}>Submeter</button></div>}</div></>;
}
