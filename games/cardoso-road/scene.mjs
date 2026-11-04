import {
  createRenderer,
  ZONES,
  cameraLayout,
  backgroundLayout,
} from "./scene-core.mjs";
import { loadSceneImages } from "./scene-assets.mjs";
export { ZONES, cameraLayout, backgroundLayout };
const root = new URL("./", import.meta.url);
let software;
// Without GPU canvas (blocked driver, hardware acceleration off) every frame is
// rasterised by the CPU: start in light mode instead of waiting for slow frames.
export function softwareCanvas() {
  if (software !== undefined) return software;
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return (software = true);
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    software = /swiftshader|llvmpipe|software|basic render/i.test(name);
  } catch {
    software = false;
  }
  return software;
}
// Tests that read canvas pixels ask for the page renderer (pixels in a worker
// canvas cannot be read back from the page).
function pageRendererRequested() {
  try {
    return localStorage.getItem("cardoso-road-render") === "page";
  } catch {
    return false;
  }
}
const settledPair = () => ({ settled: Promise.resolve(), finished: Promise.resolve() });
// Host for the drawing core. Layers: a static background canvas (painted only
// when size or difficulty change) under a transparent canvas for what moves.
// Drawing runs in a worker (OffscreenCanvas) when available, else on the page.
export function createScene(canvas, get, { lightMode = () => false } = {}) {
  const view = canvas.ownerDocument.defaultView;
  canvas.parentElement.style.isolation = "isolate";
  const background = () => {
    const bg = document.createElement("canvas");
    bg.className = "scene-bg";
    bg.setAttribute("aria-hidden", "true");
    Object.assign(bg.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
      zIndex: "-1",
      pointerEvents: "none",
    });
    return bg;
  };
  let bg = background();
  canvas.after(bg);
  const snapshot = () => {
    const s = get();
    return {
      round: s.round,
      mode: s.mode,
      reduced: s.reduced,
      music: s.music,
      beatEpoch: performance.timeOrigin + (s.beatAt || 0),
    };
  };
  const level = () => (lightMode() || softwareCanvas() ? 2 : 0);
  let renderer = null,
    worker = null,
    lastDebug = "{}",
    sentState = "",
    sentLevel = level(),
    nextId = 1;
  const waiting = new Map();
  const size = () => {
    const box = canvas.getBoundingClientRect();
    return { width: box.width, height: box.height, ratio: view.devicePixelRatio || 1 };
  };
  const showDebug = (debug) => {
    lastDebug = debug;
    canvas.dataset.camera = debug;
  };
  async function onPage() {
    const images = await loadSceneImages(root);
    renderer = createRenderer({ canvas, bgCanvas: bg, images, onDebug: showDebug });
    const { width, height, ratio } = size();
    renderer.resize(width, height, ratio);
    renderer.setMinQuality(sentLevel);
    renderer.setVisible(!document.hidden);
  }
  function onWorker() {
    return new Promise((resolve, reject) => {
      const offscreen = canvas.transferControlToOffscreen(),
        offscreenBg = bg.transferControlToOffscreen();
      worker = new Worker(new URL("./scene-worker.mjs", import.meta.url), { type: "module" });
      worker.onmessage = ({ data }) => {
        if (data.type === "debug") showDebug(data.debug);
        else if (data.type === "ready") resolve();
        else if (data.type === "failed") reject(Error(data.message));
        else {
          const presentation = waiting.get(data.id);
          if (!presentation) return;
          presentation[data.type]?.();
          if (data.type === "finished") waiting.delete(data.id);
        }
      };
      worker.onerror = (event) => reject(event.error || Error(event.message || "worker"));
      sentState = JSON.stringify(snapshot());
      worker.postMessage(
        {
          type: "init",
          canvas: offscreen,
          bg: offscreenBg,
          ...size(),
          level: sentLevel,
          state: JSON.parse(sentState),
        },
        [offscreen, offscreenBg],
      );
    });
  }
  // A worker that cannot start leaves fresh canvases for the page renderer.
  function replaceCanvases() {
    worker?.terminate();
    worker = null;
    const fresh = canvas.cloneNode(false),
      freshBg = background();
    canvas.replaceWith(fresh);
    bg.replaceWith(freshBg);
    canvas = fresh;
    bg = freshBg;
    observer.disconnect();
    observer.observe(canvas);
  }
  const useWorker =
    typeof Worker === "function" &&
    typeof OffscreenCanvas === "function" &&
    "transferControlToOffscreen" in canvas &&
    !pageRendererRequested();
  const observer = new ResizeObserver(() => {
    const { width, height, ratio } = size();
    if (worker) worker.postMessage({ type: "resize", width, height, ratio });
    else renderer?.resize(width, height, ratio);
  });
  observer.observe(canvas);
  document.addEventListener("visibilitychange", () => {
    if (worker) worker.postMessage({ type: "visible", visible: !document.hidden });
    else renderer?.setVisible(!document.hidden);
  });
  function loop(now) {
    const nextLevel = level();
    if (nextLevel !== sentLevel) {
      sentLevel = nextLevel;
      if (worker) worker.postMessage({ type: "quality", level: sentLevel });
      else renderer?.setMinQuality(sentLevel);
    }
    if (worker) {
      const state = JSON.stringify(snapshot());
      if (state !== sentState) {
        sentState = state;
        worker.postMessage({ type: "state", state: JSON.parse(state) });
      }
    } else renderer?.tick(now, snapshot());
    requestAnimationFrame(loop);
  }
  const ready = Promise.all([
    document.fonts.ready,
    (useWorker
      ? onWorker().catch(() => {
          replaceCanvases();
          return onPage();
        })
      : onPage()
    ).then(() => requestAnimationFrame(loop)),
  ]);
  return {
    ready,
    get renderer() {
      return worker ? "worker" : "page";
    },
    // `settled`: the travel/fight the player must see was drawn; `finished`:
    // any hold after it (defeat pose) was drawn too.
    event(type) {
      if (worker) {
        let settled, finished;
        const id = nextId++,
          presentation = {
            settled: new Promise((resolve) => (settled = resolve)),
            finished: new Promise((resolve) => (finished = resolve)),
          };
        waiting.set(id, { settled, finished });
        sentState = JSON.stringify(snapshot());
        worker.postMessage({ type: "event", event: type, id, state: JSON.parse(sentState) });
        return presentation;
      }
      return renderer ? renderer.event(type, snapshot()) : settledPair();
    },
    inspect() {
      return JSON.parse(lastDebug);
    },
  };
}
