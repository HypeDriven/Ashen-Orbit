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
function clean(m){return {steering:m.steering===true,turn:clamp(m.turn,-1,1),strafe:clamp(m.strafe,-1,1),thrust:clamp(m.thrust,-1,1),brake:m.brake===true,x:clamp(m.x,-1,1),y:clamp(m.y,-1,1),aim:Number.isFinite(m.aim)?clamp(m.aim,-Math.PI*2,Math.PI*2):null,fire:m.fire===true,tractor:m.tractor===true,boost:m.boost===true};}
function broadcast(s){return [{to:'all',data:{type:'snapshot',world:s}}];}
function start(ctx){
 var humans=ctx.players.filter(function(p){return !p.ai;});
 if(humans.length<1||humans.length>2)return {ok:false,error:'One daily pilot or exactly two co-op pilots required.'};
 var mission=ctx.room&&ctx.room.metadata&&ctx.room.metadata.mission;
 if(['salvage','convoy','relay'].indexOf(mission)<0)mission=humans.length===2?'salvage':'daily';
 if(humans.length!==2&&mission!=='daily')return {ok:false,error:'Co-op missions require two human pilots.'};
 var s={mission:mission,now:ctx.now,time:0,tick:0,phase:0,progress:0,goal:mission==='daily'?120:mission==='salvage'?600:mission==='convoy'?90:12,core:{x:0,y:0,hp:900,max:900},fx:[],baseDefense:mission==='convoy'?null:createBaseDefense(),pilots:[],enemies:[],bullets:[],loot:[],wave:0,spawn:2,ended:false,won:false,day:Math.floor(ctx.now/86400000),message:'Republic pilots: recover supplies and defend the garrison.',beacons:[{x:-620,y:-350},{x:620,y:-350}]};
 humans.forEach(function(p,i){s.pilots.push({id:p.id,name:p.name||'Pilot '+(i+1),x:i?70:-70,y:120,vx:0,vy:0,a:-Math.PI/2,hp:260,max:260,cd:0,revive:0,scrap:0,dayScrap:0,input:clean({}),lastInput:ctx.now});});
 for(var i=0;i<24;i++){var a=i*2.39996,r=280+(i%5)*140;s.loot.push({x:Math.cos(a)*r,y:Math.sin(a)*r,v:12});}
 return {ok:true,sessionState:s,broadcast:broadcast(s)};
}
function command(ctx){var s=ctx.sessionState,m=ctx.message.data||{},p=s&&s.pilots.find(function(p){return p.id===ctx.message.from;});if(!p)return {ok:false,error:'Not a participant.'};
 if(m.type==='resync')return {ok:true,broadcast:broadcast(s)};
 if(m.type==='input'){p.input=clean(m);p.lastInput=ctx.now;return {ok:true,sessionState:s};}
 if(m.type==='leave')return {ok:true,sessionState:s,result:{kind:'abandoned',reason:'Pilot left mission'}};
 return {ok:false,error:'Unsupported command'};
}
function tick(ctx){
 var s=ctx.sessionState;if(!s)return {ok:false,error:'No mission.'};if(s.ended)return {ok:true};
 var dt=Math.max(0,Math.min(.1,(ctx.now-s.now)/1000));s.now=ctx.now;s.time+=dt;s.tick++;s.fx=[];
 var day=Math.floor(ctx.now/86400000);if(day!==s.day){s.day=day;s.pilots.forEach(function(p){p.dayScrap=0;});}
 (ctx.inputs||[]).forEach(function(packet){var p=s.pilots.find(function(p){return p.id===packet.from;});if(p){p.input=clean(packet.data||{});p.lastInput=ctx.now;}});
 s.pilots.forEach(function(p){
  if(p.hp<=0){var partner=s.pilots.find(function(o){return o.id!==p.id&&o.hp>0&&distance(p,o)<120&&o.input.tractor&&ctx.now-o.lastInput<800;});if(partner){p.revive+=dt;if(p.revive>=4){p.hp=130;p.revive=0;}}else p.revive=0;return;}
  var m=ctx.now-p.lastInput<800?p.input:clean({});var length=Math.max(1,Math.hypot(m.x,m.y)),v=m.boost?310:m.tractor?155:215;
  var throttle=clamp(m.thrust-(m.brake?1:0),-1,1);
  if(m.steering){if(m.aim!==null){var delta=Math.atan2(Math.sin(m.aim-p.a),Math.cos(m.aim-p.a));p.a+=clamp(delta,-2.8*dt,2.8*dt);}else p.a+=m.turn*2.8*dt;p.a=Math.atan2(Math.sin(p.a),Math.cos(p.a));var mx=Math.cos(p.a)*throttle-Math.sin(p.a)*m.strafe+m.x/length,my=Math.sin(p.a)*throttle+Math.cos(p.a)*m.strafe+m.y/length,diagonal=Math.max(1,Math.hypot(mx,my));p.vx+=(mx/diagonal*v*2-p.vx*.3)*dt;p.vy+=(my/diagonal*v*2-p.vy*.3)*dt;var speed=Math.max(1,Math.hypot(p.vx,p.vy)/v);p.vx/=speed;p.vy/=speed;}else{p.vx=m.x/length*v;p.vy=m.y/length*v;}p.x=clamp(p.x+p.vx*dt,-1400,1400);p.y=clamp(p.y+p.vy*dt,-1000,1000);p.cd-=dt;
  if(!m.steering&&m.aim!==null)p.a=m.aim;else if(!m.steering){var target=null,dd=900;s.enemies.forEach(function(e){var d=distance(p,e);if(d<dd){dd=d;target=e;}});if(target)p.a=Math.atan2(target.y-p.y,target.x-p.x);}
  if(m.fire&&p.cd<=0&&s.bullets.length<200){p.cd=.2;serverVisual(s,'muzzle',p.x,p.y,{a:p.a,weapon:'cannon',size:9,max:.12});s.bullets.push({x:p.x,y:p.y,vx:Math.cos(p.a)*640,vy:Math.sin(p.a)*640,t:1.6,owner:p.id,team:0,dmg:26});}
 });
 s.spawn-=dt;if(s.spawn<=0&&s.enemies.length<24){s.wave++;s.spawn=s.mission==='daily'?2.4:3;var a=(ctx.random||.5)*Math.PI*2;for(var i=0;i<(s.mission==='daily'?2:3);i++){var aa=a+i*.2;s.enemies.push({id:s.wave*10+i,x:Math.cos(aa)*1250,y:Math.sin(aa)*850,hp:i===0&&s.wave%3===0?150:65,max:i===0&&s.wave%3===0?150:65,kind:i===0&&s.wave%3===0?1:s.wave%4===0?3:0,a:aa,cd:1.5});}}
 s.enemies.forEach(function(e){var target=s.core,dd=800;s.pilots.forEach(function(p){if(p.hp>0&&distance(p,e)<dd){dd=distance(p,e);target=p;}});if(s.baseDefense)s.baseDefense.fighters.forEach(function(f){if(f.hp>0&&distance(f,e)<Math.min(230,distance(target,e)))target=f;});e.a=Math.atan2(target.y-e.y,target.x-e.x);var d=distance(e,target),v=e.kind===1?60:105;if(d>210){e.x+=Math.cos(e.a)*v*dt;e.y+=Math.sin(e.a)*v*dt;}e.cd-=dt;if(d<900&&e.cd<=0&&s.bullets.length<200){e.cd=e.kind===3?2.4:1.6;serverVisual(s,'muzzle',e.x,e.y,{a:e.a,weapon:'cannon',size:9,max:.12});s.bullets.push({x:e.x,y:e.y,vx:Math.cos(e.a)*(e.kind===3?520:280),vy:Math.sin(e.a)*(e.kind===3?520:280),t:4,team:1,dmg:e.kind===3?24:10});}});
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

function serverVisual(s,effect,x,y,options){if(s.fx.length>=32)return;var f={effect:effect,x:x,y:y,vx:0,vy:0,t:options.max,max:options.max,seed:s.tick*37+s.fx.length};Object.keys(options).forEach(function(key){f[key]=options[key];});s.fx.push(f);}

// BEGIN GENERATED UNIVERSE
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
function voiceGain(listener,speaker){if(!listener||!speaker||listener.faction!==speaker.faction||speaker.hp<=0)return 0;const d=Math.hypot(listener.x-speaker.x,listener.y-speaker.y);if(d>=1100)return 0;if(d<=120)return 1;const t=(d-120)/980;return (1-t)*(1-t);}
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

// Authoritative shared universe, inlined after the legacy mission server.
var universeLegacy=globalThis.game;
function uRound(n){return Math.round(n*10)/10;}
function uBase(f){return {x:FACTIONS[f].baseX,y:0};}
function uRole(p){return ROLES[p.role]||ROLES[0];}
function uStats(p){var r=uRole(p);return {hp:Math.round((220+p.hull*170)*r.hp),speed:(250-p.hull*24)*r.speed,turn:(2.8-p.hull*.32)*r.turn,radius:22+p.hull*9};}
function uSave(s,ctx){var docs={};s.pilots.forEach(function(p){docs[p.id]=Object.assign({},ctx.playerStates&&ctx.playerStates[p.id]||{},{universe:{scrap:p.scrap,hull:p.hull,role:p.role,faction:p.faction,total:p.total,day:s.day,dayScrap:p.dayScrap}});});return docs;}
function uAdd(s,ctx,p){var saved=s.parked&&s.parked[p.id]||ctx.playerStates&&ctx.playerStates[p.id]&&ctx.playerStates[p.id].universe||{},q={id:p.id,name:(p.displayName||p.name||'Pilot').slice(0,20),faction:-1,x:0,y:0,vx:0,vy:0,a:-Math.PI/2,hp:220,max:220,scrap:Number.isFinite(saved.scrap)?clamp(saved.scrap,0,1000000):120,hull:clamp(saved.hull,0,4)|0,role:clamp(saved.role,0,5)|0,total:clamp(saved.total,0,1000000),dayScrap:saved.day===s.day?clamp(saved.dayScrap,0,1000000):0,energy:100,cloaked:false,lock:0,mineCd:0,cd:0,respawn:0,input:clean({}),lastInput:ctx.now,choiceAt:-100};s.pilots.push(q);if(s.parked)delete s.parked[p.id];}
function uReconcile(s,ctx){s.parked=s.parked||{};var ids=ctx.players.filter(function(p){return !p.ai;}).map(function(p){return p.id;});s.pilots=s.pilots.filter(function(p){if(ids.indexOf(p.id)>=0)return true;s.parked[p.id]={scrap:p.scrap,hull:p.hull,role:p.role,total:p.total,day:s.day,dayScrap:p.dayScrap};return false;});var parkedIds=Object.keys(s.parked);while(parkedIds.length>16)delete s.parked[parkedIds.shift()];ctx.players.forEach(function(p){if(!p.ai&&!s.pilots.some(function(q){return q.id===p.id;}))uAdd(s,ctx,p);});}
function uSpawn(p){var b=uBase(p.faction),st=uStats(p);p.x=b.x;p.y=b.y+120;p.vx=p.vy=0;p.hp=p.max=st.hp;p.shield=p.maxShield=p.role===1?140:0;p.energy=100;p.cloaked=false;p.respawn=0;p.lock=3;}
function uView(s,f){
 var allies=s.pilots.filter(function(p){return p.faction===f&&p.hp>0;}),shown=s.pilots.filter(function(p){return p.faction>=0&&(!p.cloaked||p.faction===f||allies.some(function(a){return visibleShip(a,p);}));});
 var pilots=shown.map(function(p){return {id:p.id,name:p.name,faction:p.faction,x:uRound(p.x),y:uRound(p.y),vx:uRound(p.vx),vy:uRound(p.vy),a:uRound(p.a),hp:Math.ceil(p.hp),max:p.max,shield:Math.round(p.shield||0),hull:p.hull,role:p.role,cloaked:p.cloaked,energy:Math.round(p.energy),scrap:p.faction===f?p.scrap:0,dayScrap:p.dayScrap,respawn:p.respawn,mineCount:s.mines.filter(function(m){return m.owner===p.id;}).length};});
 var view={kind:'universe',mission:'universe',time:uRound(s.time),tick:s.tick,pilots:pilots,enemies:s.enemies,rocks:s.rocks.map(function(r){return [uRound(r.x),uRound(r.y),uRound(r.r),Math.ceil(r.hp),r.type,Math.round(r.a*1000)/1000,uRound(r.vx||0),uRound(r.vy||0),Math.round((r.spin||0)*1000)/1000];}),bullets:s.bullets.map(function(b){return [b.id,b.x,b.y,b.vx,b.vy,uRound(b.t),b.faction,b.dmg,b.weapon];}),loot:s.loot,mines:s.mines.filter(function(m){return m.faction===f||allies.some(function(a){return distance(a,m)<240;});}).map(function(m){return [m.id,m.x,m.y,m.faction,uRound(m.arm),uRound(m.t)];}),bases:s.bases,beacons:s.beacons,fx:s.fx,core:s.bases[f],message:'Shared frontier / '+s.pilots.length+'/'+WORLD_CAPACITY+' pilots',ended:false,won:false,progress:s.control[f],goal:10000};while(JSON.stringify(view).length>11000){if(view.rocks.length>8)view.rocks.pop();else if(view.bullets.length>8)view.bullets.pop();else if(view.loot.length>8)view.loot.pop();else break;}return view;
}
function uBroadcast(s,side){var list=[];var selected=side===undefined?s.tick%2:side;for(var f=selected;f<=selected;f++){var recipients=s.pilots.filter(function(p){return p.faction===f;}).map(function(p){return p.id;});if(recipients.length)list.push({to:recipients,data:{type:'snapshot',world:uView(s,f)}});}return list;}
function uCreate(ctx){if(ctx.players.filter(function(p){return !p.ai;}).length>WORLD_CAPACITY)return {ok:false,error:'Universe capacity reached.'};var s={kind:'universe',now:ctx.now,time:0,tick:0,day:Math.floor(ctx.now/86400000),pilots:[],rocks:[],bullets:[],mines:[],loot:[],enemies:[],fx:[],next:1,spawn:6,control:[0,0],bases:[{x:-2200,y:0,hp:2000,max:2000,faction:0},{x:2200,y:0,hp:2000,max:2000,faction:1}],beacons:[{x:0,y:-1200,owner:-1,charge:0},{x:0,y:1200,owner:-1,charge:0}]};for(var i=0;i<24;i++){var a=i*2.39996,r=450+(i%7)*220;s.rocks.push({x:uRound(Math.cos(a)*r),y:uRound(Math.sin(a)*r),r:30+i%5*9,hp:42,type:i%10,a:i,seed:i+934,ore:28});}uReconcile(s,ctx);return {ok:true,sessionState:s};}
function uHit(s,p,amount){if(p.hp<=0)return;var absorbed=Math.min(p.shield||0,amount);p.shield=Math.max(0,(p.shield||0)-absorbed);p.hp-=amount-absorbed;p.cloaked=false;p.lock=3;serverVisual(s,'impact',p.x,p.y,{max:.65,size:15,weapon:'cannon'});if(p.hp<=0){p.hp=0;p.respawn=8;p.vx=p.vy=0;serverVisual(s,'explosion',p.x,p.y,{max:1.7,size:35+(p.hull||0)*8});}}
function uCommand(ctx){var s=ctx.sessionState;uReconcile(s,ctx);var p=s.pilots.find(function(p){return p.id===ctx.message.from;}),m=ctx.message.data||{};if(!p)return {ok:false,error:'Wait for universe membership.'};
 if(m.type==='input'){p.input=clean(m);p.lastInput=ctx.now;return {ok:true,sessionState:s};}
 if(m.type==='resync')return {ok:true,broadcast:p.faction>=0?[{to:[p.id],data:{type:'snapshot',world:uView(s,p.faction)}}]:[]};
 if(m.type==='choose'){if(m.faction!==0&&m.faction!==1)return {ok:false,error:'Choose a faction.'};if(p.faction>=0&&(distance(p,uBase(p.faction))>280||s.time-p.choiceAt<60))return {ok:false,error:'Change sides at base after 60 seconds.'};p.faction=m.faction;p.choiceAt=s.time;uSpawn(p);}
 else if(m.type==='cloak'){if(p.cloaked)p.cloaked=false;else{if(p.hp<=0||!uRole(p).cloak||p.energy<25||p.lock>0)return {ok:false,error:'Cloak unavailable: recharge or change role.'};p.cloaked=true;}}
 else if(m.type==='mine'){var r=uRole(p);if(p.hp<=0||p.cloaked||p.mineCd>0||p.energy<25||s.mines.filter(function(a){return a.owner===p.id;}).length>=r.mines||s.mines.length>=64)return {ok:false,error:'Mine rack or capacitor unavailable.'};p.energy-=25;p.mineCd=2.5;s.mines.push({id:s.next++,x:uRound(p.x-Math.cos(p.a)*45),y:uRound(p.y-Math.sin(p.a)*45),faction:p.faction,owner:p.id,arm:1.2,t:90,dmg:p.role===3?140:95});}
 else if(m.type==='hull'||m.type==='role'){if(p.faction<0||p.hp<=0||distance(p,uBase(p.faction))>280)return {ok:false,error:'Dock at your faction base.'};var cost;if(m.type==='hull'){if(p.hull>=4)return {ok:false,error:'Largest hull.'};cost=[450,800,1300,2100][p.hull];if(p.scrap<cost)return {ok:false,error:'Not enough scrap.'};p.scrap-=cost;p.hull++;}else{if(!Number.isInteger(m.role)||!ROLES[m.role])return {ok:false,error:'Unknown role.'};cost=ROLES[m.role].cost;if(p.role===m.role)return {ok:true};if(p.scrap<cost)return {ok:false,error:'Not enough scrap.'};p.scrap-=cost;p.role=m.role;}uSpawn(p);}
 else if(m.type==='leave')return {ok:true,playerStates:uSave(s,ctx)};
 else return {ok:false,error:'Unknown universe command.'};
 return {ok:true,sessionState:s,playerStates:uSave(s,ctx),broadcast:uBroadcast(s,p.faction)};
}
function uTick(ctx){var s=ctx.sessionState,dt=Math.max(0,Math.min(.1,(ctx.now-s.now)/1000));s.now=ctx.now;s.time+=dt;s.tick++;s.fx=[];uReconcile(s,ctx);var day=Math.floor(ctx.now/86400000);if(day!==s.day){s.day=day;s.pilots.forEach(function(p){p.dayScrap=0;});}
 (ctx.inputs||[]).forEach(function(packet){var p=s.pilots.find(function(q){return q.id===packet.from;});if(p){p.input=clean(packet.data||{});p.lastInput=ctx.now;}});
 var offset=s.tick%Math.max(1,s.pilots.length),order=s.pilots.slice(offset).concat(s.pilots.slice(0,offset));order.forEach(function(p){if(p.faction<0)return;if(p.hp<=0){p.respawn-=dt;if(p.respawn<=0)uSpawn(p);return;}var m=ctx.now-p.lastInput<800?p.input:clean({}),st=uStats(p),role=uRole(p);p.cd-=dt;p.mineCd-=dt;p.lock=Math.max(0,p.lock-dt);if(p.lock===0)p.shield=Math.min(p.maxShield||0,(p.shield||0)+dt*8);
 if(m.fire||m.boost){p.cloaked=false;p.lock=Math.max(p.lock,2);}if(p.cloaked){p.energy-=dt*18*role.cloak;if(p.energy<=0){p.cloaked=false;p.energy=0;p.lock=3;}}else p.energy=Math.min(100,p.energy+dt*12);
 if(m.aim!==null){var da=Math.atan2(Math.sin(m.aim-p.a),Math.cos(m.aim-p.a));p.a+=clamp(da,-st.turn*dt,st.turn*dt);}else if(m.steering)p.a+=m.turn*st.turn*dt;
 var thrust=clamp(m.thrust-(m.brake?1:0),-1,1),dx=m.steering?Math.cos(p.a)*thrust-Math.sin(p.a)*m.strafe:m.x,dy=m.steering?Math.sin(p.a)*thrust+Math.cos(p.a)*m.strafe:m.y,n=Math.max(1,Math.hypot(dx,dy)),speed=st.speed*(m.boost&&!p.cloaked?1.65:1)*(p.cloaked?.65:1)*(m.tractor?.75:1);
 p.vx+=(dx/n*speed*2-p.vx*3)*dt;p.vy+=(dy/n*speed*2-p.vy*3)*dt;var v=Math.max(1,Math.hypot(p.vx,p.vy)/speed);p.vx/=v;p.vy/=v;p.x=clamp(p.x+p.vx*dt,-3200,3200);p.y=clamp(p.y+p.vy*dt,-2400,2400);s.rocks.forEach(function(r){var d=distance(p,r),radius=r.r+st.radius;if(d<radius){var a=Math.atan2(p.y-r.y,p.x-r.x);p.x=r.x+Math.cos(a)*radius;p.y=r.y+Math.sin(a)*radius;p.vx*=.65;p.vy*=.65;}});
 if(m.fire&&!p.cloaked&&p.cd<=0&&s.bullets.length<48){p.cd=p.role===0?.22:.36;var shots=1+Math.floor(p.hull/2);for(var i=0;i<shots;i++){var a=p.a+(i-(shots-1)/2)*.09;s.bullets.push({id:s.next++,x:uRound(p.x+Math.cos(a)*st.radius),y:uRound(p.y+Math.sin(a)*st.radius),vx:uRound(Math.cos(a)*780),vy:uRound(Math.sin(a)*780),t:1.4,faction:p.faction,dmg:Math.round((20+p.hull*5)*role.damage),weapon:p.role===2?'laser':'cannon'});}serverVisual(s,'muzzle',p.x,p.y,{a:p.a,max:.12,size:9});}
 var base=uBase(p.faction);if(distance(p,base)<260){p.hp=Math.min(p.max,p.hp+dt*12);p.energy=Math.min(100,p.energy+dt*20);}if(p.role===5&&p.energy>10)s.pilots.forEach(function(q){if(q!==p&&q.faction===p.faction&&q.hp>0&&distance(p,q)<220&&q.hp<q.max){q.hp=Math.min(q.max,q.hp+dt*3);p.energy=Math.max(0,p.energy-dt*2);}});
 });
 driftRocks(s.rocks,dt);
 var children=[];s.bullets.forEach(function(b){var ax=b.x,ay=b.y;b.x=uRound(b.x+b.vx*dt);b.y=uRound(b.y+b.vy*dt);b.t=Math.round((b.t-dt)*1000)/1000;var targets=s.pilots.concat(s.enemies);for(var i=0;i<targets.length;i++){var p=targets[i];if(p.faction===b.faction||p.faction<0||p.hp<=0)continue;if(sweptHit(ax,ay,b.x,b.y,p.x,p.y,p.id&&typeof p.id==='string'?uStats(p).radius:20)){uHit(s,p,b.dmg);b.t=-1;break;}}
 if(b.t<=0)return;for(var j=0;j<s.rocks.length;j++){var r=s.rocks[j];if(r.hp>0&&sweptHit(ax,ay,b.x,b.y,r.x,r.y,r.r)){r.hp-=b.dmg*(b.weapon==='laser'?1.8:1);b.t=-1;serverVisual(s,'impact',b.x,b.y,{max:.65,size:12});if(r.hp<=0){var bits=fractureRock(r,ax,ay);if(bits.length&&s.rocks.length+children.length+bits.length-1>48){bits=[bits[0]];bits[0].ore=r.ore;}children=children.concat(bits);if(!bits.length){s.loot.push({x:uRound(r.x),y:uRound(r.y),v:r.ore||8});serverVisual(s,'explosion',r.x,r.y,{max:1.7,size:r.r*.6});}}break;}}});s.bullets=s.bullets.filter(function(b){return b.t>0;});s.rocks=s.rocks.filter(function(r){return r.hp>0;}).concat(children);
 s.mines=s.mines.filter(function(m){m.arm-=dt;m.t-=dt;if(m.t<=0)return false;if(m.arm>0)return true;var target=s.pilots.concat(s.enemies).find(function(p){return p.hp>0&&p.faction>=0&&p.faction!==m.faction&&distance(p,m)<75;});if(!target)return true;s.pilots.concat(s.enemies).forEach(function(p){if(p.hp>0&&p.faction!==m.faction&&distance(p,m)<180)uHit(s,p,m.dmg*(1-distance(p,m)/220));});serverVisual(s,'explosion',m.x,m.y,{max:1.7,size:55});return false;});
 s.loot=s.loot.filter(function(l){var closest=null,dd=Infinity;s.pilots.forEach(function(p){if(p.hp>0&&p.faction>=0&&distance(p,l)<dd){closest=p;dd=distance(p,l);}});if(!closest)return true;var tow=closest.input.tractor&&ctx.now-closest.lastInput<800;if(tow&&dd<420*uRole(closest).tractor){var a=Math.atan2(closest.y-l.y,closest.x-l.x);l.x+=Math.cos(a)*Math.min(dd,400*dt);l.y+=Math.sin(a)*Math.min(dd,400*dt);}if(dd<30){var value=Math.round(l.v*(closest.role===2?1.6:1));closest.scrap+=value;closest.total+=value;closest.dayScrap+=value;return false;}return true;}).slice(-32);
 s.spawn-=dt;if(s.spawn<=0){s.spawn=12;if(s.rocks.length<16){var a=s.tick*2.39996;s.rocks.push({x:uRound(Math.cos(a)*1400),y:uRound(Math.sin(a)*1400),r:55,hp:50,type:s.tick%10,a:0,seed:s.next++,ore:28});}if(s.enemies.length<8){var f=s.patrolFaction===0?1:0;s.patrolFaction=f;s.enemies.push({id:s.next++,faction:f,x:(f?1:-1)*1100,y:Math.sin(s.tick)*1500,vx:0,vy:0,a:0,hp:100,max:100,cd:1,kind:0});}}
 s.enemies=s.enemies.filter(function(e){if(e.hp<=0){s.loot.push({x:e.x,y:e.y,v:24});return false;}var target=s.pilots.filter(function(p){return p.hp>0&&p.faction>=0&&p.faction!==e.faction&&visibleShip(e,p);}).sort(function(a,b){return distance(a,e)-distance(b,e);})[0];if(target){var a=Math.atan2(target.y-e.y,target.x-e.x);e.a=a;if(distance(e,target)>300){e.x=uRound(e.x+Math.cos(a)*90*dt);e.y=uRound(e.y+Math.sin(a)*90*dt);}e.cd-=dt;if(e.cd<=0&&distance(e,target)<800&&s.bullets.length<48){e.cd=1.6;s.bullets.push({id:s.next++,x:e.x,y:e.y,vx:uRound(Math.cos(a)*380),vy:uRound(Math.sin(a)*380),t:2.2,faction:e.faction,dmg:12,weapon:'cannon'});}}return true;});
 s.bases.forEach(function(base){s.pilots.concat(s.enemies).forEach(function(p){if(p.hp>0&&p.faction>=0&&p.faction!==base.faction&&distance(p,base)<400)uHit(s,p,dt*12);});});
 s.beacons.forEach(function(b){var near=s.pilots.filter(function(p){return p.hp>0&&!p.cloaked&&distance(p,b)<180;});if(near.length&&near.every(function(p){return p.faction===near[0].faction;})){if(b.owner!==near[0].faction)b.charge+=dt;if(b.charge>=12){b.owner=near[0].faction;b.charge=0;}}else b.charge=Math.max(0,b.charge-dt);if(b.owner>=0)s.control[b.owner]+=dt;});
 // Compact numeric state prevents unbounded serialization precision and stays in the script budget.
 s.rocks.forEach(function(r){r.x=uRound(r.x);r.y=uRound(r.y);r.r=Math.round(r.r*1000)/1000;r.a=Math.round(r.a*1000)/1000;});s.pilots.forEach(function(p){p.x=uRound(p.x);p.y=uRound(p.y);['vx','vy','a','hp','energy','lock','mineCd','cd','respawn'].forEach(function(k){p[k]=Math.round(p[k]*1000)/1000;});});
 var out={ok:true,sessionState:s,broadcast:uBroadcast(s)};if(s.tick%100===0){var scores={};s.pilots.forEach(function(p){scores[p.id]=p.dayScrap;});out.scores={'daily-scrap':scores};out.playerStates=uSave(s,ctx);}return out;
}
globalThis.game={persistent:true,tickRateHz:20,replays:false,queues:universeLegacy.queues,createSession:function(ctx){return ctx.room&&ctx.room.metadata&&ctx.room.metadata.universe?uCreate(ctx):universeLegacy.createSession(ctx);},onMembershipChange:function(ctx){return {ok:!!(ctx.sessionState&&ctx.sessionState.kind==='universe'&&ctx.players.filter(function(p){return !p.ai;}).length<=WORLD_CAPACITY)};},onPlayerMessage:function(ctx){return ctx.sessionState&&ctx.sessionState.kind==='universe'?uCommand(ctx):universeLegacy.onPlayerMessage(ctx);},onTick:function(ctx){return ctx.sessionState&&ctx.sessionState.kind==='universe'?uTick(ctx):universeLegacy.onTick(ctx);}};

// END GENERATED UNIVERSE
