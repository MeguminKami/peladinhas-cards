import test from "node:test";
import assert from "node:assert/strict";
import { normalizeClubQuery, providerClub, clubLogo, clubDay, nextClubSelection } from "../js/football-clubs.js";
import { clubBadge } from "../js/club-badge.js";
import { historyForDisplay } from "../js/card-history.js";

test("queries normalize accents and whitespace and reject paths, markup and oversized input", () => {
  assert.equal(normalizeClubQuery("  Vitória   SC "), "vitoria sc");
  for (const input of [null, {}, "ab", "../porto", "<script>", "x".repeat(81)]) assert.equal(normalizeClubQuery(input), "");
});
test("provider records exclude national teams and cannot inject logo URLs or IDs", () => {
  const club = providerClub({ team: { id: 211, name: "Benfica", country: "Portugal", national: false, logo: "https://evil.test/a.svg" } });
  assert.equal(club.logo, "https://media.api-sports.io/football/teams/211.png");
  assert.equal(providerClub({ team: { id: 1, national: true } }), null);
  assert.equal(providerClub({ team: { id: "../../bad", national: false } }), null);
  assert.equal(clubLogo("af-1/../../bad"), "./assets/club-placeholder.svg");
  assert.match(clubBadge({ ...club, name: '<img onerror="bad">' }, { name: true }), /&lt;img/);
  assert.doesNotMatch(clubBadge({ id: "bad" }), /img/);
});
test("first selection is free, two changes are allowed, same club is idempotent", () => {
  const now = new Date("2026-07-01T12:00:00Z");
  let state = nextClubSelection(null, null, "af-1", now);
  assert.equal(state.count, 0);
  state = nextClubSelection({ id: "af-1" }, state, "af-2", now);
  state = nextClubSelection({ id: "af-2" }, state, "af-3", now);
  assert.equal(state.count, 2);
  assert.equal(nextClubSelection({ id: "af-3" }, state, "af-3", now), null);
  assert.throws(() => nextClubSelection({ id: "af-3" }, state, "af-4", now), /duas vezes/);
  assert.equal(nextClubSelection({ id: "af-3" }, state, "af-4", new Date("2026-07-02T00:00:00Z")).count, 1);
});
test("daily boundary follows Lisbon including daylight saving time", () => {
  assert.equal(clubDay(new Date("2026-07-01T22:59:59Z")), "2026-07-01");
  assert.equal(clubDay(new Date("2026-07-01T23:00:00Z")), "2026-07-02");
  assert.equal(clubDay(new Date("2026-12-01T23:00:00Z")), "2026-12-01");
});
test("open history adopts current club while closed snapshots remain unchanged", () => {
  const club = { id: "af-1", name: "Clube", country: "Portugal" };
  const player = { hasCard: true, favoriteClub: club };
  const open = { weekId: "2026-W30", locked: false }, closed = { weekId: "2026-W29", locked: true };
  const history = historyForDisplay(player, [open, closed], { phase: "open", weekId: open.weekId });
  assert.deepEqual(history[0].appearance.favoriteClub, club);
  assert.equal(history[1], closed);
  assert.equal(closed.appearance, undefined);
});
