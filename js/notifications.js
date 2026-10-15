import { medal } from "./event-model.js";
import {
  pushSettingsPanel,
  bindPushSettings,
  clearNativeNotifications,
} from "./push.js";
import * as DB from "./db.js";
import { icon } from "./icons.js";
import { esc, empty, linkButton, pageHead, busy, toast } from "./ui.js";
import { formatDate } from "./utils.js";
export async function refreshNotifications(uid, missions) {
  return (await DB.syncNotifications(uid, missions)).sort(
    (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
  );
}
export function notificationItems(items, unreadOnly = true) {
  return (
    items
      .filter((n) => !unreadOnly || !n.read)
      .map(
        (n) =>
          `<div class="notification ${n.read ? "" : "unread"}"><div class="notification-dot"></div><a data-open-notification="${esc(n.id)}" href="${esc(n.href || "#")}"><b>${esc(n.title)}</b><p>${esc(n.body)}</p>${n.podium?.length ? `<div class="notification-podium">${n.podium.map((winner) => `<div><strong>${medal(winner.position)} ${esc(winner.name)}</strong><span>${esc(winner.reward)}</span></div>`).join("")}</div>` : ""}<small>${formatDate(n.createdAt)}</small></a>${n.read ? "" : `<button class="btn btn-icon btn-ghost" data-read="${esc(n.id)}" aria-label="Marcar como lida">${icon("check")}</button>`}</div>`,
      )
      .join("") ||
    empty(
      unreadOnly ? "Sem notificações novas" : "Ainda sem notificações",
      "As novidades da tua liga aparecem aqui.",
      "",
      "bell",
    )
  );
}
export function bindNotifications(ctx, root = document) {
  const dropdown = root.id === "notification-dropdown";
  const refreshView = async () => {
    const hash = location.hash;
    await ctx.refreshNotifications();
    if (location.hash !== hash) return;
    if (location.hash === "#/notifications") notificationsPage(ctx);
    if (dropdown && !document.querySelector("#notification-dropdown"))
      toggleNotifications(ctx);
  };
  root.querySelectorAll("[data-open-notification]").forEach((link) => {
    link.onclick = async (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      const notification = ctx.notifications.find(
        (n) => n.id === link.dataset.openNotification,
      );
      if (!notification) return;
      const hash = location.hash;
      try {
        clearNativeNotifications(ctx.user.uid, [notification.id]).catch(
          () => {},
        );
        await DB.markRead(ctx.user.uid, [{ id: notification.id }]);
        await refreshView();
        if (
          location.hash === hash &&
          notification.href?.startsWith("#/") &&
          notification.href !== "#/notifications"
        )
          ctx.go(notification.href);
      } catch (error) {
        toast(error.message, "error");
      }
    };
  });
  root.querySelectorAll("[data-read]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          clearNativeNotifications(ctx.user.uid, [b.dataset.read]).catch(
            () => {},
          );
          await busy(b, () =>
            DB.markRead(ctx.user.uid, [{ id: b.dataset.read }]),
          );
          await refreshView();
        } catch {}
      }),
  );
  root
    .querySelector("[data-read-all]")
    ?.addEventListener("click", async (e) => {
      try {
        clearNativeNotifications(
          ctx.user.uid,
          ctx.notifications.filter((n) => !n.read).map((n) => n.id),
          0,
        ).catch(() => {});
        await busy(e.currentTarget, () =>
          DB.markRead(
            ctx.user.uid,
            ctx.notifications.filter((n) => !n.read),
          ),
        );
        toast("Notificações marcadas como lidas.");
        await refreshView();
      } catch {}
    });
}
let notificationView = "unread",
  notificationOwner;
export function notificationsPage(ctx) {
  if (notificationOwner !== ctx.user.uid) {
    notificationOwner = ctx.user.uid;
    notificationView = "unread";
  }
  const unread = ctx.notifications.filter((n) => !n.read),
    history = ctx.notifications.filter((n) => n.read);
  ctx.render(
    `${pageHead("A tua liga", "Notificações", "Missões, resultados e evolução da tua carta.", unread.length ? '<button data-read-all class="btn btn-secondary">Marcar todas como lidas</button>' : "")}${pushSettingsPanel()}<div class="notification-view-tabs" role="tablist" aria-label="Estado das notificações"><button type="button" role="tab" data-notification-view="unread" aria-selected="${notificationView === "unread"}" aria-controls="notification-content">Por ler <span>${unread.length}</span></button><button type="button" role="tab" data-notification-view="read" aria-selected="${notificationView === "read"}" aria-controls="notification-content">Histórico <span>${history.length}</span></button></div><div class="panel notification-list" id="notification-content" role="tabpanel">${notificationView === "unread" ? notificationItems(unread) : history.length ? notificationItems(history, false) : empty("Ainda sem notificações lidas", "As novidades que já viste ficam guardadas aqui.", "", "bell")}</div>`,
  );
  bindNotifications(ctx);
  bindPushSettings(document.querySelector("#main"));
  const tabs = [...document.querySelectorAll("[data-notification-view]")];
  tabs.forEach((tab, index) => {
    tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
    const select = () => {
      notificationView = tab.dataset.notificationView;
      notificationsPage(ctx);
      document
        .querySelector(`[data-notification-view="${notificationView}"]`)
        ?.focus();
    };
    tab.onclick = select;
    tab.onkeydown = (event) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next =
          event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
        tabs[next].click();
      }
    };
  });
}
export function toggleNotifications(ctx) {
  let el = document.querySelector("#notification-dropdown");
  if (el) {
    el.remove();
    document.querySelector("#bell")?.setAttribute("aria-expanded", "false");
    return;
  }
  const anchor = document.querySelector(".header-actions");
  anchor.insertAdjacentHTML(
    "beforeend",
    `<div id="notification-dropdown" class="notification-dropdown"><div class="section-head"><h3>Notificações</h3>${linkButton("#/notifications", "Ver todas", "ghost")}</div>${notificationItems(ctx.notifications.filter((n) => !n.read).slice(0, 5))}${ctx.notifications.some((n) => !n.read) ? '<button class="btn btn-secondary" data-read-all>Marcar todas como lidas</button>' : ""}</div>`,
  );
  bindNotifications(ctx, document.querySelector("#notification-dropdown"));
  document.querySelector("#bell")?.setAttribute("aria-expanded", "true");
  document
    .querySelector("#bell")
    ?.setAttribute("aria-controls", "notification-dropdown");
}
function closeDropdown() {
  document.querySelector("#notification-dropdown")?.remove();
  document.querySelector("#bell")?.setAttribute("aria-expanded", "false");
}
document.addEventListener("click", (event) => {
  if (
    !event
      .composedPath()
      .some((node) => ["notification-dropdown", "bell"].includes(node.id))
  )
    closeDropdown();
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    document.querySelector("#notification-dropdown")
  ) {
    closeDropdown();
    document.querySelector("#bell")?.focus();
  }
});
