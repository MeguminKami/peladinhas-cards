import { EVENT_LIMITS, medal, rewardText } from "./event-model.js";
import { CARD_POLICY, cardExpiry } from "./card-achievements.js";
import {
  ATTRIBUTES,
  THEMES,
  asDate,
  participants,
  clamp,
  themeName,
} from "./utils.js";
const monthFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
});
export const monthOf = (value) => monthFormatter.format(asDate(value));
export function monthlyCandidates(users, games, month) {
  const closed = games.filter(
    (g) =>
      g.status === "closed" &&
      !g.deleting &&
      monthOf(g.scheduledAt || g.closedAt) === month,
  );
  return closed.length
    ? users
        .filter(
          (u) =>
            !u.disabled && closed.every((g) => participants(g).includes(u.uid)),
        )
        .map((u) => u.uid)
    : [];
}
export function votersFor(event, users, games) {
  const active = users.filter((u) => !u.disabled).map((u) => u.uid);
  if (event.schemaVersion === 2 && Array.isArray(event.participantIds))
    return active.filter((uid) => event.participantIds.includes(uid));
  const scope = event.audience || { mode: "all" };
  const ids =
    scope.mode === "game"
      ? participants(games.find((g) => g.id === scope.gameId) || {})
      : scope.mode === "selected"
        ? scope.memberIds
        : active;
  const eligible =
    event.kind === "monthly"
      ? monthlyCandidates(users, games, event.month)
      : active;
  return active.filter((uid) => ids?.includes(uid) && eligible.includes(uid));
}
export function candidatesFor(event, question, users, games) {
  if (event.automaticCollectionVote)
    return votersFor(event, users, games).filter((uid) =>
      question.candidateIds?.includes(uid),
    );
  // The event's participant list is shared by voters and candidates.
  return votersFor(event, users, games);
}
export function eventOutcome(event, users) {
  if (event.status === "cancelled")
    return event.schemaVersion === 2
      ? "O desafio foi cancelado. As recompensas foram anuladas."
      : "A votação foi cancelada. Não foram atribuídas recompensas.";
  if (event.rewardsApplied === false)
    return "A atribuição das recompensas está a ser concluída.";
  const winners = event.winners || [];
  if (event.schemaVersion === 2)
    return winners.length
      ? winners
          .map(
            (winner) =>
              `${medal(winner.position)} ${winner.position}.º lugar: ${users.find((user) => user.uid === winner.uid)?.displayName || winner.uid} — ${rewardText(winner.reward)}.`,
          )
          .join(" ")
      : event.kind === "mission"
        ? "A missão terminou sem conclusões."
        : event.method === "objective"
          ? "Ninguém atingiu a meta. Não foram atribuídas recompensas."
          : event.method === "vote"
            ? "Não houve votos suficientes para atribuir as recompensas."
            : "Não foram definidos vencedores.";
  if (!winners.some((winner) => winner.uids.length))
    return "A recompensa não foi atribuída a ninguém porque não existiram votos suficientes.";
  return winners
    .map((winner) =>
      winner.uids.length
        ? `${winner.label}: a recompensa foi atribuída a ${winner.uids.map((uid) => users.find((user) => user.uid === uid)?.displayName || uid).join(", ")}.`
        : `${winner.label}: a recompensa não foi atribuída a ninguém porque não existiram votos suficientes.`,
    )
    .join(" ");
}
export function validReward(reward, createdTypes = []) {
  return (
    reward &&
    typeof reward === "object" &&
    !Array.isArray(reward) &&
    reward.boosts &&
    typeof reward.boosts === "object" &&
    !Array.isArray(reward.boosts) &&
    Object.entries(reward.boosts).every(
      ([key, v]) =>
        ATTRIBUTES.some(([k]) => k === key) &&
        Number.isInteger(v) &&
        v >= 0 &&
        v <= 50,
    ) &&
    (!reward.specialId ||
      THEMES.includes(reward.specialId) ||
      createdTypes.some((type) => reward.specialId === `saved:${type.id}`)) &&
    (!!reward.specialId || Object.values(reward.boosts).some((v) => v > 0))
  );
}
export function applyEventRewards(stats, rewards, uid, date = new Date()) {
  const delivered = rewards.filter(
    (r) =>
      r.uid === uid &&
      !r.revokedAt &&
      +asDate(r.createdAt || r.startsAt) <= +date,
  );
  const active = delivered.filter(
    (r) => +asDate(r.startsAt) <= +date && +asDate(r.expiresAt) > +date,
  );
  const permanent = delivered.filter(
    (r) => r.reward.statDuration === "permanent",
  );
  const boosts = Object.fromEntries(
    ATTRIBUTES.map(([key]) => {
      const legacy = active
        .filter((r) => r.schemaVersion !== 2)
        .reduce((sum, r) => sum + (r.reward.boosts?.[key] || 0), 0);
      const weekly = active
        .filter(
          (r) => r.schemaVersion === 2 && r.reward.statDuration !== "permanent",
        )
        .reduce((sum, r) => sum + (r.reward.boosts?.[key] || 0), 0);
      const lifetime = Math.min(
        EVENT_LIMITS.permanentLifetime,
        permanent.reduce((sum, r) => sum + (r.reward.boosts?.[key] || 0), 0),
      );
      return [
        key,
        legacy + Math.min(EVENT_LIMITS.weeklyStat, weekly) + lifetime,
      ];
    }),
  );
  const cardRewards = delivered.filter((r) => {
    const duration =
      CARD_POLICY[r.reward.specialId]?.duration ||
      r.reward.cardDuration ||
      r.reward.statDuration ||
      "weekly";
    const starts = asDate(r.cardStartsAt || r.startsAt || r.createdAt);
    return (
      starts &&
      +starts <= +date &&
      (duration === "permanent" || +cardExpiry(starts, duration) > +date)
    );
  });
  const specials = [
    ...new Set(cardRewards.map((r) => r.reward.specialId).filter(Boolean)),
  ].map((id) => {
    const source = cardRewards
      .filter((r) => r.reward.specialId === id)
      .sort(
        (a, b) =>
          Number(
            (CARD_POLICY[id]?.duration ||
              b.reward.cardDuration ||
              b.reward.statDuration) === "permanent",
          ) -
            Number(
              (CARD_POLICY[id]?.duration ||
                a.reward.cardDuration ||
                a.reward.statDuration) === "permanent",
            ) ||
          +asDate(b.cardStartsAt || b.startsAt || b.createdAt) -
            +asDate(a.cardStartsAt || a.startsAt || a.createdAt),
      )[0];
    const cardTheme = source?.reward.cardTheme;
    const duration =
      CARD_POLICY[id]?.duration ||
      source.reward.cardDuration ||
      source.reward.statDuration ||
      "weekly";
    const earnedAt = asDate(
      source.cardStartsAt || source.startsAt || source.createdAt,
    );
    return {
      id,
      name: cardTheme?.name || themeName(id),
      eventReward: true,
      ...(source.reward.criterion
        ? { criterion: source.reward.criterion }
        : {}),
      eventId: source.eventId || null,
      duration,
      earnedAt: earnedAt.toISOString(),
      expiresAt: cardExpiry(earnedAt, duration)?.toISOString() || null,
      ...(cardTheme ? { cardTheme } : {}),
    };
  });
  return {
    stats: Object.fromEntries(
      ATTRIBUTES.map(([key]) => [
        key,
        clamp((stats[key] || 0) + boosts[key], 0, 99),
      ]),
    ),
    boosts,
    specials,
    active,
  };
}

export function eventDeadline(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw Error("Escolhe uma data e hora válidas.");
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number),
    wall = Date.UTC(year, month - 1, day, hour, minute);
  let utc = wall;
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(utc)).map((p) => [p.type, p.value]),
    );
    const displayed = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
    );
    utc += wall - displayed;
  }
  const final = Object.fromEntries(
    formatter.formatToParts(new Date(utc)).map((p) => [p.type, p.value]),
  );
  if (
    Date.UTC(
      +final.year,
      +final.month - 1,
      +final.day,
      +final.hour,
      +final.minute,
    ) !== wall
  )
    throw Error("Esta hora não existe nesse dia.");
  return new Date(utc).toISOString();
}
