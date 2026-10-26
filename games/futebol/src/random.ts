export interface Random { next():number; state?():unknown }
// FNV-1a seed hashing followed by Mulberry32, all arithmetic modulo 2^32.
export class SeededRandom implements Random {
  private value:number;
  constructor(seed:string){let h=2166136261;for(const ch of seed){h=Math.imul(h^ch.charCodeAt(0),16777619);}this.value=h>>>0;}
  next(){this.value=(this.value+0x6D2B79F5)>>>0;let t=this.value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
  state(){return this.value;}
  static restore(state:number){if(!Number.isInteger(state)||state<0||state>0xffffffff)throw Error('Estado RNG inválido');const rng=new SeededRandom('');rng.value=state;return rng;}
}
export function pick(weights:readonly number[],rng:Random){let t=rng.next()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){t-=weights[i];if(t<0)return i;}throw Error('RNG/pesos inválidos');}
export function index(length:number,rng:Random){if(length<1)throw Error('Seleção vazia');return Math.floor(rng.next()*length);}
