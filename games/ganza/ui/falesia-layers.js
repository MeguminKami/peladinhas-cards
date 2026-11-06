// Independent painted objects. No results or wallet state enter environment lighting.
const risks=['baixo','medio','alto','extremo'];
export const color=m=>m<50?'#e9a9d8':m<100?'#c2a4ed':m<300?'#75b4ef':m<1000?'#70ddd8':m<10000?'#8ed485':m<100000?'#f5d36e':'#ff987f';
export const layers={
 async load(){
  this.assetLoads=new Map();
  this.loadAsset=async name=>{if(this.images[name])return this.images[name];if(!this.assetLoads.has(name))this.assetLoads.set(name,(async()=>{const image=new Image();image.src=`ui/art/falesia/${name==='actor'?'actor.png':name+'.webp'}`;await image.decode();return this.images[name]=await createImageBitmap(image,{premultiplyAlpha:'premultiply'});})());return this.assetLoads.get(name);};
  this.risk=document.querySelector('#risk').value;
  const portrait=this.canvas.getBoundingClientRect().width<=650;
  await Promise.all(['cliff','actor','buoy','boat','parcel','pergola','ledge','flowers',this.risk+(portrait?'-portrait':'')].map(this.loadAsset));
  this.ready=true;
  // Only the active composition blocks entry. Other paintings decode in the background.
  this.backgroundLoading=(async()=>{for(const risk of risks)for(const suffix of ['', '-portrait'])await this.loadAsset(risk+suffix);})().catch(e=>{this.assetError=e.message;});
 },
 background(risk){
  if(!this.backgrounds)this.backgrounds=new Map();const {w,h,mobile}=this.layout(),name=risk+(mobile?'-portrait':'');
  const image=this.images[name];if(!image){void this.loadAsset(name);return null;}
  if(this.backgrounds.has(name))return this.backgrounds.get(name);
  const make=(from,to)=>{const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.drawImage(image,0,image.height*from,image.width,image.height*(to-from),0,h*from,w,h*(to-from));return canvas;};
  const value={sky:make(0,mobile?.65:.55),coast:make(mobile?.60:.50,mobile?.76:.70),sea:make(mobile?.70:.65,1)};this.backgrounds.set(name,value);return value;
 },
 drawEnvironment(risk,alpha,t){
  const c=this.ctx,g=this.layout(),{w,h,mobile,center,span,top,boatY,scale}=g,bg=this.background(risk);if(!bg)return;
  c.save();c.globalAlpha=alpha;
  // Cache the static painting after resize; animated objects stay independent.
  if(!bg.paint){bg.paint=document.createElement('canvas');bg.paint.width=w;bg.paint.height=h;const d=bg.paint.getContext('2d');d.fillStyle='#167f9d';d.fillRect(0,0,w,h);d.drawImage(bg.sky,0,0);d.drawImage(bg.coast,0,0);d.drawImage(bg.sea,0,0);
   const rockTop=mobile?top-150*scale:-h*.55;
   d.save();d.filter=risk==='alto'?'brightness(.83) saturate(.95) hue-rotate(325deg)':risk==='extremo'?'brightness(.67) saturate(.85) hue-rotate(310deg)':'none';if(mobile)d.drawImage(this.images.cliff,-w*.28,rockTop,w*1.55,(boatY+15*scale-rockTop)/.88);
   else {
    // Recompose the painted coastline without flattening gameplay into the art.
    // Column mapping keeps the dock level and restores the open sunset above the cliff.
    const rock=this.images.cliff,knots=[[0,0,0],[.2,.09,.025],[.4,.16,.045],[.6,.24,.07],[.7,.37,.11],[.8,.51,.28],[.9,.66,.61],[1,.80,.79]];
    const at=(u,k)=>{let n=1;while(n<knots.length-1&&knots[n][0]<u)n++;const a=knots[n-1],b=knots[n];return a[k]+(b[k]-a[k])*(u-a[0])/(b[0]-a[0]);};
    const strips=256;
    for(let i=0;i<strips;i++){const u=(i+.5)/strips,sourceTop=at(u,1),targetTop=at(u,2)*h,dock=boatY+15*scale,dh=(dock-targetTop)/(.88-sourceTop);d.drawImage(rock,i/strips*rock.width,0,rock.width/strips,rock.height,-w*.10+i/strips*w*1.04,targetTop-sourceTop*dh,w*1.04/strips+.6,dh);}
   }d.restore();
   const pw=w*(mobile?.52:.32),ph=pw*this.images.pergola.height/this.images.pergola.width;
   d.drawImage(this.images.pergola,-pw*.09,mobile?45*scale:-ph*.20,pw,ph);

  }
  c.drawImage(bg.paint,0,0);
  if(!this.reduced&&this.quality){c.save();c.globalAlpha=alpha*.13;c.drawImage(bg.sky,Math.sin(t*.07)*4,0);c.restore();}
  // The same stone and board geometry in all four environments.
  // Pergola and ledge are isolated paintings, never a flattened background.
  const pw=w*(mobile?.42:.31),ph=pw*this.images.pergola.height/this.images.pergola.width;
  const level=risks.indexOf(risk);
  if(level){
   const x=pw*.20,y=(mobile?38*scale:0)+ph*.72,r=30*scale;
   const glow=c.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,'#ffd276b0');glow.addColorStop(1,'transparent');c.fillStyle=glow;c.fillRect(x-r,y-r,r*2,r*2);
   if(!this.reduced){c.save();c.globalAlpha=alpha*.10;c.fillStyle='#ffe9a6';c.translate(w*.91,h*(mobile?.66:.55));c.rotate(Math.sin(t*.18)*.30);c.beginPath();c.moveTo(0,0);c.lineTo(-w*.26,-h*.04);c.lineTo(-w*.26,h*.035);c.closePath();c.fill();c.restore();}
  }
  if(level===3&&!this.reduced){
   c.save();c.globalAlpha=alpha*.25;c.strokeStyle='#efc1df';c.lineWidth=scale;c.beginPath();c.moveTo(center+span*.28,top+40*scale);c.bezierCurveTo(center+span*.2,boatY*.6,center+span*.4,boatY*.7,center+span*.3,boatY-40*scale);c.stroke();c.restore();
  }
  if(level===0&&!this.reduced){c.strokeStyle='#fff4d9';c.lineWidth=1.5*scale;for(let i=0;i<3;i++){const x=(w*.75+t*8*scale+i*70*scale)%w,y=h*.15+i*9*scale;c.beginPath();c.moveTo(x-5*scale,y);c.quadraticCurveTo(x-2*scale,y-4*scale,x,y);c.quadraticCurveTo(x+2*scale,y-4*scale,x+5*scale,y);c.stroke();}}
  c.restore();
 },
 actor(x,y,size){
  const c=this.ctx,img=this.images.actor;if(!img)return;const t=this.time,throwAge=t-(this.throwAt??-10000),result=this.result;
  let pose=0;
  if(!this.reduced){if(throwAge>=0&&throwAge<850)pose=throwAge<200?4:5;else if(result)pose=result.round.multiplier>=10000?7:result.round.multiplier>=100?6:1;else {const phase=(t%20000)/1000;pose=phase<6?0:phase<8?1:phase<12?2:phase<14?3:0;}}
  // Crossfade only at pose boundaries; breathing and foot sway are continuous, face stays painted.
  if(this.actorPose!==pose){this.actorPrevious=this.actorPose??pose;this.actorPose=pose;this.actorChange=t;}
  const mix=this.reduced?1:Math.min(1,Math.max(0,(t-this.actorChange)/280));
  const draw=(index,alpha)=>{c.globalAlpha=alpha;const cw=img.width/4,ch=img.height/2;c.drawImage(img,index%4*cw,Math.floor(index/4)*ch,cw,ch,x,y,size,size);};
  c.save();c.filter=this.risk==='alto'?'brightness(.9) hue-rotate(340deg)':this.risk==='extremo'?'brightness(.82) hue-rotate(330deg)':'none';if(!this.reduced){const breath=Math.sin(t*.0018)*size*.002;c.translate(0,breath);if(result?.round.multiplier===999900){c.translate(x+size*.5,y+size);c.rotate(Math.sin(t*.008)*.055);c.translate(-x-size*.5,-y-size);}}
  if(mix<1){
   // Blend on transparent pixels first so overlapping poses do not reveal the rock.
   if(!this.actorBlend){this.actorBlend=document.createElement('canvas');this.actorBlend.width=img.width/4;this.actorBlend.height=img.height/2;}
   const blend=this.actorBlend.getContext('2d'),cw=img.width/4,ch=img.height/2;blend.clearRect(0,0,cw,ch);blend.globalCompositeOperation='source-over';
   for(const [index,alpha]of [[this.actorPrevious,1-mix],[pose,mix]]){blend.globalAlpha=alpha;blend.drawImage(img,index%4*cw,Math.floor(index/4)*ch,cw,ch,0,0,cw,ch);blend.globalCompositeOperation='lighter';}
   c.drawImage(this.actorBlend,x,y,size,size);
  }else draw(pose,1);c.restore();
 },
 boat(x,y,size,bob=0,k=0){
  const c=this.ctx,g=this.layout(),button=document.querySelectorAll('.boat')[k],value=Number(button?.dataset.multiplier||0),t=this.time,hit=this.boatHits?.get(k),age=hit?t-hit.time:10000,active=age<1800,high=active&&hit.multiplier>=10000;
  const tube=color(value),dip=active&&!this.reduced?Math.sin(Math.min(1,age/700)*Math.PI)*size*.10:0,run=high&&!this.reduced?Math.sin(Math.min(1,age/1800)*Math.PI)*size*.4:0;
  c.save();c.translate(x+run,y+dip);c.rotate(bob+(active&&!this.reduced?Math.sin(age*.012)*Math.exp(-age/700)*.08:0));
  c.save();c.globalAlpha=.25;c.fillStyle=tube;for(let i=0;i<4;i++){c.beginPath();c.ellipse(Math.sin(t*.001+i)*size*.04,size*(.28+i*.09),size*(.38-i*.06),size*.025,0,0,7);c.fill();}c.restore();
  if(!this.boatSprites)this.boatSprites=new Map();
  if(!this.boatSprites.has(tube)){
   const rgb=[1,3,5].map(i=>parseInt(tube.slice(i,i+2),16)/255),[red,green,blue]=rgb,max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min;
   const hue=delta===0?0:max===red?60*((green-blue)/delta%6):max===green?60*((blue-red)/delta+2):60*((red-green)/delta+4);
   const sprite=document.createElement('canvas'),original=this.images.boat;sprite.width=256;sprite.height=Math.round(256*original.height/original.width);const d=sprite.getContext('2d');d.filter=`hue-rotate(${hue-180}deg)`;d.drawImage(original,0,0,sprite.width,sprite.height);this.boatSprites.set(tube,sprite);
  }
  const image=this.boatSprites.get(tube),bh=size*1.10;
  c.strokeStyle='#d9bc82';c.lineWidth=Math.max(.7,g.scale);c.beginPath();c.moveTo(0,-bh*.35);c.lineTo(0,-(g.mobile?34:24)*g.scale);c.stroke();
  if(active||value===this.maxMultiplier){c.shadowColor=tube;c.shadowBlur=active?12:4;}
  c.drawImage(image,-size*.48,-bh*.6,size*.96,bh);
  c.shadowBlur=0;
  if(active&&!this.reduced){c.strokeStyle='#d4f8ed';c.lineWidth=g.scale;for(let i=0;i<5;i++){const a=Math.PI*(1+i/4),r=(age%700)/700*size*.6;c.beginPath();c.moveTo(Math.cos(a)*r,size*.2);c.lineTo(Math.cos(a)*r*1.2,size*.2+Math.sin(a)*r*.35);c.stroke();}}
  c.restore();
 },
 drawBuoy(x,y,r,age){
  const c=this.ctx,img=this.images.buoy,hit=age<420,swing=hit&&!this.reduced?Math.sin(age*.023)*Math.exp(-age/160)*.24:0,height=Math.min(r*3.8,this.layout().dy*.96),width=height*img.width/img.height;
  c.save();c.translate(x,y-height*.78);c.rotate(swing);c.fillStyle='#67392340';c.beginPath();c.ellipse(width*.2,height*.88,width*.48,width*.38,0,0,7);c.fill();if(hit){c.shadowColor='#c6ffd6';c.shadowBlur=12;}c.drawImage(img,-width/2,0,width,height);c.restore();
 },
 parcel(x,y,r,rotation,squash){const c=this.ctx,img=this.images.parcel;c.save();c.translate(x,y);c.rotate(rotation);c.scale(1/squash,squash);c.drawImage(img,-r,-r*img.height/img.width,r*2,r*2*img.height/img.width);c.restore();},
 foreground(t){const c=this.ctx,{w,h,mobile,controlY}=this.layout(),size=w*(mobile?.20:.16);c.save();c.translate(w-size,controlY-size*.7);if(!this.reduced)c.rotate(Math.sin(t*.4)*.012);c.drawImage(this.images.flowers,0,0,size,size*this.images.flowers.height/this.images.flowers.width);c.restore();},
};
