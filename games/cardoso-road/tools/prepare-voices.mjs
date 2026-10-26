// Local-only decoding/PCM fallback generation. Original OGG bytes stay intact.
import {chromium} from '../../../node_modules/playwright/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {VOICE_CLIPS} from '../voices.mjs';
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage(),report=[];
try{for(const clip of Object.keys(VOICE_CLIPS)){
 const bytes=await readFile(new URL(`../assets/voices/${clip}.ogg`,import.meta.url));
 const decoded=await page.evaluate(async bytes=>{
  const ctx=new AudioContext(),buffer=await ctx.decodeAudioData(Uint8Array.from(bytes).buffer),channels=buffer.numberOfChannels,frames=buffer.length;
  const wav=new ArrayBuffer(44+frames*channels*2),view=new DataView(wav);let peak=0;
  const text=(at,str)=>[...str].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,wav.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,wav.byteLength-44,true);
  const samples=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));for(let i=0;i<frames;i++)for(let ch=0;ch<channels;ch++){const sample=Math.max(-1,Math.min(1,samples[ch][i]));peak=Math.max(peak,Math.abs(sample));view.setInt16(44+(i*channels+ch)*2,Math.round(sample*(sample<0?32768:32767)),true);}
  await ctx.close();return {bytes:Array.from(new Uint8Array(wav)),duration:buffer.duration,sampleRate:buffer.sampleRate,channels,peak};
 },Array.from(bytes));
 await writeFile(new URL(`../assets/voices/${clip}.wav`,import.meta.url),Uint8Array.from(decoded.bytes));delete decoded.bytes;report.push({clip,...decoded});console.log(`${clip}: ${decoded.duration.toFixed(2)}s, PCM fallback OK`);
}
await mkdir(new URL('../reports/',import.meta.url),{recursive:true});await writeFile(new URL('../reports/voice-assets.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),clips:report},null,2));
}finally{await browser.close();}
