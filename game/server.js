'use strict';
// StarHermit authoritative daily salvage and two-pilot PvE missions.
// All motion, damage, collection and score calculations happen here.
function clamp(v,a,b){return Number.isFinite(v)?Math.max(a,Math.min(b,v)):0;}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function clean(m){return {x:clamp(m.x,-1,1),y:clamp(m.y,-1,1),aim:Number.isFinite(m.aim)?clamp(m.aim,-Math.PI*2,Math.PI*2):null,fire:m.fire===true,tractor:m.tractor===true,boost:m.boost===true};}
function broadcast(s){return [{to:'all',data:{type:'snapshot',world:s}}];}
function start(ctx){
 var humans=ctx.players.filter(function(p){return !p.ai;});
 if(humans.length<1||humans.length>2)return {ok:false,error:'One daily pilot or exactly two co-op pilots required.'};
 var mission=ctx.room&&ctx.room.metadata&&ctx.room.metadata.mission;
 if(['salvage','convoy','relay'].indexOf(mission)<0)mission=humans.length===2?'salvage':'daily';
 if(humans.length!==2&&mission!=='daily')return {ok:false,error:'Co-op missions require two human pilots.'};
 var s={mission:mission,now:ctx.now,time:0,tick:0,phase:0,progress:0,goal:mission==='daily'?120:mission==='salvage'?600:mission==='convoy'?90:12,core:{x:0,y:0,hp:900,max:900},pilots:[],enemies:[],bullets:[],loot:[],wave:0,spawn:2,ended:false,won:false,day:Math.floor(ctx.now/86400000),message:'Collect scrap; protect your partner.',beacons:[{x:-620,y:-350},{x:620,y:-350}]};
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
 var dt=Math.max(0,Math.min(.1,(ctx.now-s.now)/1000));s.now=ctx.now;s.time+=dt;s.tick++;
 var day=Math.floor(ctx.now/86400000);if(day!==s.day){s.day=day;s.pilots.forEach(function(p){p.dayScrap=0;});}
 (ctx.inputs||[]).forEach(function(packet){var p=s.pilots.find(function(p){return p.id===packet.from;});if(p){p.input=clean(packet.data||{});p.lastInput=ctx.now;}});
 s.pilots.forEach(function(p){
  if(p.hp<=0){var partner=s.pilots.find(function(o){return o.id!==p.id&&o.hp>0&&distance(p,o)<120&&o.input.tractor&&ctx.now-o.lastInput<800;});if(partner){p.revive+=dt;if(p.revive>=4){p.hp=130;p.revive=0;}}else p.revive=0;return;}
  var m=ctx.now-p.lastInput<800?p.input:clean({});var length=Math.max(1,Math.hypot(m.x,m.y)),v=m.boost?310:m.tractor?155:215;
  p.vx=m.x/length*v;p.vy=m.y/length*v;p.x=clamp(p.x+p.vx*dt,-1400,1400);p.y=clamp(p.y+p.vy*dt,-1000,1000);p.cd-=dt;
  if(m.aim!==null)p.a=m.aim;else{var target=null,dd=900;s.enemies.forEach(function(e){var d=distance(p,e);if(d<dd){dd=d;target=e;}});if(target)p.a=Math.atan2(target.y-p.y,target.x-p.x);}
  if(m.fire&&p.cd<=0&&s.bullets.length<200){p.cd=.2;s.bullets.push({x:p.x,y:p.y,vx:Math.cos(p.a)*640,vy:Math.sin(p.a)*640,t:1.6,owner:p.id,team:0,dmg:26});}
 });
 s.spawn-=dt;if(s.spawn<=0&&s.enemies.length<24){s.wave++;s.spawn=s.mission==='daily'?2.4:3;var a=(ctx.random||.5)*Math.PI*2;for(var i=0;i<(s.mission==='daily'?2:3);i++){var aa=a+i*.2;s.enemies.push({id:s.wave*10+i,x:Math.cos(aa)*1250,y:Math.sin(aa)*850,hp:i===0&&s.wave%3===0?150:65,max:i===0&&s.wave%3===0?150:65,kind:i===0&&s.wave%3===0?1:s.wave%4===0?3:0,a:aa,cd:1.5});}}
 s.enemies.forEach(function(e){var target=s.core,dd=800;s.pilots.forEach(function(p){if(p.hp>0&&distance(p,e)<dd){dd=distance(p,e);target=p;}});e.a=Math.atan2(target.y-e.y,target.x-e.x);var d=distance(e,target),v=e.kind===1?60:105;if(d>210){e.x+=Math.cos(e.a)*v*dt;e.y+=Math.sin(e.a)*v*dt;}e.cd-=dt;if(d<900&&e.cd<=0&&s.bullets.length<200){e.cd=e.kind===3?2.4:1.6;s.bullets.push({x:e.x,y:e.y,vx:Math.cos(e.a)*(e.kind===3?520:280),vy:Math.sin(e.a)*(e.kind===3?520:280),t:4,team:1,dmg:e.kind===3?24:10});}});
 s.bullets.forEach(function(b){b.x+=b.vx*dt;b.y+=b.vy*dt;b.t-=dt;var targets=b.team?s.pilots.concat([s.core]):s.enemies;for(var i=0;i<targets.length;i++){var t=targets[i];if(t.hp>0&&distance(b,t)<(t===s.core?65:25)){t.hp-=b.dmg;b.t=-1;break;}}});
 s.bullets=s.bullets.filter(function(b){return b.t>0;});
 s.enemies=s.enemies.filter(function(e){if(e.hp>0)return true;for(var i=0;i<3;i++)s.loot.push({x:e.x+(i-1)*22,y:e.y,v:12});return false;});
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
