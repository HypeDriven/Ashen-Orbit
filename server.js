'use strict';
// BEGIN GENERATED BASE DEFENSES
// Shared deterministic station defenses. This module is inlined into server.js by
// scripts/sync-defenses.mjs so campaign and authoritative missions use the same rules.
function createBaseDefense(){
 var d={shields:[],turrets:[],fighters:[],fx:[]};
 for(var i=0;i<3;i++){var a=-Math.PI/2+i*Math.PI*2/3;d.shields.push({x:Math.cos(a)*215,y:Math.sin(a)*215,r:82,hp:65,max:65,recharge:0,flash:0});}
 for(var j=0;j<2;j++)d.turrets.push({x:j?145:-145,y:-75,a:-Math.PI/2,cd:j*.4});
 for(var k=0;k<6;k++){var angle=k*Math.PI/3,r=130+(k%3)*18;d.fighters.push({x:Math.cos(angle)*r,y:Math.sin(angle)*r,a:angle+Math.PI/2,hp:28,max:28,down:false,cd:k*.13,respawn:0,squad:Math.floor(k/3),slot:k});}
 return d;
}
function baseDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function baseBeam(d,x,y,xx,yy,kind){d.fx.push({x:x,y:y,x2:xx,y2:yy,t:.14,kind:kind});}
function updateBaseDefense(d,dt,time,enemies,bullets,hitEnemy){
 d.fx=d.fx.filter(function(f){f.t-=dt;return f.t>0;});
 d.shields.forEach(function(s){s.flash=Math.max(0,s.flash-dt);s.recharge=Math.max(0,s.recharge-dt);if(s.recharge===0)s.hp=Math.min(s.max,s.hp+dt*5);});
 d.turrets.forEach(function(t){t.cd=Math.max(0,t.cd-dt);if(t.cd>0)return;
  // Only intercept inbound shots that threaten the station's neighborhood.
  var shot=null,dd=300;bullets.forEach(function(b){if(!b.team||b.t<=0)return;var distance=baseDistance(t,b);if(distance<dd&&b.x*b.vx+b.y*b.vy<0){dd=distance;shot=b;}});
  if(shot){t.a=Math.atan2(shot.y-t.y,shot.x-t.x);t.cd=.8;shot.t=-1;baseBeam(d,t.x,t.y,shot.x,shot.y,'pd');return;}
  var target=null;dd=380;enemies.forEach(function(e){var distance=baseDistance(t,e);if(e.hp>0&&Math.hypot(e.x,e.y)<460&&distance<dd){dd=distance;target=e;}});
  if(target){t.a=Math.atan2(target.y-t.y,target.x-t.x);t.cd=1.2;hitEnemy(target,6);baseBeam(d,t.x,t.y,target.x,target.y,'pd');}
 });
 d.fighters.forEach(function(f){
  if(f.hp<=0){if(!f.down){f.down=true;f.respawn=45+f.slot*2;}f.respawn=Math.max(0,f.respawn-dt);if(f.respawn===0){var launch=f.slot*Math.PI/3;f.x=Math.cos(launch)*130;f.y=Math.sin(launch)*130;f.hp=f.max;f.down=false;f.cd=1;}else return;}
  f.cd=Math.max(0,f.cd-dt);var target=null,dd=240;
  enemies.forEach(function(e){var distance=baseDistance(f,e);if(e.hp>0&&Math.hypot(e.x,e.y)<460&&distance<dd){dd=distance;target=e;}});
  var tx,ty;
  if(target){var angle=time*.8+f.slot*Math.PI/3;tx=target.x+Math.cos(angle)*65;ty=target.y+Math.sin(angle)*65;}
  else{var orbit=time*.24+(f.squad?Math.PI:0)+(f.slot%3)*.18;tx=Math.cos(orbit)*(150+f.slot%3*18);ty=Math.sin(orbit)*(150+f.slot%3*18);}
  var length=Math.hypot(tx,ty);if(length>480){tx*=480/length;ty*=480/length;}
  var dx=tx-f.x,dy=ty-f.y,distance=Math.hypot(dx,dy),step=Math.min(distance,dt*145);if(distance>.01){f.a=Math.atan2(dy,dx);f.x+=dx/distance*step;f.y+=dy/distance*step;}
  // A hard leash also protects restored worlds and future faster fighter drives.
  length=Math.hypot(f.x,f.y);if(length>500){f.x*=500/length;f.y*=500/length;}
  if(target&&baseDistance(f,target)<190&&f.cd===0){f.a=Math.atan2(target.y-f.y,target.x-f.x);f.cd=1;hitEnemy(target,2);baseBeam(d,f.x,f.y,target.x,target.y,'fighter');}
 });
 if(d.fx.length>24)d.fx.splice(0,d.fx.length-24);
}
// Earliest entry into a circle, including swept high-speed shots; ships themselves
// can breach the shield, and a shot originating inside a shield is not blocked.
function baseCircleEntry(ax,ay,bx,by,x,y,r){var ox=ax-x,oy=ay-y,dx=bx-ax,dy=by-ay,c=ox*ox+oy*oy-r*r;if(c<0)return 0;var a=dx*dx+dy*dy;if(a===0)return null;var b=2*(ox*dx+oy*dy),disc=b*b-4*a*c;if(disc<0)return null;var t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null;}
function interceptBaseShot(d,b,ax,ay,bx,by){
 if(!b.team||b.t<=0)return false;
 var hits=[];
 d.shields.forEach(function(s){if(s.hp<=0||Math.hypot(ax-s.x,ay-s.y)<s.r)return;var t=baseCircleEntry(ax,ay,bx,by,s.x,s.y,s.r);if(t!==null)hits.push({t:t,shield:s});});
 d.fighters.forEach(function(f){if(f.hp<=0)return;var t=baseCircleEntry(ax,ay,bx,by,f.x,f.y,9);if(t!==null)hits.push({t:t,fighter:f});});
 hits.sort(function(a,b){return a.t-b.t;});
 for(var i=0;i<hits.length;i++){var h=hits[i];if(h.shield){var s=h.shield,absorbed=Math.min(s.hp,b.dmg);s.hp-=absorbed;s.hitX=ax+(bx-ax)*h.t;s.hitY=ay+(by-ay)*h.t;s.recharge=8;s.flash=.2;b.dmg-=absorbed;if(b.dmg<=0){b.t=-1;return true;}}
  else{var f=h.fighter;f.hp=Math.max(0,f.hp-b.dmg);if(f.hp===0){f.down=true;f.respawn=45+f.slot*2;}b.t=-1;return true;}}
 return false;
}
// END GENERATED BASE DEFENSES
// StarHermit authoritative daily salvage and two-pilot PvE missions.
// All motion, damage, collection and score calculations happen here.
function clamp(v,a,b){return Number.isFinite(v)?Math.max(a,Math.min(b,v)):0;}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function cleanMotion(m){if(!m||typeof m!=='object')return null;var result={spawnSeq:Number.isInteger(m.spawnSeq)?m.spawnSeq:-1};['x','y','vx','vy','a','av'].forEach(function(k){result[k]=Number.isFinite(m[k])?m[k]:null;});return result;}
function clean(m){return {steering:m.steering===true,turn:clamp(m.turn,-1,1),strafe:clamp(m.strafe,-1,1),thrust:clamp(m.thrust,-1,1),brake:m.brake===true,x:clamp(m.x,-1,1),y:clamp(m.y,-1,1),aim:Number.isFinite(m.aim)?clamp(m.aim,-Math.PI*2,Math.PI*2):null,fire:m.fire===true,tractor:m.tractor===true,boost:m.boost===true,voiceLevel:clamp(m.voiceLevel,0,1),motion:cleanMotion(m.motion),target:typeof m.target==='string'?m.target.slice(0,64):Number.isFinite(m.target)?m.target:null,seq:Number.isSafeInteger(m.seq)&&m.seq>0?Math.min(2147483647,m.seq):0};}
function acceptPilotInput(p,data,now,simulationTime){
 var m=clean(data);if(m.seq&&m.seq<Math.max(p.inputAck||0,p.input.seq||0,p.lastQueuedSeq||0))return;
 if(Array.isArray(data.events)&&Number.isFinite(simulationTime)){
  p.pendingInputs=p.pendingInputs||[];
  data.events.slice(-8).forEach(function(raw){if(!Array.isArray(raw)||(raw.length<12||raw.length>15)||!Number.isSafeInteger(raw[1])||raw[1]<=Math.max(p.lastQueuedSeq||0,p.inputAck||0)||raw[1]>m.seq||!Number.isFinite(raw[0]))return;
   var e=decodeFlightEvent(raw);e.at=clamp(e.at,simulationTime-.1,simulationTime+.25);e.controls=clean(Object.assign({},e.controls,{seq:e.seq}));p.pendingInputs.push(e);p.lastQueuedSeq=e.seq;
  });p.pendingInputs.sort(function(a,b){return a.at-b.at||a.seq-b.seq;});p.pendingInputs=p.pendingInputs.slice(-32);p.latestMotion={seq:m.seq,report:m.motion};p.lastInput=now;return;
 }
 p.input=m;p.lastInput=now;
}
function applyQueuedPilotInput(p,time){while(p.pendingInputs&&p.pendingInputs.length&&p.pendingInputs[0].at<=time){var e=p.pendingInputs.shift();if(e.seq>(p.inputAck||0)){p.input=e.controls;p.inputAt=e.at;}}}

function broadcast(s){return [{to:'all',data:{type:'snapshot',world:s}}];}
function start(ctx){
 var humans=ctx.players.filter(function(p){return !p.ai;});
 if(humans.length<1||humans.length>2)return {ok:false,error:'One daily pilot or exactly two co-op pilots required.'};
 var mission=ctx.room&&ctx.room.metadata&&ctx.room.metadata.mission;
 if(['salvage','convoy','relay'].indexOf(mission)<0)mission=humans.length===2?'salvage':'daily';
 if(humans.length!==2&&mission!=='daily')return {ok:false,error:'Co-op missions require two human pilots.'};
 var s={mission:mission,now:ctx.now,time:0,tick:0,phase:0,progress:0,goal:mission==='daily'?120:mission==='salvage'?600:mission==='convoy'?90:12,core:{x:0,y:0,hp:900,max:900},fx:[],baseDefense:mission==='convoy'?null:createBaseDefense(),pilots:[],enemies:[],bullets:[],loot:[],wave:0,spawn:2,ended:false,won:false,day:Math.floor(ctx.now/86400000),message:'Republic pilots: recover supplies and defend the garrison.',beacons:[{x:-620,y:-350},{x:620,y:-350}]};
 humans.forEach(function(p,i){s.pilots.push({id:p.id,name:p.name||'Pilot '+(i+1),x:i?70:-70,y:120,vx:0,vy:0,a:-Math.PI/2,hp:260,max:260,cd:0,revive:0,warpAt:0,scrap:0,dayScrap:0,input:clean({}),lastInput:ctx.now});});
 for(var i=0;i<24;i++){var a=i*2.39996,r=280+(i%5)*140;s.loot.push({x:Math.cos(a)*r,y:Math.sin(a)*r,v:12});}
 return {ok:true,sessionState:s,broadcast:broadcast(s)};
}
function command(ctx){var s=ctx.sessionState,m=ctx.message.data||{},p=s&&s.pilots.find(function(p){return p.id===ctx.message.from;});if(!p)return {ok:false,error:'Not a participant.'};
 if(m.type==='resync')return {ok:true,broadcast:broadcast(s)};
 if(m.type==='input'){acceptPilotInput(p,m,ctx.now,s.time);return {ok:true,sessionState:s};}
 if(m.type==='leave')return {ok:true,sessionState:s,result:{kind:'abandoned',reason:'Pilot left mission'}};
 return {ok:false,error:'Unsupported command'};
}
function tick(ctx){
 var s=ctx.sessionState;if(!s)return {ok:false,error:'No mission.'};if(s.ended)return {ok:true};
 var dt=Math.max(0,Math.min(.1,(ctx.now-s.now)/1000));s.now=ctx.now;s.time+=dt;s.tick++;s.fx=[];
 var day=Math.floor(ctx.now/86400000);if(day!==s.day){s.day=day;s.pilots.forEach(function(p){p.dayScrap=0;});}
 (ctx.inputs||[]).forEach(function(packet){var p=s.pilots.find(function(p){return p.id===packet.from;});if(p){acceptPilotInput(p,packet.data||{},ctx.now,s.time);}});
 s.pilots.forEach(function(p){
  if(p.hp<=0){var partner=s.pilots.find(function(o){return o.id!==p.id&&o.hp>0&&distance(p,o)<120&&o.input.tractor&&ctx.now-o.lastInput<800;});if(partner){p.revive+=dt;if(p.revive>=4){p.hp=130;p.revive=0;p.warpAt=s.time;serverVisual(s,'warp',p.x,p.y,{max:.85,size:24,a:p.a,out:false,role:0});}}else p.revive=0;return;}
  applyQueuedPilotInput(p,s.time);var m=ctx.now-p.lastInput<800?p.input:clean({});stepPilotMovement(p,dt,m,[],false);p.inputAck=Math.max(p.inputAck||0,p.input.seq||0);p.cd-=dt;
  if(!m.steering&&m.aim!==null)p.a=m.aim;else if(!m.steering){var target=null,dd=900;s.enemies.forEach(function(e){var d=distance(p,e);if(d<dd){dd=d;target=e;}});if(target)p.a=Math.atan2(target.y-p.y,target.x-p.x);}
  if(m.fire&&p.cd<=0&&s.bullets.length<200){p.cd=.2;serverVisual(s,'muzzle',p.x,p.y,{a:p.a,weapon:'cannon',size:9,max:.12});s.bullets.push({x:p.x,y:p.y,vx:Math.cos(p.a)*640+p.vx,vy:Math.sin(p.a)*640+p.vy,t:1.6,owner:p.id,team:0,dmg:26});}
 });
 s.spawn-=dt;if(s.spawn<=0&&s.enemies.length<24){s.wave++;s.spawn=s.mission==='daily'?2.4:3;var a=(ctx.random||.5)*Math.PI*2;for(var i=0;i<(s.mission==='daily'?2:3);i++){var aa=a+i*.2;s.enemies.push({id:s.wave*10+i,x:Math.cos(aa)*1250,y:Math.sin(aa)*850,hp:i===0&&s.wave%3===0?150:65,max:i===0&&s.wave%3===0?150:65,kind:i===0&&s.wave%3===0?1:s.wave%4===0?3:0,a:aa,cd:1.5});}}
 s.enemies.forEach(function(e){var target=s.core,dd=800;s.pilots.forEach(function(p){if(p.hp>0&&distance(p,e)<dd){dd=distance(p,e);target=p;}});if(s.baseDefense)s.baseDefense.fighters.forEach(function(f){if(f.hp>0&&distance(f,e)<Math.min(230,distance(target,e)))target=f;});e.a=Math.atan2(target.y-e.y,target.x-e.x);var d=distance(e,target),v=e.kind===1?60:105;if(d>210){e.x+=Math.cos(e.a)*v*dt;e.y+=Math.sin(e.a)*v*dt;}e.cd-=dt;if(d<900&&e.cd<=0&&s.bullets.length<200){e.cd=e.kind===3?2.4:1.6;serverVisual(s,'muzzle',e.x,e.y,{a:e.a,weapon:'cannon',size:9,max:.12});s.bullets.push({x:e.x,y:e.y,vx:Math.cos(e.a)*(e.kind===3?520:280)+(e.vx||0),vy:Math.sin(e.a)*(e.kind===3?520:280)+(e.vy||0),t:4,team:1,dmg:e.kind===3?24:10});}});
 if(s.baseDefense)updateBaseDefense(s.baseDefense,dt,s.time,s.enemies,s.bullets,function(e,amount){e.hp-=amount*(e.kind===1?.72:1);});
 s.bullets.forEach(function(b){if(b.t<=0)return;var ax=b.x,ay=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.t-=dt;if(s.baseDefense&&interceptBaseShot(s.baseDefense,b,ax,ay,b.x,b.y))return;var targets=b.team?s.pilots.concat([s.core]):s.enemies;for(var i=0;i<targets.length;i++){var t=targets[i];if(t.hp>0&&distance(b,t)<(t===s.core?65:25)){serverVisual(s,'impact',b.x,b.y,{a:Math.atan2(b.vy,b.vx),weapon:'cannon',size:13,max:.65});t.hp-=b.dmg;b.t=-1;break;}}});
 s.bullets=s.bullets.filter(function(b){return b.t>0;});
 s.enemies=s.enemies.filter(function(e){if(e.hp>0)return true;serverVisual(s,'explosion',e.x,e.y,{size:e.kind===1?37:25,max:1.7});for(var i=0;i<3;i++)s.loot.push({x:e.x+(i-1)*22,y:e.y,v:12});return false;});
 s.loot.forEach(function(l){var nearest=null,dd=Infinity;s.pilots.forEach(function(p){if(p.hp<=0)return;var d=distance(p,l);if(d<dd){dd=d;nearest=p;}});if(!nearest)return;var tractor=nearest.input.tractor&&ctx.now-nearest.lastInput<800;if(dd<(tractor?420:45)){var a=Math.atan2(nearest.y-l.y,nearest.x-l.x),v=tractor?420:100;l.x+=Math.cos(a)*Math.min(dd,v*dt);l.y+=Math.sin(a)*Math.min(dd,v*dt);}if(dd<28){nearest.scrap+=l.v;nearest.dayScrap+=l.v;l.v=0;}});s.loot=s.loot.filter(function(l){return l.v>0;}).slice(-160);
 if(s.mission==='salvage'){var both=s.pilots.length===2&&s.pilots.every(function(p){return p.hp>0&&distance(p,s.core)<230;});var total=s.pilots.reduce(function(n,p){return n+p.scrap;},0);s.progress=total;s.message=total<600?'Recover 600 scrap. One pilot tows; one defends the Republic garrison.':'Cargo full. Both pilots return to the ring!';if(total>=600&&both)s.won=true;}
 if(s.mission==='convoy'){s.core.x=Math.sin(s.time*.025)*500;s.core.y=-s.time*3;s.progress=s.time;s.message='Escort the freighter for 90s. Tractor near a downed partner to revive.';if(s.time>=90&&s.pilots.some(function(p){return p.hp>0;}))s.won=true;}
 if(s.mission==='relay'){var charged=s.pilots.length===2&&((distance(s.pilots[0],s.beacons[0])<140&&distance(s.pilots[1],s.beacons[1])<140)||(distance(s.pilots[1],s.beacons[0])<140&&distance(s.pilots[0],s.beacons[1])<140))&&s.pilots.every(function(p){return p.hp>0;});if(charged)s.progress+=dt;s.message='Split up: hold BOTH relay beacons for 12 seconds.';if(s.progress>=12)s.won=true;}
 if(s.mission==='daily'){s.progress=s.time;s.message='120-second ranked salvage run. Collected scrap counts even on defeat.';if(s.time>=120)s.won=true;}
 var lost=s.core.hp<=0||s.pilots.every(function(p){return p.hp<=0;});s.ended=lost||s.won;
 var out={ok:true,sessionState:s,broadcast:broadcast(s)};
 // Daily board is a best-run score, not unspent balance. Never accept client score totals.
 if(s.tick%100===0||s.ended){var scores={};s.pilots.forEach(function(p){scores[p.id]=p.dayScrap;});out.scores={'daily-scrap':scores};}
 if(s.ended)out.result={kind:s.won?'coop-victory':'defeat',reason:s.mission};return out;
}
globalThis.game={tickRateHz:20,replays:false,queues:[{key:'coop',teams:1,teamSize:2}],createSession:start,onPlayerMessage:command,onTick:tick};

