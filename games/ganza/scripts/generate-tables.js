import {writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
const choose=(n,k)=>{let c=1;for(let i=1;i<=k;i++)c=c*(n-i+1)/i;return c;};
const tables=[];
for(const rows of [8,12,16]) for(const [risk,center,edge] of [['baixo',50,1600],['medio',42,rows===8?3200:rows===12?8000:10000],['alto',35,rows===8?6400:20000],['extremo',20,rows===16?999900:rows===12?100000:10000]]) {
  const values=p=>Array.from({length:rows+1},(_,k)=>Math.round(center+(edge-center)*(Math.abs(k-rows/2)/(rows/2))**p));
  const rtp=v=>v.reduce((s,x,k)=>s+choose(rows,k)*x,0)/2**rows;
  let lo=.1,hi=30;
  for(let j=0;j<100;j++){const mid=(lo+hi)/2;if(rtp(values(mid))>99)lo=mid;else hi=mid;}
  const v=values((lo+hi)/2);
  // Corrigir só o erro de quantização, nas casas com menor peso e sem quebrar a ordem.
  for(let step=0;step<1000&&Math.abs(rtp(v)-99)>.005;step++){
    const before=Math.abs(rtp(v)-99), sign=rtp(v)<99?1:-1;
    let best=null,err=before;
    for(let k=(rows===16&&risk==='extremo'?1:0);k<rows/2;k++){
      const next=v[k]+sign;
      if((k>0&&next>v[k-1])||next<v[k+1])continue;
      const e=Math.abs(rtp(v)+sign*2*choose(rows,k)/2**rows-99);
      if(e<err){err=e;best=k;}
    }
    if(best===null)break;
    v[best]+=sign;v[rows-best]+=sign;
  }
  if(Math.abs(rtp(v)-99)>.01) throw Error(JSON.stringify({rows,risk,v,rtp:rtp(v)}));
  tables.push({rows,risk,curvePower:(lo+hi)/2,values:v});
}
mkdirSync(new URL('../tabelas/',import.meta.url),{recursive:true});
const legacy=new URL('../tabelas/v1.js',import.meta.url);
if(!existsSync(legacy))copyFileSync(new URL('../tabelas/index.js',import.meta.url),legacy);
writeFileSync(new URL('../tabelas/index.js',import.meta.url),`// Centésimos inteiros, curva convexa simétrica. Não editar sem versionar.\nexport const MATH_VERSION='ganza-v2';\nexport const TABLES=${JSON.stringify(tables,null,2)};\n`);
