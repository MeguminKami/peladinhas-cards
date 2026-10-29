import * as DB from "./db.js";
import { WEB_PUSH_PUBLIC_KEY } from "./push-config.js";
import { busy, modal, toast } from "./ui.js";
import { icon } from "./icons.js";
import { flushNotificationReads } from "./notification-read-queue.js";

const base = new URL("../", import.meta.url),
  storageKey = `peladinhas-push:${base.pathname}`;
let uid = null,
  unsubscribe = () => {},
  snapshotCallback,
  enabled = false,
  epoch = 0,
  deviceEpoch = 0,
  identityInitialized = false,
  enabling = false,
  requestedUid = null,
  monitor,
  registrationPending = false,
  pendingSync = false,
  syncCursor = null,
  connectionError = false,
  recoveryFlight,
  panelState = "";
let homePromptClose = null;
let resumeNotifications = () => {};
const homePromptSeen = new Set();
export const PUSH_RECHECK_MS = 10000;
const callDevice = (data) =>
  DB.callAdmin("pushDeviceAction", data, { timeout: 10000 });
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
  const next = JSON.stringify([
    uid,
    enabled,
    enabling,
    navigator.onLine,
    supported() ? Notification.permission : "unsupported",
    installed(),
    connectionError,
    pendingSync,
  ]);
  if (next === panelState) return;
  panelState = next;
  for (const panel of document.querySelectorAll("[data-push-settings]"))
    drawPanel(panel);
  if (
    homePromptClose &&
    (enabled ||
      !uid ||
      document.querySelector(".push-campaign")?.dataset.pushOwner !== uid)
  )
    homePromptClose();
  maybeShowHomePushPrompt();
}
function drawPanel(panel) {
  const invitation = ["home", "popup"].includes(panel.dataset.pushContext);
  if (invitation) {
    panel.hidden =
      (!installed() && !matchMedia("(max-width: 600px)").matches) ||
      !uid ||
      enabled;
    if (panel.hidden) {
      panel.innerHTML = "";
      return;
    }
  }
  const available = supported(),
    requiresInstall = ios() && !installed();
  const mobile = ios() || /Android/i.test(navigator.userAgent);
  const blocked = available && Notification.permission === "denied";
  const online = navigator.onLine !== false;
  const permissionLabel = !available
    ? "Indisponível"
    : Notification.permission === "granted"
      ? "Permitida"
      : blocked
        ? "Bloqueada"
        : "Por pedir";
  const stateLabel = requiresInstall
    ? "Instalação necessária"
    : !available
      ? "Não suportadas"
      : blocked
        ? "Bloqueadas"
        : !online
          ? "Sem ligação"
          : connectionError
            ? "A recuperar ligação"
            : enabled
              ? "Ativas"
              : "Por ativar";
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
  panel.dataset.pushState = enabled ? "enabled" : "disabled";
  panel.innerHTML = `<div class="push-settings-symbol">${icon("bell")}</div><div class="push-settings-copy">${invitation ? "" : '<p class="eyebrow">NESTE DISPOSITIVO</p>'}<h2>${invitation ? title : "Alertas na barra de notificações"}</h2><p>${!invitation && !online ? "As entregas e as leituras pendentes retomam quando a ligação voltar." : !invitation && connectionError ? "A ligação ao serviço será tentada novamente. Também podes verificar agora." : description}</p>${invitation ? "" : `<span class="push-state" role="status">${enabled && online && !connectionError ? icon("check") : icon("bell")}${stateLabel}</span>`}</div><div class="push-settings-actions">${enabled ? `<button type="button" class="btn btn-secondary" data-push-test ${online && !enabling ? "" : "disabled"}>Enviar teste</button><button type="button" class="btn btn-ghost" data-push-disable>Desativar neste dispositivo</button>` : `<button type="button" class="btn btn-primary" data-push-enable ${!available && !requiresInstall ? "disabled" : ""}>${requiresInstall ? "Instalar a APP" : blocked ? "Ver como permitir" : mobile ? "Ativar no telemóvel" : "Ativar neste dispositivo"}</button>`}${!invitation && available && !blocked && saved()?.uid === uid ? `<button type="button" class="btn btn-ghost" data-push-retry ${online ? "" : "disabled"}>Verificar ligação</button>` : ""}</div>${invitation ? "" : `<dl class="push-device-facts"><div><dt>Permissão</dt><dd>${permissionLabel}</dd></div><div><dt>Alertas do dispositivo</dt><dd>${enabled ? "Ativados" : "Por ativar"}</dd></div><div><dt>Internet</dt><dd>${online ? "Ligada" : "Desligada"}</dd></div></dl><div class="push-delivery-info"><div>${icon("bell")}<p><strong>Com a app fechada</strong><span>Os alertas são apresentados pelo sistema. Permite as notificações da app ou do navegador nas definições do dispositivo.</span></p></div><div>${icon("games")}<p><strong>Sem Internet</strong><span>O serviço push pode guardar entregas até 7 dias. Assim que houver ligação, volta a tentar entregá-las; o histórico da liga mantém as mensagens.</span></p></div>${ios() ? `<div>${icon("install")}<p><strong>iPhone e iPad</strong><span>Instala no ecrã inicial, abre a app instalada e permite as notificações. Requer iOS/iPadOS 16.4 ou posterior.</span></p></div>` : `<div>${icon("shield")}<p><strong>Permissões do sistema</strong><span>O modo Não incomodar, a poupança de bateria e o bloqueio do navegador podem atrasar ou silenciar alertas.</span></p></div>`}</div>`}`;
  panel
    .querySelector("[data-push-retry]")
    ?.addEventListener("click", async (event) => {
      registrationPending = true;
      pendingSync = true;
      syncCursor = null;
      await busy(event.currentTarget, () => recoverPushConnection());
      toast(
        connectionError
          ? "Não foi possível verificar a ligação. Vamos tentar novamente."
          : "Ligação às notificações verificada.",
        connectionError ? "error" : "success",
      );
    });
  panel
    .querySelector("[data-push-enable]")
    ?.addEventListener("click", async (event) => {
      if (enabling) return;
      if (navigator.onLine === false && !requiresInstall && !blocked) {
        toast(
          "Liga-te à Internet para ativar as notificações neste dispositivo.",
          "error",
        );
        return;
      }
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
        updatePanels();
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
          if (navigator.onLine === false)
            throw Error(
              "Liga-te à Internet para enviar uma notificação de teste.",
            );
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
          await callDevice({
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
  '<section class="panel push-settings" data-push-settings aria-label="Notificações neste dispositivo"></section>';
export const homePushInvitation = () =>
  installed() ||
  (matchMedia("(max-width: 600px)").matches && (supported() || ios()))
    ? '<section class="panel push-settings push-invitation" data-push-settings data-push-context="home" aria-label="Ativar notificações da liga"></section>'
    : "";
export function bindPushSettings(root = document) {
  root.querySelectorAll("[data-push-settings]").forEach(drawPanel);
  maybeShowHomePushPrompt();
}
function maybeShowHomePushPrompt() {
  if (
    !uid ||
    enabled ||
    enabling ||
    homePromptClose ||
    homePromptSeen.has(uid) ||
    !matchMedia("(max-width: 600px)").matches ||
    (!supported() && !ios()) ||
    !document.querySelector('[data-push-context="home"]') ||
    !document.querySelector(".dashboard-greeting") ||
    document.querySelector('#modal-root [role="dialog"]')
  )
    return;
  const owner = uid;
  const reminderKey = `peladinhas-push-invite:${base.pathname}:${owner}`;
  try {
    if (Number(localStorage.getItem(reminderKey)) > Date.now()) return;
  } catch {}
  homePromptSeen.add(owner);
  homePromptClose = modal(
    "A tua liga chama por ti.",
    `<div class="push-campaign-art" aria-hidden="true"><span class="push-campaign-bell">${icon("bell")}<i>1</i></span><div class="push-campaign-notice"><small>HOJE HÁ JOGO</small><strong>Estás convocado!</strong></div><span class="push-campaign-ticket">${icon("rewardCard")} NOVA CARTA</span></div><section class="push-settings push-invitation push-campaign-settings" data-push-settings data-push-context="popup"></section><ul class="push-campaign-benefits"><li>${icon("games")}Jogos e convocatórias a tempo.</li><li>${icon("rewardCard")}Novas cartas e recompensas.</li><li>${icon("ratingStreak")}Lembretes para avaliares a tua equipa.</li></ul><button type="button" class="btn btn-ghost push-campaign-later" data-push-later>Agora não</button><p class="push-campaign-footnote">Tu escolhes. Podes desativar quando quiseres.</p>`,
    () => {
      homePromptClose = null;
      try {
        localStorage.setItem(reminderKey, String(Date.now() + 7 * 86400000));
      } catch {}
    },
  );
  const dialog = document.querySelector('#modal-root [role="dialog"]');
  dialog.classList.add("push-campaign");
  dialog.dataset.pushOwner = owner;
  drawPanel(dialog.querySelector('[data-push-context="popup"]'));
  dialog.querySelector("[data-push-later]").onclick = () => homePromptClose?.();
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
  const account = uid,
    deviceGeneration = deviceEpoch;
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
  if (account !== uid || deviceGeneration !== deviceEpoch) {
    await subscription.unsubscribe();
    throw Error("A sessão mudou. Volta a ativar as notificações.");
  }
  let result;
  try {
    result = await callDevice({
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
  if (account !== uid || deviceGeneration !== deviceEpoch) {
    await subscription.unsubscribe();
    await callDevice({
      action: "unregister",
      deviceId: result.data.deviceId,
    }).catch(() => {});
    return;
  }
  const owner = { uid: account, deviceId: result.data.deviceId };
  save(owner);
  if (!(await message({ type: "PUSH_OWNER", ...owner }))) {
    await callDevice({
      action: "unregister",
      deviceId: owner.deviceId,
    }).catch(() => {});
    await subscription.unsubscribe();
    save(null);
    throw Error("Não foi possível preparar as notificações. Tenta novamente.");
  }
  if (account !== uid || deviceGeneration !== deviceEpoch) return;
  enabled = true;
  registrationPending = false;
  pendingSync = true;
  syncCursor = null;
  connectionError = false;
  updatePanels();
  toast("Já podes receber as novidades da liga no telemóvel.");
  await recoverPushConnection();
}
export async function detachPushForLogout() {
  ++deviceEpoch;
  const owner = saved();
  enabled = false;
  registrationPending = false;
  pendingSync = false;
  syncCursor = null;
  connectionError = false;
  requestedUid = null;
  // Detach locally first, even if the network/backend is unavailable.
  await message({ type: "PUSH_DISABLE" }).catch(() => {});
  const reg = await registration().catch(() => null),
    subscription = await reg?.pushManager?.getSubscription().catch(() => null);
  if (subscription) await subscription.unsubscribe().catch(() => {});
  save(null);
  updatePanels();
  if (owner?.uid === uid && owner?.deviceId)
    await callDevice({
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
  resumeNotifications = () => {};
  uid = account;
  enabled = false;
  registrationPending = true;
  pendingSync = true;
  syncCursor = null;
  connectionError = false;
  clearInterval(monitor);
  monitor = null;
  const previous = saved();
  if (previous && previous.uid !== account) await detachPushForLogout();
  if (generation !== epoch) return;
  if (account && typeof DB.watchNotifications === "function") {
    // An idle listener costs nothing, but every new one re-reads all of the
    // user's notifications. Keep it while hidden; attach once when visible.
    let watching = false;
    resumeNotifications = () => {
      if (watching || generation !== epoch || document.visibilityState !== "visible") return;
      watching = true;
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
      () => { watching = false; },
      );
    };
    resumeNotifications();
  }
  if (account) {
    monitor = setInterval(() => {
      if (document.visibilityState === "visible")
        recoverPushConnection().catch(() => {});
    }, PUSH_RECHECK_MS);
    await recoverPushConnection();
  }
  if (generation !== epoch) return;
  updatePanels();
  message({ type: "PUSH_FLUSH_READS" }).catch(() => {});
}
export async function recoverPushConnection() {
  const account = uid,
    generation = epoch,
    deviceGeneration = deviceEpoch;
  const currentGeneration = () =>
    generation === epoch && deviceGeneration === deviceEpoch;
  if (!account) return;
  if (
    recoveryFlight?.generation === generation &&
    recoveryFlight?.deviceGeneration === deviceGeneration
  )
    return recoveryFlight.promise;
  const flight = { generation, deviceGeneration };
  flight.promise = (async () => {
    flushNotificationReads(account).catch(() => {});
    if (!supported() || Notification.permission !== "granted") {
      if (enabled) await detachPushForLogout();
      return;
    }
    const owner = saved();
    if (owner?.uid !== account) return;
    try {
      const reg = await registration();
      const subscription = await reg?.pushManager?.getSubscription();
      if (!currentGeneration()) return;
      if (!subscription) {
        enabled = false;
        save(null);
        return;
      }
      const prepared = await message({ type: "PUSH_OWNER", ...owner });
      if (!currentGeneration()) return;
      enabled = prepared;
      if (!enabled) {
        connectionError = true;
        return;
      }
      if (navigator.onLine === false) return;
      if (registrationPending) {
        const result = await callDevice({
          action: "register",
          subscription: subscription.toJSON(),
          scope: base.href,
          platform: ios()
            ? "ios"
            : /Android/i.test(navigator.userAgent)
              ? "android"
              : "browser",
        });
        if (!currentGeneration()) return;
        const current = { uid: account, deviceId: result.data.deviceId };
        save(current);
        const restored = await message({ type: "PUSH_OWNER", ...current });
        if (!currentGeneration()) return;
        enabled = restored;
        if (!enabled) throw Error("Service worker indisponível.");
        registrationPending = false;
        pendingSync = true;
      }
      if (pendingSync) {
        const current = saved();
        if (!currentGeneration() || current?.uid !== account) return;
        const result = await callDevice({
          action: "sync",
          deviceId: current.deviceId,
          ...(syncCursor ? { cursor: syncCursor } : {}),
        });
        if (!currentGeneration()) return;
        pendingSync = result.data?.synchronized === false;
        syncCursor = result.data?.nextCursor || null;
        connectionError = (result.data?.pending || 0) > 0;
      } else connectionError = false;
      message({ type: "PUSH_FLUSH_READS" }).catch(() => {});
    } catch {
      if (currentGeneration()) connectionError = true;
    } finally {
      if (currentGeneration()) updatePanels();
    }
  })();
  recoveryFlight = flight;
  try {
    return await flight.promise;
  } finally {
    if (recoveryFlight === flight) recoveryFlight = null;
  }
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
window.addEventListener("online", () => {
  pendingSync = true;
  syncCursor = null;
  recoverPushConnection().catch(() => {});
  message({ type: "PUSH_FLUSH_READS" }).catch(() => {});
  updatePanels();
});
window.addEventListener("offline", updatePanels);
document.addEventListener("visibilitychange", () => {
  resumeNotifications();
  if (document.visibilityState === "visible")
    recoverPushConnection().catch(() => {});
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
