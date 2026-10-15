import test from "node:test";
import assert from "node:assert/strict";
import {
  lisbonDateInput,
  parseLisbonDateInput,
  formatMatchDate,
} from "../js/match-time.js";
test("jogos usam a hora de Lisboa no inverno e verão, independentemente do dispositivo", () => {
  assert.equal(
    parseLisbonDateInput("2026-01-15T20:00").toISOString(),
    "2026-01-15T20:00:00.000Z",
  );
  assert.equal(
    parseLisbonDateInput("2026-07-15T20:00").toISOString(),
    "2026-07-15T19:00:00.000Z",
  );
  assert.equal(
    lisbonDateInput(new Date("2026-07-15T19:00Z")),
    "2026-07-15T20:00",
  );
  assert.match(formatMatchDate(new Date("2026-07-15T19:00Z")), /20:00.*Lisboa/);
});
test("horas inexistentes são rejeitadas; hora repetida escolhe a primeira ocorrência", () => {
  assert.throws(() => parseLisbonDateInput("2026-03-29T01:30"), /não existe/);
  assert.equal(
    parseLisbonDateInput("2026-10-25T01:30").toISOString(),
    "2026-10-25T00:30:00.000Z",
  );
  assert.throws(() => parseLisbonDateInput("2026-02-30T20:00"));
  assert.throws(() => parseLisbonDateInput(""));
  assert.equal(lisbonDateInput(null), "");
});
