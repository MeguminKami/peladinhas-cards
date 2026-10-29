import {config,symbols,type Config} from './config.ts';
import type {Board} from './board.ts';
export interface Win {line:number;symbol:string;length:number;local:number;global:number;hundredths:number;positions:number[]}
// Keep the legacy second argument for callers; 0.9.0 has no local Wild multiplier.
export function evaluate(board:Board,_amplified:Set<number>=new Set(),global=1,c:Config=config,details=true){
  let hundredths=0;const wins:Win[]=[];
  for(let line=0;line<c.lines.length;line++){
    const path=c.lines[line];let best=0,bestLength=0,bestSymbol=0,bestLocal=1;
    for(let s=0;s<8;s++){
      let length=0,local=1;
      for(let col=0;col<6;col++){const p=path[col]*6+col;if(board[p]!==symbols[s]&&board[p]!=='W')break;length++;}
      const pay=length>=3?c.pays[s][length-3]*local*global:0;
      if(pay>best||(pay===best&&length>bestLength)){best=pay;bestLength=length;bestSymbol=s;bestLocal=local;}
    }
    hundredths+=best;
    if(details&&best>0)wins.push({line:line+1,symbol:symbols[bestSymbol],length:bestLength,local:bestLocal,global,hundredths:best,positions:path.slice(0,bestLength).map((r,col)=>r*6+col)});
  }
  return {hundredths,wins};
}
