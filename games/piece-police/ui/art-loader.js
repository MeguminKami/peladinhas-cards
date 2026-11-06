/** Presentation-only catalogue. Files are relative to the manifest; no inferred asset URLs. */
import { lockHardware } from './acid-symbols.js';
export async function loadArt(manifestUrl, { onProgress = () => {} } = {}) {
  const images = new Map(), failures = [];
  if (!manifestUrl) return { images, failures, total: 0 };
  const url = new URL(manifestUrl, document.baseURI);
  if (url.origin !== location.origin) throw new Error('O manifesto de arte tem de ser local.');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Não foi possível carregar o manifesto de arte.');
  const manifest = await response.json();
  if (manifest.version !== 1 || !Array.isArray(manifest.assets)) throw new Error('Manifesto de arte inválido.');
  const entries = manifest.assets.filter(asset => asset.file);
  const ids = new Set();
  const prepared = entries.map(asset => {
    const src = new URL(asset.file, url);
    if (!asset.id || ids.has(asset.id) || src.origin !== url.origin ||
        !src.pathname.startsWith(new URL('.', url).pathname) || !src.pathname.endsWith('.webp') || src.search || src.hash)
      throw new Error('Entrada inválida no manifesto de arte.');
    ids.add(asset.id);
    return { asset, src };
  });
  let completed = 0;
  onProgress({ completed, total: prepared.length });
  await Promise.all(prepared.map(async ({ asset, src }) => {
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = src.href;
      await img.decode();
      if ((asset.width && img.naturalWidth !== asset.width) || (asset.height && img.naturalHeight !== asset.height))
        throw new Error('Dimensões diferentes do manifesto.');
      images.set(asset.id, img);
    } catch { failures.push(asset.id); }
    finally { onProgress({ completed: ++completed, total: prepared.length, assetId: asset.id, image: images.get(asset.id) }); }
  }));
  return { images, failures, total: prepared.length };
}

/** Reuse the existing text when a symbol has no approved, decoded image. */
export function paintSymbol(target, symbol, catalogue, { awake = false } = {}) {
  const activePortrait = awake && /^P[1-5]$/.test(symbol) ? catalogue.images.get('CHR-' + symbol + '-PORT') : null;
  const image = activePortrait || catalogue.images.get(symbol === 'X' ? 'SYM-LOCK' : 'SYM-' + symbol);
  const cell = target.parentElement;
  const persona=Object.keys(PERSONA_ID).find(name=>PERSONA_ID[name]===symbol);
  if(persona)cell.style.setProperty('--pcolor',`var(--${persona})`);
  else cell.style.removeProperty('--pcolor');
  if (cell.classList.contains('has-art') !== Boolean(image)) cell.classList.toggle('has-art', Boolean(image));
  if (!image) { const text = symbol === 'X' ? '🔒' : symbol; if (target.childElementCount || target.textContent !== text) target.textContent = text; return; }
  // Multiplier, sticky and Party states can change while the decoded source stays identical.
  const current = target.firstElementChild;
  if (target.childElementCount === (symbol === 'X' ? 2 : 1) && current?.tagName === 'IMG' && current.src === image.src) return;
  const copy = image.cloneNode();
  copy.alt = ''; copy.setAttribute('aria-hidden', 'true'); copy.draggable = false;
  copy.width = image.naturalWidth; copy.height = image.naturalHeight;
  target.replaceChildren(copy);
  if (symbol === 'X') target.append(lockHardware());
}

/** Approved portraits only; absent entries leave the card unchanged. */
export function paintPortrait(card, persona, catalogue) {
  const id = { WEED: 'P1', ALCOOL: 'P2', COPIUM: 'P3', MDMA: 'P4', LCD: 'P5' }[persona];
  const source = catalogue.images.get('CHR-' + id + '-PORT');
  const current = card.querySelector('.persona-portrait');
  if (card.classList.contains('has-portrait') !== Boolean(source)) card.classList.toggle('has-portrait', Boolean(source));
  if (source && current?.querySelector('img')?.src === source.src) return;
  current?.remove();
  if (!source) return;
  const frame = document.createElement('span');
  frame.className = 'persona-portrait'; frame.setAttribute('aria-hidden', 'true');
  const image = source.cloneNode(); image.alt = ''; image.draggable = false;
  image.width = source.naturalWidth; image.height = source.naturalHeight;
  frame.append(image); card.append(frame);
}

export const PERSONA_ID = { WEED:'P1', ALCOOL:'P2', COPIUM:'P3', MDMA:'P4', LCD:'P5' };
export const FUSION_ART = Object.fromEntries(['NEVER_ENDING_DREAM','ONE_MORE_ROUND','SLOW_DISASTER','RAVE_DIMENSION','TOTAL_MAYHEM','FROZEN_REALITY','FREEZE_AND_FREAK','DREAM_GLITCH','ONE_MORE_RAVE','DOUBLE_VISION'].map((id, index) => [id, 'FUS-' + id]));
export const BONUS_ART = {afterparty:'AFTER',vip:'VIP',police:'POLICE'};
export function artImage(catalogue, id, className = '') {
  const source = catalogue.images.get(id);
  if (!source) return null;
  const image = source.cloneNode(); image.alt = ''; image.draggable = false;
  image.setAttribute('aria-hidden', 'true'); image.className = 'art-image ' + className;
  image.width = source.naturalWidth; image.height = source.naturalHeight;
  return image;
}
export function mountArt(container, catalogue, id, className = 'mounted-art') {
  const old = [...container.children].find(el => el.classList.contains(className));
  const source = catalogue.images.get(id);
  if (old && source && old.src === source.src) {
    if (old.dataset.artId !== id) old.dataset.artId = id;
    return old;
  }
  old?.remove();
  const image = artImage(catalogue, id, className);
  if (image) { image.dataset.artId = id; container.prepend(image); }
  return image;
}
