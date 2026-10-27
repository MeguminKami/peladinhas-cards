import { SHOP_CARDS } from "./casino-shop-catalog.js";
import { THEMES, themeName, calculateBaseCard, asDate } from './utils.js';
import { CARD_POLICY, durationName } from './card-achievements.js';
import { CARD_CRITERIA } from './card-catalog-rules.js';
import { policyAt } from './system-policy.js';

export const BASE_EDITIONS = [
  ['scrap', 0, 49], ['bronze-common', 50, 59], ['bronze-rare', 60, 64],
  ['silver-common', 65, 69], ['silver-rare', 70, 74], ['gold-common', 75, 84], ['gold-rare', 85, 99],
];
const SUMMARIES = {
  'in-form': 'Nota geral ≥ 4,0 em 2 jogos válidos.', mvp: 'Melhor nota do jogo · ≥ 4,5 · 7 avaliações.',
  'hot-streak': 'Nota geral ≥ 4,2 em 3 jogos válidos.', playmaker: 'Média de Passe ≥ 4,4 em 3 jogos válidos.',
  sniper: 'Média de Finalização ≥ 4,4 em 3 jogos válidos.', engine: 'Média de Físico ≥ 4,6 em 3 jogos válidos.',
  'the-wall': 'Média de Defesa ≥ 4,4 em 3 jogos válidos.', 'safe-hands': 'Nota GR ≥ 4,3 em 2 dos últimos 3 jogos válidos.',
  'legend-form': '5 jogos · média ≥ 4,5 · nenhuma nota < 4,0.', 'perfect-five': '5,0 na mesma dimensão em 3 jogos seguidos.',
  icon: '15 jogos · média ≥ 4,0 nos últimos 10 · 2 distinções.', dynasty: '5 vitórias em 7 jogos · média geral ≥ 4,0.',
  'future-stars': '5 jogos após carta oficial · média ≥ 3,8 · +5 OVR.', 'fut-heroes': 'Vitória contra +3 OVR · nota > 3,6 · golo ou assistência.',
  'fut-birthday': '5 primeiras participações · média ≥ 3,6 · uma nota ≥ 4,0.', otw: '3 primeiros jogos · média ≥ 4,0 · nenhuma nota < 3,5.',
  supernova: '6 golos + assistências num jogo · nota ≥ 4,5.', inferno: 'Marcar em 3 jogos seguidos · 8 golos · Ataque ≥ 4,3.',
  glacial: '3 jogos seguidos como GR · média GR ≥ 4,0.', futties: 'Vencer a votação · 4 jogos · Atitude ≥ 4,3.',
  shapeshifters: '2 jogos em cada uma de 2 posições · média ≥ 3,6.',
  tots: 'Melhor da posição · 6 jogos · média ≥ 3,8.', toty: 'Melhor da posição · 12 jogos · média ≥ 3,8.',
  aurora: '2 notas < 3,0, depois 2 ≥ 4,0 · subir 1 ponto na média.', eclipse: '2 vitórias contra +1,2 OVR em 6 jogos · notas ≥ 4,2.',
};
const time = value => { const n = +asDate(value); return value && Number.isFinite(n) ? n : null; };
export function catalogRequirements(id, record = {}) {
  const shop = SHOP_CARDS.find(card => card.id === id);
  if (shop) return { summary: `${shop.minOvr} OVR · ${shop.price.toLocaleString("pt-PT")} DJC`, rules: [`Comprar na loja por ${shop.price.toLocaleString("pt-PT")} DJC.`, `Ter uma carta oficial com pelo menos ${shop.minOvr} OVR.`], note: "Acabamento permanente e pessoal. Não aumenta atributos." };
  const base = BASE_EDITIONS.find(([key]) => key === id);
  if (base) return { summary: `${base[1]}–${base[2]} OVR`, rules: [`Ter uma carta base com OVR entre ${base[1]} e ${base[2]}.`], note: 'O acabamento da carta base acompanha o OVR. Não é uma recompensa temporária.' };
  const policy = CARD_POLICY[id];
  let criterion = CARD_CRITERIA[id] || record.criterion;
  if (id === 'tots') criterion = `Melhor jogador da posição numa época de ${policyAt().cycle.seasonMonths} meses, com seis jogos avaliados e média geral mínima de 3,8. Desempate pela dimensão da posição e OVR.`;
  if (id === 'toty') criterion = `Melhor jogador da posição num ano da liga de ${policyAt().cycle.yearMonths} meses, com doze jogos avaliados e média geral mínima de 3,8. Desempate pela dimensão da posição e OVR.`;
  const rules = criterion ? criterion.split(/(?<=\.)\s+/).filter(Boolean) : ['Conquistar a recompensa desta edição no respetivo evento da liga.'];
  if (CARD_CRITERIA[id] && !['mvp', 'futties', 'shapeshifters'].includes(id)) rules.push('Um jogo avaliado válido exige pelo menos 7 avaliações gerais; critérios de uma dimensão exigem também 7 nessa dimensão. Contam as dispensas de avaliação válidas do jogo.');
  if (id.startsWith('path-')) rules.push('Concluir a prova final do percurso correspondente. O objetivo e as condições são os da missão escolhida, associados à tentativa.');
  const duration = policy?.duration || record.duration || record.cardDuration;
  const durationLabel = { weekly: '7 dias', monthly: '1 mês', season: `${policyAt().cycle.seasonMonths} meses`, year: `${policyAt().cycle.yearMonths} meses` }[duration] || durationName(duration);
  return { summary: SUMMARIES[id] || (id.startsWith('path-') ? 'Concluir a prova de assinatura do percurso.' : criterion || 'Recompensa de evento'), rules, note: `Duração: ${durationLabel}.` };
}

