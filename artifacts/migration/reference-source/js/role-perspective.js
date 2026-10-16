import { esc, toast } from "./ui.js";
import { icon } from "./icons.js";
const roles = { admin: "Admin", dbs: "DBS", member: "Membro" };
const key = (uid) => `peladinhas-perspective:${uid}`;
export function perspectiveUser(profile) {
  if (!profile) return null;
  if (profile.role !== "admin" || profile.disabled) {
    sessionStorage.removeItem(key(profile.uid));
    return { ...profile };
  }
  const role = sessionStorage.getItem(key(profile.uid));
  return { ...profile, role: Object.hasOwn(roles, role) ? role : "admin" };
}
export function perspectiveControl(profile, effectiveRole, compact = false) {
  if (profile?.role !== "admin" || profile.disabled) return "";
  const descriptions = {
    admin: "Gerir a liga",
    dbs: "Gerir jogos abertos",
    member: "Explorar como jogador",
  };
  const symbols = { admin: "shield", dbs: "games", member: "profile" };
  return `<details class="role-perspective ${compact ? "role-perspective-compact" : ""}" data-role-perspective data-role="${esc(effectiveRole)}"><summary aria-label="Mudar perspetiva: ${esc(roles[effectiveRole])}">${icon(symbols[effectiveRole])}<span>${esc(roles[effectiveRole])}</span><svg class="perspective-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary><div class="perspective-dropdown"><p class="perspective-heading">Perspetiva da aplicação</p><div class="perspective-options" role="group" aria-label="Escolher perspetiva">${Object.entries(
    roles,
  )
    .map(
      ([role, name]) =>
        `<button type="button" data-perspective-role="${role}" aria-pressed="${role === effectiveRole}"><span class="perspective-symbol">${icon(symbols[role])}</span><span class="perspective-copy"><strong>${esc(name)}</strong><small>${descriptions[role]}</small></span><span class="perspective-check">${role === effectiveRole ? icon("check") : ""}</span></button>`,
    )
    .join("")}</div></div></details>`;
}

export function bindPerspective(root, ctx) {
  root.querySelectorAll("[data-role-perspective]").forEach((menu) => {
    const controller = new AbortController();
    document.addEventListener(
      "click",
      (event) => {
        if (!menu.contains(event.target)) menu.open = false;
      },
      { signal: controller.signal },
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && menu.open) {
          menu.open = false;
          menu.querySelector("summary").focus();
        }
      },
      { signal: controller.signal },
    );
    ctx.cleanup(() => controller.abort());
    menu.querySelectorAll("[data-perspective-role]").forEach((button) => {
      button.onclick = async () => {
        const profile = ctx.realUser,
          role = button.dataset.perspectiveRole;
        if (
          profile?.role !== "admin" ||
          profile.disabled ||
          !Object.hasOwn(roles, role)
        )
          return;
        if (role === ctx.user.role) {
          menu.open = false;
          return;
        }
        const buttons = menu.querySelectorAll("button");
        buttons.forEach((item) => {
          item.disabled = true;
        });
        menu.setAttribute("aria-busy", "true");
        try {
          // Flush pending ratings before the explicitly requested page reload.
          for (const dispose of ctx.disposers.splice(0)) await dispose();
          if (role === "admin") sessionStorage.removeItem(key(profile.uid));
          else sessionStorage.setItem(key(profile.uid), role);
          location.reload();
        } catch (error) {
          buttons.forEach((item) => {
            item.disabled = false;
          });
          menu.removeAttribute("aria-busy");
          toast(error.message, "error");
        }
      };
    });
  });
}
