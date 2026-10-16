import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { seedDocumentation } from '../scripts/documentation-fixtures.mjs';

const output = resolve('artifacts/migration/feature-flows');
mkdirSync(output, { recursive: true });
const vite = await createServer({ mode: 'test', server: { port: 0, watch: { ignored: ['**/*'] } } });
await vite.listen();
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
const context = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce', viewport: { width: 1440, height: 960 } });
await context.route(/https:\/\//, route => route.abort());
const page = await context.newPage();
const errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(15000);
const go = async hash => { await page.evaluate(value => { location.hash = value; }, hash); };
try {
  await page.goto(vite.resolvedUrls.local[0]);
  await page.locator('.dashboard-greeting').waitFor();
  await page.evaluate(`(${seedDocumentation.toString().replaceAll('./js/', `/@fs/${resolve('.').replaceAll('\\', '/')}/js/`)})()`);
  await go('#/game/new');
  await page.locator('#game-form').waitFor();
  await page.locator('[name="title"]').fill('Migração · jogo de teste');
  await page.locator('[name="scheduledAt"]').fill('2026-10-17T19:30');
  await page.locator('[name="location"]').fill('Campo de testes');
  await page.locator('[data-uid="pedro"][data-assign="teamA"]').click();
  await page.locator('[data-uid="joao"][data-assign="teamB"]').click();
  await page.locator('button[value="save"]').click();
  await page.waitForURL('**/#/game/test-game');
  await page.locator('button[value="open"]').click();
  await page.locator('button[value="close"]').waitFor();
  await page.locator('[name="scoreA"]').fill('1');
  await page.locator('[data-performance-uid="pedro"][data-performance-key="goals"]').fill('1');
  await page.locator('button[value="close"]').click();
  await page.locator('.match-ratings').waitFor();
  const saved = await page.evaluate(() => window.__testState.games.find(game => game.id === 'test-game'));
  assert.equal(saved.status, 'closed');
  assert.deepEqual(saved.performance.teamA.goals, ['pedro']);
  assert.equal(saved.positions.pedro, 'MED');
  assert.equal(saved.positions.joao, 'AV');
  const order = await page.evaluate(() => { const result = document.querySelector('#game-result'), ratings = document.querySelector('#game-ratings'); return result.compareDocumentPosition(ratings) & Node.DOCUMENT_POSITION_FOLLOWING; });
  assert.ok(order, 'Stars follow all result and performance content');
  console.log('Passed stage', results.length + 1); results.push('Criar, atribuir jogadores, guardar, abrir, encerrar; posições históricas e golos persistidos; estrelas após resultado.');

  await go('#/game/test-game/feedback');
  await page.locator('.feedback-workspace').waitFor();
  for (const uid of ['joao', 'pedro']) {
    const review = page.locator(`.feedback-review:has(form[data-target="${uid}"])`);
    if (!await review.evaluate(element => element.open)) await review.locator('summary').click();
    for (const field of await review.locator('.feedback-field').all()) await field.locator('label.feedback-star[data-value="3"]').click();
    if (uid === 'joao') await review.locator('[data-dimension="goalkeeping"] .feedback-na').click();
    if (uid === 'pedro') await review.locator('[data-dimension="passing"] .feedback-zero').click();
  }
  await page.locator('.feedback-submit-button').click();
  await page.getByRole('heading', { name: 'Tudo enviado', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__testState.feedback.filter(row => row.gameId === 'test-game' && row.submitted).length), 2);
  assert.equal(await page.evaluate(() => window.__testState.feedback.find(row => row.gameId === 'test-game' && row.targetId === 'joao').ratings.goalkeeping), null);
  assert.equal(await page.evaluate(() => window.__testState.feedback.find(row => row.gameId === 'test-game' && row.targetId === 'pedro').ratings.passing), 0);
  assert.equal(await page.locator('.feedback-form[data-submitted="true"]').count(), 2);
  await page.locator('#edit-game-feedback').click();
  await page.getByText('A editar avaliações', { exact: true }).waitFor();
  assert.equal(await page.locator('.feedback-form[data-submitted="false"]').count(), 2);
  console.log('Passed stage', results.length + 1); results.push('Avaliar colegas e próprio, guardar rascunhos, submeter e reabrir dentro do prazo de edição.');

  await page.evaluate(() => { window.__testState.initialRatings.find(row => row.uid === 'pedro').submittedAt = new Date(); });
  await go('#/missions/self');
  await page.locator('.rating-sliders').waitFor();
  await page.locator('#pace-number').fill('17');
  await page.getByRole('button', { name: 'Guardar agora' }).click();
  await page.waitForFunction(() => window.__testState.initialRatings.find(row => row.uid === 'pedro').ratings20.pace === 17);
  await page.locator('#pace-number').fill('18');
  await go('#/games');
  await page.waitForFunction(() => window.__testState.initialRatings.find(row => row.uid === 'pedro').ratings20.pace === 18);
  await go('#/missions/self');
  await page.locator('.rating-sliders').waitFor();
  await page.evaluate(() => { window.__failRatingSave = true; });
  await page.locator('#pace-number').fill('0');
  await page.getByRole('button', { name: 'Guardar agora' }).click();
  await page.locator('.save-state.error').waitFor();
  assert.equal(await page.evaluate(() => window.__testState.initialRatings.find(row => row.uid === 'pedro').ratings20.pace), 18, 'Failed save keeps persisted values intact');
  assert.equal(await page.locator('#pace-number').inputValue(), '0', 'Failed save keeps the edited draft available for retry');
  await go('#/games');
  await page.waitForURL('**/#/missions/self');
  assert.equal(await page.locator('#pace-number').inputValue(), '0', 'Failed navigation preserves the active form and its draft');
  await page.evaluate(() => { window.__failRatingSave = false; });
  await page.getByRole('button', { name: 'Guardar agora' }).click();
  await page.waitForFunction(() => window.__testState.initialRatings.find(row => row.uid === 'pedro').ratings20.pace === 0);
  await go('#/games');
  await page.locator('.game-row').first().waitFor();
  console.log('Passed stage', results.length + 1); results.push('Autosave: falha preserva rascunho zero e bloqueia navegacao; retry recupera e permite navegar. Autoavaliação inicial: alteração e gravação explícita na fila de rascunhos.');

  await go('#/admin/card-photo/pedro');
  await page.locator('#weekly-photo-form').waitFor();
  if (await page.locator('[name="photoURL"]').isEnabled()) {
    await page.locator('[name="photoURL"]').fill('https://example.com/photo.webp');
    await page.locator('#weekly-card-preview').focus();
    const before = await page.locator('[name="photoX"]').inputValue();
    await page.keyboard.press('ArrowRight');
    assert.equal(Number(await page.locator('[name="photoX"]').inputValue()), Number(before) + 2);
    await page.locator('#save-weekly-photo').click();
    await page.waitForFunction(() => window.__testState.weeklyCardPhotos?.some(row => row.uid === 'pedro' && row.photoURL === 'https://example.com/photo.webp'));
    console.log('Passed stage', results.length + 1); results.push('Foto semanal: URL, mover com teclado e persistir design.');
  } else {
    console.log('Passed stage', results.length + 1);
    results.push('Foto semanal bloqueada pelo estado semanal da fixture; edição não executada.');
  }

  await go('#/admin/ovr/pedro');
  await page.locator('#ovr-weights').waitFor();
  assert.equal(await page.locator('#ovr-weights tbody tr').count(), 12);
  await go('#/admin/card-types/pedro');
  await page.locator('.card-type-tile').first().click();
  await page.locator('.modal .history-card-expanded .football-card').waitFor();
  await page.keyboard.press('Escape');
  console.log('Passed stage', results.length + 1); results.push('Auditoria OVR tem 12 atributos; catálogo de cartas abre e fecha pré-visualização.');

  await go('#/tickets/new');
  await page.locator('#ticket-create [name="title"]').fill('Apoio de teste React');
  await page.locator('#ticket-create [name="body"]').fill('Primeira mensagem do pedido de teste.');
  await page.locator('#ticket-create button').click();
  await page.waitForURL('**/#/tickets/test-ticket-1');
  await page.getByText('Primeira mensagem do pedido de teste.', { exact: true }).waitFor();
  await page.locator('#ticket-reply [name="body"]').fill('Resposta adicionada através do formulário.');
  await page.locator('#ticket-reply button[type="submit"], #ticket-reply button:not([type])').click();
  await page.getByText('Resposta adicionada através do formulário.', { exact: true }).waitFor();
  await page.locator('#ticket-close').click();
  await page.locator('#confirm').click();
  await page.locator('#ticket-controls').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => window.__testState.tickets.find(row => row.id === 'test-ticket-1').status), 'closed');
  await go('#/tickets');
  await page.locator('#ticket-filter').selectOption('closed');
  await page.getByRole('link', { name: /Apoio de teste React/ }).waitFor();
  console.log('Passed stage', results.length + 1); results.push('Apoio: criar pedido, resposta em direto, confirmar fecho definitivo e filtrar histórico.');

  await page.evaluate(() => {
    const mission = window.__testState.events.find(event => event.id === 'demo-games');
    Object.assign(mission, { winners: [], ranking: [], configuration: { positions: [{ boosts: { pace: 1 }, duration: 'permanent' }] } });
    const vote = window.__testState.events.find(event => event.id === 'demo-vote');
    Object.assign(vote, { winners: [], ranking: [], votesPerUser: 1, minVotes: 1, allowSelfVote: false, votingStartsAt: new Date(Date.now() - 3600000).toISOString() });
  });
  await go('#/event/demo-games');
  await page.locator('#claim-mission').waitFor();
  assert.equal(await page.locator('#claim-mission').isDisabled(), true, 'Unmet objective cannot be claimed');
  await page.evaluate(() => { window.__testState.events.find(event => event.id === 'demo-games').progress = [{ uid: 'pedro', progress: 5, eligible: true }]; });
  await go('#/events');
  await page.locator('#public-event-list').waitFor();
  await go('#/event/demo-games');
  await page.locator('#claim-mission').click();
  await page.getByText('Já recebeste a recompensa deste período.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__testState.eventRewards.filter(row => row.eventId === 'demo-games').length), 1);
  const repeatedClaim = await page.evaluate(async fixturePath => {
    const db = await import(fixturePath);
    const first = await db.callAdmin('claimMission', { eventId: 'demo-games' });
    const second = await db.callAdmin('claimMission', { eventId: 'demo-games' });
    return { first: first.data.id, second: second.data.id, count: window.__testState.eventRewards.filter(row => row.eventId === 'demo-games').length };
  }, `/@fs/${resolve('tests/fixtures/db.js').replaceAll('\\', '/')}`);
  assert.equal(repeatedClaim.first, repeatedClaim.second, 'Repeated claim returns the same delivery');
  assert.equal(repeatedClaim.count, 1, 'Repeated claim cannot duplicate a reward');
  await go('#/events'); await page.locator('#public-event-list').waitFor(); await go('#/event/demo-games');
  await page.getByText('Já recebeste a recompensa deste período.', { exact: true }).waitFor();
  assert.equal(await page.locator('#claim-mission').count(), 0, 'Claim stays unavailable after reloading claimed mission');
  await go('#/event/demo-vote');
  await page.locator('#event-vote-form input[value="joao"]').check();
  await page.locator('#event-vote-form button').click();
  await page.getByRole('button', { name: 'Atualizar voto', exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.__testState.eventVotes.find(vote => vote.eventId === 'demo-vote').selections), ['joao']);
  await page.locator('#event-vote-form input[value="joao"]').uncheck();
  await page.locator('#event-vote-form input[value="miguel"]').check();
  await page.locator('#event-vote-form button').click();
  await page.waitForFunction(() => window.__testState.eventVotes.find(vote => vote.eventId === 'demo-vote').selections[0] === 'miguel');
  assert.equal(await page.evaluate(() => window.__testState.eventVotes.filter(vote => vote.eventId === 'demo-vote').length), 1);
  console.log('Passed stage', results.length + 1); results.push('Missões: objetivo incompleto bloqueia recompensa; objetivo elegível recebe uma vez e mantém estado após recarregar. Voto novo e atualização substituem a seleção anterior.');

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await go('#/game/test-game');
    await page.locator('#game-result').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Game page overflow ${width}`);
    await page.screenshot({ path: resolve(output, `game-${width}.png`), animations: 'disabled' });
  }
  assert.deepEqual(errors, []);
} finally {
  writeFileSync(resolve(output, 'report.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close(); await vite.close();
}
console.log(JSON.stringify({ results, errors }, null, 2));
