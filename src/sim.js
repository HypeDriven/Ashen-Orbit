import {recordShipImpact,shipBreakup} from './ship-debris.js';
import {syncMiningDrones,stepMiningDrone} from './mining-drones.js';
import {launchVelocity,advanceProjectile,projectileFragments} from './ballistics.js';
import {UPGRADES,TREES,shipStats,shipUpgradeStatus,shipHullStatus,shipFitStatus} from './shipyard.js';
import {ROLES,fractureRock,driftRocks,integratePilotThrust} from './universe-rules.js';
import {emitVisual,stepVisuals,rememberTrail} from './effects.js';
import {createBaseDefense,updateBaseDefense,interceptBaseShot} from './defenses.js';
import {WEAPONS,COMPONENTS,HULLS,weapon,component,compatible,hullAllows,angleDelta,turnTowards,segmentDistance} from './arsenal.js';
export {WEAPONS,COMPONENTS,HULLS} from './arsenal.js';
// Righteous Republic: fixed-step simulation shared by native and browser runtimes.
export const TAU = Math.PI * 2;
export {SECTOR_INFO,SECTORS} from './sectors.js';
import {SECTOR_INFO,SECTORS} from './sectors.js';
export const ENEMIES=[
 {name:'REBEL RAIDER',hp:75,speed:155,range:300,rate:1.1,radius:17,reward:3},
 {name:'REBEL BULWARK',hp:240,speed:78,range:260,rate:.8,radius:29,reward:8},
 {name:'REBEL FLAGSHIP',hp:1800,speed:42,range:450,rate:.5,radius:62,reward:45},
 {name:'REBEL LANCER',hp:95,speed:100,range:670,rate:2.6,radius:22,reward:5},
 {name:'DRONE CARRIER',hp:310,speed:68,range:580,rate:2.2,radius:38,reward:12},
 {name:'BOARDING DRONE',hp:32,speed:235,range:15,rate:1.6,radius:12,reward:2}
];
export {UPGRADES,TREES} from './shipyard.js';
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function rng(seed){let x=seed;return ()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};}
let serial=0;
export function makeShip(x,y,team=0,kind=0){const def=ENEMIES[kind]||ENEMIES[0];const hp=team?def.hp:180;return {id:++serial,x,y,vx:0,vy:0,av:0,thrusting:false,a:-Math.PI/2,hp,max:hp,shield:0,maxShield:0,lastHit:0,cd:1,spawn:7,charge:0,team,kind,hit:0};}
function level(s,id){return s.upgrades[id]||0;}
export function notify(s,message){if(s.faction===1)message=message.replaceAll('REBEL','REPUBLIC').replace('REPUBLIC SECURED','REBELLION SECURED');s.message=message;s.messageTime=4;}
export function createGame(saved=null){
 const s={schema:3,faction:0,role:0,mines:[],bases:[],cloakLock:0,baseDefense:createBaseDefense(),hull:0,loadout:['cannon',null,'drive','reactor'],owned:['cannon','drive','reactor','barrier'],mountState:[],heat:0,overheated:false,targetId:null,ciphers:[],sector:0,depth:0,scrap:120,tech:0,kills:0,gun:1,armor:0,wing:2,time:0,pulse:0,boost:100,energy:100,tractorOn:false,stance:0,upgrades:{gun:1,armor:0},visited:[],cleared:[],sectorDone:false,ships:[],rocks:[],bullets:[],loot:[],fx:[],nests:[],objectives:[],message:'',messageTime:0,won:false,dead:false,events:[],seed:934,contractLog:[],hazardClock:0};
 if(saved&&typeof saved==='object'){s.faction=saved.faction===1?1:0;s.role=Number.isInteger(saved.role)&&ROLES[saved.role]?saved.role:0;
  for(const k of ['sector','scrap','kills','tech','depth','wing'])if(Number.isFinite(saved[k]))s[k]=Math.max(0,Math.floor(saved[k]));
  s.sector=Math.min(10,s.sector);s.depth=Math.min(10,s.depth);s.wing=Math.min(5,s.wing);
  if(saved.schema>=2&&saved.upgrades&&typeof saved.upgrades==='object'){for(const u of UPGRADES)if(Number.isFinite(saved.upgrades[u.id]))s.upgrades[u.id]=Math.max(u.id==='gun'?1:0,Math.min(u.max,Math.floor(saved.upgrades[u.id])));}
  else if(!(saved.schema>=2)){s.upgrades.gun=Math.max(1,Math.min(5,saved.gun||1));s.upgrades.armor=Math.min(4,saved.armor||0);s.upgrades.hangar=Math.max(0,s.wing-2);if(s.sector===3)s.sector=6;s.depth=Math.min(3,s.sector);}
  if(Array.isArray(saved.cleared))s.cleared=saved.cleared.filter(x=>Number.isInteger(x)&&x>=0&&x<11);
  if(Array.isArray(saved.visited))s.visited=saved.visited.filter(x=>Number.isInteger(x)&&x>=0&&x<11);
 }
 if(saved?.schema>=3){
  s.hull=Math.max(0,Math.min(4,Math.floor(saved.hull||0)));s.loadout=HULLS[s.hull].mounts.map((m,i)=>compatible(m,saved.loadout?.[i],s.hull)?saved.loadout?.[i]||null:null);
  if(Array.isArray(saved.owned))s.owned=[...new Set(s.owned.concat(saved.owned.filter(id=>weapon(id)||component(id))))];
  s.contractLog=Array.isArray(saved.contractLog)?[...new Set(saved.contractLog.filter(k=>typeof k==='string'))]:[];
  s.ciphers=Array.isArray(saved.ciphers)?[...new Set(saved.ciphers.filter(k=>[2,5,8].includes(k)))]:[];
 }
 if(s.sector===6&&!campaignStatus(s).ready)s.sector=0;
 s.gun=level(s,'gun');s.armor=level(s,'armor');loadSector(s);
 if(saved&&saved.sector===s.sector&&saved.schema>=2&&saved.world&&typeof saved.world==='object'){
  const w=saved.world;
  if(Array.isArray(w.ships)&&w.ships.length&&w.ships.length<=100&&w.ships[0].team===0&&w.ships.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp))){
   for(const key of ['ships','rocks','nests','loot','objectives','bullets','mines'])if(Array.isArray(w[key]))s[key]=w[key];
   s.player=s.ships[0];for(const e of s.ships)serial=Math.max(serial,e.id||0);
   for(const key of ['time','pulse','boost','energy','hazardClock','heat'])if(Number.isFinite(w[key]))s[key]=w[key];
   s.overheated=!!w.overheated;if(w.baseDefense&&Array.isArray(w.baseDefense.shields)&&w.baseDefense.shields.length===3&&Array.isArray(w.baseDefense.turrets)&&w.baseDefense.turrets.length===2&&Array.isArray(w.baseDefense.fighters)&&w.baseDefense.fighters.length===6)s.baseDefense=w.baseDefense;
   s.tractorOn=!!w.tractorOn;s.stance=w.stance===1?1:0;s.sectorDone=!!w.sectorDone;s.won=!!w.won;s.dead=s.player.hp<=0;
  }
 }
 for(const n of s.nests)if(!n.id)n.id=++serial;
 return s;
}
export function checkpoint(s){const world={};for(const k of ['ships','rocks','nests','loot','objectives','bullets','time','pulse','boost','energy','hazardClock','tractorOn','stance','sectorDone','won','heat','overheated','baseDefense','mines','cloakLock'])world[k]=s[k];return {schema:3,faction:s.faction,role:s.role,hull:s.hull,loadout:s.loadout,owned:s.owned,contractLog:s.contractLog,ciphers:s.ciphers,sector:s.sector,depth:s.depth,scrap:s.scrap,tech:s.tech,kills:s.kills,wing:s.wing,upgrades:s.upgrades,visited:s.visited,cleared:s.cleared,world};}
export function loadSector(s){
 s.mines=[];s.cloakLock=0;s.baseDefense=createBaseDefense();s.ships=[];s.rocks=[];s.bullets=[];s.loot=[];s.fx=[];s.nests=[];s.objectives=[];s.sectorDone=false;s.dead=false;s.pulse=0;s.boost=100;s.energy=100;s.time=0;s.hazardClock=0;
 const p=makeShip(100,180);p.max=p.hp=220+level(s,'armor')*60;p.maxShield=p.shield=level(s,'shield')*45;p.faction=s.faction;p.role=s.role;s.player=p;refit(s,true);s.mountState=[];s.heat=0;s.overheated=false;s.targetId=null;s.ships.push(p);
 if(!s.visited.includes(s.sector))s.visited.push(s.sector);
 const cfg=SECTOR_INFO[s.sector],r=rng(s.seed+s.sector*97+s.depth*7);
 for(let i=0;i<(cfg.hazard==='dense'?90:52);i++){const a=r()*TAU,d=440+r()*2100;s.rocks.push({x:Math.cos(a)*d,y:Math.sin(a)*d,r:25+r()*62,hp:55,type:i%10,a:r()*TAU});}
 for(let i=0;i<s.wing;i++){const e=makeShip(60+i*55,280);e.max=e.hp=150+level(s,'winghull')*55;s.ships.push(e);}
 for(let i=0;i<3;i++){const a=i*TAU/3-.6,dd=1050+s.depth*90,hp=250+s.depth*75;s.nests.push({id:++serial,x:Math.cos(a)*dd,y:Math.sin(a)*dd,r:60,hp,max:hp,cd:9+i,team:1});for(let j=0;j<2+Math.min(3,s.depth);j++)s.ships.push(makeShip(Math.cos(a)*dd+(r()-.5)*260,Math.sin(a)*dd+(r()-.5)*260,1,cfg.types[(i+j)%cfg.types.length]));}
 const bounty=makeShip(-900,-600,1,s.sector===3?0:1);bounty.max=bounty.hp=380+s.depth*80;bounty.bounty=true;s.ships.push(bounty);
 s.objectives=[{id:'wreck',name:'RECOVER REBEL FLIGHT RECORDER',x:650,y:490,progress:0,total:8,reward:150,tech:0,done:false,failed:false,active:false},
 {id:'relay',name:'SEIZE REBEL COMMS RELAY',x:-650,y:550,progress:0,total:6,reward:70,tech:2,done:false,failed:false,active:false},
 {id:'bounty',name:'DEFEAT THE REBEL CAPTAIN',x:bounty.x,y:bounty.y,progress:0,total:1,reward:210,tech:1,done:false,failed:false,active:true,target:bounty.id},
 {id:'convoy',name:'ESCORT REPUBLIC SUPPLY SHIP',x:300,y:-900,progress:0,total:1,reward:240,tech:1,hp:260,done:false,failed:false,active:false}];
 // Keep contract sites clear of asteroid collisions.
 s.rocks=s.rocks.filter(rock=>s.objectives.every(o=>dist(rock,o)>rock.r+100));
 for(const e of s.ships)if(e.team&&(e.kind===1||e.kind===3)){e.shield=e.maxShield=50+s.depth*12;}
 if(s.sector===6){const boss=makeShip(0,-1800,1,2);boss.hp=boss.max=9500;boss.phase=0;s.ships.push(boss);for(let i=0;i<3;i++){const guard=makeShip((i-1)*180,-1700,1,1);guard.bossGuard=true;guard.hp=guard.max=650;guard.shield=guard.maxShield=150;s.ships.push(guard);}}
 if(s.cleared.includes(s.sector)){s.sectorDone=true;for(const n of s.nests){n.hp=0;n.destroyed=true;}}for(const o of s.objectives)if(s.contractLog.includes(s.sector+':'+o.id)){o.done=true;o.progress=o.total;}
 notify(s,SECTORS[s.sector]+' / CONTRACTS AVAILABLE');
}
export function clear(s){return s.nests.every(n=>n.hp<=0)&&!s.ships.some(e=>e.team&&e.kind===2&&e.hp>0);}
export function campaignStatus(s){const sectors=s.cleared.filter(n=>n!==6).length,contracts=s.contractLog.length,ciphers=s.ciphers.length;return {sectors,contracts,ciphers,ready:sectors>=8&&contracts>=12&&ciphers>=3&&s.hull>=3,text:`COMMAND GATE: ${sectors}/8 sectors | ${contracts}/12 contracts | ${ciphers}/3 ciphers | ${HULLS[s.hull].name} (CRUISER+)`};}
export function routes(s){return SECTOR_INFO.map((cfg,id)=>({...cfg,id})).filter(c=>c.id!==s.sector&&(c.id!==6||campaignStatus(s).ready));}
export function interact(s){if(dist(s.player,{x:0,y:0})>285){notify(s,'RETURN TO RING 07 / CONTRACTS ARE MARKED ON THE SCAN');return 'far';}return 'dock';}
export function upgradeStatus(s,id){return shipUpgradeStatus(s,id);}
export function upgrade(s,id){if(typeof id==='number')id=['','gun','armor','escort','repair'][id];if(dist(s.player,{x:0,y:0})>285)return false;
 if(id==='repair'||id==='escort'){
  const cost=id==='repair'?SECTOR_INFO[s.sector].repair:95+s.wing*25;
  if(id==='escort'&&s.wing>=2+level(s,'hangar')){notify(s,'HANGAR FULL / UPGRADE HANGAR DECK');return false;}
  if(s.scrap<cost){notify(s,'INSUFFICIENT SALVAGE');return false;}s.scrap-=cost;
  if(id==='repair'){for(const e of s.ships)if(!e.team){e.hp=e.max;e.shield=e.maxShield;}for(const o of s.objectives)if(o.id==='convoy'&&!o.failed)o.hp=260;}
  else{const e=makeShip(s.player.x+65,s.player.y+35);e.max=e.hp=150+level(s,'winghull')*55;s.ships.push(e);s.wing++;}notify(s,'SERVICE COMPLETE');s.events.push('buy');return true;
 }
 const st=upgradeStatus(s,id);if(!st.ok){notify(s,st.reason);return false;}s.scrap-=st.cost;s.tech-=st.tech;s.upgrades[id]=st.level+1;s.gun=level(s,'gun');s.armor=level(s,'armor');
 if(id==='armor'||id==='shield')refit(s,true);
 
 if(id==='winghull')for(const e of s.ships)if(!e.team&&e!==s.player)e.max=e.hp=150+level(s,'winghull')*55;
 notify(s,'UPGRADE INSTALLED');s.events.push('buy');return true;
}
export function jump(s,destination){if(s.sector===6&&!campaignStatus(s).ready){notify(s,'COMPLETE THE COMMAND CAMPAIGN FIRST');return false;}if(dist(s.player,{x:0,y:0})>285){notify(s,'DOCK AT RING 07 TO JUMP');return false;}if(!clear(s)){notify(s,'DISABLE THE THREE REBEL OUTPOSTS BEFORE JUMPING');return false;}if(s.sector===6){s.won=true;notify(s,'REBEL COMMAND DISMANTLED. REPUBLIC SECURED.');return true;}
 const choice=routes(s).find(r=>r.id===destination);if(!choice){notify(s,'CHOOSE AN AVAILABLE SECTOR ON THE CHART');return false;}if(s.scrap<choice.toll){notify(s,'INSUFFICIENT SALVAGE FOR JUMP TOLL');return false;}s.scrap-=choice.toll;s.sector=destination;s.depth++;loadSector(s);return true;}
