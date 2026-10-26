export const autoSpinCounts=[10,20,30,40,50,60,70,80,90,100,200,300,400,500] as const;
export function autoSpinCount(index:number){return autoSpinCounts[Math.max(0,Math.min(autoSpinCounts.length-1,Math.round(index)))];}
