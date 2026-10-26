import {Stage,THREE,material,cylinder,ring,feltMaterial} from '../shared/scene';
import {ORDER,color,TAU,worldAngle,type Round} from './engine';
export interface SpinPath { rotor:number; angle:number; radius:number; height:number; done:boolean }
/** Continuous unwrapped angles: final pocket shares precisely the rotor transform. */
export function trajectory(progress:number,startRotor:number,startBall:number,number:number):SpinPath {
  const p=Math.max(0,Math.min(1,progress));const ease=1-Math.pow(1-p,3);const rotor=startRotor+TAU*2.4*ease;
  const finalRotor=startRotor+TAU*2.4;let endBall=worldAngle(number,finalRotor);while(endBall>startBall-TAU*5)endBall-=TAU;
  // At p=.8 the ball enters its pocket; both continue moving as one assembly.
  const enter=.8;const enterRotor=startRotor+TAU*2.4*(1-Math.pow(1-enter,3));const enterBall=endBall-(finalRotor-enterRotor);
  const q=Math.min(1,p/enter);const k=1-Math.pow(1-q,3);const angle=p<enter?startBall+(enterBall-startBall)*k:endBall-(finalRotor-rotor);
  const drop=Math.max(0,Math.min(1,(p-.58)/.22));const d=drop*drop*(3-2*drop);
  const launch=Math.min(1,p/.08),lift=launch*launch*(3-2*launch);
  return {rotor,angle,radius:2.45+1.05*lift-1.05*d,height:.33+.4*lift-.4*d+Math.sin(drop*Math.PI*6)*.07*Math.sin(drop*Math.PI),done:p===1};
}
export class RouletteScene extends Stage {
  protected override resize(){super.resize();this.camera.zoom=document.documentElement.hasAttribute('data-casino-fit')?Math.min(1,this.camera.aspect*.85):1;this.camera.updateProjectionMatrix();}
  private rotor=new THREE.Group();private ball:THREE.Mesh;private start=0;private duration=7800;private target?:Round;private restingRotor=0;private restingBall=0;private startBall=0;private startRotor=0;private resolve?:()=>void;onTick?:(progress:number)=>void;
  constructor(container:HTMLElement){super(container);this.camera.position.set(0,9.5,8.6);this.camera.lookAt(0,0,0);
    const table=cylinder(6,.2,feltMaterial('#123a2a'));table.position.y=-.35;this.scene.add(table);
    const wood=cylinder(4.3,.5,material('#352318',.05,.4));wood.position.y=-.02;this.scene.add(wood);
    const rim=ring(3.85,4.3,material('#977b45',.8,.3));rim.position.y=.25;this.scene.add(rim);
    const track=ring(3.13,3.85,material('#4c3424',.2,.3));track.position.y=.28;this.scene.add(track);
    const outerWall=new THREE.Mesh(new THREE.TorusGeometry(3.9,.14,12,120),material('#a88d53',.75,.25));outerWall.rotation.x=Math.PI/2;outerWall.position.y=.4;this.scene.add(outerWall);
    this.scene.add(this.rotor);const bed=cylinder(3.12,.2,material('#a78d54',.7,.35));bed.position.y=.15;this.rotor.add(bed);
    const disk=ring(1.92,3.1,new THREE.MeshStandardMaterial({map:this.wheelTexture(),roughness:.65,metalness:.1}));disk.position.y=.26;this.rotor.add(disk);
    const separatorGeo=new THREE.BoxGeometry(.028,.12,.67),separatorMat=material('#c4ae73',.65,.3);
    const separators=new THREE.InstancedMesh(separatorGeo,separatorMat,37),placement=new THREE.Object3D();for(let i=0;i<37;i++){const a=(i+.5)*TAU/37;placement.position.set(Math.sin(a)*2.47,.32,Math.cos(a)*2.47);placement.rotation.y=a;placement.updateMatrix();separators.setMatrixAt(i,placement.matrix);}this.rotor.add(separators);
    const cone=new THREE.Mesh(new THREE.ConeGeometry(1.95,.45,80),material('#493021',.12,.34));cone.position.y=.48;this.rotor.add(cone);
    const cap=cylinder(.35,.45,material('#c4a76a',.8,.25),40);cap.position.y=.82;this.rotor.add(cap);
    const spindle=new THREE.Mesh(new THREE.SphereGeometry(.17,20,12),material('#deca92',.85,.2));spindle.position.y=1.1;this.rotor.add(spindle);
    this.ball=new THREE.Mesh(new THREE.SphereGeometry(.095,20,14),material('#fff4d7',.12,.18));this.ball.position.set(0,.33,2.45);this.scene.add(this.ball);
    this.update=t=>{if(!this.target)return false;const p=Math.min(1,(t-this.start)/this.duration);const path=trajectory(p,this.startRotor,this.startBall,this.target.number);this.apply(path);this.onTick?.(p);if(path.done){this.restingRotor=path.rotor;this.restingBall=path.angle;this.target=undefined;this.resolve?.();this.resolve=undefined;}return true;};
  }
  private wheelTexture(){const size=2048,c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d')!;const center=size/2;
    // RingGeometry UV: world +Z maps to canvas bottom (v=0); clockwise viewed from above
    // is represented by x=sin(a), z=cos(a), exactly matching pocketAngle and separators.
    ctx.fillStyle='#29392d';ctx.fillRect(0,0,size,size);
    for(let i=0;i<37;i++){const a=i*TAU/37;const start=Math.PI/2-a-TAU/74,end=Math.PI/2-a+TAU/74;ctx.beginPath();ctx.moveTo(center,center);ctx.arc(center,center,size*.495,start,end);ctx.closePath();ctx.fillStyle=color(ORDER[i])==='green'?'#237748':color(ORDER[i])==='red'?'#ac2c3b':'#111e18';ctx.fill();
      ctx.save();ctx.translate(center+Math.sin(a)*size*.444,center+Math.cos(a)*size*.444);ctx.rotate(-a);ctx.fillStyle='#fff1d2';ctx.font='bold 55px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(ORDER[i]),0,0);ctx.restore();}
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }
  private apply(p:SpinPath){this.rotor.rotation.y=p.rotor;this.ball.position.set(Math.sin(p.angle)*p.radius,p.height,Math.cos(p.angle)*p.radius);this.invalidate();}
  restore(number:number,rotor:number){this.restingRotor=rotor;this.restingBall=worldAngle(number,rotor);this.apply({rotor,angle:this.restingBall,radius:2.45,height:.33,done:true});}
  spin(round:Round,reduced=false):Promise<void>{this.startRotor=this.restingRotor;this.startBall=this.restingBall;this.target=round;this.duration=reduced?500:7800;this.start=performance.now();return new Promise(resolve=>{this.resolve=resolve;});}
  skip(){if(!this.target)return;this.start=performance.now()-this.duration;this.invalidate();}
  get angle(){return this.restingRotor;}
  alignment(){return {rotor:this.rotor.rotation.y,ball:this.ball.position.toArray()};}
  override destroy(){this.resolve?.();this.target=undefined;super.destroy();}
}
