// Presentation only. Never used to decide survival, odds or payments.
export const VILLAINS=Object.freeze([
 Object.freeze({id:'oil',name:'Garrafa de óleo',line:'NÃO! ISSO TEM ÓLEO!'}),
 Object.freeze({id:'cake',name:'Bolo de chocolate',line:'SOFIAAAA! FUI APANHADO PELO BOLO!'}),
 Object.freeze({id:'burger',name:'Hambúrguer monstruoso',line:'LÁ SE FOI O SHAPE!'}),
 Object.freeze({id:'fryer',name:'Fritadeira infernal',line:'FUI FRITO!'}),
]);
export const STAGE_VILLAINS=Object.freeze([0,1,2,3,0,1,2,3,0,0]);
export function stageVillain(stage){return STAGE_VILLAINS[Math.max(0,Math.min(9,Math.trunc(stage)||0))];}
export function defeatVillain(round){return round?.status==='lost'?stageVillain(round.step):null;}
export function villainPose(stage,{base,lane,height,mobile,time,reduced}){
 const boss=stage===8;
 const phase=reduced?.4:Math.sin(time*.0016+stage*2)*.5+.5;
 return {type:stageVillain(stage),x:base+(stage+1)*lane+(boss?0:lane*.17),y:height*.59+(boss?0:20+phase*30),size:boss?Math.min(2,lane/65):Math.min(mobile?.6:1.15,lane/120)};
}
export function defeatPose(origin,{playerX,floor,playerHeight,age,reduced}){
 const t=reduced?1:Math.max(0,Math.min(1,age/520)),eased=t*t*(3-2*t);
 return {...origin,x:origin.x+(playerX+playerHeight*.17-origin.x)*eased,y:origin.y+(floor-playerHeight*.13-origin.y)*eased,size:origin.size+(Math.min(1.7,playerHeight/165)-origin.size)*eased,progress:t};
}
