import {
  CONFIG,
  MODES,
  multiplier,
  payout,
  fresh,
  validate,
  transition,
} from "./engine.mjs";
import { createScene, ZONES } from "./scene.mjs";
import { createAudio } from "./audio.mjs";
import { TRAVEL_MS, FIGHT_MS } from "./progression.mjs";
const $ = (s) => document.querySelector(s),
  fmt = (n) =>
    (n / 100).toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  mult = (n) =>
    n.toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + "×";
const integrated =
  new URL(location.href).searchParams.get("integrated") === "1";
let casinoWallet, pendingAction;
const unit = integrated ? "DJC" : "créditos";
const key = "cardoso-road-demo-v1";
let state = fresh(),
  mode = "normal",
  busy = false,
  busyAction = null,
  lockOwner = false,
  sceneReady = false,
  settings = {
    effects: true,
    music: true,
    musicVolume: 0.3,
    voices: true,
    volume: 0.3,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
try {
  const saved = localStorage.getItem(key);
  if (saved && !integrated) state = validate(JSON.parse(saved));
  settings = {
    ...settings,
    ...JSON.parse(localStorage.getItem(key + "-settings") || "{}"),
  };
} catch {
  $("#error").textContent =
    "Não foi possível recuperar os dados locais. Nova sessão fictícia.";
}
if (state.round) mode = state.round.mode;
const audio = createAudio(() => ({ ...settings, mode }));
let visualBalance = null;
let defeatRound = null,
  defeatUntil = 0,
  defeatTimer,
  victoryRound = null;
function roundForScene() {
  const r = state.round;
  if (!r || r.status === "paid") return null;
  if (r.status === "lost")
    return defeatRound === r.id && performance.now() < defeatUntil ? r : null;
  if (r.status === "won") return victoryRound === r.id ? r : null;
  return r;
}
const scene = createScene($("#world"), () => ({
  round: roundForScene(),
  mode,
  reduced: settings.reduced,
  music: settings.music,
  beatAt: audio.beatAt,
}));
const gameReady = Promise.all([scene.ready, audio.prepare()]);
function finishDefeat(round) {
  clearTimeout(defeatTimer);
  defeatRound = round.id;
  defeatUntil =
    performance.now() + (settings.reduced ? 0 : TRAVEL_MS + FIGHT_MS + 400);
  defeatTimer = setTimeout(
    () => {
      if (state.round?.id !== round.id || state.round.status !== "lost") return;
      defeatRound = null;
      scene.event("idle");
      render();
    },
    Math.max(0, defeatUntil - performance.now()),
  );
}
const music = () => audio.configure();
document.body.classList.toggle("integrated", integrated);

function announceReady() {
  if (window.parent !== window)
    window.parent.postMessage(
      { type: "cardoso-road:ready", demo: !integrated },
      location.origin,
    );
}
gameReady.then(() => {
  sceneReady = true;
  render();
  navigator.serviceWorker?.controller?.postMessage({
    type: "cardoso-road:warm",
  });
  if (!integrated) announceReady();
});
window.connectCardosoWallet = async (wallet) => {
  if (!integrated || casinoWallet) throw Error("Ligação inválida.");
  casinoWallet = wallet;
  state = validate(await wallet.state());
  if (state.round) mode = state.round.mode;
  lockOwner = true;
  $("#limits").textContent = "1 – 100 DJC";
  document.querySelector(".demo").textContent = "DJABUCOIN";
  document.querySelector(".wallet small").textContent = "SALDO DO CASINO";
  await gameReady;
  render();
  announceReady();
};
window.refreshCardosoBalance = async () => {
  if (casinoWallet && !busy) {
    state = validate(await casinoWallet.state());
    render();
  }
};
if (integrated && window.parent !== window)
  window.parent.postMessage(
    { type: "cardoso-road:wallet-ready" },
    location.origin,
  );
$("#markers").innerHTML = Array.from(
  { length: 10 },
  () => '<i aria-hidden="true"></i>',
).join("");
$("#modes").innerHTML = Object.entries(MODES)
  .map(
    ([id, m], i) =>
      `<button data-mode="${id}" style="--mode-color:${["#cefa70", "#89caff", "#ffbc70", "#ff907b"][i]}" aria-pressed="false"><span class="mode-mark" aria-hidden="true"></span>${m.name}</button>`,
  )
  .join("");
function bet() {
  return Math.round(
    Number($("#bet").value.replace(/\s/g, "").replace(",", ".")) * 100,
  );
}
let advanceUntil = 0,
  advanceTimer;
const advanceCooling = () => performance.now() < advanceUntil;
function lockAdvance() {
  advanceUntil = performance.now() + 500;
  clearTimeout(advanceTimer);
  advanceTimer = setTimeout(function ready() {
    const remaining = advanceUntil - performance.now();
    if (remaining > 0) {
      advanceTimer = setTimeout(ready, Math.ceil(remaining));
      return;
    }
    advanceTimer = null;
    render();
  }, 500);
}
function render() {
  $("#music-volume").value = settings.musicVolume;
  $("#music-level").textContent = Math.round(settings.musicVolume * 100) + "%";
  $("#music-toggle").setAttribute("aria-pressed", String(settings.music));
  $("#music-toggle").textContent = settings.music
    ? "Música ligada"
    : "Música desligada";
  const r = state.round,
    active = r?.status === "active",
    n = active ? r.step : 0,
    viewStep = roundForScene()?.step ?? 0;
  document.body.dataset.mode = mode;
  document.body.classList.toggle("playing", !!active);
  document.body.classList.toggle(
    "celebrating",
    roundForScene()?.status === "won",
  );
  if (active) document.getElementById("bet").value = fmt(r.bet);
  document.body.classList.toggle("reduced", settings.reduced);
  $("#balance").textContent = fmt(visualBalance ?? state.balance);
  if (!integrated || lockOwner)
    document.documentElement.dataset.casinoBalance = String(
      visualBalance ?? state.balance,
    );
  $("#place").textContent = ZONES[Math.min(viewStep, 9)].toUpperCase();
  $("#markers").setAttribute("aria-valuenow", String(viewStep));
  $("#markers").setAttribute(
    "aria-valuetext",
    `${viewStep} de 10 etapas concluídas`,
  );
  $("#markers")
    .querySelectorAll("i")
    .forEach((el, i) => {
      el.className = i < viewStep ? "done" : i === viewStep ? "next" : "";
    });
  $("#success").textContent = `${Math.round(MODES[mode].p * 100)}% de sucesso`;
  $("#risk").textContent = `${Math.round((1 - MODES[mode].p) * 100)}%`;
  $("#finish").textContent = mult(multiplier(mode, 10));
  $("#current").textContent = mult(multiplier(mode, n));
  $("#next").textContent = mult(multiplier(mode, Math.min(10, n + 1)));
  const amount = active ? r.bet : bet();
  $("#potential").textContent = Number.isFinite(amount)
    ? fmt(payout(amount, mode, Math.min(10, n + 1))) + " " + unit
    : "—";
  $("#cashout").innerHTML =
    `<span>Cash Out</span><strong>${fmt(active ? payout(r.bet, mode, n) : 0)}</strong><small>${unit}</small>`;
  $("#cashout").disabled = !active || n === 0 || busy || !lockOwner;
  $("#play").disabled =
    (active && advanceCooling()) ||
    busy ||
    !sceneReady ||
    !lockOwner ||
    (!active && state.balance < CONFIG.minBet);
  $("#play").innerHTML = !sceneReady
    ? "A preparar…"
    : busy
      ? busyAction === "start"
        ? "A apostar…"
        : busyAction === "cashout"
          ? "A levantar…"
          : "A avançar…"
      : active
        ? 'Avançar <span aria-hidden="true">&#8599;</span>'
        : "Apostar";
  $("#play").setAttribute(
    "aria-label",
    busy ? $("#play").textContent : active ? "Avançar" : "Apostar",
  );
  $("#play").setAttribute("aria-busy", String(busy));
  $("#victory-result").hidden = r?.status !== "won";
  $("#progress").textContent =
    `${active ? "TREINO EM CURSO" : r?.status === "lost" ? "FUI FRITO!" : r ? "TREINO TERMINADO" : "TREINO POR COMEÇAR"} · ${viewStep} / 10`;
  document
    .querySelectorAll("[data-bet],#bet,button[data-mode]")
    .forEach((el) => (el.disabled = !!active || busy || !lockOwner));
  document
    .querySelectorAll("button[data-mode]")
    .forEach((el) =>
      el.setAttribute("aria-pressed", String(el.dataset.mode === mode)),
    );
}
function persist(next) {
  localStorage.setItem(key, JSON.stringify(next));
  state = next;
}
async function act(type) {
  const intended = pendingAction?.action.type ?? type;
  if (
    busy ||
    !lockOwner ||
    !sceneReady ||
    (intended === "step" && advanceCooling())
  )
    return;
  if (intended === "step") lockAdvance();
  busyAction = intended;
  busy = true;
  window.cardosoBusy = true;
  visualBalance = state.balance;
  render();
  try {
    audio.unlock();
    const r = state.round;
    const action =
      type === "start" ? { type, bet: bet(), mode } : { type, id: r.id };
    let next;
    if (integrated) {
      pendingAction ??= { action, id: crypto.randomUUID() };
      next = await casinoWallet.act(pendingAction.action, pendingAction.id);
      type = pendingAction.action.type;
      pendingAction = null;
      state = validate(next);
    } else {
      next = transition(state, action);
      persist(next);
    }
    $("#error").textContent = "";
    const current = state.round;
    if (type === "step") lockAdvance();
    if (type === "start") {
      clearTimeout(defeatTimer);
      defeatRound = null;
      victoryRound = null;
      scene.event("start");
      audio.event("start");
    } else if (current.status === "lost") {
      finishDefeat(current);
      scene.event("lost");
      audio.event("lost");
    } else if (current.status === "paid" || current.status === "won") {
      victoryRound = current.status === "won" ? current.id : null;
      scene.event(current.status === "paid" ? "idle" : current.status);
      audio.event(current.status);
      if (current.status === "won") {
        render();
        if (!settings.reduced)
          await new Promise((resolve) =>
            setTimeout(resolve, TRAVEL_MS + FIGHT_MS),
          );
      }
    } else {
      scene.event("step");
      $("#play").classList.remove("ready");
      requestAnimationFrame(() => $("#play").classList.add("ready"));
      audio.event("step", current.step);
    }
  } catch (e) {
    if (e.definitive) pendingAction = null;
    $("#error").textContent = e.message;
  } finally {
    visualBalance = null;
    busy = false;
    busyAction = null;
    window.cardosoBusy = false;
    render();
  }
}
$("#play").onclick = () =>
  act(state.round?.status === "active" ? "step" : "start");
$("#cashout").onclick = () => act("cashout");
$("#bet").oninput = render;
document.querySelectorAll("[data-bet]").forEach(
  (b) =>
    (b.onclick = () => {
      const v = Number.isFinite(bet()) ? bet() : CONFIG.minBet,
        a = b.dataset.bet;
      const value =
        {
          minus: v - 100,
          plus: v + 100,
          min: CONFIG.minBet,
          max: Math.min(CONFIG.maxBet, state.balance),
          half: Math.floor(v / 2),
          double: v * 2,
        }[a] ?? Number(a);
      $("#bet").value = fmt(
        Math.max(CONFIG.minBet, Math.min(CONFIG.maxBet, state.balance, value)),
      );
      render();
    }),
);
document.querySelectorAll("button[data-mode]").forEach(
  (b) =>
    (b.onclick = () => {
      mode = b.dataset.mode;
      music();
      render();
    }),
);
function show(page) {
  const r = state.round;
  let body = "";
  if (page === "rules")
    body = `<p class="eyebrow">${integrated ? "TRANSPARÊNCIA / DJABUCOIN" : "TRANSPARÊNCIA / MODO DEMO"}</p><h2>O risco faz parte do caminho.</h2><p>Dez passos independentes. Sobrevive ao primeiro para poderes levantar. Uma falha perde a aposta inteira. No passo 10 o pagamento é automático. Os obstáculos e as animações não influenciam o resultado.</p><p>RTP teórico: 97%. Margem: 3%. M(n) = 0,97 / pⁿ. O multiplicador inclui a aposta. Apresentamos duas casas; calculamos o prémio com a precisão completa e arredondamos para baixo ao cêntimo. A prévia mostra o pagamento efetivo. Com a aposta mínima de 1,00, o RTP por levantamento predefinido situa-se entre 96,05% e 97%, conforme passo e dificuldade. Não é uma garantia de retorno numa sessão.</p><p><b>${MODES[mode].name}</b> · Sucesso por passo: ${MODES[mode].p * 100}% · Meta: ${(MODES[mode].p ** 10 * 100).toFixed(2)}%</p><table><thead><tr><th>Passo</th><th>Multiplicador</th><th>Probabilidade acumulada</th></tr></thead><tbody>${Array.from({ length: 10 }, (_, i) => `<tr><td>${i + 1}</td><td>${mult(multiplier(mode, i + 1))}</td><td>${(MODES[mode].p ** (i + 1) * 100).toFixed(2)}%</td></tr>`).join("")}</tbody></table><p>${integrated ? "Djabucoins partilhadas com os restantes jogos. Saldo e ronda guardados juntos neste dispositivo; confirmação online no fim da ronda e ao sair." : "Créditos locais sem valor monetário."} Aleatoriedade: Web Crypto. Este modo não constitui uma implementação certificada nem oferece prova criptográfica dos resultados.</p>`;
  if (page === "history")
    body = `<h2>O teu percurso.</h2><p>Últimas 50 rondas deste dispositivo. Valores em ${unit}.</p>${state.history.length ? `<table><thead><tr><th>Ronda / risco</th><th>Passo</th><th>Aposta</th><th>Pago</th></tr></thead><tbody>${state.history.map((r) => `<tr><td>${r.id.slice(0, 8)}<br>${MODES[r.mode].name} · ${r.status === "lost" ? "Perdida" : r.status === "won" ? "Sofia!" : "Levantada"}</td><td>${r.step}/10</td><td>${fmt(r.bet)}</td><td>${fmt(r.payment)}</td></tr>`).join("")}</tbody></table>` : "<p>O ginásio ainda está à tua espera. Escolhe o risco e começa o teu primeiro treino.</p>"}`;
  if (page === "settings")
    body =
      '<h2>Ao teu ritmo.</h2><label><input id="effects" type="checkbox"> Efeitos sonoros</label><label><input id="music" type="checkbox"> Música de treino</label><label><input id="voices" type="checkbox"> Vozes do Cardoso</label><p id="voice-note"></p><label for="volume">Volume</label><input id="volume" type="range" min="0" max="1" step=".05"><label><input id="reduced" type="checkbox"> Movimento reduzido</label><p>As falas acompanham o jogo sem atrasar os passos ou o levantamento.</p>';
  if (page === "help")
    body = `<h2>O melhor treino inclui pausas.</h2><p>${integrated ? "Jogo com Djabucoins fictícias para maiores de 18 anos" : "Demonstração para maiores de 18 anos"}, sem depósitos, compras ou dinheiro real. Os créditos não podem ser convertidos nem transferidos.</p><p>${integrated ? "Podes sair entre ações e retomar a ronda neste dispositivo. A carteira é partilhada com o casino. Os resultados são calculados localmente; as moedas não têm valor monetário." : "Podes sair a qualquer momento: a ronda fica guardada neste browser. O saldo e o histórico demo podem ser alterados nas ferramentas do browser e nunca representam uma carteira real."}</p><button id="pause">Fazer uma pausa</button><p>Se o jogo deixar de ser diversão, pára e procura apoio junto do SRIJ / Linha Vida 1414.</p>`;
  if (page === "victory")
    body = `<p class="eyebrow">MISSÃO CUMPRIDA</p><h2 class="result-title">ZERO ÓLEO.<br>100% AMOR.</h2><p>O Cardoso chegou à Sofia!</p><h2>${mult(multiplier(r.mode, 10))} · ${fmt(r.payment)} ${unit}</h2><p>Dez passos. Nenhum frito. Um abraço merecido.</p><button id="again">Jogar novamente</button>`;
  $("#panel-body").innerHTML = body;
  if (!$("#panel").open) $("#panel").showModal();
  if (page === "settings") {
    $("#voice-note").textContent =
      "8 grava\u00e7\u00f5es do Cardoso. Controlos independentes de m\u00fasica, efeitos e vozes.";
    for (const id of ["effects", "music", "voices", "reduced", "volume"]) {
      const el = $("#" + id);
      if (id === "volume") el.value = settings[id];
      else el.checked = settings[id];
      el.oninput = () => {
        settings[id] = id === "volume" ? Number(el.value) : el.checked;
        try {
          localStorage.setItem(key + "-settings", JSON.stringify(settings));
        } catch {}
        music();
        render();
      };
    }
  }
  $("#pause")?.addEventListener("click", () => {
    $("#panel").close();
    $("#play").disabled = true;
    const resume = document.createElement("button");
    resume.textContent = "Retomar treino";
    resume.onclick = () => {
      resume.remove();
      render();
    };
    $("#error").replaceChildren(resume);
  });
  $("#again")?.addEventListener("click", () => {
    $("#panel").close();
    act("start");
  });
}
document.querySelectorAll("[data-panel]").forEach(
  (b) =>
    (b.onclick = () => {
      show(b.dataset.panel);
    }),
);
$("#close").onclick = () => $("#panel").close();
if (!integrated && navigator.locks) {
  navigator.locks.request(key, { ifAvailable: true }, async (lock) => {
    if (!lock) {
      $("#error").textContent =
        "O treino está aberto noutro separador. Fecha-o e atualiza esta página.";
      return;
    }
    lockOwner = true;
    render();
    await new Promise(() => {});
  });
} else if (!integrated) {
  $("#error").textContent =
    "Este browser não permite proteger a sessão entre separadores. Usa um browser moderno para jogar.";
}
$("#music-volume").oninput = (e) => {
  settings.musicVolume = Number(e.target.value);
  try {
    localStorage.setItem(key + "-settings", JSON.stringify(settings));
  } catch {}
  music();
  render();
};
$("#music-toggle").onclick = () => {
  settings.music = !settings.music;
  audio.unlock();
  try {
    localStorage.setItem(key + "-settings", JSON.stringify(settings));
  } catch {}
  music();
  render();
};
document.addEventListener("pointerdown", () => audio.unlock(), { once: true });
render();

// Space advances only an already paid, active round; it never places a bet.
document.addEventListener("keydown", (event) => {
  if (
    event.code !== "Space" ||
    event.repeat ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    busy ||
    !lockOwner ||
    state.round?.status !== "active" ||
    document.querySelector("dialog[open]") ||
    event.target.closest(
      "input,select,textarea,a,summary,button:not(#play),[contenteditable]",
    )
  )
    return;
  event.preventDefault();
  void act("step");
});
