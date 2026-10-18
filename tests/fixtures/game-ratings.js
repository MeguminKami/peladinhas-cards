import { gameFeedbackProgress } from "../../js/game-feedback-status.js";
export function gameRatingFixture(state, name, input) {
  if (state.ratingAdminFail)
    throw Error("Não foi possível consultar as avaliações.");
  const game = state.games.find((row) => row.id === input.gameId);
  state.ratingReminders ||= [];
  const users = gameFeedbackProgress(game, state.feedback).map((progress) => {
    const user = state.users.find((row) => row.uid === progress.uid);
    const sent = state.ratingReminders.includes(progress.uid);
    return {
      ...progress,
      name: user.displayName,
      username: user.username,
      disabled: !!user.disabled,
      team: game.teamA.starters.includes(user.uid) ? "A" : "B",
      canRemind: !!progress.pending && !user.disabled && !sent,
      blockedReason: sent ? "Aguarda o intervalo entre lembretes." : null,
    };
  });
  if (name === "ratingSubmissionStatus")
    return { title: game.title, users, status: game.status };
  const results = input.uids.map((uid) => {
    const sent = users.find((user) => user.uid === uid)?.canRemind || false;
    if (sent) state.ratingReminders.push(uid);
    return { uid, sent };
  });
  return { results, sent: results.filter((row) => row.sent).length };
}
