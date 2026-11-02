import { clubLogo, validClubId, CLUB_FALLBACK } from "./football-clubs.js";
import { esc } from "./ui.js";

export function clubBadge(club, { name = false } = {}) {
  if (!validClubId(club?.id)) return "";
  return `<span class="club-badge" title="${esc(club.name)}"><img src="${clubLogo(club.id)}" alt="${name ? "" : esc(club.name)}" width="32" height="32" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-fallback="${CLUB_FALLBACK}">${name ? `<span>${esc(club.name)}</span>` : ""}</span>`;
}
