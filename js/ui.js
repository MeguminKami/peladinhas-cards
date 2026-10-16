import { icon } from "./icons.js";
let toastRenderer;
// Specialized editors can report through the application's owning renderer.
export function setToastRenderer(renderer) {
  toastRenderer = renderer;
}
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function toast(message, type = "success") {
  if (toastRenderer) return toastRenderer(message, type);
  const root = document.querySelector("#toast-region");
  while (root.children.length >= 2) root.firstElementChild.remove();
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.textContent = message;
  root.append(el);
  setTimeout(() => el.remove(), 5000);
}
export function empty(title, description = "", action = "", symbol = "ball") {
  return `<div class="empty-state"><div class="empty-icon">${icon(symbol)}</div><h3>${esc(title)}</h3><p>${esc(description)}</p>${action}</div>`;
}
export const pageHead = (tag, title, description = "", action = "") =>
  `<div class="page-head"><div><p class="eyebrow">${esc(tag)}</p><h1>${esc(title)}</h1>${description ? `<p class="subtitle">${esc(description)}</p>` : ""}</div>${action}</div>`;
export const linkButton = (href, text, type = "primary", symbol = "arrow") =>
  `<a class="btn btn-${type}" href="${esc(href)}">${icon(symbol)}${esc(text)}</a>`;
export function setMain(html) {
  document.querySelector("#main").innerHTML = html;
}
export function skeleton() {
  return `<div role="status"><span class="visually-hidden">A carregar a tua liga…</span><div aria-hidden="true"><div class="skeleton-head skeleton"></div><div class="skeleton-grid">${Array.from({ length: 3 }, () => '<div class="skeleton skeleton-panel"></div>').join("")}</div></div></div>`;
}
export function errorPage(error, retry) {
  setMain(
    empty(
      "Não foi possível carregar",
      "Verifica a ligação à Internet e tenta novamente.",
      '<button id="retry" class="btn btn-primary">Tentar novamente</button>',
      "shield",
    ),
  );
  console.error(error);
  document.querySelector("#retry").onclick = retry;
}
export async function busy(button, work) {
  const old = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
  }
  try {
    return await work();
  } catch (e) {
    toast(friendlyError(e), "error");
    throw e;
  } finally {
    if (button?.isConnected) {
      button.disabled = false;
      button.classList.remove("is-loading");
      button.removeAttribute("aria-busy");
      button.innerHTML = old;
    }
  }
}
export function friendlyError(e) {
  const messages = {
    "auth/invalid-credential": "Username ou password incorretos.",
    "auth/email-already-in-use": "Este username já existe.",
    "auth/weak-password": "Escolhe uma password com pelo menos 6 caracteres.",
    "auth/unauthorized-domain":
      "Não foi possível iniciar sessão neste endereço. Contacta o apoio da liga.",
    "permission-denied": "Não tens permissão para realizar esta ação.",
    "storage/unauthorized":
      "Não foi possível enviar a fotografia. Tenta novamente.",
    "auth/network-request-failed": "Sem ligação. Tenta novamente.",
    unavailable:
      "A ligação à liga está indisponível. Tenta novamente dentro de instantes.",
    "functions/unavailable":
      "Não foi possível contactar a liga. Verifica a ligação e tenta novamente.",
    "functions/deadline-exceeded":
      "A liga demorou a responder. Confirma os dados antes de tentar novamente.",
  };
  return (
    messages[e.code] ||
    e.message ||
    "Não foi possível guardar. Tenta novamente."
  );
}
let activeModalClose;
export function closeModal() {
  activeModalClose?.();
}
export function modal(title, body, onClose = () => {}) {
  closeModal();
  const root = document.querySelector("#modal-root"),
    previous = document.activeElement;
  root.innerHTML = `<div class="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button type="button" class="btn btn-icon btn-ghost close-modal" aria-label="Fechar">${icon("close")}</button><h2>${esc(title)}</h2>${body}</section></div>`;
  const background = [...document.body.children].filter(
    (el) => el !== root && !el.inert,
  );
  background.forEach((el) => {
    el.inert = true;
  });
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    root.innerHTML = "";
    root.onkeydown = null;
    background.forEach((el) => {
      el.inert = false;
    });
    document.body.style.overflow = previousOverflow;
    activeModalClose = null;
    if (previous?.isConnected) previous.focus({ preventScroll: true });
    onClose();
  };
  activeModalClose = close;
  root.querySelector(".close-modal").onclick = close;
  root.querySelector(".backdrop").onclick = (e) => {
    if (e.target === e.currentTarget) close();
  };
  root.onkeydown = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      const items = [
        ...root.querySelectorAll(
          'button,a[href],input,select,textarea,summary,[tabindex="0"]',
        ),
      ].filter(
        (x) =>
          !x.disabled && !x.closest("[hidden]") && x.getClientRects().length,
      );
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault();
        items.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
        e.preventDefault();
        items[0].focus();
      }
    }
  };
  root.querySelector("button").focus();
  return close;
}
export function confirmDialog(text) {
  return new Promise((resolve) => {
    const close = modal(
      "Confirmar ação",
      `<p>${esc(text)}</p><div class="actions"><button id="cancel" class="btn btn-secondary">Cancelar</button><button id="confirm" class="btn btn-danger">Confirmar</button></div>`,
      () => resolve(false),
    );
    const root = document.querySelector("#modal-root");
    root.querySelector("#cancel").onclick = () => {
      close();
      resolve(false);
    };
    root.querySelector("#confirm").onclick = () => {
      resolve(true);
      close();
    };
    root.querySelector(".close-modal").onclick = () => {
      close();
      resolve(false);
    };
    root.querySelector(".backdrop").onclick = (e) => {
      if (e.target === e.currentTarget) {
        close();
        resolve(false);
      }
    };
  });
}
