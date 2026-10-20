import { chromium as actualChromium, webkit as actualWebkit } from "playwright";
const productionService = url => /(^|\.)(googleapis\.com|cloudfunctions\.net|firebaseio\.com|firebasestorage\.app|firebaseapp\.com)$/.test(new URL(url).hostname);
async function guardContext(context, violations) {
  context.on("request", request => {
    if (productionService(request.url())) violations.push(new URL(request.url()).origin);
  });
  await context.route("**/*", route => productionService(route.request().url()) ? route.abort() : route.fallback());
  return context;
}
function assertNoProduction(violations) {
  if (violations.length) throw Error(`Teste tentou contactar serviços reais: ${[...new Set(violations)].join(", ")}`);
}
function guarded(engine) {
  return {
    async launchPersistentContext(...args) {
      const violations = [];
      const context = await guardContext(await engine.launchPersistentContext(...args), violations);
      const close = context.close.bind(context);
      context.close = async (...values) => { await close(...values); assertNoProduction(violations); };
      return context;
    },
    async launch(options) {
      const browser = await engine.launch(options);
      const violations = [];
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async options => {
        return guardContext(await newContext(options), violations);
      };
      browser.newPage = async options => (await browser.newContext(options)).newPage();
      const close = browser.close.bind(browser);
      browser.close = async (...args) => {
        await close(...args);
        assertNoProduction(violations);
      };
      return browser;
    },
  };
}
export const chromium = guarded(actualChromium);
export const webkit = guarded(actualWebkit);
