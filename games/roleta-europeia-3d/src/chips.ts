import * as THREE from 'three';
import {chipColor as totalColor,chipLabel as totalLabel} from '../shared/chip-design';
import {createChipMaterials,createChipGeometry,createChipInlayMaterial} from '../shared/chip-materials';
import {chipValues} from './chip-model';
import type {Plan,Round} from './engine';
import type {BoardLayout,Point} from './board';
interface Token {key:string;bet:string;value:number;position:THREE.Vector3;from:THREE.Vector3;to:THREE.Vector3;start:number;duration:number;remove:boolean}
interface Batch {body:THREE.InstancedMesh;face:THREE.InstancedMesh;tokens:Token[]}
/** Real cylinders and edge inlays. Each betting position displays its exact aggregate. */
export class RouletteChips {
  private scene=new THREE.Scene();private camera=new THREE.OrthographicCamera();private renderer?:THREE.WebGLRenderer;
  private geometry=createChipGeometry(17.5);private bodyGeo=this.geometry.body;private faceGeo=this.geometry.face;private stripeGeo=this.geometry.stripe;
  private white=createChipInlayMaterial();
  private mats=new Map<number,{body:THREE.Material;face:THREE.Material}>();private batches:Batch[]=[];private stripes?:THREE.InstancedMesh;
  private tokens:Token[]=[];private observer:ResizeObserver;private raf=0;private destroyed=false;private finish?:()=>void;private moving=false;
  private fallback:HTMLElement;private radiusScale=1;private width=1;private height=1;
  constructor(private surface:HTMLElement,private layout:BoardLayout){
    this.scene.add(new THREE.HemisphereLight(0xfff2d1,0x21332b,2.3));const light=new THREE.DirectionalLight(0xffdcaa,3);light.position.set(-300,800,500);this.scene.add(light);
    this.fallback=document.createElement('div');this.fallback.className='chip-fallback-layer';this.fallback.setAttribute('aria-hidden','true');surface.append(this.fallback);
    try{this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setClearColor(0,0);this.renderer.domElement.className='physical-chip-canvas';this.renderer.domElement.setAttribute('aria-hidden','true');surface.append(this.renderer.domElement);}catch{surface.classList.add('chips-in-2d');}
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(surface);this.resize();
  }
  private resize(){if(this.destroyed)return;this.width=this.surface.clientWidth;this.height=this.surface.clientHeight;this.radiusScale=this.width<650?.94:1;this.camera.left=-this.width/2;this.camera.right=this.width/2;this.camera.top=this.height/2;this.camera.bottom=-this.height/2;this.camera.near=.1;this.camera.far=5000;this.camera.position.set(0,1500,750);this.camera.lookAt(0,0,0);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();this.renderer?.setSize(this.width,this.height);this.reflow();}
  reflow(){if(this.destroyed)return;const now=performance.now();this.tokens.forEach((t,i)=>{const target=t.remove?this.source():this.target(t.bet,this.offsetIndex(t,i));if(this.moving&&t.duration){const remaining=Math.max(1,t.start+t.duration-now);t.from=t.position.clone();t.to=target;t.start=now;t.duration=remaining;}else{t.position.copy(target);t.to=target;}});this.draw();}
  private offsetIndex(t:Token,index:number){return this.tokens.slice(0,index).filter(x=>x.bet===t.bet).length;}
  private world(p:Point){const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(p.x/this.width*2-1,-p.y/this.height*2+1),this.camera);return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3())||new THREE.Vector3();}
  private target(id:string,index:number){const p=this.layout.point(id),pos=this.world({x:p.x+Math.floor(index/10)*14*this.radiusScale,y:p.y});pos.y=index%10*3.1*this.radiusScale+1.6;return pos;}
  private source(){return this.world({x:this.width*.5,y:-35});}
  private materials(value:number){if(!this.mats.has(value))this.mats.set(value,createChipMaterials(value));return this.mats.get(value)!;}
  private rebuild(){for(const b of this.batches){this.scene.remove(b.body,b.face);b.body.dispose();b.face.dispose();}this.batches=[];const used=new Set(this.tokens.map(t=>t.value));for(const [value,m]of this.mats){if(!used.has(value)){m.body.dispose();(m.face as THREE.MeshStandardMaterial).map?.dispose();m.face.dispose();this.mats.delete(value);}}if(this.stripes){this.scene.remove(this.stripes);this.stripes.dispose();this.stripes=undefined;}
    const groups=new Map<number,Token[]>();for(const t of this.tokens){const g=groups.get(t.value)||[];g.push(t);groups.set(t.value,g);}for(const [value,tokens]of groups){const m=this.materials(value),body=new THREE.InstancedMesh(this.bodyGeo,m.body,tokens.length),face=new THREE.InstancedMesh(this.faceGeo,m.face,tokens.length);body.frustumCulled=face.frustumCulled=false;this.scene.add(body,face);this.batches.push({body,face,tokens});}
    if(this.tokens.length){this.stripes=new THREE.InstancedMesh(this.stripeGeo,this.white,this.tokens.length*8);this.stripes.frustumCulled=false;this.scene.add(this.stripes);}this.draw();
  }
  private draw(){if(this.destroyed)return;const object=new THREE.Object3D(),scale=this.radiusScale;let stripeIndex=0;
    for(const b of this.batches){b.tokens.forEach((t,i)=>{object.position.copy(t.position);object.rotation.set(0,(i%5)*.17,0);object.scale.setScalar(scale);object.updateMatrix();b.body.setMatrixAt(i,object.matrix);object.position.y+=this.geometry.faceY*scale;object.rotation.set(-Math.PI/2,0,0);object.updateMatrix();b.face.setMatrixAt(i,object.matrix);for(let j=0;j<8;j++){const a=j*Math.PI/4+(i%5)*.17;object.position.copy(t.position).add(new THREE.Vector3(Math.sin(a)*this.geometry.stripeRadius*scale,0,Math.cos(a)*this.geometry.stripeRadius*scale));object.rotation.set(0,a,0);object.updateMatrix();this.stripes?.setMatrixAt(stripeIndex++,object.matrix);}});b.body.instanceMatrix.needsUpdate=b.face.instanceMatrix.needsUpdate=true;}
    if(this.stripes)this.stripes.instanceMatrix.needsUpdate=true;this.renderer?.render(this.scene,this.camera);
    if(!this.renderer){this.fallback.innerHTML=this.tokens.map(t=>{const p=t.position.clone().project(this.camera);return `<span class="fallback-chip" style="left:${(p.x+1)*this.width/2}px;top:${(1-p.y)*this.height/2}px;background:${totalColor(t.value)}">${totalLabel(t.value)}</span>`;}).join('');}
  }
  sync(plan:Plan,animate=false){if(this.destroyed)return;if(this.moving)this.finish?.();const old=new Map(this.tokens.map(t=>[t.key,t]));const now=performance.now(),next:Token[]=[];
    for(const [id,amount]of Object.entries(plan)){
      if(!Number.isSafeInteger(amount)||amount<0)throw new Error('Valor de fichas inválido');if(!amount)continue;
      const key=id,to=this.target(id,0),prior=old.get(key);
      if(prior&&prior.value===amount){prior.to=to;prior.position.copy(to);prior.duration=0;prior.remove=false;next.push(prior);}
      else{const from=animate?prior?.position.clone()||this.world({x:this.layout.point(id).x,y:this.height+30}):to.clone();next.push({key,bet:id,value:amount,position:from.clone(),from,to,start:now,duration:animate?360:0,remove:false});}
    }
    this.tokens=next;this.rebuild();if(animate&&this.tokens.some(t=>t.duration))void this.animate();
  }
  private animate(signal?:AbortSignal):Promise<void>{this.moving=true;return new Promise(resolve=>{
    const finish=()=>{cancelAnimationFrame(this.raf);this.tokens=this.tokens.filter(t=>!t.remove);for(const t of this.tokens){t.position.copy(t.to);t.duration=0;}this.moving=false;this.finish=undefined;signal?.removeEventListener('abort',finish);this.rebuild();resolve();};this.finish=finish;
    const frame=(time:number)=>{if(this.destroyed||signal?.aborted){finish();return;}let active=false;for(const t of this.tokens){if(!t.duration)continue;const p=Math.max(0,Math.min(1,(time-t.start)/t.duration));t.position.lerpVectors(t.from,t.to,p*p*(3-2*p));t.position.y+=Math.sin(p*Math.PI)*25;if(p<1)active=true;}this.draw();if(active)this.raf=requestAnimationFrame(frame);else finish();};signal?.addEventListener('abort',finish,{once:true});if(signal?.aborted)finish();else this.raf=requestAnimationFrame(frame);
  });}
  async collect(round:Round,reduced:boolean,signal:AbortSignal){this.finish?.();const losing=new Set(round.lines.filter(l=>!l.won).map(l=>l.id));const now=performance.now();for(const t of this.tokens){t.from=t.position.clone();t.to=losing.has(t.bet)?this.source():t.position.clone();t.start=now;t.duration=losing.has(t.bet)?reduced?100:650:0;t.remove=losing.has(t.bet);}await this.animate(signal);}
  async pay(round:Round,reduced:boolean,signal:AbortSignal){this.finish?.();const now=performance.now();for(const line of round.lines.filter(l=>l.won)){const current=this.tokens.filter(t=>t.bet===line.id).length;chipValues(line.gross-line.stake).forEach((value,i)=>{const from=this.source();this.tokens.push({key:`return:${round.id}:${line.id}:${i}`,bet:line.id,value,position:from.clone(),from,to:this.target(line.id,current+i),start:now+i%5*18,duration:reduced?120:820,remove:false});});}this.rebuild();await this.animate(signal);if(!this.destroyed)this.sync(Object.fromEntries(round.lines.filter(l=>l.won).map(l=>[l.id,l.gross])));}
  inspect(){const normals=new Map<string,number[]>(),matrix=new THREE.Matrix4();for(const b of this.batches)b.tokens.forEach((t,i)=>{b.face.getMatrixAt(i,matrix);normals.set(t.key,new THREE.Vector3(0,0,1).transformDirection(matrix).toArray());});return this.tokens.map(t=>({bet:t.bet,value:t.value,label:totalLabel(t.value),faceNormal:normals.get(t.key),position:t.position.toArray(),moving:this.moving}));}
  report(){return {renderer:this.renderer?'WebGL':'2D fallback',tokens:this.tokens.length,drawCalls:this.renderer?.info.render.calls||0,geometries:this.renderer?.info.memory.geometries||0,textures:this.renderer?.info.memory.textures||0};}
  destroy(){if(this.destroyed)return;this.finish?.();this.destroyed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();for(const b of this.batches){b.body.dispose();b.face.dispose();}this.stripes?.dispose();this.bodyGeo.dispose();this.faceGeo.dispose();this.stripeGeo.dispose();this.white.dispose();for(const m of this.mats.values()){m.body.dispose();(m.face as THREE.MeshStandardMaterial).map?.dispose();m.face.dispose();}this.renderer?.dispose();this.renderer?.domElement.remove();this.fallback.remove();}
}
