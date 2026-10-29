// Fit is presentation only; chip selection uses the original SDK buttons at every size.
export function installCasinoTableFit(root) {
  return {
    set(value) { document.documentElement.toggleAttribute("data-casino-fit", value); },
    destroy() { document.documentElement.removeAttribute("data-casino-fit"); },
  };
}
