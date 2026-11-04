// Draws the gym off the main thread: the page stays responsive to clicks and
// wallet confirmations even when the canvas is rasterised by the CPU.
import { createRenderer } from "./scene-core.mjs";
import { loadSceneImages, FONT_URL } from "./scene-assets.mjs";
const root = new URL("./", import.meta.url);
const frame = self.requestAnimationFrame
  ? (callback) => self.requestAnimationFrame(callback)
  : (callback) => setTimeout(() => callback(performance.now()), 16);
let renderer = null,
  state = null;
const queue = [];
// Main-thread timestamps (beats) arrive as epoch time; convert to this clock.
const local = (snapshot) => ({
  ...snapshot,
  beatAt: snapshot.beatEpoch - performance.timeOrigin,
});
function handle(data) {
  if (data.type === "state") state = local(data.state);
  else if (data.type === "resize") renderer.resize(data.width, data.height, data.ratio);
  else if (data.type === "visible") renderer.setVisible(data.visible);
  else if (data.type === "quality") renderer.setMinQuality(data.level);
  else if (data.type === "event") {
    state = local(data.state);
    const presentation = renderer.event(data.event, state);
    presentation.settled.then(() => postMessage({ type: "settled", id: data.id }));
    presentation.finished.then(() => postMessage({ type: "finished", id: data.id }));
  }
}
self.onmessage = async ({ data }) => {
  if (data.type !== "init") {
    if (renderer) handle(data);
    else queue.push(data);
    return;
  }
  try {
    try {
      // Variable font: declare the weight range so the 900 labels match the page.
      const font = new FontFace("Manrope", `url(${new URL(FONT_URL, root)})`, {
        weight: "200 900",
      });
      self.fonts.add(await font.load());
    } catch {
      // The sans-serif fallback keeps every label readable.
    }
    const images = await loadSceneImages(root);
    renderer = createRenderer({
      canvas: data.canvas,
      bgCanvas: data.bg,
      images,
      onDebug: (debug) => postMessage({ type: "debug", debug }),
    });
    renderer.resize(data.width, data.height, data.ratio);
    renderer.setMinQuality(data.level);
    state = local(data.state);
    for (const message of queue.splice(0)) handle(message);
    const loop = (now) => {
      if (state) renderer.tick(now, state);
      frame(loop);
    };
    frame(loop);
    postMessage({ type: "ready" });
  } catch (error) {
    postMessage({ type: "failed", message: String(error?.message || error) });
  }
};
