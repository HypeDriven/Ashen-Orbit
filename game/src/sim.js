import {createBaseDefense,updateBaseDefense,interceptBaseShot} from './defenses.js';
import {WEAPONS,COMPONENTS,HULLS,weapon,component,compatible,angleDelta,turnTowards,segmentDistance} from './arsenal.js';
export {WEAPONS,COMPONENTS,HULLS} from './arsenal.js';
// Ashen Orbit: fixed-step simulation shared by native and browser runtimes.
export const TAU = Math.PI * 2;
export const SECTOR_INFO = [
  {name:'THE PALE BELT',risk:'LOW',reward:1,hazard:'none',toll:0,repair:35,types:[0,1,5],note:'Quiet salvage lanes. Affordable repairs.',bonus:'Balanced rewards / safe station'},
  {name:'CINDER REACH',risk:'HIGH',reward:1.65,hazard:'heat',toll:35,repair:65,types:[0,1,3],note:'Hot debris drains hull outside the ring.',bonus:'+65% salvage / thermal hull damage'},
  {name:'THE HOLLOW',risk:'HIGH',reward:1.45,hazard:'ion',toll:0,repair:55,types:[3,4,5],note:'Ion storms suppress shield regeneration.',bonus:'+45% salvage / unreliable shields'},
  {name:'DRIFTER HAVEN',risk:'LOW',reward:.85,hazard:'none',toll:55,repair:20,types:[0,5],note:'A protected refuge with cheap repairs.',bonus:'-15% salvage / low danger / cheap services'},
  {name:'IRON GRAVEYARD',risk:'MEDIUM',reward:1.8,hazard:'dense',toll:25,repair:55,types:[1,3,4],note:'Rich ore, dense rocks, armored patrols.',bonus:'+80% salvage / 90 asteroids / heavy enemies'},
  {name:'BROOD FRONTIER',risk:'EXTREME',reward:1.5,hazard:'brood',toll:0,repair:70,types:[4,5,3],note:'Carrier swarms. Every nest yields extra research.',bonus:'+50% salvage / double nest research'},
  {name:'DEAD STAR',risk:'FINAL',reward:1.8,hazard:'ion',toll:80,repair:60,types:[0,1,3,4,5],note:'Destroy the dreadnought and end the signal.',bonus:'Final battle / requires the completed command campaign'},
  {name:'PRISM NEBULA',risk:'HIGH',reward:1.7,hazard:'ion',toll:60,repair:70,types:[1,3,5],note:'Shielded guardians patrol the relay.',bonus:'Disruptors counter shields / +70% salvage'},
  {name:'THE SILENT ARCHIVE',risk:'EXTREME',reward:1.9,hazard:'dense',toll:80,repair:80,types:[1,3,4],note:'Recover an ancient navigation cipher at the relay.',bonus:'Navigation cipher / armored long-range patrols'},
  {name:'EMBER FORGE',risk:'EXTREME',reward:2,hazard:'heat',toll:90,repair:95,types:[1,4,5],note:'Hot salvage fields favor radiators over raw firepower.',bonus:'+100% salvage / heat and carrier swarms'},
  {name:'OUTER WATCH',risk:'EXTREME',reward:2.1,hazard:'brood',toll:100,repair:100,types:[1,3,4],note:'The last armada stands between you and Dead Star.',bonus:'+110% salvage / elite defenders'}
];
export const SECTORS=SECTOR_INFO.map(s=>s.name);
export const ENEMIES=[
 {name:'RAIDER',hp:75,speed:155,range:300,rate:1.1,radius:17,reward:3},
 {name:'BULWARK',hp:240,speed:78,range:260,rate:.8,radius:29,reward:8},
 {name:'DREADNOUGHT',hp:1800,speed:42,range:450,rate:.5,radius:62,reward:45},
 {name:'LANCER',hp:95,speed:100,range:670,rate:2.6,radius:22,reward:5},
 {name:'BROODMOTHER',hp:310,speed:68,range:580,rate:2.2,radius:38,reward:12},
 {name:'LEECH',hp:32,speed:235,range:15,rate:1.6,radius:12,reward:2}
];
export const UPGRADES=[
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
export const TREES=['WEAPONS','DEFENSE','ENGINEERING','FLEET'];
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function rng(seed){let x=seed;return ()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};}
let serial=0;
export function makeShip(x,y,team=0,kind=0){const def=ENEMIES[kind]||ENEMIES[0];const hp=team?def.hp:180;return {id:++serial,x,y,vx:0,vy:0,a:-Math.PI/2,hp,max:hp,shield:0,maxShield:0,lastHit:0,cd:1,spawn:7,charge:0,team,kind,hit:0};}
function level(s,id){return s.upgrades[id]||0;}
export function notify(s,message){s.message=message;s.messageTime=4;}
export function createGame(saved=null){
 const s={schema:3,baseDefense:createBaseDefense(),hull:0,loadout:['cannon',null,'drive','reactor'],owned:['cannon','drive','reactor','barrier'],mountState:[],heat:0,overheated:false,targetId:null,ciphers:[],sector:0,depth:0,scrap:120,tech:0,kills:0,gun:1,armor:0,wing:2,time:0,pulse:0,boost:100,energy:100,tractorOn:false,stance:0,upgrades:{gun:1,armor:0},visited:[],cleared:[],sectorDone:false,ships:[],rocks:[],bullets:[],loot:[],fx:[],nests:[],objectives:[],message:'',messageTime:0,won:false,dead:false,events:[],seed:934,contractLog:[],hazardClock:0};
 if(saved&&typeof saved==='object'){
  for(const k of ['sector','scrap','kills','tech','depth','wing'])if(Number.isFinite(saved[k]))s[k]=Math.max(0,Math.floor(saved[k]));
  s.sector=Math.min(10,s.sector);s.depth=Math.min(10,s.depth);s.wing=Math.min(5,s.wing);
  if(saved.schema>=2&&saved.upgrades&&typeof saved.upgrades==='object'){for(const u of UPGRADES)if(Number.isFinite(saved.upgrades[u.id]))s.upgrades[u.id]=Math.max(u.id==='gun'?1:0,Math.min(u.max,Math.floor(saved.upgrades[u.id])));}
  else if(!(saved.schema>=2)){s.upgrades.gun=Math.max(1,Math.min(5,saved.gun||1));s.upgrades.armor=Math.min(4,saved.armor||0);s.upgrades.hangar=Math.max(0,s.wing-2);if(s.sector===3)s.sector=6;s.depth=Math.min(3,s.sector);}
  if(Array.isArray(saved.cleared))s.cleared=saved.cleared.filter(x=>Number.isInteger(x)&&x>=0&&x<11);
  if(Array.isArray(saved.visited))s.visited=saved.visited.filter(x=>Number.isInteger(x)&&x>=0&&x<11);
 }
 if(saved?.schema>=3){
  s.hull=Math.max(0,Math.min(4,Math.floor(saved.hull||0)));s.loadout=HULLS[s.hull].mounts.map((m,i)=>compatible(m,saved.loadout?.[i])?saved.loadout?.[i]||null:null);
  if(Array.isArray(saved.owned))s.owned=[...new Set(s.owned.concat(saved.owned.filter(id=>weapon(id)||component(id))))];
  s.contractLog=Array.isArray(saved.contractLog)?[...new Set(saved.contractLog.filter(k=>typeof k==='string'))]:[];
  s.ciphers=Array.isArray(saved.ciphers)?[...new Set(saved.ciphers.filter(k=>[2,5,8].includes(k)))]:[];
 }
 if(s.sector===6&&!campaignStatus(s).ready)s.sector=0;
 s.gun=level(s,'gun');s.armor=level(s,'armor');loadSector(s);
 if(saved&&saved.sector===s.sector&&saved.schema>=2&&saved.world&&typeof saved.world==='object'){
  const w=saved.world;
  if(Array.isArray(w.ships)&&w.ships.length&&w.ships.length<=100&&w.ships[0].team===0&&w.ships.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)&&Number.isFinite(e.hp))){
   for(const key of ['ships','rocks','nests','loot','objectives','bullets'])if(Array.isArray(w[key]))s[key]=w[key];
   s.player=s.ships[0];for(const e of s.ships)serial=Math.max(serial,e.id||0);
   for(const key of ['time','pulse','boost','energy','hazardClock','heat'])if(Number.isFinite(w[key]))s[key]=w[key];
   s.overheated=!!w.overheated;if(w.baseDefense&&Array.isArray(w.baseDefense.shields)&&w.baseDefense.shields.length===3&&Array.isArray(w.baseDefense.turrets)&&w.baseDefense.turrets.length===2&&Array.isArray(w.baseDefense.fighters)&&w.baseDefense.fighters.length===6)s.baseDefense=w.baseDefense;
   s.tractorOn=!!w.tractorOn;s.stance=w.stance===1?1:0;s.sectorDone=!!w.sectorDone;s.won=!!w.won;s.dead=s.player.hp<=0;
  }
 }
 for(const n of s.nests)if(!n.id)n.id=++serial;
 return s;
}
export function checkpoint(s){const world={};for(const k of ['ships','rocks','nests','loot','objectives','bullets','time','pulse','boost','energy','hazardClock','tractorOn','stance','sectorDone','won','heat','overheated','baseDefense'])world[k]=s[k];return {schema:3,hull:s.hull,loadout:s.loadout,owned:s.owned,contractLog:s.contractLog,ciphers:s.ciphers,sector:s.sector,depth:s.depth,scrap:s.scrap,tech:s.tech,kills:s.kills,wing:s.wing,upgrades:s.upgrades,visited:s.visited,cleared:s.cleared,world};}
export function loadSector(s){
 s.baseDefense=createBaseDefense();s.ships=[];s.rocks=[];s.bullets=[];s.loot=[];s.fx=[];s.nests=[];s.objectives=[];s.sectorDone=false;s.dead=false;s.pulse=0;s.boost=100;s.energy=100;s.time=0;s.hazardClock=0;
 const p=makeShip(100,180);p.max=p.hp=220+level(s,'armor')*60;p.maxShield=p.shield=level(s,'shield')*45;s.player=p;refit(s,true);s.mountState=[];s.heat=0;s.overheated=false;s.targetId=null;s.ships.push(p);
 if(!s.visited.includes(s.sector))s.visited.push(s.sector);
 const cfg=SECTOR_INFO[s.sector],r=rng(s.seed+s.sector*97+s.depth*7);
 for(let i=0;i<(cfg.hazard==='dense'?90:52);i++){const a=r()*TAU,d=440+r()*2100;s.rocks.push({x:Math.cos(a)*d,y:Math.sin(a)*d,r:25+r()*62,hp:55,type:i%10,a:r()*TAU});}
 for(let i=0;i<s.wing;i++){const e=makeShip(60+i*55,280);e.max=e.hp=150+level(s,'winghull')*55;s.ships.push(e);}
 for(let i=0;i<3;i++){const a=i*TAU/3-.6,dd=1050+s.depth*90,hp=250+s.depth*75;s.nests.push({id:++serial,x:Math.cos(a)*dd,y:Math.sin(a)*dd,r:60,hp,max:hp,cd:9+i,team:1});for(let j=0;j<2+Math.min(3,s.depth);j++)s.ships.push(makeShip(Math.cos(a)*dd+(r()-.5)*260,Math.sin(a)*dd+(r()-.5)*260,1,cfg.types[(i+j)%cfg.types.length]));}
 const bounty=makeShip(-900,-600,1,s.sector===3?0:1);bounty.max=bounty.hp=380+s.depth*80;bounty.bounty=true;s.ships.push(bounty);
 s.objectives=[{id:'wreck',name:'RECOVER THE BLACK BOX',x:650,y:490,progress:0,total:8,reward:150,tech:0,done:false,failed:false,active:false},
 {id:'relay',name:'REBOOT THE RELAY',x:-650,y:550,progress:0,total:6,reward:70,tech:2,done:false,failed:false,active:false},
 {id:'bounty',name:'HUNT THE MARKED CAPTAIN',x:bounty.x,y:bounty.y,progress:0,total:1,reward:210,tech:1,done:false,failed:false,active:true,target:bounty.id},
 {id:'convoy',name:'ESCORT THE FREIGHTER',x:300,y:-900,progress:0,total:1,reward:240,tech:1,hp:260,done:false,failed:false,active:false}];
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
export function upgradeStatus(s,id){const u=UPGRADES.find(u=>u.id===id);if(!u)return {cost:0,tech:0,ok:false,reason:'UNKNOWN UPGRADE',level:0};const l=level(s,id),cost=Math.ceil(u.base*(l+(id==='gun'?0:1)));let reason=l>=u.max?'MAX RANK':u.need&&level(s,u.need)<u.rank?'REQUIRES '+u.need.toUpperCase()+' '+u.rank:s.scrap<cost?'NEED SALVAGE':s.tech<u.tech?'NEED RESEARCH':'';return {cost,tech:u.tech,ok:!reason,reason,level:l};}
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
export function jump(s,destination){if(s.sector===6&&!campaignStatus(s).ready){notify(s,'COMPLETE THE COMMAND CAMPAIGN FIRST');return false;}if(dist(s.player,{x:0,y:0})>285){notify(s,'DOCK AT RING 07 TO JUMP');return false;}if(!clear(s)){notify(s,'PURGE THE THREE NESTS BEFORE JUMPING');return false;}if(s.sector===6){s.won=true;notify(s,'THE SIGNAL IS SILENT. THE BELT IS FREE.');return true;}
 const choice=routes(s).find(r=>r.id===destination);if(!choice){notify(s,'CHOOSE AN AVAILABLE SECTOR ON THE CHART');return false;}if(s.scrap<choice.toll){notify(s,'INSUFFICIENT SALVAGE FOR JUMP TOLL');return false;}s.scrap-=choice.toll;s.sector=destination;s.depth++;loadSector(s);return true;}
export function tractorRange(s){return 340+level(s,'tractor')*110+stats(s).magnet*140;}
export function emp(s){if(s.pulse>0||s.dead)return;s.pulse=14-level(s,'emp')*2;const range=420+level(s,'emp')*70,damage=110+level(s,'emp')*40;for(const e of s.ships)if(e.team&&dist(e,s.player)<range){e.hp-=damage;e.cd=3;}for(const n of s.nests)if(n.hp>0&&dist(n,s.player)<range)n.hp-=damage;s.bullets=s.bullets.filter(b=>!b.team||dist(b,s.player)>range);s.fx.push({x:s.player.x,y:s.player.y,vx:0,vy:0,t:.65,max:.65,pulse:true,r:range});s.events.push('pulse');}
function burst(s,x,y,n=18){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=25+Math.random()*180;s.fx.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:.35+Math.random()*.6,max:1});}s.events.push('boom');}
function salvage(s,x,y,count){for(let i=0;i<count;i++)s.loot.push({x:x+(Math.random()-.5)*55,y:y+(Math.random()-.5)*55,v:Math.round(8*SECTOR_INFO[s.sector].reward)});}
function damage(s,e,amount){if(e.kind===2&&e.team&&s.ships.some(g=>g.bossGuard&&g.hp>0))amount*=.06;if(e.team&&e.kind===1)amount*=.72;let shield=Math.min(e.shield||0,amount);e.shield=Math.max(0,(e.shield||0)-shield);e.hp-=amount-shield;e.hit=.15;e.lastHit=s.time;}
function complete(s,o){if(o.done||o.failed)return;o.done=true;const key=s.sector+':'+o.id;if(!s.contractLog.includes(key))s.contractLog.push(key);if(o.id==='relay'&&[2,5,8].includes(s.sector)&&!s.ciphers.includes(s.sector)){s.ciphers.push(s.sector);notify(s,'NAVIGATION CIPHER RECOVERED');}s.scrap+=Math.round(o.reward*SECTOR_INFO[s.sector].reward);s.tech+=o.tech;notify(s,o.name+' / CONTRACT PAID');s.events.push('buy');}
function shoot(s,e,a){if(s.bullets.length>320)return;const player=e===s.player,kind=e.team?e.kind:-1;let speed=e.team?kind===3?620:300:650;let n=player?1+level(s,'multishot'):kind===2?7:kind===1?3:1;for(let i=0;i<n;i++){const aa=a+(i-(n-1)/2)*(kind===2?.26:kind===1?.15:.075);s.bullets.push({x:e.x+Math.cos(aa)*25,y:e.y+Math.sin(aa)*25,vx:Math.cos(aa)*speed+e.vx*.3,vy:Math.sin(aa)*speed+e.vy*.3,t:e.team?3:1.3,team:e.team,dmg:e.team?(kind===3?28:kind===2?18:10):player?18+s.gun*7:16*(1+level(s,'wingguns')*.4),pierce:player?level(s,'pierce'):0,hits:[]});}e.cd=e.team?ENEMIES[kind].rate:player?.25/(1+s.gun*.12):.5;if(player)s.events.push('shot');}
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
 if(s.dead||s.won)return;s.events=[];s.time+=dt;s.messageTime-=dt;s.pulse=Math.max(0,s.pulse-dt);const p=s.player,cfg=SECTOR_INFO[s.sector];
 const st=stats(s);let dx=input.x||0,dy=input.y||0;const steering=input.steering===true;
 if(steering){p.a+=(input.turn||0)*st.turn*dt;dx+=Math.cos(p.a)*(input.thrust||0);dy+=Math.sin(p.a)*(input.thrust||0);}
 let mag=Math.hypot(dx,dy);if(mag>1){dx/=mag;dy/=mag;}const boosting=input.boost&&s.boost>1&&mag>.1,towing=s.tractorOn&&s.energy>0,speed=(boosting?440:225)*(1+level(s,'engine')*.09)*st.speed*(towing?.74:1);
 s.boost=Math.max(0,Math.min(100,s.boost+dt*(boosting?-34/(1+level(s,'engine')*.2):19)));
 const drag=input.brake?9:steering&&mag<.1?.3:4;
 if(steering){p.vx+=dx*speed*dt*2;p.vy+=dy*speed*dt*2;p.vx*=Math.max(0,1-drag*dt);p.vy*=Math.max(0,1-drag*dt);const v=Math.hypot(p.vx,p.vy);if(v>speed){p.vx*=speed/v;p.vy*=speed/v;}}
 else{p.vx+=(dx*speed-p.vx)*Math.min(1,dt*4);p.vy+=(dy*speed-p.vy)*Math.min(1,dt*4);if(mag>.1)p.a=Math.atan2(dy,dx);}
 if(!steering&&!selectedTarget(s))selectTarget(s);const target=selectedTarget(s);if(!steering&&mag<.1&&target)p.a=turnTowards(p.a,Math.atan2(target.y-p.y,target.x-p.x),st.turn*dt);
 s.heat=Math.max(0,s.heat-st.cooling*dt);if(s.heat>=100)s.overheated=true;if(s.overheated&&s.heat<35)s.overheated=false;
 fireMounts(s,dt,!!input.fire,target);
 for(const e of s.ships){if(e.hp<=0)continue;e.cd-=dt*(e.jam>0?.15:1);e.hit=Math.max(0,e.hit-dt);if(e!==p){
  let target=p;if(e.team){const convoy=s.objectives.find(o=>o.id==='convoy'&&o.active&&!o.done&&!o.failed);if(convoy&&dist(e,convoy)<dist(e,p)*.9)target=convoy;for(const f of s.baseDefense.fighters)if(f.hp>0&&dist(e,f)<Math.min(230,dist(e,target)))target=f;}
  else{let dd=s.stance?1400:750;for(const en of s.ships.concat(s.nests)){if(en.hp<=0||!en.team)continue;const d=dist(e,en);if(d<dd){dd=d;target=en;}}}
  if(e.burn>0){e.burn-=dt;damage(s,e,9*dt);}e.jam=Math.max(0,(e.jam||0)-dt);
  const d=dist(e,target),a=Math.atan2(target.y-e.y,target.x-e.x);e.a=a;const def=ENEMIES[e.kind],wanted=e.team?def.range:target===p?130:340,v=(e.team?def.speed:235)*(e.jam>0?.4:1),approach=d>wanted?1:d<wanted*.65?-.55:0,side=e.team&&e.kind===3?0:.22;
  e.vx+=(Math.cos(a)*v*approach-Math.sin(a)*v*side-e.vx)*dt*2;e.vy+=(Math.sin(a)*v*approach+Math.cos(a)*v*side-e.vy)*dt*2;
  if(e.team&&e.kind===5){if(d<45&&e.cd<=0){damage(s,target,18);s.boost=Math.max(0,s.boost-20);e.cd=1.6;}}
  else if(e.team&&e.kind===3){if(d<1350){e.charge=Math.max(0,1-e.cd);if(e.cd<=0){shoot(s,e,a);e.charge=0;}}}
  else if((target!==p||e.team)&&d<(e.team?850:850)&&e.cd<=0)shoot(s,e,a);
  if(e.team&&(e.kind===4||e.kind===2)){e.spawn-=dt;if(e.spawn<=0&&s.ships.filter(a=>a.team).length<32){e.spawn=e.kind===2?9:11;s.ships.push(makeShip(e.x+45,e.y+35,1,5),makeShip(e.x-45,e.y-35,1,5));}}
 }
 e.x+=e.vx*dt;e.y+=e.vy*dt;if(Math.hypot(e.x,e.y)>2850){const a=Math.atan2(e.y,e.x);e.x=Math.cos(a)*2840;e.y=Math.sin(a)*2840;}
 for(const r of s.rocks){const d=dist(e,r),rr=r.r+(e.team?ENEMIES[e.kind].radius:e===p?HULLS[s.hull].radius:15);if(d<rr){const a=Math.atan2(e.y-r.y,e.x-r.x);e.x=r.x+Math.cos(a)*rr;e.y=r.y+Math.sin(a)*rr;e.vx*=.92;e.vy*=.92;}}
 }
 for(const boss of s.ships.filter(e=>e.team&&e.kind===2)){const phase=boss.hp<boss.max*.33?2:boss.hp<boss.max*.66?1:0;if(phase>(boss.phase||0)){boss.phase=phase;boss.shield=boss.maxShield=350;for(let i=0;i<3;i++)s.ships.push(makeShip(boss.x+(i-1)*100,boss.y+100,1,phase===1?3:4));notify(s,'DREADNOUGHT PHASE '+(phase+1)+' / REINFORCEMENTS');}if(phase===2)boss.cd-=dt*.6;}
 for(const n of s.nests){if(n.hp<=0)continue;n.cd-=dt;if(n.cd<=0&&s.ships.filter(e=>e.team&&e.hp>0).length<28){n.cd=cfg.hazard==='brood'?7:13;s.ships.push(makeShip(n.x+80,n.y,1,cfg.types[Math.floor(s.time)%cfg.types.length]));}}
 updateBaseDefense(s.baseDefense,dt,s.time,s.ships.filter(e=>e.team),s.bullets,(e,amount)=>damage(s,e,amount));
 for(const b of s.bullets){if(b.t<=0)continue;const w=b.weapon?weapon(b.weapon):null;const ax=b.x,ay=b.y;
 if(w?.homing){const target=s.ships.concat(s.nests).find(e=>(e.id||-1)===b.target&&e.hp>0&&e.team);if(target){const a=turnTowards(Math.atan2(b.vy,b.vx),Math.atan2(target.y-b.y,target.x-b.x),w.homing*dt);b.vx=Math.cos(a)*w.speed;b.vy=Math.sin(a)*w.speed;}}
 b.x+=b.vx*dt;b.y+=b.vy*dt;b.t-=dt;if(interceptBaseShot(s.baseDefense,b,ax,ay,b.x,b.y))continue;
 for(const e of s.ships.concat(b.team?[]:s.nests)){if(e.hp<=0||e.team===b.team||b.hits.includes(e.id||-1))continue;
 const radius=e.r||(e.team?ENEMIES[e.kind].radius:e===p?HULLS[s.hull].radius:16);
 if(w?.mine&&b.t>w.life-1)continue;
 if(segmentDistance(e.x,e.y,ax,ay,b.x,b.y)<radius+(w?.mine?45:0)){
 if(w)weaponDamage(s,e,w,b.dmg);else damage(s,e,b.dmg);b.hits.push(e.id||-1);
 if(w?.splash)explodeWeapon(s,b,w,e);
 if(b.pierce<=0)b.t=-1;else b.pierce--;break;}}
 if(b.t>0)for(const r of s.rocks){if(r.hp>0&&segmentDistance(r.x,r.y,ax,ay,b.x,b.y)<r.r*.85){r.hp-=b.dmg;b.t=-1;if(w?.splash)explodeWeapon(s,b,w,null);if(r.hp<=0){burst(s,r.x,r.y,12);salvage(s,r.x,r.y,3);}break;}}
 if(b.t<=0&&w?.mine&&!b.hits.length)explodeWeapon(s,b,w,null);
 }
 s.bullets=s.bullets.filter(b=>b.t>0);s.rocks=s.rocks.filter(r=>r.hp>0);
 for(const e of s.ships)if(e.hp<=0&&!e.destroyed){e.destroyed=true;burst(s,e.x,e.y,e.kind===2?50:18);if(e.team){s.kills++;salvage(s,e.x,e.y,ENEMIES[e.kind].reward);}else if(e!==p){s.wing=Math.max(0,s.wing-1);notify(s,'WINGMAN LOST');}}
 for(const n of s.nests)if(n.hp<=0&&!n.destroyed){n.destroyed=true;burst(s,n.x,n.y,35);salvage(s,n.x,n.y,14);s.tech+=cfg.hazard==='brood'?2:1;notify(s,'NEST DESTROYED / RESEARCH RECOVERED');}
 s.ships=s.ships.filter(e=>e===p||e.hp>0);
 const range=tractorRange(s);let working=false;
 for(const l of s.loot){const d=dist(l,p);if(d<(towing?range:65)){const a=Math.atan2(p.y-l.y,p.x-l.x),v=towing?430+level(s,'tractor')*65:160;l.x+=Math.cos(a)*Math.min(d,v*dt);l.y+=Math.sin(a)*Math.min(d,v*dt);if(towing)working=true;}if(d<25){s.scrap+=l.v;l.v=0;}}
 if(towing&&s.objectives.some(o=>o.id==='wreck'&&!o.done&&dist(p,o)<160))working=true;
 s.energy=Math.max(0,Math.min(100,s.energy+dt*(working?-10:st.regen)));if(s.energy<=0){s.tractorOn=false;notify(s,'TRACTOR CAPACITOR EMPTY / RECHARGING');}
 s.loot=s.loot.filter(l=>l.v>0);contracts(s,dt);
 for(const f of s.fx){f.t-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;}s.fx=s.fx.filter(f=>f.t>0);if(s.fx.length>220)s.fx.splice(0,s.fx.length-220);
 const safe=dist(p,{x:0,y:0})<270;
 if(safe)p.hp=Math.min(p.max,p.hp+dt*4);
 if(s.time-p.lastHit>6){if(cfg.hazard!=='ion'||safe)p.shield=Math.min(p.maxShield,p.shield+dt*(9+level(s,'shield')*2));if(level(s,'regen'))p.hp=Math.min(p.max,p.hp+dt*level(s,'regen')*1.2);}
 if(cfg.hazard==='heat'&&!safe){s.hazardClock+=dt;if(s.hazardClock>=3){s.hazardClock=0;damage(s,p,3);}}
 if(clear(s)&&!s.sectorDone){s.sectorDone=true;if(!s.cleared.includes(s.sector))s.cleared.push(s.sector);s.scrap+=120;s.tech+=2;notify(s,'SECTOR SECURED / +120 SCRAP +2 RESEARCH / RETURN TO RING');}
 if(p.hp<=0){s.dead=true;notify(s,'FLAGSHIP LOST');}
}