export function tractorRange(s){return (340+level(s,'tractor')*110+stats(s).magnet*140)*(ROLES[s.role||0].tractor);}
export function emp(s){if(s.pulse>0||s.dead)return;s.pulse=14-level(s,'emp')*2;const range=420+level(s,'emp')*70,damage=110+level(s,'emp')*40;for(const e of s.ships)if(e.team&&dist(e,s.player)<range){recordShipImpact(e,damage,{x:e.x-s.player.x,y:e.y-s.player.y},s.time);e.hp-=damage;e.cd=3;}for(const n of s.nests)if(n.hp>0&&dist(n,s.player)<range)n.hp-=damage;s.bullets=s.bullets.filter(b=>!b.team||dist(b,s.player)>range);s.fx.push({x:s.player.x,y:s.player.y,vx:0,vy:0,t:.65,max:.65,pulse:true,r:range});s.events.push('pulse');}
function burst(s,x,y,n=18){emitVisual(s.fx,'explosion',x,y,{size:n>=45?80:n>=30?42:n<=12?20:29,color:n<=12?'#b9b59a':'#e8bd85'});s.events.push('boom');}
function salvage(s,x,y,count){for(let i=0;i<count;i++)s.loot.push({x:x+(Math.random()-.5)*55,y:y+(Math.random()-.5)*55,v:Math.round(8*SECTOR_INFO[s.sector].reward)});}
function damage(s,e,amount,direction=null){recordShipImpact(e,amount,direction,s.time);if(e===s.player){e.cloaked=false;s.cloakLock=3;}if(e.kind===2&&e.team&&s.ships.some(g=>g.bossGuard&&g.hp>0))amount*=.06;if(e.team&&e.kind===1)amount*=.72;let shield=Math.min(e.shield||0,amount);e.shield=Math.max(0,(e.shield||0)-shield);e.hp-=amount-shield;e.hit=.15;e.lastHit=s.time;if(e.baseFighter&&e.hp<=0&&!e.destroyed){e.destroyed=true;emitVisual(s.fx,'ship-breakup',e.x,e.y,{...shipBreakup(e,s.time),hullColor:e.squad?'#9ebfc3':'#a7bea1'});s.events.push('boom');}}
function complete(s,o){if(o.done||o.failed)return;o.done=true;const key=s.sector+':'+o.id;if(!s.contractLog.includes(key))s.contractLog.push(key);if(o.id==='relay'&&[2,5,8].includes(s.sector)&&!s.ciphers.includes(s.sector)){s.ciphers.push(s.sector);notify(s,'NAVIGATION CIPHER RECOVERED');}s.scrap+=Math.round(o.reward*SECTOR_INFO[s.sector].reward);s.tech+=o.tech;notify(s,o.name+' / CONTRACT PAID');s.events.push('buy');}
function shoot(s,e,a){if(s.bullets.length>320)return;const player=e===s.player,kind=e.team?e.kind:-1;let speed=e.team?kind===3?620:300:650;let n=player?1+level(s,'multishot'):kind===2?7:kind===1?3:1;for(let i=0;i<n;i++){const aa=a+(i-(n-1)/2)*(kind===2?.26:kind===1?.15:.075);s.bullets.push({x:e.x+Math.cos(aa)*25,y:e.y+Math.sin(aa)*25,vx:Math.cos(aa)*speed+e.vx,vy:Math.sin(aa)*speed+e.vy,t:e.team?3:1.3,team:e.team,dmg:e.team?(kind===3?28:kind===2?18:10):player?18+s.gun*7:16*(1+level(s,'wingguns')*.4),pierce:player?level(s,'pierce'):0,hits:[]});}e.cd=e.team?ENEMIES[kind].rate:player?.25/(1+s.gun*.12):.5;emitVisual(s.fx,'muzzle',e.x+Math.cos(a)*25,e.y+Math.sin(a)*25,{a,weapon:e.team?'cannon':'pulse',size:e.kind===2?15:8});if(player)s.events.push('shot');}
function contracts(s,dt){const p=s.player;for(const o of s.objectives){if(o.done||o.failed)continue;const d=dist(p,o);
 if(o.id==='wreck'){if(d<160&&s.tractorOn&&s.energy>0)o.progress+=dt*(1+level(s,'tractor')*.3);}
 if(o.id==='relay'){if(d<160&&Math.hypot(p.vx,p.vy)<95)o.progress+=dt;}
 if(o.id==='bounty'){const target=s.ships.find(e=>e.id===o.target);if(target){o.x=target.x;o.y=target.y;}else o.progress=1;}
 if(o.id==='convoy'){
  if(!o.active&&d<220){o.active=true;notify(s,'FREIGHTER MOVING / PROTECT IT TO THE RING');for(let i=0;i<3;i++)s.ships.push(makeShip(o.x+200+i*70,o.y-180,1,i===0?3:0));}
  if(o.active){const a=Math.atan2(-o.y,-o.x),dd=Math.hypot(o.x,o.y);o.x+=Math.cos(a)*55*dt;o.y+=Math.sin(a)*55*dt;o.progress=Math.min(.99,1-dd/950);for(const b of s.bullets)if(b.team&&dist(b,o)<36){o.hp-=b.dmg;b.t=-1;}if(o.hp<=0){o.failed=true;notify(s,'FREIGHTER LOST / CONTRACT FAILED');burst(s,o.x,o.y,30);}else if(dd<150)o.progress=1;}
 }
 if(o.progress>=o.total)complete(s,o);
 }}