function serverVisual(s,effect,x,y,options){if(s.fx.length>=64)return;if(s.fx.length>=32&&effect!=='warp')return;var f={effect:effect,x:x,y:y,vx:0,vy:0,t:options.max,max:options.max,seed:s.tick*37+s.fx.length};Object.keys(options).forEach(function(key){f[key]=options[key];});s.fx.push(f);}

// BEGIN GENERATED UNIVERSE
const INPUT_LEAD_SECONDS=.032;
const neutralFlight=()=>({steering:true,turn:0,strafe:0,thrust:0,x:0,y:0,aim:null,fire:false,boost:false,tractor:false});
function encodeFlightEvent(e){const m=e.controls;return [e.at,e.seq,m.steering?1:0,m.turn||0,m.strafe||0,m.thrust||0,m.x||0,m.y||0,m.aim??null,m.fire?1:0,m.boost?1:0,m.tractor?1:0,m.target??null,m.brake?1:0,m.voiceLevel||0];}
function decodeFlightEvent(e){return {at:e[0],seq:e[1],controls:{steering:!!e[2],turn:e[3],strafe:e[4],thrust:e[5],x:e[6],y:e[7],aim:e[8],fire:!!e[9],boost:!!e[10],tractor:!!e[11],target:e[12]??null,brake:!!e[13],voiceLevel:e[14]||0}};}
class InputTimeline {
 constructor(){this.queue=[];this.recent=[];this.held=neutralFlight();this.seq=0;}
 capture(seq,controls,localTime,serverTime){const event={seq,controls:{...controls},at:localTime+INPUT_LEAD_SECONDS};this.queue.push(event);this.recent.push({...event,at:serverTime+INPUT_LEAD_SECONDS});if(this.recent.length>8)this.recent.shift();}
 advance(start,end,apply){let cursor=start;while(this.queue.length&&this.queue[0].at<=end+1e-9){const e=this.queue.shift(),at=Math.max(cursor,e.at);if(at>cursor)apply(at-cursor,this.held,this.seq);this.held=e.controls;this.seq=e.seq;cursor=at;}if(end>cursor)apply(end-cursor,this.held,this.seq);}
 events(){return this.recent.map(encodeFlightEvent);}
}
function projectPilotMotion(sample,meta,age,integrate){
 const p={...sample};if(!meta.flightSpec||!meta.intent){p.x+=(p.vx||0)*age;p.y+=(p.vy||0)*age;p.a+=(p.av||0)*age;return p;}
 let cursor=sample.time,controls=meta.intent.controls;const end=cursor+age;
 for(const e of meta.pending||[]){if(e.at<=cursor){controls=e.controls;continue;}if(e.at>end)break;integrate(p,e.at-cursor,controls,{speed:meta.flightSpec[0],turn:meta.flightSpec[1]});cursor=e.at;controls=e.controls;}
 if(end>cursor)integrate(p,end-cursor,controls,{speed:meta.flightSpec[0],turn:meta.flightSpec[1]});return p;
}

// Velocity at a moving/rotating launch point, plus muzzle velocity in that frame.
function launchVelocity(ship,angle,speed,x=ship.x,y=ship.y){return {vx:(ship.vx||0)-(ship.av||0)*(y-ship.y)+Math.cos(angle)*speed,vy:(ship.vy||0)+(ship.av||0)*(x-ship.x)+Math.sin(angle)*speed};}
// A bounded transverse offset adds weave without altering inherited drift.
function advanceProjectile(b,w,dt){const age=b.age||0;b.age=age+dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(w.weave){const a=b.launchAngle??Math.atan2(b.vy-(b.driftY||0),b.vx-(b.driftX||0)),shift=(Math.cos(age*15)-Math.cos(b.age*15))*w.weave*(b.weaveSide||1);b.x-=Math.sin(a)*shift;b.y+=Math.cos(a)*shift;}}
function projectileFragments(b,w,limit){const pieces=[];for(let i=0;i<Math.min(w.fragments||0,limit);i++){const a=i*Math.PI*2/w.fragments;pieces.push({x:b.x,y:b.y,vx:b.vx+Math.cos(a)*w.fragmentSpeed,vy:b.vy+Math.sin(a)*w.fragmentSpeed,t:.55,dmg:b.dmg*.65,weapon:'flak',team:b.team,faction:b.faction,owner:b.owner,pierce:0,hits:[]});}return pieces;}
function projectileVelocity(b,w){if(!w.weave)return {vx:b.vx,vy:b.vy};const a=b.launchAngle??Math.atan2(b.vy-(b.driftY||0),b.vx-(b.driftX||0)),lateral=Math.sin((b.age||0)*15)*15*w.weave*(b.weaveSide||1);return {vx:b.vx-Math.sin(a)*lateral,vy:b.vy+Math.cos(a)*lateral};}
// Earliest reachable intercept, bounded by projectile lifetime. Acceleration is
// an observed estimate, not a promise: recalculated for every defensive shot.
function interceptPoint(origin,target,speed,lifetime,offset=0){
 const acceleration=Math.hypot(target.ax||0,target.ay||0),limit=1200,scale=acceleration>limit?limit/acceleration:1,ax=(target.ax||0)*scale,ay=(target.ay||0)*scale;
 const position=t=>({x:target.x+(target.vx||0)*t+.5*ax*t*t,y:target.y+(target.vy||0)*t+.5*ay*t*t});
 const error=t=>{const p=position(t);return Math.max(0,Math.hypot(p.x-origin.x,p.y-origin.y)-offset)-speed*t;};
 let previous=0;for(let i=1;i<=64;i++){const t=lifetime*i/64;if(error(t)<=0){let lo=previous,hi=t;for(let j=0;j<16;j++){const mid=(lo+hi)/2;if(error(mid)>0)lo=mid;else hi=mid;}return {...position(hi),time:hi,reachable:true};}previous=t;}
 return {...position(Math.min(lifetime,Math.hypot(target.x-origin.x,target.y-origin.y)/speed)),time:lifetime,reachable:false};
}

// Fixed projectile records: 0.25m/0.25m/s precision; JSON-safe base64.
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function packShots(shots){
 const bytes=[];const put=(n,count)=>{n=Math.round(n);for(let i=0;i<count;i++){bytes.push(n&255);n>>=8;}};
 for(const b of shots){put(b[0],4);for(let i=1;i<=4;i++)put(b[i]*4,2);put(b[5]*20,2);put(b[6],1);put(b[7],2);put(b[8],1);}
 let out='';for(let i=0;i<bytes.length;i+=3){const n=(bytes[i]<<16)|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);out+=alphabet[n>>>18]+alphabet[(n>>>12)&63]+(i+1<bytes.length?alphabet[(n>>>6)&63]:'=')+(i+2<bytes.length?alphabet[n&63]:'=');}return out;
}
function unpackShots(text){
 const bytes=[];let buffer=0,bits=0;for(const c of text){if(c==='=')break;const n=alphabet.indexOf(c);if(n<0)continue;buffer=(buffer<<6)|n;bits+=6;if(bits>=8){bits-=8;bytes.push((buffer>>>bits)&255);}}
 let offset=0;const get=(count,signed=false)=>{let n=0;for(let i=0;i<count;i++)n+=bytes[offset++]*2**(8*i);if(signed&&n>=32768)n-=65536;return n;},shots=[];
 while(offset+18<=bytes.length){const b=[get(4)];for(let i=0;i<4;i++)b.push(get(2,true)/4);b.push(get(2)/20,get(1),get(2),get(1));shots.push(b);}return shots;
}

const WORLD_CAPACITY=32;
const FACTIONS=[{name:'RIGHTEOUS REPUBLIC',short:'REPUBLIC',color:'#c7d1ab',baseX:-2200},{name:'LEFT WING REBELLION',short:'REBELLION',color:'#d4a296',baseX:2200}];
const ROLES=[
 {id:'interceptor',name:'INTERCEPTOR',desc:'Fast, agile dogfighter; light armor, only 2 mines.',cost:0,speed:1.2,hp:.8,turn:1.3,damage:1,tractor:1,cloak:1,mines:2,shape:0},
 {id:'guardian',name:'GUARDIAN',desc:'Heavy shields and armor; slow, cannot cloak.',cost:280,speed:.72,hp:1.5,turn:.8,damage:1.1,tractor:.8,cloak:0,mines:3,shape:1},
 {id:'miner',name:'PROSPECTOR',desc:'60% more ore, wide tractor; weak combat weapons.',cost:220,speed:.85,hp:1.1,turn:.9,damage:.7,tractor:1.6,cloak:1,mines:4,shape:2},
 {id:'minelayer',name:'MINELAYER',desc:'12 persistent mines; modest hull and gun damage.',cost:260,speed:.95,hp:.9,turn:1,damage:.85,tractor:1,cloak:1,mines:12,shape:3},
 {id:'infiltrator',name:'INFILTRATOR',desc:'Efficient cloak and nimble flight; fragile hull.',cost:320,speed:1.12,hp:.72,turn:1.2,damage:.9,tractor:.8,cloak:.45,mines:3,shape:4},
 {id:'support',name:'SUPPORT TENDER',desc:'Repairs nearby allies; slow, low weapon damage.',cost:240,speed:.88,hp:1.1,turn:.85,damage:.7,tractor:1.2,cloak:1.2,mines:5,shape:5}
];

