// Exporta a ilustração única aprovada para a thumbnail 2:3 do casino.
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const source = new URL('../games/piece-police/art-src/production/casino-cover.png', import.meta.url);
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
try {
  const page = await browser.newPage();
  const data = await page.evaluate(async (src) => {
    const image = new Image(); image.src = src; await image.decode();
    if (image.width * 3 !== image.height * 2) throw Error('A capa tem de ter proporção 2:3.');
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 1200;
    canvas.getContext('2d').drawImage(image, 0, 0, 800, 1200);
    return canvas.toDataURL('image/webp', .92).split(',')[1];
  }, 'data:image/png;base64,' + (await readFile(source)).toString('base64'));
  await writeFile(new URL('../assets/casino/covers/peace-police.webp', import.meta.url), Buffer.from(data, 'base64'));
  console.log('Capa PEACE POLICE: WebP 800 × 1200.');
} finally { await browser.close(); }
