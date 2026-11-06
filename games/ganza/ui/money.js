// Same scale as DJABUCOIN.scale in the casino. Never use floating point for wallet arithmetic.
export function toUnits(value){const s=String(value);if(!/^\d{1,5}(?:\.\d{1,2})?$/.test(s))return NaN;const [whole,fraction='']=s.split('.');return Number(whole)*100+Number((fraction+'00').slice(0,2));}
export const formatDjc=value=>new Intl.NumberFormat('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.floor(value)/100);