// All weapons share the same damage/energy/heat rules. No client-only damage effects.
const WEAPONS=[
 {id:'cannon',name:'Autocannon',desc:'Cheap balanced slugs; limited reach.',cost:0,research:0,tier:0,power:2,energy:1,heat:3,rate:.25,speed:720,life:1.1,damage:24,color:'#dedbc5'},
 {id:'laser',name:'Beam laser',desc:'Instant accurate beam; high capacitor drain.',cost:150,research:1,tier:0,power:4,energy:9,heat:8,rate:.45,speed:0,life:0,damage:40,range:650,beam:true,color:'#ef7970'},
 {id:'pulse',name:'Pulse laser',desc:'Fast light bolts; poor armor damage.',cost:170,research:1,tier:0,power:3,energy:3,heat:4,rate:.12,speed:1050,life:.65,damage:15,armor:.55,color:'#fa9f83'},
 {id:'disruptor',name:'Disruptor',desc:'3x shield damage; weak against bare hull.',cost:220,research:2,tier:1,power:4,energy:6,heat:6,rate:.35,speed:600,life:1.1,damage:14,shield:3,color:'#b787ff'},
 {id:'ion',name:'Ion projector',desc:'Jams enemy weapons and slows drives; low damage.',cost:240,research:2,tier:1,power:4,energy:8,heat:7,rate:.65,speed:660,life:1.2,damage:16,jam:1.8,color:'#83d7ed'},
 {id:'homing',name:'Homing missiles',desc:'Tracks selected target; slow turning, long reload.',cost:260,research:2,tier:1,power:5,energy:5,heat:12,rate:1.5,speed:300,life:3.5,damage:65,homing:2.1,splash:65,color:'#e7cc8d'},
 {id:'rocket',name:'Unguided rockets',desc:'Fast explosive salvo; blast can damage your ship.',cost:180,research:1,tier:0,power:4,energy:3,heat:13,rate:.85,speed:580,life:1.8,damage:50,splash:110,self:true,count:2,spread:.09,color:'#e3a16b'},
 {id:'particle',name:'Particle lance',desc:'Pierces three ships; high heat and power load.',cost:430,research:3,tier:3,power:7,energy:12,heat:24,rate:.9,speed:1500,life:1,damage:80,pierce:3,color:'#b6eea1'},
 {id:'rail',name:'Railgun',desc:'Extreme range, armor piercing; very slow reload.',cost:330,research:2,tier:2,power:6,energy:15,heat:18,rate:2.1,speed:2100,life:1,damage:145,pierce:2,armor:1.5,color:'#c8e6f5'},
 {id:'plasma',name:'Plasma mortar',desc:'Large blast; slow blobs are easy to outrun.',cost:300,research:2,tier:2,power:5,energy:10,heat:17,rate:1.2,speed:230,life:3,damage:85,splash:145,self:true,color:'#96e8aa'},
 {id:'flak',name:'Flak battery',desc:'Seven fragments punish swarms; poor distant accuracy.',cost:210,research:1,tier:1,power:4,energy:4,heat:14,rate:.85,speed:680,life:.5,damage:16,count:7,spread:.15,color:'#dec7a1'},
 {id:'gatling',name:'Rotary cannon',desc:'Cheap rapid suppressive fire; spread and heat build fast.',cost:190,research:1,tier:0,power:3,energy:.7,heat:3,rate:.055,speed:830,life:.85,damage:7,spread:.19,color:'#d7c7ab'},
 {id:'tesla',name:'Arc coil',desc:'Chains to three nearby enemies; very short range.',cost:390,research:3,tier:3,power:6,energy:16,heat:20,rate:1.1,speed:0,life:0,damage:68,range:300,beam:true,chain:3,color:'#9db6ff'},
 {id:'flame',name:'Thermite jet',desc:'Burns hull over time; dangerous close approach required.',cost:270,research:2,tier:2,power:4,energy:2,heat:5,rate:.13,speed:450,life:.38,damage:10,burn:3,spread:.2,color:'#f2a46c'},
 {id:'mine',name:'Proximity mines',desc:'Stationary area denial; one-second arming delay.',cost:250,research:2,tier:1,power:3,energy:6,heat:10,rate:1.4,speed:0,life:9,damage:95,splash:140,mine:true,self:true,color:'#df9ca9'},
 {id:'siege',name:'Antimatter torpedo',desc:'Huge warhead; slow, high drain, and dangerous blast.',cost:550,research:4,tier:4,power:8,energy:28,heat:38,rate:3.8,speed:190,life:5,damage:250,splash:210,self:true,color:'#e6a8f5'},
 {id:'siphon',name:'Siphon beam',desc:'Heals 20% hull damage dealt; costly low DPS.',cost:360,research:3,tier:3,power:5,energy:14,heat:12,rate:.8,speed:0,life:0,damage:35,range:420,beam:true,heal:.2,color:'#9bd1b0'},
 {id:'needle',name:'Needle repeater',desc:'Fast accurate needles pierce a second ship; weak shields.',cost:160,research:1,tier:0,power:3,energy:1,heat:3,rate:.09,speed:1250,life:.65,damage:8,pierce:1,shield:.5,color:'#c5e6dc'},
 {id:'helix',name:'Helix projector',desc:'Twin weaving bolts cover a widening lane; moderate reach.',cost:230,research:2,tier:1,power:4,energy:5,heat:10,rate:.4,speed:650,life:1.15,damage:20,count:2,spread:.035,weave:24,color:'#81ddd2'},
 {id:'swarm',name:'Seeker swarm',desc:'Three agile seekers acquire nearby targets; low hull damage.',cost:310,research:2,tier:2,power:5,energy:9,heat:18,rate:1.4,speed:380,life:2.6,damage:22,count:3,spread:.22,homing:3.6,seek:850,color:'#f1d396'},
 {id:'cluster',name:'Cluster bomb',desc:'Splits after 0.7s or impact into eight short-range fragments.',cost:290,research:2,tier:2,power:5,energy:10,heat:20,rate:1.6,speed:310,life:.7,damage:24,fragments:8,fragmentSpeed:430,color:'#efad8d'},
 {id:'breach',name:'Breach torpedo',desc:'3x damage to bases and outposts; slow and poor against ships.',cost:380,research:3,tier:3,power:6,energy:16,heat:26,rate:2.2,speed:340,life:3,damage:65,structure:3,color:'#d7b4f3'}
];
const COMPONENTS=[
 {id:'radiator',name:'Radiator',type:'utility',power:1,cost:140,research:1,desc:'+14 heat cooling/sec.'},
 {id:'magnet',name:'Salvage winch',type:'utility',power:2,cost:140,research:1,desc:'+140 tractor range; -10% speed.'},
 {id:'bulkhead',name:'Heavy bulkhead',type:'utility',power:1,cost:180,research:1,desc:'+110 hull; -8% speed.'},
 {id:'drive',name:'Vector engine',type:'engine',power:3,cost:0,research:0,desc:'+18% speed, +15% turn rate.'},
 {id:'cruise',name:'Cruise engine',type:'engine',power:2,cost:220,research:2,desc:'+32% speed; -25% turn rate.'},
 {id:'agile',name:'Maneuver engine',type:'engine',power:4,cost:220,research:2,desc:'+45% turn rate, only +5% speed.'},
 {id:'reactor',name:'Fusion reactor',type:'reactor',power:0,cost:0,research:0,desc:'+10 capacitor regeneration/sec.'},
 {id:'overdrive',name:'Overdrive reactor',type:'reactor',power:0,cost:280,research:2,desc:'+22 regeneration/sec; -8 heat cooling/sec.'},
 {id:'barrier',name:'Shield emitter',type:'shield',power:4,cost:0,research:0,desc:'+90 regenerating shields.'},
 {id:'fortress',name:'Fortress shield',type:'shield',power:7,cost:310,research:2,desc:'+190 shields; -15% speed.'}
];
const mount=(type,x,y)=>({type,x,y});
const HULLS=[
 {name:'SKIFF',cost:0,research:0,sectors:0,hp:220,radius:24,speed:1,turn:2.8,power:15,mounts:[mount('fixed',24,0),mount('utility',-8,0),mount('engine',-16,0),mount('reactor',0,0)]},
 {name:'CORVETTE',cost:480,research:3,sectors:1,hp:330,radius:31,speed:.93,turn:2.45,power:24,mounts:[mount('fixed',30,0),mount('turret',2,-17),mount('utility',-8,12),mount('engine',-23,0),mount('reactor',0,0),mount('shield',-5,-8)]},
 {name:'FRIGATE',cost:850,research:4,sectors:3,hp:490,radius:40,speed:.83,turn:2.05,power:34,mounts:[mount('fixed',39,-12),mount('fixed',39,12),mount('turret',0,-25),mount('turret',0,25),mount('utility',-12,-10),mount('utility',-12,10),mount('engine',-32,0),mount('reactor',0,0),mount('shield',12,0)]},
 {name:'CRUISER',cost:1350,research:6,sectors:5,hp:710,radius:52,speed:.72,turn:1.65,power:46,mounts:[mount('fixed',50,-15),mount('fixed',50,15),mount('turret',12,-34),mount('turret',12,34),mount('turret',-25,0),mount('utility',-14,-18),mount('utility',-14,18),mount('engine',-44,0),mount('reactor',0,0),mount('shield',18,0)]},
 {name:'DREADNOUGHT',cost:2200,research:8,sectors:8,hp:1050,radius:66,speed:.6,turn:1.25,power:62,mounts:[mount('fixed',63,-17),mount('fixed',63,17),mount('turret',25,-43),mount('turret',25,43),mount('turret',-22,-38),mount('turret',-22,38),mount('utility',-30,-15),mount('utility',-30,15),mount('utility',0,0),mount('engine',-55,0),mount('reactor',-10,0),mount('shield',30,0)]}
];
const weapon=id=>WEAPONS.find(w=>w.id===id);
const component=id=>COMPONENTS.find(c=>c.id===id);
const compatible=(slot,id)=>!id||(['fixed','turret'].includes(slot.type)?!!weapon(id):component(id)?.type===slot.type);
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const turnTowards=(a,b,step)=>a+Math.max(-step,Math.min(step,angleDelta(a,b)));
function segmentDistance(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy);}

const SECTOR_INFO = [
  {name:'THE PALE BELT',risk:'LOW',reward:1,hazard:'none',toll:0,repair:35,types:[0,1,5],note:'Quiet salvage lanes. Affordable repairs.',bonus:'Balanced rewards / safe station'},
  {name:'CINDER REACH',risk:'HIGH',reward:1.65,hazard:'heat',toll:35,repair:65,types:[0,1,3],note:'Hot debris drains hull outside the ring.',bonus:'+65% salvage / thermal hull damage'},
  {name:'THE HOLLOW',risk:'HIGH',reward:1.45,hazard:'ion',toll:0,repair:55,types:[3,4,5],note:'Ion storms suppress shield regeneration.',bonus:'+45% salvage / unreliable shields'},
  {name:'DRIFTER HAVEN',risk:'LOW',reward:.85,hazard:'none',toll:55,repair:20,types:[0,5],note:'A protected refuge with cheap repairs.',bonus:'-15% salvage / low danger / cheap services'},
  {name:'IRON GRAVEYARD',risk:'MEDIUM',reward:1.8,hazard:'dense',toll:25,repair:55,types:[1,3,4],note:'Rich ore, dense rocks, armored patrols.',bonus:'+80% salvage / 90 asteroids / heavy enemies'},
  {name:'REBEL FRONTIER',risk:'EXTREME',reward:1.5,hazard:'reinforcements',toll:0,repair:70,types:[4,5,3],note:'Carrier swarms. Every rebel outpost yields extra intel.',bonus:'+50% salvage / double outpost intel'},
  {name:'REBEL CITADEL',risk:'FINAL',reward:1.8,hazard:'ion',toll:80,repair:60,types:[0,1,3,4,5],note:'Destroy the rebel flagship and dismantle its command network.',bonus:'Final battle / requires the completed command campaign'},
  {name:'PRISM NEBULA',risk:'HIGH',reward:1.7,hazard:'ion',toll:60,repair:70,types:[1,3,5],note:'Shielded guardians patrol the relay.',bonus:'Disruptors counter shields / +70% salvage'},
  {name:'THE SILENT ARCHIVE',risk:'EXTREME',reward:1.9,hazard:'dense',toll:80,repair:80,types:[1,3,4],note:'Recover an ancient navigation cipher at the relay.',bonus:'Navigation cipher / armored long-range patrols'},
  {name:'EMBER FORGE',risk:'EXTREME',reward:2,hazard:'heat',toll:90,repair:95,types:[1,4,5],note:'Hot salvage fields favor radiators over raw firepower.',bonus:'+100% salvage / heat and carrier swarms'},
  {name:'OUTER WATCH',risk:'EXTREME',reward:2.1,hazard:'reinforcements',toll:100,repair:100,types:[1,3,4],note:'The last armada stands between you and Rebel Citadel.',bonus:'+110% salvage / elite defenders'}
];
const SECTORS=SECTOR_INFO.map(s=>s.name);

const UPGRADES=[
 {id:'gun',tree:0,name:'CANNON COILS',desc:'+7 damage; faster firing each rank.',max:5,base:70,need:'',rank:0,tech:0},
 {id:'multishot',tree:0,name:'SPLIT BARRELS',desc:'Additional projectiles in a narrow spread.',max:3,base:130,need:'gun',rank:2,tech:1},
 {id:'pierce',tree:0,name:'PHASE ROUNDS',desc:'Pierce one extra target per rank.',max:3,base:180,need:'multishot',rank:1,tech:1},
 {id:'armor',tree:1,name:'HULL PLATING',desc:'+60 flagship hull. Repairs hull on purchase.',max:4,base:85,need:'',rank:0,tech:0},
 {id:'shield',tree:1,name:'AEGIS SHIELD',desc:'+45 regenerating shields per rank.',max:4,base:110,need:'armor',rank:1,tech:1},
 {id:'regen',tree:1,name:'NANITE REPAIR',desc:'Regenerate hull after 6s without damage.',max:3,base:160,need:'shield',rank:1,tech:1},
 {id:'engine',tree:2,name:'VECTOR DRIVES',desc:'+9% thrust; more efficient afterburners.',max:4,base:80,need:'',rank:0,tech:0},
 {id:'tractor',tree:2,name:'TRACTOR ARRAY',desc:'+110m beam range; faster wreck recovery.',max:4,base:105,need:'engine',rank:1,tech:0},
 {id:'emp',tree:2,name:'PULSE CAPACITOR',desc:'Stronger EMP, larger radius, less cooldown.',max:3,base:155,need:'tractor',rank:1,tech:1},
 {id:'hangar',tree:3,name:'HANGAR DECK',desc:'+1 escort capacity per rank (up to 5).',max:3,base:130,need:'',rank:0,tech:0},
 {id:'wingguns',tree:3,name:'SQUADRON WEAPONS',desc:'+40% escort damage per rank.',max:3,base:140,need:'hangar',rank:1,tech:1},
 {id:'winghull',tree:3,name:'ESCORT BULKHEADS',desc:'+55 escort hull per rank; repairs escorts.',max:3,base:120,need:'wingguns',rank:1,tech:1}
];
const TREES=['WEAPONS','DEFENSE','ENGINEERING','FLEET'];
const shipLevel=(s,id)=>Math.max(0,Math.floor(s.upgrades?.[id]||0));
function shipUpgradeStatus(s,id){const u=UPGRADES.find(u=>u.id===id);if(!u)return {cost:0,tech:0,ok:false,reason:'UNKNOWN UPGRADE',level:0};const l=shipLevel(s,id),cost=Math.ceil(u.base*(l+(id==='gun'?0:1)));let reason=l>=u.max?'MAX RANK':u.need&&shipLevel(s,u.need)<u.rank?'REQUIRES '+u.need.toUpperCase()+' '+u.rank:s.scrap<cost?'NEED SALVAGE':s.tech<u.tech?'NEED RESEARCH':'';return {cost,tech:u.tech,ok:!reason,reason,level:l};}
function shipStats(s){const ids=s.loadout||[],count=id=>ids.filter(x=>x===id).length,h=HULLS[s.hull||0],role=ROLES[s.role||0];return {power:ids.reduce((v,id)=>v+(weapon(id)?.power||component(id)?.power||0),0),budget:h.power,cooling:Math.max(7,24+14*count('radiator')-8*count('overdrive')),regen:18+10*count('reactor')+22*count('overdrive'),magnet:count('magnet'),speed:h.speed*(role?.speed||1)*(1+.18*count('drive')+.32*count('cruise')+.05*count('agile'))*(1-.1*count('magnet'))*(1-.08*count('bulkhead'))*(1-.15*count('fortress')),turn:h.turn*(role?.turn||1)*(1+.15*count('drive')-.25*count('cruise')+.45*count('agile')),hp:Math.round((h.hp+shipLevel(s,'armor')*60+count('bulkhead')*110)*(role?.hp||1)),shield:(s.role===1?140:0)+shipLevel(s,'shield')*45+count('barrier')*90+count('fortress')*190};}
function shipHullStatus(s){const h=HULLS[s.hull+1];if(!h)return {ok:false,reason:'LARGEST HULL',cost:0,research:0};const reason=s.cleared.filter(id=>id!==6).length<h.sectors?'CLEAR '+h.sectors+' SECTORS':s.scrap<h.cost?'NEED SCRAP':s.tech<h.research?'NEED RESEARCH':'';return {ok:!reason,reason,cost:h.cost,research:h.research};}
function shipFitStatus(s,slot,id){const m=HULLS[s.hull].mounts[slot],def=weapon(id)||component(id);if(!m||!compatible(m,id))return {ok:false,reason:'INCOMPATIBLE MOUNT',cost:0,research:0};const cost=id&&!s.owned.includes(id)?def.cost:0,research=id&&!s.owned.includes(id)?def.research||0:0;const draw=shipStats(s).power-(weapon(s.loadout[slot])?.power||component(s.loadout[slot])?.power||0)+(def?.power||0);const reason=weapon(id)&&s.cleared.length<def.tier?'CLEAR '+def.tier+' SECTORS':draw>HULLS[s.hull].power?'POWER BUDGET EXCEEDED':s.scrap<cost?'NEED SCRAP':s.tech<research?'NEED RESEARCH':'';return {ok:!reason,reason,cost,research};}
function defaultLoadout(){return ['cannon',null,'drive','reactor'];}

