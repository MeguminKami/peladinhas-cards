// Confirma que um jogo usa a barra de controlos padrão SEM alterações.
// Uso: node games/guias-slot/kit/verificar-kit.mjs games/<jogo>
// O jogo deve ter ui/kit/barra.js e ui/kit/barra.css iguais aos do kit (o tema fica em ui/tema-barra.css).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const kit = resolve(dirname(fileURLToPath(import.meta.url)), 'barra-controlos');
const game = resolve(process.argv[2] || '.');
const norm = text => text.replace(/\r\n/g, '\n');
let ok = true;
for (const file of ['barra.js', 'barra.css']) {
  const copy = resolve(game, 'ui/kit', file);
  if (!existsSync(copy)) { console.error(`FALTA  ui/kit/${file}`); ok = false; continue; }
  if (norm(readFileSync(copy, 'utf8')) !== norm(readFileSync(resolve(kit, file), 'utf8'))) { console.error(`DIFERENTE  ui/kit/${file} (não editar a cópia; corrigir no kit e voltar a copiar)`); ok = false; }
  else console.log(`igual  ui/kit/${file}`);
}
const theme = resolve(game, 'ui/tema-barra.css');
if (!existsSync(theme)) console.warn('aviso  sem ui/tema-barra.css (a barra fica com o aspeto neutro)');
else {
  const css = norm(readFileSync(theme, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/@font-face\s*\{[^}]*\}/g, '');
  const selectors = [...css.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim()).filter(s => s !== ':root');
  const foreign = [...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]).filter(v => !v.startsWith('--deck-'));
  if (selectors.length) { console.error(`TEMA com seletores além de :root/@font-face: ${selectors.join(', ')}`); ok = false; }
  if (foreign.length) { console.error(`TEMA com variáveis que não são --deck-*: ${[...new Set(foreign)].join(', ')}`); ok = false; }
  if (!selectors.length && !foreign.length) console.log('tema  só variáveis --deck-* (correto)');
}
process.exit(ok ? 0 : 1);
