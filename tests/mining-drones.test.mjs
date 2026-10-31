import test from 'node:test';
import assert from 'node:assert/strict';
import {HULLS,WEAPONS,weapon,component,hullAllows} from '../src/arsenal.js';
import {shipFitStatus} from '../src/shipyard.js';
import {miningDronePlan,syncMiningDrones,stepMiningDrone,MAX_MINING_DRONES} from '../src/mining-drones.js';
import {createGame,fit,expandHull,update,checkpoint} from '../src/sim.js';
const owner=()=>({id:'miner',hull:0,x:0,y:0,a:0,vx:0,vy:0,hp:200,faction:0,team:0,energy:100,loadout:['cannon','mining-bay','drive','reactor'],spawnSeq:1});
const rich=hull=>({hull,role:0,scrap:10000,tech:100,cleared:[0,1,2,3,4,5,6,7,8],owned:[],loadout:HULLS[hull].mounts.map(m=>m.type==='fixed'||m.type==='turret'?'cannon':m.type==='engine'?'drive':m.type==='reactor'?'reactor':null),upgrades:{gun:1}});
const input={steering:true,thrust:0,aim:0,fire:false,boost:false,tractor:false};

test('hull-specific equipment is gated by the actual hull, including an already-owned license',()=>{
 for(const w of WEAPONS.filter(w=>w.hulls))for(let hull=0;hull<HULLS.length;hull++){const s=rich(hull);s.owned=[w.id];const result=shipFitStatus(s,0,w.id);assert.equal(result.ok,w.hulls.includes(hull),w.id+' on '+hull);assert.equal(hullAllows(w.id,hull),result.ok);if(!result.ok)assert.match(result.reason,/HULL|REQUIRES/);}
});
test('growing out of a light hull unfits its special weapon and retains utility bays and licenses',()=>{
 const s=createGame();Object.assign(s,rich(1));s.loadout[0]='skirmisher';s.loadout[2]='mining-bay';s.owned.push('skirmisher','mining-bay');s.player.x=s.player.y=0;assert.equal(expandHull(s),true);assert.equal(s.hull,2);assert.ok(!s.loadout.includes('skirmisher'));assert.ok(s.owned.includes('skirmisher'));assert.ok(s.loadout.includes('mining-bay'));assert.equal(miningDronePlan({...s.player,hull:s.hull,loadout:s.loadout}).length,2);
});
test('saved and forged solo loadouts cannot fire hull-restricted weapons',()=>{
 const s=createGame();s.loadout[0]='siege-lance';s.owned.push('siege-lance');s.ships=[s.player];s.rocks=[];s.nests=[];s.objectives=[];update(s,.05,{...input,fire:true});assert.ok(!s.fx.some(f=>f.weapon==='siege-lance'));const saved=checkpoint(s),restored=createGame(saved);assert.equal(restored.loadout[0],null);assert.ok(restored.owned.includes('siege-lance'));
});
test('utility bays deploy bounded drones, consume capacitor, and enforce rebuild delay after damage',()=>{
 const p=owner();let id=0,units=syncMiningDrones([], [p],0,()=>++id);assert.equal(units.length,2);assert.equal(p.energy,72);assert.ok(units.every(d=>d.hp===32&&d.mining));units[0].hp=0;units=syncMiningDrones(units,[p],1,()=>++id);assert.equal(units.length,1);units=syncMiningDrones(units,[p],10.9,()=>++id);assert.equal(units.length,1);units=syncMiningDrones(units,[p],11,()=>++id);assert.equal(units.length,2);
 const capital={...owner(),hull:4,loadout:HULLS[4].mounts.map(m=>m.type==='utility'?'survey-bay':null)};assert.equal(miningDronePlan(capital).length,MAX_MINING_DRONES);assert.equal(syncMiningDrones([],[capital],0,()=>++id).length,4);
 const forged={...owner(),loadout:['mining-bay',null,'drive','reactor']};assert.equal(miningDronePlan(forged).length,0);
});
test('miners prioritize asteroids, haul real ore back, and stop zapping without capacitor',()=>{
 const p=owner(),units=syncMiningDrones([],[p],0,()=>1),d=units[0],rock={x:180,y:0,r:25,hp:100},enemy={x:50,y:30,hp:100,faction:1};d.cd=0;d.x=80;d.y=0;let result=stepMiningDrone(d,p,[rock],[enemy],[],.01);assert.equal(result.zap.kind,'rock');assert.equal(result.zap.damage,18);assert.equal(p.energy,71);
 const loot=[{x:d.x,y:d.y,v:40}];d.cd=0;result=stepMiningDrone(d,p,[],[],loot,.01);assert.equal(d.cargo,24);assert.equal(loot[0].v,16);let delivered=0;for(let i=0;i<60;i++)delivered+=stepMiningDrone(d,p,[],[],[],.05).deposit||0;assert.equal(delivered,24);assert.equal(d.cargo,0);
 p.energy=0;d.cd=0;d.x=80;d.y=0;assert.equal(stepMiningDrone(d,p,[rock],[],[],.01).zap,undefined);
});
test('drone self-defense stays weak and ignores cloaked enemies outside detection range',()=>{
 for(const bay of ['mining-bay','survey-bay']){const p=owner();p.loadout[1]=bay;const d=syncMiningDrones([],[p],0,()=>1)[0];d.cd=0;d.x=d.y=0;const enemy={x:100,y:0,hp:100,faction:1};const zap=stepMiningDrone(d,p,[],[enemy],[],.01).zap;assert.equal(zap.kind,'ship');assert.ok(zap.damage/component(bay).drone.rate<=2);assert.ok(zap.damage<component(bay).drone.rockDamage/10);d.cd=0;assert.equal(stepMiningDrone(d,p,[],[{...enemy,x:170,cloaked:true}],[],.01).zap,undefined);}
});
test('death, cloak, removed equipment and warp recall drones without creating free replacements',()=>{
 for(const change of [p=>p.hp=0,p=>p.cloaked=true,p=>p.loadout[1]=null,p=>p.spawnSeq++]){const p=owner();const units=syncMiningDrones([],[p],0,()=>1);change(p);assert.equal(syncMiningDrones(units,[p],1,()=>2).length,0);}
});
test('solo drones fracture a real asteroid, collect its ore and deliver scrap autonomously',()=>{
 const s=createGame();s.player.x=s.player.y=0;s.player.vx=s.player.vy=0;s.scrap=1000;s.tech=10;assert.equal(fit(s,1,'mining-bay'),true);s.player.x=500;s.player.y=300;s.ships=[s.player];s.rocks=[{x:650,y:300,r:12,hp:18,type:0,a:0,ore:24,seed:1}];s.nests=[];s.objectives=[];s.spawn=1e9;s.sectorDone=true;const before=s.scrap;
 for(let i=0;i<500;i++)update(s,.05,input);assert.equal(s.rocks.length,0);assert.equal(s.loot.length,0);assert.equal(s.scrap-before,24);assert.equal(s.ships.filter(e=>e.mining).length,2);assert.equal(s.wing,2);
});
