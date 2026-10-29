import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resourceFiles } from "../tools/cache-manifest.mjs";
import { VILLAINS } from "../enemies.mjs";
test("runtime loads only the 25 optimized images and keeps the complete image download below 4 MiB", async () => {
  const images = resourceFiles.filter((path) => path.endsWith(".webp"));
  assert.equal(images.length, 25);
  assert.ok(!resourceFiles.some((path) => path.endsWith(".png")));
  let bytes = 0;
  for (const path of images) {
    const file = await readFile(new URL("../" + path, import.meta.url));
    assert.equal(file.toString("ascii", 0, 4), "RIFF");
    assert.equal(file.toString("ascii", 8, 12), "WEBP");
    bytes += file.length;
  }
  assert.ok(
    bytes < 4 * 1024 * 1024,
    "optimized artwork exceeded the transfer budget",
  );
  for (const villain of VILLAINS) assert.ok(images.includes(villain.sprite));
});
