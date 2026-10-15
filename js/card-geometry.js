// All silhouettes include the same protected rectangle for text and numbers.
export const CARD_SAFE_RECT = Object.freeze({
  x: 0.06,
  y: 0.08,
  width: 0.88,
  height: 0.88,
});
export const DEFAULT_CARD_OUTLINE =
  "10,0 90,0 100,7 97,87 86,95 50,100 14,95 3,87 0,7";
// Reserve top/bottom bands for silhouettes; side notches stay beyond the body.
export function expandCardOutline(outline) {
  const points = outline
    .trim()
    .split(/\s+/)
    .map((point) => point.split(",").map(Number));
  const expanded = [];
  points.forEach(([x, y], index) => {
    expanded.push([x, y]);
    const [nextX, nextY] = points[(index + 1) % points.length];
    if (nextY === y) return;
    const crossings = [25, 75]
      .map((boundary) => ({ boundary, t: (boundary - y) / (nextY - y) }))
      .filter(({ t }) => t > 0 && t < 1)
      .sort((a, b) => a.t - b.t);
    crossings.forEach(({ boundary, t }) =>
      expanded.push([x + (nextX - x) * t, boundary]),
    );
  });
  return expanded
    .map(([x, y]) => {
      if (y >= 25 && y <= 75) x = x < 50 ? Math.min(x, 4) : Math.max(x, 96);
      y =
        y < 25
          ? y * 0.24
          : y <= 75
            ? 6 + (y - 25) * 1.84
            : 98 + (y - 75) * 0.08;
      return `${Number(x.toFixed(4))},${Number(y.toFixed(4))}`;
    })
    .join(" ");
}

let sequence = 0;
const normalizedPoints = (outline) =>
  outline
    .trim()
    .split(/\s+/)
    .map((point) =>
      point
        .split(",")
        .map((n) => Number(n) / 100)
        .join(","),
    )
    .join(" ");
export function cardClip(outline = DEFAULT_CARD_OUTLINE) {
  const id = `card-clip-${++sequence}`;
  return {
    id,
    markup: `<svg class="card-clip-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><clipPath id="${id}" clipPathUnits="objectBoundingBox"><rect x="${CARD_SAFE_RECT.x}" y="${CARD_SAFE_RECT.y}" width="${CARD_SAFE_RECT.width}" height="${CARD_SAFE_RECT.height}"/><polygon class="card-extra-outline" points="${normalizedPoints(expandCardOutline(outline))}"/></clipPath></defs></svg>`,
  };
}
export function setSafeCardShape(card, shape) {
  const polygon = card.querySelector(".card-extra-outline");
  if (!polygon) return;
  if (shape.startsWith("polygon(")) {
    const outline = shape
      .slice(8, -1)
      .split(",")
      .map((point) =>
        point
          .trim()
          .split(/\s+/)
          .map((v) => parseFloat(v))
          .join(","),
      )
      .join(" ");
    polygon.setAttribute(
      "points",
      normalizedPoints(expandCardOutline(outline)),
    );
  } else {
    // Rounded silhouettes are decorative; the central rectangle is retained.
    const rounded = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    rounded.setAttribute("x", "0");
    rounded.setAttribute("y", "0");
    rounded.setAttribute("width", "1");
    rounded.setAttribute("height", "1");
    rounded.setAttribute("rx", shape.includes("40%") ? ".4" : ".12");
    rounded.setAttribute("ry", ".03");
    polygon.replaceWith(rounded);
  }
}
