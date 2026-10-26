import {config,type Config,type Mode,type SymbolId} from './config.ts';
import {index,pick,type Random} from './random.ts';
import type {Board} from './board.ts';
export function neighbors(pos:number){const out:number[]=[];if(pos>=6)out.push(pos-6);if(pos<18)out.push(pos+6);if(pos%6>0)out.push(pos-1);if(pos%6<5)out.push(pos+1);return out;}
export function resolve(initial:Board,mode:Mode,rng:Random,c:Config=config,initialGlobal=1){
  const board=[...initial],amplified=new Set<number>();
  const steals:{position:number;eligible:number[];source:number|null;power:string|null;success:boolean}[]=[];
  const events:{power:string;position:number;targets:number[];factor:number;requested?:number;conversionSymbol?:SymbolId;operation?:'add'|'multiply'}[]=[];
  let global=initialGlobal;
  for(let p=0;p<24;p++)if(initial[p]==='W'){
    const eligible=neighbors(p).filter(n=>initial[n].startsWith('P'));
    let source:number|null=null,power:string|null=null;
    if(eligible.length){source=eligible[index(eligible.length,rng)];if(rng.next()*100<c.steal[mode])power=initial[source];}
    steals.push({position:p,eligible,source,power,success:power!==null});
  }
  for(const s of steals)if(s.power==='P1'){amplified.add(s.position);events.push({power:'P1',position:s.position,targets:[s.position],factor:2});}
  for(const s of steals)if(s.power==='P2'){
    const targets=[s.position-6,s.position+6].filter(p=>p>=0&&p<24&&board[p]!=='W'&&board[p]!=='S');
    targets.forEach(p=>board[p]='W');events.push({power:'P2',position:s.position,targets,factor:1});
  }
  // One uniform premium choice shared by all Maestro activations in this spin.
  const conversionSymbol:SymbolId|null=steals.some(s=>s.power==='P3')?(['P1','P2','P3','P4'] as const)[index(4,rng)]:null;
  const converted=new Set<number>();
  for(const s of steals)if(s.power==='P3'){
    const available=board.flatMap((v,p)=>v!=='W'&&!converted.has(p)?[p]:[]),targets:number[]=[];
    const requested=c.conversionMin+pick(c.conversionWeights,rng);
    for(let k=0;k<requested&&available.length;k++){const p=available.splice(index(available.length,rng),1)[0];board[p]=conversionSymbol!;targets.push(p);converted.add(p);}
    events.push({power:'P3',position:s.position,targets,factor:1,requested,conversionSymbol:conversionSymbol!});
  }
  for(const s of steals)if(s.power==='P4'){const factor=c.overloadValues[pick(c.overloadWeights,rng)];global+=factor;events.push({power:'P4',position:s.position,targets:[],factor,operation:'add'});}
  return {board,amplified,global,steals,events};
}
