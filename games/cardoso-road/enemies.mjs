// Presentation only. Never used to decide survival, odds or payments.
const names=["Cheeseburger furioso", "Batatas fritas raivosas", "Coxa de frango brutal", "Donut vidrado", "Pizza de pepperoni", "Bolo de chocolate", "Burger de frango frito", "Caranguejo de pizza e batatas", "Serpente de donut e bacon", "Cachorro de queijo", "Golem de bolo e \u00f3leo", "Monstro de frango e waffle", "Hidra de cheeseburgers", "Drag\u00e3o de pizza e frango", "Kraken de donut, bacon e \u00f3leo", "Golem de batatas e queijo", "Ogre de bolo e burger", "Quimera suprema da fritura"];
export const VILLAINS=Object.freeze(names.map((name,index)=>Object.freeze({id:`food-${String(index+1).padStart(2,'0')}`,name,line:["L\u00c1 SE FOI O SHAPE!", "FUI FRITO!", "ISTO TEM \u00d3LEO!"][Math.floor(index/6)],sprite:`assets/villains/food-${String(index+1).padStart(2,'0')}.png`,tier:Math.floor(index/6)+1})));
export const STAGE_VILLAINS=Object.freeze([0,1,2,6,7,8,12,13,14,15]);
function hash(value){let h=2166136261;for(const char of String(value))h=Math.imul(h^char.charCodeAt(0),16777619);h=Math.imul(h^(h>>>16),0x85ebca6b);h=Math.imul(h^(h>>>13),0xc2b2ae35);return (h^(h>>>16))>>>0;}
let cachedId=null,cachedPools=null;
export function stageVillain(stage,round){
 const index=Math.max(0,Math.min(9,Math.trunc(stage)||0)),tier=index<3?0:index<6?1:2;
 if(!round?.id)return STAGE_VILLAINS[index];
 if(cachedId!==round.id){cachedId=round.id;cachedPools=Array.from({length:3},(_,tier)=>Array.from({length:6},(_,i)=>({type:tier*6+i,key:hash(`${round.id}:${tier}:${i}`)})).sort((a,b)=>a.key-b.key||a.type-b.type));}
 const pool=cachedPools[tier];
 return pool[index-(tier===0?0:tier===1?3:6)].type;
}
export function defeatVillain(round){return round?.status==='lost'?stageVillain(round.step,round):null;}
export function villainPose(stage,{base,lane,height,mobile,time,reduced,round}){
 const boss=stage>=6;
 const phase=reduced?.4:Math.sin(time*.0016+stage*2)*.5+.5;
 return {type:stageVillain(stage,round),x:base+(stage+1)*lane+(boss?0:lane*.17),y:height*.59+(boss?0:20+phase*30),size:boss?Math.min(1.55,lane/85):Math.min(mobile?.6:1.15,lane/120)};
}
export function defeatPose(origin,{playerX,floor,playerHeight,age,reduced}){
 const t=reduced?1:Math.max(0,Math.min(1,age/520)),eased=t*t*(3-2*t);
 return {...origin,x:origin.x+(playerX+playerHeight*.17-origin.x)*eased,y:origin.y+(floor-playerHeight*.13-origin.y)*eased,size:origin.size+(Math.min(1.7,playerHeight/165)-origin.size)*eased,progress:t};
}
