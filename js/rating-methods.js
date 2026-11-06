export const METHODS = [
  ["stars", "De 0 a 5 Estrelas", "★★★★★"],
  ["half", "De 0 a 5 Estrelas e Meia", "★◐"],
  ["values", "De 0 a 10 Valores", "10"],
  ["words", "Por Palavras", "Aa"],
];
export const SCALE = ["Muito fraco", "Fraco", "Razoável", "Bom", "Muito bom", "Excelente"];
export const validMethod = value => METHODS.some(([id]) => id === value);
export const scoreColor = value => `hsl(${Number(value) * 26} 78% 43%)`;
export const scoreText = (value, method) => method === "values" ? `${Number(value) * 2}/10` : method === "words" && Number.isInteger(Number(value)) ? SCALE[Number(value)] : `${String(value).replace('.', ',')}/5${Number.isInteger(Number(value)) ? ' · ' + SCALE[Number(value)] : ''}`;
const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L2.9 9.4l6.3-.9Z"/></svg>';
export function methodControls(method, value, key, disabled = false) {
  const choice = (score, text, cls, label = text) => `<label class="${cls}${String(score) === String(value) ? ' is-selected' : ''}" data-value="${score}" style="--score-color:${scoreColor(score)}"><input class="visually-hidden" type="radio" name="rating-${key}" value="${score}" data-feedback-choice ${String(score) === String(value) ? 'checked' : ''} ${disabled ? 'disabled' : value === '' ? 'required' : ''} aria-label="${label}">${text}</label>`;
  let controls;
  if (method === 'values') {
    controls = `<div class="rating-wheel" aria-label="De 0 a 10 Valores"><div class="rating-wheel-track">${Array.from({length:11}, (_, n) => choice(n / 2, n, 'rating-value', n + ' valores')).join('')}</div><span class="rating-wheel-marker" aria-hidden="true"></span></div>`;
  } else if (method === 'words') {
    controls = `<div class="rating-words">${SCALE.map((word,n) => choice(n, word, 'rating-word')).join('')}</div>`;
  } else if (method === 'half') {
    controls = `<div class="feedback-stars rating-halves">${Array.from({length:5}, (_,n) => `<span class="rating-split-star">${choice(n+.5,star,'feedback-star rating-half-left', (n+.5)+' estrelas')}${choice(n+1,star,'feedback-star rating-half-right',(n+1)+' estrelas')}</span>`).join('')}</div>`;
  } else controls = `<div class="feedback-stars" aria-label="Escolher estrelas">${[1,2,3,4,5].map(n => choice(n,star,'feedback-star', n+' estrelas')).join('')}</div>`;
  return controls + `<div class="feedback-rating-extras">${method === 'stars' || method === 'half' ? choice(0,'<span>0 estrelas</span>','feedback-zero','0 estrelas') : ''}${key === 'goalkeeping' ? choice('na','<span>Não jogou à baliza? Clica aqui</span>','feedback-na','Não jogou à baliza? Clica aqui') : ''}</div>`;
}
export function bindMethodControls(host) {
  host.querySelectorAll('.rating-wheel-track').forEach(track => {
    const labels = [...track.children];
    const field = track.closest('.feedback-field');
    const raw = field?.querySelector('[data-rating]')?.value;
    const initial = raw !== '' && raw !== 'na' && raw != null ? Number(raw)*2 : 5;
    let timer, interacting = false;
    for (const type of ["pointerdown", "wheel", "keydown"]) track.addEventListener(type, () => { interacting = true; }, { passive: true });
    const center = (n) => { track.scrollLeft = (n - 2) * labels[0].getBoundingClientRect().width + track.clientWidth * .4; };
    requestAnimationFrame(() => center(initial));
    track.addEventListener('scroll', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!track.isConnected) return;
        const n = Math.max(0, Math.min(10, Math.round(track.scrollLeft / labels[0].getBoundingClientRect().width)));
        labels.forEach((label,i) => label.classList.toggle('is-centered', i === n));
        const radio = labels[n].querySelector('input');
        if (interacting && !radio.disabled) {
          interacting = false;
          radio.checked = true;
          radio.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 70);
    });
    track.addEventListener('change', event => center(Number(event.target.value)*2));
    // Opening a reel at 5 does not silently evaluate an untouched dimension.
  });
}
export function chooseMethod(ctx, apply, mandatory = false) {
  const dialog = document.createElement('dialog');
  dialog.className = 'rating-method-dialog';
  dialog.setAttribute('aria-label', 'Escolher método de avaliação');
  dialog.innerHTML = `<form method="dialog" class="rating-method-picker"><p class="rating-method-hint" aria-live="polite">Escolhe um para veres uma pré-visualização</p><div class="rating-method-options">${METHODS.map(([id,label,glyph], i) => `<button type="button" data-method="${id}" aria-pressed="false"><span class="rating-method-index">0${i+1}</span><b aria-hidden="true">${glyph}</b><span>${label}</span><i aria-hidden="true">↗</i></button>`).join('')}</div><div class="rating-method-preview"></div><button type="button" class="btn btn-primary rating-method-confirm" disabled>Escolho Este</button>${mandatory ? '' : '<button type="button" class="btn btn-ghost" data-method-cancel>Cancelar</button>'}</form>`;
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    if (!mandatory) dialog.close();
  });
  dialog.querySelector('[data-method-cancel]')?.addEventListener('click', () => dialog.close());
  document.body.append(dialog);
  const opener = document.activeElement;
  let selected;
  dialog.querySelectorAll('[data-method]').forEach(button => button.onclick = () => {
    selected = button.dataset.method;
    dialog.querySelectorAll('[data-method]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    dialog.querySelector('.rating-method-hint').textContent = 'Ainda podes ver as pré-visualizações dos outros metodos';
    dialog.querySelector('.rating-method-preview').innerHTML = `<div class="rating-preview-caption"><span>EXPERIMENTA</span><strong>O teu jogo. A tua escala.</strong></div><div class="feedback-field" data-score=""><span class="feedback-dimension-name">Desempenho global</span><div class="feedback-rating"><input type="hidden" data-rating="preview" value="">${methodControls(selected,'','preview')}</div><output class="rating-preview-result" aria-live="polite">${selected === 'values' ? '5 / 10' : 'Toca para avaliar'}</output></div>`;
    const preview = dialog.querySelector('.rating-method-preview');
    preview.oninput = event => {
      if (!event.target.matches('[data-feedback-choice]')) return;
      const value = event.target.value;
      preview.querySelector('[data-rating]').value = value;
      preview.querySelector('output').textContent = scoreText(value, selected);
      preview.querySelectorAll('label[data-value]').forEach(label => {
        label.classList.toggle('is-selected',label.dataset.value === value);
        label.classList.toggle('is-filled',Number(label.dataset.value) <= Number(value));
      });
    };
    bindMethodControls(preview);
    dialog.querySelector('.rating-method-confirm').disabled = false;
  });
  dialog.querySelector('.rating-method-confirm').onclick = async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try { await apply(selected); dialog.close(); }
    catch { button.disabled = false; dialog.querySelector('.rating-method-hint').textContent = 'Não foi possível guardar. Tenta novamente.'; }
  };
  dialog.addEventListener('cancel', event => { if (mandatory) event.preventDefault(); });
  dialog.addEventListener('close', () => { dialog.remove(); opener?.isConnected && opener.focus(); });
  ctx.cleanup(() => dialog.remove());
  dialog.showModal();
}
