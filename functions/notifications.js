import { policySchedule, policyWritten, policyCall, auditSystem } from "./policy-runtime.js";
import { nextNotificationDeadline } from "../js/notification-deadline.js";
import { policyAt, isQuietHour, canManage, budgetWindow } from "../js/system-policy.js";
import { gameFeedbackProgress } from "../js/game-feedback-status.js";
import { HttpsError } from "firebase-functions/v2/https";
import { eventEndMillis, missionUnlocked } from "../js/event-model.js";
import { medal, rewardText, hasTemporaryReward } from "../js/event-model.js";
import { createHash } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { asDate, participants } from "../js/utils.js";
import { votersFor, candidatesFor, eventOutcome } from "../js/event-rules.js";
const db = () => getFirestore();
const rows = (snapshot) =>
  snapshot.docs.map((d) => ({ ...d.data(), uid: d.id, id: d.id }));
const dayFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const hourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Lisbon",
  hour: "2-digit",
  hourCycle: "h23",
});
const dateFormat = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "Europe/Lisbon",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
const revision = (g) =>
  hash(
    g
      ? [
          g.status,
          !!g.deleting,
          +asDate(g.scheduledAt),
          g.title,
          g.location || "",
          g.teamA,
          g.teamB,
        ]
      : null,
  );
const details = (g) =>
  `${g.title} · ${dateFormat.format(asDate(g.scheduledAt))} · ${g.location || "Local a definir"}.`;
const lineup = (g, uid) =>
  `${g.teamA?.starters?.includes(uid) || g.teamA?.bench?.includes(uid) ? "Team A" : "Team B"} · ${g.teamA?.bench?.includes(uid) || g.teamB?.bench?.includes(uid) ? "Suplente" : "Titular"}`;
