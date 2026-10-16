// Apenas interceptado pelo teste de browser; nunca importado pela aplicação real.
import { ATTRIBUTES } from "../../js/utils.js";
import { cardWeek } from "../../js/card-week.js";
const now = {
  seconds: Math.floor(Date.now() / 1000),
  toDate: () => new Date(),
};
const base = {
  role: "member",
  country: "Portugal",
  countryCode: "PT",
  birthDate: "1998-05-20",
  heightCm: 178,
  weightKg: 76,
  preferredFoot: "right",
  primaryPosition: "ALA",
  secondaryPositions: ["MED"],
  shirtNumber: 10,
  photoURL: "",
  disabled: false,
  profileCompleted: true,
};
const seed = () => ({
  users: [
    {
      ...base,
      uid: "pedro",
      username: "pedro",
      displayName: "Pedro",
      role: "admin",
    },
    { ...base, uid: "joao", username: "joao", displayName: "João" },
  ],
  initialRatings: [
    {
      uid: "pedro",
      ratings20: Object.fromEntries(ATTRIBUTES.map(([k]) => [k, 16])),
      completed: true,
    },
  ],
  communityRatings: [],
  communitySummaries: [],
  gameSummaries: [],
  games: [],
  notifications: [],
  feedback: [],
  history: [],
});
const state = window.__testState || (window.__testState = seed());
export const users = async () => {
  if (window.__fail) throw Error("Firebase indisponível");
  return state.users;
};
export const games = async () => state.games;
export const tickets = async () => state.tickets || [];
export const watchTicket = (id, ticketCallback, messageCallback) => {
  ticketCallback(state.tickets?.find((t) => t.id === id));
  messageCallback(state.ticketMessages || []);
  return () => {};
};
export const initials = async () => state.initialRatings;
export const communitySummaries = async () => state.communitySummaries;
export const gameSummaries = async () => state.gameSummaries;
export const myCommunity = async (uid) =>
  state.communityRatings.filter((r) => r.raterId === uid);
export const myFeedback = async (gid, uid) =>
  state.feedback.filter((r) => r.gameId === gid && r.raterId === uid);
export const history = async () => {
  if (window.__historyGate) await window.__historyGate;
  return state.history;
};
export const notifications = async () => state.notifications;
export const read = async (path) => {
  const [type, id] = path.split("/");
  if (type === "events")
    return path.includes("/votes/")
      ? (state.eventVotes || []).find(
          (v) => v.eventId === id && v.uid === path.split("/")[3],
        ) || null
      : (state.events || []).find((e) => e.id === id) || null;
  return type === "settings"
    ? state.ovrWeights || null
    : type === "initialRatings"
      ? state.initialRatings.find((r) => r.uid === id) || null
      : type === "tickets"
        ? state.tickets?.find((t) => t.id === id) || null
        : type === "communityRatings"
          ? state.communityRatings.find(
              (r) => `${r.raterId}_${r.targetId}` === id,
            ) || null
          : null;
};
export async function saveProfile(uid, data) {
  Object.assign(
    state.users.find((p) => p.uid === uid),
    data,
  );
}
export async function saveInitial(uid, ratings20, submit = true) {
  let r = state.initialRatings.find((r) => r.uid === uid);
  if (!r) {
    r = { uid };
    state.initialRatings.push(r);
  }
  r.ratings20 = ratings20;
  if (!r.completed && submit) r.submittedAt = new Date();
  r.completed = submit || r.completed === true;
}
export async function saveCommunity(raterId, targetId, ratings20, submit) {
  let r = state.communityRatings.find(
    (r) => r.raterId === raterId && r.targetId === targetId,
  );
  if (!r) {
    r = { raterId, targetId };
    state.communityRatings.push(r);
  }
  r.ratings20 = ratings20;
  if (!r.submitted && submit) r.submittedAt = new Date();
  r.submitted = !!submit || r.submitted === true;
}
export async function saveFeedback(gameId, raterId, targetId, ratings, submit) {
  let r = state.feedback.find(
    (r) =>
      r.gameId === gameId && r.raterId === raterId && r.targetId === targetId,
  );
  if (!r) {
    r = { gameId, raterId, targetId };
    state.feedback.push(r);
  }
  r.ratings = ratings;
  if (!r.submitted && submit) r.submittedAt = new Date();
  r.submitted = !!submit || r.submitted === true;
}
export async function saveGame(id, data, actor) {
  if (!id) {
    id = "test-game";
    state.games.push({ ...data, id, creatorId: actor.uid, closedAt: now });
  } else
    Object.assign(
      state.games.find((g) => g.id === id),
      data,
    );
  return id;
}
export async function uploadAvatar(uid, file) {
  return URL.createObjectURL(file);
}
export const markRead = async (uid, items) =>
  state.notifications.forEach((n) => {
    if (items.some((i) => i.id === n.id)) n.read = true;
  });