function voiceGain(listener,speaker){if(!listener||!speaker||listener.hp<=0||listener.faction!==speaker.faction||speaker.hp<=0)return 0;const d=Math.hypot(listener.x-speaker.x,listener.y-speaker.y);if(d>=1100)return 0;if(d<=120)return 1;const t=(d-120)/980;return (1-t)*(1-t);}
function visibleShip(viewer,target){return viewer.faction===target.faction||!target.cloaked||Math.hypot(viewer.x-target.x,viewer.y-target.y)<=150;}
const ROCK_MIN=13;
// Area and ore are conserved through each split; the hit is never applied to a
// just-created child, so a single projectile cannot erase a complete rock tree.
function fractureRock(r,hitX,hitY){
 if(r.r<=ROCK_MIN)return [];
 const a=Math.atan2(r.y-hitY,r.x-hitX)+Math.PI/2,seed=(r.seed||Math.floor(r.x*13+r.y*7))>>>0,ratio=.44+(seed%13)/100;
 return [ratio,1-ratio].map((fraction,i)=>{const sign=i?1:-1,radius=r.r*Math.sqrt(fraction),ore=i?(r.ore??24)-Math.floor((r.ore??24)*ratio):Math.floor((r.ore??24)*ratio),speed=24+(seed%31);return {x:r.x+Math.cos(a)*sign*radius*.4,y:r.y+Math.sin(a)*sign*radius*.4,r:radius,hp:Math.max(8,radius*.85),type:(r.type+i+1)%10,a:(r.a||0)+sign*.3,vx:(r.vx||0)+Math.cos(a)*sign*speed,vy:(r.vy||0)+Math.sin(a)*sign*speed,spin:sign*(.2+(seed%7)*.08),seed:seed+i+17,ore};});
}
function driftRocks(rocks,dt){for(const r of rocks){r.x+=(r.vx||0)*dt;r.y+=(r.vy||0)*dt;r.a+=(r.spin||0)*dt;const drag=Math.exp(-dt*.15);r.vx=(r.vx||0)*drag;r.vy=(r.vy||0)*drag;}}

function sweptHit(ax,ay,bx,by,x,y,r){const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy)<=r;}

const flightClamp=(v,a,b)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):0;
const WORLD_SECTORS=9,SECTOR_SPACING=1600,WORLD_Y=7200;
const sectorAt=y=>Math.max(0,Math.min(WORLD_SECTORS-1,Math.floor((y+WORLD_Y)/SECTOR_SPACING)));
const sectorY=id=>(id-4)*SECTOR_SPACING;
function pilotMotionStats(p){const hull=p.hull||0,role=ROLES[p.role||0];if(p.loadout){const st=shipStats(p);return {speed:225*(1+shipLevel(p,'engine')*.09)*st.speed,turn:st.turn,radius:HULLS_MOTION_RADIUS[ hull ]};}return {speed:(250-hull*24)*role.speed,turn:(2.8-hull*.32)*role.turn,radius:22+hull*9};}
const HULLS_MOTION_RADIUS=[24,31,40,52,66];
// Force/torque integration shared by solo flight, server simulation and prediction.
function integratePilotThrust(p,dt,input,st){
 p.thrusting=Math.abs(input.thrust||0)+Math.abs(input.strafe||0)+Math.abs(input.x||0)+Math.abs(input.y||0)>.01;
 const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps,turnAcceleration=st.turn*9;
 const thrust=flightClamp((input.thrust||0)-(input.brake?1:0),-1,1),strafe=flightClamp(input.strafe||0,-1,1);
 const boosted=input.boost&&p.boost!==0,limit=st.speed*(boosted?440/225:1)*(p.cloaked?.65:1)*(input.tractor?.75:1);
 for(let i=0;i<steps;i++){
  let av=p.av||0,torque=0;
  if(Number.isFinite(input.aim)){
   const error=Math.atan2(Math.sin(input.aim-p.a),Math.cos(input.aim-p.a));
   const wanted=Math.sign(error)*Math.min(st.turn,Math.sqrt(2*turnAcceleration*Math.abs(error)));
   torque=flightClamp((wanted-av)/h,-turnAcceleration,turnAcceleration);
  }else torque=flightClamp(input.turn||0,-1,1)*turnAcceleration;
  const nextAv=flightClamp(av+torque*h,-st.turn,st.turn),angle=p.a+(av+nextAv)*h*.25;
  let ax,ay;
  if(input.steering){ax=Math.cos(angle)*thrust-Math.sin(angle)*strafe;ay=Math.sin(angle)*thrust+Math.cos(angle)*strafe;}
  else {ax=flightClamp(input.x||0,-1,1);ay=flightClamp(input.y||0,-1,1);}
  const magnitude=Math.max(1,Math.hypot(ax,ay)),acceleration=limit*3;
  const vx=p.vx||0,vy=p.vy||0,oldSpeed=Math.hypot(vx,vy);
  let nx=vx+ax/magnitude*acceleration*h,ny=vy+ay/magnitude*acceleration*h;
  // A speed limit constrains engine acceleration, never erases existing momentum.
  const cap=Math.max(limit,oldSpeed),speed=Math.hypot(nx,ny);if(speed>cap){nx*=cap/speed;ny*=cap/speed;}
  p.x+=(vx+nx)*.5*h;p.y+=(vy+ny)*.5*h;p.vx=nx;p.vy=ny;
  p.a=Math.atan2(Math.sin(p.a+(av+nextAv)*h*.5),Math.cos(p.a+(av+nextAv)*h*.5));p.av=nextAv;
 }
}
// Used by the authoritative server, live prediction, and input replay. This
// changes movement only: damage, weapons, resources and visibility stay on the server.
function stepPilotMovement(p,dt,input,rocks=[],shared=true){
 if(p.hp<=0)return;
 if(shared){
  const st=pilotMotionStats(p);integratePilotThrust(p,dt,input,st);
  for(const r of rocks){const d=Math.hypot(p.x-r.x,p.y-r.y),radius=r.r+st.radius;if(d<radius){const nx=d?(p.x-r.x)/d:1,ny=d?(p.y-r.y)/d:0,dot=p.vx*nx+p.vy*ny;p.x=r.x+nx*radius;p.y=r.y+ny*radius;if(dot<0){p.vx-=nx*dot*1.15;p.vy-=ny*dot*1.15;}}}
  if(p.x>3200||p.x< -3200){p.x=flightClamp(p.x,-3200,3200);p.vx=0;}if(p.y>WORLD_Y||p.y< -WORLD_Y){p.y=flightClamp(p.y,-WORLD_Y,WORLD_Y);p.vy=0;}return;
 }
 const m={steering:input.steering===true,turn:flightClamp(input.turn,-1,1),strafe:flightClamp(input.strafe,-1,1),thrust:flightClamp(input.thrust,-1,1),brake:input.brake===true,x:flightClamp(input.x,-1,1),y:flightClamp(input.y,-1,1),aim:Number.isFinite(input.aim)?input.aim:null,boost:input.boost===true,tractor:input.tractor===true};
 const st=shared?pilotMotionStats(p):{speed:215,turn:2.8,radius:25};
 if(m.aim!==null&&(shared||m.steering)){const delta=Math.atan2(Math.sin(m.aim-p.a),Math.cos(m.aim-p.a));p.a+=flightClamp(delta,-st.turn*dt,st.turn*dt);}else if(m.steering)p.a+=m.turn*st.turn*dt;
 if(!shared)p.a=Math.atan2(Math.sin(p.a),Math.cos(p.a));
 const thrust=flightClamp(m.thrust-(m.brake?1:0),-1,1),length=Math.max(1,Math.hypot(m.x,m.y));
 let dx=m.steering?Math.cos(p.a)*thrust-Math.sin(p.a)*m.strafe:m.x,dy=m.steering?Math.sin(p.a)*thrust+Math.cos(p.a)*m.strafe:m.y;
 if(!shared&&m.steering){dx+=m.x/length;dy+=m.y/length;}
 const n=Math.max(1,Math.hypot(dx,dy)),cloaked=p.cloaked&&!input.fire&&!m.boost;
 const speed=shared?st.speed*(m.boost&&!cloaked&&p.boost!==0?(p.loadout?440/225:1.65):1)*(cloaked?.65:1)*(m.tractor?.75:1):m.boost?310:m.tractor?155:215;
 if(shared){p.vx+=(dx/n*speed-p.vx)*(1-Math.exp(-dt*12));p.vy+=(dy/n*speed-p.vy)*(1-Math.exp(-dt*12));}
 else if(m.steering){p.vx+=(dx/n*speed*2-p.vx*.3)*dt;p.vy+=(dy/n*speed*2-p.vy*.3)*dt;}
 else{p.vx=dx/n*speed;p.vy=dy/n*speed;if(m.aim!==null)p.a=m.aim;}
 const cap=Math.max(1,Math.hypot(p.vx,p.vy)/speed);p.vx/=cap;p.vy/=cap;
 p.x=flightClamp(p.x+p.vx*dt,shared?-3200:-1400,shared?3200:1400);p.y=flightClamp(p.y+p.vy*dt,shared?-WORLD_Y:-1000,shared?WORLD_Y:1000);
 if(shared)for(const r of rocks){const d=Math.hypot(p.x-r.x,p.y-r.y),radius=r.r+st.radius;if(d<radius){const a=Math.atan2(p.y-r.y,p.x-r.x);p.x=r.x+Math.cos(a)*radius;p.y=r.y+Math.sin(a)*radius;p.vx*=.65;p.vy*=.65;}}
 if(shared){p.x=flightClamp(p.x,-3200,3200);p.y=flightClamp(p.y,-WORLD_Y,WORLD_Y);}
}


const turnDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const round=n=>Math.round(n*1000)/1000;
function resetFlightAudit(p,now){
 p.audit={at:now,fundedAt:now,x:p.x,y:p.y,a:p.a,vx:p.vx||0,vy:p.vy||0,credit:pilotMotionStats(p).speed*.35,seq:p.inputAck||0,mean:0,variance:1,samples:0,score:p.audit&&p.audit.score||0};
 p.correctionSeq=(p.correctionSeq||0)+1;
}
function movementAuthority(p){return p.untrusted?Math.max(0,.25-(p.violations||0)*.025):1;}
// Only server time funds the travel budget. Client timestamps, counters, and
// learned statistics cannot enlarge the physical limits of the equipped ship.
function validateFlightReport(p,report,seq,now,input,rocks=[]){
 if(!report||p.hp<=0)return {accepted:false,reason:'none'};
 if(report.spawnSeq!==p.spawnSeq)return {accepted:false,reason:'old-spawn'};
 if(!p.audit)resetFlightAudit(p,now);
 const audit=p.audit;if(seq<=audit.seq)return {accepted:false,reason:'old-input'};
 const elapsed=Math.max(.001,(now-audit.at)/1000),st=pilotMotionStats(p);
 const cap=st.speed*(input.boost&&p.boost>0?440/225:1)*(p.cloaked?.65:1)*(input.tractor?.75:1),maxCap=st.speed*440/225;
 const allowance=p.untrusted?2:maxCap*.35,slack=p.untrusted?2:8;
 audit.credit=Math.min(maxCap*.4+allowance,audit.credit+Math.max(cap,Math.min(maxCap,Math.hypot(audit.vx,audit.vy)))*Math.min(Math.max(0,(now-(audit.fundedAt??audit.at))/1000),.5));
 audit.fundedAt=now;
 const finite=['x','y','vx','vy','a'].every(k=>Number.isFinite(report[k]));
 const travel=finite?Math.hypot(report.x-audit.x,report.y-audit.y):Infinity;
 const speed=finite?Math.hypot(report.vx,report.vy):Infinity;
 const acceleration=finite?Math.hypot(report.vx-audit.vx,report.vy-audit.vy):Infinity;
 const previousSpeed=Math.hypot(audit.vx,audit.vy),span=Math.min(elapsed,.5),jitter=p.untrusted?.04:.25;
 const physicalDistance=Math.min(maxCap*(span+jitter),(previousSpeed+speed)*.5*(span+jitter)+maxCap*3*(span+jitter)*(span+jitter)*.5)+slack;
 const residual=finite?Math.hypot(report.x-p.x,report.y-p.y):Infinity;
 let reason='';
 if(!finite)reason='non-finite';
 else if(Math.abs(report.x)>3200||Math.abs(report.y)>WORLD_Y)reason='world-bounds';
 else if(speed>maxCap*1.015+2)reason='speed';
 else if(Number.isFinite(report.av)&&Math.abs(report.av)>st.turn*1.03+.03)reason='angular-speed';
 else if(travel>audit.credit+slack||travel>physicalDistance)reason='travel';
 else if(acceleration-Math.max(0,previousSpeed-speed)>maxCap*6*(span+jitter)+20)reason='acceleration';
 else if(turnDistance(report.a,audit.a)>st.turn*(span+jitter)+(p.untrusted?.04:.16))reason='turn';
 else if(p.untrusted&&residual>maxCap*.3+slack)reason='residual';
 else if(p.untrusted&&audit.samples>40&&residual/Math.max(4,maxCap*.08)>Math.max(2.5,audit.mean+4*Math.sqrt(audit.variance)))reason='statistical-outlier';
 // Lag and a superseded spawn are resynchronizations, not evidence of cheating.
 if(elapsed>.65){resetFlightAudit(p,now);return {accepted:false,reason:'resync'};}
 audit.seq=seq;
 if(reason){
  // One correction takes a network round trip to reach the pilot. Treat its
  // in-flight reports as one incident rather than several independent strikes.
  const hard=reason==='non-finite'||reason==='world-bounds'||speed>maxCap*1.5||travel>maxCap;
  if(hard||p.lastFlightStrike===undefined||now-p.lastFlightStrike>=350){p.violations=(p.violations||0)+1;audit.score+=hard?4:1;p.lastFlightStrike=now;}
  p.lastFlightReason=reason;
  if(audit.score>=3)p.untrusted=true;
  p.correctionSeq=(p.correctionSeq||0)+1;
  // A rejected sample never changes the anchor or teaches a wider envelope.
  return {accepted:false,reason};
 }
 // A small rolling innovation score detects persistent bias as well as spikes.
 const normalized=residual/Math.max(4,maxCap*.08),delta=normalized-audit.mean;
 audit.mean=round(audit.mean+.08*delta);audit.variance=round(Math.max(.1,.92*audit.variance+.08*delta*delta));audit.samples++;
 audit.score=Math.max(0,audit.score-.04);
 const alpha=movementAuthority(p),x=p.x+(report.x-p.x)*alpha,y=p.y+(report.y-p.y)*alpha;
 let blocked=false;
 for(const rock of rocks){const dx=x-p.x,dy=y-p.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((rock.x-p.x)*dx+(rock.y-p.y)*dy)/length)):0;if(Math.hypot(p.x+t*dx-rock.x,p.y+t*dy-rock.y)<rock.r+st.radius-2&&(Math.hypot(p.x-rock.x,p.y-rock.y)>=rock.r+st.radius-2||Math.hypot(x-rock.x,y-rock.y)<Math.hypot(p.x-rock.x,p.y-rock.y))){blocked=true;break;}}
 if(blocked){p.correctionSeq=(p.correctionSeq||0)+1;return {accepted:false,reason:'collision'};}
 p.x=x;p.y=y;p.a+=Math.atan2(Math.sin(report.a-p.a),Math.cos(report.a-p.a))*alpha;p.vx+=(report.vx-p.vx)*alpha;p.vy+=(report.vy-p.vy)*alpha;if(Number.isFinite(report.av))p.av=(p.av||0)+(report.av-(p.av||0))*alpha;
 audit.credit=round(Math.max(0,audit.credit-travel));audit.x=report.x;audit.y=report.y;audit.a=report.a;audit.vx=report.vx;audit.vy=report.vy;audit.at=now;
 return {accepted:true,authority:alpha};
}

