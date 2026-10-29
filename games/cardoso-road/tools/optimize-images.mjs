import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "../../../node_modules/playwright/index.mjs";
const assets = new URL("../assets/", import.meta.url),
  output = new URL("optimized/", assets);
const images = [
  { name: "characters", height: 832 },
  { name: "cardoso-poses-realistic", height: 768 },
  { name: "cardoso-relax-v1", height: 768 },
  ...["easy", "normal", "hard", "extreme"].map((mode) => ({
    name: "gym-" + mode + "-v2",
    width: 1920,
  })),
  ...Array.from({ length: 18 }, (_, i) => ({
    name: "villains/food-" + String(i + 1).padStart(2, "0"),
    height: 576,
  })),
];
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CARDOSO_BROWSER
    ? { executablePath: process.env.CARDOSO_BROWSER }
    : { channel: "msedge" }),
});
await mkdir(output, { recursive: true });
let before = 0,
  after = 0,
  beforePixels = 0,
  afterPixels = 0;
try {
  const page = await browser.newPage();
  for (const image of images) {
    const original = await readFile(new URL(image.name + ".png", assets));
    const result = await page.evaluate(
      async ({ data, height, width }) => {
        const image = new Image();
        image.src = "data:image/png;base64," + data;
        await image.decode();
        const ratio = Math.min(
            1,
            width ? width / image.width : height / image.height,
          ),
          canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const encoded = canvas.toDataURL("image/webp", 0.84);
        if (!encoded.startsWith("data:image/webp;"))
          throw Error("WebP encoder unavailable");
        return {
          data: encoded.split(",")[1],
          width: canvas.width,
          height: canvas.height,
          sourceWidth: image.width,
          sourceHeight: image.height,
        };
      },
      { ...image, data: original.toString("base64") },
    );
    const buffer = Buffer.from(result.data, "base64");
    await writeFile(
      new URL(image.name.split("/").at(-1) + ".webp", output),
      buffer,
    );
    before += original.length;
    after += buffer.length;
    beforePixels += result.sourceWidth * result.sourceHeight;
    afterPixels += result.width * result.height;
  }
  console.log(
    JSON.stringify({
      images: images.length,
      beforeBytes: before,
      afterBytes: after,
      beforeDecodedMiB: (beforePixels * 4) / 1048576,
      afterDecodedMiB: (afterPixels * 4) / 1048576,
    }),
  );
} finally {
  await browser.close();
}
