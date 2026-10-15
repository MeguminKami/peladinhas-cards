import { modal, toast } from "./ui.js";
import { icon } from "./icons.js";

let installPrompt, registration;
let installedThisSession = false;
const standalone = () =>
  matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;
const ios = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const base = new URL("../", import.meta.url);
if (new URL(location.href).searchParams.has("_reconnect")) {
  const clean = new URL(location.href);
  clean.searchParams.delete("_reconnect");
  history.replaceState(history.state, "", clean);
}

const platformIcon = (platform) =>
  platform === "ios"
    ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.9 12.7c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.2 9 .8 1.1 1.7 2.2 2.8 2.1 1.1 0 1.6-.7 3-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.8-2.1.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8ZM14.6 6.5c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1.1 2.9 1.1.1 2.2-.5 2.9-1.3Z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 10h12v8a1 1 0 0 1-1 1h-1v3h-2v-3h-4v3H8v-3H7a1 1 0 0 1-1-1ZM3 10h2v8H3Zm16 0h2v8h-2ZM6 9a6 6 0 0 1 2.2-4.6L6.8 2.5l.8-.6L9 3.9a6 6 0 0 1 6 0l1.4-2 .8.6-1.4 1.9A6 6 0 0 1 18 9Z"/><circle cx="9" cy="6.5" r=".8" fill="var(--bg-app)"/><circle cx="15" cy="6.5" r=".8" fill="var(--bg-app)"/></svg>';

export function installSpotlight() {
  if (standalone() || installedThisSession) return "";
  return `<section class="install-spotlight" aria-labelledby="install-title"><div class="install-campaign-copy"><p class="eyebrow">A TUA LIGA NO TEU TELEMÓVEL</p><h2 id="install-title">Instala já a <em>APP.</em></h2><p>A tua carta e os teus jogos, sempre contigo.</p><div class="install-platforms"><button type="button" data-install-platform="ios" aria-haspopup="dialog">${platformIcon("ios")}<span><small>Para o teu iPhone</small><strong>Instalar no iOS</strong></span>${icon("arrow")}</button><button type="button" data-install-platform="android" aria-haspopup="dialog">${platformIcon("android")}<span><small>Para o teu Android</small><strong>Instalar no Android</strong></span>${icon("arrow")}</button></div><span class="install-campaign-note">Grátis. A tua liga à distância de um toque.</span></div><div class="install-art" aria-hidden="true"><div class="install-orbit orbit-one"></div><div class="install-orbit orbit-two"></div><span class="install-floating floating-card">${icon("profile")}A TUA CARTA</span><span class="install-floating floating-match">${icon("games")}PRÓXIMO JOGO</span><div class="install-phone"><div class="phone-camera"></div><div class="phone-screen"><img class="phone-app-icon" src="${new URL("assets/pwa/icon-192.png", base)}" alt=""><strong>PELADINHAS<small>CARDS</small></strong><div class="phone-mini-card"><img src="${new URL("assets/logo.svg", base)}" alt=""><span>A TUA<br><b>LIGA.</b></span><div class="phone-card-line"></div></div><div class="phone-dock">${icon("home")}${icon("games")}${icon("missions")}${icon("profile")}</div></div></div><span class="install-art-label">DO CAMPO PARA O TEU ECRÃ.</span></div></section>`;
}
export function bindInstallSpotlight(root = document) {
  root.querySelectorAll("[data-install-platform]").forEach((button) => {
    button.onclick = () => installHelp(button.dataset.installPlatform);
  });
  const spotlight = root.querySelector(".install-spotlight");
  const host = spotlight?.parentElement;
  const greeting = host?.querySelector(".dashboard-greeting");
  if (!spotlight || !greeting) return () => {};
  const desktop = matchMedia("(min-width: 801px)");
  const place = () => {
    if (!spotlight.isConnected || !greeting.isConnected) return;
    if (desktop.matches) host.append(spotlight);
    else greeting.after(spotlight);
  };
  place();
  desktop.addEventListener("change", place);
  return () => desktop.removeEventListener("change", place);
}

