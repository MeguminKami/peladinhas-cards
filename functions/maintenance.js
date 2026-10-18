import { getFirestore, FieldValue, FieldPath } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getApp } from "firebase-admin/app";
import { applicationDefault } from "firebase-admin/app";
import { HttpsError } from "firebase-functions/v2/https";
import {
  policyCall,
  policySchedule,
  policyDocument,
  inPolicy,
  auditSystem,
  runTracked,
  registeredJobs,
} from "./policy-runtime.js";
import {
  validatePolicy,
  policyAt,
  policyVersion,
  canManage,
  CAPABILITIES,
  rewardBudget,
} from "../js/system-policy.js";
import { calculatePlayerCard } from "../js/player-calculation.js";
import {
  asDate,
  normalizeOvrWeights,
  matchPerformance,
  participants,
  matchOutcome,
  matchGoalMargin,
  matchEvolutionContext,
} from "../js/utils.js";
import { rewardExpiry, votingFlags } from "../js/event-model.js";
import { leaguePeriod } from "../js/card-achievements.js";
import { cardWeek } from "../js/card-week.js";
import { balanceMatches } from "../js/team-balance.js";
const db = () => getFirestore();
const rows = (snapshot) =>
  snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
const invalid = (message) => {
  throw new HttpsError("invalid-argument", message);
};
const identifier = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
function reason(value) {
  if (
    typeof value !== "string" ||
    value.trim().length < 5 ||
    value.length > 300
  )
    invalid("Indica um motivo entre 5 e 300 caracteres.");
  return value.trim();
}
function requireCapability(user, capability) {
  if (!canManage(user, capability))
    throw new HttpsError(
      "permission-denied",
      "Sem permissão para esta operação.",
    );
}
const safeCollections = new Set([
  "users",
  "games",
  "initialRatings",
  "communityRatings",
  "communitySummaries",
  "gameSummaries",
  "gameBalances",
  "weeklyCards",
  "weeklyCardPhotos",
  "eventRewards",
  "events",
  "cardCollections",
  "cardSelections",
  "systemAudit",
  "systemJobs",
  "systemVersions",
]);
const serialize = (value) =>
  JSON.parse(JSON.stringify(value, (_, v) => v?.toDate?.().toISOString() || v));
