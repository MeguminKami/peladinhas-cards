import { useState, type ReactNode } from 'react';

export const feedbackScale = ['Muito fraco', 'Fraco', 'Razoável', 'Bom', 'Muito bom', 'Excelente'];
const hints: Record<string, string> = {
  overall: 'O desempenho neste jogo, no seu conjunto.',
  attack: 'Finalização, decisões e contribuição no ataque.',
  passing: 'Qualidade do passe, apoio e jogo de equipa.',
  defense: 'Marcação, posicionamento e recuperação da bola.',
  physical: 'Intensidade, esforço e resistência.',
  goalkeeping: 'Avalia só se o jogador esteve à baliza.',
  attitude: 'Respeito, cooperação e reação às dificuldades.',
};
export type RatingChoice = number | null | undefined;
export function RatingField({ uid, dimension, name, value, readonly, index, onChange }: { uid: string; dimension: string; name: string; value: RatingChoice; readonly: boolean; index: number; onChange(value: RatingChoice): void }) {
  const selected = value === null && dimension === 'goalkeeping' ? 'na' : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
  const [hovered, setHovered] = useState<string | null>(null);
  const painted = hovered ?? selected;
  const choice = (score: string, content: ReactNode, className: string) => <label key={score} className={`${className}${selected === score ? ' is-selected' : ''}${className === 'feedback-star' && painted !== '' && painted !== 'na' && Number(score) <= Number(painted) ? ' is-filled' : ''}`} data-value={score} onPointerEnter={event => { if (className === 'feedback-star' && event.pointerType === 'mouse' && !readonly) setHovered(score); }}><input className="visually-hidden" type="radio" name={`rating-${dimension}`} value={score} data-feedback-choice checked={selected === score} disabled={readonly} required={!readonly} aria-label={score === 'na' ? 'Não jogou à baliza? Clica aqui' : `${score} ${score === '1' ? 'estrela' : 'estrelas'} — ${feedbackScale[Number(score)]}`} onChange={() => onChange(score === 'na' ? null : Number(score))} />{content}</label>;
  return <fieldset className="feedback-field" data-dimension={dimension} data-score={selected} aria-describedby={`feedback-${uid}-${dimension}-hint`}><legend className="visually-hidden">{name}</legend><div className="feedback-dimension"><span className="feedback-dimension-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><span className="feedback-dimension-name">{name.replace('colectivo', 'coletivo')}</span><small id={`feedback-${uid}-${dimension}-hint`}>{hints[dimension]}</small><span className="feedback-rating-result" aria-live="polite">{selected === 'na' ? 'Não aplicável' : selected === '' ? readonly ? 'Sem avaliação' : 'Por avaliar' : `${selected}/5 · ${feedbackScale[Number(selected)]}`}</span></div></div><div className="feedback-rating"><input type="hidden" data-rating={dimension} value={selected} /><div className="feedback-stars" aria-label="Escolher estrelas" onPointerLeave={() => setHovered(null)}>{[1, 2, 3, 4, 5].map(score => choice(String(score), <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.4l6.3-.9Z" /></svg>, 'feedback-star'))}</div><div className="feedback-rating-extras">{choice('0', <span>0 estrelas</span>, 'feedback-zero')}{dimension === 'goalkeeping' && choice('na', <span>Não jogou à baliza? Clica aqui</span>, 'feedback-na')}</div></div></fieldset>;
}
