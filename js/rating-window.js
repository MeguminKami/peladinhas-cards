import { asDate } from "./utils.js";

export function ratingEditDeadline(rating, initial = false) {
  if (!rating?.[initial ? "completed" : "submitted"]) return null;
  const submittedAt = asDate(rating.submittedAt || rating.createdAt);
  return new Date(+submittedAt + 7 * 86400000);
}
export function canEditRating(rating, date = new Date(), initial = false) {
  const deadline = ratingEditDeadline(rating, initial);
  return !deadline || +date < +deadline;
}
