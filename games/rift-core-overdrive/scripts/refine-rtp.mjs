import {Worker} from 'node:worker_threads';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CONFIG} from '../math-config.js';
const configurationHash=createHash('sha256').update(readFileSync(new URL('../math-config.js',import.meta.url))).digest('hex');
const huntOnly=process.argv[2]==='hunt';
const tasks=huntOnly?[['hunt',1000000,661026]]:[['core',500000,771026],['rift',250000,881026]];
const results=await Promise.all(tasks.map(([scenario,n,seed])=>new Promise((resolve,reject)=>{
 const worker=new Worker(new URL('./audit-rtp.mjs',import.meta.url),{workerData:{scenario,n,seed,bet:.1}});
 worker.on('message',r=>{console.log(JSON.stringify(r));resolve(r)});worker.on('error',reject);worker.on('exit',c=>{if(c)reject(Error('Worker exit '+c))});
})));
writeFileSync(new URL(huntOnly?'../rtp-hunt.json':'../rtp-components.json',import.meta.url),JSON.stringify({date:new Date().toISOString(),configuration:CONFIG,configurationHash,results},null,2)+'\n');
