import {component,HULLS} from './arsenal.js';

export const MAX_MINING_DRONES=4;
function nearestDroneTarget(items,from,eligible){let found=null,best=Infinity;for(const item of items){if(!eligible(item))continue;const x=item.x-from.x,y=item.y-from.y,d=x*x+y*y;if(d<best){found=item;best=d;}}return found;}
const droneWithin=(a,b,range)=>{const x=a.x-b.x,y=a.y-b.y;return x*x+y*y<range*range;};
const droneBeyond=(a,b,range)=>{const x=a.x-b.x,y=a.y-b.y;return x*x+y*y>range*range;};
export function miningDronePlan(owner){
 const plan=[];(owner.loadout||[]).forEach((id,slot)=>{const bay=component(id);if(!bay?.drone||HULLS[owner.hull||0].mounts[slot]?.type!=='utility')return;for(let n=0;n<bay.drone.count&&plan.length<MAX_MINING_DRONES;n++)plan.push({bay:id,rack:slot+':'+n,spec:bay.drone});});return plan;
}
// Rebuilds cost capacitor and time. Equipment, death, cloak and warp recall miners.
export function syncMiningDrones(units,owners,time,makeId){
 const plans=owners.map(owner=>({owner,plan:miningDronePlan(owner)})),planByOwner=new Map(plans.map(group=>[group.owner.id,group]));
 const next=units.filter(d=>{
  if(!d.mining)return true;const group=planByOwner.get(d.owner),owner=group?.owner,entry=group?.plan.find(e=>e.rack===d.rack&&e.bay===d.bay);
  if(owner&&entry&&d.hp>0&&owner.hp>0&&!owner.cloaked&&d.life===(owner.spawnSeq||0)&&droneWithin(d,owner,entry.spec.reach*1.6))return true;
  if(owner&&entry){owner.minerReady=owner.minerReady||{};owner.minerReady[d.rack]=time+entry.spec.rebuild;}return false;
 });
 for(const {owner,plan} of plans){
  if(owner.hp<=0||owner.cloaked||owner.faction<0||!Number.isFinite(owner.energy))continue;owner.minerReady=owner.minerReady||{};
  for(const entry of plan){const w=entry.spec;if(time<(owner.minerReady[entry.rack]||0)||owner.energy<w.launch||next.some(d=>d.mining&&d.owner===owner.id&&d.rack===entry.rack))continue;
   const slot=plan.indexOf(entry),a=owner.a+Math.PI+(slot-1.5)*.55;owner.energy-=w.launch;owner.minerReady[entry.rack]=time+w.rebuild;
   next.push({id:makeId(),owner:owner.id,faction:owner.faction??0,team:owner.team||0,mining:true,bay:entry.bay,rack:entry.rack,life:owner.spawnSeq||0,slot,x:owner.x+Math.cos(a)*45,y:owner.y+Math.sin(a)*45,vx:owner.vx||0,vy:owner.vy||0,a:owner.a,hp:w.hp,max:w.hp,r:9,kind:0,cd:.25,cargo:0,hit:0});
  }
 }
 return next;
}
export function stepMiningDrone(d,owner,rocks,hostiles,loot,dt){
 const w=component(d.bay)?.drone;if(!w||d.hp<=0||owner.hp<=0)return {};
 d.cd=Math.max(0,d.cd-dt);d.hit=Math.max(0,(d.hit||0)-dt);
 const nearby=e=>e.hp>0&&droneWithin(e,owner,w.reach),mustReturn=d.cargo>0&&(d.cargo>=w.cargo||droneBeyond(d,owner,w.reach));
 const rock=mustReturn?null:nearestDroneTarget(rocks,d,nearby);
 const ore=mustReturn?null:nearestDroneTarget(loot,d,l=>l.v>0&&droneWithin(l,owner,w.reach));
 const returnCargo=mustReturn||d.cargo>0&&!rock&&!ore;
 let target=null,kind='',goal=owner,stand=45;
 if(!returnCargo){
  if(ore&&(!rock||droneWithin(ore,d,180))){target=ore;kind='ore';goal=ore;stand=0;}
  else if(rock){target=rock;kind='rock';goal=rock;stand=rock.r+65;}
  else{target=nearestDroneTarget(hostiles,d,e=>(e.faction===undefined||e.faction>=0&&e.faction!==owner.faction)&&nearby(e)&&(!e.cloaked||droneWithin(e,d,150))&&droneWithin(e,d,180));if(target){kind='ship';goal=target;stand=90;}else{const a=d.slot*2.4;goal={x:owner.x+Math.cos(a)*55,y:owner.y+Math.sin(a)*55};stand=5;}}
 }
 const dx=goal.x-d.x,dy=goal.y-d.y,distance=Math.hypot(dx,dy),travel=Math.min(Math.max(0,distance-stand),w.speed*(d.jam>0?.4:1)*dt);
 d.vx=dt>0&&distance>0?dx/distance*travel/dt:0;d.vy=dt>0&&distance>0?dy/distance*travel/dt:0;d.x+=d.vx*dt;d.y+=d.vy*dt;if(distance>1)d.a=Math.atan2(dy,dx);
 if(kind==='ore'&&droneWithin(d,target,16)){const amount=Math.min(target.v,w.cargo-d.cargo);d.cargo+=amount;target.v-=amount;}
 let deposit=0;if(d.cargo>0&&droneWithin(d,owner,55)){deposit=d.cargo;d.cargo=0;}
 if((kind==='rock'||kind==='ship')&&droneWithin(d,target,w.range+(target.r||0))&&d.cd===0&&!(d.jam>0)&&owner.energy>=1){owner.energy-=1;d.cd=w.rate;return {deposit,zap:{target,kind,damage:kind==='rock'?w.rockDamage:w.shipDamage}};}
 return {deposit};
}
