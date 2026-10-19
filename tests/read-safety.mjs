import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "./browser-sandbox.mjs";
async function withServer(mode, check) {
  const processHandle = spawn(process.execPath, ["scripts/dev-server.mjs", "--port", "8189", "--mode", mode], {stdio:["ignore","pipe","pipe"]});
  try {
    await new Promise((resolve,reject) => {processHandle.stdout.once("data",resolve);processHandle.once("error",reject);processHandle.once("exit",code=>reject(Error(`Server exited ${code}`)));});
    await check("http://127.0.0.1:8189");
  } finally {
    const exited = new Promise(resolve => processHandle.once("exit",resolve));
    processHandle.kill();
    await exited;
  }
}
await withServer("fixtures", async origin => {
  assert.match(await (await fetch(`${origin}/js/firebase.js`)).text(), /configured=true/);
  for (const path of ["/tests/fixtures/game-ratings.js", "/tests/fixtures/maintenance.js", "/js/ovr-presets.js"]) assert.equal((await fetch(origin+path)).status,200);
  for (const path of ["/functions/index.js", "/tests/backend.test.js", "/.secret.local"]) assert.equal((await fetch(origin+path)).status,404);
  const browser=await chromium.launch({headless:true,...(process.platform === "win32" ? {channel:"msedge"} : {})});
  try {
    const page=await browser.newPage({serviceWorkers:"block"});
    const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(origin);
    await page.waitForSelector("main");
    await page.waitForTimeout(500);
    assert.deepEqual(errors,[]);
  } finally { await browser.close(); }
});
await withServer("emulator", async origin => {
  const config=await (await fetch(`${origin}/js/config.js`)).text();
  assert.match(config,/demo-peladinhas-development/);
  assert.match(config,/runtimeMode="emulator"/);
  assert.ok(!config.includes('projectId":"pedalinhas-cards'));
});
const browser=await chromium.launch({headless:true,...(process.platform === "win32" ? {channel:"msedge"} : {})});
const page=await browser.newPage();
await page.goto("about:blank");
await page.evaluate(async () => {try {await fetch("https://firestore.googleapis.com/v1/projects/demo-safety");} catch {}});
await assert.rejects(browser.close(),/firestore\.googleapis\.com/);
console.log("Read safety: local fixtures, emulator config, private files and production network barrier passed.");