// Invocation-local broad phase: centers occupy one cell; queries include radii.
function uGrid(items){var grid={};items.forEach(function(e){var key=Math.floor(e.x/400)+':'+Math.floor(e.y/400);(grid[key]||(grid[key]=[])).push(e);});return grid;}
function uQuery(grid,ax,ay,bx,by,pad){var found=[];for(var x=Math.floor((Math.min(ax,bx)-pad)/400);x<=Math.floor((Math.max(ax,bx)+pad)/400);x++)for(var y=Math.floor((Math.min(ay,by)-pad)/400);y<=Math.floor((Math.max(ay,by)+pad)/400);y++){var cell=grid[x+':'+y];if(cell)found=found.concat(cell);}return found;}
// Shared-world combat uses the same catalog, mounts, upgrade ranks and resource
// costs as the solo shipyard. Outcomes remain on the server.
function uTargets(s){return s.pilots.concat(s.enemies,s.escorts||[],s.bases);}
function uRadius(p){return p.base?150:p.pilot?uStats(p).radius:p.owner?13:22;}
function uShooter(s,id){return s.pilots.find(function(p){return p.id===id;});}
function uDamage(s,target,amount,owner,w){
 if(target.hp<=0||amount<=0)return;
 amount*=target.base&&w&&w.structure||1;var pilot=uShooter(s,owner),before=target.hp+(target.shield||0),shieldFactor=w&&w.shield||1;
 var absorbed=Math.min(target.shield||0,amount*shieldFactor);target.shield=Math.max(0,(target.shield||0)-absorbed);amount=Math.max(0,amount-absorbed/shieldFactor);
 if(!target.base&&target.kind===1&&!target.pilot)amount*=.72*(w&&w.armor||1);
 target.hp=Math.max(0,target.hp-amount);target.lastHit=s.time;
 if(!target.base){target.cloaked=false;target.lock=3;if(w&&w.jam)target.jam=Math.max(target.jam||0,w.jam);if(w&&w.burn){target.burn=Math.max(target.burn||0,w.burn);target.burnOwner=owner;}}
 if(pilot){pilot.damage=(pilot.damage||0)+Math.max(0,before-target.hp-(target.shield||0));if(w&&w.heal)pilot.hp=Math.min(pilot.max,pilot.hp+Math.min(amount,before)*w.heal);}
 if(target.hp===0){
  serverVisual(s,'explosion',target.x,target.y,{max:1.7,size:target.base?160:35});
  if(target.base){target.destroyedAt=s.time;target.killer=owner||'';if(pilot)pilot.baseKills=(pilot.baseKills||0)+1;var winningSide=1-target.faction;s.pilots.forEach(function(p){if(p.faction===winningSide){p.scrap+=120;p.tech+=2;if(p.cleared.indexOf(target.sector)<0)p.cleared.push(target.sector);p.profileDirty=true;}});}
  else if(target.pilot){target.deaths=(target.deaths||0)+1;target.respawn=8;target.vx=target.vy=0;if(pilot&&pilot.id!==target.id){pilot.kills=(pilot.kills||0)+1;pilot.scrap+=35;pilot.tech+=1;pilot.profileDirty=true;}}
 }
}
function uBlast(s,b,w,direct){
 uTargets(s).forEach(function(target){if(target===direct||target.hp<=0||target.faction===b.faction&&!w.self)return;var d=distance(target,b);if(d<w.splash){var self=target.faction===b.faction;if(self&&target.id!==b.owner)return;uDamage(s,target,b.dmg*(self?.3:.65)*(1-d/w.splash),b.owner,w);}});
 serverVisual(s,'explosion',b.x,b.y,{max:.65,size:w.splash*.35,weapon:w.id});
}
function uFireMounts(s,p,dt,m){
 if(p.hp<=0)return;
 var ownedShots=s.bullets.filter(function(b){return b.owner===p.id;}).length;
 var hull=HULLS[p.hull],gun=shipLevel(p,'gun'),st=shipStats(p);p.mounts=p.mounts||[];
 hull.mounts.forEach(function(mount,i){var w=weapon(p.loadout[i]);if(!w)return;var state=p.mounts[i]||(p.mounts[i]={a:p.a,cd:0});state.cd=Math.max(0,state.cd-dt);
 var x=p.x+Math.cos(p.a)*mount.x-Math.sin(p.a)*mount.y,y=p.y+Math.sin(p.a)*mount.x+Math.cos(p.a)*mount.y;
 var target=null;if(mount.type==='turret'){var dd=1000;uTargets(s).forEach(function(t){if(t.hp<=0||t.faction===p.faction||t.faction<0||!visibleShip(p,t))return;var d=Math.hypot(t.x-x,t.y-y);if(t.id===m.target&&d<1400){target=t;dd=-1;}else if(d<dd){dd=d;target=t;}});if(target)state.a=turnTowards(state.a,Math.atan2(target.y-y,target.x-x),3.4*dt);}else state.a=p.a;
 if(ownedShots>=32||!m.fire||p.cloaked||p.overheated||p.jam>0||state.cd>0||p.energy<w.energy||s.bullets.length>=1536)return;
 if(mount.type==='turret'&&(!target||Math.abs(angleDelta(state.a,Math.atan2(target.y-y,target.x-x)))>.16))return;
 p.energy-=w.energy;p.heat=Math.min(120,p.heat+w.heat);if(p.heat>=100)p.overheated=true;state.cd=w.rate/(1+gun*.05);
 var dmg=w.damage*(1+gun*.12)*uRole(p).damage;p.shots=(p.shots||0)+1;
 serverVisual(s,'muzzle',x,y,{a:state.a,max:.12,size:9,weapon:w.id});
 if(w.beam){var bx=x+Math.cos(state.a)*w.range,by=y+Math.sin(state.a)*w.range,victim=null,dd=w.range+1;
  uTargets(s).forEach(function(t){if(t.hp<=0||t.faction===p.faction||t.faction<0)return;if(segmentDistance(t.x,t.y,x,y,bx,by)<uRadius(t)){var d=Math.hypot(t.x-x,t.y-y);if(d<dd){dd=d;victim=t;}}});
  var rock=null;s.rocks.forEach(function(r){if(r.hp>0&&segmentDistance(r.x,r.y,x,y,bx,by)<r.r){var d=Math.hypot(r.x-x,r.y-y);if(d<dd){rock=r;victim=null;dd=d;}}});
  if(rock){rock.hp-=dmg*(p.role===2?1.6:1);rock.hitX=x;rock.hitY=y;}
  if(victim){uDamage(s,victim,dmg,p.id,w);var previous=victim,struck=[victim.id];for(var j=0;j<(w.chain||0);j++){var next=uTargets(s).find(function(t){return t.hp>0&&t.faction!==p.faction&&t.faction>=0&&struck.indexOf(t.id)<0&&distance(t,previous)<230;});if(!next)break;uDamage(s,next,dmg*.55,p.id,w);struck.push(next.id);serverVisual(s,'beam',previous.x,previous.y,{beam:true,x2:next.x,y2:next.y,max:.13,weapon:w.id});previous=next;}}
  serverVisual(s,'beam',x,y,{beam:true,x2:victim?victim.x:rock?rock.x:bx,y2:victim?victim.y:rock?rock.y:by,max:.13,weapon:w.id});
 }else{var count=(w.count||1)+(w.id==='cannon'?shipLevel(p,'multishot'):0);for(var n=0;n<count&&ownedShots<32&&s.bullets.length<1536;n++){var a=state.a+(count>1?(n-(count-1)/2)*(w.spread||.075):(w.spread||0)*(Math.random()-.5));ownedShots++;var velocity=launchVelocity(p,a,w.speed,x,y);s.bullets.push({id:s.next++,x:uRound(x),y:uRound(y),vx:uRound(velocity.vx),vy:uRound(velocity.vy),driftX:velocity.vx-Math.cos(a)*w.speed,driftY:velocity.vy-Math.sin(a)*w.speed,t:w.life,faction:p.faction,dmg:uRound(dmg),weapon:w.id,owner:p.id,pierce:(w.pierce||0)+(w.id==='cannon'?shipLevel(p,'pierce'):0),hits:[],arm:w.mine?1:0,target:m.target||null,launchAngle:a,weaveSide:n%2?-1:1});}}
 });
}
function uProjectiles(s,dt){
 var spawned=[];var targets=uTargets(s).filter(function(t){return t.hp>0;}).map(function(t){return {ship:t,x:t.x,y:t.y,r:uRadius(t)};}),grid=uGrid(targets),rockGrid=uGrid(s.rocks);
 s.bullets.forEach(function(b){if(b.t<=0)return;var w=weapon(b.weapon)||{},ax=b.x,ay=b.y;b.hits=b.hits||[];
  if(w.seek&&!uTargets(s).some(function(t){return t.id===b.target&&t.hp>0&&t.faction!==b.faction;})){var sought=uTargets(s).filter(function(t){return t.hp>0&&t.faction>=0&&t.faction!==b.faction&&visibleShip(b,t)&&distance(b,t)<w.seek;}).sort(function(a,c){return distance(b,a)-distance(b,c);})[0];b.target=sought?sought.id:null;}
  if(w.homing&&b.target){var target=uTargets(s).find(function(t){return t.id===b.target&&t.hp>0&&t.faction!==b.faction;});if(target){var a=turnTowards(Math.atan2(b.vy-(b.driftY||0),b.vx-(b.driftX||0)),Math.atan2(target.y-b.y,target.x-b.x),w.homing*dt);b.vx=uRound(Math.cos(a)*w.speed+(b.driftX||0));b.vy=uRound(Math.sin(a)*w.speed+(b.driftY||0));}}
  advanceProjectile(b,w,dt);b.x=uRound(b.x);b.y=uRound(b.y);b.t=Math.round((b.t-dt)*1000)/1000;b.arm=Math.max(0,(b.arm||0)-dt);
  var contacts=[];uQuery(grid,ax,ay,b.x,b.y,200).forEach(function(entry){var t=entry.ship,r=entry.r+(w.mine?45:0);if(Math.abs(t.x-b.x)>Math.abs(b.x-ax)+r||Math.abs(t.y-b.y)>Math.abs(b.y-ay)+r)return;if(t.hp<=0||t.faction===b.faction||t.faction<0||b.hits.indexOf(t.id)>=0||b.arm>0)return;if(sweptHit(ax,ay,b.x,b.y,t.x,t.y,r))contacts.push({kind:'ship',target:t,d:Math.hypot(t.x-ax,t.y-ay)});});
  uQuery(rockGrid,ax,ay,b.x,b.y,100).forEach(function(r){if(r.hp>0&&sweptHit(ax,ay,b.x,b.y,r.x,r.y,r.r))contacts.push({kind:'rock',target:r,d:Math.hypot(r.x-ax,r.y-ay)});});contacts.sort(function(a,b){return a.d-b.d;});
  for(var i=0;i<contacts.length;i++){var c=contacts[i],t=c.target;if(c.kind==='rock'){t.hp-=b.dmg*(w.id==='laser'?1.8:1);t.hitX=ax;t.hitY=ay;b.t=-1;}else{uDamage(s,t,b.dmg,b.owner,w);b.hits.push(t.id);if(!b.pierce)b.t=-1;else b.pierce--;}
   serverVisual(s,'impact',b.x,b.y,{max:.4,size:12,weapon:b.weapon});if(w.splash)uBlast(s,b,w,c.kind==='ship'?t:null);if(b.t<=0)break;
  }
  if(w.mine&&b.t<=0&&!b.hits.length)uBlast(s,b,w,null);
  if(b.t<=0&&w.fragments){var room=Math.min(1536-s.bullets.length-spawned.length,32-s.bullets.filter(function(q){return q.owner===b.owner&&q.t>0;}).length-spawned.filter(function(q){return q.owner===b.owner;}).length);projectileFragments(b,w,room).forEach(function(q){q.id=s.next++;spawned.push(q);});serverVisual(s,'explosion',b.x,b.y,{max:.5,size:24,weapon:w.id});}
 });s.bullets=s.bullets.filter(function(b){return b.t>0;}).concat(spawned);
}
function uBaseDefenses(s,dt){
 s.bases.forEach(function(base){if(base.hp<=0)return;base.cd=Math.max(0,(base.cd||0)-dt);if(base.cd>0)return;
  var target=null,dd=560; s.pilots.concat(s.enemies,s.escorts).forEach(function(p){if(p.hp<=0||p.faction<0||p.faction===base.faction||!visibleShip(base,p))return;var d=distance(p,base);if(d<dd){dd=d;target=p;}});
  if(target&&s.bullets.length<1536){base.cd=2;var aim=interceptPoint(base,target,390,1.8,155);base.a=Math.atan2(aim.y-base.y,aim.x-base.x);s.bullets.push({id:s.next++,x:uRound(base.x+Math.cos(base.a)*155),y:uRound(base.y+Math.sin(base.a)*155),vx:uRound(Math.cos(base.a)*390),vy:uRound(Math.sin(base.a)*390),t:1.8,faction:base.faction,dmg:8,weapon:'cannon',owner:base.id,hits:[]});serverVisual(s,'muzzle',base.x,base.y,{max:.12,size:12,a:base.a});}
 });
}
function uEscorts(s,dt){
 var grid=uGrid(uTargets(s)),owners={};s.pilots.forEach(function(p){owners[p.id]=p;});
 s.escorts=s.escorts.filter(function(e){return e.hp>0&&s.pilots.some(function(p){return p.id===e.owner;});});
 s.escorts.forEach(function(e){var owner=owners[e.owner];if(!owner||owner.hp<=0)return;e.cd=Math.max(0,(e.cd||0)-dt*(e.jam>0?.15:1));var target=null,dd=650;
  uQuery(grid,e.x,e.y,e.x,e.y,650).forEach(function(t){if(t.hp>0&&t.faction>=0&&t.faction!==e.faction&&visibleShip(e,t)){var d=distance(e,t);if(d<dd){dd=d;target=t;}}});
  var a=(e.slot||0)*Math.PI*.4+s.time*.3,tx=owner.x+Math.cos(a)*95,ty=owner.y+Math.sin(a)*95;
  if(target&&owner.stance){tx=target.x-Math.cos(e.a)*170;ty=target.y-Math.sin(e.a)*170;}
  var dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*240*(e.jam>0?.4:1));e.vx=dt>0&&d>.01?dx/d*step/dt:0;e.vy=dt>0&&d>.01?dy/d*step/dt:0;if(d>.01){e.a=Math.atan2(dy,dx);e.x=uRound(e.x+dx/d*step);e.y=uRound(e.y+dy/d*step);}
  if(target&&e.cd===0&&s.bullets.length<1536){var aa=Math.atan2(target.y-e.y,target.x-e.x);e.cd=.6;s.bullets.push({id:s.next++,x:e.x,y:e.y,vx:uRound(Math.cos(aa)*620+(e.vx||0)),vy:uRound(Math.sin(aa)*620+(e.vy||0)),t:1.2,faction:e.faction,dmg:uRound(16*(1+shipLevel(owner,'wingguns')*.4)),weapon:'cannon',owner:owner.id,hits:[]});}
 });
}

