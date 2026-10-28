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
 var s={mission:mission,now:ctx.now,time:0,tick:0,phase:0,progress:0,goal:mission==='daily'?120:mission==='salvage'?600:mission==='convoy'?90:12,core:{x:0,y:0,hp:900,max:900},fx:[],baseDefense:mission==='convoy'?null:createBaseDefense(),pilots:[],enemies:[],bullets:[],loot:[],wave:0,spawn:2,ended:false,won:false,day:Math.floor(ctx.now/86400000),message:'Collect scrap; protect your partner.',beacons:[{x:-620,y:-350},{x:620,y:-350}]};
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
 if(s.mission==='salvage'){var both=s.pilots.length===2&&s.pilots.every(function(p){return p.hp>0&&distance(p,s.core)<230;});var total=s.pilots.reduce(function(n,p){return n+p.scrap;},0);s.progress=total;s.message=total<600?'Recover 600 scrap. One pilot tows; one protects the core.':'Cargo full. Both pilots return to the ring!';if(total>=600&&both)s.won=true;}
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