export function update(s,dt,input){
 if(s.dead||s.won){s.fx=stepVisuals(s.fx,dt);if(s.baseDefense)s.baseDefense.fx=stepVisuals(s.baseDefense.fx,dt);return;}s.events=[];s.time+=dt;s.messageTime-=dt;s.pulse=Math.max(0,s.pulse-dt);const p=s.player,cfg=SECTOR_INFO[s.sector];
 s.cloakLock=Math.max(0,s.cloakLock-dt);const role=ROLES[s.role||0];if(s.player.cloaked){s.energy=Math.max(0,s.energy-dt*18*role.cloak);if(s.energy<=0){s.player.cloaked=false;s.cloakLock=3;}}if(input.fire||input.boost){if(s.player.cloaked)s.cloakLock=2;s.player.cloaked=false;}
 const st=stats(s);let dx=input.x||0,dy=input.y||0;const steering=input.steering===true;
 const throttle=Math.max(-1,Math.min(1,(input.thrust||0)-(input.brake?1:0)));
 if(steering){if(Number.isFinite(input.aim))p.a=turnTowards(p.a,input.aim,st.turn*dt);else p.a+=(input.turn||0)*st.turn*dt;const strafe=Math.max(-1,Math.min(1,input.strafe||0));dx+=Math.cos(p.a)*throttle-Math.sin(p.a)*strafe;dy+=Math.sin(p.a)*throttle+Math.cos(p.a)*strafe;}
 let mag=Math.hypot(dx,dy);if(mag>1){dx/=mag;dy/=mag;}const boosting=input.boost&&s.boost>1&&mag>.1,towing=s.tractorOn&&s.energy>0,speed=(boosting?440:225)*(1+level(s,'engine')*.09)*st.speed*(towing?.74:1)*(p.cloaked?.65:1);
 s.boost=Math.max(0,Math.min(100,s.boost+dt*(boosting?-34/(1+level(s,'engine')*.2):19)));
 p.boost=s.boost;integratePilotThrust(p,dt,{...input,boost:boosting,tractor:towing},{speed:225*(1+level(s,'engine')*.09)*st.speed,turn:st.turn});
 if(!steering&&!selectedTarget(s))selectTarget(s);const target=selectedTarget(s);if(!steering&&mag<.1&&target)p.a=turnTowards(p.a,Math.atan2(target.y-p.y,target.x-p.x),st.turn*dt);
 s.heat=Math.max(0,s.heat-st.cooling*dt);if(s.heat>=100)s.overheated=true;if(s.overheated&&s.heat<35)s.overheated=false;
 fireMounts(s,dt,!!input.fire,target);
 for(const e of s.ships){if(e.hp<=0||e.mining)continue;e.cd-=dt*(e.jam>0?.15:1);e.hit=Math.max(0,e.hit-dt);if(e!==p){
  let target=p;if(e.team){if(p.cloaked&&dist(e,p)>150)target=s.ships.find(q=>q!==p&&!q.team&&q.hp>0&&dist(e,q)<850)||{x:0,y:0,hp:99999,hidden:true};const convoy=s.objectives.find(o=>o.id==='convoy'&&o.active&&!o.done&&!o.failed);if(convoy&&dist(e,convoy)<dist(e,p)*.9)target=convoy;for(const f of s.baseDefense.fighters)if(f.hp>0&&dist(e,f)<Math.min(230,dist(e,target)))target=f;}
  else{let dd=s.stance?1400:750;for(const en of s.ships.concat(s.nests)){if(en.hp<=0||!en.team)continue;const d=dist(e,en);if(d<dd){dd=d;target=en;}}}
  if(e.burn>0){e.burn-=dt;damage(s,e,9*dt);}e.jam=Math.max(0,(e.jam||0)-dt);
  const d=dist(e,target),a=Math.atan2(target.y-e.y,target.x-e.x);e.a=a;const def=ENEMIES[e.kind],wanted=e.team?def.range:target===p?130:340,v=(e.team?def.speed:235)*(e.jam>0?.4:1),approach=d>wanted?1:d<wanted*.65?-.55:0,side=e.team&&e.kind===3?0:.22;
  e.vx+=(Math.cos(a)*v*approach-Math.sin(a)*v*side-e.vx)*dt*2;e.vy+=(Math.sin(a)*v*approach+Math.cos(a)*v*side-e.vy)*dt*2;
  if(e.team&&e.kind===5){if(d<45&&e.cd<=0){damage(s,target,18,{x:target.x-e.x,y:target.y-e.y});s.boost=Math.max(0,s.boost-20);e.cd=1.6;}}
  else if(e.team&&e.kind===3){if(!target.hidden&&d<1350){e.charge=Math.max(0,1-e.cd);if(e.cd<=0){shoot(s,e,a);e.charge=0;}}}
  else if(!target.hidden&&(target!==p||e.team)&&d<(e.team?850:850)&&e.cd<=0)shoot(s,e,a);
  if(e.team&&(e.kind===4||e.kind===2)){e.spawn-=dt;if(e.spawn<=0&&s.ships.filter(a=>a.team).length<32){e.spawn=e.kind===2?9:11;s.ships.push(makeShip(e.x+45,e.y+35,1,5),makeShip(e.x-45,e.y-35,1,5));}}
 }
 if(e!==p){e.x+=e.vx*dt;e.y+=e.vy*dt;}if(Math.hypot(e.x,e.y)>2850){const a=Math.atan2(e.y,e.x);e.x=Math.cos(a)*2840;e.y=Math.sin(a)*2840;}
 for(const r of s.rocks){const d=dist(e,r),rr=r.r+(e.team?ENEMIES[e.kind].radius:e===p?HULLS[s.hull].radius:15);if(d<rr){const a=Math.atan2(e.y-r.y,e.x-r.x);e.x=r.x+Math.cos(a)*rr;e.y=r.y+Math.sin(a)*rr;e.vx*=.92;e.vy*=.92;}}
 }
 for(const boss of s.ships.filter(e=>e.team&&e.kind===2)){const phase=boss.hp<boss.max*.33?2:boss.hp<boss.max*.66?1:0;if(phase>(boss.phase||0)){boss.phase=phase;boss.shield=boss.maxShield=350;for(let i=0;i<3;i++)s.ships.push(makeShip(boss.x+(i-1)*100,boss.y+100,1,phase===1?3:4));notify(s,'DREADNOUGHT PHASE '+(phase+1)+' / REINFORCEMENTS');}if(phase===2)boss.cd-=dt*.6;}
 for(const n of s.nests){if(n.hp<=0)continue;n.cd-=dt;if(n.cd<=0&&s.ships.filter(e=>e.team&&e.hp>0).length<28){n.cd=cfg.hazard==='reinforcements'?7:13;s.ships.push(makeShip(n.x+80,n.y,1,cfg.types[Math.floor(s.time)%cfg.types.length]));}}
 updateSoloMiners(s,dt);
 updateBaseDefense(s.baseDefense,dt,s.time,s.ships.filter(e=>e.team),s.bullets,(e,amount,direction)=>damage(s,e,amount,direction));
 driftRocks(s.rocks,dt);const fragments=[];for(const r of s.rocks)if(r.hp<=0){if(r.ore==null)r.ore=Math.round(24*cfg.reward);let bits=fractureRock(r,p.x,p.y);if(bits.length&&s.rocks.length+fragments.length+bits.length-1>192){bits=[{...r,hp:Math.max(8,r.r*.85),vx:(r.vx||0)+20,spin:.5}];}fragments.push(...bits);if(!bits.length){s.loot.push({x:r.x,y:r.y,v:r.ore});burst(s,r.x,r.y,12);}else emitVisual(s.fx,'impact',r.x,r.y,{size:r.r*.6,color:'#b5b19b'});}
 const shards=[];for(const b of s.bullets){if(b.t<=0)continue;const w=b.weapon?weapon(b.weapon):null;const ax=b.x,ay=b.y;rememberTrail(b,dt);
 if(w?.seek&&!s.ships.concat(s.nests).some(e=>e.id===b.target&&e.hp>0&&e.team)){b.target=s.ships.concat(s.nests).filter(e=>e.team&&e.hp>0&&dist(b,e)<w.seek).sort((a,c)=>dist(a,b)-dist(c,b))[0]?.id;}
 if(w?.homing){const target=s.ships.concat(s.nests).find(e=>(e.id||-1)===b.target&&e.hp>0&&e.team);if(target){const a=turnTowards(Math.atan2(b.vy-(b.driftY||0),b.vx-(b.driftX||0)),Math.atan2(target.y-b.y,target.x-b.x),w.homing*dt);b.vx=Math.cos(a)*w.speed+(b.driftX||0);b.vy=Math.sin(a)*w.speed+(b.driftY||0);}}
 advanceProjectile(b,w||{},dt);b.t-=dt;if(interceptBaseShot(s.baseDefense,b,ax,ay,b.x,b.y))continue;
 for(const e of s.ships.concat(b.team?[]:s.nests)){if(e.hp<=0||e.team===b.team||b.hits.includes(e.id||-1))continue;
 const radius=e.r||(e.team?ENEMIES[e.kind].radius:e===p?HULLS[s.hull].radius:16);
 if(w?.mine&&b.t>w.life-1)continue;
 if(segmentDistance(e.x,e.y,ax,ay,b.x,b.y)<radius+(w?.mine?45:0)){
 contactVisual(s,e,w,b.dmg,ax,ay);if(w)weaponDamage(s,e,w,b.dmg,{x:b.vx,y:b.vy});else damage(s,e,b.dmg,{x:b.vx,y:b.vy});b.hits.push(e.id||-1);
 if(w?.splash)explodeWeapon(s,b,w,e);
 if(b.pierce<=0)b.t=-1;else b.pierce--;break;}}
 if(b.t>0)for(const r of s.rocks){if(r.hp>0&&segmentDistance(r.x,r.y,ax,ay,b.x,b.y)<r.r*.85){emitVisual(s.fx,'impact',b.x,b.y,{a:Math.atan2(b.vy,b.vx),weapon:b.weapon||'cannon',size:13,color:'#c5bda4'});r.hp-=b.dmg*(s.role===2&&!b.team?1.6:1);b.t=-1;if(w?.splash)explodeWeapon(s,b,w,null);if(r.hp<=0){if(r.ore==null)r.ore=Math.round(24*cfg.reward);let bits=fractureRock(r,ax,ay);if(bits.length&&s.rocks.length+fragments.length+bits.length-1>192){bits=[{...r,hp:Math.max(8,r.r*.85),vx:(r.vx||0)+20,spin:.5}];}if(bits.length){fragments.push(...bits);emitVisual(s.fx,'impact',r.x,r.y,{size:r.r*.6,color:'#b5b19b'});}else{burst(s,r.x,r.y,12);if(r.ore!=null)s.loot.push({x:r.x,y:r.y,v:r.ore});else salvage(s,r.x,r.y,3);}}break;}}
 if(b.t<=0&&w?.mine&&!b.hits.length)explodeWeapon(s,b,w,null);
 if(b.t<=0&&w?.fragments){shards.push(...projectileFragments(b,w,Math.max(0,320-s.bullets.length-shards.length)));emitVisual(s.fx,'explosion',b.x,b.y,{size:24,weapon:w.id,max:.5});}
 }
 s.bullets=s.bullets.filter(b=>b.t>0).concat(shards);s.rocks=s.rocks.filter(r=>r.hp>0).concat(fragments);
 s.mines=s.mines.filter(m=>{m.arm-=dt;m.t-=dt;if(m.t<=0)return false;if(m.arm>0)return true;const target=s.ships.find(e=>e.team&&e.hp>0&&dist(e,m)<75);if(!target)return true;for(const e of s.ships)if(e.team&&e.hp>0&&dist(e,m)<170)damage(s,e,(m.dmg??110)*(1-dist(e,m)/220),{x:e.x-m.x,y:e.y-m.y});emitVisual(s.fx,'explosion',m.x,m.y,{size:55,weapon:'mine'});return false;});
 for(const e of s.ships)if(e.hp<=0&&!e.destroyed){e.destroyed=true;emitVisual(s.fx,'ship-breakup',e.x,e.y,{...shipBreakup(e,s.time,e===p,e===p?s.hull:e.hull||0,e===p?s.role:e.role||0),faction:e.faction??(e.team?1-s.faction:s.faction),playerWreck:e===p});s.events.push('boom');if(e.team){s.kills++;salvage(s,e.x,e.y,ENEMIES[e.kind].reward);}else if(e!==p&&!e.mining){s.wing=Math.max(0,s.wing-1);notify(s,'WINGMAN LOST');}}
 for(const n of s.nests)if(n.hp<=0&&!n.destroyed){n.destroyed=true;burst(s,n.x,n.y,35);salvage(s,n.x,n.y,14);s.tech+=cfg.hazard==='reinforcements'?2:1;notify(s,'REBEL OUTPOST DISABLED / INTEL RECOVERED');}
 s.ships=s.ships.filter(e=>e===p||e.hp>0);
 const range=tractorRange(s);let working=false;
 for(const l of s.loot){const d=dist(l,p);if(d<(towing?range:65)){const a=Math.atan2(p.y-l.y,p.x-l.x),v=towing?430+level(s,'tractor')*65:160;l.x+=Math.cos(a)*Math.min(d,v*dt);l.y+=Math.sin(a)*Math.min(d,v*dt);if(towing)working=true;}if(d<25){s.scrap+=l.v;l.v=0;}}
 if(towing&&s.objectives.some(o=>o.id==='wreck'&&!o.done&&dist(p,o)<160))working=true;
 s.energy=Math.max(0,Math.min(100,s.energy+dt*(s.player.cloaked?0:working?-10:st.regen)));if(s.energy<=0){s.tractorOn=false;notify(s,'TRACTOR CAPACITOR EMPTY / RECHARGING');}
 s.loot=s.loot.filter(l=>l.v>0);contracts(s,dt);
 s.fx=stepVisuals(s.fx,dt);
 if(s.role===5&&s.energy>15)for(const ally of s.ships)if(!ally.team&&ally!==p&&ally.hp<ally.max&&dist(p,ally)<220){ally.hp=Math.min(ally.max,ally.hp+dt*2);s.energy-=dt;}
 const safe=dist(p,{x:0,y:0})<270;
 if(safe)p.hp=Math.min(p.max,p.hp+dt*4);
 if(s.time-p.lastHit>6){if(cfg.hazard!=='ion'||safe)p.shield=Math.min(p.maxShield,p.shield+dt*(9+level(s,'shield')*2));if(level(s,'regen'))p.hp=Math.min(p.max,p.hp+dt*level(s,'regen')*1.2);}
 if(cfg.hazard==='heat'&&!safe){s.hazardClock+=dt;if(s.hazardClock>=3){s.hazardClock=0;damage(s,p,3);}}
 if(clear(s)&&!s.sectorDone){s.sectorDone=true;if(!s.cleared.includes(s.sector))s.cleared.push(s.sector);s.scrap+=120;s.tech+=2;notify(s,'SECTOR SECURED / +120 SCRAP +2 RESEARCH / RETURN TO RING');}
 if(p.hp<=0){s.dead=true;notify(s,'FLAGSHIP LOST');}
}

