import { useState, type FormEvent, type ReactNode } from 'react';
import type { FeatureContext, Timestamp } from './contracts';
import { FeatureEmpty, FeatureHeading } from './presentation';

export interface LegacyEvent {
  id: string; title: string; description?: string; status: string; endsAt?: Timestamp;
  rewardsApplied?: boolean;
  questions: { id: string; label: string }[];
  winners?: { label: string; votes: number; uids: string[]; reward?: unknown }[];
  ballots?: { id: string; selections: string[]; submittedAt?: Timestamp }[];
}
export function LegacyEventPage(props: {
  ctx: FeatureContext; event: LegacyEvent; saved?: { answers?: Record<string, string> } | null;
  available: boolean; candidates(question: LegacyEvent['questions'][number]): string[];
  displayName(uid: string): string;
  rarityId: string; rarityBadge: ReactNode; arrowIcon: ReactNode; emptyIcon: ReactNode;
  formatDate(value?: Timestamp): string; outcome: string; rewardText(value: unknown): string;
  vote(answers: Record<string, FormDataEntryValue>): Promise<unknown>;
  notify(message: string, type?: string): void; errorMessage(error: unknown): string;
}) {
  const { event, ctx } = props;
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState(false);
  const back = <a className="btn btn-ghost" href="#/missions">{props.arrowIcon}Missões</a>;
  const audit = ctx.user.role === 'admin' && event.ballots && <section className="panel content-stack"><h2>Auditoria da votação anterior</h2><label>Pesquisar votante ou candidato<input id="legacy-vote-search" type="search" value={search} onChange={change => setSearch(change.target.value)} /></label><div className="table-wrap"><table><thead><tr><th>Quem votou</th><th>Em quem</th><th>Data</th></tr></thead><tbody id="legacy-vote-rows">{event.ballots.filter(vote => [vote.id, ...vote.selections].map(props.displayName).join(' ').toLowerCase().includes(search.toLowerCase())).map(vote => <tr key={vote.id}><td>{props.displayName(vote.id)}</td><td>{vote.selections.map(props.displayName).join(', ')}</td><td>{vote.submittedAt ? props.formatDate(vote.submittedAt) : '—'}</td></tr>)}</tbody></table></div></section>;
  if (['closed', 'cancelled'].includes(event.status)) return <><FeatureHeading tag="Resultado da votação" title={event.title} action={back} /><section className="panel event-result event-rarity-surface" data-rarity={props.rarityId}>{props.rarityBadge}<div className="section-intro"><h2>{event.status === 'cancelled' ? 'Evento cancelado' : 'Votação encerrada'}</h2><p>{event.rewardsApplied === false ? 'A atribuição das recompensas está a ser concluída.' : props.outcome}</p></div>{event.winners?.map((winner, index) => <div key={index} className="event-result-question"><p>{winner.label} · {winner.votes} {winner.votes === 1 ? 'voto' : 'votos'}</p>{event.status === 'closed' && !!winner.uids.length && !!winner.reward && <p className="event-revealed-reward"><strong>Recompensa atribuída</strong><br />{props.rewardText(winner.reward)}</p>}</div>)}</section>{audit}</>;
  if (!props.available) return <FeatureEmpty title="Evento indisponível" description="Esta votação terminou ou não está disponível para a tua conta." icon={props.emptyIcon} action={back} />;
  const questions = event.questions.map(question => ({ ...question, candidates: props.candidates(question).filter(uid => uid !== ctx.user.uid) })).filter(question => question.candidates.length);
  if (!questions.length) return <FeatureEmpty title="Sem candidatos disponíveis" description="Não podes votar em ti próprio." icon={props.emptyIcon} action={back} />;
  const submit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault(); if (pending) return;
    const answers = Object.fromEntries(new FormData(submitEvent.currentTarget));
    setPending(true);
    try { await props.vote(answers); props.notify('Voto guardado.'); ctx.go('#/missions'); }
    catch (error) { props.notify(props.errorMessage(error), 'error'); }
    finally { setPending(false); }
  };
  return <><FeatureHeading tag="Votação" title={event.title} description={event.description || ''} action={back} /><section className="panel event-voting event-rarity-surface" data-rarity={props.rarityId}>{props.rarityBadge}<p>Encerra: {props.formatDate(event.endsAt)}</p><form id="event-vote-form" className="content-stack" onSubmit={submitEvent => void submit(submitEvent)}>{questions.map(question => <fieldset key={question.id} className="event-question"><legend>{question.label}</legend><label>Escolher jogador<select name={question.id} required defaultValue={props.saved?.answers?.[question.id] || ''} disabled={pending}><option value="">Escolhe um colega</option>{question.candidates.map(uid => <option key={uid} value={uid}>{props.displayName(uid)}</option>)}</select></label></fieldset>)}<button className={`btn btn-primary${pending ? ' is-loading' : ''}`} disabled={pending} aria-busy={pending}>{props.saved ? 'Atualizar voto' : 'Guardar voto'}</button></form></section>{audit}</>;
}
