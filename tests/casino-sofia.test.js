import test from "node:test";
import assert from "node:assert/strict";
import { applyLocalSofia } from "../js/casino-sofia-local.js";
import { createEngine, createRandom, entryCostMultiplier } from "../games/princesa-sofia/src/index.js";

const connect = (session = null, balance = 1_000_000) => applyLocalSofia(session, balance, { action: "connect" });
const start = (next, mode = "base", betUnits = 100) => applyLocalSofia(next.session, next.balance, { action: "start",
  payload: { sessionId: next.session.sessionId, expectedRevision: next.session.revision, mode, betUnits } });
const step = next => applyLocalSofia(next.session, next.balance, { action: "step",
  payload: { sessionId: next.session.sessionId, roundId: next.session.round.id, index: next.session.round.cursor } });
function finish(next) {
  const events = [];
  while (next.session.round) { next = step(next); assert.equal(next.debit, 0); events.push(...next.result.step.events); }
  return { next, events };
}

test("Sofia debita a entrada uma vez, credita no fim e não expõe o RNG", () => {
  const opened = connect(), snapshot = structuredClone(opened.session);
  const started = start(opened, "super", 100);
  assert.deepEqual(opened.session, snapshot, "o estado anterior não é alterado");
  assert.equal(started.debit, entryCostMultiplier("super") * 100);
  assert.equal(started.balance, opened.balance - started.debit);
  assert.equal(started.credit, 0);
  assert.ok(!("rng" in started.result) && !("rngStart" in (started.result.round || {})));
  const { next, events } = finish(started);
  const end = events.find(event => event.type === "round-end");
  assert.equal(next.credit, end.creditedUnits);
  assert.equal(next.balance, started.balance + end.creditedUnits);
  assert.equal(next.completed.costUnits, started.debit);
});

test("Sofia reproduz exatamente o motor do jogo a partir do mesmo RNG", () => {
  const opened = connect();
  opened.session.rng = 4242;
  const started = start(opened, "common", 200);
  const engine = createEngine({ rng: createRandom(4242) });
  const expected = engine.play({ mode: "common", betUnits: 200 });
  const { next } = finish(started);
  assert.equal(next.credit, expected.settlement.creditedUnits);
});

test("Sofia recusa saldo insuficiente, apostas inválidas, nova jogada a meio e passos fora de ordem", () => {
  const opened = connect(null, 50);
  assert.throws(() => start(opened, "base", 100), /insuficiente/i);
  const rich = connect();
  assert.throws(() => start(rich, "base", 123), /inválid/i);
  assert.throws(() => start(rich, "jackpot", 100), /inválid/i);
  const started = start(rich, "secret", 100);
  assert.throws(() => start(started), /em curso|sessão mudou/i);
  assert.throws(() => applyLocalSofia(started.session, started.balance, { action: "step",
    payload: { sessionId: started.session.sessionId, roundId: started.session.round.id, index: 3 } }), /sessão mudou/i);
});

test("Sofia retoma uma jogada guardada a partir do passo confirmado", () => {
  let next = start(connect(), "common", 100);
  next = step(step(next));
  const resumed = connect(next.session, next.balance);
  assert.equal(resumed.debit + resumed.credit, 0);
  assert.equal(resumed.result.round.cursor, 2);
  assert.deepEqual(resumed.result.round.state, next.result.step.state);
});

test("Sofia conclui com o resultado guardado se a matemática mudar a meio", () => {
  const next = start(connect(), "super", 100);
  next.session.round.configVersion = "versao-antiga";
  const settled = connect(next.session, next.balance);
  assert.equal(settled.credit, next.session.round.creditedUnits);
  assert.equal(settled.session.round, null);
  assert.ok(settled.result.notice);
});

test("Sofia dá o mesmo resultado com a cache de reprodução, mesmo intercalando jogadas", () => {
  // Duas sessões a alternar passos obrigam a cache a falhar e a reconstruir; o resultado tem de ser igual
  // ao de uma sessão jogada sozinha (sem cache útil).
  const solo = finish(start(connect(), "secret"));
  let a = start(connect(), "secret"), b = start(connect(), "common");
  const eventsA = [];
  while (a.session.round) {
    a = step(a); eventsA.push(...a.result.step.events);
    if (b.session.round) b = step(b);
  }
  // Mesmo RNG de partida -> mesma sequência de eventos (a sessão nova usa outra semente, por isso compara-se com replay direto).
  const round = a.completed;
  const engine = createEngine({ rng: createRandom(round.rngStart) });
  let state = engine.start({ mode: round.entryMode, betUnits: round.betUnits }); const direct = [];
  while (!state.complete) { const r = engine.step(state); state = r.state; direct.push(...r.events); }
  assert.deepEqual(eventsA, direct);
  assert.ok(solo.events.length > 0);
});

test("Sofia repete o mesmo passo se a gravação anterior falhou (cache já adiantada)", () => {
  let next = start(connect(), "common");
  const before = next;
  const first = step(before);   // a cache avança para o cursor 1...
  const again = step(before);   // ...mas a carteira não gravou: o mesmo passo volta a ser pedido
  assert.deepEqual(again.result.step, first.result.step);
});
