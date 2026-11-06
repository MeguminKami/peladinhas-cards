export const PHOTO_FIELDS = Object.freeze([
  ["photoX", "Posição horizontal", -50, 100, 31],
  ["photoY", "Posição vertical", -50, 100, 7],
  ["photoWidth", "Largura", 10, 160, 65],
  ["photoHeight", "Altura", 10, 120, 46],
  ["photoScale", "Ampliação", 50, 200, 100],
  ["photoRotate", "Rotação", -45, 45, 0],
  ["focusX", "Enquadramento horizontal", 0, 100, 50],
  ["focusY", "Enquadramento vertical", 0, 100, 25],
]);
export const defaultPhotoDesign = () => ({
  ...Object.fromEntries(PHOTO_FIELDS.map(([key, , , , value]) => [key, value])),
  fit: "cover",
  fade: "soft",
});
export function validPhotoDesign(value) {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.entries(value).every(([key, v]) => {
      const field = PHOTO_FIELDS.find(([name]) => key === name);
      return field
        ? Number.isFinite(v) && v >= field[2] && v <= field[3]
        : key === "fit"
          ? ["cover", "contain"].includes(v)
          : key === "placement"
            ? v === "free"
            : key === "fade" && ["soft", "none"].includes(v);
    })
  );
}
export function freePhotoDesign(design, { shop = false } = {}) {
  const d = { ...defaultPhotoDesign(), fit: "contain", ...(validPhotoDesign(design) ? design : {}) };
  if (d.placement === "free") return d;
  if (shop) {
    const width = 54 * d.photoWidth / 65;
    const height = 54 * .67 * d.photoHeight / 46;
    d.photoX = 33 + (54 - width) / 2 + d.photoX - 31;
    d.photoY = 56 - 54 * .67 + (54 * .67 - height) / 2 + d.photoY - 7;
    d.photoWidth = width;
    d.photoHeight = height;
  }
  // Legacy controls can place an image beyond today's numeric limits.
  for (const [key, , min, max] of PHOTO_FIELDS) d[key] = Math.max(min, Math.min(max, d[key]));
  return { ...d, placement: "free" };
}
export function cardPhotoStyles(design, { bounded = false } = {}) {
  if (!validPhotoDesign(design)) return { photo: "", image: "" };
  const d = { ...defaultPhotoDesign(), ...design };
  const width = d.photoWidth / 65 * 100;
  const height = d.photoHeight / 46 * 100;
  return {
    photo: bounded && d.placement !== "free"
      // Convert normal-card controls to an inner layer in the shop's fixed
      // 54%-wide square; movement uses the same card-relative units as dragging.
      ? `left:${50 - width / 2 + (d.photoX - 31) / .54}%;top:${50 - height / 2 + (d.photoY - 7) / (.54 * .67)}%;width:${width}%;height:${height}%;transform:rotate(${d.photoRotate}deg)`
      : `left:${d.photoX}%;top:${d.photoY}%;width:${d.photoWidth}%;height:${d.photoHeight}%;transform:rotate(${d.photoRotate}deg)${d.placement === "free" ? ` scale(${d.photoScale / 100})` : ""};overflow:${d.placement === "free" ? "visible" : "hidden"}`,
    image: `transform:${d.placement === "free" ? "none" : `scale(${d.photoScale / 100})`};object-fit:${d.fit};object-position:${d.focusX}% ${d.focusY}%;${d.fade === "none" ? "mask-image:none;-webkit-mask-image:none" : ""}`,
  };
}
