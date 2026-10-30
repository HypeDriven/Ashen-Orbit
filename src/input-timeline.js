export const INPUT_LEAD_SECONDS=.032;
export const neutralFlight=()=>({steering:true,turn:0,strafe:0,thrust:0,x:0,y:0,aim:null,fire:false,boost:false,tractor:false});
export function encodeFlightEvent(e){const m=e.controls;return [e.at,e.seq,m.steering?1:0,m.turn||0,m.strafe||0,m.thrust||0,m.x||0,m.y||0,m.aim??null,m.fire?1:0,m.boost?1:0,m.tractor?1:0,m.target??null,m.brake?1:0,m.voiceLevel||0];}
export function decodeFlightEvent(e){return {at:e[0],seq:e[1],controls:{steering:!!e[2],turn:e[3],strafe:e[4],thrust:e[5],x:e[6],y:e[7],aim:e[8],fire:!!e[9],boost:!!e[10],tractor:!!e[11],target:e[12]??null,brake:!!e[13],voiceLevel:e[14]||0}};}
export class InputTimeline {
 constructor(){this.queue=[];this.recent=[];this.held=neutralFlight();this.seq=0;}
 capture(seq,controls,localTime,serverTime){const event={seq,controls:{...controls},at:localTime+INPUT_LEAD_SECONDS};this.queue.push(event);this.recent.push({...event,at:serverTime+INPUT_LEAD_SECONDS});if(this.recent.length>8)this.recent.shift();}
 advance(start,end,apply){let cursor=start;while(this.queue.length&&this.queue[0].at<=end+1e-9){const e=this.queue.shift(),at=Math.max(cursor,e.at);if(at>cursor)apply(at-cursor,this.held,this.seq);this.held=e.controls;this.seq=e.seq;cursor=at;}if(end>cursor)apply(end-cursor,this.held,this.seq);}
 events(){return this.recent.map(encodeFlightEvent);}
}
export function projectPilotMotion(sample,meta,age,integrate){
 const p={...sample};if(!meta.flightSpec||!meta.intent){p.x+=(p.vx||0)*age;p.y+=(p.vy||0)*age;p.a+=(p.av||0)*age;return p;}
 let cursor=sample.time,controls=meta.intent.controls;const end=cursor+age;
 for(const e of meta.pending||[]){if(e.at<=cursor){controls=e.controls;continue;}if(e.at>end)break;integrate(p,e.at-cursor,controls,{speed:meta.flightSpec[0],turn:meta.flightSpec[1]});cursor=e.at;controls=e.controls;}
 if(end>cursor)integrate(p,end-cursor,controls,{speed:meta.flightSpec[0],turn:meta.flightSpec[1]});return p;
}
