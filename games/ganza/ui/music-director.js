// Independent recordings crossfade as complete cues, never as synchronized stems.
export class MusicDirector{
 constructor(context,bus,tracks,stingers,config={}){
  this.ctx=context;this.bus=bus;this.tracks=tracks;this.stingers=stingers;this.config=config;this.highUntil=0;this.activityUntil=0;this.stingerUntil=0;this.stingerPriority=0;this.active='base';this.fade=config.crossfadeSeconds||1.2;
  for(const track of tracks){track.gain=context.createGain();track.gain.connect(bus);track.gain.gain.value=0;track.target=0;track.source=null;track.start=null;}
  this.transition('base');
 }
 level(track,value,duration=this.fade){if(track.target===value)return;track.target=value;const now=this.ctx.currentTime,param=track.gain.gain;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else{param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);}param.linearRampToValueAtTime(value,now+duration);}
 start(track){if(track.source)return;const source=this.ctx.createBufferSource();source.buffer=track.buffer;source.loop=true;source.connect(track.gain);track.source=source;track.start=this.ctx.currentTime;source.start();}
 transition(name){if(!this.tracks.some(t=>t.name===name))name='base';this.active=name;for(const track of this.tracks){const audible=track.name===name;if(audible||track.name==='base')this.start(track);this.level(track,audible?1:0);}}
 update(plates,auto){const now=this.ctx.currentTime;if(plates>1||auto)this.activityUntil=now+3;const target=now<this.stingerUntil?'stinger':now<this.highUntil?'high':now<this.activityUntil?'activity':'base';
  if(target==='stinger'){this.active=target;for(const t of this.tracks)this.level(t,0,.25);}else if(target!==this.active)this.transition(target);
  for(const track of this.tracks)if(track.name!=='base'&&track.source&&track.target===0&&track.gain.gain.value<.001){track.source.stop();track.source.disconnect();track.source=null;}
 }
 celebrate(multiplier){const now=this.ctx.currentTime;if(multiplier>=1000)this.highUntil=now+(this.config.highSeconds||24);const key=multiplier===999900?'stinger-carga':multiplier>=10000?'stinger-max':null,priority=multiplier===999900?3:2,buffer=this.stingers[key]?.[0];
  if(!buffer||now<this.stingerUntil&&priority<=this.stingerPriority)return;
  if(this.stinger){const old=this.stinger;old.gain.gain.cancelScheduledValues(now);old.gain.gain.setTargetAtTime(0,now,.04);old.source.stop(now+.2);}
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.connect(gain);gain.connect(this.bus);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+.06);gain.gain.setValueAtTime(1,now+Math.max(.06,buffer.duration-.3));gain.gain.linearRampToValueAtTime(0,now+buffer.duration);source.start(now);this.stinger={source,gain};this.stingerUntil=now+buffer.duration;this.stingerPriority=priority;source.onended=()=>{source.disconnect();gain.disconnect();if(this.stinger?.source===source)this.stinger=null;};this.update(0,false);
 }
}
