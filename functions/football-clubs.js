import { createHash } from "node:crypto";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { policyCall, withPolicy, assertFeature } from "./policy-runtime.js";
import { policyAt } from "../js/system-policy.js";
import { normalizeClubQuery, providerClub, validClubId, nextClubSelection, clubDay } from "../js/football-clubs.js";

const hash = (s) => createHash("sha256").update(s).digest("hex");
const DAY = 86400000;
export function footballClubFunctions({ apiKey, secret, fetchImpl = fetch, now = Date.now } = {}) {
  const db = () => getFirestore();
  const searchFootballClubs = onCall({ ...(secret ? { secrets: [secret] } : {}), maxInstances: 1, concurrency: 20, timeoutSeconds: 20 }, request =>
    withPolicy(async () => {
      const query = normalizeClubQuery(request.data?.query);
      if (!query) throw new HttpsError("invalid-argument", "Escreve entre 3 e 60 caracteres para pesquisar um clube.");
      assertFeature(request.auth ? "profile" : "registration");
      if (policyAt().security.requireAppCheck && !request.app)
        throw new HttpsError("unauthenticated", "Verificação da aplicação necessária.");
      if (request.auth) {
        const user = (await db().doc(`users/${request.auth.uid}`).get()).data();
        if (!user || user.disabled || (request.auth.token?.auth_time || 0) < (user.tokensValidAfter || 0))
          throw new HttpsError("permission-denied", "Conta indisponível. Volta a iniciar sessão.");
      }
      const ref = db().doc(`footballClubData/main/searches/${hash(query)}`);
      const cached = (await ref.get()).data();
      if (cached?.expiresAt > now()) return { clubs: cached.clubs };
      const key = apiKey?.();
      if (!key) throw new HttpsError("failed-precondition", "Pesquisa de clubes ainda não configurada. Podes escolher o clube mais tarde no perfil.");
      // Reserve before fetching: shared daily budget and a lease prevent storms,
      // duplicate requests and exceeding the provider's free daily allowance.
      const utcDay = new Date(now()).toISOString().slice(0, 10);
      const globalRef = db().doc("footballClubData/main/budgets/global");
      const actor = request.auth?.uid || request.rawRequest?.ip || "anonymous";
      const actorRef = db().doc(`footballClubData/main/budgets/${hash(actor)}`);
      const reused = await db().runTransaction(async tx => {
        const [search, global, actorBudget] = await tx.getAll(ref, globalRef, actorRef);
        const current = search.data();
        if (current?.expiresAt > now()) return current.clubs;
        if (current?.leaseUntil > now()) throw new HttpsError("unavailable", "Pesquisa em curso. Tenta novamente dentro de alguns segundos.");
        const total = global.data()?.day === utcDay ? global.data().count : 0;
        const personal = actorBudget.data()?.day === utcDay ? actorBudget.data().count : 0;
        const minute = Math.floor(now() / 60000);
        const perMinute = global.data()?.minute === minute ? global.data().minuteCount : 0;
        if (total >= 80 || personal >= 15 || perMinute >= 8)
          throw new HttpsError("resource-exhausted", "Limite de novas pesquisas atingido. Tenta mais tarde; os resultados já encontrados continuam disponíveis.");
        tx.set(globalRef, { day: utcDay, count: total + 1, minute, minuteCount: perMinute + 1 });
        tx.set(actorRef, { day: utcDay, count: personal + 1, expiresAt: new Date(now() + 2 * DAY) });
        tx.set(ref, { leaseUntil: now() + 15000, expiresAt: 0, clubs: [] });
        return null;
      });
      if (reused !== null) return { clubs: reused };
      try {
        const response = await fetchImpl(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(query)}`, {
          headers: { "x-apisports-key": key }, signal: AbortSignal.timeout(6000), redirect: "error",
        });
        if (!response.ok) throw Error("Provider unavailable");
        const body = await response.json();
        if (!Array.isArray(body.response) || (body.errors && Object.keys(body.errors).length)) throw Error("Invalid provider response");
        const clubs = [...new Map(body.response.map(providerClub).filter(Boolean).map(club => [club.id, club])).values()].slice(0, 20);
        const batch = db().batch();
        for (const club of clubs) batch.set(db().doc(`footballClubData/main/clubs/${club.id}`), club);
        batch.set(ref, { clubs, expiresAt: now() + (clubs.length ? 30 * DAY : DAY), leaseUntil: 0 });
        await batch.commit();
        return { clubs };
      } catch {
        // Keep the short lease on failures; never cache an outage as an empty search.
        throw new HttpsError("unavailable", "Não foi possível pesquisar clubes. Tenta novamente mais tarde.");
      }
    }));

  const selectFootballClub = policyCall("selectFootballClub", async request => {
    assertFeature("profile");
    const id = request.data?.clubId;
    if (!validClubId(id)) throw new HttpsError("invalid-argument", "Escolhe um clube da pesquisa.");
    const userRef = db().doc(`users/${request.auth.uid}`);
    const stateRef = db().doc(`footballClubData/main/selections/${request.auth.uid}`);
    return db().runTransaction(async tx => {
      const [user, club, state] = await tx.getAll(userRef, db().doc(`footballClubData/main/clubs/${id}`), stateRef);
      if (!user.exists || user.data().disabled) throw new HttpsError("permission-denied", "Conta indisponível.");
      if (!club.exists) throw new HttpsError("invalid-argument", "Clube não encontrado. Repete a pesquisa.");
      let next;
      try { next = nextClubSelection(user.data().favoriteClub, state.data(), id, now()); }
      catch (error) { throw new HttpsError("resource-exhausted", error.message); }
      if (next) {
        tx.update(userRef, { favoriteClub: club.data(), updatedAt: FieldValue.serverTimestamp() });
        tx.set(stateRef, next);
      }
      const current = next || state.data();
      return { club: club.data(), remainingChanges: 2 - (current?.day === clubDay(now()) ? current.count : 0) };
    });
  });
  return { searchFootballClubs, selectFootballClub };
}
