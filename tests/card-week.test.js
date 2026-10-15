import test from "node:test";
import assert from "node:assert/strict";
import { cardWeek, cardWeekBounds } from "../js/card-week.js";
import { validCardDesign } from "../js/card-design.js";
test("ciclo: quarta 12h fecha e quinta 12h abre, em Lisboa", () => {
  const before = cardWeek(new Date("2026-10-14T10:59:59Z"));
  const closed = cardWeek(new Date("2026-10-14T11:00:00Z"));
  assert.equal(before.phase, "open");
  assert.equal(closed.phase, "closed");
  assert.equal(before.weekId, "2026-W41");
  assert.equal(closed.weekId, before.weekId);
  assert.equal(cardWeek(new Date("2026-10-15T10:59:59Z")).phase, "closed");
  const opened = cardWeek(new Date("2026-10-15T11:00:00Z"));
  assert.equal(opened.phase, "open");
  assert.equal(opened.weekId, "2026-W42");
  assert.deepEqual(cardWeekBounds(opened.weekId).opensAt, opened.opensAt);
  assert.equal(closed.nextOpensAt.toISOString(), "2026-10-15T11:00:00.000Z");
  assert.equal(cardWeek(new Date("2026-11-05T11:59:59Z")).phase, "closed");
  const winter = cardWeek(new Date("2026-11-05T12:00:00Z"));
  assert.equal(winter.phase, "open");
  assert.equal(winter.opensAt.toISOString(), "2026-11-05T12:00:00.000Z");
  assert.deepEqual(cardWeekBounds(winter.weekId).opensAt, winter.opensAt);
});
test("horário de inverno/verão e mudança de ano não alteram as horas locais", () => {
  const summer = cardWeekBounds("2026-W43");
  assert.equal(summer.opensAt.toISOString(), "2026-10-22T11:00:00.000Z");
  assert.equal(summer.closesAt.toISOString(), "2026-10-28T12:00:00.000Z");
  const spring = cardWeekBounds("2026-W13");
  assert.equal(spring.opensAt.toISOString(), "2026-03-26T12:00:00.000Z");
  assert.equal(spring.closesAt.toISOString(), "2026-04-01T11:00:00.000Z");
  assert.equal(cardWeek(new Date("2021-01-01T12:00:00Z")).weekId, "2020-W53");
});
test("composições só aceitam controlos conhecidos dentro dos limites", () => {
  assert.ok(
    validCardDesign({
      photoX: 10,
      photoWidth: 120,
      shape: "shield",
      fit: "contain",
    }),
  );
  for (const value of [
    { photoWidth: 999 },
    { photoX: "10" },
    { shape: "script" },
    { unknown: 1 },
    { photoScale: NaN },
  ])
    assert.ok(!validCardDesign(value));
});

test("fundo do nome aceita RGB e transparência nos limites", () => {
  assert.ok(
    validCardDesign({
      nameBackgroundRed: 255,
      nameBackgroundGreen: 0,
      nameBackgroundBlue: 128,
      nameBackgroundTransparency: 100,
    }),
  );
  assert.ok(validCardDesign({ nameBackgroundTransparency: 0 }));
  for (const value of [
    { nameBackgroundRed: 256 },
    { nameBackgroundGreen: -1 },
    { nameBackgroundBlue: "128" },
    { nameBackgroundTransparency: 101 },
    { nameBackgroundTransparency: NaN },
  ])
    assert.ok(!validCardDesign(value));
});

test("estúdio: combinações válidas e fontes/efeitos arbitrários rejeitados", () => {
  assert.ok(
    validCardDesign({
      background: "waves",
      nameFont: "editorial",
      ratingFont: "sport",
      watermark: "crown",
      effect: "holographic",
      shape: "crown",
      nameSize: 125,
      ratingSize: 110,
      labelsSize: 90,
    }),
  );
  for (const design of [
    { effect: "url(script)" },
    { nameFont: "unknown" },
    { watermark: "script" },
    { ratingSize: 999 },
  ])
    assert.ok(!validCardDesign(design));
});