var BOT_NAMES=['Mira Vale','Theo Marlow','Nadia Storm','Kai Mercer','Petra Quinn','Rafa Vento','Luca Ferro','Iris Vanek','Yuki Amari','Noa Silva'];
function uBotName(s,hull){var used=s.pilots.filter(function(p){return !p.ai||p.hull!==hull;}).map(function(p){return p.name.toLowerCase();});for(var i=0;i<BOT_NAMES.length;i++){var name=BOT_NAMES[(hull+i)%BOT_NAMES.length];if(used.indexOf(name.toLowerCase())<0)return name;}return BOT_NAMES[hull]+' '+(hull+1);}
// Server-owned pilots use the same movement, damage, economy and shipyard as humans.
function uBotPopulation(s,ctx){
 var online=ctx.players.filter(function(p){return !p.ai&&(!ctx.presence||ctx.presence[p.id]&&ctx.presence[p.id].online);}).length;
 var bots=s.pilots.filter(function(p){return p.ai;}),wanted=online===0?HULLS.length:Math.min(bots.length,Math.max(0,WORLD_CAPACITY-online));
 s.pilots=s.pilots.filter(function(p){if(!p.ai||bots.indexOf(p)<wanted)return true;uDepart(s,p);return false;});
 for(var hull=0;hull<wanted;hull++)if(!s.pilots.some(function(p){return p.ai&&p.hull===hull;})){
  var id='bot:'+hull;uAdd(s,ctx,{id:id,name:uBotName(s,hull)});var p=s.pilots.find(function(p){return p.id===id;});
  p.ai=true;p.online=true;p.hull=hull;p.faction=hull%2;p.role=0;p.personality=[2,0,3,5,1][hull];p.scrap=120;p.tech=0;p.loadout=HULLS[hull].mounts.map(function(m){return m.type==='fixed'||m.type==='turret'?'cannon':m.type==='engine'?'drive':m.type==='reactor'?'reactor':null;});p.owned=['cannon','drive','reactor','barrier'];p.upgrades={gun:1,armor:0};p.cleared=[];p.botThink=0;uSpawn(s,p);
 }
 s.pilots.forEach(function(p){if(p.ai&&(!p.namedPilot||/^AI /.test(p.name))){p.name=uBotName(s,p.hull);p.namedPilot=true;}});
}
function uBotThink(s,p,ctx){
 var base=uFriendlyBase(s,p);if(!base)return clean({});
 if(uAtBase(s,p)){
  if(p.role!==p.personality&&p.scrap>=ROLES[p.personality].cost)uShipyard(s,p,{type:'role',role:p.personality});
  var preferred=['gatling','rail','laser','mine','homing','pulse'][p.personality];if(p.role===p.personality&&p.loadout[0]!==preferred&&shipFitStatus(p,0,preferred).ok)uShipyard(s,p,{type:'fit',slot:0,item:preferred});
  var choices=[['gun','engine','multishot','pierce'],['armor','shield','regen','gun'],['tractor','engine','gun','armor'],['engine','armor','emp','gun'],['engine','gun','emp','armor'],['hangar','wingguns','winghull','armor']][p.personality];
  var reserve=p.role===p.personality?0:ROLES[p.personality].cost;for(var i=0;i<choices.length;i++)if(shipUpgradeStatus(p,choices[i]).ok&&p.scrap-shipUpgradeStatus(p,choices[i]).cost>=reserve){uShipyard(s,p,{type:'upgrade',id:choices[i]});break;}
  if(p.role===5&&p.scrap>=95&&s.escorts.filter(function(e){return e.owner===p.id;}).length<2)uShipyard(s,p,{type:'upgrade',id:'escort'});
 }
 var returning=p.hp<p.max*.4||p.role!==p.personality&&p.scrap>=ROLES[p.personality].cost||p.role===p.personality&&p.scrap>=250;
 var enemy=s.pilots.concat(s.enemies).filter(function(t){return t.id!==p.id&&t.online!==false&&t.hp>0&&t.faction!==p.faction&&visibleShip(p,t)&&distance(t,p)<900;}).sort(function(a,b){return distance(a,p)-distance(b,p);})[0];
 var loot=s.loot.slice().sort(function(a,b){return distance(a,p)-distance(b,p);})[0],rock=s.rocks.filter(function(r){return r.hp>0&&Math.abs(r.y-p.y)<900;}).sort(function(a,b){return distance(a,p)-distance(b,p);})[0];
 var relay=s.beacons.filter(function(b){return b.owner!==p.faction;}).sort(function(a,b){return distance(a,p)-distance(b,p);})[0];
 var target=null,goal=base;
 if(!returning){
  if(enemy){target=enemy;goal=enemy;}
  else if(loot&&distance(loot,p)<900)goal=loot;
  else if(p.personality===2&&rock){target=rock;goal=rock;}
  else if(relay)goal=relay;
  else {target=s.bases.filter(function(b){return b.faction!==p.faction&&b.hp>0;}).sort(function(a,b){return distance(a,p)-distance(b,p);})[0];goal=target||base;}
 }
 var supported=p.personality===5?s.pilots.filter(function(q){return q!==p&&q.online!==false&&q.faction===p.faction&&q.hp>0&&q.hp<q.max*.8;}).sort(function(a,b){return distance(a,p)-distance(b,p);})[0]:null;if(supported&&!returning)goal=supported;
 var dx=goal.x-p.x,dy=goal.y-p.y,d=Math.hypot(dx,dy),stop=target?target.r?130:target.base?420:[220,450,130,65,380,450][p.personality]:supported?120:0;
 if(!target&&goal===base&&uAtBase(s,p))stop=120;
 var desired=Math.min(pilotMotionStats(p).speed*.8,Math.max(0,d-stop)*1.5),vx=d?dx/d*desired:0,vy=d?dy/d*desired:0;
 var ax=(vx-p.vx)*4,ay=(vy-p.vy)*4,acceleration=pilotMotionStats(p).speed*3;
 var gun=weapon(p.loadout[0])||WEAPONS[0],aim=target?interceptPoint(p,{x:target.x,y:target.y,vx:(target.vx||0)-p.vx,vy:(target.vy||0)-p.vy,ax:target.ax||0,ay:target.ay||0},gun.speed||100000,gun.life||.01):goal;
 var a=Math.atan2(aim.y-p.y,aim.x-p.x),error=Math.abs(Math.atan2(Math.sin(a-p.a),Math.cos(a-p.a)));
 if(p.role===3&&enemy&&distance(enemy,p)<280&&p.mineCd<=0&&p.energy>=25)uCommand(Object.assign({},ctx,{message:{from:p.id,data:{type:'mine'}}}));
 return clean({steering:true,thrust:clamp((ax*Math.cos(p.a)+ay*Math.sin(p.a))/acceleration,-1,1),strafe:clamp((-ax*Math.sin(p.a)+ay*Math.cos(p.a))/acceleration,-1,1),aim:a,fire:!!target&&distance(target,p)<680&&error<.18,tractor:!!loot&&distance(loot,p)<600,boost:false});
}

