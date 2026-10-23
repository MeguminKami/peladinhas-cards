import { participants } from "./utils.js";
import { hasRatingWaiver } from "./rating-quorum.js";

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
    const waived = hasRatingWaiver(game,uid) ? targets.length - submitted : 0;
    return {
      uid,
      total: targets.length,
      submitted,
      pending: targets.length - submitted - waived,
      waived,
      waiverActive: hasRatingWaiver(game,uid),
      drafts: own.filter((row) => row.submitted !== true).length,
      status:
        waived ? "waived" : submitted === targets.length
          ? "complete"
          : submitted
            ? "partial"
            : "pending",
    };
  });
}
