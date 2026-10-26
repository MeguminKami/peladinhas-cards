import type {SpinResult} from '../src/engine.ts';

// Allocate the confirmed payout in cents, including rounding and the round cap.
// This is presentation only: it never settles or modifies a spin.
export function linePrizes(result:SpinResult){
 const lines=result.detail?.lines??[],total=lines.reduce((sum,line)=>sum+BigInt(line.hundredths),0n);
 if(!total)return lines.map(()=>0);
 const shares=lines.map((line,index)=>{const numerator=BigInt(result.paid)*BigInt(line.hundredths);return {index,cents:Number(numerator/total),remainder:numerator%total};});
 let left=result.paid-shares.reduce((sum,share)=>sum+share.cents,0);
 for(const share of [...shares].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1)){if(left--<=0)break;share.cents++;}
 return shares.map(share=>share.cents);
}