// Shared frontier: bounded client movement, authoritative combat and progression.
var universeLegacy=globalThis.game;
function uRound(n){return Math.round(n*10)/10;}
function uRole(p){return ROLES[p.role]||ROLES[0];}
function uStats(p){var st=shipStats(p),motion=pilotMotionStats(p);return {hp:st.hp,shield:st.shield,speed:motion.speed,turn:motion.turn,radius:motion.radius};}
function uBase(f){return {x:FACTIONS[f].baseX,y:0};}
function uFriendlyBase(s,p){var candidates=s.bases.filter(function(b){return b.faction===p.faction&&b.hp>0;});return candidates.sort(function(a,b){return distance(p,a)-distance(p,b);})[0]||null;}
function uAtBase(s,p){var base=uFriendlyBase(s,p);return base&&distance(p,base)<280?base:null;}
function uProfile(p){return {hull:p.hull,role:p.role,tech:p.tech,upgrades:p.upgrades,loadout:p.loadout,owned:p.owned,cleared:p.cleared,stance:p.stance||0,trust:{policy:4,untrusted:!!p.untrusted,violations:p.violations||0,authority:movementAuthority(p),reason:p.lastFlightReason||''}};}
function uProfilePacket(p){return {to:[p.id],data:{type:'profile',profile:uProfile(p)}};}
function uSaved(p,s){return Object.assign(uProfile(p),{world:s.worldId,scrap:p.scrap,faction:p.faction,total:p.total,day:s.day,dayScrap:p.dayScrap,spawnSeq:p.spawnSeq||0});}
function uSave(s,ctx){var docs={};Object.keys(s.parked||{}).forEach(function(id){if(s.parkedDirty&&s.parkedDirty[id]&&ctx.players.some(function(p){return p.id===id;})){delete s.parkedDirty[id];docs[id]=Object.assign({},ctx.playerStates&&ctx.playerStates[id]||{},{universe:s.parked[id],flightTrust:s.parked[id].trust});}});s.pilots.filter(function(p){return !p.ai;}).forEach(function(p){docs[p.id]=Object.assign({},ctx.playerStates&&ctx.playerStates[p.id]||{},{universe:uSaved(p,s),flightTrust:{policy:4,untrusted:!!p.untrusted,violations:p.violations||0}});});return docs;}
function uRecord(s,p){s.records[p.id]=[p.id,p.name,p.faction,p.kills||0,p.deaths||0,p.baseKills||0,Math.round(p.damage||0),p.total||0,p.shots||0,!!p.untrusted];}
function uAdd(s,ctx,person){
 var parked=s.parked[person.id],stored=ctx.playerStates&&ctx.playerStates[person.id]||{},saved=parked||stored.universe||{},same=saved.world===s.worldId,trust=stored.flightTrust||saved.trust||{};
 var currentTrust=trust.policy===4||saved.trust&&saved.trust.policy===4;
 var p={id:person.id,pilot:true,flightPolicy:4,name:(person.displayName||person.name||'Pilot').slice(0,20),faction:saved.faction===1?1:saved.faction===0?0:-1,x:0,y:0,vx:0,vy:0,a:-Math.PI/2,hp:0,max:176,energy:100,boost:100,heat:0,overheated:false,cloaked:false,lock:0,mineCd:0,respawn:0,input:clean({}),inputAck:0,lastInput:ctx.now,choiceAt:-100,spawnSeq:same?saved.spawnSeq||0:0,hull:same?clamp(saved.hull,0,4)|0:0,role:same?clamp(saved.role,0,5)|0:0,scrap:same?clamp(saved.scrap,0,1000000):120,tech:same?clamp(saved.tech,0,10000):0,upgrades:same&&saved.upgrades||{gun:1,armor:0},loadout:same&&saved.loadout||defaultLoadout(),owned:same&&saved.owned||['cannon','drive','reactor','barrier'],cleared:same&&saved.cleared||[],total:same?saved.total||0:0,dayScrap:saved.day===s.day?saved.dayScrap||0:0,sector:4,untrusted:!!(currentTrust&&(trust.untrusted||saved.trust&&saved.trust.untrusted)),violations:currentTrust?Math.max(trust.violations||0,saved.trust&&saved.trust.violations||0):0,kills:0,deaths:0,baseKills:0,damage:0,shots:0,profileDirty:true};
 p.loadout=HULLS[p.hull].mounts.map(function(m,i){return compatible(m,p.loadout[i])?p.loadout[i]||null:null;});
 if(s.records[p.id]){var row=s.records[p.id];p.kills=row[3];p.deaths=row[4];p.baseKills=row[5];p.damage=row[6];p.total=row[7];p.shots=row[8];}
 s.pilots.push(p);delete s.parked[p.id];if(s.parkedDirty)delete s.parkedDirty[p.id];if(p.faction>=0)uSpawn(s,p);
}
function uMigrate(s,ctx){
 s.pilots.forEach(function(p){if(p.flightPolicy!==4){p.flightPolicy=4;p.untrusted=false;p.violations=0;p.lastFlightReason='';if(p.audit)p.audit.score=0;p.profileDirty=true;}});
 if(s.version===2)return;
 s.worldId=s.worldId||ctx.sessionId||'local';s.escorts=s.escorts||[];s.records=s.records||{};s.parked=s.parked||{};
 var old=s.bases||[];s.bases=[];s.beacons=[];
 for(var sec=0;sec<9;sec++){for(var f=0;f<2;f++){var previous=sec===4?old.find(function(b){return b.faction===f;}):null;s.bases.push({id:'base-'+f+'-'+sec,base:true,x:FACTIONS[f].baseX,y:sectorY(sec),hp:previous?Math.min(1600,previous.hp):1600,max:1600,faction:f,sector:sec,cd:0,a:0});}s.beacons.push({x:0,y:sectorY(sec),sector:sec,owner:-1,charge:0});}
 s.pilots.forEach(function(p){p.pilot=true;p.tech=p.tech||0;p.upgrades=p.upgrades||{gun:1,armor:0};p.owned=p.owned||['cannon','drive','reactor','barrier'];p.cleared=p.cleared||[];p.loadout=p.loadout||HULLS[p.hull||0].mounts.map(function(m,i){return compatible(m,defaultLoadout()[i])?defaultLoadout()[i]||null:null;});p.boost=100;p.heat=0;p.sector=sectorAt(p.y);p.profileDirty=true;p.max=uStats(p).hp;p.hp=Math.min(p.hp,p.max);p.maxShield=uStats(p).shield;resetFlightAudit(p,ctx.now);});s.version=2;
}
function uOnline(ctx,id){return !ctx.presence||!!(ctx.presence[id]&&ctx.presence[id].online);}
function uWarp(s,p,out){if(p.hp<=0||p.faction<0)return;serverVisual(s,'warp',p.x,p.y,{max:.85,size:uStats(p).radius,a:p.a,out:!!out,hull:p.hull,role:p.role,faction:p.faction});}
function uDepart(s,p){uWarp(s,p,true);uRecord(s,p);if(!p.ai){s.parked[p.id]=uSaved(p,s);s.parkedDirty=s.parkedDirty||{};s.parkedDirty[p.id]=true;}s.escorts=s.escorts.filter(function(e){return e.owner!==p.id;});s.rosterDirty=true;}
function uReconcile(s,ctx){
 uMigrate(s,ctx);s.parked=s.parked||{};s.records=s.records||{};s.exited=s.exited||{};
 var humans=ctx.players.filter(function(p){if(!uOnline(ctx,p.id)){delete s.exited[p.id];return false;}return !p.ai&&!s.exited[p.id];}),ids=humans.map(function(p){return p.id;});
 s.pilots=s.pilots.filter(function(p){if(p.ai||ids.indexOf(p.id)>=0)return true;uDepart(s,p);return false;});
 while(Object.keys(s.parked).length>100){var oldest=Object.keys(s.parked)[0];delete s.parked[oldest];if(s.parkedDirty)delete s.parkedDirty[oldest];}
 while(Object.keys(s.records).length>64)delete s.records[Object.keys(s.records)[0]];
 humans.forEach(function(person){if(!s.pilots.some(function(p){return p.id===person.id;})&&s.pilots.filter(function(p){return !p.ai;}).length<WORLD_CAPACITY)uAdd(s,ctx,person);});s.pilots.forEach(function(p){p.online=true;});uBotPopulation(s,ctx);
}
function uSpawn(s,p){
 var base=uFriendlyBase(s,p);if(!base){p.hp=0;p.respawn=0;return false;}
 var st=uStats(p);p.x=base.x;p.y=base.y+120;p.sector=base.sector;p.vx=p.vy=p.av=0;p.pendingInputs=[];p.input=clean({});p.latestMotion=null;p.hp=p.max=st.hp;p.shield=p.maxShield=st.shield;p.energy=p.boost=100;p.heat=0;p.overheated=false;p.cloaked=false;p.respawn=0;p.lock=3;p.spawnSeq=(p.spawnSeq||0)+1;p.mounts=[];p.warpAt=s.time;resetFlightAudit(p,s.now);uWarp(s,p,false);return true;
}
function uCreate(ctx){
 if(ctx.players.filter(function(p){return !p.ai&&uOnline(ctx,p.id);}).length>WORLD_CAPACITY)return {ok:false,error:'Universe capacity reached.'};
 var s={kind:'universe',version:2,worldId:ctx.sessionId||'local',now:ctx.now,time:0,tick:0,day:Math.floor(ctx.now/86400000),pilots:[],parked:{},records:{},rocks:[],bullets:[],mines:[],loot:[],enemies:[],escorts:[],fx:[],next:1,spawn:6,control:[0,0],bases:[],beacons:[],ended:false,winner:-1};
 for(var sector=0;sector<WORLD_SECTORS;sector++){
  for(var faction=0;faction<2;faction++)s.bases.push({id:'base-'+faction+'-'+sector,base:true,x:FACTIONS[faction].baseX,y:sectorY(sector),hp:1600,max:1600,faction:faction,sector:sector,cd:0,a:0});
  s.beacons.push({x:0,y:sectorY(sector),sector:sector,owner:-1,charge:0});
  for(var j=0;j<4;j++){var index=sector*4+j,a=index*2.39996,r=500+j*240;s.rocks.push({x:uRound(Math.cos(a)*r),y:uRound(sectorY(sector)+Math.sin(a)*500),r:30+j*8,hp:42,type:index%10,a:index,seed:index+934,ore:36});}
 }
 uReconcile(s,ctx);return {ok:true,sessionState:s};
}
function uLeaderboard(s){
 var rows={};Object.keys(s.records).forEach(function(id){rows[id]=s.records[id];});s.pilots.forEach(function(p){rows[p.id]=[p.id,p.name,p.faction,p.kills||0,p.deaths||0,p.baseKills||0,Math.round(p.damage||0),p.total||0,p.shots||0,!!p.untrusted];});
 var score=function(r){return r[5]*1000+r[3]*100+Math.floor(r[6]/10)+r[7];};
 return [0,1].map(function(f){return Object.keys(rows).map(function(id){return rows[id];}).filter(function(r){return r[2]===f;}).sort(function(a,b){return score(b)-score(a)||a[4]-b[4]||a[0].localeCompare(b[0]);}).slice(0,64).map(function(r){return {id:r[0],name:r[1],kills:r[3],deaths:r[4],bases:r[5],damage:r[6],salvage:r[7],shots:r[8],untrusted:r[9],score:score(r)};});});
}
function uFinish(s){
 if(s.ended)return;var live=[0,1].map(function(f){return s.bases.some(function(b){return b.faction===f&&b.hp>0;});});
 if(live[0]&&live[1])return;
 s.ended=true;s.winner=live[0]?0:live[1]?1:-1;s.results={winner:s.winner,duration:Math.round(s.time),teams:uLeaderboard(s),bases:s.bases.map(function(b){return {faction:b.faction,sector:b.sector,destroyed:b.hp<=0};})};
}
function uMotionIntent(e){var row=encodeFlightEvent(e);row[0]=Math.round(row[0]*1000)/1000;row[1]=0;for(var i=3;i<=8;i++)if(Number.isFinite(row[i]))row[i]=Math.round(row[i]*1000)/1000;row[5]=clamp(row[5]-(e.controls.brake?1:0),-1,1);return row.slice(0,12);}
function uPilotRows(s,f,sector){var nearby=function(e){return sector===undefined||Math.abs(e.y-sectorY(sector))<2400;};
 var allies=s.pilots.filter(function(p){return p.faction===f&&p.hp>0;}),shown=s.pilots.filter(function(p){return p.faction>=0&&nearby(p)&&(!p.cloaked||p.faction===f||allies.some(function(a){return visibleShip(a,p);}));});
 var pilots=shown.map(function(p){var st=pilotMotionStats(p);return [p.id,p.name,p.faction,uRound(p.x),uRound(p.y),uRound(p.vx),uRound(p.vy),Math.round(p.a*1000)/1000,Math.ceil(p.hp),p.max,Math.round(p.shield||0),p.hull,p.role,p.cloaked,Math.round(p.energy),p.faction===f?p.scrap:0,uRound(p.respawn),s.mines.filter(function(m){return m.owner===p.id;}).length,p.hp>0&&s.now-p.lastInput<800?p.input.voiceLevel||0:0,p.inputAck||0,p.spawnSeq||0,movementAuthority(p),p.correctionSeq||0,p.sector,Math.round(p.boost),Math.round(p.heat),Math.round((p.av||0)*1000)/1000,!!p.thrusting,uMotionIntent({at:p.inputAt||s.time,seq:p.input.seq||0,controls:p.input}),(p.pendingInputs||[]).concat(p.botPlanned?[{at:p.botPlanned.at,seq:0,controls:p.botPlanned.controls}]:[]).slice(0,3).map(uMotionIntent),[uRound(st.speed),Math.round(st.turn*1000)/1000],p.warpAt??-10];});
 return pilots;
}
function uView(s,f,sector){
 var nearby=function(e){return sector===undefined||Math.abs(e.y-sectorY(sector))<2400+(e.r||0);};
 var allies=s.pilots.filter(function(p){return p.faction===f&&p.hp>0;}),pilots=uPilotRows(s,f,sector);
 var view={kind:'universe',worldId:s.worldId,mission:'universe',time:Math.round(s.time*1000)/1000,tick:s.tick,pilots:pilots,enemies:s.enemies.concat(s.escorts).filter(nearby).map(function(e){return [e.id,uRound(e.x),uRound(e.y),uRound(e.vx||0),uRound(e.vy||0),Math.round(e.a*1000)/1000,Math.ceil(e.hp),e.max||150,e.faction,e.kind||0,e.owner?s.pilots.findIndex(function(p){return p.id===e.owner;}):-1];}),pilotIds:s.pilots.map(function(p){return p.id;}),rocks:s.rocks.filter(nearby).map(function(r){return [uRound(r.x),uRound(r.y),uRound(r.r),Math.ceil(r.hp),r.type,Math.round(r.a*1000)/1000,uRound(r.vx||0),uRound(r.vy||0),Math.round((r.spin||0)*1000)/1000];}),bullets:[],shots:packShots(s.bullets.filter(function(b){return nearby(b)&&Math.abs(b.x)<3500&&Math.abs(b.y)<7500;}).map(function(b){var v=projectileVelocity(b,weapon(b.weapon)||{});return [b.id,uRound(b.x),uRound(b.y),uRound(v.vx),uRound(v.vy),uRound(b.t),b.faction,uRound(b.dmg),WEAPONS.findIndex(function(w){return w.id===b.weapon;})];})),loot:s.loot.filter(nearby),mines:s.mines.filter(function(m){return m.faction===f||allies.some(function(a){return distance(a,m)<240;});}).map(function(m){return [m.id,m.x,m.y,m.faction,uRound(m.arm),uRound(m.t)];}),bases:s.bases.map(function(b){return [b.faction,b.sector,b.x,b.y,Math.ceil(b.hp),b.max,Math.round(b.a*100)/100];}),beacons:s.beacons.map(function(b){return [b.x,b.y,b.owner,uRound(b.charge),b.sector];}),fx:s.fx.filter(function(e){return nearby(e)&&e.effect!=='muzzle';}),core:s.bases.find(function(b){return b.faction===f&&b.sector===4;})||s.bases[f],message:s.ended?'WORLD COMPLETE':('SECTOR WAR / '+s.pilots.filter(function(p){return !p.ai&&p.online!==false;}).length+'/'+WORLD_CAPACITY+' PILOTS / DESTROY EVERY ENEMY BASE'),ended:s.ended,won:s.ended&&s.winner===f,progress:s.bases.filter(function(b){return b.faction!==f&&b.hp<=0;}).length,goal:WORLD_SECTORS,results:s.ended?s.results:null};
 return view;
}
function uPackets(s,f,recipients,sector){
 var view=uView(s,f,sector),messages=[];
 if(JSON.stringify(view).length<=13500)return [{to:recipients,data:{type:'snapshot',world:view}}];
 // Stream bounded chunks before their commit snapshot. FIFO sockets make the
 // client publish the whole frame together, with no invisible nearby colliders.
 if(view.shots){for(var offset=0;offset<view.shots.length;offset+=11952)messages.push({to:recipients,data:{type:'shot-part',time:view.time,shots:view.shots.slice(offset,offset+11952)}});view.shots='';}
 var fields=['pilots','rocks','bullets','loot','mines','enemies','fx'];
 fields.forEach(function(kind){var values=view[kind];for(var i=0,chunk=kind==='pilots'?12:24;i<values.length;i+=chunk)messages.push({to:recipients,data:{type:'entity-part',time:view.time,kind:kind,values:values.slice(i,i+chunk)}});view[kind]=[];});
 if(view.results){var result=view.results;messages.push({to:recipients,data:{type:'world-results',worldId:s.worldId,results:Object.assign({},result,{teams:[[],[]]})}});result.teams.forEach(function(rows,faction){for(var i=0;i<rows.length;i+=12)messages.push({to:recipients,data:{type:'results-team',faction:faction,rows:rows.slice(i,i+12)}});});view.results=null;}
 view.multipart=true;messages.push({to:recipients,data:{type:'snapshot',world:view}});return messages;
}
function uBroadcast(s,both){var messages=[],groups={};s.pilots.forEach(function(p){if(p.faction<0||p.ai||p.online===false)return;var key=p.faction+':'+p.sector;if(!groups[key])groups[key]={f:p.faction,sector:p.sector,ids:[]};groups[key].ids.push(p.id);});Object.keys(groups).forEach(function(key){var g=groups[key];if(!both&&g.f!==s.tick%2){var rows=uPilotRows(s,g.f,g.sector);for(var i=0;i<rows.length;i+=12)messages.push({to:g.ids,data:{type:'motion',time:s.time,pilots:rows.slice(i,i+12)}});}else messages=messages.concat(uPackets(s,g.f,g.ids,g.sector));});return messages;}
function uRefit(s,p,heal){var st=uStats(p),missing=Math.max(0,p.max-p.hp);p.max=st.hp;p.hp=heal?p.max:Math.max(1,p.max-missing);p.maxShield=st.shield;p.shield=heal?st.shield:Math.min(p.shield||0,st.shield);p.profileDirty=true;p.mounts=[];p.spawnSeq++;resetFlightAudit(p,s.now);}
function uShipyard(s,p,m){
 if(p.hp<=0||!uAtBase(s,p))return 'Dock at a surviving friendly base.';
 var status;
 if(m.type==='hull'){
  status=shipHullStatus(p);if(!status.ok)return status.reason;
  var old=HULLS[p.hull],items=p.loadout.slice(),used=[];p.scrap-=status.cost;p.tech-=status.research;p.hull++;
  p.loadout=HULLS[p.hull].mounts.map(function(mount){var i=old.mounts.findIndex(function(o,i){return used.indexOf(i)<0&&o.type===mount.type&&items[i];});if(i>=0){used.push(i);return items[i];}return null;});uRefit(s,p,true);
 }else if(m.type==='role'){
  if(!Number.isInteger(m.role)||!ROLES[m.role])return 'Unknown role.';if(p.role===m.role)return '';if(p.scrap<ROLES[m.role].cost)return 'Not enough scrap.';p.scrap-=ROLES[m.role].cost;p.role=m.role;uRefit(s,p,true);
 }else if(m.type==='fit'){
  if(!Number.isInteger(m.slot))return 'Choose a mount.';var id=m.item||null;status=shipFitStatus(p,m.slot,id);if(!status.ok)return status.reason;p.scrap-=status.cost;p.tech-=status.research;if(id&&p.owned.indexOf(id)<0)p.owned.push(id);p.loadout[m.slot]=id;uRefit(s,p,false);
 }else if(m.type==='upgrade'){
  if(m.id==='repair'){var cost=SECTOR_INFO[p.sector].repair;if(p.scrap<cost)return 'Not enough scrap.';p.scrap-=cost;p.hp=p.max;p.shield=p.maxShield;s.escorts.forEach(function(e){if(e.owner===p.id)e.max=e.hp=150+shipLevel(p,'winghull')*55;});}
  else if(m.id==='escort'){var wing=s.escorts.filter(function(e){return e.owner===p.id;}).length,cost=95+wing*25;if(wing>=2+shipLevel(p,'hangar'))return 'HANGAR FULL / UPGRADE HANGAR DECK';if(p.scrap<cost)return 'Not enough scrap.';if(s.escorts.length>=160)return 'Escort traffic is at capacity.';p.scrap-=cost;s.escorts.push({id:s.next++,owner:p.id,faction:p.faction,x:p.x+65,y:p.y+35,hp:150+shipLevel(p,'winghull')*55,max:150+shipLevel(p,'winghull')*55,a:p.a,cd:1,slot:wing});}
  else{status=shipUpgradeStatus(p,m.id);if(!status.ok)return status.reason||'Unknown upgrade.';p.scrap-=status.cost;p.tech-=status.tech;p.upgrades[m.id]=status.level+1;if(m.id==='armor'||m.id==='shield')uRefit(s,p,true);if(m.id==='winghull')s.escorts.forEach(function(e){if(e.owner===p.id)e.max=e.hp=150+shipLevel(p,'winghull')*55;});}
  p.profileDirty=true;
 }
 return '';
}
function uCommand(ctx){
 var s=ctx.sessionState;if(ctx.message.data&&['choose','resync'].indexOf(ctx.message.data.type)>=0&&s.exited)delete s.exited[ctx.message.from];uReconcile(s,ctx);var p=s.pilots.find(function(p){return p.id===ctx.message.from;}),m=ctx.message.data||{};if(!p)return {ok:false,error:'Universe capacity reached. Try again when a pilot leaves.'};
 if(m.type==='scheduled-action'){if(!m.command||['cloak','mine','pulse','stance'].indexOf(m.command.type)<0||typeof m.id!=='string'||m.id.length>64||!Number.isFinite(m.at))return {ok:false,error:'Invalid scheduled action.'};p.recentActions=p.recentActions||[];if(p.recentActions.indexOf(m.id)>=0)return {ok:true,sessionState:s};p.pendingActions=p.pendingActions||[];if(p.pendingActions.length>=16)return {ok:false,error:'Action queue is full.'};p.recentActions.push(m.id);p.recentActions=p.recentActions.slice(-64);p.pendingActions.push({at:clamp(m.at,s.time,s.time+.25),command:{type:m.command.type}});p.pendingActions.sort(function(a,b){return a.at-b.at;});return {ok:true,sessionState:s};}
 if(m.type==='resync')return {ok:true,sessionState:s,broadcast:p.faction>=0?[uProfilePacket(p)].concat(uPackets(s,p.faction,[p.id])):[{to:[p.id],data:{type:'choose-faction'}}]};
 if(m.type==='leave'){var saved=uSave(s,ctx);s.exited[p.id]=true;uDepart(s,p);s.pilots=s.pilots.filter(function(q){return q!==p;});return {ok:true,sessionState:s,playerStates:saved,broadcast:uBroadcast(s,true)};}
 if(s.ended)return {ok:false,error:'This world is complete. Join the next world.'};
 if(m.type==='input'){acceptPilotInput(p,m,ctx.now,s.time);return {ok:true,sessionState:s};}
 if(m.type==='choose'){
  if(m.faction!==0&&m.faction!==1)return {ok:false,error:'Choose a faction.'};
  if(p.faction===m.faction)return {ok:true,sessionState:s,broadcast:[uProfilePacket(p)].concat(uPackets(s,p.faction,[p.id]))};
  if(p.faction>=0&&(p.hp<=0||!uAtBase(s,p)||s.time-p.choiceAt<60))return {ok:false,error:'Change sides at a surviving base after 60 seconds.'};
  if(!s.bases.some(function(b){return b.faction===m.faction&&b.hp>0;}))return {ok:false,error:'That faction has no surviving base.'};
  s.mines=s.mines.filter(function(mine){return mine.owner!==p.id;});s.escorts=s.escorts.filter(function(escort){return escort.owner!==p.id;});p.faction=m.faction;p.choiceAt=s.time;p.x=uBase(p.faction).x;p.y=0;uSpawn(s,p);
 }else if(p.faction<0)return {ok:false,error:'Choose a faction first.'};
 else if(m.type==='cloak'){if(p.cloaked)p.cloaked=false;else{if(p.hp<=0||!uRole(p).cloak||p.energy<25||p.lock>0)return {ok:false,error:'Cloak unavailable: recharge or change role.'};p.cloaked=true;}}
 else if(m.type==='mine'){if(p.hp<=0||p.cloaked||p.mineCd>0||p.energy<25||s.mines.filter(function(a){return a.owner===p.id;}).length>=uRole(p).mines||s.mines.length>=64)return {ok:false,error:'Mine rack or capacitor unavailable.'};p.energy-=25;p.mineCd=2.5;s.mines.push({id:s.next++,x:uRound(p.x-Math.cos(p.a)*45),y:uRound(p.y-Math.sin(p.a)*45),faction:p.faction,owner:p.id,arm:1.2,t:90,dmg:p.role===3?140:95});}
 else if(m.type==='jump-sector'){var destination=s.bases.find(function(b){return b.faction===p.faction&&b.sector===m.sector&&b.hp>0;});if(!uAtBase(s,p)||!destination||p.hp<=0)return {ok:false,error:'Jump from a surviving friendly base to another friendly base.'};uWarp(s,p,true);p.x=destination.x;p.y=destination.y+120;p.sector=destination.sector;p.vx=p.vy=p.av=0;p.spawnSeq++;p.warpAt=s.time;resetFlightAudit(p,s.now);uWarp(s,p,false);}
 else if(m.type==='stance'){p.stance=p.stance?0:1;}
 else if(m.type==='pulse'){if(p.hp<=0||p.pulse>0)return {ok:false,error:'EMP is recharging.'};p.pulse=14-shipLevel(p,'emp')*2;var range=420+shipLevel(p,'emp')*70,amount=110+shipLevel(p,'emp')*40;uTargets(s).forEach(function(t){if(t.hp>0&&t.faction!==p.faction&&distance(p,t)<range)uDamage(s,t,amount,p.id,{});});s.bullets=s.bullets.filter(function(b){return b.faction===p.faction||distance(p,b)>range;});serverVisual(s,'pulse',p.x,p.y,{max:.65,size:range});}
 else if(['hull','role','fit','upgrade'].indexOf(m.type)>=0){var error=uShipyard(s,p,m);if(error)return {ok:false,error:error};}
 else return {ok:false,error:'Unknown universe command.'};
 return {ok:true,sessionState:s,playerStates:uSave(s,ctx),broadcast:[uProfilePacket(p)].concat(uBroadcast(s,true))};
}
function uTick(ctx){
 var s=ctx.sessionState;if(s.ended)return {ok:true,broadcast:uBroadcast(s,true)};
 var dt=Math.max(0,Math.min(.1,(ctx.now-s.now)/1000));s.now=ctx.now;s.time+=dt;s.tick++;s.fx=s.fx.filter(function(f){if(f.effect!=='warp')return false;f.t-=dt;return f.t>0;});uReconcile(s,ctx);
 var day=Math.floor(ctx.now/86400000);if(day!==s.day){s.day=day;s.pilots.forEach(function(p){p.dayScrap=0;});}
 (ctx.inputs||[]).forEach(function(packet){var p=s.pilots.find(function(q){return q.id===packet.from;});if(p)acceptPilotInput(p,packet.data||{},ctx.now,s.time);});
 var actionPackets=[];s.pilots.slice().forEach(function(p){while(p.pendingActions&&p.pendingActions.length&&p.pendingActions[0].at<=s.time){var action=p.pendingActions.shift(),result=uCommand(Object.assign({},ctx,{message:{from:p.id,data:action.command}}));if(result.broadcast)actionPackets=actionPackets.concat(result.broadcast);if(!result.ok&&!p.ai)actionPackets.push({to:[p.id],data:{type:'notice',message:result.error}});}});
 s.pilots.forEach(function(p){
  if(p.faction<0)return;if(p.online===false){p.input=clean({});p.latestMotion=null;}
  if(p.ai){if(s.time>=(p.botThink||0)){p.botPlanned={at:s.time+.032,controls:uBotThink(s,p,ctx)};p.botThink=s.time+.1;}if(p.botPlanned&&p.botPlanned.at<=s.time){p.input=p.botPlanned.controls;p.inputAt=p.botPlanned.at;p.botPlanned=null;}p.lastInput=ctx.now;}
  if(p.hp<=0){p.respawn-=dt;if(p.respawn<=0)uSpawn(s,p);return;}
  applyQueuedPilotInput(p,s.time);var m=ctx.now-p.lastInput<800?p.input:clean({}),role=uRole(p),st=shipStats(p);
  p.mineCd=Math.max(0,p.mineCd-dt);p.pulse=Math.max(0,(p.pulse||0)-dt);p.jam=Math.max(0,(p.jam||0)-dt);p.lock=Math.max(0,p.lock-dt);p.burn=Math.max(0,(p.burn||0)-dt);if(p.burn>0)uDamage(s,p,dt*9,p.burnOwner,{});
  if(s.time-(p.lastHit||0)>6){p.shield=Math.min(p.maxShield||0,(p.shield||0)+dt*(9+shipLevel(p,'shield')*2));if(shipLevel(p,'regen'))p.hp=Math.min(p.max,p.hp+dt*shipLevel(p,'regen')*1.2);}
  if(m.fire||m.boost){p.cloaked=false;p.lock=Math.max(p.lock,2);}
  if(p.cloaked){p.energy=Math.max(0,p.energy-dt*18*role.cloak);if(!p.energy){p.cloaked=false;p.lock=3;}}else p.energy=Math.min(100,p.energy+dt*st.regen);
  p.boost=clamp(p.boost+dt*(m.boost?-34/(1+shipLevel(p,'engine')*.2):19),0,100);p.heat=Math.max(0,p.heat-dt*st.cooling);if(p.overheated&&p.heat<35)p.overheated=false;
  var oldVx=p.vx,oldVy=p.vy;stepPilotMovement(p,dt,m,s.rocks,true);
  var report=p.latestMotion||{seq:m.seq,report:m.motion};if(report.report){var auditResult=validateFlightReport(p,report.report,report.seq,ctx.now,m,s.rocks);if(!auditResult.accepted&&['none','old-input','old-spawn','resync','collision'].indexOf(auditResult.reason)<0){p.profileDirty=true;s.trustDirty=true;}}
  p.ax=clamp((p.vx-oldVx)/Math.max(dt,.001),-1200,1200);p.ay=clamp((p.vy-oldVy)/Math.max(dt,.001),-1200,1200);
  p.inputAck=Math.max(p.inputAck||0,p.input.seq||0);p.sector=sectorAt(p.y);
  uFireMounts(s,p,dt,m);
  var base=uAtBase(s,p);if(base){p.hp=Math.min(p.max,p.hp+dt*12);p.energy=Math.min(100,p.energy+dt*20);}
  if(p.role===5&&p.energy>10)s.pilots.forEach(function(q){if(q!==p&&q.faction===p.faction&&q.hp>0&&distance(p,q)<220&&q.hp<q.max){q.hp=Math.min(q.max,q.hp+dt*3);p.energy=Math.max(0,p.energy-dt*2);}});
 });
 s.enemies.concat(s.escorts).forEach(function(e){if(e.burn>0&&e.hp>0){e.burn=Math.max(0,e.burn-dt);uDamage(s,e,dt*9,e.burnOwner,{});}e.jam=Math.max(0,(e.jam||0)-dt);});
 uEscorts(s,dt);uBaseDefenses(s,dt);uProjectiles(s,dt);driftRocks(s.rocks,dt);
 var fragments=[];s.rocks=s.rocks.filter(function(r){if(r.hp>0)return true;var pieces=fractureRock(r,r.hitX||r.x-1,r.hitY||r.y);if(pieces.length&&s.rocks.length+fragments.length+pieces.length-1>96)pieces=[Object.assign({},r,{hp:Math.max(8,r.r*.85),vx:(r.vx||0)+20,spin:.5})];fragments=fragments.concat(pieces);if(!pieces.length){s.loot.push({x:uRound(r.x),y:uRound(r.y),v:r.ore??8});serverVisual(s,'explosion',r.x,r.y,{max:.7,size:r.r*.6});}return false;}).concat(fragments);
 s.mines=s.mines.filter(function(m){m.arm-=dt;m.t-=dt;if(m.t<=0)return false;if(m.arm>0)return true;var targets=uTargets(s),target=targets.find(function(p){return p.hp>0&&p.faction>=0&&p.faction!==m.faction&&distance(p,m)<(p.base?190:75);});if(!target)return true;targets.forEach(function(p){var d=distance(p,m);if(p.hp>0&&p.faction!==m.faction&&d<(p.base?260:180))uDamage(s,p,m.dmg*(1-d/(p.base?340:220)),m.owner,{});});serverVisual(s,'explosion',m.x,m.y,{max:.7,size:55});return false;});
 s.loot=s.loot.filter(function(l){var closest=null,dd=Infinity;s.pilots.forEach(function(p){if(p.hp>0&&p.faction>=0&&distance(p,l)<dd){closest=p;dd=distance(p,l);}});if(!closest)return true;var p=closest,range=(340+shipLevel(p,'tractor')*110+shipStats(p).magnet*140)*uRole(p).tractor;if(p.input.tractor&&ctx.now-p.lastInput<800&&p.energy>0&&dd<range){var a=Math.atan2(p.y-l.y,p.x-l.x);l.x+=Math.cos(a)*Math.min(dd,400*dt);l.y+=Math.sin(a)*Math.min(dd,400*dt);p.energy=Math.max(0,p.energy-dt*10);}if(dd<30){var value=Math.round(l.v*(p.role===2?1.6:1)),before=Math.floor(p.total/100);p.scrap+=value;p.total+=value;p.dayScrap+=value;p.tech+=Math.floor(p.total/100)-before;p.profileDirty=true;return false;}return true;}).slice(-48);
 s.spawn-=dt;if(s.spawn<=0){s.spawn=12;if(s.rocks.length<36){var sec=s.tick%9;s.rocks.push({x:uRound(Math.cos(s.tick)*1400),y:uRound(sectorY(sec)+Math.sin(s.tick)*500),r:45,hp:42,type:s.tick%10,a:0,seed:s.next++,ore:36});}if(s.enemies.length<8){var f=s.patrolFaction===0?1:0;s.patrolFaction=f;var active=s.pilots.filter(function(p){return p.hp>0;})[s.tick%Math.max(1,s.pilots.length)];s.enemies.push({id:s.next++,faction:f,x:(f?1:-1)*1100,y:active?sectorY(active.sector):0,vx:0,vy:0,a:0,hp:100,max:100,cd:1,kind:0});}}
 s.enemies=s.enemies.filter(function(e){if(e.hp<=0){s.loot.push({x:e.x,y:e.y,v:24});return false;}var target=s.pilots.filter(function(p){return p.hp>0&&p.faction>=0&&p.faction!==e.faction&&visibleShip(e,p);}).sort(function(a,b){return distance(a,e)-distance(b,e);})[0];if(target){var a=Math.atan2(target.y-e.y,target.x-e.x);e.a=a;if(distance(e,target)>300){e.vx=Math.cos(a)*90*(e.jam>0?.4:1);e.vy=Math.sin(a)*90*(e.jam>0?.4:1);e.x=uRound(e.x+e.vx*dt);e.y=uRound(e.y+e.vy*dt);}else e.vx=e.vy=0;e.cd-=dt*(e.jam>0?.15:1);if(e.cd<=0&&distance(e,target)<800&&s.bullets.length<1536){e.cd=1.6;s.bullets.push({id:s.next++,x:e.x,y:e.y,vx:uRound(Math.cos(a)*380+(e.vx||0)),vy:uRound(Math.sin(a)*380+(e.vy||0)),t:2.2,faction:e.faction,dmg:12,weapon:'cannon',owner:e.id,hits:[]});}}return true;});
 s.beacons.forEach(function(b){var near=s.pilots.filter(function(p){return p.online!==false&&p.hp>0&&!p.cloaked&&distance(p,b)<180;});if(near.length&&near.every(function(p){return p.faction===near[0].faction;})){if(b.owner!==near[0].faction){if(b.attacker!==near[0].faction){b.attacker=near[0].faction;b.charge=0;}b.charge+=dt;}if(b.charge>=12){b.owner=near[0].faction;b.charge=0;s.pilots.forEach(function(p){if(p.faction===b.owner){p.scrap+=80;p.tech+=1;p.profileDirty=true;}});}}else b.charge=Math.max(0,b.charge-dt);if(b.owner>=0)s.control[b.owner]+=dt;});
 s.rocks.forEach(function(r){r.x=uRound(r.x);r.y=uRound(r.y);r.r=Math.round(r.r*1000)/1000;r.a=Math.round(r.a*1000)/1000;});
 s.pilots.forEach(function(p){['x','y','vx','vy','a','hp','energy','boost','heat','lock','mineCd','respawn','damage'].forEach(function(k){p[k]=Math.round((p[k]||0)*1000)/1000;});});
 uFinish(s);var out={ok:true,sessionState:s,broadcast:actionPackets.concat(uBroadcast(s,s.ended))};
 var humans=s.pilots.filter(function(p){return !p.ai;});if(humans.length){var profile=humans[s.tick%humans.length];if(profile.profileDirty||s.tick%20===0){out.broadcast.unshift(uProfilePacket(profile));profile.profileDirty=false;}}
 if(s.tick%100===0||s.ended||s.trustDirty||s.rosterDirty){s.trustDirty=false;s.rosterDirty=false;var scores={};s.pilots.forEach(function(p){if(!p.ai)scores[p.id]=p.dayScrap;});out.scores={'daily-scrap':scores};out.playerStates=uSave(s,ctx);}
 if(s.ended)out.result={kind:'world-victory',winner:s.winner,statistics:s.results};return out;
}
globalThis.game={persistent:true,tickRateHz:30,replays:false,queues:universeLegacy.queues,createSession:function(ctx){return ctx.room&&ctx.room.metadata&&ctx.room.metadata.universe?uCreate(ctx):universeLegacy.createSession(ctx);},onMembershipChange:function(ctx){return {ok:!!(ctx.sessionState&&ctx.sessionState.kind==='universe'&&!ctx.sessionState.ended&&ctx.players.filter(function(p){return !p.ai&&(uOnline(ctx,p.id)||ctx.membership&&ctx.membership.change==='joined'&&ctx.membership.userId===p.id);}).length<=WORLD_CAPACITY)};},onPlayerMessage:function(ctx){return ctx.sessionState&&ctx.sessionState.kind==='universe'?uCommand(ctx):universeLegacy.onPlayerMessage(ctx);},onTick:function(ctx){return ctx.sessionState&&ctx.sessionState.kind==='universe'?uTick(ctx):universeLegacy.onTick(ctx);}};
// END GENERATED UNIVERSE
