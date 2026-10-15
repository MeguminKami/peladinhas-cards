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
          : key === "fade" && ["soft", "none"].includes(v);
    })
  );
}
export function cardPhotoStyles(design) {
  if (!validPhotoDesign(design)) return { photo: "", image: "" };
  const d = { ...defaultPhotoDesign(), ...design };
  return {
    photo: `left:${d.photoX}%;top:${d.photoY}%;width:${d.photoWidth}%;height:${d.photoHeight}%;transform:rotate(${d.photoRotate}deg);overflow:hidden`,
    image: `transform:scale(${d.photoScale / 100});object-fit:${d.fit};object-position:${d.focusX}% ${d.focusY}%;${d.fade === "none" ? "mask-image:none;-webkit-mask-image:none" : ""}`,
  };
}
