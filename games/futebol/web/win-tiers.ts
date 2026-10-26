export const winTiers=[
  {x:1,name:'Golo!',key:'goal'},
  {x:3,name:'Belo Golo!',key:'beautiful'},
  {x:5,name:'Golaço!',key:'great'},
  {x:15,name:'Golo de Placa!',key:'plaque'},
  {x:40,name:'Melhor em Campo!',key:'player'},
  {x:100,name:'Campeões!',key:'champions'},
  {x:250,name:'Reis da Europa!',key:'europe'},
  {x:1000,name:'Lenda do Futebol!',key:'legend'},
  {x:10000,name:'Vitória Histórica!',key:'historic'},
] as const;
export function winTierIndex(paid:number,bet:number){let found=-1;for(let i=0;i<winTiers.length;i++)if(paid>=winTiers[i].x*bet)found=i;return found;}
export function winMilestones(paid:number,bet:number){return [...winTiers.filter(t=>t.x>=15&&t.x*bet<paid).map(t=>t.x*bet),paid];}
