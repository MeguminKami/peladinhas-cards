import { login, register } from "./auth.js";
import {
  profileFields,
  readProfile,
  photoField,
  bindPhoto,
} from "./profile.js";
import { card } from "./cards.js";
import { esc, busy, toast, friendlyError } from "./ui.js";
import { icon } from "./icons.js";
import * as DB from "./db.js";
export function authPage(ctx) {
  let mode = "login",
    step = 1,
    draft = {},
    details = {},
    file = null,
    dispose = () => {};
  const draw = () => {
    dispose();
    ctx.render(
      `<div class="auth-layout"><div class="auth-story"><p class="eyebrow">Futebol entre amigos.</p><h1>O teu futebol.<br>A tua <em>carta</em>.<br>A tua liga.</h1><p>Organiza jogos, avalia os teus colegas e acompanha a evolução da tua carta.</p><div class="auth-card">${card({ displayName: "O TEU NOME", ovr: 84, country: "Portugal", countryCode: "PT", primaryPosition: "ALA", stats: { pace: 87, shooting: 82, passing: 85, dribbling: 88, defending: 74, physical: 83, goalkeeping: 43, stamina: 90 }, cardType: "gold-rare", hasCard: true }, { preview: true, size: "md" })}</div><div class="auth-signature">01 / CADA SEMANA É UMA NOVA CARTA</div></div><section class="auth-panel panel"><div class="auth-tabs"><button type="button" data-mode="login" class="${mode === "login" ? "active" : ""}">Entrar</button><button type="button" data-mode="register" class="${mode === "register" ? "active" : ""}">Criar conta</button></div>${mode === "register" ? `<ol class="steps" aria-label="Etapas">${["Conta", "Perfil", "Foto", "Carta"].map((n, i) => `<li class="${step >= i + 1 ? "active" : ""}"><span>${i + 1}</span><small>${n}</small></li>`).join("")}</ol>` : ""}<form id="auth-form">${mode === "login" ? `<p class="eyebrow">Bem-vindo de volta</p><h2>Entra na tua liga.</h2><label>Username<input name="username" required autocomplete="username"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label><button class="btn btn-primary full-width">Entrar ${icon("arrow")}</button>` : step === 1 ? `<h2>A tua conta</h2><label>Username<input name="username" required pattern="[a-zA-Z0-9_.-]{3,20}" maxlength="20" value="${esc(draft.username || "")}" autocomplete="username"></label><p class="small muted">3–20 caracteres. Letras sem acentos, números, _, - ou .</p><label>Password<input name="password" type="password" required minlength="6" autocomplete="new-password"></label><label>Confirmar password<input name="confirmPassword" type="password" required minlength="6" autocomplete="new-password"></label><button class="btn btn-primary full-width">Continuar ${icon("arrow")}</button>` : step === 2 ? `<h2>O teu perfil</h2>${profileFields(details)}<div class="actions"><button type="button" id="back" class="btn btn-secondary">Voltar</button><button class="btn btn-primary">Continuar ${icon("arrow")}</button></div>` : step === 3 ? `<h2>Dá uma cara à tua carta</h2><p class="muted">A fotografia é opcional. Podes adicioná-la mais tarde.</p>${photoField()}<div class="actions"><button type="button" id="back" class="btn btn-secondary">Voltar</button><button class="btn btn-primary">Continuar ${icon("arrow")}</button></div>` : `<h2>Pronto para entrar em campo?</h2><p class="muted">Olá, ${esc(details.displayName)}. Vais começar com uma autoavaliação de 12 atributos. Depois, três colegas ajudam a tornar a tua carta oficial.</p><div class="onboarding-summary"><b>${esc(details.displayName)}</b><span>${esc(details.country)} · ${details.heightCm} cm · ${details.primaryPosition}</span></div><div class="actions"><button type="button" id="back" class="btn btn-secondary">Voltar</button><button class="btn btn-primary">Criar conta e avaliar ${icon("arrow")}</button></div>`}<p id="auth-error" class="error" role="alert"></p></form></section></div>`,
    );
    document.querySelectorAll("[data-mode]").forEach(
      (b) =>
        (b.onclick = () => {
          if (mode === b.dataset.mode) return;
          mode = b.dataset.mode;
          step = 1;
          draw();
        }),
    );
    const form = document.querySelector("#auth-form");
    if (mode === "register" && step === 3) dispose = bindPhoto(form);
    form.querySelector("#back")?.addEventListener("click", () => {
      step--;
      draw();
    });
    form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        if (mode === "login") {
          await busy(e.submitter, () =>
            login(form.username.value, form.password.value),
          );
          return;
        }
        if (step === 1) {
          if (form.password.value !== form.confirmPassword.value)
            throw Error("As passwords não coincidem.");
          draft = {
            username: form.username.value,
            password: form.password.value,
          };
          step = 2;
          draw();
        } else if (step === 2) {
          details = readProfile(form);
          step = 3;
          draw();
        } else if (step === 3) {
          file = form.avatar.files[0] || null;
          step = 4;
          draw();
        } else {
          await busy(e.submitter, async () => {
            const u = await register(draft.username, draft.password, details);
            draft.password = "";
            if (file) {
              try {
                const photoURL = await DB.uploadAvatar(u.uid, file);
                await DB.saveProfile(u.uid, { photoURL });
              } catch (error) {
                toast(
                  "Conta criada. Podes voltar a enviar a fotografia no perfil.",
                  "error",
                );
              }
            }
            toast("Bem-vindo às Peladinhas Cards!");
            ctx.go("#/missions/self");
          });
        }
      } catch (error) {
        const el = document.querySelector("#auth-error");
        if (el) el.textContent = friendlyError(error);
      }
    };
  };
  ctx.cleanup(() => dispose());
  draw();
}
