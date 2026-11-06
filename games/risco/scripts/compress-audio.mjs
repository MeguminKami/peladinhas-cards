// Encode our normalized PCM with the browser's native Opus codec, then mux Ogg.
// No downloaded encoder, external samples or renamed WebM files.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../tests/browser-sandbox.mjs';
import { SOUNDS } from '../ui/synth.js';
const audio=new URL('../ui/audio/',import.meta.url);
const server=createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>RISCO audio export</title>');return;}if(!/^\/[a-z-]+\.(wav|ogg)$/.test(req.url))throw Error();res.setHeader('Content-Type',req.url.endsWith('.ogg')?'audio/ogg':'audio/wav');res.end(await readFile(new URL(req.url.slice(1),audio)));}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{})});
function pageFor(packet,{sequence,serial,flags=0,granule=0}){
  const count=Math.floor(packet.length/255)+1,segments=Buffer.alloc(count,255);segments[count-1]=packet.length%255;
  const header=Buffer.alloc(27);header.write('OggS');header[5]=flags;header.writeBigUInt64LE(BigInt(granule),6);header.writeUInt32LE(serial,14);header.writeUInt32LE(sequence,18);header[26]=count;
  const page=Buffer.concat([header,segments,packet]);let crc=0;
  for(const byte of page){crc^=byte<<24;for(let b=0;b<8;b++)crc=crc&0x80000000?(crc<<1)^0x04c11db7:crc<<1;}
  page.writeUInt32LE(crc>>>0,22);return page;
}
try{
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
  let serial=1000;
  for(const name of Object.keys(SOUNDS)){
    const encoded=await page.evaluate(async name=>{
      const context=new OfflineAudioContext(1,1,48000),buffer=await context.decodeAudioData(await fetch('/'+name+'.wav').then(r=>r.arrayBuffer()));
      const config={codec:'opus',sampleRate:48000,numberOfChannels:1,bitrate:96000};if(!(await AudioEncoder.isConfigSupported(config)).supported)throw Error('Opus encoder indisponível');
      const chunks=[];let head=null,failure=null;
      const encoder=new AudioEncoder({output(chunk,meta){const bytes=new Uint8Array(chunk.byteLength);chunk.copyTo(bytes);chunks.push(Array.from(bytes));if(meta?.decoderConfig?.description)head=Array.from(new Uint8Array(meta.decoderConfig.description));},error(error){failure=error.message;}});encoder.configure(config);
      const source=buffer.getChannelData(0),frame=960;
      for(let offset=0;offset<source.length;offset+=frame){const pcm=new Float32Array(frame);pcm.set(source.subarray(offset,offset+frame));const data=new AudioData({format:'f32-planar',sampleRate:48000,numberOfFrames:frame,numberOfChannels:1,timestamp:Math.round(offset/48000*1e6),data:pcm});encoder.encode(data);data.close();}
      await encoder.flush();encoder.close();if(failure)throw Error(failure);
      return{chunks,head,samples:source.length};
    },name);
    let head=encoded.head?Buffer.from(encoded.head):null;
    if(!head||head.toString('ascii',0,8)!=='OpusHead'){head=Buffer.alloc(19);head.write('OpusHead');head[8]=1;head[9]=1;head.writeUInt16LE(312,10);head.writeUInt32LE(48000,12);}
    const preSkip=head.readUInt16LE(10),vendor=Buffer.from('RISCO original synthesis');
    const tags=Buffer.alloc(16+vendor.length);tags.write('OpusTags');tags.writeUInt32LE(vendor.length,8);vendor.copy(tags,12);tags.writeUInt32LE(0,12+vendor.length);
    const pages=[pageFor(head,{sequence:0,serial,flags:2}),pageFor(tags,{sequence:1,serial})];
    encoded.chunks.forEach((packet,i)=>pages.push(pageFor(Buffer.from(packet),{sequence:i+2,serial,flags:i===encoded.chunks.length-1?4:0,granule:i===encoded.chunks.length-1?encoded.samples+preSkip:(i+1)*960})));
    const bytes=Buffer.concat(pages);await writeFile(new URL(name+'.ogg',audio),bytes);serial++;
    const decoded=await page.evaluate(async name=>{const ctx=new OfflineAudioContext(1,1,48000);const b=await ctx.decodeAudioData(await fetch('/'+name+'.ogg').then(r=>r.arrayBuffer()));return{duration:b.duration,length:b.length};},name);
    if(Math.abs(decoded.duration-encoded.samples/48000)>.021)throw Error('Duração Opus inválida: '+name);
    console.log(`${name}.ogg: ${bytes.length} bytes, descodificação e duração verificadas`);
  }
}finally{await browser.close();await new Promise(done=>server.close(done));}
