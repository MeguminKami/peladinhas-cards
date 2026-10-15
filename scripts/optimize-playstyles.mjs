// Delivery derivatives only; the original PNG artwork is retained unchanged.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32" ? { channel: "msedge" } : {}),
});
try {
  const page = await browser.newPage();
  for (const name of readdirSync("design/sources/playstyles").filter((name) =>
    name.endsWith(".png"),
  )) {
    const original = readFileSync(`design/sources/playstyles/${name}`);
    const result = await page.evaluate(
      async (source) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const scale = Math.min(
          1,
          256 / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/webp", 0.92).split(",")[1];
      },
      `data:image/png;base64,${original.toString("base64")}`,
    );
    const optimized = Buffer.from(result, "base64");
    writeFileSync(
      `assets/playstyle/${name.replace(".png", ".webp")}`,
      optimized,
    );
    console.log(`${name}: ${original.length} → ${optimized.length} bytes`);
  }
} finally {
  await browser.close();
}
