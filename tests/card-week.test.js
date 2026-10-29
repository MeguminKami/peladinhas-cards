import test from "node:test";
import assert from "node:assert/strict";
import { cardWeek, cardWeekBounds, canReopenWeeklyCard } from "../js/card-week.js";
import { validCardDesign } from "../js/card-design.js";
import { setPolicyDocument } from "../js/system-policy.js";

test("a versioned 06h opening applies today and preserves preceding weeks and Lisbon DST", () => {
  setPolicyDocument({revision:7,timeline:[{version:7,effectiveAt:"2026-10-29T06:00:00Z",patch:{cycle:{openHour:6,openMinute:0}}}]});
  try {
    assert.equal(cardWeekBounds("2026-W43").opensAt.toISOString(), "2026-10-22T11:00:00.000Z");
    assert.equal(cardWeek(new Date("2026-10-29T05:59:59Z")).phase, "closed");
    const opened=cardWeek(new Date("2026-10-29T06:00:00Z"));
    assert.equal(opened.phase, "open");
    assert.equal(opened.weekId, "2026-W44");
    assert.equal(opened.opensAt.toISOString(), "2026-10-29T06:00:00.000Z");
    assert.equal(opened.closesAt.toISOString(), "2026-11-04T18:00:00.000Z");
    assert.equal(cardWeekBounds("2027-W27").opensAt.toISOString(), "2027-07-08T05:00:00.000Z");
  } finally { setPolicyDocument(null); }
});
test("ciclo histórico anterior a 21/10: quarta 12h fecha e quinta 12h abre, em Lisboa", () => {
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
  assert.equal(summer.closesAt.toISOString(), "2026-10-28T18:00:00.000Z");
  const spring = cardWeekBounds("2026-W13");
  assert.equal(spring.opensAt.toISOString(), "2026-03-26T12:00:00.000Z");
  assert.equal(spring.closesAt.toISOString(), "2026-04-01T11:00:00.000Z");
  assert.equal(cardWeek(new Date("2021-01-01T12:00:00Z")).weekId, "2020-W53");
});
test("from 21 October, Wednesday stays editable until 18h Lisbon; opening and old weeks stay unchanged", () => {
  const cycle=cardWeek(new Date("2026-10-21T16:59:59Z"));
  assert.equal(cycle.phase,"open");
  assert.equal(cycle.closesAt.toISOString(),"2026-10-21T17:00:00.000Z");
  assert.equal(cardWeek(new Date("2026-10-21T17:00:00Z")).phase,"closed");
  assert.equal(cardWeek(new Date("2026-10-28T17:59:59Z")).phase,"open");
  assert.equal(cardWeek(new Date("2026-10-28T18:00:00Z")).phase,"closed");
  assert.equal(cardWeek(new Date("2026-10-22T11:00:00Z")).phase,"open");
  const old={weekId:cycle.weekId,locked:true,closesAt:new Date("2026-10-21T11:00:00Z")};
  assert.ok(canReopenWeeklyCard(old,cycle));
  assert.ok(!canReopenWeeklyCard({...old,weekId:"2026-W41"},cycle));
  assert.ok(!canReopenWeeklyCard({...old,closesAt:cycle.closesAt},cycle));
  assert.ok(!canReopenWeeklyCard(old,cardWeek(new Date("2026-10-21T17:00:00Z"))));
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
      positionFont: "original",
      statsFont: "peladinhas",
      ratingLayout: "compact",
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
    { ratingLayout: "arbitrary" },
    { watermark: "script" },
    { ratingSize: 999 },
  ])
    assert.ok(!validCardDesign(design));
});