// Only recorded appearances count. Never infer that a player crossed lower OVR tiers.
export function buildCardCatalog(league, now = Date.now()) {
  const entries = new Map([...new Set([...THEMES, ...SHOP_CARDS.map(card => card.id)])].map(id => [id, { id, name: SHOP_CARDS.find(card => card.id === id)?.name || themeName(id), holders: new Map(), records: [] }]));
  const add = (uid, id, record = {}, dated = true) => {
    if (!uid || !id || record.revokedAt || record.pending) return;
    if (time(record.earnedAt || record.createdAt) > now) return;
    if (!entries.has(id)) entries.set(id, { id, name: record.cardTheme?.name || record.name || themeName(id), holders: new Map(), records: [] });
    const entry = entries.get(id);
    const date = dated ? time(record.earnedAt || record.createdAt) : null;
    const old = entry.holders.get(uid);
    if (!old || (date !== null && (old.date === null || date < old.date))) entry.holders.set(uid, { uid, date });
    entry.records.push(record);
  };
  const snapshot = (uid, row) => {
    if (!row || row.hasCard === false) return;
    const base = row.baseCard || row.cardType || (Number.isFinite(row.ovr) ? calculateBaseCard(row.ovr) : null);
    if (base) add(uid, base, {}, false);
    for (const award of row.specials || []) add(uid, typeof award === 'string' ? award : award.id, typeof award === 'string' ? {} : award, false);
  };
  for (const p of league.players || []) {
    if (p.hasCard) snapshot(p.uid, p);
    for (const award of p.earnedCards || []) add(p.uid, award.id, award);
  }
  for (const row of league.catalogSources?.collections || []) for (const award of row.awards || []) add(row.uid || row.id, award.id, award);
  for (const row of league.catalogSources?.weeklyCards || []) snapshot(row.uid, row);
  for (const [uid, row] of Object.entries(league.catalogSources?.previousCards || {})) snapshot(uid, row);
  for (const row of league.eventRewards || []) {
    if (row.pending || row.revokedAt || !row.reward?.specialId || time(row.createdAt || row.startsAt) > now) continue;
    add(row.uid, row.reward.specialId, { ...row.reward, earnedAt: row.cardStartsAt || row.createdAt || row.startsAt });
  }
  const groups = new Map([
    ['base', { name: 'Base', detail: 'Do primeiro OVR ao ouro', entries: [] }],
    ['weekly', { name: 'Destaques', detail: 'Distinções semanais', entries: [] }],
    ['monthly', { name: 'Especiais', detail: 'Consistência ao longo dos jogos', entries: [] }],
    ['season', { name: 'Elite', detail: 'Distinções de época e ano', entries: [] }],
    ['permanent', { name: 'Exclusivas', detail: 'Conquistas permanentes', entries: [] }],
    ['path', { name: 'Percursos', detail: 'Provas finais', entries: [] }],
    ['ultimate', { name: 'Ultimate', detail: 'As metas dos percursos', entries: [] }],
    ['shop', { name: 'Loja do casino', detail: 'Edições descobertas com a primeira compra', entries: [] }],
    ['event', { name: 'Edições da liga', detail: 'Recompensas de eventos', entries: [] }],
  ]);
  const baseOrder = BASE_EDITIONS.map(([id]) => id);
  const ordered = [...entries.values()].sort((a,b) => {
    const ai = baseOrder.indexOf(a.id), bi = baseOrder.indexOf(b.id);
    return ai >= 0 || bi >= 0 ? (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) : 0;
  });
  for (const entry of ordered) {
    const duration = CARD_POLICY[entry.id]?.duration;
    const group = SHOP_CARDS.some(card => card.id === entry.id) ? 'shop' : baseOrder.includes(entry.id) ? 'base' : entry.id.startsWith('ultimate-') ? 'ultimate' : entry.id.startsWith('path-') ? 'path' : ['season','year'].includes(duration) ? 'season' : duration || 'event';
    entry.seen = entry.holders.size > 0;
    entry.record = { ...entry.records[0], ...entry.records.find(r => r.criterion), ...entry.records.find(r => r.cardTheme) };
    entry.requirements = catalogRequirements(entry.id, entry.record);
    entry.holders = [...entry.holders.values()].map(h => ({ ...h, user: (league.users || []).find(u => u.uid === h.uid) })).sort((a,b) => (a.date ?? Infinity) - (b.date ?? Infinity) || a.uid.localeCompare(b.uid));
    // Merge logic retains only some attribution dates: never claim a first holder.
    groups.get(groups.has(group) ? group : 'event').entries.push(entry);
  }
  return { groups: [...groups.values()].filter(g => g.entries.length), entries: ordered, seen: ordered.filter(e => e.seen).length };
}
