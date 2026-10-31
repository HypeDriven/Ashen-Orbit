import {InputTimeline,projectPilotMotion} from './input-timeline.js';
import {integratePilotThrust,stepPilotMovement} from './universe-rules.js';

const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const pose=p=>({x:p.x,y:p.y,a:p.a,vx:p.vx||0,vy:p.vy||0,av:p.av||0});
const discontinuity=(a,b)=>a.id!==b.id||a.faction!==b.faction||a.hull!==b.hull||a.role!==b.role||a.spawnSeq!==b.spawnSeq||(a.hp>0)!==(b.hp>0)||Math.hypot(a.x-b.x,a.y-b.y)>300;
const blend=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,a:a.a+angleDelta(b.a,a.a)*t,vx:a.vx+(b.vx-a.vx)*t,vy:a.vy+(b.vy-a.vy)*t});

export class FlightPrediction {
 constructor(){this.reset();}
 reset(){this.clock=0;this.sequence=0;this.history=[];this.local=null;this.error={x:0,y:0,a:0};this.remote=new Map();this.latestTime=-1;this.arrival=0;this.renderTime=null;this.shared=true;this.timeline=new InputTimeline();this.appliedInput=this.timeline.held;this.oneWay=0;this.lastAck=0;}
 receive(s,serverTime,shared,partial=false,updatedIds=null){
  // Command replies can repeat a tick; an older frame cannot rewind motion.
  if(serverTime<this.latestTime)return;
  const first=this.local===null,old=s.player;
  const changed=first||this.shared!==shared||(this.local.id!==old.id||this.local.faction!==old.faction||this.local.hull!==old.hull||this.local.role!==old.role||this.local.spawnSeq!==old.spawnSeq||(this.local.hp>0)!==(old.hp>0)||!shared&&Math.hypot(this.local.x-old.x,this.local.y-old.y)>300);
  const display=this.display;
  if((old.inputAck||0)>this.lastAck){const sent=this.history.find(f=>f.seq===old.inputAck);if(sent){const lag=Math.min(.1,Math.max(0,(this.clock-sent.at)*.5));this.oneWay=this.oneWay*.75+lag*.25;}this.lastAck=old.inputAck;}

  this.shared=shared;this.sequence=Math.max(this.sequence,old.inputAck||0);
  if(changed){this.timeline=new InputTimeline();this.appliedInput=this.timeline.held;this.history=[];this.error={x:0,y:0,a:0};}
  else if(Number.isFinite(old.inputAck))this.history=this.history.filter(f=>f.seq>old.inputAck);
  else this.history=[]; // Compatible with a session running an older server.
  const keepLocal=!changed&&shared&&old.authority===1&&old.correctionSeq===this.local.correctionSeq;
  if(keepLocal){this.local={...old,...pose(this.local)};this.error={x:0,y:0,a:0};}
  else{this.local={...old};
   if(!changed){
    let remaining=.5;
    for(let i=this.history.length-1;i>=0;i--){remaining-=this.history[i].dt;if(remaining<0){this.history.splice(0,i+1);break;}}
    for(const frame of this.history)stepPilotMovement(this.local,frame.dt,frame.input,s.rocks,shared);
    if(display)this.error={x:display.x-this.local.x,y:display.y-this.local.y,a:angleDelta(display.a,this.local.a)};
   }
  }
  if(first||serverTime>this.latestTime){this.latestTime=serverTime;this.arrival=this.clock;}
  if(first)this.renderTime=serverTime-.08;
  const present=new Set();
  for(const ship of s.ships){if(ship===s.player||partial&&(!ship.pilot||updatedIds&&!updatedIds.has(ship.id)))continue;present.add(ship.id);let track=this.remote.get(ship.id);
   if(!track||discontinuity(track.meta,ship)){track={meta:{...ship},samples:[],arrived:this.clock,error:{x:0,y:0,a:0},display:null};this.remote.set(ship.id,track);}
   const sample={...pose(ship),time:serverTime};const last=track.samples.at(-1);
   if(last?.time===serverTime)track.samples[track.samples.length-1]=sample;else track.samples.push(sample);
   if(shared&&(!last||serverTime>last.time)){
    const lead=this.oneWay,oldDisplay=track.display,projected=projectPilotMotion(sample,ship,lead,integratePilotThrust);
    track.arrived=this.clock;track.error=oldDisplay?{x:oldDisplay.x-projected.x,y:oldDisplay.y-projected.y,a:angleDelta(oldDisplay.a,projected.a)}:{x:0,y:0,a:0};
   }
   if(track.samples.length>12)track.samples.shift();track.meta={...ship};
  }
  // Hidden cloaked enemies and destroyed/despawned ships disappear immediately.
  for(const id of this.remote.keys())if(!partial&&!present.has(id))this.remote.delete(id);
  this.write(s);
 }
 applyProfile(profile){if(this.local)Object.assign(this.local,profile);}
 report(){if(!this.local)return null;return {...pose(this.local),a:Math.atan2(Math.sin(this.local.a),Math.cos(this.local.a)),spawnSeq:this.local.spawnSeq};}
 get display(){return this.local?{x:this.local.x+this.error.x,y:this.local.y+this.error.y,a:this.local.a+this.error.a}:null;}
 step(dt,input,s){
  const start=this.clock;this.clock+=dt;if(!this.local)return this.sequence;
  const seq=++this.sequence,serverTime=this.latestTime+(start-this.arrival)+this.oneWay;
  this.timeline.capture(seq,input,start,serverTime);
  this.timeline.advance(start,this.clock,(span,held,eventSeq)=>{
   if(this.local.hp>0&&this.clock-this.arrival<(this.shared?1:.5)){
    this.history.push({seq:eventSeq,dt:span,at:this.clock,input:{...held}});if(this.history.length>240)this.history.shift();
    stepPilotMovement(this.local,span,held,s.rocks,this.shared);
   }
  });this.appliedInput=this.timeline.held;
  const decay=Math.exp(-dt*14);this.error.x*=decay;this.error.y*=decay;this.error.a*=decay;
  const target=this.latestTime+(this.clock-this.arrival)-.08;
  if(this.renderTime!==null)this.renderTime+=dt+Math.max(-dt*.5,Math.min(dt*.5,(target-this.renderTime)*dt*6));
  for(const track of this.remote.values()){if(track.error){track.error.x*=decay;track.error.y*=decay;track.error.a*=decay;}}
  this.write(s);return seq;
 }
 write(s){
  const display=this.display;if(display)Object.assign(s.player,display,{vx:this.local.vx,vy:this.local.vy,av:this.local.av,thrusting:this.local.thrusting});
  for(const ship of s.ships){if(ship===s.player)continue;const track=this.remote.get(ship.id);if(!track)continue;
   const samples=track.samples,time=this.renderTime;
   if(this.shared){
    const last=samples.at(-1),previous=samples.at(-2),span=previous?last.time-previous.time:0;
    const vx=last.vx||(!ship.pilot&&span>0?(last.x-previous.x)/span:0),vy=last.vy||(!ship.pilot&&span>0?(last.y-previous.y)/span:0);
    const av=last.av||(!ship.pilot&&span>0?angleDelta(last.a,previous.a)/span:0),age=Math.min(.25,Math.max(0,this.clock-track.arrived+this.oneWay));
    const predicted=projectPilotMotion({...last,vx,vy,av},track.meta,age,integratePilotThrust);const result={...predicted,x:predicted.x+track.error.x,y:predicted.y+track.error.y,a:predicted.a+track.error.a};
    track.display={...result};Object.assign(ship,pose(result));continue;
   }
   let result=samples[0];
   for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i];if(time<=b.time){result=blend(a,b,Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time||1))));break;}result=b;}
   const last=samples.at(-1);
   if(time>last.time){const extra=Math.min(.15,time-last.time),previous=samples.at(-2),span=previous?last.time-previous.time:0;
    // NPCs in older snapshots do not carry velocity; derive it from samples.
    const vx=last.vx||(!ship.pilot&&span>0?(last.x-previous.x)/span:0),vy=last.vy||(!ship.pilot&&span>0?(last.y-previous.y)/span:0);
    result={...last,x:last.x+vx*extra,y:last.y+vy*extra};
   }
   Object.assign(ship,pose(result));
  }
 }
}
