import { calculateWeeklyTopPlayers } from "./utils.js";
import { card, bindImages } from "./cards.js";
import { icon } from "./icons.js";
import { empty } from "./ui.js";

const modes = [
  { id: "ovr", label: "OVR", icon: "rewardCard", title: "A elite da liga.", description: "Os três OVR mais altos. As cartas que todos querem alcançar." },
  { id: "performance", label: "Performance", icon: "streak", title: "Em campo, deram tudo.", description: "As melhores médias nos jogos desta semana, segundo as avaliações da comunidade." },
  { id: "growth", label: "Crescimento", icon: "rewardStats", title: "Uma semana. Outro nível.", description: "Quem mais subiu de OVR face à carta da semana passada." },
];

export function podiumPlayers(players, mode, date = new Date()) {
  const tie = (a, b) => b.ovr - a.ovr || (a.username || a.uid || "").localeCompare(b.username || b.uid || "");
  if (mode === "performance") return calculateWeeklyTopPlayers(players, date).filter(p => p.hasCard && Number.isFinite(p.weeklyPerformance)).slice(0, 3);
  return players.filter(p => p.hasCard && (mode !== "growth" || Number.isFinite(p.ovrDelta) && p.ovrDelta > 0))
    .sort((a, b) => (mode === "growth" ? b.ovrDelta - a.ovrDelta : 0) || tie(a, b)).slice(0, 3);
}

export function mountHomePodium(root, players) {
  let index = 0, paused = false, timer;
  root.innerHTML = `<div class="podium-controls"><div class="podium-switches" role="group" aria-label="Classificação do pódio">${modes.map(m => `<button type="button" data-podium-mode="${m.id}" aria-pressed="false">${icon(m.icon)}<span>${m.label}</span></button>`).join("")}</div><button type="button" class="podium-pause" aria-label="Pausar rotação automática">Pausar ${icon("pause")}</button></div><div class="podium-caption"><span class="podium-edition" aria-hidden="true"></span><div><h3 id="podium-title"></h3><p id="podium-description"></p></div></div><div class="podium-stage"><svg class="podium-scenery" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><ellipse cx="500" cy="480" rx="430" ry="105"/><ellipse cx="500" cy="480" rx="310" ry="75"/><path d="M500 40v400M130 480l220-370M870 480 650 110"/></svg><div class="podium-results"></div></div>`;
  const stage = root.querySelector(".podium-results");
  const draw = () => {
    const mode = modes[index], top = podiumPlayers(players, mode.id);
    root.dataset.mode = mode.id;
    root.querySelector("#podium-title").textContent = mode.title;
    root.querySelector("#podium-description").textContent = mode.description;
    root.querySelector(".podium-edition").textContent = `0${index + 1} / 03`;
    root.querySelectorAll("[data-podium-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.podiumMode === mode.id)));
    stage.innerHTML = top.length ? `<div class="podium" tabindex="0" role="region" aria-label="${mode.label}: pódio da liga">${top.map((p, i) => `<div class="podium-place place-${i + 1}"><div class="podium-rank">${i === 0 ? icon("trophy") : ""}<b>${i + 1}.º</b><span>${i === 0 ? "Líder" : "No pódio"}</span></div>${card(p)}<div class="podium-pedestal"><p class="podium-score">${mode.id === "ovr" ? `<strong>${p.ovr}</strong><span>OVR atual</span>` : mode.id === "performance" ? `<strong>${p.weeklyPerformance.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<small> / 5</small></strong><span>Performance semanal</span>` : `<strong>+${p.ovrDelta.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}<small> OVR</small></strong><span>Face à semana passada</span>`}</p><span class="podium-step-number" aria-hidden="true">${["I", "II", "III"][i]}</span></div></div>`).join("")}</div>${top.length > 1 ? `<p class="podium-hint">${icon("arrow")} Desliza para conhecer os três destaques</p>` : ""}` : empty(mode.id === "growth" ? "Ainda sem subidas esta semana" : mode.id === "performance" ? "A semana ainda está a começar" : "O pódio está à tua espera", mode.id === "performance" ? "O pódio aparece quando houver jogos avaliados esta semana." : mode.id === "growth" ? "As subidas aparecem ao comparar com a carta da semana anterior." : "As primeiras cartas aparecem após a autoavaliação.");
    bindImages(stage);
  };
  const schedule = () => {
    clearInterval(timer);
    if (!paused) timer = setInterval(() => {
      if (document.hidden || (matchMedia("(hover: hover)").matches && root.matches(":hover")) || root.contains(document.activeElement)) return;
      index = (index + 1) % modes.length;
      draw();
    }, 5000);
  };
  root.querySelectorAll("[data-podium-mode]").forEach(b => b.onclick = () => {
    index = modes.findIndex(m => m.id === b.dataset.podiumMode);
    draw(); schedule();
  });
  root.querySelector(".podium-pause").onclick = e => {
    paused = !paused;
    root.dataset.paused = String(paused);
    e.currentTarget.innerHTML = `${paused ? "Retomar" : "Pausar"} ${icon(paused ? "play" : "pause")}`;
    e.currentTarget.setAttribute("aria-label", `${paused ? "Retomar" : "Pausar"} rotação automática`);
    schedule();
  };
  draw(); schedule();
  return () => clearInterval(timer);
}
