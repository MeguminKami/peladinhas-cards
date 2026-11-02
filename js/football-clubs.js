// Shared validation only: provider credentials and requests stay on the server.
export const CLUB_FALLBACK = "./assets/club-placeholder.svg";
export const validClubId = (id) => typeof id === "string" && /^af-[1-9]\d{0,8}$/.test(id);
export const clubLogo = (id) => validClubId(id)
  ? `https://media.api-sports.io/football/teams/${id.slice(3)}.png` : CLUB_FALLBACK;
export function normalizeClubQuery(value) {
  if (typeof value !== "string" || value.length > 80) return "";
  const query = value.normalize("NFKD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLowerCase();
  return /^[a-z0-9][a-z0-9 .'-]{2,59}$/.test(query) ? query : "";
}
export function providerClub(row) {
  const team = row?.team;
  if (!Number.isSafeInteger(team?.id) || team.id < 1 || team.national !== false) return null;
  const id = `af-${team.id}`;
  if (!validClubId(id) || typeof team.name !== "string" || !team.name.trim() ||
      typeof team.country !== "string" || !team.country.trim()) return null;
  return { id, name: team.name.trim().slice(0, 100), country: team.country.trim().slice(0, 60), logo: clubLogo(id) };
}
export function clubDay(now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
// The first selection is free; subsequent changes are limited to two per Lisbon day.
export function nextClubSelection(previous, state, id, now = Date.now()) {
  if (!validClubId(id)) throw Error("Clube inválido.");
  if (previous?.id === id) return null;
  const day = clubDay(now), count = state?.day === day ? state.count || 0 : 0;
  if (previous && count >= 2) throw Error("Já alteraste o clube duas vezes hoje. Volta amanhã.");
  return { day, count: previous ? count + 1 : 0 };
}