export const syncNotifications = async (uid, missions) => {
  for (const m of missions)
    if (!state.notifications.some((n) => n.id === m.id))
      state.notifications.push({
        id: m.id,
        title: m.title,
        body: m.description,
        href: m.href,
        read: false,
        createdAt: now,
      });
  return state.notifications;
};
export const callAdmin = async (name, data) => {
  if (name === "saveTheme") {
    state.cardThemes ||= [];
    const existing = state.cardThemes.find((theme) => theme.id === data.id);
    if (data.id && !existing) throw Error("Composição não encontrada.");
    const id = existing?.id || `studio-theme-${state.cardThemes.length}`;
    if (existing) Object.assign(existing, data);
    else state.cardThemes.push({ ...data, id });
    return { data: { id } };
  }
  if (name === "selectWeeklyCard") {
    state.cardSelections ||= [];
    const choice = state.cardSelections.find((row) => row.uid === "pedro");
    if (choice) choice.selectedCardId = data.cardId;
    else
      state.cardSelections.push({ uid: "pedro", selectedCardId: data.cardId });
    state.weeklyCards ||= [];
    const current = state.weeklyCards.find(
      (card) => card.uid === "pedro" && card.weekId === data.weekId,
    );
    if (current) current.selectedCardId = data.cardId;
    else
      state.weeklyCards.push({
        uid: "pedro",
        weekId: data.weekId,
        selectedCardId: data.cardId,
      });
  }
  if (name === "saveOvrWeights") state.ovrWeights = { ...data };
  if (name === "deleteGame") {
    state.games = state.games.filter((g) => g.id !== data.gameId);
    state.feedback = state.feedback.filter((f) => f.gameId !== data.gameId);
    state.gameBalances = (state.gameBalances || []).filter(
      (b) => b.id !== data.gameId,
    );
  }
  if (name === "initializeOvrPresets") {
    const { defaultOvrPresets } = await import("./ovr-presets.js");
    state.ovrPresets = defaultOvrPresets(state.ovrWeights);
  }
  if (name === "saveOvrPreset") {
    const id = `preset-${(state.ovrPresets || []).length}`;
    state.ovrPresets ||= [];
    state.ovrPresets.push({ ...data, id });
    return { data: { id } };
  }
  if (name === "listEvents")
    return {
      data: (state.events || [])
        .filter((event) =>
          data.scope === "all"
            ? event.status !== "draft"
            : data.scope === "history"
              ? ["closed", "cancelled"].includes(event.status)
              : ["open", "scheduled", "review"].includes(event.status),
        )
        .map(publicEvent),
    };
  if (name === "eventAction") {
    state.events ||= [];
    if (data.action === "create") {
      const id = `event-${state.events.length}`;
      state.events.push({
        ...data,
        id,
        status: data.openNow ? "open" : "draft",
        endsAt: data.indefinite ? null : new Date(data.endsAt),
        startsAt: new Date(data.startsAt || Date.now()),
        participantIds:
          data.audience?.mode === "selected"
            ? data.audience.memberIds
            : state.users.filter((u) => !u.disabled).map((u) => u.uid),
        configuration: {
          positions: data.positions,
          participationReward: data.participationReward,
        },
        questions: data.questions?.map((q, i) => ({
          ...q,
          id: `q${i + 1}`,
        })) || [{ id: "ranking", label: data.title }],
        winners: [],
        ranking: [],
      });
      return { data: { id } };
    }
    const event = state.events.find((e) => e.id === data.eventId);
    if (event && data.action === "delete") {
      state.events = state.events.filter((e) => e.id !== data.eventId);
      return { data: { id: event.id, deleted: true } };
    }
    if (event && data.action === "update") {
      const status =
        event.status !== "draft"
          ? event.status
          : data.openNow
            ? "open"
            : "draft";
      Object.assign(event, data, {
        status,
        configuration: {
          positions: data.positions,
          participationReward: data.participationReward,
        },
      });
      return { data: { id: event.id } };
    }

    if (event)
      event.status = { open: "open", close: "closed", cancel: "cancelled" }[
        data.action
      ];
  }
  if (name === "voteEvent") {
    state.eventVotes ||= [];
    state.eventVotes = state.eventVotes.filter(
      (v) => v.eventId !== data.eventId || v.uid !== "pedro",
    );
    state.eventVotes.push({ ...data, uid: "pedro" });
  }

  if (name === "saveWeeklyCardPhoto") {
    state.weeklyCardPhotos ||= [];
    state.weeklyCardPhotos = state.weeklyCardPhotos.filter(
      (p) => p.uid !== data.uid || p.weekId !== data.weekId,
    );
    if (!data.reset)
      state.weeklyCardPhotos.push({
        ...data,
        photoURL: data.imageBase64
          ? "https://example.com/weekly-photo.webp"
          : data.photoURL,
      });
    return {
      data: {
        ok: true,
        photoURL: data.imageBase64
          ? "https://example.com/weekly-photo.webp"
          : data.photoURL || "",
      },
    };
  }
  return { data: { ok: true } };
};
export const list = async (path) =>
  path === "cardCollections"
    ? state.cardCollections || []
    : path === "cardSelections"
      ? state.cardSelections || []
      : path === "weeklyCards"
        ? state.weeklyCards || []
        : path === "events"
          ? state.events || []
          : path === "ovrPresets"
            ? state.ovrPresets || []
            : path === "eventRewards"
              ? state.eventRewards || []
              : path === "cardThemes"
                ? state.cardThemes || []
                : path === "gameBalances"
                  ? state.gameBalances || []
                  : path === "communityRatings"
                    ? state.communityRatings
                    : path.includes("/feedback")
                      ? state.feedback
                      : [];

