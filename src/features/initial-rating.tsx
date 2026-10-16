import { AdminMenu } from '../app/Chrome';
import { useState, type FormEvent, type ReactNode } from 'react';
import { FeatureHeading } from './presentation';
import { useRatingDraft, type RatingValues } from './use-rating-draft';

export function InitialRatingPage(props: {
  self: boolean; adminInitial?: boolean; playerName: string; initial: RatingValues; locked: boolean; deadline?: Date | null;
  attributes: readonly (readonly [string, string])[];
  save(values: RatingValues, submit: boolean): Promise<unknown>;
  complete(values: RatingValues): boolean;
  onComplete(): Promise<void>;
  notify(message: string, type?: string): void; errorMessage(error: unknown): string;
  checkIcon: ReactNode; arrowIcon: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const draft = useRatingDraft(props.initial, values => props.save(values, false), error => props.notify(props.errorMessage(error), 'error'));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (props.locked || pending) return;
    setPending(true);
    try { await draft.flush(); if (!props.complete(draft.current.current)) throw new Error('Preenche os 12 atributos, entre 0 e 20.'); await props.save(draft.current.current, true); props.notify('Avaliação concluída.'); await props.onComplete(); }
    catch (error) { props.notify(props.errorMessage(error), 'error'); }
    finally { setPending(false); }
  };
  return <><FeatureHeading tag={props.self ? 'A minha primeira carta' : 'Avaliação da comunidade'} title={props.self ? 'Conhece o teu jogo' : `Avaliar ${props.playerName}`} description="As alterações são guardadas automaticamente." action={<a className="btn btn-ghost" href="#/missions">{props.arrowIcon}Todas as missões</a>} />{props.adminInitial && <AdminMenu/>}<form className="panel rating-form" onSubmit={event => void submit(event)}>{props.deadline && <p className="muted">{props.locked ? 'Prazo de edição terminado em' : 'Podes editar até'} {props.deadline.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })} (Lisboa).</p>}<div className="section-head"><h2>{props.self ? 'Autoavaliação' : 'Ajuda a criar a primeira carta'}</h2><span className={`save-state${draft.state.startsWith('Erro') ? ' error' : draft.state === 'Guardado' ? ' success' : ''}`} aria-live="polite">{draft.state}</span></div><p className="muted">Preenche cada atributo de 0 a 20. Zero também é uma avaliação válida.</p><div className="rating-sliders">{props.attributes.map(([key, name]) => <div key={key} className="rating-row"><label htmlFor={`${key}-number`}>{name}</label><input type="range" min={0} max={20} value={draft.values[key] ?? 0} aria-label={name} data-slider={key} disabled={props.locked || pending} onChange={event => draft.change(key, Number(event.target.value))} /><input id={`${key}-number`} type="number" min={0} max={20} step={1} data-rating={key} value={draft.values[key] ?? ''} placeholder="—" aria-label={`${name}, valor`} disabled={props.locked || pending} onChange={event => draft.change(key, event.target.value === '' ? undefined : Number(event.target.value))} /></div>)}</div><div className="section-head"><span className="rating-progress">{Object.keys(draft.values).length} / 12</span>{!props.locked && <div className="actions"><button type="button" data-save className="btn btn-secondary" disabled={pending} onClick={() => void draft.saveNow().catch(() => {})}>Guardar agora</button><button className={`btn btn-primary${pending ? ' is-loading' : ''}`} disabled={pending} aria-busy={pending}>{props.checkIcon}Concluir</button></div>}</div></form></>;
}
