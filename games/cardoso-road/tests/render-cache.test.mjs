import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBitmapCache} from '../render-cache.mjs';
const image={naturalWidth:800,naturalHeight:800};
function setup(maxBytes){let renders=0;const cache=createBitmapCache({maxBytes,createSurface:()=>({getContext:()=>({drawImage(){renders++;}})})});return {cache,renders:()=>renders};}
test('alternating presentation sizes and densities reuse earlier bitmaps',()=>{
 const {cache,renders}=setup(8*1024*1024),small=cache.get(image,160,1),large=cache.get(image,160,2);
 assert.notEqual(small,large);for(let i=0;i<100;i++){assert.equal(cache.get(image,160,1),small);assert.equal(cache.get(image,160,2),large);}
 assert.equal(renders(),2);assert.equal(cache.get(image,159,2),large,'nearby sizes share a resolution bucket');
 assert.equal(large.scaleX,large.surface.width/800);assert.equal(large.scaleY,large.surface.height/800);
});
test('cache evicts least recently used variants and stays within its pixel budget',()=>{
 const {cache}=setup(350000),first=cache.get(image,160),second=cache.get(image,192);cache.get(image,160);
 const third=cache.get(image,224);assert.equal(second.surface.width,0);assert.equal(cache.get(image,160),first);assert.equal(cache.get(image,224),third);assert.ok(cache.inspect().bytes<=350000);
 const huge=cache.get({naturalWidth:10000,naturalHeight:10000},10000,2);assert.ok(huge.cost<=350000);assert.ok(cache.inspect().bytes<=350000);
});
test('unloaded images do not allocate cached surfaces',()=>{const {cache,renders}=setup(1000);assert.equal(cache.get({naturalWidth:0,naturalHeight:0},100),null);assert.equal(renders(),0);});
