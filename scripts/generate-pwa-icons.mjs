import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
try {
  mkdirSync("assets/pwa", { recursive: true });
  const svg = readFileSync("assets/pwa/icon.svg", "utf8");
  for (const [name, size] of [
    ["icon-192", 192],
    ["icon-512", 512],
    ["maskable-512", 512],
    ["apple-touch-icon", 180],
    ["notification-badge", 96],
  ]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    const artwork = name === 'notification-badge' ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="white" fill-rule="evenodd" d="M7 4h34v29L24 45 7 33Zm17 10-9 6 3 10h12l3-10Z"/></svg>' : svg;
    await page.setContent(
      `<style>*{box-sizing:border-box}body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${artwork}`,
    );
    await page.screenshot({ path: `assets/pwa/${name}.png`, omitBackground:true });
    await page.close();
  }
} finally {
  await browser.close();
}
