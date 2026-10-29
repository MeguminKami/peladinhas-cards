// Bounded LRU: retain multiple display sizes without growing with every resize.
export function createBitmapCache({maxBytes=64*1024*1024,createSurface=()=>document.createElement('canvas')}={}){
 const images=new WeakMap(),recent=new Map();let bytes=0,hits=0,misses=0;
 function get(image,height,density=1){
  const sourceWidth=image.naturalWidth,sourceHeight=image.naturalHeight;
  if(!sourceWidth||!sourceHeight)return null;
  const ratio=Math.min(1,Math.max(32,Math.ceil(Math.abs(height)*density/32)*32)/sourceHeight,Math.sqrt(maxBytes/(4*sourceWidth*sourceHeight)));
  const width=Math.max(1,Math.floor(sourceWidth*ratio)),h=Math.max(1,Math.floor(sourceHeight*ratio)),key=width+'x'+h;
  let versions=images.get(image);if(!versions){versions=new Map();images.set(image,versions);}
  let entry=versions.get(key);
  if(entry){hits++;recent.delete(entry);recent.set(entry,true);return entry;}
  misses++;const cost=width*h*4;
  while(bytes+cost>maxBytes&&recent.size){const oldest=recent.keys().next().value;recent.delete(oldest);oldest.versions.delete(oldest.key);bytes-=oldest.cost;oldest.surface.width=oldest.surface.height=0;}
  const surface=createSurface();surface.width=width;surface.height=h;surface.getContext('2d').drawImage(image,0,0,width,h);
  entry={surface,scaleX:width/sourceWidth,scaleY:h/sourceHeight,cost,key,versions};versions.set(key,entry);recent.set(entry,true);bytes+=cost;return entry;
 }
 return {get,inspect:()=>({bytes,entries:recent.size,hits,misses,maxBytes})};
}