function installHelp(platform) {
  if (standalone()) {
    modal(
      "Já estás na tua aplicação",
      "<p>As Peladinhas Cards já estão abertas em modo aplicação. A tua liga está a um toque de distância.</p>",
    );
    return;
  }
  const requested = ["ios", "android"].includes(platform) ? platform : null;
  const isIOS = requested ? requested === "ios" : ios();
  const nativeAvailable =
    installPrompt &&
    !isIOS &&
    (!requested || /Android/i.test(navigator.userAgent));
  const close = modal(
    "A tua liga, sempre contigo",
    `<div class="install-intro"><img src="${new URL("assets/pwa/icon-192.png", base)}" alt=""><div><p class="eyebrow">${isIOS ? "NO TEU IPHONE" : requested === "android" ? "NO TEU ANDROID" : "PELADINHAS CARDS"}</p><h3>Um lugar no teu ecrã inicial.</h3><p>Abre a tua liga diretamente, numa janela própria.</p></div></div>${nativeAvailable ? '<button class="btn btn-primary full-width" id="confirm-install">Instalar Peladinhas Cards</button>' : `<ol class="install-steps">${(isIOS ? ["Abre este site no Safari.", "Toca em Partilhar (o quadrado com a seta para cima).", "Escolhe «Adicionar ao ecrã principal», ativa «Abrir como aplicação» se aparecer e confirma em «Adicionar»."] : requested === "android" || /Android/i.test(navigator.userAgent) ? ["Abre este site no Chrome.", "Toca no menu ⋮ junto à barra de endereço.", "Escolhe «Instalar aplicação» ou «Adicionar ao ecrã principal» e confirma."] : ["Abre este site no Chrome ou no Microsoft Edge.", "Procura o ícone de instalação na barra de endereço ou a opção «Instalar» no menu do browser.", "Confirma para abrir as Peladinhas numa janela própria."]).map((step, i) => `<li><span>${i + 1}</span><p>${step}</p></li>`).join("")}</ol>`}<p class="small muted">Precisas de ligação para consultar os dados e guardar alterações. A instalação depende das opções disponíveis no teu browser.</p>`,
  );
  document
    .querySelector("#confirm-install")
    ?.addEventListener("click", async (event) => {
      const prompt = installPrompt;
      if (!prompt) return;
      event.currentTarget.disabled = true;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        installPrompt = null;
        if (choice.outcome === "accepted") {
          close();
          toast("Aplicação adicionada. Vemo-nos em campo!");
        } else installHelp(requested);
      } catch {
        installPrompt = null;
        installHelp(requested);
      }
    });
}

export function mountInstallButton(root) {
  if (standalone() || installedThisSession) return;
  const anchor =
    root.querySelector(".header-actions") || root.querySelector(".navbar");
  if (!anchor || root.querySelector("#install-app")) return;
  const button = document.createElement("button");
  button.id = "install-app";
  button.type = "button";
  button.className = "btn btn-icon btn-ghost install-app";
  button.setAttribute("aria-label", "Instalar aplicação");
  button.setAttribute("aria-haspopup", "dialog");
  button.title = "Instalar aplicação";
  button.innerHTML = icon("install");
  anchor.append(button);
  button.onclick = installHelp;
}

function connectionStatus() {
  let status = document.querySelector("#connection-status");
  if (navigator.onLine) {
    status?.remove();
    return;
  }
  if (!status) {
    status = document.createElement("div");
    status.id = "connection-status";
    status.className = "connection-status";
    status.setAttribute("role", "status");
    status.textContent =
      "Sem ligação. Volta a ligar-te para atualizar a liga e guardar alterações.";
    document.querySelector("#header").after(status);
  }
}
function updateAvailable(worker) {
  if (!worker || document.querySelector("#app-update")) return;
  const notice = document.createElement("aside");
  notice.id = "app-update";
  notice.className = "app-update";
  notice.setAttribute("aria-label", "Atualização da aplicação");
  notice.innerHTML =
    '<div><strong>A tua liga tem novidades.</strong><p>Guarda o que estás a fazer antes de atualizar.</p></div><div class="actions"><button type="button" class="btn btn-primary" data-update>Atualizar</button><button type="button" class="btn btn-ghost" data-later>Mais tarde</button></div>';
  document.body.append(notice);
  notice.querySelector("[data-later]").onclick = () => notice.remove();
  notice.querySelector("[data-update]").onclick = (event) => {
    event.currentTarget.disabled = true;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => location.reload(),
      { once: true },
    );
    worker.postMessage({ type: "ACTIVATE_UPDATE" });
  };
}
window.addEventListener("peladinhas-install", installHelp);
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener("appinstalled", () => {
  installedThisSession = true;
  installPrompt = null;
  document.querySelector("#install-app")?.remove();
  document.querySelector(".install-spotlight")?.remove();
});
window.addEventListener("online", connectionStatus);
window.addEventListener("offline", connectionStatus);
connectionStatus();
if ("serviceWorker" in navigator && window.isSecureContext) {
  navigator.serviceWorker
    .register(new URL("sw.js", base), {
      scope: base.pathname,
      updateViaCache: "none",
    })
    .then((reg) => {
      registration = reg;
      updateAvailable(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          )
            updateAvailable(reg.waiting);
        });
      });
    })
    .catch((error) => console.warn("Instalação offline indisponível", error));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      updateAvailable(registration?.waiting);
      registration?.update().catch(() => {});
    }
  });
}
