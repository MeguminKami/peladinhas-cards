import {money} from './core';
export const CHIP_COLORS:Record<number,string>={1000000:'#6d532b',500000:'#42334f',100000:'#202a2d',50000:'#744337',10000:'#272335',5000:'#2e6660',2500:'#68468b',1000:'#976838',500:'#327157',100:'#943149',50:'#257b89',20:'#345e8b',10:'#9e642d',5:'#805b84',2:'#6a7962',1:'#8b7960'};
const colorValues=Object.keys(CHIP_COLORS).map(Number).sort((a,b)=>b-a);
export const chipColor=(value:number)=>CHIP_COLORS[value]||CHIP_COLORS[colorValues.find(v=>v<=value)||1];
export const chipLabel=(value:number)=>value%100?money(value):String(value/100);
export const SELECTABLE_CHIPS=[20,50,100,500,1000,2500,5000,10000,50000];
export function chipSelectorHTML(selected:number){return SELECTABLE_CHIPS.map(value=>{
  const color=chipColor(value);
  const label=value<100?money(value):String(value/100);
  return `<button class="chip atelier-chip ${selected===value?'selected':''}" data-chip="${value}" aria-pressed="${selected===value}" aria-label="Ficha de ${money(value)}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="46" fill="#080d0b"/><circle cx="50" cy="48" r="44" fill="${color}" stroke="#c4a66b" stroke-width="2"/><circle cx="50" cy="48" r="37" fill="none" stroke="#efe0b2" stroke-width="9" stroke-dasharray="12 16"/><circle cx="50" cy="48" r="30" fill="#14201d" stroke="#e1c384"/><text x="50" y="49" dominant-baseline="middle" text-anchor="middle" fill="#fff7df" font-size="${label.length>3?25:31}" font-family="Atelier Manrope, Arial, sans-serif" font-weight="800">${label}</text></svg></button>`;
}).join('');}

export function createChipFaceCanvas(value:number){
    const color=chipColor(value),c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,256,256);ctx.strokeStyle='#f5e5b7';ctx.lineWidth=14;ctx.setLineDash([20,22]);ctx.beginPath();ctx.arc(128,128,118,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.lineWidth=3;ctx.beginPath();ctx.arc(128,128,89,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#13201c';ctx.beginPath();ctx.arc(128,128,86,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff7df';ctx.textAlign='center';ctx.textBaseline='middle';const text=chipLabel(value);const write=(label:string,y:number,size:number)=>{ctx.font=`800 ${size}px "Atelier Manrope", Arial, sans-serif`;if(ctx.measureText(label).width>199){size*=199/ctx.measureText(label).width;ctx.font=`800 ${size}px "Atelier Manrope", Arial, sans-serif`;}ctx.fillText(label,128,y);};if(text.includes(',')&&text.length>5){const [whole,fraction]=text.split(',');write(whole,106,112);write(','+fraction,180,68);}else write(text,131,116);return c;
}
