import * as THREE from 'three';
import {chipColor,createChipFaceCanvas} from './chip-design';

export function createChipMaterials(value:number){
  const map=new THREE.CanvasTexture(createChipFaceCanvas(value));map.colorSpace=THREE.SRGBColorSpace;
  return {body:new THREE.MeshStandardMaterial({color:chipColor(value),roughness:.4,metalness:.12}),face:new THREE.MeshBasicMaterial({map,toneMapped:false})};
}
export const createChipInlayMaterial=()=>new THREE.MeshStandardMaterial({color:'#f3e4bc',roughness:.5});
/** Identical proportions; each table supplies its own world-unit scale. */
export function createChipGeometry(radius:number){const scale=radius/17.5;return {
  body:new THREE.CylinderGeometry(radius,radius,3*scale,48),face:new THREE.CircleGeometry(16.4*scale,48),stripe:new THREE.BoxGeometry(3.1*scale,3.2*scale,3.3*scale),
  height:3*scale,faceY:1.56*scale,stripeRadius:16.7*scale,
};}
