import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { startServer } from './serve.js';
import { musicFiles } from '../ui/music-loop.js';
const {chromium}=createRequire(import.meta.url)('playwright');
const {server,base}=await startServer({port:0,quiet:true});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
  const page=await browser.newPage();await page.goto(base+'/audio-lab.html');
  const tracks={};
  for(const [mode,file] of Object.entries(musicFiles)) {
    const bytes=await readFile(new URL(`../ui/audio/music/${file}`,import.meta.url));
    const analysis=await page.evaluate(async({mode,file})=>{
      const {analyzeLoop,prepareLoop}=await import('./ui/music-loop.js');
      const context=new OfflineAudioContext(2,1,32000);
      const response=await fetch('./ui/audio/music/'+file);if(!response.ok)throw Error(`HTTP ${response.status}`);
      const buffer=await context.decodeAudioData(await response.arrayBuffer());
      const spec=analyzeLoop(buffer,mode),loop=prepareLoop(context,buffer,spec);
      return {...spec,loopDuration:loop.buffer.duration,gain:loop.gain,rms:loop.rms,peak:loop.peak,sampleRate:loop.buffer.sampleRate,channels:loop.buffer.numberOfChannels};
    },{mode,file});
    tracks[mode]={file,origin:'Faixa entregue pelo dono, gerada no Suno',license:'Condições da conta do dono não verificadas',bytes:bytes.length,
      sha256:createHash('sha256').update(bytes).digest('hex'),...analysis};
    console.log(`${mode}: ${analysis.duration.toFixed(2)} s, loop ${analysis.loopStart}–${analysis.loopEnd} s, ${bytes.length} bytes, pico ${(20*Math.log10(analysis.peak)).toFixed(2)} dBFS`);
  }
  await writeFile(new URL('../ui/audio/music/manifest.json',import.meta.url),JSON.stringify({version:1,crossfadeSeconds:2,tracks},null,2)+'\n');
} finally {await browser.close();server.close();}
