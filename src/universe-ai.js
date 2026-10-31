var BOT_NAMES=['Mira Vale','Theo Marlow','Nadia Storm','Kai Mercer','Petra Quinn','Rafa Vento','Luca Ferro','Iris Vanek','Yuki Amari','Noa Silva'];
function uBotName(s,hull){var used=s.pilots.filter(function(p){return !p.ai||p.hull!==hull;}).map(function(p){return p.name.toLowerCase();});for(var i=0;i<BOT_NAMES.length;i++){var name=BOT_NAMES[(hull+i)%BOT_NAMES.length];if(used.indexOf(name.toLowerCase())<0)return name;}return BOT_NAMES[hull]+' '+(hull+1);}
// Server-owned pilots use the same movement, damage, economy and shipyard as humans.
function uBotPopulation(s,ctx){
 var online=0;for(var i=0;i<ctx.players.length;i++){var person=ctx.players[i];if(!person.ai&&(!ctx.presence||ctx.presence[person.id]&&ctx.presence[person.id].online))online++;}
 var botCount=0;for(var i=0;i<s.pilots.length;i++)if(s.pilots[i].ai)botCount++;var wanted=online===0?HULLS.length:Math.min(botCount,Math.max(0,WORLD_CAPACITY-online)),botIndex=0;
 s.pilots=s.pilots.filter(function(p){if(!p.ai||botIndex++<wanted)return true;uDepart(s,p);return false;});
 for(var hull=0;hull<wanted;hull++)if(!s.pilots.some(function(p){return p.ai&&p.hull===hull;})){
  var id='bot:'+hull;uAdd(s,ctx,{id:id,name:uBotName(s,hull)});var p=s.pilots.find(function(p){return p.id===id;});
  p.ai=true;p.online=true;p.hull=hull;p.faction=hull%2;p.role=0;p.personality=[2,0,3,5,1][hull];p.scrap=120;p.tech=0;p.loadout=HULLS[hull].mounts.map(function(m){return m.type==='fixed'||m.type==='turret'?'cannon':m.type==='engine'?'drive':m.type==='reactor'?'reactor':null;});p.owned=['cannon','drive','reactor','barrier'];p.upgrades={gun:1,armor:0};p.cleared=[];p.botThink=0;uSpawn(s,p);
 }
 s.pilots.forEach(function(p){if(p.ai&&(!p.namedPilot||/^AI /.test(p.name))){p.name=uBotName(s,p.hull);p.namedPilot=true;}});
}
function uNearest(items,p,eligible){var found=null,best=Infinity;for(var i=0;i<items.length;i++){var item=items[i];if(eligible&&!eligible(item))continue;var x=item.x-p.x,y=item.y-p.y,d=x*x+y*y;if(d<best){best=d;found=item;}}return found;}
function uBotThink(s,p,ctx){
 var base=uFriendlyBase(s,p);if(!base)return clean({});
 if(distance(p,base)<280){
  if(p.role!==p.personality&&p.scrap>=ROLES[p.personality].cost)uShipyard(s,p,{type:'role',role:p.personality});
  var preferred=['gatling','rail','laser','mine','homing','pulse'][p.personality];if(p.role===p.personality&&p.loadout[0]!==preferred&&shipFitStatus(p,0,preferred).ok)uShipyard(s,p,{type:'fit',slot:0,item:preferred});
  if(p.personality===2&&p.role===2&&p.loadout.indexOf('mining-bay')<0){var utility=HULLS[p.hull].mounts.findIndex(function(m){return m.type==='utility';});if(utility>=0&&shipFitStatus(p,utility,'mining-bay').ok)uShipyard(s,p,{type:'fit',slot:utility,item:'mining-bay'});}
  var choices=[['gun','engine','multishot','pierce'],['armor','shield','regen','gun'],['tractor','engine','gun','armor'],['engine','armor','emp','gun'],['engine','gun','emp','armor'],['hangar','wingguns','winghull','armor']][p.personality];
  var reserve=p.role===p.personality?0:ROLES[p.personality].cost;for(var i=0;i<choices.length;i++){var status=shipUpgradeStatus(p,choices[i]);if(status.ok&&p.scrap-status.cost>=reserve){uShipyard(s,p,{type:'upgrade',id:choices[i]});break;}}
  if(p.role===5&&p.scrap>=95&&s.escorts.filter(function(e){return e.owner===p.id&&!e.mining;}).length<2)uShipyard(s,p,{type:'upgrade',id:'escort'});
 }
 var returning=p.hp<p.max*.4||p.role!==p.personality&&p.scrap>=ROLES[p.personality].cost||p.role===p.personality&&p.scrap>=250;
 var enemy=uNearest(s.pilots.concat(s.enemies),p,function(t){return t.id!==p.id&&t.online!==false&&t.hp>0&&t.faction!==p.faction&&visibleShip(p,t)&&distance(t,p)<900;});
 var loot=uNearest(s.loot,p),rock=uNearest(s.rocks,p,function(r){return r.hp>0&&Math.abs(r.y-p.y)<900;});
 var relay=uNearest(s.beacons,p,function(b){return b.owner!==p.faction;});
 var target=null,goal=base;
 if(!returning){
  if(enemy){target=enemy;goal=enemy;}
  else if(loot&&distance(loot,p)<900)goal=loot;
  else if(p.personality===2&&rock){target=rock;goal=rock;}
  else if(relay)goal=relay;
  else {target=uNearest(s.bases,p,function(b){return b.faction!==p.faction&&b.hp>0;});goal=target||base;}
 }
 var supported=p.personality===5?uNearest(s.pilots,p,function(q){return q!==p&&q.online!==false&&q.faction===p.faction&&q.hp>0&&q.hp<q.max*.8;}):null;if(supported&&!returning)goal=supported;
 var dx=goal.x-p.x,dy=goal.y-p.y,d=Math.hypot(dx,dy),stop=target?target.r?130:target.base?420:[220,450,130,65,380,450][p.personality]:supported?120:0;
 if(!target&&goal===base&&distance(p,base)<280)stop=120;
 var motion=pilotMotionStats(p),desired=Math.min(motion.speed*.8,Math.max(0,d-stop)*1.5),vx=d?dx/d*desired:0,vy=d?dy/d*desired:0;
 var ax=(vx-p.vx)*4,ay=(vy-p.vy)*4,acceleration=motion.speed*3;
 var gun=weapon(p.loadout[0])||WEAPONS[0],aim=target?interceptPoint(p,{x:target.x,y:target.y,vx:(target.vx||0)-p.vx,vy:(target.vy||0)-p.vy,ax:target.ax||0,ay:target.ay||0},gun.speed||100000,gun.life||.01):goal;
 var a=Math.atan2(aim.y-p.y,aim.x-p.x),error=Math.abs(Math.atan2(Math.sin(a-p.a),Math.cos(a-p.a)));
 if(p.role===3&&enemy&&distance(enemy,p)<280&&p.mineCd<=0&&p.energy>=25)uCommand(Object.assign({},ctx,{message:{from:p.id,data:{type:'mine'}}}));
 return clean({steering:true,thrust:clamp((ax*Math.cos(p.a)+ay*Math.sin(p.a))/acceleration,-1,1),strafe:clamp((-ax*Math.sin(p.a)+ay*Math.cos(p.a))/acceleration,-1,1),aim:a,fire:!!target&&distance(target,p)<680&&error<.18,tractor:!!loot&&distance(loot,p)<600,boost:false});
}
