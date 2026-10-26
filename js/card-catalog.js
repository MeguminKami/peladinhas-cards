import { buildCardCatalog, BASE_EDITIONS } from './card-catalog-model.js';
import { card, bindImages } from './cards.js';
import { ATTRIBUTES } from './utils.js';
import { CARD_POLICY } from './card-achievements.js';
import { ASSET_PATHS, safeImage } from './assets.js';
import { pageHead, linkButton, esc, modal, empty } from './ui.js';
import { icon } from './icons.js';

const illustration = entry => {
  const base = BASE_EDITIONS.find(([id]) => id === entry.id);
  const p = { uid: 'catalog', displayName: 'Jogador', primaryPosition: 'MED', countryCode: 'PT', hasCard: true,
    ovr: base ? base[1] : 78, cardType: base ? entry.id : 'gold-common', photoURL: ASSET_PATHS.avatar,
    stats: Object.fromEntries(ATTRIBUTES.map(([key]) => [key, base ? base[1] : 78])),
    specials: entry.record.cardTheme ? [{ id: entry.id, cardTheme: entry.record.cardTheme }] : [],
  };
  return card(p, { theme: entry.id, preview: true });
};

export function cardCatalogPage(ctx) {
  if (!ctx.league) return ctx.render('<div class="catalog-loading" role="status">A carregar as cartas da liga…</div>');
  try {
    const catalog = buildCardCatalog(ctx.league);
    ctx.render(`${pageHead('O álbum da liga', 'Cartas vistas', '', linkButton('#/players', 'Jogadores', 'ghost', 'players'))}
      <div class="card-catalog"><div class="catalog-topline"><p>Cada estreia deixa a sua marca.</p><p class="catalog-count"><strong>${catalog.seen}</strong> / ${catalog.entries.length} descobertas</p></div>
      <div class="catalog-progress" role="progressbar" aria-label="Edições descobertas" aria-valuemin="0" aria-valuemax="${catalog.entries.length}" aria-valuenow="${catalog.seen}"><span style="width:${catalog.entries.length ? catalog.seen / catalog.entries.length * 100 : 0}%"></span></div>
      <nav class="catalog-filters" aria-label="Mostrar cartas">${[['all','Todas',catalog.entries.length],['seen','Vistas',catalog.seen],['unknown','Por descobrir',catalog.entries.length-catalog.seen]].map(([id,label,count])=>`<button type="button" data-catalog-filter="${id}" aria-pressed="${id==='all'}">${label}<span>${count}</span></button>`).join('')}</nav>
      ${!catalog.seen ? `<p class="catalog-notice">O álbum está por estrear. As primeiras cartas registadas na liga vão aparecer aqui.</p>` : ''}
      <div class="catalog-groups">${catalog.groups.map((group,index)=>`<section class="catalog-group" data-catalog-group="${index}"><header><h2>${group.name}</h2><p>${group.detail}</p></header><div class="catalog-grid">${group.entries.map(entry=>`<article class="catalog-entry" data-catalog-state="${entry.seen?'seen':'unknown'}"><div class="catalog-art">${entry.seen?`<button type="button" class="catalog-card-open" data-catalog-entry="${catalog.entries.indexOf(entry)}" aria-label="Ver ${esc(entry.name)}, requisitos e detentores" aria-haspopup="dialog">${illustration(entry)}</button>`:'<div class="catalog-mystery" role="img" aria-label="Carta ainda não vista"><span>?</span></div>'}</div><span class="catalog-state">${entry.seen?'Vista na liga':'Por descobrir'}</span><h3>${entry.seen?esc(entry.name):'???'}</h3>${entry.seen?`<p class="catalog-summary">${esc(entry.requirements.summary)}</p><button class="catalog-details-link" type="button" data-catalog-entry="${catalog.entries.indexOf(entry)}" aria-label="Detalhes de ${esc(entry.name)}" aria-haspopup="dialog">Ver requisitos ${icon('arrow')}</button>`:''}</article>`).join('')}</div></section>`).join('')}</div>
      <p class="catalog-filter-empty" hidden>Nenhuma carta neste filtro.</p>
      </div>`);
    bindImages(document.querySelector('.card-catalog'));
    document.querySelectorAll('[data-catalog-filter]').forEach(button => button.onclick = () => {
      document.querySelectorAll('[data-catalog-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      document.querySelectorAll('[data-catalog-state]').forEach(entry => entry.hidden = button.dataset.catalogFilter !== 'all' && entry.dataset.catalogState !== button.dataset.catalogFilter);
      document.querySelectorAll('[data-catalog-group]').forEach(group => group.hidden = ![...group.querySelectorAll('[data-catalog-state]')].some(e => !e.hidden));
      document.querySelector('.catalog-filter-empty').hidden = !!document.querySelector('[data-catalog-state]:not([hidden])');
    });
    document.querySelectorAll('[data-catalog-entry]').forEach(button => button.onclick = () => showEdition(catalog.entries[Number(button.dataset.catalogEntry)]));
  } catch (error) {
    console.error('Card catalog', error);
    ctx.render(empty('Não foi possível abrir o álbum', 'Tenta carregar novamente as cartas.', '<button class="btn btn-primary" id="retry-catalog">Tentar novamente</button>', 'cards'));
    document.querySelector('#retry-catalog').onclick = () => cardCatalogPage(ctx);
  }
}

function showEdition(entry) {
  const requirements = entry.requirements;
  modal(entry.name, `<div class="catalog-edition"><div class="catalog-edition-art">${illustration(entry)}</div><div class="catalog-edition-copy"><p class="eyebrow">Vista na liga</p><p class="catalog-edition-description">${esc(entry.record.cardTheme?.detail || CARD_POLICY[entry.id]?.hint || 'Uma edição que já faz parte da história da liga.')}</p><section class="catalog-requirements"><h3>Como obter</h3><ul>${requirements.rules.map(rule=>`<li>${esc(rule)}</li>`).join('')}</ul><p>${esc(requirements.note)}</p></section><section class="catalog-holders"><h3>Quem já a teve <span>· ${entry.holders.length}</span></h3><ul>${entry.holders.map(holder=>`<li><img src="${esc(safeImage(holder.user?.photoURL))}" alt="" data-fallback="${ASSET_PATHS.avatar}" width="44" height="44"><div><strong>${esc(holder.user?.displayName || holder.user?.username || 'Jogador indisponível')}</strong><small>${holder.date ? `Atribuição registada · ${new Intl.DateTimeFormat('pt-PT',{timeZone:'Europe/Lisbon',dateStyle:'medium'}).format(holder.date)}` : 'Presença registada na liga'}</small></div>${icon('check')}</li>`).join('')}</ul></section></div></div>`);
  document.querySelector('#modal-root .modal').classList.add('catalog-modal');
  bindImages(document.querySelector('.catalog-modal'));
}
