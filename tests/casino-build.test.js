import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resourceFiles } from '../games/cardoso-road/tools/cache-manifest.mjs';

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

test('published artwork stays within budget and Cardoso contains only its runtime inventory and font license',()=>{
  const root='.firebase/site/';
  const inventory=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>
    entry.isDirectory()?inventory(directory+entry.name+'/').map(path=>entry.name+'/'+path):[entry.name]);
  const cardoso=root+'assets/games/cardoso-road/';
  assert.deepEqual(inventory(cardoso).sort(),[...resourceFiles,'cache-manifest.js','assets/Manrope-OFL.txt'].sort());
  const bytes=directory=>inventory(directory).reduce((sum,path)=>sum+statSync(directory+path).size,0);
  assert.ok(bytes(cardoso)<8*1024*1024,'Cardoso runtime exceeded 8 MiB');
  const football=root+'assets/games/futebol/assets/football/';
  assert.ok(bytes(football)<6*1024*1024,'Football artwork exceeded 6 MiB');
  assert.ok(!inventory(football).some(path=>path.endsWith('.png')));
  const theme=readFileSync('games/futebol/web/theme.ts','utf8');
  for(const match of theme.matchAll(/root\+'([^']+)'/g))
    assert.ok(existsSync(football+match[1]),`missing football artwork ${match[1]}`);
  assert.ok(!inventory(root+'assets/casino/').some(path=>path.startsWith('shop/symbols/')));
});
