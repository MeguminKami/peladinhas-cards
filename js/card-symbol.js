// Shared geometry for native card motifs and symbols added in CardLab.
const viewBoxes = new Map();
export function cardSymbol(art, className = "special-motif") {
  return `<svg class="card-symbol ${className}" viewBox="50 0 50 55" preserveAspectRatio="xMidYMid meet" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true" focusable="false"><g>${art}</g></svg>`;
}
export function fitCardSymbols(root) {
  root.querySelectorAll(".card-symbol").forEach((svg) => {
    const art = svg.firstElementChild;
    if (!art || !svg.isConnected) return;
    const key = art.innerHTML;
    let viewBox = viewBoxes.get(key);
    if (!viewBox) {
      const bounds = art.getBBox();
      if (!bounds.width || !bounds.height) return;
      viewBox = [
        bounds.x - 2,
        bounds.y - 2,
        bounds.width + 4,
        bounds.height + 4,
      ].join(" ");
      viewBoxes.set(key, viewBox);
    }
    svg.setAttribute("viewBox", viewBox);
  });
}
export function normalizeSymbolPosition(design) {
  // Repair the old top-right defaults used by previously saved CardLab projects.
  return design.badgeX === 75 && design.badgeY === 25
    ? { ...design, badgeX: 50, badgeY: 94 }
    : design;
}
export function positionCardSymbol(svg, design) {
  const d = normalizeSymbolPosition(design);
  Object.assign(svg.style, {
    left: `${d.badgeX}%`,
    top: `${d.badgeY}%`,
    width: `${0.11 * d.badgeSize}%`,
    height: `${0.05 * d.badgeSize}%`,
    transform: `translate(-50%,-50%) rotate(${d.badgeRotate}deg)`,
    opacity: d.badgeOpacity / 100,
  });
}
