import * as DB from "./db.js";
import { WEB_PUSH_PUBLIC_KEY } from "./push-config.js";
import { busy, modal, toast } from "./ui.js";
import { icon } from "./icons.js";

const base = new URL("../", import.meta.url),
  storageKey = `peladinhas-push:${base.pathname}`;
let uid = null,
  unsubscribe = () => {},
  snapshotCallback,
  enabled = false,
  epoch = 0,
  identityInitialized = false,
  enabling = false,
  requestedUid = null;
const installed = () =>
  matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;
const ios = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const supported = () =>
  isSecureContext &&
  "Notification" in window &&
  "PushManager" in window &&
  "serviceWorker" in navigator;
const saved = () => {
  try {
    return JSON.parse(localStorage.getItem(storageKey));
  } catch {
    return null;
  }
};
const save = (value) => {
  try {
    if (value) localStorage.setItem(storageKey, JSON.stringify(value));
    else localStorage.removeItem(storageKey);
  } catch {}
};
const keyBytes = () =>
  Uint8Array.from(
    atob(WEB_PUSH_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
async function registration() {
  return "serviceWorker" in navigator
    ? navigator.serviceWorker.getRegistration(base.href)
    : null;
}
async function message(data) {
  const reg = await registration();
  if (!reg?.active) return false;
  return new Promise((resolve) => {
    const channel = new MessageChannel(),
      timer = setTimeout(() => {
        channel.port1.close();
        resolve(false);
      }, 3000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data?.ok === true);
    };
    reg.active.postMessage(data, [channel.port2]);
  });
}
function updatePanels() {
  for (const panel of document.querySelectorAll("[data-push-settings]"))
    drawPanel(panel);
}
function drawPanel(panel) {
  const invitation = panel.dataset.pushContext === "home";
  if (invitation) {
    panel.hidden = !installed() || !uid || enabled;
    if (panel.hidden) {
      panel.innerHTML = "";
      return;
    }
  }
  const available = supported(),
    requiresInstall = ios() && !installed();
  const mobile = ios() || /Android/i.test(navigator.userAgent);
  const blocked = available && Notification.permission === "denied";
  const title = enabled
    ? "Notificações ativadas neste dispositivo."
    : invitation
      ? "Ativa os alertas da tua liga."
      : "A tua liga também nas notificações.";
  const description = enabled
    ? "Convocatórias, lembretes e novidades, mesmo com a app fechada."
    : requiresInstall
      ? "No iPhone, instala a APP e abre-a pelo ecrã inicial para ativar os alertas."
      : !available
        ? "Este browser não permite notificações push. Podes continuar a acompanhar as novidades aqui."
        : blocked
          ? "As notificações estão bloqueadas. Permite-as nas definições deste browser ou da aplicação."
          : invitation
            ? "Jogos e mensagens, mesmo com a app fechada."
            : "Escolhe receber convocatórias, lembretes e novidades na barra de notificações.";
  panel.innerHTML = `<div class="push-settings-symbol">${icon("bell")}</div><div class="push-settings-copy">${invitation ? "" : `<p class="eyebrow">${enabled ? "LIGADO À TUA LIGA" : "NÃO PERDAS A PRÓXIMA PELADINHA"}</p>`}<h2>${title}</h2><p>${description}</p></div><div class="push-settings-actions">${enabled ? '<button type="button" class="btn btn-secondary" data-push-test>Enviar teste</button><button type="button" class="btn btn-ghost" data-push-disable>Desativar neste dispositivo</button>' : `<button type="button" class="btn btn-primary" data-push-enable ${!available && !requiresInstall ? "disabled" : ""}>${requiresInstall ? "Instalar a APP" : blocked ? "Ver como permitir" : mobile ? "Ativar no telemóvel" : "Ativar neste dispositivo"}</button>`}</div>`;
  panel
    .querySelector("[data-push-enable]")
    ?.addEventListener("click", async (event) => {
      if (enabling) return;
      if (requiresInstall) {
        window.dispatchEvent(new Event("peladinhas-install"));
        return;
      }
      if (blocked) {
        modal(
          "Permitir notificações",
          `<p>As notificações estão bloqueadas neste dispositivo.</p>${/Android/i.test(navigator.userAgent) ? "<ol><li>No Chrome, abre as definições do site e permite <strong>Notificações</strong>.</li><li>Nas Definições do Android, confirma que as notificações do Chrome ou da app Peladinhas Cards também estão permitidas.</li><li>Volta à app e toca em <strong>Ativar no telemóvel</strong>.</li></ol>" : "<p>Abre as definições de notificações desta aplicação ou browser, permite os alertas das Peladinhas Cards e volta aqui.</p>"}`,
        );
        return;
      }
      if (!WEB_PUSH_PUBLIC_KEY) {
        toast(
          "As notificações do telemóvel ainda não estão disponíveis.",
          "error",
        );
        return;
      }
      // Keep the permission request in the direct click handler, as required by iOS.
      const permission = Notification.requestPermission();
      requestedUid = uid;
      enabling = true;
      try {
        await busy(event.currentTarget, () => enable(permission));
      } catch {
      } finally {
        enabling = false;
      }
    });
  panel
    .querySelector("[data-push-disable]")
    ?.addEventListener("click", async (event) => {
      try {
        await busy(event.currentTarget, async () => {
          await detachPushForLogout();
          toast("Notificações desativadas neste dispositivo.");
        });
      } catch {}
    });
  panel
    .querySelector("[data-push-test]")
    ?.addEventListener("click", async (event) => {
      try {
        await busy(event.currentTarget, async () => {
          const current = saved();
          if (
            !supported() ||
            Notification.permission !== "granted" ||
            current?.uid !== uid
          ) {
            enabled = false;
            updatePanels();
            throw Error(
              "Ativa as notificações neste dispositivo antes de enviar um teste.",
            );
          }
          const reg = await registration(),
            subscription = await reg?.pushManager?.getSubscription();
          if (
            !subscription ||
            !(await message({ type: "PUSH_OWNER", ...current }))
          ) {
            enabled = false;
            updatePanels();
            throw Error(
              "A ligação às notificações perdeu-se. Volta a ativá-las neste dispositivo.",
            );
          }
          await DB.callAdmin("pushDeviceAction", {
            action: "test",
            deviceId: current.deviceId,
          });
          toast(
            "Teste solicitado. Aguarda o alerta nas notificações deste dispositivo.",
          );
        });
      } catch {}
    });
}
export const pushSettingsPanel = () =>
  '<section class="panel push-settings" data-push-settings aria-label="Notificações no telemóvel"></section>';
export const homePushInvitation = () =>
  installed()
    ? '<section class="panel push-settings push-invitation" data-push-settings data-push-context="home" aria-label="Ativar notificações da liga"></section>'
    : "";
export function bindPushSettings(root = document) {
  root.querySelectorAll("[data-push-settings]").forEach(drawPanel);
}
async function enable(permission) {
  const choice = await permission;
  if (choice !== "granted") {
    updatePanels();
    toast(
      choice === "denied"
        ? "As notificações estão bloqueadas. Consulta como permitir neste dispositivo."
        : "O pedido não foi confirmado. Podes permitir as notificações nas definições do site ou tentar novamente.",
    );
    return;
  }
  const account = uid;
  if (!account) throw Error("Inicia sessão para ativar as notificações.");
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            Error("A aplicação ainda está a preparar-se. Tenta novamente."),
          ),
        15000,
      ),
    ),
  ]);
  let subscription = await reg.pushManager.getSubscription();
  const expected = keyBytes();
  if (
    subscription?.options.applicationServerKey &&
    [...new Uint8Array(subscription.options.applicationServerKey)].join() !==
      [...expected].join()
  ) {
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription)
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: expected,
    });
  if (account !== uid) {
    await subscription.unsubscribe();
    throw Error("A sessão mudou. Volta a ativar as notificações.");
  }
  let result;
  try {
    result = await DB.callAdmin("pushDeviceAction", {
      action: "register",
      subscription: subscription.toJSON(),
      scope: base.href,
      platform: ios()
        ? "ios"
        : /Android/i.test(navigator.userAgent)
          ? "android"
          : "browser",
    });
  } catch (error) {
    await subscription.unsubscribe().catch(() => {});
    save(null);
    throw error;
  }
  if (account !== uid) {
    await subscription.unsubscribe();
    await DB.callAdmin("pushDeviceAction", {
      action: "unregister",
      deviceId: result.data.deviceId,
    }).catch(() => {});
    return;
  }
  const owner = { uid: account, deviceId: result.data.deviceId };
  save(owner);
  if (!(await message({ type: "PUSH_OWNER", ...owner }))) {
    await DB.callAdmin("pushDeviceAction", {
      action: "unregister",
      deviceId: owner.deviceId,
    }).catch(() => {});
    await subscription.unsubscribe();
    save(null);
    throw Error("Não foi possível preparar as notificações. Tenta novamente.");
  }
  if (account !== uid) return;
  enabled = true;
  updatePanels();
  toast("Já podes receber as novidades da liga no telemóvel.");
}
export async function detachPushForLogout() {
  const owner = saved();
  enabled = false;
  requestedUid = null;
  // Detach locally first, even if the network/backend is unavailable.
  await message({ type: "PUSH_DISABLE" }).catch(() => {});
  const reg = await registration().catch(() => null),
    subscription = await reg?.pushManager?.getSubscription().catch(() => null);
  if (subscription) await subscription.unsubscribe().catch(() => {});
  save(null);
  updatePanels();
  if (owner?.uid === uid && owner?.deviceId)
    await DB.callAdmin("pushDeviceAction", {
      action: "unregister",
      deviceId: owner.deviceId,
    }).catch(() => {});
}
export async function clearNativeNotifications(owner, ids, count) {
  return message({
    type: "PUSH_CLEAR_READ",
    uid: owner,
    ids,
    ...(count != null ? { count } : {}),
  });
}
export async function syncPushIdentity(account, onSnapshot) {
  snapshotCallback = onSnapshot;
  if (identityInitialized && uid === account) return;
  identityInitialized = true;
  const generation = ++epoch;
  requestedUid = null;
  unsubscribe();
  unsubscribe = () => {};
  uid = account;
  enabled = false;
  const previous = saved();
  if (previous && previous.uid !== account) await detachPushForLogout();
  if (generation !== epoch) return;
  if (account && typeof DB.watchNotifications === "function") {
    unsubscribe = DB.watchNotifications(
      account,
      (items) => {
        if (generation !== epoch) return;
        clearNativeNotifications(
          account,
          items.filter((n) => n.read).map((n) => n.id),
          items.filter((n) => !n.read).length,
        ).catch(() => {});
        snapshotCallback?.(items);
      },
      () => {},
    );
  }
  const owner = saved();
  if (
    account &&
    owner?.uid === account &&
    supported() &&
    Notification.permission === "granted"
  ) {
    const reg = await registration(),
      subscription = await reg?.pushManager?.getSubscription();
    if (subscription && generation === epoch) {
      const result = await DB.callAdmin("pushDeviceAction", {
        action: "register",
        subscription: subscription.toJSON(),
        scope: base.href,
        platform: ios()
          ? "ios"
          : /Android/i.test(navigator.userAgent)
            ? "android"
            : "browser",
      });
      if (generation === epoch) {
        const current = { uid: account, deviceId: result.data.deviceId };
        save(current);
        const prepared = await message({ type: "PUSH_OWNER", ...current });
        if (generation !== epoch) return;
        enabled = prepared;
      }
    } else save(null);
  }
  if (generation !== epoch) return;
  updatePanels();
  message({ type: "PUSH_FLUSH_READS" }).catch(() => {});
}
navigator.permissions
  ?.query({ name: "notifications" })
  .then((status) => {
    status.addEventListener("change", async () => {
      if (
        status.state === "granted" &&
        requestedUid === uid &&
        uid &&
        !enabled &&
        !enabling
      ) {
        enabling = true;
        try {
          await enable(Promise.resolve("granted"));
        } catch (error) {
          toast(error.message, "error");
        } finally {
          enabling = false;
          updatePanels();
        }
      } else if (status.state !== "granted" && enabled) {
        await detachPushForLogout().catch(() => {});
      } else updatePanels();
    });
  })
  .catch(() => {});
window.addEventListener("online", () =>
  message({ type: "PUSH_FLUSH_READS" }).catch(() => {}),
);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible")
    message({ type: "PUSH_FLUSH_READS" }).catch(() => {});
});
document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    enabled &&
    supported() &&
    Notification.permission !== "granted"
  )
    detachPushForLogout().catch(() => {});
});
navigator.serviceWorker?.addEventListener("message", (event) => {
  if (
    !["PUSH_READ_SYNCED", "PUSH_NOTIFICATION_OPEN"].includes(
      event.data?.type,
    ) ||
    event.data.uid !== uid
  )
    return;
  window.dispatchEvent(
    new CustomEvent("peladinhas-push-read", { detail: event.data }),
  );
});
