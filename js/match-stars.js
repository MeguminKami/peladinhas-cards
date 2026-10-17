export function matchStars(value) {
  return Number.isFinite(value)
    ? `<span class="match-stars" aria-label="${value.toFixed(1)} de 5 estrelas"><span aria-hidden="true">★★★★★<span style="width:${Math.max(0, Math.min(100, value * 20))}%">★★★★★</span></span><b>${value.toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b></span>`
    : '<span class="muted">Por avaliar</span>';
}
