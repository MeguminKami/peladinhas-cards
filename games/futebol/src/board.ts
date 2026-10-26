import {config, symbols, type Config, type Mode, type SymbolId} from './config.ts';
import {index,pick,type Random} from './random.ts';
export type Board=SymbolId[];
export function validateBoard(board:Board){if(board.length!==24||board.some(s=>!symbols.includes(s)))throw Error('Tabuleiro deve ter 24 símbolos válidos');}
export function generate(mode:Mode,sticky:number[],rng:Random,c:Config=config,bonusHunt=false):Board{
  const board:Board=Array(24).fill('N1');
  if(mode==='base'){
    const count=pick(bonusHunt?c.huntScatterWeights:c.scatterWeights,rng),cols=[0,1,2,3,4,5];
    for(let i=0;i<count;i++){const col=cols.splice(index(cols.length,rng),1)[0];board[index(4,rng)*6+col]='S';}
  }else{
    const count=pick(c.bonusScatterWeights,rng);
    const columns=Array.from({length:6},(_,col)=>({col,rows:[0,1,2,3].filter(row=>!sticky.includes(row*6+col))})).filter(c=>c.rows.length);
    for(let i=0;i<count&&columns.length;i++){
      const {col,rows}=columns.splice(index(columns.length,rng),1)[0];board[rows[index(rows.length,rng)]*6+col]='S';
    }
  }
  for(let i=0;i<24;i++)if(sticky.includes(i))board[i]='W';else if(board[i]!=='S')board[i]=symbols[pick(c.weights[mode],rng)];
  return board;
}
