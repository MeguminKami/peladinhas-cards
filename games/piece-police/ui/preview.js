// Pre-visualizacao do jogo num ecra de PC ou de telemovel (pc.html / telemovel.html).
// O jogo corre num iframe com o tamanho real do aparelho (em px CSS) e a moldura e
// reduzida, se for preciso, para caber na janela - o jogo ve sempre o tamanho escolhido.
const $ = id => document.getElementById(id);
const kind = document.body.dataset.preview;

const PRESETS = {
  pc: [
    { id: 'fill', label: 'Janela inteira', w: 0, h: 0 },
    { id: 'fhd', label: '1920 × 1080', w: 1920, h: 1080 },
    { id: 'laptop', label: '1440 × 900', w: 1440, h: 900 },
    { id: '75', label: '75% (1080 × 675)', w: 1080, h: 675 },
    { id: 'small', label: '1280 × 720', w: 1280, h: 720 },
    { id: 'short', label: 'Janela baixa 1280 × 560', w: 1280, h: 560 },
    { id: 'narrow', label: 'Janela estreita 600 × 620', w: 600, h: 620 },
  ],
  phone: [
    { id: 'iphone14', label: 'iPhone 14', w: 390, h: 844 },
    { id: 'iphonese', label: 'iPhone SE', w: 375, h: 667 },
    { id: 'iphonepromax', label: 'iPhone 15 Pro Max', w: 430, h: 932 },
    { id: 'pixel7', label: 'Pixel 7', w: 412, h: 915 },
    { id: 'galaxys', label: 'Galaxy S23', w: 360, h: 780 },
    { id: 'ipad', label: 'iPad Air', w: 820, h: 1180 },
  ],
}[kind];

const store = {
  get(k, d) { try { return localStorage.getItem(`pp-preview-${kind}-${k}`) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`pp-preview-${kind}-${k}`, v); } catch { } },
};
let current = PRESETS.find(p => p.id === store.get('size')) ?? PRESETS[0];
let landscape = store.get('landscape') === '1';
// "Com menu do site": mostra o jogo dentro da simulacao do site principal (site.html), por baixo do menu.
let withSite = store.get('site') === '1';
function applySite() {
  const src = withSite ? 'site.html' : 'game.html';
  if (!$('game').src.endsWith(src)) $('game').src = src;
  $('site-toggle')?.setAttribute('aria-pressed', String(withSite));
}

function fit() {
  const stage = $('stage'), screen = $('screen');
  const box = stage.getBoundingClientRect();
  const fill = kind === 'pc' && current.id === 'fill';
  screen.classList.toggle('fill', fill);
  screen.classList.toggle('landscape', landscape);
  let w = current.w, h = current.h;
  if (landscape) [w, h] = [h, w];
  if (fill) { w = Math.floor(box.width - 32); h = Math.floor(box.height - 32); }
  const frame = kind === 'phone' ? 28 : fill ? 0 : 20; // espessura da moldura (dos dois lados)
  screen.style.width = `${w + frame}px`;
  screen.style.height = `${h + frame}px`;
  const scale = Math.min(1, (box.width - 32) / (w + frame), (box.height - 32) / (h + frame));
  screen.style.transform = `translate(-50%, -50%) scale(${scale})`;
  $('info').textContent = `${fill ? 'Janela inteira' : current.label} · ${w} × ${h} px` +
    (landscape ? ' · horizontal' : kind === 'phone' ? ' · vertical' : '') + (withSite ? ' · com o menu do site' : '') +
    (scale < 1 ? ` · mostrado a ${Math.round(scale * 100)}% para caber na janela` : '') +
    (kind === 'phone' ? ' · para toque real usa o modo de dispositivo do browser (F12) ou abre no telemóvel com npm run dev:rede' : '');
}

function select(preset) {
  current = preset; store.set('size', preset.id);
  for (const b of $('sizes').children) b.setAttribute('aria-pressed', String(b.dataset.id === preset.id));
  fit();
}

for (const preset of PRESETS) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = preset.label; b.dataset.id = preset.id;
  b.addEventListener('click', () => select(preset));
  $('sizes').append(b);
}
$('rotate')?.addEventListener('click', () => {
  landscape = !landscape; store.set('landscape', landscape ? '1' : '0');
  $('rotate').setAttribute('aria-pressed', String(landscape));
  fit();
});
$('rotate')?.setAttribute('aria-pressed', String(landscape));
$('site-toggle')?.addEventListener('click', () => { withSite = !withSite; store.set('site', withSite ? '1' : '0'); applySite(); fit(); });
applySite();
addEventListener('resize', fit);
select(current);