async function cloudRequest(path, method = "GET", body) {
  if (process.env.FIRESTORE_EMULATOR_HOST)
    throw new HttpsError(
      "failed-precondition",
      "Esta operação requer um projeto cloud e não é executada no emulador.",
    );
  const credential = getApp().options.credential || applicationDefault();
  const { access_token } = await credential.getAccessToken();
  const response = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new HttpsError(
      response.status === 403 ? "permission-denied" : "failed-precondition",
      data.error?.message || "Serviço de cópias de segurança indisponível.",
    );
  return data;
}
export function maintenanceFunctions({
  rebuildPlayer,
  rebuildGame,
  rebuildAll,
}) {
  async function retention(preview, actorId, why) {
    const notifications = await db()
      .collectionGroup("notifications")
      .where("read", "==", true)
      .get();
    const rate = await db().collection("systemRateLimits").get();
    const operations = await db().collection("systemJobs").get();
    const p = policyAt();
    const candidates = [
      ...notifications.docs.filter(
        (doc) =>
          +asDate(doc.data().createdAt) <
          Date.now() - p.security.notificationDays * 86400000,
      ),
      ...rate.docs.filter((doc) => +asDate(doc.data().expiresAt) < Date.now()),
      ...operations.docs.filter(
        (doc) =>
          doc.data().status !== "running" &&
          +asDate(doc.data().finishedAt) <
            Date.now() - p.security.operationDays * 86400000,
      ),
    ];
    if (!preview) {
      for (let i = 0; i < candidates.length; i += 400) {
        const batch = db().batch();
        candidates.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
      await auditSystem(actorId, "retention", {
        count: candidates.length,
        reason: why,
      });
    }
    return { preview, count: candidates.length };
  }
  async function diagnostics() {
    const [users, games, summaries, rewards, cards] = await Promise.all(
      ["users", "games", "gameSummaries", "eventRewards", "weeklyCards"].map(
        (path) => db().collection(path).get().then(rows),
      ),
    );
    const userIds = new Set(users.map((u) => u.id)),
      gameIds = new Set(games.map((g) => g.id));
    const issues = [];
    for (const game of games) {
      if (game.deleting)
        issues.push({
          kind: "deleting-game",
          id: game.id,
          message:
            "Eliminação interrompida; requer revisão na gestão de jogos.",
        });
      if (
        game.status === "closed" &&
        !summaries.some(
          (s) =>
            s.id === game.id &&
            +asDate(s.closedAt || s.scheduledAt) ===
              +asDate(game.closedAt || game.scheduledAt),
        )
      )
        issues.push({
          kind: "aggregate",
          id: game.id,
          message: "Resumo de jogo em falta ou desatualizado.",
          repair: { scope: "game", id: game.id },
        });
      if (participants(game).some((id) => !userIds.has(id)))
        issues.push({
          kind: "orphan-player",
          id: game.id,
          message: "Jogo referencia jogador inexistente.",
        });
    }
    for (const summary of summaries)
      if (!gameIds.has(summary.id))
        issues.push({
          kind: "orphan-summary",
          id: summary.id,
          message: "Resumo sem jogo de origem.",
        });
    for (const reward of rewards)
      if (!userIds.has(reward.uid))
        issues.push({
          kind: "orphan-reward",
          id: reward.id,
          message: "Prémio sem jogador existente.",
        });
    for (const user of users.filter((u) => !u.disabled))
      if (!cards.some((c) => c.uid === user.id))
        issues.push({
          kind: "card",
          id: user.id,
          message: "Sem carta semanal; pode faltar a autoavaliação.",
          repair: { scope: "player", id: user.id },
        });
    const votes = await db().collectionGroup("votes").get();
    const ballots = new Map();
    for (const doc of votes.docs) {
      const eventId = doc.ref.parent.parent.id;
      if (!ballots.has(eventId)) ballots.set(eventId, []);
      ballots.get(eventId).push({ ...doc.data(), id: doc.id });
    }
    for (const [eventId, rows] of ballots)
      for (const flag of votingFlags(rows))
        issues.push({
          kind: "voting-review",
          id: eventId,
          message: flag.message,
          href: `#/admin/events/${eventId}`,
        });
    return {
      checkedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        games: games.length,
        rewards: rewards.length,
      },
      issues,
    };
  }
  async function simulate(config) {
    const proposed = validatePolicy(config);
    const [
      users,
      initials,
      community,
      games,
      summaries,
      rewards,
      weights,
      current,
      balances,
    ] = await Promise.all(
      [
        "users",
        "initialRatings",
        "communitySummaries",
        "games",
        "gameSummaries",
        "eventRewards",
        "settings/ovr",
        "weeklyCards",
        "gameBalances",
      ].map((path) =>
        path.includes("/")
          ? db()
              .doc(path)
              .get()
              .then((s) => s.data())
          : db().collection(path).get().then(rows),
      ),
    );
    const simulations = [];
    const doc = {
      timeline: [
        { version: -1, effectiveAt: "1970-01-01T00:00:00Z", config: proposed },
      ],
    };
    for (const user of users.filter((u) => !u.disabled)) {
      const aggregates = games
        .filter(
          (g) => participants(g).includes(user.id) && g.status === "closed",
        )
        .map((game) => ({
          ...summaries.find((s) => s.id === game.id)?.players?.[user.id],
          ...matchPerformance(user.id, game),
          outcome: matchOutcome(user.id, game),
          goalMargin: matchGoalMargin(user.id, game),
          ...matchEvolutionContext(
            user.id,
            game,
            summaries.find((s) => s.id === game.id)?.players,
            balances.find(
              (row) => row.id === game.id && balanceMatches(game, row),
            ),
          ),
          date: asDate(game.closedAt || game.scheduledAt),
          gameId: game.id,
        }));
      const input = {
        uid: user.id,
        initial: initials.find((r) => r.id === user.id)?.ratings20,
        community: community.find((r) => r.id === user.id),
        games,
        aggregates,
        rewards,
        weights: normalizeOvrWeights(weights),
        position: user.primaryPosition,
        createdAt: user.createdAt,
      };
      const before = calculatePlayerCard(input);
      const after = inPolicy(doc, () => calculatePlayerCard(input));
      const stored = current.find((c) => c.uid === user.id),
        locked = stored?.phase === "closed" || !!stored?.locked;
      simulations.push({
        uid: user.id,
        name: user.displayName || user.username || user.id,
        before: before.ovr,
        after: after.ovr,
        delta: after.ovr - before.ovr,
        stored: stored?.ovr ?? null,
        locked,
      });
    }
    return {
      simulation: true,
      notice:
        "Comparação hipotética com as mesmas regras em todos os jogos. Não altera dados nem cartas fechadas.",
      players: simulations,
    };
  }
  async function saveRevision(request) {
    const input = request.data,
      config = validatePolicy(input.config),
      why = reason(input.reason);
    const at = input.effectiveAt ? new Date(input.effectiveAt) : new Date();
    if (
      !Number.isFinite(+at) ||
      +at < Date.now() - 5000 ||
      +at > Date.now() + 366 * 86400000
    )
      invalid("Data de entrada em vigor inválida.");
    if (config.security.requireAppCheck && !request.app)
      invalid(
        "Valida primeiro o acesso com App Check antes de o tornar obrigatório.",
      );
    if (
      config.security.requireAppCheck &&
      config.security.appCheckSiteKey !== policyAt().security.appCheckSiteKey
    )
      invalid(
        "Guarda e testa primeiro a chave pública, antes de exigir App Check.",
      );
    if (
      config.cycle.openHour !== policyAt().cycle.openHour ||
      config.cycle.closeHour !== policyAt().cycle.closeHour
    ) {
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Lisbon",
          weekday: "short",
          hour: "numeric",
          hourCycle: "h23",
          minute: "2-digit",
        })
          .formatToParts(at)
          .map((p) => [p.type, p.value]),
      );
      if (
        +at <= Date.now() + 60000 ||
        parts.weekday !== "Thu" ||
        +parts.hour !== config.cycle.openHour ||
        +parts.minute !== 0
      )
        invalid(
          "Alterações ao calendário devem entrar numa quinta-feira à nova hora de abertura, com pelo menos um minuto de antecedência.",
        );
    }
    if (
      config.cycle.seasonMonths !== policyAt().cycle.seasonMonths ||
      config.cycle.yearMonths !== policyAt().cycle.yearMonths
    ) {
      if (
        +at <= Date.now() + 60000 ||
        +leaguePeriod(new Date(+at - 1), 2).endsAt !== +at ||
        +leaguePeriod(new Date(+at - 1), 4).endsAt !== +at
      )
        invalid(
          "Altera as épocas apenas na fronteira futura comum dos períodos de coleção atuais.",
        );
    }
    return db().runTransaction(async (tx) => {
      const ref = db().doc("settings/system"),
        snapshot = await tx.get(ref);
      const document = snapshot.data() || { revision: 0, timeline: [] };
      if (input.expectedRevision !== document.revision)
        throw new HttpsError(
          "aborted",
          "A configuração mudou. Atualiza a página antes de guardar.",
        );
      if (
        document.timeline.some((row) => +new Date(row.effectiveAt) > Date.now())
      )
        invalid(
          "Já existe uma alteração agendada. Cancela-a antes de publicar outra.",
        );
      const version = document.revision + 1;
      const previousConfig = policyAt(at, document);
      const patch = Object.fromEntries(
        Object.entries(config)
          .map(([section, fields]) => [
            section,
            Object.fromEntries(
              Object.entries(fields).filter(
                ([key, value]) => value !== previousConfig[section][key],
              ),
            ),
          ])
          .filter(([, fields]) => Object.keys(fields).length),
      );
      const entry = {
        version,
        effectiveAt: at.toISOString(),
        effectiveMillis: +at,
        config,
        patch,
      };
      const timeline = [...(document.timeline || []), entry].map(
        (row, index, all) =>
          index < all.length - 2 && row.patch
            ? Object.fromEntries(
                Object.entries(row).filter(([key]) => key !== "config"),
              )
            : row,
      );
      const next = { schemaVersion: 1, revision: version, timeline };
      if (Buffer.byteLength(JSON.stringify(next)) > 850000)
        throw new HttpsError(
          "resource-exhausted",
          "O histórico atingiu o limite seguro do documento. É necessária uma migração planeada antes de publicar outra versão.",
        );
      tx.set(ref, next);
      tx.delete(db().doc(`systemDrafts/${request.auth.uid}`));
      tx.set(db().doc(`systemVersions/${String(version).padStart(8, "0")}`), {
        ...entry,
        reason: why,
        actorId: request.auth.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(db().collection("systemAudit").doc(), {
        actorId: request.auth.uid,
        action: "publish-policy",
        details: { version, effectiveAt: entry.effectiveAt, reason: why },
        status: "completed",
        createdAt: FieldValue.serverTimestamp(),
      });
      return { revision: version, effectiveAt: entry.effectiveAt };
    });
  }
  const maintenanceRead = policyCall("maintenanceRead", async (request) => {
    const user = request.systemActor;
    if (!Object.keys(CAPABILITIES).some((cap) => canManage(user, cap)))
      throw new HttpsError("permission-denied", "Área administrativa.");
    const section = request.data?.section || "overview";
    requireCapability(
      user,
      section === "access"
        ? "access"
        : section === "history"
          ? "audit"
          : section === "config"
            ? "settings"
            : "operations",
    );
    if (section === "config")
      return serialize({
        document: policyDocument() || { revision: 0, timeline: [] },
        config: policyAt(),
        version: policyVersion(),
        draft:
          (await db().doc(`systemDrafts/${request.auth.uid}`).get()).data() ||
          null,
      });
    if (section === "history")
      return serialize({
        activeVersion: policyVersion(),
        audit: rows(
          await db()
            .collection("systemAudit")
            .orderBy("createdAt", "desc")
            .limit(100)
            .get(),
        ),
        versions: rows(
          await db()
            .collection("systemVersions")
            .orderBy("version", "desc")
            .limit(100)
            .get(),
        ),
      });
    if (section === "access")
      return {
        users: rows(await db().collection("users").get())
          .filter((u) => u.role === "admin")
          .map((u) => ({
            uid: u.id,
            name: u.displayName || u.username || u.id,
            disabled: !!u.disabled,
            adminCapabilities: u.adminCapabilities || null,
          })),
        capabilities: CAPABILITIES,
      };
    if (section === "rewards")
      return serialize({
        rewards: rows(await db().collection("eventRewards").get()),
      });
    if (section === "diagnostics") return diagnostics();
    if (section === "backups") {
      const project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
      const [backups, schedules] = await Promise.all([
        cloudRequest(`projects/${project}/locations/-/backups`),
        cloudRequest(`projects/${project}/databases/(default)/backupSchedules`),
      ]);
      return {
        backups: backups.backups || [],
        schedules: schedules.backupSchedules || [],
      };
    }
    if (section === "backup-operation") {
      const project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
      const operation = request.data.operation;
      if (
        typeof operation !== "string" ||
        !operation.startsWith(`projects/${project}/databases/`) ||
        !/^projects\/[^/]+\/databases\/(\(default\)|[a-z][a-z0-9-]{3,30})\/operations\/[A-Za-z0-9_-]+$/.test(
          operation,
        )
      )
        invalid("Operação de restauro inválida.");
      return cloudRequest(operation);
    }
    const counters = rows(
      await db()
        .collection("systemRateLimits")
        .where("minute", "==", Math.floor(Date.now() / 60000))
        .get(),
    ).filter((row) => row.scope === "total");
    return serialize({
      version: policyVersion(),
      usage: {
        requests: counters.reduce((sum, row) => sum + row.count, 0),
        users: counters.length,
      },
      jobs: rows(await db().collection("systemJobs").get()),
      registered: [...registeredJobs()].map(([id, value]) => ({
        id,
        group: value.group,
        schedule: value.schedule,
      })),
      pending: rows(
        await db()
          .collection("eventRewards")
          .where("pending", "==", true)
          .get(),
      ),
      environment: process.env.FIRESTORE_EMULATOR_HOST ? "emulator" : "cloud",
      configuration: policyAt(),
    });
  });
  const maintenanceAction = policyCall(
    "maintenanceAction",
    { timeoutSeconds: 540 },
    async (request) => {
      const { action } = request.data || {},
        user = request.systemActor;
      requireCapability(
        user,
        ["publish", "draft", "cancel-scheduled", "simulate"].includes(action)
          ? "settings"
          : ["permissions", "recovery", "set-account"].includes(action)
            ? "access"
            : "operations",
      );
      if (policyAt().security.requireAppCheck && !request.app)
        throw new HttpsError(
          "unauthenticated",
          "Verificação da aplicação necessária.",
        );
      if (action === "draft") {
        const config = validatePolicy(request.data.config);
        await db()
          .doc(`systemDrafts/${request.auth.uid}`)
          .set({ config, updatedAt: FieldValue.serverTimestamp() });
        return { ok: true };
      }
      if (action === "publish") return saveRevision(request);
      if (action === "cancel-scheduled") {
        const why = reason(request.data.reason);
        await db().runTransaction(async (tx) => {
          const ref = db().doc("settings/system"),
            doc = (await tx.get(ref)).data();
          if (!doc) invalid("Sem configurações.");
          if (request.data.expectedRevision !== doc.revision)
            throw new HttpsError("aborted", "Atualiza a configuração.");
          const scheduled = doc.timeline.find(
            (row) => +new Date(row.effectiveAt) > Date.now(),
          );
          if (!scheduled) invalid("Não existe uma configuração agendada.");
          tx.set(
            db().doc(
              `systemVersions/${String(scheduled.version).padStart(8, "0")}`,
            ),
            {
              canceledAt: FieldValue.serverTimestamp(),
              canceledBy: request.auth.uid,
              cancelReason: why,
            },
            { merge: true },
          );
          tx.update(ref, {
            revision: doc.revision + 1,
            timeline: doc.timeline.filter(
              (row) => +new Date(row.effectiveAt) <= Date.now(),
            ),
          });
          tx.set(db().collection("systemAudit").doc(), {
            actorId: request.auth.uid,
            action,
            details: { reason: why },
            createdAt: FieldValue.serverTimestamp(),
          });
        });
        return { ok: true };
      }
      if (action === "simulate") return simulate(request.data.config);
      if (action === "diagnose") return diagnostics();
      if (action === "rebuild") {
        const why = reason(request.data.reason),
          { scope, id } = request.data;
        if (
          !["league", "player", "game"].includes(scope) ||
          (scope !== "league" && !identifier(id))
        )
          invalid("Âmbito inválido.");
        const preview = await diagnostics();
        if (!request.data.confirm) {
          const projection = await simulate(policyAt());
          if (scope === "player")
            projection.players = projection.players.filter(
              (row) => row.uid === id,
            );
          if (scope === "game") {
            const game = (await db().doc(`games/${id}`).get()).data();
            const ids = game ? participants(game) : [];
            projection.players = projection.players.filter((row) =>
              ids.includes(row.uid),
            );
          }
          return {
            preview: true,
            scope,
            id: id || null,
            diagnostics: preview,
            projection: {
              ...projection,
              notice:
                "Comparação entre a carta guardada e o recálculo atual. Cartas fechadas permanecem inalteradas.",
              players: projection.players.map((row) => ({
                ...row,
                before: row.stored ?? row.before,
                after: row.locked ? (row.stored ?? row.before) : row.before,
                delta: row.locked ? 0 : row.before - (row.stored ?? row.before),
              })),
            },
          };
        }
        const result = await runTracked("manual-rebuild", () =>
          scope === "league"
            ? rebuildAll()
            : scope === "player"
              ? rebuildPlayer(id)
              : rebuildGame(id),
        );
        await auditSystem(request.auth.uid, action, {
          scope,
          id: id || null,
          reason: why,
        });
        return result;
      }
      if (action === "run-job") {
        reason(request.data.reason);
        const job = registeredJobs().get(request.data.id);
        if (!job) invalid("Automatização desconhecida.");
        const result = await job.run({});
        await auditSystem(request.auth.uid, action, {
          id: request.data.id,
          reason: request.data.reason,
        });
        return result;
      }
      if (action === "export") {
        const { collection, cursor } = request.data;
        if (!safeCollections.has(collection))
          invalid("Coleção não autorizada.");
        if (["systemAudit", "systemVersions"].includes(collection))
          requireCapability(user, "audit");
        if (["communityRatings", "gameSummaries"].includes(collection))
          requireCapability(user, "ratings");
        let query = db()
          .collection(collection)
          .orderBy(FieldPath.documentId())
          .limit(200);
        if (cursor) {
          if (!identifier(cursor)) invalid("Cursor inválido.");
          query = query.startAfter(cursor);
        }
        const values = rows(await query.get());
        await auditSystem(request.auth.uid, action, {
          collection,
          count: values.length,
        });
        return serialize({
          collection,
          rows: values,
          next: values.length === 200 ? values.at(-1).id : null,
        });
      }
      if (action === "permissions") {
        if (Array.isArray(user.adminCapabilities))
          throw new HttpsError(
            "permission-denied",
            "Só um administrador com acesso total pode distribuir capacidades.",
          );
        const why = reason(request.data.reason),
          uid = request.data.uid,
          capabilities = request.data.capabilities;
        if (
          !identifier(uid) ||
          !(
            capabilities === null ||
            (Array.isArray(capabilities) &&
              new Set(capabilities).size === capabilities.length &&
              capabilities.every((cap) => cap in CAPABILITIES))
          )
        )
          invalid("Permissões inválidas.");
        await db().runTransaction(async (tx) => {
          const ref = db().doc(`users/${uid}`),
            [target, admins] = await Promise.all([
              tx.get(ref),
              tx.get(db().collection("users").where("role", "==", "admin")),
            ]);
          if (target.data()?.role !== "admin")
            invalid("Seleciona um administrador.");
          const other = admins.docs.some(
            (doc) =>
              doc.id !== uid &&
              !doc.data().disabled &&
              !Array.isArray(doc.data().adminCapabilities),
          );
          if (capabilities !== null && !other)
            invalid(
              "Deve permanecer pelo menos um administrador com acesso total.",
            );
          tx.update(ref, {
            adminCapabilities: capabilities,
            updatedAt: FieldValue.serverTimestamp(),
          });
          tx.set(db().collection("systemAudit").doc(), {
            actorId: request.auth.uid,
            action,
            details: { uid, capabilities, reason: why },
            createdAt: FieldValue.serverTimestamp(),
          });
        });
        return { ok: true };
      }
      if (action === "set-account") {
        const { uid, role, disabled } = request.data;
        const why = reason(request.data.reason);
        if (
          !identifier(uid) ||
          (role !== undefined && !["member", "dbs", "admin"].includes(role)) ||
          (disabled !== undefined && typeof disabled !== "boolean")
        )
          invalid("Alteração de acesso inválida.");
        await db().runTransaction(async (tx) => {
          const ref = db().doc(`users/${uid}`),
            [target, admins] = await Promise.all([
              tx.get(ref),
              tx.get(db().collection("users").where("role", "==", "admin")),
            ]);
          if (!target.exists) invalid("Jogador inexistente.");
          const previous = target.data();
          if (
            role === "admin" &&
            previous.role !== "admin" &&
            Array.isArray(user.adminCapabilities)
          )
            throw new HttpsError(
              "permission-denied",
              "Só um administrador com acesso total pode promover administradores.",
            );
          if (
            uid === request.auth.uid &&
            ((role && role !== "admin") || disabled)
          )
            invalid("O teu próprio acesso está protegido.");
          if (
            previous.role === "admin" &&
            !Array.isArray(previous.adminCapabilities) &&
            (disabled || (role && role !== "admin")) &&
            !admins.docs.some(
              (doc) =>
                doc.id !== uid &&
                !doc.data().disabled &&
                !Array.isArray(doc.data().adminCapabilities),
            )
          )
            invalid("Deve permanecer um administrador com acesso total.");
          tx.update(ref, {
            ...(role !== undefined ? { role } : {}),
            ...(disabled !== undefined ? { disabled } : {}),
            updatedAt: FieldValue.serverTimestamp(),
          });
          tx.set(db().collection("systemAudit").doc(), {
            actorId: request.auth.uid,
            action,
            details: {
              uid,
              role: role || previous.role,
              disabled: disabled ?? previous.disabled,
              reason: why,
            },
            createdAt: FieldValue.serverTimestamp(),
          });
        });
        if (disabled) await getAuth().revokeRefreshTokens(uid);
        return { ok: true };
      }
      if (action === "recovery") {
        const uid = request.data.uid;
        reason(request.data.reason);
        if (
          !identifier(uid) ||
          typeof request.data.newPassword !== "string" ||
          request.data.newPassword.length < 12 ||
          request.data.newPassword.length > 128
        )
          invalid(
            "Usa uma palavra-passe de 12 a 128 caracteres e um jogador válido.",
          );
        const actor = { uid: request.auth.uid };
        if (Date.now() / 1000 - (request.auth.token?.auth_time || 0) > 300)
          throw new HttpsError(
            "unauthenticated",
            "Volta a iniciar sessão antes de recuperar uma conta.",
          );
        const target = (await db().doc(`users/${uid}`).get()).data();
        if (!target) invalid("Jogador inexistente.");
        if (
          target.role === "admin" &&
          !Array.isArray(target.adminCapabilities) &&
          Array.isArray(user.adminCapabilities)
        )
          throw new HttpsError(
            "permission-denied",
            "Apenas administradores com acesso total podem recuperar esta conta.",
          );
        await getAuth().updateUser(uid, { password: request.data.newPassword });
        await getAuth().revokeRefreshTokens(uid);
        const recovered = await getAuth().getUser(uid);
        await db()
          .doc(`users/${uid}`)
          .update({
            tokensValidAfter: Math.floor(
              +new Date(recovered.tokensValidAfterTime) / 1000,
            ),
            updatedAt: FieldValue.serverTimestamp(),
          });
        await auditSystem(actor.uid, action, {
          uid,
          reason: request.data.reason,
        });
        return { ok: true };
      }
      if (action === "backup-schedule") {
        const why = reason(request.data.reason);
        const days = request.data.retentionDays;
        if (!Number.isInteger(days) || days < 7 || days > 98)
          invalid("Retenção entre 7 e 98 dias.");
        const project =
          getApp().options.projectId || process.env.GCLOUD_PROJECT;
        const path = `projects/${project}/databases/(default)/backupSchedules`;
        const existing = await cloudRequest(path);
        const daily = existing.backupSchedules?.find(
          (row) => row.dailyRecurrence,
        );
        const result = daily
          ? await cloudRequest(`${daily.name}?updateMask=retention`, "PATCH", {
              name: daily.name,
              retention: `${days * 86400}s`,
            })
          : await cloudRequest(path, "POST", {
              retention: `${days * 86400}s`,
              dailyRecurrence: {},
            });
        await auditSystem(request.auth.uid, action, {
          retentionDays: days,
          reason: why,
        });
        return result;
      }
      if (action === "restore-backup") {
        if (Date.now() / 1000 - (request.auth.token?.auth_time || 0) > 300)
          throw new HttpsError(
            "unauthenticated",
            "Volta a iniciar sessão antes de iniciar um restauro.",
          );
        const why = reason(request.data.reason),
          project = getApp().options.projectId || process.env.GCLOUD_PROJECT;
        const { backup, databaseId } = request.data;
        if (
          typeof backup !== "string" ||
          !backup.startsWith(`projects/${project}/locations/`) ||
          !/^projects\/[^/]+\/locations\/[^/]+\/backups\/[^/]+$/.test(backup) ||
          typeof databaseId !== "string" ||
          !/^[a-z][a-z0-9-]{3,30}$/.test(databaseId)
        )
          invalid("Cópia ou nova base de dados inválida.");
        const result = await cloudRequest(
          `projects/${project}/databases:restore`,
          "POST",
          { databaseId, backup },
        );
        await auditSystem(request.auth.uid, action, {
          backup,
          databaseId,
          reason: why,
        });
        return result;
      }
      if (action === "retention") {
        return retention(
          request.data.confirm !== true,
          request.auth.uid,
          reason(request.data.reason),
        );
      }
      invalid("Operação desconhecida.");
    },
  );
  const systemHeartbeat = policySchedule(
    "systemHeartbeat",
    {
      schedule: "every 5 minutes",
      timeZone: "Europe/Lisbon",
      timeoutSeconds: 540,
    },
    async () => {
      // Publishing is time based; consumers select the applicable immutable version.
      const value = policyAt();
      await db().doc("systemStatus/policy").set({
        version: policyVersion(),
        checkedAt: FieldValue.serverTimestamp(),
        mode: value.features.mode,
      });
      if (
        value.features.mode !== "readOnly" &&
        value.features.claims &&
        value.automation.events
      ) {
        const pending = await db()
          .collection("eventRewards")
          .where("pending", "==", true)
          .get();
        for (const candidate of pending.docs) {
          const delivered = await db().runTransaction(async (tx) => {
            const [fresh, ledger] = await Promise.all([
              tx.get(candidate.ref),
              tx.get(
                db()
                  .collection("eventRewards")
                  .where("uid", "==", candidate.data().uid),
              ),
            ]);
            const reward = fresh.data();
            if (!reward?.pending || reward.revokedAt) return false;
            const allocation = rewardBudget(
              reward.configuredReward,
              rows(ledger),
              reward.source || "event",
            );
            if (allocation.reduced) return false;
            const now = new Date(),
              cycle = cardWeek(now),
              start = cycle.phase === "closed" ? cycle.nextOpensAt : now;
            tx.update(candidate.ref, {
              pending: false,
              reward: { ...reward.reward, boosts: allocation.boosts },
              startsAt: start,
              cardStartsAt: now,
              expiresAt: rewardExpiry(start, reward.reward.statDuration),
              deliveredAt: now,
              deliveredPolicyVersion: policyVersion(),
            });
            return true;
          });
          if (delivered) await rebuildPlayer(candidate.data().uid);
        }
      }
    },
  );
  const systemCleanup = policySchedule(
    "systemCleanup",
    {
      schedule: "every 24 hours",
      timeZone: "Europe/Lisbon",
      timeoutSeconds: 540,
    },
    () => retention(false, "system", "Retenção automática configurada"),
  );
  return {
    maintenanceRead,
    maintenanceAction,
    systemHeartbeat,
    systemCleanup,
  };
}