export function stats(s){return shipStats(s);}
function refit(s,heal=false){const st=stats(s),p=s.player,missing=Math.max(0,(p.max||st.hp)-p.hp);p.max=st.hp;p.hp=heal?p.max:Math.max(1,p.max-missing);p.maxShield=st.shield;p.shield=heal?st.shield:Math.min(p.shield||0,st.shield);}
export function hullStatus(s){return shipHullStatus(s);}
export function expandHull(s){if(interact(s)!=='dock')return false;const st=hullStatus(s);if(!st.ok){notify(s,st.reason);return false;}const old=HULLS[s.hull],items=s.loadout.slice();s.scrap-=st.cost;s.tech-=st.research;s.hull++;const used=new Set();s.loadout=HULLS[s.hull].mounts.map(m=>{const i=old.mounts.findIndex((o,i)=>!used.has(i)&&o.type===m.type&&items[i]&&compatible(m,items[i],s.hull));if(i>=0){used.add(i);return items[i];}return null;});s.mountState=[];refit(s,true);notify(s,HULLS[s.hull].name+' / NEW MOUNTS AVAILABLE');s.events.push('buy');return true;}
export function fitStatus(s,slot,id){return shipFitStatus(s,slot,id);}
export function fit(s,slot,id){if(interact(s)!=='dock')return false;const st=fitStatus(s,slot,id);if(!st.ok){notify(s,st.reason);return false;}s.scrap-=st.cost;s.tech-=st.research;if(id&&!s.owned.includes(id))s.owned.push(id);s.loadout[slot]=id;s.mountState[slot]=null;refit(s);notify(s,id?'COMPONENT FITTED / LICENSE REUSABLE':'MOUNT EMPTIED');return true;}
export function selectedTarget(s){return s.ships.concat(s.nests,s.bases||[]).find(e=>(e.id||-1)===s.targetId&&e.hp>0&&e.team&&dist(s.player,e)<1400)||null;}
export function selectTarget(s,x=null,y=null){const enemies=s.ships.concat(s.nests,s.bases||[]).filter(e=>e.team&&e.hp>0&&dist(s.player,e)<1400).sort((a,b)=>x===null?dist(s.player,a)-dist(s.player,b):dist({x,y},a)-dist({x,y},b));if(x!==null){s.targetId=enemies.length?enemies[0].id||-1:null;}else{const i=enemies.findIndex(e=>(e.id||-1)===s.targetId);s.targetId=enemies.length?(enemies[(i+1)%enemies.length].id||-1):null;}return selectedTarget(s);}
function weaponDamage(s,e,w,dmg,direction=null){recordShipImpact(e,dmg,direction,s.time);if(s.nests.includes(e))dmg*=w.structure||1;const before=e.hp;if(e.shield>0&&w.shield){const drained=Math.min(e.shield,dmg*w.shield);e.shield-=drained;damage(s,e,Math.max(0,dmg-drained/w.shield));}else damage(s,e,dmg*(e.kind===1?(w.armor||1):1));if(w.jam)e.jam=Math.max(e.jam||0,w.jam);if(w.burn)e.burn=Math.max(e.burn||0,w.burn);if(w.heal)s.player.hp=Math.min(s.player.max,s.player.hp+Math.max(0,before-e.hp)*w.heal);}
function explodeWeapon(s,b,w,direct){for(const e of s.ships.concat(s.nests)){if(e===direct||e.hp<=0||!e.team)continue;const d=dist(e,b);if(d<w.splash)weaponDamage(s,e,w,b.dmg*.65*(1-d/w.splash),{x:e.x-b.x,y:e.y-b.y});}if(w.self&&dist(s.player,b)<w.splash)damage(s,s.player,b.dmg*.3*(1-dist(s.player,b)/w.splash),{x:s.player.x-b.x,y:s.player.y-b.y});emitVisual(s.fx,'explosion',b.x,b.y,{size:w.splash*.35,weapon:w.id});}
function fireMounts(s,dt,fire,target){const p=s.player,h=HULLS[s.hull];for(let i=0;i<h.mounts.length;i++){const m=h.mounts[i],w=weapon(s.loadout[i]);if(!w||!hullAllows(w.id,s.hull))continue;const mount=s.mountState[i]||(s.mountState[i]={a:p.a,cd:0});mount.cd=Math.max(0,mount.cd-dt);const x=p.x+Math.cos(p.a)*m.x-Math.sin(p.a)*m.y,y=p.y+Math.sin(p.a)*m.x+Math.cos(p.a)*m.y;
 if(m.type==='turret'){if(target)mount.a=turnTowards(mount.a,Math.atan2(target.y-y,target.x-x),3.4*dt);}else mount.a=p.a;
 if(s.player.cloaked||!fire||mount.cd>0||s.overheated||s.energy<w.energy||s.bullets.length>=320)continue;
 if(m.type==='turret'&&(!target||Math.abs(angleDelta(mount.a,Math.atan2(target.y-y,target.x-x)))>.16))continue;
 emitVisual(s.fx,'muzzle',x+Math.cos(mount.a)*13,y+Math.sin(mount.a)*13,{a:mount.a,weapon:w.id,size:w.splash?14:w.beam?7:9});
 if(w.beam){const bx=x+Math.cos(mount.a)*w.range,by=y+Math.sin(mount.a)*w.range;const hits=s.ships.concat(s.nests).filter(e=>e.team&&e.hp>0&&segmentDistance(e.x,e.y,x,y,bx,by)<(e.r||ENEMIES[e.kind].radius)).sort((a,b)=>dist({x,y},a)-dist({x,y},b));let victim=hits[0];const rock=s.rocks.filter(r=>r.hp>0&&segmentDistance(r.x,r.y,x,y,bx,by)<r.r*.85).sort((a,b)=>dist({x,y},a)-dist({x,y},b))[0];let stoppedRock=null;if(rock&&(!victim||dist({x,y},rock)<dist({x,y},victim))){victim=null;stoppedRock={x:rock.x-Math.cos(mount.a)*rock.r*.8,y:rock.y-Math.sin(mount.a)*rock.r*.8};rock.hp-=w.damage*(1+s.gun*.12)*(s.role===2?1.6:1);emitVisual(s.fx,'impact',stoppedRock.x,stoppedRock.y,{weapon:w.id,size:12});}if(victim){contactVisual(s,victim,w,w.damage,x,y);weaponDamage(s,victim,w,w.damage*(1+s.gun*.12)*ROLES[s.role||0].damage,{x:victim.x-x,y:victim.y-y});let last=victim;const struck=new Set([victim]);for(let j=0;j<(w.chain||0);j++){const next=s.ships.find(e=>e.team&&e.hp>0&&!struck.has(e)&&dist(last,e)<230);if(!next)break;contactVisual(s,next,w,w.damage*.55,last.x,last.y);weaponDamage(s,next,w,w.damage*.55,{x:next.x-last.x,y:next.y-last.y});s.fx.push({x:last.x,y:last.y,x2:next.x,y2:next.y,beam:true,weapon:w.id,color:w.color,t:.13,max:.13,vx:0,vy:0});last=next;struck.add(next);}}
 const end=victim||stoppedRock||{x:bx,y:by};s.fx.push({x,y,x2:end.x,y2:end.y,beam:true,weapon:w.id,color:w.color,t:.11,max:.11,vx:0,vy:0});
 }else{const count=(w.count||1)+(w.id==='cannon'?level(s,'multishot'):0);for(let n=0;n<count;n++){const a=mount.a+(count>1?(n-(count-1)/2)*(w.spread||.075):(w.spread||0)*(Math.random()-.5));const velocity=launchVelocity(p,a,w.speed,x,y);s.bullets.push({x,y,vx:velocity.vx,vy:velocity.vy,driftX:velocity.vx-Math.cos(a)*w.speed,driftY:velocity.vy-Math.sin(a)*w.speed,t:w.life,team:0,dmg:w.damage*(1+s.gun*.12)*(ROLES[s.role||0].damage),pierce:(w.pierce||0)+(w.id==='cannon'?level(s,'pierce'):0),hits:[],weapon:w.id,target:s.targetId,launchAngle:a,weaveSide:n%2?-1:1});}}
 s.energy-=w.energy;s.heat=Math.min(120,s.heat+w.heat);if(s.heat>=100)s.overheated=true;mount.cd=w.rate/(1+s.gun*.05);s.events.push('shot');}}

