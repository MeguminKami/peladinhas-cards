import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import { chromium, webkit } from "./browser-sandbox.mjs";
import { seedDocumentation } from "../scripts/documentation-fixtures.mjs";
const root = resolve(".");
const server = createServer((req, res) => {
  const file = resolve(
    root,
    "." + new URL(req.url, "http://localhost").pathname,
  );
  const path = file === root ? resolve(root, "index.html") : file;
  if (!path.startsWith(root + sep) || !existsSync(path)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".css": "text/css",
      ".html": "text/html",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".woff": "font/woff",
    }[extname(path)] || "application/octet-stream",
  );
  res.end(readFileSync(path));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const isWebKit = process.argv.includes("--webkit");
const browser = await (isWebKit ? webkit : chromium).launch({
  headless: true,
  ...(!isWebKit && process.platform === "win32" ? { channel: "msedge" } : {}),
});
const output = `test-results/card-lab-admin-photo${isWebKit ? "-webkit" : ""}`;
mkdirSync(output, { recursive: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    serviceWorkers: "block",
    hasTouch: true,
  });
  await context.route("**/js/firebase.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: "export const configured=true;",
    }),
  );
  await context.route("**/js/db.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/db.js", "utf8").replaceAll(
        "../../js/utils.js",
        "./utils.js",
      ),
    }),
  );
  await context.route("**/js/auth.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body: readFileSync("tests/fixtures/auth.js", "utf8"),
    }),
  );
  await context.route(/https:\/\//, (r) => r.abort());
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  await context.clock.install({ time: new Date("2026-10-23T12:00:00Z") });

  await context.route("**/js/db.js", (r) =>
    r.fulfill({
      contentType: "text/javascript",
      body:
        readFileSync("tests/fixtures/db.js", "utf8").replaceAll(
          "../../js/utils.js",
          "./utils.js",
        ) +
        '\nstate.users[0].photoURL="./assets/logo.svg"; state.users.unshift({...state.users[1],uid:"first-player",photoURL:"./assets/default-avatar.svg"});',
    }),
  );
  await page.goto(url + "/#/admin/cards/first-player");
  await page.locator("#card-preview .card-photo img").waitFor();
  const assertAdmin = async () => {
    assert.equal(
      await page.locator("#card-preview .card-photo img").getAttribute("src"),
      "./assets/logo.svg",
    );
    assert.equal(
      await page.locator('[name="photoURL"]').inputValue(),
      "./assets/logo.svg",
    );
  };
  await assertAdmin();
  await page.locator('[data-studio-edition="toty"]').click();
  await assertAdmin();
  await page.locator('[data-studio-tab="photo"]').click();
  assert.equal(await page.locator('input[name="photoURL"]:visible').count(), 0);
  await page.locator('[data-studio-property="photoX"]').fill("40");
  await page.locator('[data-studio-property="photoX"]').dispatchEvent("input");
  await assertAdmin();
  const project = await page.evaluate(() => ({
    version: 2,
    fields: {
      ...Object.fromEntries(
        new FormData(document.querySelector("#lab-controls")),
      ),
      player: "first-player",
      photoURL: "./assets/default-avatar.svg",
    },
  }));
  await page.locator('[data-studio-tab="projects"]').click();
  await page
    .locator("#lab-project-import")
    .setInputFiles({
      name: "other-player.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    });
  await page.waitForFunction(
    () => document.querySelector('[name="player"]').value === "first-player",
  );
  await assertAdmin();
  await page.locator("#save-theme").click();
  await page.waitForFunction(() => window.__testState.cardThemes?.length === 1);
  await page.locator("#lab-new-project").click();
  await assertAdmin();
  await page.locator("#studio-saved-project").selectOption("studio-theme-0");
  await assertAdmin();
  await page.locator("#lab-undo").click();
  await assertAdmin();
  await page.evaluate(async () => {
    const { cardLab } = await import("/js/card-lab.js");
    const admins = [
      {
        uid: "first",
        role: "admin",
        displayName: "Outro administrador",
        photoURL: "./assets/default-avatar.svg",
      },
      {
        uid: "second",
        role: "admin",
        displayName: "Administrador ativo",
        photoURL: "./assets/logo.svg",
      },
    ];
    await cardLab(
      {
        user: admins[0],
        league: { players: [admins[1], admins[0]] },
        render: (html) => (document.querySelector("#main").innerHTML = html),
        cleanup: () => {},
      },
      "second",
    );
  });
  assert.equal(
    await page.locator("#card-preview .card-photo img").getAttribute("src"),
    "./assets/default-avatar.svg",
  );
  assert.deepEqual(errors, []);
  console.log(
    "CardLab admin photo: ignores first player and route uid, remains fixed across models, imports, saves, new projects and undo; follows the active admin.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
