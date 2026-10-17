import { icon } from "./icons.js";

const tools = {
  models: ["studioModels", "01", "O ponto de partida"],
  composition: ["studioComposition", "02", "A estrutura da carta"],
  colors: ["palette", "03", "A tua assinatura cromática"],
  layers: ["studioMaterials", "04", "Profundidade e acabamento"],
  symbols: ["studioSymbols", "05", "Os detalhes que distinguem"],
  text: ["studioType", "06", "Personalidade em cada letra"],
  photo: ["camera", "07", "O protagonista da carta"],
  projects: ["assets", "08", "O teu arquivo criativo"],
};

export function enhanceCardLabInterface(form, cleanup) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new Set();
  for (const [id, [symbol, number, subtitle]] of Object.entries(tools)) {
    const tab = form.querySelector(`[data-studio-tab="${id}"]`);
    tab?.querySelector("svg")?.remove();
    tab?.insertAdjacentHTML("afterbegin", icon(symbol));
    const panel = form.querySelector(`[data-studio-panel="${id}"]`);
    if (!panel) continue;
    const title = panel.querySelector("h2");
    if (title) {
      const help = title.nextElementSibling?.matches(".studio-help")
        ? title.nextElementSibling
        : null;
      const header = document.createElement("header");
      header.className = "studio-tool-heading";
      header.innerHTML = `${icon(symbol)}<div><span class="studio-tool-eyebrow">${number} / ${subtitle}</span></div>`;
      panel.prepend(header);
      header.lastElementChild.append(title);
      if (help) header.after(help);
    }
    tab?.addEventListener("click", () => {
      if (reduced.matches) return;
      panel.animate(
        [
          { opacity: 0, transform: "translateY(6px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 200, easing: "ease-out" },
      );
    });
  }
  for (const details of form.querySelectorAll("details")) {
    const summary = details.querySelector("summary");
    const label = summary.textContent.trim();
    const symbol = /luz|Ilumina/.test(label)
      ? "studioLight"
      : /perímetro|Moldura/.test(label)
        ? "studioOutline"
        : /Fundo/.test(label)
          ? "palette"
          : /Marca|Detalhe/.test(label)
            ? "studioSymbols"
            : "studioMaterials";
    const text = document.createElement("span");
    text.className = "studio-disclosure-title";
    text.textContent = label;
    summary.replaceChildren();
    summary.insertAdjacentHTML(
      "beforeend",
      icon(symbol, "studio-disclosure-icon"),
    );
    summary.append(text);
    summary.insertAdjacentHTML(
      "beforeend",
      icon("studioChevron", "studio-disclosure-chevron"),
    );
    const body = document.createElement("div");
    body.className = "studio-disclosure-body";
    for (const child of [...details.childNodes])
      if (child !== summary) body.append(child);
    details.append(body);
    let animation;
    summary.addEventListener("click", (event) => {
      event.preventDefault();
      const opening = animation
        ? details.dataset.expanding !== "true"
        : !details.open;
      const from = details.getBoundingClientRect().height;
      animation?.cancel();
      details.dataset.expanding = String(opening);
      if (reduced.matches) {
        details.open = opening;
        return;
      }
      details.open = true;
      const to = opening
        ? details.scrollHeight
        : summary.getBoundingClientRect().height;
      animation = details.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        { duration: 240, easing: "cubic-bezier(.2,.7,.3,1)" },
      );
      animations.add(animation);
      const current = animation;
      animation.onfinish = () => {
        details.open = opening;
        animations.delete(current);
        animation = undefined;
        delete details.dataset.expanding;
      };
    });
  }
  cleanup(() => animations.forEach((animation) => animation.cancel()));
}
