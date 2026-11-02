import { esc, friendlyError } from "./ui.js";
import { clubBadge } from "./club-badge.js";
import { normalizeClubQuery, CLUB_FALLBACK } from "./football-clubs.js";
import * as DB from "./db.js";

const searches = new Map();
export function clubPicker(club, { disabled = false } = {}) {
  return `<fieldset class="club-picker field-wide" ${disabled ? "disabled" : ""}><legend>Clube de futebol favorito <span class="muted">opcional</span></legend><input type="hidden" name="favoriteClubId" value="${esc(club?.id || "")}"><div class="club-current">${clubBadge(club, { name: true }) || '<span class="muted">Ainda não escolheste um clube.</span>'}</div>${disabled ? "" : '<label>Pesquisar clube<input type="search" name="clubSearch" autocomplete="off" maxlength="60" placeholder="Ex.: Benfica, Sporting, Porto…" aria-describedby="club-picker-help"></label><small id="club-picker-help">Pesquisa pelo nome e confirma o país nos resultados. Depois da primeira escolha, podes mudar duas vezes por dia (hora de Lisboa).</small><p class="club-search-status small" role="status" aria-live="polite"></p><div class="club-search-results"></div>'}</fieldset>`;
}

export function bindClubPicker(form) {
  const root = form.querySelector(".club-picker"), input = root?.querySelector("[name=clubSearch]");
  if (!input) return () => {};
  const status = root.querySelector(".club-search-status"), results = root.querySelector(".club-search-results");
  let timer, revision = 0, disposed = false;
  const bindFallbacks = () => root.querySelectorAll("img[data-fallback]").forEach(img => {
    img.onerror = () => { img.onerror = null; img.src = CLUB_FALLBACK; };
  });
  bindFallbacks();
  const search = async () => {
    clearTimeout(timer);
    const current = ++revision, query = normalizeClubQuery(input.value);
    results.replaceChildren();
    if (!query) { status.textContent = input.value.trim() ? "Escreve pelo menos 3 caracteres válidos." : ""; return; }
    status.textContent = "A pesquisar clubes…";
    try {
      let entry = searches.get(query);
      if (!entry || entry.expiresAt <= Date.now()) {
        const response = await DB.callAdmin("searchFootballClubs", { query });
        entry = { clubs: response.data.clubs, expiresAt: Date.now() + 3600000 };
        if (searches.size >= 50) searches.delete(searches.keys().next().value);
        searches.set(query, entry);
      }
      if (disposed || revision !== current) return;
      status.textContent = entry.clubs.length ? `${entry.clubs.length} clubes encontrados. Escolhe o teu.` : "Nenhum clube encontrado. Experimenta outro nome.";
      results.innerHTML = entry.clubs.map((club, index) => `<button class="club-result" type="button" data-club-index="${index}">${clubBadge(club)}<span><strong>${esc(club.name)}</strong><small>${esc(club.country)}</small></span></button>`).join("");
      bindFallbacks();
      results.querySelectorAll("[data-club-index]").forEach(button => button.onclick = () => {
        const club = entry.clubs[Number(button.dataset.clubIndex)];
        root.querySelector("[name=favoriteClubId]").value = club.id;
        root.querySelector(".club-current").innerHTML = clubBadge(club, { name: true });
        bindFallbacks();
        results.replaceChildren();
        input.value = "";
        status.textContent = `${club.name} selecionado. Guarda o perfil para confirmar.`;
        input.focus();
      });
    } catch (error) {
      if (!disposed && revision === current) status.textContent = friendlyError(error);
    }
  };
  input.oninput = () => { ++revision; clearTimeout(timer); results.replaceChildren(); status.textContent = ""; timer = setTimeout(search, 500); };
  input.onkeydown = event => { if (event.key === "Enter") { event.preventDefault(); search(); } };
  return () => { disposed = true; ++revision; clearTimeout(timer); };
}
