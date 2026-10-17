// Keep navigation and grouping consistent across missions and the event calendar.
export const ACTIVITY_CATEGORIES = [
  {
    id: "competition",
    title: "Competições",
    description: "Disputa os lugares e acompanha os teus adversários.",
    icon: "trophy",
  },
  {
    id: "vote",
    title: "Votações",
    description: "Escolhe quem merece o destaque da liga.",
    icon: "vote",
  },
  {
    id: "personal",
    title: "Missões pessoais",
    description: "Os teus objetivos, ao teu ritmo.",
    icon: "missions",
  },
  {
    id: "rating",
    title: "Avaliações",
    description: "Avalia o teu futebol e o dos teus colegas.",
    icon: "edit",
  },
  {
    id: "other",
    title: "Outros desafios",
    description: "Novas formas de participar na liga.",
    icon: "games",
  },
];

export function activityCategory(item) {
  if (
    ["GAME_FEEDBACK", "RATE_NEW_PLAYER", "SELF_INITIAL_RATING"].includes(
      item.type,
    )
  )
    return "rating";
  if (
    ["COMPLETE_PROFILE", "OBJECTIVE_MISSION"].includes(item.type) ||
    item.kind === "mission"
  )
    return "personal";
  if (
    item.type === "EVENT_VOTE" ||
    item.method === "vote" ||
    item.kind === "vote" ||
    (!item.schemaVersion && Array.isArray(item.questions))
  )
    return "vote";
  if (
    item.type === "COMPETITION_OBJECTIVE" ||
    item.method === "objective" ||
    ["event", "monthly"].includes(item.kind)
  )
    return "competition";
  return "other";
}

export function groupActivities(items) {
  return ACTIVITY_CATEGORIES.map((category) => ({
    ...category,
    items: items.filter((item) => activityCategory(item) === category.id),
  })).filter((group) => group.items.length);
}
