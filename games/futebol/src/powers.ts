import {config,type Config,type Mode,type SymbolId} from './config.ts';
import {index,pick,type Random} from './random.ts';
import type {Board} from './board.ts';
export function neighbors(pos:number){const out:number[]=[];if(pos>=6)out.push(pos-6);if(pos<18)out.push(pos+6);if(pos%6>0)out.push(pos-1);if(pos%6<5)out.push(pos+1);return out;}
/** Uniform shortest orthogonal route, including origin and destination. */
export function shortestPass(from:number,to:number,rng:Random){
  const path=[from];let p=from;
  while(p!==to){
    const rows=Math.trunc(to/6)-Math.trunc(p/6),cols=to%6-p%6;
    const vertical=rows!==0&&(cols===0||rng.next()<Math.abs(rows)/(Math.abs(rows)+Math.abs(cols)));
    p+=vertical?Math.sign(rows)*6:Math.sign(cols);path.push(p);
  }
  return path;
}
export function shotPath(from:number,dr:number,dc:number,board:Board){
  const path=[from];let row=Math.trunc(from/6)+dr,col=from%6+dc;
  while(row>=0&&row<4&&col>=0&&col<6){
    const p=row*6+col;path.push(p);
    if(board[p]==='W'||board[p].startsWith('P'))break;
    row+=dr;col+=dc;
  }
  return path;
}
export function resolve(initial:Board,mode:Mode,rng:Random,c:Config=config,initialGlobal=1){
  const board=[...initial],amplified=new Set<number>();
  const steals:{position:number;eligible:number[];source:number|null;power:string|null;success:boolean}[]=[];
  const events:{power:string;position:number;targets:number[];factor:number;requested?:number;conversionSymbol?:SymbolId;sourceTargets?:number[];path?:number[];destination?:number;passKind?:'pass'|'shot';direction?:number[];operation?:'add'|'multiply'}[]=[];
  let global=initialGlobal;
  for(let p=0;p<24;p++)if(initial[p]==='W'){
    const eligible=neighbors(p).filter(n=>initial[n].startsWith('P'));
    let source:number|null=null,power:string|null=null;
    if(eligible.length){source=eligible[index(eligible.length,rng)];if(rng.next()*100<c.steal[mode])power=initial[source];}
    steals.push({position:p,eligible,source,power,success:power!==null});
  }
  for(const s of steals)if(s.power==='P1'){
    const available=initial.flatMap((symbol,p)=>symbol==='P1'&&p!==s.source?[p]:[]);
    const destination=available.length?available[index(available.length,rng)]:undefined;
    const direction=destination===undefined?[[-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1]][index(8,rng)]:undefined;
    const path=direction?shotPath(s.position,direction[0],direction[1],board):shortestPass(s.position,destination!,rng);
    const targets=path.filter(p=>board[p]!=='W'&&board[p]!=='S'&&(direction?!board[p].startsWith('P'):board[p]!=='P1'));
    targets.forEach(p=>board[p]='P1');events.push({power:'P1',position:s.position,targets,factor:1,path,passKind:direction?'shot':'pass',...(destination===undefined?{}:{destination}),...(direction?{direction}:{})});
  }
  for(const s of steals)if(s.power==='P2'){
    const requested=rng.next()<.5?1:2;
    const available=neighbors(s.position).filter(p=>board[p]!=='W'&&board[p]!=='S'),targets:number[]=[];
    for(let i=0;i<requested&&available.length;i++)targets.push(available.splice(index(available.length,rng),1)[0]);
    targets.forEach(p=>board[p]='W');events.push({power:'P2',position:s.position,targets,factor:1,requested});
  }
  // One destination shared by Maestro activations; P3 must visibly change.
  const conversionSymbol:SymbolId|null=steals.some(s=>s.power==='P3')?(['P1','P2','P4'] as const)[index(3,rng)]:null;
  const sources=new Set(steals.filter(s=>s.power==='P3').map(s=>s.source!));
  const converted=new Set<number>();
  for(const s of steals)if(s.power==='P3'){
    const sourceTargets=s.source!==null&&board[s.source]!=='W'&&!converted.has(s.source)?[s.source]:[];
    sourceTargets.forEach(p=>{board[p]=conversionSymbol!;converted.add(p);});
    const available=board.flatMap((v,p)=>v!=='W'&&!converted.has(p)&&!sources.has(p)?[p]:[]),targets:number[]=[...sourceTargets];
    const requested=c.conversionMin+pick(c.conversionWeights,rng);
    for(let k=0;k<requested&&available.length;k++){const p=available.splice(index(available.length,rng),1)[0];board[p]=conversionSymbol!;targets.push(p);converted.add(p);}
    events.push({power:'P3',position:s.position,targets,factor:1,requested,sourceTargets,conversionSymbol:conversionSymbol!});
  }
  for(const s of steals)if(s.power==='P4'){const factor=c.overloadValues[pick(c.overloadWeights,rng)];global+=factor;events.push({power:'P4',position:s.position,targets:[],factor,operation:'add'});}
  return {board,amplified,global,steals,events};
}