function contactVisual(s,e,w,amount,fromX,fromY){
 const a=Math.atan2(e.y-fromY,e.x-fromX),radius=e.r||(e===s.player?HULLS[s.hull].radius:e.team?ENEMIES[e.kind].radius:18),x=e.x-Math.cos(a)*radius*.85,y=e.y-Math.sin(a)*radius*.85,shielded=(e.shield||0)>0;
 emitVisual(s.fx,shielded?'shield':'impact',x,y,{a,weapon:w?.id||'cannon',color:shielded?'#8fc7ed':w?.color||'#d6b898',size:shielded?18+radius*.2:8+Math.sqrt(amount)*1.2});
 if(!shielded&&!e.r){const local=a-(e.a||0),r=radius*.35;const scars=e.scars||(e.scars=[]);scars.push({x:-Math.cos(local)*r,y:-Math.sin(local)*r,a:local,size:1.2+Math.min(3,Math.sqrt(amount)*.2),born:s.time,weapon:w?.id||'cannon'});if(scars.length>8)scars.shift();}
}

export function chooseRole(s,id){if(!ROLES[id]||interact(s)!=='dock'||s.scrap<ROLES[id].cost)return false;if(s.role===id)return true;s.scrap-=ROLES[id].cost;s.role=id;s.player.role=id;refit(s,true);notify(s,ROLES[id].name+' ROLE FITTED');return true;}
export function toggleCloak(s){if(s.player.cloaked){s.player.cloaked=false;return true;}const role=ROLES[s.role||0];if(!role.cloak||s.dead||s.energy<25||s.cloakLock>0){notify(s,'CLOAK NEEDS CAPACITOR / NO RECENT DAMAGE');return false;}s.player.cloaked=!s.player.cloaked;return true;}
export function layMine(s){const role=ROLES[s.role||0];if(s.dead||s.player.cloaked||s.energy<25||s.mines.length>=role.mines){notify(s,'MINE RACK OR CAPACITOR UNAVAILABLE');return false;}const last=s.mines[s.mines.length-1];if(last&&last.t>87.5)return false;s.energy-=25;s.mines.push({x:s.player.x-Math.cos(s.player.a)*45,y:s.player.y-Math.sin(s.player.a)*45,arm:1.2,t:90,dmg:s.role===3?140:110,faction:s.faction});return true;}

function updateSoloMiners(s,dt){
 const p=s.player;p.loadout=s.loadout;p.hull=s.hull;p.energy=s.energy;p.faction=s.faction;s.ships=syncMiningDrones(s.ships,[p],s.time,()=>++serial);
 const enemies=s.ships.filter(e=>e.team&&e.hp>0);
 for(const d of s.ships){if(!d.mining)continue;const result=stepMiningDrone(d,p,s.rocks,enemies,s.loot,dt);
  if(result.deposit)s.scrap+=Math.round(result.deposit*(s.role===2?1.6:1));
  if(result.zap){const {target,kind,damage:amount}=result.zap;if(kind==='rock'){target.hp-=amount;target.hitX=d.x;target.hitY=d.y;}else damage(s,target,amount,{x:target.x-d.x,y:target.y-d.y});const a=Math.atan2(target.y-d.y,target.x-d.x),r=kind==='rock'?target.r*.8:0;emitVisual(s.fx,'beam',d.x,d.y,{beam:true,x2:target.x-Math.cos(a)*r,y2:target.y-Math.sin(a)*r,weapon:'mining',max:.16});}
 }
 s.energy=p.energy;
}
