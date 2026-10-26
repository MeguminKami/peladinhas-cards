import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

test('Hosting publishes the independent embed and SDK without sources/demo, loading game assets on demand',()=>{
  const root='.firebase/site/';
  const worker=readFileSync(root+'sw.js','utf8');
  const precache=JSON.parse(worker.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]);
  assert.ok(precache.includes('js/casino.js'));
  assert.ok(precache.includes('css/casino.css'));
  assert.ok(!precache.some(path=>path.startsWith('assets/games/')));
  const slot=root+'assets/games/futebol/';
  for(const file of ['embed.html','slot-host.js']) assert.ok(existsSync(slot+file));
  for(const file of ['index.html','host-demo.html','web','src','node_modules','docs']) assert.equal(existsSync(slot+file),false);
  assert.ok(!readdirSync(slot+'assets').some(file=>/^demo-.*\.js$/.test(file)));
  for(const match of readFileSync(slot+'embed.html','utf8').matchAll(/(?:src|href)="\.\/([^"]+)"/g)) assert.ok(existsSync(slot+match[1]),`missing ${match[1]}`);
  const config=JSON.parse(readFileSync('firebase.json','utf8'));
  assert.ok(config.hosting.redirects.some(row=>row.source==='/casino'&&row.destination==='/#/casino'));
  assert.ok(config.functions[0].ignore.includes('games'));
});
