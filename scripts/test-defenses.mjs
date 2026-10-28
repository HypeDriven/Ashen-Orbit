import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import {spawnSync} from 'node:child_process';
import {createBaseDefense,updateBaseDefense,interceptBaseShot} from '../game/src/defenses.js';
import {createGame,checkpoint,update} from '../game/src/sim.js';
assert.equal(spawnSync(process.execPath,[new URL('./sync-defenses.mjs',import.meta.url).pathname,'--check']).status,0,'Server must inline the current shared defense rules');
const clone=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const bullet=(x,y,vx,vy,dmg=20,team=1)=>({x,y,vx,vy,dmg,team,t:3,hits:[],pierce:0});
let d=createBaseDefense();assert.equal(d.shields.length,3);assert.equal(d.turrets.length,2);assert.equal(d.fighters.length,6);assert.deepEqual(d.fighters.map(f=>f.squad),[0,0,0,1,1,1]);
// Swept collision stops a shot which crosses the entire pocket in one step.
let b=bullet(0,-400,0,9000);assert.ok(interceptBaseShot(d,b,0,-400,0,-80));assert.equal(b.t,-1);near(d.shields[0].hp,45);let shield=d.shields[0];assert.equal(shield.recharge,8);
b=bullet(0,-400,0,9000,20,0);assert.equal(interceptBaseShot(d,b,0,-400,0,-80),false);near(shield.hp,45);
// Screen overkill passes the residual through; a shot fired from inside bypasses it.
shield.hp=5;b=bullet(0,-400,0,9000,20);assert.equal(interceptBaseShot(d,b,0,-400,0,-80),false);assert.equal(b.dmg,15);assert.equal(shield.hp,0);
shield.hp=65;b=bullet(0,-215,0,1000);assert.equal(interceptBaseShot(d,b,0,-215,0,-90),false);assert.equal(shield.hp,65);
shield.hp=0;shield.recharge=8;updateBaseDefense(d,7,7,[],[],()=>{});assert.equal(shield.hp,0);updateBaseDefense(d,1,8,[],[],()=>{});near(shield.hp,5);updateBaseDefense(d,20,28,[],[],()=>{});near(shield.hp,65);
// PD prioritizes an incoming projectile, does not spend a shot on outgoing/friendly fire,
// and never attacks an enemy outside the base neighborhood.
d=createBaseDefense();let enemy={x:0,y:-320,hp:1000},incoming=bullet(-145,-250,0,300);d.turrets[1].cd=100;updateBaseDefense(d,.01,0,[enemy],[incoming],(e,n)=>e.hp-=n);assert.equal(incoming.t,-1);assert.equal(enemy.hp,1000);assert.equal(d.fx[0].kind,'pd');
d=createBaseDefense();d.fighters=[];d.turrets[1].cd=100;let outgoing=bullet(-145,-250,0,-300);updateBaseDefense(d,.01,0,[enemy],[outgoing],(e,n)=>e.hp-=n);assert.equal(outgoing.t,3);assert.equal(enemy.hp,994);updateBaseDefense(d,.1,.1,[enemy],[],(e,n)=>e.hp-=n);assert.equal(enemy.hp,994);
d=createBaseDefense();enemy={x:0,y:-600,hp:1000};for(let i=0;i<1200;i++)updateBaseDefense(d,1/60,i/60,[enemy],[],(e,n)=>e.hp-=n);assert.equal(enemy.hp,1000);assert.ok(d.fighters.every(f=>Math.hypot(f.x,f.y)<=500.00001));
// Fighter damage is modest, does not scale with flagship tech, and losses have a real replacement delay.
d=createBaseDefense();d.turrets=[];enemy={x:160,y:0,hp:1000};for(let i=0;i<600;i++)updateBaseDefense(d,1/60,i/60,[enemy],[],(e,n)=>e.hp-=n);assert.ok(enemy.hp<1000&&enemy.hp>=868);assert.ok(d.fighters.every(f=>Math.hypot(f.x,f.y)<=500));
d=createBaseDefense();d.shields=[];d.turrets=[];const f=d.fighters[0];b=bullet(f.x-30,f.y,1000,0,40);assert.ok(interceptBaseShot(d,b,f.x-30,f.y,f.x+30,f.y));assert.equal(f.hp,0);assert.equal(f.respawn,45);updateBaseDefense(d,44,44,[],[],()=>{});assert.equal(f.hp,0);updateBaseDefense(d,1,45,[],[],()=>{});assert.equal(f.hp,28);
// Melee/other direct damage also imposes the replacement delay.
f.hp=0;f.down=false;f.respawn=0;updateBaseDefense(d,.1,46,[],[],()=>{});assert.equal(f.hp,0);assert.ok(f.respawn>44);
// Checkpoints retain weakened shields and dead fighter timers; pre-defense saves migrate.
let s=createGame();s.baseDefense.shields[0].hp=7;s.baseDefense.shields[0].recharge=5;s.baseDefense.fighters[0].hp=0;s.baseDefense.fighters[0].down=true;s.baseDefense.fighters[0].respawn=30;const saved=clone(checkpoint(s));let resumed=createGame(saved);assert.deepEqual(resumed.baseDefense,s.baseDefense);delete saved.world.baseDefense;resumed=createGame(saved);assert.equal(resumed.baseDefense.shields[0].hp,65);assert.equal(resumed.baseDefense.fighters.length,6);
// Campaign integration: same swept shot would hit the flagship without the screen.
function campaign(defended){const s=createGame();s.player.x=0;s.player.y=-120;s.player.hp=100;s.player.max=220;s.rocks=[];s.nests=[];s.objectives=[];s.ships=[s.player];s.baseDefense.turrets=[];s.baseDefense.fighters=[];if(!defended)s.baseDefense.shields=[];s.bullets=[bullet(0,-400,0,5600)];update(s,.05,{steering:true});return s;}
assert.ok(campaign(true).player.hp>99);assert.ok(campaign(false).player.hp<81);
// Generated authoritative rules stay behaviorally identical; no RNG or DOM dependency.
const scope=vm.createContext({});vm.runInContext('Math.random=()=>{throw Error("Ambient RNG forbidden")};Date=undefined;',scope);vm.runInContext(fs.readFileSync(new URL('../game/server.js',import.meta.url),'utf8'),scope);
let a=createBaseDefense(),z=scope.createBaseDefense();for(let i=0;i<300;i++){const ea=[{x:160,y:-150,hp:10000}],ez=clone(ea),ba=[bullet(-140,-250,0,300)],bz=clone(ba);updateBaseDefense(a,.05,i*.05,ea,ba,(e,n)=>e.hp-=n);scope.updateBaseDefense(z,.05,i*.05,ez,bz,(e,n)=>e.hp-=n);assert.deepEqual(clone(z),clone(a));assert.deepEqual(ez,ea);assert.deepEqual(bz,ba);}
const ctx={now:1761436800000,random:.3,players:[{id:'alpha'},{id:'beta'}],room:{metadata:{mission:'salvage'}}};let result=scope.game.createSession(ctx);assert.ok(result.sessionState.baseDefense);ctx.sessionState=result.sessionState;ctx.sessionState.baseDefense.turrets.forEach(t=>t.cd=100);ctx.sessionState.spawn=10000;ctx.sessionState.bullets=[bullet(0,-400,0,4000)];ctx.now+=50;result=scope.game.onTick(ctx);assert.ok(result.sessionState.baseDefense.shields[0].hp<65);assert.equal(result.sessionState.bullets.length,0);assert.ok(result.broadcast[0].data.world.baseDefense);ctx.room.metadata.mission='convoy';assert.equal(scope.game.createSession(ctx).sessionState.baseDefense,null);
console.log('PASS: shield cover/overkill/recharge/breach/friendly fire; PD priority/range/cadence; fighter leash/light damage/loss/replacement; save migration; campaign protection; shared server parity, authoritative snapshots and convoy exclusion.');
