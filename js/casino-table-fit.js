// Fit is presentation only: delegate chip selection to the existing SDK buttons.
export function installCasinoTableFit(root) {
  const chips = root.querySelector(".chips");
  const picker = document.createElement("label");
  picker.className = "casino-fit-chip";
  const label = document.createElement("span");
  label.textContent = "Ficha";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Valor da ficha");
  for (const button of chips.querySelectorAll("[data-chip]")) {
    const option = document.createElement("option");
    option.value = button.dataset.chip;
    option.textContent = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(Number(option.value) / 100);
    select.append(option);
  }
  picker.append(label, select);
  chips.after(picker);
  const update = () => {
    const selected = chips.querySelector('[aria-pressed="true"]');
    if (selected) select.value = selected.dataset.chip;
    select.disabled = !chips.querySelector("[data-chip]:not(:disabled)");
  };
  select.onchange = () => chips.querySelector(`[data-chip="${select.value}"]`)?.click();
  const observer = new MutationObserver(update);
  observer.observe(chips, { subtree: true, childList: true, attributes: true, attributeFilter: ["disabled", "aria-pressed"] });
  update();
  return {
    set(value) { document.documentElement.toggleAttribute("data-casino-fit", value); },
    destroy() { observer.disconnect(); picker.remove(); document.documentElement.removeAttribute("data-casino-fit"); },
  };
}
