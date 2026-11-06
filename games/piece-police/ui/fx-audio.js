/** Audio adapter. Effects follow the visual clock, music has independent smooth transitions. */
import { AudioBus } from './audio-bus.js';
import { eventSounds, sounds, noteRate } from './audio-catalog.js';
const bus = new AudioBus({music:true});
export const impactEvents = new Set(['grid.drop','grid.refill','power.reality_break','power.slow_motion.start',
  'power.slow_motion.grow','power.rave_rush.move','power.drunk_walk.step','power.one_more_chance.respin',
  'wild.place','corner.open','bonus.trigger']);
export function soundForEvent(e) {
  if(e.type==='persona.awaken')return e.fusion?null:`awaken-${e.persona}`;
  if(e.type==='fusion.trigger')return `fusion-${e.fusionId}`;
  if(e.type==='police.enter')return `${e.mode}-enter`;
  if(e.type==='wild.place')return e.source==='DISTINTIVO'?'joiner-land':'wild-land';
  if(e.type==='bonus.trigger')return `bonus-${{afterparty:'after',vip:'vip',police:'police'}[e.bonusId]}`;
  if(e.type==='win.cluster')return e.pay>=1000?'win-medium':'win-small';
  return eventSounds[e.type]??null;
}
export const audio = {
  volumes:bus.volumes,current:'base',log:null,counting:false,scatterIndex:0,
  play(e,ctx) {
    if(e.type==='bonus.trigger')bus.preloadMusic(e.bonusId);
    if(e.type==='step.start'){this.scatterIndex=0;bus.stop();}
    if(e.type==='safety.stop'){bus.stop();return;}
    if(impactEvents.has(e.type))return;
    if((e.type==='police.enter'&&ctx.persistentPolice)||(e.type==='police.joiner.party_mode'&&ctx.repeatParty&&ctx.persistentPolice))return;
    this.event(e,ctx);
  },
  event(e,ctx={}) {
    const id=soundForEvent(e);if(!id||!sounds[id])return;
    const index=e.type==='chemistry.level'?e.to-1:e.type==='multiplier.change'?Math.min(5,Math.floor(Math.log2(e.to||1))):0;
    bus.play(id,{rate:noteRate(index),pan:e.cell!=null?(Math.floor(e.cell/5)-2)*.22:0,
      interval:ctx.speed==='ultra'&&sounds[id].priority<=2?180:null});
    this.log?.(`som: ${id}`);
  },
  land(grid,indices,ctx,{cascade=false}={}) {
    const scatters=indices.filter(i=>grid[i]==='S');
    const pan=indices.length?(Math.floor(indices[0]/5)-2)*.22:0;
    bus.play(cascade?'cascade-land':'column-land',{pan,interval:ctx.speed==='ultra'?160:70,rate:noteRate(Math.floor((indices[0]||0)/5)),volume:.85});
    if(scatters.length) {
      this.scatterIndex+=scatters.length;
      bus.play('scatter-land',{pan,rate:noteRate(this.scatterIndex-1),interval:0});
    }
  },
  suspense(level) {
    bus.suspense(level);
  },
  ui(name) {bus.play(name);},
  tier(name) {bus.play(`win-${name}`);},
  count(active) {
    this.counting=active;
    if(!active)bus.play('count-end');
  },
  countTick() {if(this.counting)bus.play('count-tick',{interval:110});},
  setVolumes(v) {this.volumes={...this.volumes,...v};bus.setVolumes(this.volumes);},
  mode(mode) {if(mode!==this.current){this.current=mode;this.log?.(`música: ${mode}`);}return bus.setMode(mode);},
  preload(mode) {return bus.preloadMusic(mode);},
  unlock() {return bus.unlock();},
  stop() {bus.stop();this.counting=false;},
  destroy() {bus.destroy();},
  get diagnostics() {return bus.diagnostics;},
};
