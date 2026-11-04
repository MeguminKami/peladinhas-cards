import { VILLAINS } from "./enemies.mjs";
// Every image the scene draws. Shared by the page renderer and the worker.
export const SCENE_IMAGES = Object.freeze({
  atlas: "assets/optimized/characters.webp",
  poses: "assets/optimized/cardoso-poses-realistic.webp",
  relax: "assets/optimized/cardoso-relax-v1.webp",
  backgrounds: Object.freeze(
    Object.fromEntries(
      ["easy", "normal", "hard", "extreme"].map((mode) => [
        mode,
        `assets/optimized/gym-${mode}-v2.webp`,
      ]),
    ),
  ),
  enemies: Object.freeze(VILLAINS.map((villain) => villain.sprite)),
});
// Decoded once into an ImageBitmap that stays in memory: drawing never waits
// for the browser to decode the file again in the middle of a round.
async function loadBitmap(path, root) {
  const src = new URL(path, root).href;
  try {
    const response = await fetch(src);
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const bitmap = await createImageBitmap(await response.blob());
    return Object.assign(bitmap, {
      complete: true,
      naturalWidth: bitmap.width,
      naturalHeight: bitmap.height,
      src,
    });
  } catch {
    // A missing image is skipped by the renderer, exactly like an unloaded one.
    return { complete: false, naturalWidth: 0, naturalHeight: 0, src };
  }
}
export async function loadSceneImages(root) {
  const [atlas, poses, relax, backgrounds, enemies] = await Promise.all([
    loadBitmap(SCENE_IMAGES.atlas, root),
    loadBitmap(SCENE_IMAGES.poses, root),
    loadBitmap(SCENE_IMAGES.relax, root),
    Promise.all(
      Object.entries(SCENE_IMAGES.backgrounds).map(async ([mode, path]) => [
        mode,
        await loadBitmap(path, root),
      ]),
    ).then(Object.fromEntries),
    Promise.all(SCENE_IMAGES.enemies.map((path) => loadBitmap(path, root))),
  ]);
  return { atlas, poses, relax, backgrounds, enemies };
}
export const FONT_URL = "assets/Manrope.woff2";