export const weeklyCardPhotos = (weekId) =>
  (state.weeklyCardPhotos || []).filter((p) => p.weekId === weekId);
export { prepareWeeklyCardPhoto } from "./photo-upload.js";

export const openEvents = async () =>
  (state.events || []).filter((e) => e.status === "open").map(publicEvent);
const publicEvent = (event) => ({
  ...event,
  positions: undefined,
  configuration: undefined,
  questions: (event.questions || []).map(({ reward, ...question }) => question),
  winners: (event.winners || []).map(({ reward, ...winner }) => ({
    ...winner,
    ...(event.status === "closed" && winner.uids.length && reward
      ? { reward }
      : {}),
  })),
});
export const eventDetails = async (id) => {
  const event = (state.events || []).find((event) => event.id === id);
  const value = event ? publicEvent(event) : null;
  if (value && event.schemaVersion === 2)
    value.rewardPreview = event.configuration?.positions || [];
  if (value && state.users.find((u) => u.uid === "pedro")?.role === "admin")
    value.configuration = event.configuration;
  return value;
};

export const previousOvrs = async () => state.previousOvrs || {};
export const previousCards = async () =>
  Object.fromEntries(
    state.users.map((user) => {
      const week = cardWeek(new Date(+cardWeek().opensAt - 1)).weekId;
      const snapshot = state.history?.find(
        (row) => (!row.uid || row.uid === user.uid) && row.weekId === week,
      );
      return [user.uid, snapshot || { ovr: state.previousOvrs?.[user.uid] }];
    }),
  );
