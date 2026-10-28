// Shared deterministic station defenses. This module is inlined into server.js by
// scripts/sync-defenses.mjs so campaign and authoritative missions use the same rules.
export function createBaseDefense(){
 var d={shields:[],turrets:[],fighters:[],fx:[]};
 for(var i=0;i<3;i++){var a=-Math.PI/2+i*Math.PI*2/3;d.shields.push({x:Math.cos(a)*215,y:Math.sin(a)*215,r:82,hp:65,max:65,recharge:0,flash:0});}
 for(var j=0;j<2;j++)d.turrets.push({x:j?145:-145,y:-75,a:-Math.PI/2,cd:j*.4});
 for(var k=0;k<6;k++){var angle=k*Math.PI/3,r=130+(k%3)*18;d.fighters.push({x:Math.cos(angle)*r,y:Math.sin(angle)*r,a:angle+Math.PI/2,hp:28,max:28,down:false,cd:k*.13,respawn:0,squad:Math.floor(k/3),slot:k});}
 return d;
}
function baseDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function baseBeam(d,x,y,xx,yy,kind){d.fx.push({x:x,y:y,x2:xx,y2:yy,t:.14,kind:kind});}
export function updateBaseDefense(d,dt,time,enemies,bullets,hitEnemy){
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
export function interceptBaseShot(d,b,ax,ay,bx,by){
 if(!b.team||b.t<=0)return false;
 var hits=[];
 d.shields.forEach(function(s){if(s.hp<=0||Math.hypot(ax-s.x,ay-s.y)<s.r)return;var t=baseCircleEntry(ax,ay,bx,by,s.x,s.y,s.r);if(t!==null)hits.push({t:t,shield:s});});
 d.fighters.forEach(function(f){if(f.hp<=0)return;var t=baseCircleEntry(ax,ay,bx,by,f.x,f.y,9);if(t!==null)hits.push({t:t,fighter:f});});
 hits.sort(function(a,b){return a.t-b.t;});
 for(var i=0;i<hits.length;i++){var h=hits[i];if(h.shield){var s=h.shield,absorbed=Math.min(s.hp,b.dmg);s.hp-=absorbed;s.recharge=8;s.flash=.2;b.dmg-=absorbed;if(b.dmg<=0){b.t=-1;return true;}}
  else{var f=h.fighter;f.hp=Math.max(0,f.hp-b.dmg);if(f.hp===0){f.down=true;f.respawn=45+f.slot*2;}b.t=-1;return true;}}
 return false;
}
