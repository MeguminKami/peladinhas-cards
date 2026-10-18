import test from "node:test";
import assert from "node:assert/strict";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import {
  maintenanceRead,
  maintenanceAction,
  eventAction,
  getEvent,
  claimMission,
  systemHeartbeat,
} from "../functions/index.js";
import { DEFAULT_POLICY } from "../js/system-policy.js";
import { withPolicy, inPolicy } from "../functions/policy-runtime.js";
import { policyAt } from "../js/system-policy.js";
const db = getFirestore();
if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw Error("Este teste só pode executar no emulador Firestore.");
const root = "maintenance-root",
  member = "maintenance-player";
const call = (action, data = {}, uid = root) =>
  maintenanceAction.run({
    auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
    data: { action, ...data },
  });
const read = (section, uid = root) =>
  maintenanceRead.run({ auth: { uid }, data: { section } });
const config = () => structuredClone(DEFAULT_POLICY);
test("maintenance: persisted policies, authority, transactions, budgets, deferral, permissions and recovery diagnostics", async (t) => {
  await db.doc("settings/system").delete();
  for (const collection of ["eventRewards"]) {
    const records = await db
      .collection(collection)
      .where("uid", "==", member)
      .get();
    for (const row of records.docs) await row.ref.delete();
  }
  await db
    .doc(`users/${root}`)
    .set({ uid: root, role: "admin", disabled: false });
  await db
    .doc(`users/${member}`)
    .set({ uid: member, role: "member", disabled: false });
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    for (const uid of [root, member])
      try {
        await getAuth().createUser({
          uid,
          email: `${uid}@example.test`,
          password: "OriginalPassword123!",
        });
      } catch (error) {
        if (
          error.code !== "auth/uid-already-exists" &&
          error.code !== "auth/email-already-exists"
        )
          throw error;
      }
  }
  t.after(() => db.doc("settings/system").delete());
  let revision = 0;
  const publish = async (p) => {
    const result = await call("publish", {
      config: p,
      expectedRevision: revision,
      reason: "Validação da manutenção",
    });
    revision = result.revision;
    return result;
  };
  await t.test(
    "rejects non-admin, malformed configuration and unsupported operations",
    async () => {
      await assert.rejects(
        read("config", member),
        (error) => error.code === "permission-denied",
      );
      await assert.rejects(
        call("publish", {
          config: {},
          reason: "Teste inválido",
          expectedRevision: 0,
        }),
      );
      await assert.rejects(call("unknown"));
      await assert.rejects(call("export", { collection: "pushDevices" }));
    },
  );
  await t.test(
    "draft is private; publish is versioned and concurrent stale writes are rejected",
    async () => {
      const p = config();
      p.rewards.dailyBudget = 5;

      await call("draft", { config: p });
      assert.equal((await read("config")).draft.config.rewards.dailyBudget, 5);
      await publish(p);
      assert.equal((await db.doc(`systemDrafts/${root}`).get()).exists, false);
      await assert.rejects(
        call("publish", {
          config: p,
          expectedRevision: 0,
          reason: "Versão desatualizada",
        }),
        /mudou/,
      );
      assert.equal((await read("config")).config.rewards.dailyBudget, 5);
      assert.ok(
        (await read("history")).versions.some(
          (row) => row.version === revision,
        ),
      );
    },
  );
  await t.test(
    "concurrent requests keep isolated policy snapshots",
    async () => {
      const a = config(),
        b = config();
      a.rewards.dailyBudget = 3;
      b.rewards.dailyBudget = 9;
      const run = (p) =>
        inPolicy(
          { timeline: [{ version: 1, effectiveAt: "1970-01-01", config: p }] },
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return policyAt().rewards.dailyBudget;
          },
        );
      assert.deepEqual(await Promise.all([run(a), run(b)]), [3, 9]);
    },
  );
  await t.test(
    "optimistic revisions serialize two simultaneous publications",
    async () => {
      const p = config();
      p.rewards.dailyBudget = 5;

      const results = await Promise.allSettled([
        call("publish", {
          config: p,
          expectedRevision: revision,
          reason: "Primeiro editor",
        }),
        call("publish", {
          config: p,
          expectedRevision: revision,
          reason: "Segundo editor",
        }),
      ]);
      assert.equal(
        results.filter((row) => row.status === "fulfilled").length,
        1,
      );
      revision = results.find((row) => row.status === "fulfilled").value
        .revision;
    },
  );
  const makeMission = async (label, amount) => {
    const now = Date.now();
    return eventAction.run({
      auth: { uid: root },
      data: {
        action: "create",
        schemaVersion: 2,
        title: label,
        kind: "mission",
        method: "objective",
        startsAt: new Date(now - 86400000).toISOString(),
        endsAt: new Date(now + 7 * 86400000).toISOString(),
        audience: { mode: "selected", memberIds: [member] },
        winnerCount: 1,
        positions: [
          {
            mode: "stats",
            boosts: { pace: amount },
            statDuration: "weekly",
            specialId: null,
          },
        ],
        objective: { metric: "games", target: 1 },
        maxRepeats: 1,
        cadence: "once",
        openNow: true,
      },
    });
  };
  await db.doc("games/maintenance-game").set({
    status: "closed",
    closedAt: Timestamp.fromMillis(Date.now() - 60000),
    scheduledAt: Timestamp.fromMillis(Date.now() - 60000),
    teamA: { starters: [member], bench: [] },
    teamB: { starters: [root], bench: [] },
    score: { teamA: 1, teamB: 0 },
  });
  await db.doc(`initialRatings/${member}`).set({
    uid: member,
    ratings20: {
      pace: 10,
      shooting: 10,
      passing: 10,
      dribbling: 10,
      defending: 10,
      physical: 10,
      goalkeeping: 10,
      stamina: 10,
      vision: 10,
      positioning: 10,
      teamwork: 10,
      composure: 10,
    },
    completed: true,
    createdAt: Timestamp.now(),
  });
  await db.doc("gameSummaries/maintenance-game").set({
    players: {
      [member]: {
        overall: 4.5,
        attack: 4.5,
        passing: 4.5,
        defense: 4.5,
        physical: 4.5,
        attitude: 4.5,
        count: 3,
      },
    },
  });
  await t.test(
    "simulation uses real aggregates and proposals without changing player records",
    async () => {
      const p = config();
      p.progression.gainCap = 0;
      const before = await db.collection("eventRewards").get();
      const result = await call("simulate", { config: p });
      assert.ok(result.players.find((row) => row.uid === member).delta < 0);
      assert.equal(
        (await db.collection("eventRewards").get()).size,
        before.size,
      );
      assert.equal(
        (await db.doc(`initialRatings/${member}`).get()).data().ratings20.pace,
        10,
      );
    },
  );
  let first, second;
  await t.test(
    "server applies a global budget; repeated and concurrent claims cannot pay twice",
    async () => {
      first = await makeMission("Primeiro prémio", 4);
      await Promise.all([
        claimMission.run({
          auth: { uid: member },
          data: { eventId: first.id },
        }),
        claimMission.run({
          auth: { uid: member },
          data: { eventId: first.id },
        }),
      ]);
      second = await makeMission("Segundo prémio", 4);
      const delivered = await claimMission.run({
        auth: { uid: member },
        data: { eventId: second.id },
      });
      assert.equal(delivered.reward.boosts.pace, 1);
      const rewards = await db
        .collection("eventRewards")
        .where("uid", "==", member)
        .get();
      assert.equal(rewards.size, 2);
      assert.equal(
        rewards.docs.reduce(
          (sum, row) => sum + row.data().reward.boosts.pace,
          0,
        ),
        5,
      );
    },
  );
  await t.test(
    "deferred award has no immediate effect and is delivered once when budget becomes available",
    async () => {
      const p = config();
      p.rewards.dailyBudget = 5;
      p.rewards.overflow = "defer";

      await publish(p);
      const third = await makeMission("Prémio adiado", 2);
      const queued = await claimMission.run({
        auth: { uid: member },
        data: { eventId: third.id },
      });
      assert.equal(queued.pending, true);
      const ref = db.doc(`eventRewards/${third.id}_mission_${member}_once`);
      const before = await ref.get();
      assert.equal(before.data().reward.boosts.pace, 0);
      p.rewards.dailyBudget = 10;
      await publish(p);
      await systemHeartbeat.run({});
      const after = await ref.get();
      assert.equal(after.data().pending, false);
      assert.equal(after.data().reward.boosts.pace, 2);
      await systemHeartbeat.run({});
      assert.equal((await ref.get()).data().reward.boosts.pace, 2);
    },
  );
  await t.test(
    "reject mode preserves the unclaimed mission; pause is enforced by the callable",
    async () => {
      const p = config();
      p.rewards.dailyBudget = 1;
      p.rewards.overflow = "reject";
      await publish(p);
      const mission = await makeMission("Sem orçamento", 2);
      await assert.rejects(
        claimMission.run({
          auth: { uid: member },
          data: { eventId: mission.id },
        }),
        /limite/,
      );
      assert.equal(
        (
          await db
            .doc(`eventRewards/${mission.id}_mission_${member}_once`)
            .get()
        ).exists,
        false,
      );
      p.features.claims = false;
      await publish(p);
      await assert.rejects(
        claimMission.run({
          auth: { uid: member },
          data: { eventId: mission.id },
        }),
        /manutenção/,
      );
    },
  );
  await t.test(
    "last full administrator is protected and restricted admins cannot elevate themselves",
    async () => {
      const adminDocs = await db
        .collection("users")
        .where("role", "==", "admin")
        .get();
      for (const doc of adminDocs.docs)
        if (doc.id !== root) await doc.ref.update({ role: "member" });
      await assert.rejects(
        call("permissions", {
          uid: root,
          capabilities: ["audit"],
          reason: "Teste de proteção",
        }),
        /permanecer/,
      );
      await db.doc("users/maintenance-staff").set({
        uid: "maintenance-staff",
        role: "admin",
        disabled: false,
        adminCapabilities: ["access"],
      });
      await assert.rejects(
        call(
          "recovery",
          {
            uid: root,
            newPassword: "ForbiddenRecovery123!",
            reason: "Tentativa de elevar acesso",
          },
          "maintenance-staff",
        ),
        (error) => error.code === "permission-denied",
      );
      await assert.rejects(
        call(
          "permissions",
          {
            uid: "maintenance-staff",
            capabilities: null,
            reason: "Elevação indevida",
          },
          "maintenance-staff",
        ),
        /acesso total/,
      );
      await assert.rejects(
        call(
          "publish",
          {
            config: config(),
            expectedRevision: revision,
            reason: "Sem capacidade",
          },
          "maintenance-staff",
        ),
      );
    },
  );
  await t.test(
    "scheduled policy remains inactive and can be cancelled without changing delivered awards",
    async () => {
      const p = config();
      p.rewards.dailyBudget = 99;
      const future = new Date(Date.now() + 86400000).toISOString();
      const result = await call("publish", {
        config: p,
        expectedRevision: revision,
        reason: "Configuração futura",
        effectiveAt: future,
      });
      revision = result.revision;
      assert.notEqual((await read("config")).config.rewards.dailyBudget, 99);
      await call("cancel-scheduled", {
        expectedRevision: revision,
        reason: "Cancelar a publicação",
      });
      revision++;
      assert.ok(
        (await read("history")).versions.find(
          (row) => row.version === result.revision,
        ).canceledAt,
      );
      assert.equal(
        (
          await db.doc(`eventRewards/${first.id}_mission_${member}_once`).get()
        ).data().reward.boosts.pace,
        4,
      );
    },
  );
  await t.test(
    "diagnostic, export and retention preview operate on real stored data",
    async () => {
      const report = await read("diagnostics");
      assert.ok(report.issues.some((row) => row.id === "maintenance-game"));
      assert.ok(
        (await call("export", { collection: "eventRewards" })).rows.length >= 3,
      );
      assert.equal(
        (await call("retention", { reason: "Verificar dados transitórios" }))
          .preview,
        true,
      );
      await assert.rejects(
        call("restore-backup", {
          backup: "other-project",
          databaseId: "prod",
          reason: "Referência inválida",
        }),
      );
      await assert.rejects(read("backups"), /emulador/);
    },
  );
  await t.test(
    "account recovery updates the real Auth record and rejects stale administrator authentication",
    { skip: !process.env.FIREBASE_AUTH_EMULATOR_HOST },
    async () => {
      await call("recovery", {
        uid: member,
        newPassword: "NewTemporaryPassword123!",
        reason: "Identidade verificada no teste",
      });
      const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
      const response = await fetch(
        `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: `${member}@example.test`,
            password: "NewTemporaryPassword123!",
            returnSecureToken: true,
          }),
        },
      );
      assert.equal(response.status, 200);
      const session = await response.json();
      const token = await getAuth().verifyIdToken(session.idToken);
      await assert.rejects(
        getEvent.run({
          auth: { uid: member, token: { auth_time: 0 } },
          data: { eventId: first.id },
        }),
        (error) => error.code === "unauthenticated",
      );
      await getEvent.run({
        auth: { uid: member, token },
        data: { eventId: first.id },
      });
      await assert.rejects(
        maintenanceAction.run({
          auth: { uid: root, token: { auth_time: 0 } },
          data: {
            action: "recovery",
            uid: member,
            newPassword: "AnotherPassword123!",
            reason: "Autenticação expirada",
          },
        }),
        /iniciar sessão/,
      );
    },
  );
});
