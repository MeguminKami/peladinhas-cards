import type {Mode,SymbolId} from '../src/config.ts';

const root=new URL('./assets/football/',typeof document === 'undefined' ? import.meta.url : document.baseURI).href;
export const background=root+'backgrounds/neighborhood-night-v1.webp';
export const symbolArt:Record<SymbolId,{name:string;src:string}>={
  N1:{name:'Cone de treino',src:root+'symbols/n1-cone.webp'},
  N2:{name:'Apito',src:root+'symbols/n2-whistle.webp'},
  N3:{name:'Garrafa desportiva',src:root+'symbols/n3-bottle.webp'},
  N4:{name:'Meião',src:root+'symbols/n4-sock.webp'},
  P1:{name:'Talento de Bronze',src:root+'symbols/p1-personal-v2.webp'},
  P2:{name:'Velocidade de Prata',src:root+'symbols/p2-personal-v3.webp'},
  P3:{name:'Maestro de Ouro',src:root+'symbols/p3-personal-v2.webp'},
  P4:{name:'Rainha da Final · In Form',src:root+'symbols/p4-personal-v3.webp'},
  W:{name:'Craque Wild',src:root+'symbols/w-personal-v3.webp'},
  S:{name:'Bilhete Scatter',src:root+'symbols/s-ticket.webp'},
};
export const modeTitles:Record<Mode,string>={base:'Torneio Noturno',normal:'Final do Bairro',superior:'Noite de Glória',legend:'Lendas do Bairro'};
export const bonusArt={normal:symbolArt.S.src,superior:root+'symbols/bonus-four-scatter-v1.webp',legend:root+'symbols/bonus-five-scatter-v2.webp'};
export const powerTitles:Record<string,string>={P1:'Passe Curto',P2:'Arranque Explosivo',P3:'Passes de Maestro',P4:'Glória do Bairro'};
// An authored display before the first wager, never evaluated or paid.
export const previewBoard:SymbolId[]=['N1','P1','N2','P2','N3','P3','N4','P4','N1','W','N2','P1','N3','P2','P3','N4','S','P4','P1','N2','W','N3','P2','N4'];
const reelSprites=new Map<SymbolId,string>();
export function symbolMarkup(symbol:SymbolId,compact=false){
  return `<span class="symbol-art${symbol.startsWith('N')?' symbol-normal':''}"><img src="${compact?(reelSprites.get(symbol)??symbolArt[symbol].src):symbolArt[symbol].src}" alt="" draggable="false" decoding="async">${symbol==='P4'&&!compact?'<span class="legend-glints" aria-hidden="true"><i></i><i></i><i></i></span>':''}${symbol==='S'?'<span class="scatter-word" aria-hidden="true">SCATTER</span>':''}</span>`;
}
function cacheReelSprite(src:string,img:HTMLImageElement){
  const entry=Object.entries(symbolArt).find(([,art])=>art.src===src);if(!entry)return;
  // Runtime render texture only; original art masters remain untouched.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const scale=256/Math.max(img.naturalWidth,img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  canvas.getContext('2d')!.drawImage(img,(256-w)/2,(256-h)/2,w,h);
  reelSprites.set(entry[0] as SymbolId,canvas.toDataURL('image/webp',.9));
}
export async function preloadArt(onProgress:(loaded:number,total:number)=>void){
  const urls=[...new Set([background,...Object.values(symbolArt).map(s=>s.src),...Object.values(bonusArt)])];let loaded=0;const failed:string[]=[];
  await Promise.all(urls.map(src=>new Promise<void>(resolve=>{const img=new Image();let finished=false;const finish=(ok:boolean)=>{if(finished)return;finished=true;clearTimeout(timer);if(!ok)failed.push(src);onProgress(++loaded,urls.length);resolve();};const timer=setTimeout(()=>finish(false),12000);img.onload=()=>{try{cacheReelSprite(src,img);}catch{/* Original image remains a safe fallback. */}finish(true);};img.onerror=()=>finish(false);img.src=src;})));
  return failed;
}
