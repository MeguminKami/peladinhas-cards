import test from "node:test";
import assert from "node:assert/strict";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { footballClubFunctions } from "../functions/football-clubs.js";
import { homeProjection, invalidateHome } from "../functions/home-cache.js";
import { clubLogo } from "../js/football-clubs.js";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-")) throw Error("Use apenas o emulador demo.");
initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const db = getFirestore();
let timestamp, calls, failure, empty;
const endpoints = footballClubFunctions({ apiKey: () => "fixture-private-key", now: () => timestamp,
  fetchImpl: async (url, options) => {
    calls++;
    assert.match(url, /^https:\/\/v3\.football\.api-sports\.io\/teams\?search=/);
    assert.equal(options.headers["x-apisports-key"], "fixture-private-key");
    if (failure) return { ok: false };
    return { ok: true, json: async () => ({ errors: [], response: (empty ? [] : [1, 2, 3, 4]).map(id => ({ team: { id, name: `Clube ${id}`, country: "Portugal", national: false, logo: "https://evil.invalid" } })) }) };
  },
});
const search = (query = "clube", ip = "fixture-ip") => endpoints.searchFootballClubs.run({ data: { query }, rawRequest: { ip } });
const select = (clubId, uid = "member") => endpoints.selectFootballClub.run({ auth: { uid, token: {} }, data: { clubId, logo: "https://evil.invalid" } });
test.beforeEach(async () => {
  timestamp = +new Date("2026-07-01T22:59:00Z"); calls = 0; failure = false; empty = false;
  for (const collection of ["footballClubData/main/clubs", "footballClubData/main/searches", "footballClubData/main/budgets", "footballClubData/main/selections", "users", "settings", "systemRateLimits", "maintenanceSignals", "homeSignals"]) {
    const docs = await db.collection(collection).get();
    const batch = db.batch(); docs.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit();
  }
  await db.doc("users/member").set({ uid: "member", role: "member", disabled: false });
});
test("public onboarding search caches globally; selection copies only canonical data", async () => {
  const result = await search();
  assert.equal(result.clubs.length, 4);
  assert.deepEqual(await search("  CLUBE  ", "another-ip"), result);
  assert.equal(calls, 1);
  await select("af-1");
  const user = (await db.doc("users/member").get()).data();
  assert.deepEqual(user.favoriteClub, result.clubs[0]);
  assert.equal(user.favoriteClub.logo, clubLogo("af-1"));
  const projected = homeProjection({ players: [{ ...user, aggregates: [] }], games: [], cycle: {} }, "member");
  assert.deepEqual(projected.players[0].favoriteClub, user.favoriteClub);
  const { favoriteClub, updatedAt, ...before } = user;
  await invalidateHome("users", "member", before, user);
  assert.equal((await db.collection("maintenanceSignals").get()).size, 0, "club choice must not enqueue calculations");
});
test("concurrent changes cannot exceed the two-per-day limit; retry and midnight are safe", async () => {
  await search(); await select("af-1");
  const results = await Promise.allSettled([select("af-2"), select("af-3"), select("af-4")]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 2);
  assert.equal(results.find(result => result.status === "rejected").reason.code, "resource-exhausted");
  const user = (await db.doc("users/member").get()).data();
  const before = await db.doc("users/member").get();
  assert.equal((await select(user.favoriteClub.id)).remainingChanges, 0);
  const after = await db.doc("users/member").get();
  assert.ok(before.updateTime.isEqual(after.updateTime), "same-club retry must not write profile");
  timestamp = +new Date("2026-07-01T23:00:00Z");
  assert.equal((await select("af-1")).remainingChanges, 1);
});
test("unknown, anonymous, disabled and forged selections are rejected", async () => {
  await assert.rejects(select("af-999"), { code: "invalid-argument" });
  await assert.rejects(select("../bad"), { code: "invalid-argument" });
  await assert.rejects(endpoints.selectFootballClub.run({ data: { clubId: "af-1" } }), { code: "unauthenticated" });
  await db.doc("users/member").update({ disabled: true });
  await assert.rejects(select("af-1"), { code: "permission-denied" });
  assert.equal(calls, 0);
});
test("outages, shared budgets and missing credentials are explicit", async () => {
  failure = true;
  await assert.rejects(search(), { code: "unavailable" });
  await assert.rejects(search(), { code: "unavailable" });
  assert.equal(calls, 1, "failure lease prevents repeated external calls");
  timestamp += 16000; failure = false;
  await search();
  await db.doc("footballClubData/main/budgets/global").set({ day: "2026-07-01", count: 80 });
  await assert.rejects(search("porto"), { code: "resource-exhausted" });
  assert.equal((await search()).clubs.length, 4, "cached searches still work when budget is exhausted");
  const unconfigured = footballClubFunctions();
  await assert.rejects(unconfigured.searchFootballClubs.run({ data: { query: "sporting" }, rawRequest: { ip: "new" } }), { code: "failed-precondition" });
  assert.equal(calls, 2);
});
test("empty searches are cached for one day, repeated requests share one provider call", async () => {
  empty = true;
  assert.deepEqual(await search("absent"), { clubs: [] });
  assert.deepEqual(await search("absent", "another-ip"), { clubs: [] });
  assert.equal(calls, 1);
  timestamp += 86400001;
  empty = false;
  assert.equal((await search("absent")).clubs.length, 4);
  assert.equal(calls, 2);
});
test("personal and per-minute miss budgets reject requests before calling provider", async () => {
  await search();
  const budgets = await db.collection("footballClubData/main/budgets").get();
  const personal = budgets.docs.find(doc => doc.id !== "global");
  await personal.ref.update({ count: 15 });
  await assert.rejects(search("newclub"), { code: "resource-exhausted" });
  await personal.ref.update({ count: 0 });
  await db.doc("footballClubData/main/budgets/global").update({ minuteCount: 8 });
  await assert.rejects(search("newclub"), { code: "resource-exhausted" });
  assert.equal(calls, 1);
});
