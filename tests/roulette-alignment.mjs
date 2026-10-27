import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
const origin = "http://127.0.0.1:8094";
const server = spawn(
  process.execPath,
  [
    resolve("games/roleta-europeia-3d/node_modules/vite/bin/vite.js"),
    "--config",
    resolve("tests/fixtures/roulette-vite.mjs"),
    "--configLoader",
    "native",
    "--host",
    "127.0.0.1",
    "--port",
    "8094",
    "--strictPort",
  ],
  {
    cwd: resolve("games/roleta-europeia-3d"),
    stdio: ["ignore", "pipe", "pipe"],
  },
);
await new Promise((resolve, reject) => {
  server.stdout.on("data", (data) => {
    if (String(data).includes("127.0.0.1:8094")) resolve();
  });
  server.once("error", reject);
  server.once("exit", () => reject(Error("Vite failed")));
});
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
  args: ["--enable-unsafe-swiftshader"],
});
mkdirSync("test-results/roulette-alignment", { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 820 },
    serviceWorkers: "block",
  });
  await page.route("**/*", (route) =>
    route
      .request()
      .url()
      .startsWith(origin + "/")
      ? route.continue()
      : route.abort(),
  );
  await page.route(origin + "/alignment.html", (route) =>
    route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: '<!doctype html><body style="margin:0;background:#0a1e15"><div id="stage" style="width:1000px;height:760px"></div><output id="number" style="color:white;font:24px system-ui"></output></body>',
    }),
  );
  await page.goto(origin + "/alignment.html");
  const result = await page.evaluate(async () => {
    const { RouletteScene } = await import("/src/scene.ts"),
      { ORDER } = await import("/src/engine.ts"),
      { THREE } = await import("/shared/scene.ts");
    // Capture the actual number positions drawn into the wheel's texture.
    const labels = [],
      original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text,
      x,
      y,
      ...rest
    ) {
      if (this.canvas.width === 2048 && /^\d+$/.test(text)) {
        const m = this.getTransform();
        labels.push({
          number: Number(text),
          x: m.a * x + m.c * y + m.e,
          y: m.b * x + m.d * y + m.f,
        });
      }
      return original.call(this, text, x, y, ...rest);
    };
    const scene = new RouletteScene(document.querySelector("#stage"));
    CanvasRenderingContext2D.prototype.fillText = original;
    window.alignmentScene = scene;
    const disk = scene.rotor.children.find(
      (mesh) => mesh.material?.map?.image?.width === 2048,
    );
    const errors = [];
    for (const rotor of [0, 0.7, -2.1, 24])
      for (const n of ORDER) {
        scene.restore(n, rotor);
        scene.scene.updateMatrixWorld(true);
        const label = labels.find((label) => label.number === n),
          point = disk.localToWorld(
            new THREE.Vector3(
              (label.x / 2048 - 0.5) * 6.2,
              (0.5 - label.y / 2048) * 6.2,
              0,
            ),
          );
        const { ball } = scene.alignment(),
          ballAngle = Math.atan2(ball[0], ball[2]),
          labelAngle = Math.atan2(point.x, point.z);
        const delta = Math.abs(
          Math.atan2(
            Math.sin(ballAngle - labelAngle),
            Math.cos(ballAngle - labelAngle),
          ),
        );
        if (delta > 1e-6) errors.push({ n, rotor, delta });
      }
    return { numbers: labels.length, checks: ORDER.length * 4, errors };
  });
  assert.equal(result.numbers, 37);
  assert.deepEqual(result.errors, []);
  for (const n of [0, 17, 32, 36]) {
    await page.evaluate((n) => {
      window.alignmentScene.restore(n, 0.7);
      document.querySelector("#number").textContent = "Resultado: " + n;
    }, n);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `test-results/roulette-alignment/${n}.png` });
  }
  writeFileSync(
    "test-results/roulette-alignment/result.json",
    JSON.stringify({ date: new Date().toISOString(), ...result }, null, 2),
  );
  console.log(
    `Roleta: ${result.checks} checks align the ball with the actual 37 texture labels across four wheel rotations.`,
  );
} finally {
  await browser.close();
  server.kill();
}
