export const ASSET_PATHS = Object.freeze({
  avatar: "./assets/default-avatar.svg",
  logo: "./assets/logo.svg",
  cards: "./assets/cards/",
  backgrounds: "./assets/backgrounds/",
  icons: "./assets/icons/",
});
export const safeImage = (url) =>
  /^(https?:\/\/|\.\/assets\/)/i.test(url || "") ? url : ASSET_PATHS.avatar;

export const PLAYSTYLE_ICONS = Object.freeze({
  pace: "./assets/playstyle/ps_vel.webp",
  shooting: "./assets/playstyle/ps_fin.webp",
  passing: "./assets/playstyle/ps_pas.webp",
  dribbling: "./assets/playstyle/ps_dri.webp",
  defending: "./assets/playstyle/ps_def.webp",
  physical: "./assets/playstyle/ps_fis.webp",
  goalkeeping: "./assets/playstyle/ps_gr.webp",
  stamina: "./assets/playstyle/ps_res.webp",
});