export function stats(s){const ids=s.loadout||[],count=id=>ids.filter(x=>x===id).length,h=HULLS[s.hull||0];return {power:ids.reduce((v,id)=>v+(weapon(id)?.power||component(id)?.power||0),0),budget:h.power,cooling:Math.max(7,24+14*count('radiator')-8*count('overdrive')),regen:18+10*count('reactor')+22*count('overdrive'),magnet:count('magnet'),speed:h.speed*(1+.18*count('drive')+.32*count('cruise')+.05*count('agile'))*(1-.1*count('magnet'))*(1-.08*count('bulkhead'))*(1-.15*count('fortress')),turn:h.turn*(1+.15*count('drive')-.25*count('cruise')+.45*count('agile')),hp:h.hp+level(s,'armor')*60+count('bulkhead')*110,shield:level(s,'shield')*45+count('barrier')*90+count('fortress')*190};}
function refit(s,heal=false){const st=stats(s),p=s.player,missing=Math.max(0,(p.max||st.hp)-p.hp);p.max=st.hp;p.hp=heal?p.max:Math.max(1,p.max-missing);p.maxShield=st.shield;p.shield=heal?st.shield:Math.min(p.shield||0,st.shield);}
export function hullStatus(s){const h=HULLS[s.hull+1];if(!h)return {ok:false,reason:'LARGEST HULL',cost:0,research:0};const reason=s.cleared.filter(id=>id!==6).length<h.sectors?'CLEAR '+h.sectors+' SECTORS':s.scrap<h.cost?'NEED SCRAP':s.tech<h.research?'NEED RESEARCH':'';return {ok:!reason,reason,cost:h.cost,research:h.research};}
export function expandHull(s){if(interact(s)!=='dock')return false;const st=hullStatus(s);if(!st.ok){notify(s,st.reason);return false;}const old=HULLS[s.hull],items=s.loadout.slice();s.scrap-=st.cost;s.tech-=st.research;s.hull++;const used=new Set();s.loadout=HULLS[s.hull].mounts.map(m=>{const i=old.mounts.findIndex((o,i)=>!used.has(i)&&o.type===m.type&&items[i]);if(i>=0){used.add(i);return items[i];}return null;});s.mountState=[];refit(s,true);notify(s,HULLS[s.hull].name+' / NEW MOUNTS AVAILABLE');s.events.push('buy');return true;}
export function fitStatus(s,slot,id){const m=HULLS[s.hull].mounts[slot],def=weapon(id)||component(id);if(!m||!compatible(m,id))return {ok:false,reason:'INCOMPATIBLE MOUNT',cost:0,research:0};const cost=id&&!s.owned.includes(id)?def.cost:0,research=id&&!s.owned.includes(id)?def.research||0:0;const draw=stats(s).power-(weapon(s.loadout[slot])?.power||component(s.loadout[slot])?.power||0)+(def?.power||0);const reason=weapon(id)&&s.cleared.length<def.tier?'CLEAR '+def.tier+' SECTORS':draw>HULLS[s.hull].power?'POWER BUDGET EXCEEDED':s.scrap<cost?'NEED SCRAP':s.tech<research?'NEED RESEARCH':'';return {ok:!reason,reason,cost,research};}
export function fit(s,slot,id){if(interact(s)!=='dock')return false;const st=fitStatus(s,slot,id);if(!st.ok){notify(s,st.reason);return false;}s.scrap-=st.cost;s.tech-=st.research;if(id&&!s.owned.includes(id))s.owned.push(id);s.loadout[slot]=id;s.mountState[slot]=null;refit(s);notify(s,id?'COMPONENT FITTED / LICENSE REUSABLE':'MOUNT EMPTIED');return true;}
export function selectedTarget(s){return s.ships.concat(s.nests).find(e=>(e.id||-1)===s.targetId&&e.hp>0&&e.team&&dist(s.player,e)<1400)||null;}
export function selectTarget(s,x=null,y=null){const enemies=s.ships.concat(s.nests).filter(e=>e.team&&e.hp>0&&dist(s.player,e)<1400).sort((a,b)=>x===null?dist(s.player,a)-dist(s.player,b):dist({x,y},a)-dist({x,y},b));if(x!==null){s.targetId=enemies.length?enemies[0].id||-1:null;}else{const i=enemies.findIndex(e=>(e.id||-1)===s.targetId);s.targetId=enemies.length?(enemies[(i+1)%enemies.length].id||-1):null;}return selectedTarget(s);}
function weaponDamage(s,e,w,dmg){const before=e.hp;if(e.shield>0&&w.shield){const drained=Math.min(e.shield,dmg*w.shield);e.shield-=drained;damage(s,e,Math.max(0,dmg-drained/w.shield));}else damage(s,e,dmg*(e.kind===1?(w.armor||1):1));if(w.jam)e.jam=Math.max(e.jam||0,w.jam);if(w.burn)e.burn=Math.max(e.burn||0,w.burn);if(w.heal)s.player.hp=Math.min(s.player.max,s.player.hp+Math.max(0,before-e.hp)*w.heal);}
function explodeWeapon(s,b,w,direct){for(const e of s.ships.concat(s.nests)){if(e===direct||e.hp<=0||!e.team)continue;const d=dist(e,b);if(d<w.splash)weaponDamage(s,e,w,b.dmg*.65*(1-d/w.splash));}if(w.self&&dist(s.player,b)<w.splash)damage(s,s.player,b.dmg*.3*(1-dist(s.player,b)/w.splash));s.fx.push({x:b.x,y:b.y,vx:0,vy:0,t:.25,max:.25,pulse:true,r:w.splash});}
function fireMounts(s,dt,fire,target){const p=s.player,h=HULLS[s.hull];for(let i=0;i<h.mounts.length;i++){const m=h.mounts[i],w=weapon(s.loadout[i]);if(!w)continue;const mount=s.mountState[i]||(s.mountState[i]={a:p.a,cd:0});mount.cd=Math.max(0,mount.cd-dt);const x=p.x+Math.cos(p.a)*m.x-Math.sin(p.a)*m.y,y=p.y+Math.sin(p.a)*m.x+Math.cos(p.a)*m.y;
 if(m.type==='turret'){if(target)mount.a=turnTowards(mount.a,Math.atan2(target.y-y,target.x-x),3.4*dt);}else mount.a=p.a;
 if(!fire||mount.cd>0||s.overheated||s.energy<w.energy||s.bullets.length>=320)continue;
 if(m.type==='turret'&&(!target||Math.abs(angleDelta(mount.a,Math.atan2(target.y-y,target.x-x)))>.16))continue;
 if(w.beam){const bx=x+Math.cos(mount.a)*w.range,by=y+Math.sin(mount.a)*w.range;const hits=s.ships.concat(s.nests).filter(e=>e.team&&e.hp>0&&segmentDistance(e.x,e.y,x,y,bx,by)<(e.r||ENEMIES[e.kind].radius)).sort((a,b)=>dist({x,y},a)-dist({x,y},b));let victim=hits[0];if(victim){weaponDamage(s,victim,w,w.damage*(1+s.gun*.12));let last=victim;const struck=new Set([victim]);for(let j=0;j<(w.chain||0);j++){const next=s.ships.find(e=>e.team&&e.hp>0&&!struck.has(e)&&dist(last,e)<230);if(!next)break;weaponDamage(s,next,w,w.damage*.55);s.fx.push({x:last.x,y:last.y,x2:next.x,y2:next.y,beam:true,color:w.color,t:.13,max:.13,vx:0,vy:0});last=next;struck.add(next);}}
 const end=victim||{x:bx,y:by};s.fx.push({x,y,x2:end.x,y2:end.y,beam:true,color:w.color,t:.11,max:.11,vx:0,vy:0});
 }else{const count=(w.count||1)+(w.id==='cannon'?level(s,'multishot'):0);for(let n=0;n<count;n++){const a=mount.a+(count>1?(n-(count-1)/2)*(w.spread||.075):(w.spread||0)*(Math.random()-.5));s.bullets.push({x,y,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,t:w.life,team:0,dmg:w.damage*(1+s.gun*.12),pierce:(w.pierce||0)+(w.id==='cannon'?level(s,'pierce'):0),hits:[],weapon:w.id,target:s.targetId});}}
 s.energy-=w.energy;s.heat=Math.min(120,s.heat+w.heat);if(s.heat>=100)s.overheated=true;mount.cd=w.rate/(1+s.gun*.05);s.events.push('shot');}}
