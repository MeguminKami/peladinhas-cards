import { eventEndMillis, missionUnlocked } from "../js/event-model.js";
import { medal, rewardText, hasTemporaryReward } from "../js/event-model.js";
import { createHash } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
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
  async function gameNotice(gid, game, uid, id, value) {
    return notify(uid, id, value, async (tx) => {
      const current = (await tx.get(db().doc(`games/${gid}`))).data();
      const user = (await tx.get(db().doc(`users/${uid}`))).data();
      return user && !user.disabled && revision(current) === revision(game);
    });
  }
  const onGameNotifications = onDocumentWritten(
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
          event.questions.some((q) =>
            candidatesFor(event, q, users, games).some(
              (target) => target !== uid,
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
          ...event.questions.flatMap((question) => question.candidateIds || []),
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
                          `${w.position ? `${medal(w.position)} ${w.position}.º` : "Participação"} — ${rewardText(w.reward)}.${hasTemporaryReward(w.reward) ? ` Validade semanal até ${dateFormat.format(asDate(w.expiresAt))}.` : ""}`,
                      )
                      .join(" ")}`.slice(0, 500)
                  : `${event.title}: recebeste a recompensa na carta da semana da recompensa. Consulta o teu perfil.`,
              href: `#/player/${uid}`,
            });
    }
  }
  const onEventNotifications = onDocumentWritten(
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
  const scheduledNotifications = onSchedule(
    {
      schedule: "every 15 minutes",
      timeZone: "Europe/Lisbon",
      timeoutSeconds: 540,
      retryCount: 3,
    },
    async () => {
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
          elapsed >= 86400000 &&
          elapsed < 3 * 86400000
        ) {
          const ids = [...new Set(participants(game))],
            votes = rows(
              await db().collection(`games/${game.id}/feedback`).get(),
            );
          for (const uid of ids.filter((uid) => active.has(uid))) {
            const missing = ids.filter(
              (target) =>
                target !== uid &&
                !votes.some(
                  (v) =>
                    v.raterId === uid && v.targetId === target && v.submitted,
                ),
            );
            if (missing.length)
              await gameNotice(
                game.id,
                game,
                uid,
                `game-feedback-reminder-${game.id}`,
                {
                  type: "RATING_REQUIRED",
                  title: "Faltam avaliações do jogo",
                  body: `${game.title}: ainda tens ${missing.length} jogador(es) por avaliar.`,
                  href: `#/game/${game.id}/feedback`,
                },
              );
          }
        }
      }
      const events = rows(
        await db().collection("events").where("status", "==", "open").get(),
      );
      for (const event of events)
        await eventNotices(event.id, event, users, games, now);
    },
  );
  return { onGameNotifications, onEventNotifications, scheduledNotifications };
}
