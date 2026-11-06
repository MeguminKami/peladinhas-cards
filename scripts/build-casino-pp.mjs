import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'games/piece-police');
const target = resolve(root, 'assets/games/piece-police');
if (relative(root, target).replaceAll('\\', '/') !== 'assets/games/piece-police') throw Error('Destino inválido.');
// Uma única entrega responsiva. Música, loops e crossfades mantêm os ficheiros originais.
const excluded = /(^|[/\\])(preview\.(js|css)|site\.css|carteira-simulada\.(js|css))$/;
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(resolve(source, 'game.html'), resolve(target, 'game.html'));
for (const folder of ['ui', 'src', 'tabelas'])
  cpSync(resolve(source, folder), resolve(target, folder), { recursive: true, filter: file => !excluded.test(file) });
console.log('PEACE POLICE preparado em assets/games/piece-police.');
