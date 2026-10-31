// Invocation-local broad phase: centers occupy one cell; queries include radii.
function uGrid(items){var grid={};items.forEach(function(e){var key=Math.floor(e.x/400)+':'+Math.floor(e.y/400);(grid[key]||(grid[key]=[])).push(e);});return grid;}
function uQuery(grid,ax,ay,bx,by,pad){var found=[];for(var x=Math.floor((Math.min(ax,bx)-pad)/400);x<=Math.floor((Math.max(ax,bx)+pad)/400);x++)for(var y=Math.floor((Math.min(ay,by)-pad)/400);y<=Math.floor((Math.max(ay,by)+pad)/400);y++){var cell=grid[x+':'+y];if(cell)found=found.concat(cell);}return found;}
// Shared-world combat uses the same catalog, mounts, upgrade ranks and resource
// costs as the solo shipyard. Outcomes remain on the server.
function uTargets(s){return s.pilots.concat(s.enemies,s.escorts||[],s.bases);}
function uRadius(p){return p.base?150:p.pilot?uStats(p).radius:p.mining?9:p.owner?13:22;}
function uShooter(s,id){return s.pilots.find(function(p){return p.id===id;});}
function uDamage(s,target,amount,owner,w,direction){
 if(target.hp<=0||amount<=0)return;recordShipImpact(target,amount,direction,s.time);
 amount*=target.base&&w&&w.structure||1;var pilot=uShooter(s,owner),before=target.hp+(target.shield||0),shieldFactor=w&&w.shield||1;
 var absorbed=Math.min(target.shield||0,amount*shieldFactor);target.shield=Math.max(0,(target.shield||0)-absorbed);amount=Math.max(0,amount-absorbed/shieldFactor);
 if(!target.base&&target.kind===1&&!target.pilot)amount*=.72*(w&&w.armor||1);
 target.hp=Math.max(0,target.hp-amount);target.lastHit=s.time;
 if(!target.base){target.cloaked=false;target.lock=3;if(w&&w.jam)target.jam=Math.max(target.jam||0,w.jam);if(w&&w.burn){target.burn=Math.max(target.burn||0,w.burn);target.burnOwner=owner;}}
 if(pilot){pilot.damage=(pilot.damage||0)+Math.max(0,before-target.hp-(target.shield||0));if(w&&w.heal)pilot.hp=Math.min(pilot.max,pilot.hp+Math.min(amount,before)*w.heal);}
 if(target.hp===0){
  if(target.base)serverVisual(s,'explosion',target.x,target.y,{max:1.7,size:160});else serverVisual(s,'ship-breakup',target.x,target.y,shipBreakup(target,s.time));
  if(target.base){target.destroyedAt=s.time;target.killer=owner||'';if(pilot)pilot.baseKills=(pilot.baseKills||0)+1;var winningSide=1-target.faction;s.pilots.forEach(function(p){if(p.faction===winningSide){p.scrap+=120;p.tech+=2;if(p.cleared.indexOf(target.sector)<0)p.cleared.push(target.sector);p.profileDirty=true;}});}
  else if(target.pilot){target.deaths=(target.deaths||0)+1;target.respawn=8;target.vx=target.vy=0;if(pilot&&pilot.id!==target.id){pilot.kills=(pilot.kills||0)+1;pilot.scrap+=35;pilot.tech+=1;pilot.profileDirty=true;}}
 }
}
function uBlast(s,b,w,direct){
 uTargets(s).forEach(function(target){if(target===direct||target.hp<=0||target.faction===b.faction&&!w.self)return;var d=distance(target,b);if(d<w.splash){var self=target.faction===b.faction;if(self&&target.id!==b.owner)return;uDamage(s,target,b.dmg*(self?.3:.65)*(1-d/w.splash),b.owner,w,{x:target.x-b.x,y:target.y-b.y});}});
 serverVisual(s,'explosion',b.x,b.y,{max:.65,size:w.splash*.35,weapon:w.id});
}
function uFireMounts(s,p,dt,m){
 if(p.hp<=0)return;
 var ownedShots=s.bullets.filter(function(b){return b.owner===p.id;}).length;
 var hull=HULLS[p.hull],gun=shipLevel(p,'gun'),st=shipStats(p);p.mounts=p.mounts||[];
 hull.mounts.forEach(function(mount,i){var w=weapon(p.loadout[i]);if(!w||!hullAllows(w.id,p.hull))return;var state=p.mounts[i]||(p.mounts[i]={a:p.a,cd:0});state.cd=Math.max(0,state.cd-dt);
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
  if(victim){uDamage(s,victim,dmg,p.id,w,{x:victim.x-x,y:victim.y-y});var previous=victim,struck=[victim.id];for(var j=0;j<(w.chain||0);j++){var next=uTargets(s).find(function(t){return t.hp>0&&t.faction!==p.faction&&t.faction>=0&&struck.indexOf(t.id)<0&&distance(t,previous)<230;});if(!next)break;uDamage(s,next,dmg*.55,p.id,w,{x:next.x-previous.x,y:next.y-previous.y});struck.push(next.id);serverVisual(s,'beam',previous.x,previous.y,{beam:true,x2:next.x,y2:next.y,max:.13,weapon:w.id});previous=next;}}
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
  for(var i=0;i<contacts.length;i++){var c=contacts[i],t=c.target;if(c.kind==='rock'){t.hp-=b.dmg*(w.id==='laser'?1.8:1);t.hitX=ax;t.hitY=ay;b.t=-1;}else{uDamage(s,t,b.dmg,b.owner,w,{x:b.vx,y:b.vy});b.hits.push(t.id);if(!b.pierce)b.t=-1;else b.pierce--;}
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
 s.escorts.forEach(function(e){if(e.mining)return;var owner=owners[e.owner];if(!owner||owner.hp<=0)return;e.cd=Math.max(0,(e.cd||0)-dt*(e.jam>0?.15:1));var target=null,dd=650;
  uQuery(grid,e.x,e.y,e.x,e.y,650).forEach(function(t){if(t.hp>0&&t.faction>=0&&t.faction!==e.faction&&visibleShip(e,t)){var d=distance(e,t);if(d<dd){dd=d;target=t;}}});
  var a=(e.slot||0)*Math.PI*.4+s.time*.3,tx=owner.x+Math.cos(a)*95,ty=owner.y+Math.sin(a)*95;
  if(target&&owner.stance){tx=target.x-Math.cos(e.a)*170;ty=target.y-Math.sin(e.a)*170;}
  var dx=tx-e.x,dy=ty-e.y,d=Math.hypot(dx,dy),step=Math.min(d,dt*240*(e.jam>0?.4:1));e.vx=dt>0&&d>.01?dx/d*step/dt:0;e.vy=dt>0&&d>.01?dy/d*step/dt:0;if(d>.01){e.a=Math.atan2(dy,dx);e.x=uRound(e.x+dx/d*step);e.y=uRound(e.y+dy/d*step);}
  if(target&&e.cd===0&&s.bullets.length<1536){var aa=Math.atan2(target.y-e.y,target.x-e.x);e.cd=.6;s.bullets.push({id:s.next++,x:e.x,y:e.y,vx:uRound(Math.cos(aa)*620+(e.vx||0)),vy:uRound(Math.sin(aa)*620+(e.vy||0)),t:1.2,faction:e.faction,dmg:uRound(16*(1+shipLevel(owner,'wingguns')*.4)),weapon:'cannon',owner:owner.id,hits:[]});}
 });
}

function uMiningDrones(s,dt){
 s.escorts=syncMiningDrones(s.escorts,s.pilots,s.time,function(){return s.next++;});
 var enemies=uTargets(s).filter(function(t){return !t.base&&t.hp>0;});
 s.escorts.forEach(function(d){if(!d.mining)return;var p=uShooter(s,d.owner);if(!p)return;var result=stepMiningDrone(d,p,s.rocks,enemies,s.loot,dt);
  if(result.deposit){var value=Math.round(result.deposit*(p.role===2?1.6:1)),before=Math.floor(p.total/100);p.scrap+=value;p.total+=value;p.dayScrap+=value;p.tech+=Math.floor(p.total/100)-before;p.profileDirty=true;}
  if(result.zap){var target=result.zap.target;if(result.zap.kind==='rock'){target.hp-=result.zap.damage;target.hitX=d.x;target.hitY=d.y;}else uDamage(s,target,result.zap.damage,p.id,{},{x:target.x-d.x,y:target.y-d.y});var a=Math.atan2(target.y-d.y,target.x-d.x),r=result.zap.kind==='rock'?target.r*.8:0;serverVisual(s,'beam',d.x,d.y,{beam:true,x2:target.x-Math.cos(a)*r,y2:target.y-Math.sin(a)*r,max:.16,weapon:'mining'});}
 });s.loot=s.loot.filter(function(l){return l.v>0;});
}
