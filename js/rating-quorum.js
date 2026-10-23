import { FEEDBACK, participants, asDate } from "./utils.js";

const millis = value => value ? +asDate(value) : 0;
export function hasRatingWaiver(game, uid, at = Date.now()) {
  return (game.ratingWaivers?.[uid] || []).some(row => millis(row.at) <= +at && (!row.until || millis(row.until) > +at));
}
export const ratingWaiverTimes = game => Object.values(game.ratingWaivers || {}).flat().flatMap(row=>[row.at,row.until]).filter(Boolean).map(millis);

// Quorum credit never enters the averages or the count of real ratings.
export function ratingQuorum(game, votes, uid, eligible = true, at = Date.now()) {
  const roster = [...new Set(participants(game))];
  const submitted = votes.filter(row => row.targetId === uid && row.submitted && roster.includes(row.raterId));
  const missing = roster.filter(rater => hasRatingWaiver(game,rater,at) && !submitted.some(row=>row.raterId === rater)).length;
  return Object.fromEntries(FEEDBACK.map(([key]) => [key,
    key === "goalkeeping" && !eligible ? 0 : submitted.filter(row=>Number.isFinite(row.ratings?.[key])).length + missing,
  ]));
}

export const ratingQuorumCount = (row, key, fallback = row?.count ?? 0) => row?.ratingQuorumCounts?.[key] ?? row?.ratingCounts?.[key] ?? fallback;