async function league() {
  const [users, games] = await Promise.all([
    db().collection("users").get(),
    db().collection("games").get(),
  ]);
  return { users: rows(users).filter((u) => !u.disabled), games: rows(games) };
}
export function notificationFunctions(notify) {
  function requireRatingAdmin(request) {
    if (!canManage(request.systemActor, "games") && !canManage(request.systemActor, "ratings"))
      throw new HttpsError("permission-denied", "Sem permissão para gerir avaliações de jogos.");
    if (typeof request.data?.gameId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(request.data.gameId))
      throw new HttpsError("invalid-argument", "Jogo inválido.");
  }
  async function feedbackNotice(gid, game, uid, id) {
    if (!policyAt().features.ratings) return {sent:false,reason:"paused"};
    return notify(uid, id, {
      type: "RATING_REQUIRED",
      title: "Faltam avaliações do jogo",
      body: `${game.title}: conclui as avaliações que tens por enviar.`,
      href: `#/game/${gid}/feedback`,
    }, async tx => {
      const [current, user] = await tx.getAll(db().doc(`games/${gid}`), db().doc(`users/${uid}`));
      const votes = await tx.get(db().collection(`games/${gid}/feedback`).where("raterId", "==", uid));
      const value = current.data();
      return value?.status === "closed" && !value.deleting && user.exists && !user.data().disabled &&
        gameFeedbackProgress(value, rows(votes)).some(row => row.uid === uid && row.pending > 0);
    });
  }
  const ratingSubmissionStatus = policyCall("ratingSubmissionStatus", async request => {
    requireRatingAdmin(request);
    const gid = request.data.gameId;
    const game = (await db().doc(`games/${gid}`).get()).data();
    if (!game || game.deleting) throw new HttpsError("not-found", "Jogo indisponível.");
    const ids = [...new Set(participants(game))];
    const [feedback, records] = await Promise.all([
      db().collection(`games/${gid}/feedback`).get(),
      ids.length ? db().getAll(...ids.flatMap(uid => [db().doc(`users/${uid}`), db().doc(`notificationQuotas/${uid}`)])) : [],
    ]);
    const documents = new Map(records.map(doc => [doc.ref.path, doc.data()]));
    const policy = policyAt(), now = Date.now(), day = budgetWindow("day");
    const users = gameFeedbackProgress(game, rows(feedback)).map(progress => {
      const user = documents.get(`users/${progress.uid}`);
      const quota = documents.get(`notificationQuotas/${progress.uid}`);
      const next = +asDate(quota?.lastSent) + policy.notifications.cooldownMinutes * 60000;
      const disabled = !user || !!user.disabled;
      const blockedReason = game.status !== "closed" ? "O jogo ainda não terminou." : disabled ? "Conta inativa." : !progress.pending ? "Todas as avaliações foram enviadas." : policy.features.mode === "readOnly" || !policy.features.ratings ? "As avaliações estão pausadas." : !policy.notifications.enabled ? "As notificações estão pausadas." : isQuietHour(policy.notifications) ? "Horário de silêncio dos lembretes." : quota?.day === day && quota.count >= policy.notifications.maxDaily ? "Limite diário de lembretes atingido." : next > now ? "Aguarda o intervalo entre lembretes." : null;
      return {...progress, name: user?.displayName || user?.username || "Jogador indisponível", username: user?.username || "", disabled,
        team: [...(game.teamA?.starters || []), ...(game.teamA?.bench || [])].includes(progress.uid) ? "A" : "B",
        canRemind: !blockedReason, blockedReason, lastReminderAt: quota?.lastSent?.toDate().toISOString() || null,
        nextReminderAt: next > now ? new Date(next).toISOString() : null};
    });
    return {gameId: gid, title: game.title, status: game.status, users, checkedAt: new Date().toISOString()};
  });
  const sendRatingReminders = policyCall("sendRatingReminders", {timeoutSeconds:120}, async request => {
    requireRatingAdmin(request);
    const {gameId, uids, requestId} = request.data;
    if (!Array.isArray(uids) || !uids.length || uids.length > 100 || new Set(uids).size !== uids.length || uids.some(uid => typeof uid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) || typeof requestId !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(requestId))
      throw new HttpsError("invalid-argument", "Seleciona destinatários válidos.");
    const game = (await db().doc(`games/${gameId}`).get()).data();
    if (!game || game.deleting || game.status !== "closed") throw new HttpsError("failed-precondition", "Só podes lembrar avaliações de jogos finalizados.");
    const roster = new Set(participants(game));
    if (uids.some(uid => !roster.has(uid))) throw new HttpsError("invalid-argument", "Os destinatários têm de ter participado no jogo.");
    const results = [];
    for (const uid of uids) {
      try {
        const outcome = await feedbackNotice(gameId, game, uid, `admin-feedback-${hash([gameId, uid, requestId])}`);
        results.push({uid,...outcome});
      } catch {
        results.push({uid,sent:false,reason:"failed"});
      }
    }
    await auditSystem(request.auth.uid, "rating-reminders", {gameId, results});
    return {results, sent:results.filter(row => row.sent).length};
  });
  async function gameNotice(gid, game, uid, id, value) {
    return notify(uid, id, value, async (tx) => {
      const current = (await tx.get(db().doc(`games/${gid}`))).data();
      const user = (await tx.get(db().doc(`users/${uid}`))).data();
      return user && !user.disabled && revision(current) === revision(game);
    });
  }
  const onGameNotifications = policyWritten(
    "games/{gid}",
    async (event) => {
      const before = event.data.before.data(),
        after = event.data.after.data();
      const gid = event.params.gid;
      const current = (await db().doc(`games/${gid}`).get()).data();
      if (revision(current) !== revision(after)) return; // Ignore deliveries overtaken by a later edit.
      const oldIds =
        before?.status === "open" && !before.deleting
          ? [...new Set(participants(before))]
          : [];
      const newIds =
        after?.status === "open" && !after.deleting
          ? [...new Set(participants(after))]
          : [];
      const key = hash(
        event.id || [
          revision(before),
          revision(after),
          after?.updatedAt || null,
        ],
      );
      for (const uid of oldIds.filter((uid) => !newIds.includes(uid))) {
        if (after?.status === "closed" && !after.deleting) continue;
        await gameNotice(gid, after, uid, `game-withdrawn-${gid}-${key}`, {
          type: "GAME_CANCELLED",
          title:
            after?.status === "open" && !after.deleting
              ? "Convocação alterada"
              : "Jogo cancelado",
          body:
            after?.status === "open" && !after.deleting
              ? `Já não estás convocado para ${before.title}.`
              : `${before.title} deixou de estar aberto.`,
          href: after && !after.deleting ? `#/game/${gid}` : "#/games",
        });
      }
      for (const uid of newIds) {
        const added = !oldIds.includes(uid);
        const changed =
          !added &&
          (before.title !== after.title ||
            before.location !== after.location ||
            +asDate(before.scheduledAt) !== +asDate(after.scheduledAt) ||
            lineup(before, uid) !== lineup(after, uid));
        if (!added && !changed) continue;
        await gameNotice(gid, after, uid, `game-callup-${gid}-${key}`, {
          type: added ? "GAME_CALLUP" : "GAME_UPDATED",
          title: added ? "Estás convocado!" : "A tua convocação foi atualizada",
          body: `${details(after)} ${lineup(after, uid)}.`,
          href: `#/game/${gid}`,
        });
      }
    },
  );
  async function eventNotices(id, event, users, games, now) {
    const completions = event.prerequisites?.missionIds?.length
      ? rows(await db().collection("eventRewards").get())
      : [];
    const send = (uid, key, value) =>
      notify(uid, key, value, async (tx) => {
        const current = (await tx.get(db().doc(`events/${id}`))).data();
        const user = (await tx.get(db().doc(`users/${uid}`))).data();
        if (
          value.type === "EVENT_DEADLINE" &&
          (await tx.get(db().doc(`events/${id}/votes/${uid}`))).exists
        )
          return false;
        return (
          user &&
          !user.disabled &&
          current?.status === event.status &&
          (current.status !== "closed" || current.rewardsApplied !== false) &&
          (current.status !== "open" || eventEndMillis(current) > Date.now())
        );
      });
    const eligible = votersFor(event, users, games).filter(
      (uid) =>
        missionUnlocked(event, uid, completions) &&
        (event.kind === "mission" ||
          (event.schemaVersion === 2 && event.method !== "vote") ||
          (event.schemaVersion === 2 ? [{}] : event.questions || []).some((q) =>
            candidatesFor(event, q, users, games).some(
              (target) => target !== uid || event.allowSelfVote,
            ),
          )),
    );
    const remaining = eventEndMillis(event) - +now;
    if (event.status === "open" && remaining > 0) {
      for (const uid of eligible) {
        await send(uid, `mission-event-${id}`, {
          type: "EVENT_OPEN",
          title: event.title,
          body:
            event.method === "objective"
              ? `Novo desafio: ${event.title}. ${event.indefinite ? "Sem prazo de conclusão." : `Acompanha o progresso até ${dateFormat.format(asDate(event.endsAt))}.`}`
              : event.method === "admin"
                ? "A competição está aberta. Os resultados serão publicados após o encerramento."
                : event.indefinite
                  ? "A votação está aberta. Participa e escolhe quem merece vencer."
                  : `A votação está aberta até ${dateFormat.format(asDate(event.endsAt))}. Escolhe quem merece vencer.`,
          href: `#/event/${id}`,
        });
        if (
          (event.method === "vote" ||
            (event.schemaVersion !== 2 && event.kind !== "mission")) &&
          remaining <= 86400000 &&
          !(await db().doc(`events/${id}/votes/${uid}`).get()).exists
        )
          await send(uid, `event-deadline-${id}`, {
            type: "EVENT_DEADLINE",
            title: "Último dia para votar",
            body: `${event.title}: termina em ${dateFormat.format(asDate(event.endsAt))}. Ainda não votaste.`,
            href: `#/event/${id}`,
          });
      }
    }
    if (["closed", "cancelled"].includes(event.status)) {
      // Publish the result once reward processing has completed.
      if (event.status === "closed" && event.rewardsApplied === false) return;
      const winners = event.winners || [];
      const outcome = eventOutcome(event, users);
      const recipients = new Set(
        [
          ...eligible,
          ...(event.questions || []).flatMap(
            (question) => question.candidateIds || [],
          ),
          event.createdBy,
          ...users.filter((u) => u.role === "admin").map((u) => u.uid),
          ...winners.flatMap((w) => w.uids),
        ].filter(
          (uid) =>
            users.some((u) => u.uid === uid) &&
            (users.find((u) => u.uid === uid)?.role === "admin" ||
              missionUnlocked(event, uid, completions)),
        ),
      );
      for (const uid of recipients)
        await send(
          uid,
          `event-result-${id}${event.rewardsRevoked ? "-revoked" : ""}`,
          {
            type: "EVENT_CLOSED",
            title:
              event.status === "cancelled"
                ? "Evento cancelado"
                : "Votação encerrada",
            body: `${event.title}: ${outcome}`.slice(0, 500),
            ...(event.schemaVersion === 2
              ? {
                  podium: winners.map((winner) => ({
                    position: winner.position,
                    name:
                      users.find((u) => u.uid === winner.uid)?.displayName ||
                      winner.uid,
                    reward: rewardText(winner.reward),
                  })),
                }
              : {}),
            href: `#/event/${id}`,
          },
        );
      if (event.status === "closed" && event.rewardsApplied !== false)
        for (const uid of new Set([
          ...(event.winners || []).flatMap((w) => w.uids),
          ...(event.participationAwards || []).map((w) => w.uid),
        ]))
          if (users.some((u) => u.uid === uid))
            await send(uid, `event-reward-${id}`, {
              type: "EVENT_REWARD",
              title: "A recompensa foi atribuída!",
              body:
                event.schemaVersion === 2
                  ? `${event.title}: ${[
                      ...(event.winners || []),
                      ...(event.participationAwards || []),
                    ]
                      .filter((w) => w.uid === uid)
                      .map(
                        (w) =>
                          `${w.position ? `${medal(w.position)} ${w.position}.º` : "Participação"} — ${rewardText(w.reward)}.${hasTemporaryReward(w.reward) ? ` Validade até ${dateFormat.format(asDate(w.expiresAt))}.` : ""}`,
                      )
                      .join(" ")}`.slice(0, 500)
                  : `${event.title}: recebeste a recompensa na carta da semana da recompensa. Consulta o teu perfil.`,
              href: `#/player/${uid}`,
            });
    }
  }
  const onEventNotifications = policyWritten(
    "events/{eid}",
    async (event) => {
      const current = (
        await db().doc(`events/${event.params.eid}`).get()
      ).data();
      if (!current || current.status === "draft") return;
      const { users, games } = await league();
      await eventNotices(event.params.eid, current, users, games, new Date());
    },
  );
  const scheduledNotifications = policySchedule("scheduledNotifications",
    {
      schedule: "0 * * * *",
      timeZone: "Europe/Lisbon",
      timeoutSeconds: 540,
      retryCount: 3,
    },
    async () => {
      if (!policyAt().notifications.enabled || isQuietHour(policyAt().notifications)) return { ok: true, nextAt: Date.now() + 3600000 };
      const now = new Date(),
        today = dayFormat.format(now);
      const [year, month, dayOfMonth] = today.split("-").map(Number);
      const tomorrow = dayFormat.format(
        new Date(Date.UTC(year, month - 1, dayOfMonth + 1, 12)),
      );
      const { users, games } = await league();
      const active = new Set(users.map((u) => u.uid));
      for (const game of games) {
        if (game.deleting) continue;
        const date = asDate(game.scheduledAt);
        if (game.status === "open" && date && +date > +now) {
          const day = dayFormat.format(date),
            kind =
              day === today ? "today" : day === tomorrow ? "tomorrow" : null;
          // For early games, allow the morning reminder before 09:00.
          if (
            !kind ||
            (Number(hourFormat.format(now)) < 9 &&
              !(
                kind === "today" &&
                Number(hourFormat.format(date)) < 9 &&
                +date - +now <= 2 * 3600000
              ))
          )
            continue;
          for (const uid of new Set(participants(game)))
            if (active.has(uid))
              await gameNotice(
                game.id,
                game,
                uid,
                `game-reminder-${game.id}-${day}-${kind}`,
                {
                  type: "GAME_REMINDER",
                  title:
                    kind === "today" ? "Hoje tens jogo!" : "Amanhã tens jogo!",
                  body: `${details(game)} ${lineup(game, uid)}.`,
                  href: `#/game/${game.id}`,
                },
              );
        }
        const elapsed = +now - +asDate(game.closedAt);
        if (
          game.status === "closed" &&
          elapsed >= policyAt().notifications.feedbackHours * 3600000 &&
          elapsed < (policyAt().notifications.feedbackHours + 48) * 3600000
        ) {
          const progress = gameFeedbackProgress(game, rows(await db().collection(`games/${game.id}/feedback`).get()));
          for (const row of progress.filter(row => active.has(row.uid) && row.pending))
            await feedbackNotice(game.id, game, row.uid, `game-feedback-reminder-${game.id}`);
        }
      }
      const events = rows(
        await db().collection("events").where("status", "==", "open").get(),
      );
      for (const event of events)
        await eventNotices(event.id, event, users, games, now);
      // Recheck the next morning, day boundary or feedback reminder deadline;
      // do not reread every game's feedback in every quiet hour.
      return { ok: true, nextAt: nextNotificationDeadline(games, events, { now: +now, feedbackHours: policyAt().notifications.feedbackHours }) };
    },
  );
  return { onGameNotifications, onEventNotifications, scheduledNotifications, ratingSubmissionStatus, sendRatingReminders };
}
