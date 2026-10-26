import {BETS,BY_ID,type Bet} from './engine';
export interface Point {x:number;y:number}
/** Same canonical catalogue drives hit areas, coverage preview and physical chip anchors. */
export class BoardLayout {
  private points=new Map<string,Point>();
  constructor(private surface:HTMLElement){}
  layout(){
    const root=this.surface.getBoundingClientRect();
    const rect=(n:number)=>this.surface.querySelector<HTMLElement>(`[data-number="${n}"]`)!.getBoundingClientRect();
    const center=(n:number)=>{const r=rect(n);return {x:r.left+r.width/2-root.left,y:r.top+r.height/2-root.top};};
    const zero=rect(0),last=rect(1),strip=last.bottom-root.top+12;
    this.points.clear();
    for(const b of BETS){
      let p:Point;
      const region=this.surface.querySelector<HTMLElement>(`[data-region="${b.id}"]`);
      if(region){const r=region.getBoundingClientRect();p={x:r.left+r.width*.5-root.left,y:r.top+r.height*.63-root.top};}
      else if(b.kind==='straight'){p=center(b.numbers[0]);p.y+=8;}
      else if(b.kind==='street'&&b.numbers.includes(0)){const a=rect(b.numbers[1]),c=rect(b.numbers[2]);p={x:zero.right-root.left,y:(Math.min(a.bottom,c.bottom)+Math.max(a.top,c.top))/2-root.top};}
      else if(b.kind==='corner'&&b.numbers.includes(0))p={x:zero.right-root.left,y:strip};
      else if(b.kind==='split'&&b.numbers[0]===0){const c=center(b.numbers[1]);p={x:zero.right-root.left,y:c.y};}
      else if(b.kind==='street'||b.kind==='six'){const ns=b.numbers.map(center);p={x:ns.reduce((s,c)=>s+c.x,0)/ns.length,y:strip};}
      else{const ns=b.numbers.map(center);p={x:ns.reduce((s,c)=>s+c.x,0)/ns.length,y:ns.reduce((s,c)=>s+c.y,0)/ns.length};}
      this.points.set(b.id,p);
    }
    const layer=this.surface.querySelector<HTMLElement>('.combination-hits')!;
    layer.innerHTML=BETS.filter(b=>['split','street','corner','six'].includes(b.kind)).map(b=>{const p=this.points.get(b.id)!;return `<button class="bet-junction junction-${b.kind}" data-bet-id="${b.id}" aria-label="${b.label}" title="${b.label} · ${b.numbers.join('/')} · lucro ${b.multiplier-1}:1" tabindex="-1" style="left:${p.x}px;top:${p.y}px"></button>`;}).join('');
  }
  point(id:string){const p=this.points.get(id);if(!p)throw new Error(`Âncora de aposta desconhecida: ${id}`);return p;}
  inspect(){return [...this.points].map(([id,p])=>({id,...p,numbers:BY_ID[id].numbers}));}
  covered(id:string){return BY_ID[id]?.numbers||[];}
}
