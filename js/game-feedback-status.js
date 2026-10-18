import { participants } from "./utils.js";

// The feedback form expects every participant, including the rater themselves.
export function gameFeedbackProgress(game, feedback) {
  const targets = [...new Set(participants(game))];
  const roster = new Set(targets);
  const votes = new Map(targets.map((uid) => [uid, new Map()]));
  for (const row of feedback) {
    if (!roster.has(row.raterId) || !roster.has(row.targetId)) continue;
    const saved = votes.get(row.raterId);
    if (!saved.get(row.targetId)?.submitted) saved.set(row.targetId, row);
  }
  return targets.map((uid) => {
    const own = [...votes.get(uid).values()];
    const submitted = own.filter((row) => row.submitted === true).length;
    return {
      uid,
      total: targets.length,
      submitted,
      pending: targets.length - submitted,
      drafts: own.filter((row) => row.submitted !== true).length,
      status:
        submitted === targets.length
          ? "complete"
          : submitted
            ? "partial"
            : "pending",
    };
  });
}
