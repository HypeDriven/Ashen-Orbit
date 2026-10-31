import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fractureRock,voiceGain,visibleShip,ROCK_MIN} from '../src/universe-rules.js';
import {createGame,chooseRole,stats,layMine,update} from '../src/sim.js';

const source=readFileSync(new URL('../server.js',import.meta.url),'utf8');
function world(count=2,saved={}){
 const sandbox=vm.createContext({});vm.runInContext(source,sandbox);
 const game=sandbox.game;
 const ctx={players:Array.from({length:count},(_,i)=>({id:`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`,name:'Pilot '+i,ai:false})),now:100000,room:{metadata:{universe:true}},playerStates:saved};
 const result=game.createSession(ctx);assert.equal(result.ok,true);ctx.sessionState=result.sessionState;
 const cmd=(i,data)=>game.onPlayerMessage({...ctx,message:{from:ctx.players[i].id,data}});
 const tick=(n=1,inputs=[])=>{let r;for(let i=0;i<n;i++){ctx.now+=50;r=game.onTick({...ctx,inputs});assert.equal(r.ok,true);ctx.sessionState=r.sessionState;}return r;};
 return {sandbox,game,ctx,cmd,tick,get s(){return ctx.sessionState;}};
}

test('late joins enter the existing universe, choose sides, and reconnect without teleporting',()=>{
 const w=world(1);assert.equal(w.cmd(0,{type:'resync'}).broadcast[0].data.type,'choose-faction');
 assert.equal(w.cmd(0,{type:'mine'}).ok,false);
 assert.equal(w.cmd(0,{type:'choose',faction:0}).ok,true);
 const p=w.s.pilots[0];p.x=-700;p.y=600;p.hp=33;p.energy=19;
 assert.equal(w.cmd(0,{type:'choose',faction:0}).ok,true);
 assert.equal(p.hp,33);assert.equal(p.x,-700);assert.equal(p.energy,19);
 w.ctx.players.push({id:'late',name:'Late pilot',ai:false});
 assert.equal(w.game.onMembershipChange(w.ctx).ok,true);w.tick();
 assert.equal(w.cmd(1,{type:'choose',faction:1}).ok,true);
 assert.equal(w.s.pilots[0],p);assert.equal(w.s.pilots[1].x,2200);
 assert.equal(w.s.pilots.length,2);
});

test('faction and purchased hull/role survive departure and saved-state restoration',()=>{
 const w=world();w.cmd(0,{type:'choose',faction:1});const p=w.s.pilots[0];p.scrap=2000;p.tech=3;p.cleared=[0];
 assert.equal(w.cmd(0,{type:'role',role:1}).ok,true);assert.equal(p.max,330);assert.equal(p.shield,140);
 assert.equal(w.cmd(0,{type:'hull'}).ok,true);assert.equal(p.hull,1);assert.equal(p.max,495);
 const id=p.id,saved=w.cmd(0,{type:'leave'}).playerStates;
 w.ctx.players.shift();w.tick();assert.equal(w.s.parked[id].faction,1);
 const restored=world(1,saved);assert.equal(restored.s.pilots[0].faction,1);assert.equal(restored.s.pilots[0].hull,1);assert.equal(restored.s.pilots[0].role,1);
 assert.equal(restored.cmd(0,{type:'resync'}).broadcast.find(packet=>packet.data.type==='snapshot').data.world.kind,'universe');
});

test('cloaks drain energy, hide hostile pilots, and break on fire or damage',()=>{
 const w=world();w.cmd(0,{type:'choose',faction:0});w.cmd(1,{type:'choose',faction:1});w.tick(65);
 const p=w.s.pilots[1];p.x=1500;p.y=500;assert.equal(w.cmd(1,{type:'cloak'}).ok,true);
 let view=w.cmd(0,{type:'resync'}).broadcast.find(packet=>packet.data.type==='snapshot').data.world;
 assert.equal(view.pilots.some(pilot=>pilot[0]===p.id),false);
 w.tick(10);assert.ok(p.energy<100);assert.equal(p.cloaked,true);
 w.s.pilots[0].x=p.x+100;w.s.pilots[0].y=p.y;
 view=w.cmd(0,{type:'resync'}).broadcast.find(packet=>packet.data.type==='snapshot').data.world;assert.equal(view.pilots.some(pilot=>pilot[0]===p.id),true);
 w.tick(1,[{from:p.id,data:{fire:true}}]);assert.equal(p.cloaked,false);
 p.lock=0;w.cmd(1,{type:'cloak'});w.s.mines.push({x:p.x,y:p.y,owner:'other',faction:0,arm:0,t:30,dmg:20});w.tick();assert.equal(p.cloaked,false);
});

test('armed mines ignore allies, hit enemies, enforce cooldown, and expire',()=>{
 const w=world();w.cmd(0,{type:'choose',faction:0});w.cmd(1,{type:'choose',faction:1});
 const p=w.s.pilots[0],enemy=w.s.pilots[1];p.x=0;p.y=0;p.a=0;
 assert.equal(w.cmd(0,{type:'mine'}).ok,true);assert.equal(w.cmd(0,{type:'mine'}).ok,false);
 w.tick(26);assert.equal(w.s.mines.length,1);
 enemy.x=-45;enemy.y=0;enemy.vx=enemy.vy=0;const hp=enemy.hp;w.tick();assert.equal(w.s.mines.length,0);assert.ok(enemy.hp<hp);assert.equal(p.hp,p.max);
 p.mineCd=0;p.energy=100;w.cmd(0,{type:'mine'});w.s.mines[0].t=.01;w.tick();assert.equal(w.s.mines.length,0);
});

test('fractures conserve area and ore through every generation down to dust',()=>{
 let rocks=[{x:0,y:0,r:66,hp:1,type:0,a:0,seed:934,ore:101}],ore=0,depth=0;
 while(rocks.length){const next=[];for(const rock of rocks){const children=fractureRock(rock,-90,0);if(children.length){assert.equal(children.length,2);assert.ok(Math.abs(children.reduce((n,r)=>n+r.r*r.r,0)-rock.r*rock.r)<1e-8);assert.equal(children.reduce((n,r)=>n+r.ore,0),rock.ore);assert.ok(children.every(r=>r.r<rock.r&&Number.isFinite(r.spin)));next.push(...children);}else{assert.ok(rock.r<=ROCK_MIN);ore+=rock.ore;}}rocks=next;assert.ok(++depth<20);}
 assert.equal(ore,101);
});

test('one projectile fractures one rock generation, including swept high speed shots',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});w.s.rocks=[{x:0,y:0,r:50,hp:1,type:0,a:0,ore:24,seed:13}];
 w.s.bullets=[{id:1,x:-100,y:0,vx:4000,vy:0,t:1,faction:0,dmg:10000,weapon:'cannon'}];w.tick();
 assert.equal(w.s.rocks.length,2);assert.equal(w.s.loot.length,0);assert.ok(w.s.rocks.every(r=>r.hp>0));
});

test('voice is allied, distance attenuated, and silent for dead pilots',()=>{
 const me={x:0,y:0,hp:100,faction:0},friend={x:120,y:0,hp:100,faction:0};
 assert.equal(voiceGain(me,friend),1);const middle=voiceGain(me,{...friend,x:610});assert.equal(middle,.25);
 assert.equal(voiceGain(me,{...friend,x:1100}),0);assert.equal(voiceGain(me,{...friend,faction:1}),0);
 assert.equal(voiceGain(me,{...friend,hp:0}),0);assert.equal(voiceGain({...me,hp:0},friend),0);
 assert.equal(visibleShip(me,{...friend,faction:1,x:151,cloaked:true}),false);
});

test('32 pilots and a crowded universe fit network frames without dropping asteroids',()=>{
 const w=world(32);for(let i=0;i<32;i++)w.cmd(i,{type:'choose',faction:i%2});
 w.s.rocks=Array.from({length:96},(_,i)=>({x:i*20.1,y:i*-17.7,r:44.123,hp:24,type:i%10,a:1.333,vx:22.1,vy:-32.7,spin:.333}));
 w.s.mines=Array.from({length:64},(_,i)=>({id:i,owner:w.s.pilots[i%32].id,faction:i%2,x:i*10,y:i*12,arm:1.2,t:90}));
 w.s.bullets=Array.from({length:48},(_,i)=>({id:i,x:i*20,y:i*30,vx:779.2,vy:-440.5,t:1.4,faction:i%2,dmg:40,weapon:'cannon'}));
 for(const p of w.s.pilots){p.name='界'.repeat(20);p.scrap=999999;}
 for(let faction=0;faction<2;faction++){
  const r=w.cmd(faction,{type:'resync'}),view=r.broadcast.find(packet=>packet.data.type==='snapshot').data.world;
  assert.equal(r.broadcast.filter(p=>p.data.type==='entity-part'&&p.data.kind==='rocks').reduce((n,p)=>n+p.data.values.length,view.rocks.length),96);assert.equal(r.broadcast.filter(p=>p.data.type==='entity-part'&&p.data.kind==='pilots').reduce((n,p)=>n+p.data.values.length,view.pilots.length),32);
  assert.ok(Buffer.byteLength(JSON.stringify(w.tick()))<262144,'Tick result must fit the platform result budget');
  for(const packet of r.broadcast)assert.ok(Buffer.byteLength(JSON.stringify(packet.data))<16000);
 }
 w.s.tick=99;assert.ok(Buffer.byteLength(JSON.stringify(w.tick()))<262144,'Periodic saves must also fit the result budget');
 w.ctx.players.push({id:'overflow',ai:false});assert.equal(w.game.onMembershipChange(w.ctx).ok,false);
});

test('solo roles apply tradeoffs and laid mines retain their original damage',()=>{
 const s=createGame();s.player.x=s.player.y=0;s.scrap=2000;const interceptor=stats(s);
 assert.equal(chooseRole(s,1),true);const guardian=stats(s);assert.ok(guardian.hp>interceptor.hp);assert.ok(guardian.speed<interceptor.speed);
 chooseRole(s,3);assert.equal(layMine(s),true);assert.equal(s.mines[0].dmg,140);chooseRole(s,0);assert.equal(s.mines[0].dmg,140);
 update(s,1/60,{x:0,y:0,thrust:0,strafe:0,turn:0,fire:false,boost:false,aim:0});assert.ok(Number.isFinite(s.player.hp));
});

test('destroyed bases stop repairs, jumps and spawning; the last enemy base ends the world',()=>{
 const w=world();w.cmd(0,{type:'choose',faction:0});w.cmd(1,{type:'choose',faction:1});w.s.rocks=[];w.s.spawn=100000;
 const attacker=w.s.pilots[0],defender=w.s.pilots[1];
 for(let sector=0;sector<9;sector++){
  const base=w.s.bases.find(b=>b.faction===1&&b.sector===sector);attacker.x=base.x-650;attacker.y=base.y;attacker.a=0;attacker.vx=attacker.vy=0;attacker.energy=100;attacker.heat=0;attacker.overheated=false;
  for(let i=0;i<1600&&base.hp>0;i++)w.tick(1,[{from:attacker.id,data:{seq:sector*2000+i+1,steering:true,fire:true,aim:0}}]);
  assert.equal(base.hp,0,'cannon destroys base '+sector);
  if(sector===4){defender.hp=0;defender.respawn=0;w.tick();assert.equal(defender.hp,defender.max);assert.notEqual(defender.sector,4);assert.equal(w.cmd(1,{type:'jump-sector',sector:4}).ok,false);}
 }
 assert.equal(w.s.ended,true);assert.equal(w.s.winner,0);assert.equal(attacker.baseKills,9);assert.equal(w.s.results.teams[0][0].bases,9);assert.equal(w.s.results.teams[1][0].id,defender.id);
 assert.equal(w.cmd(0,{type:'mine'}).ok,false);assert.equal(w.game.onMembershipChange(w.ctx).ok,false);
 const result=w.tick();assert.ok(result.broadcast.some(p=>p.data.type==='snapshot'&&p.data.world.ended));
 const saved=w.cmd(0,{type:'leave'}).playerStates;const next=world(2,saved);next.s.worldId='new-world';next.s.pilots=[];next.tick();assert.equal(next.s.pilots[0].hull,0);assert.equal(next.s.pilots[0].scrap,120);assert.equal(next.s.bases.filter(b=>b.hp>0).length,18);
});

test('light base defenses fire avoidable projectiles and stop after destruction',()=>{
 const w=world();w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0],base=w.s.bases.find(b=>b.faction===1&&b.sector===4);w.s.rocks=[];w.s.spawn=100000;p.x=base.x-450;p.y=base.y;w.tick();assert.ok(w.s.bullets.some(b=>b.owner===base.id));assert.equal(p.hp,p.max);base.hp=0;w.s.bullets=[];w.tick(50);assert.equal(w.s.bullets.some(b=>b.owner===base.id),false);
});

test('shared shipyard enforces the same catalog gates, prices and stats as solo',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0],solo=createGame();p.scrap=solo.scrap=10000;p.tech=solo.tech=100;
 assert.equal(w.cmd(0,{type:'hull'}).ok,false);
 p.cleared=solo.cleared=[0,1,2,3,4,5,7,8];
 for(let hull=0;hull<5;hull++){
  for(let role=0;role<6;role++){p.role=solo.role=role;solo.hull=p.hull;assert.equal(w.sandbox.uStats(p).hp,stats(solo).hp);assert.equal(w.sandbox.uStats(p).shield,stats(solo).shield);}
  if(hull<4){p.role=0;assert.equal(w.cmd(0,{type:'hull'}).ok,true);solo.hull=p.hull;solo.loadout=Array.from(p.loadout);}
 }
 assert.equal(p.hull,4);assert.equal(w.cmd(0,{type:'fit',slot:0,item:'fortress'}).ok,false);
});

test('old running universes migrate without losing pilots or crashing',()=>{
 const w=world();w.cmd(0,{type:'choose',faction:0});delete w.s.version;delete w.s.escorts;delete w.s.records;delete w.s.worldId;w.s.bases=w.s.bases.filter(b=>b.sector===4);const p=w.s.pilots[0];delete p.loadout;delete p.upgrades;delete p.owned;delete p.cleared;delete p.boost;delete p.heat;w.tick();assert.equal(w.s.version,2);assert.equal(w.s.bases.length,18);assert.ok(Number.isFinite(p.x));assert.equal(p.loadout[0],'cannon');
});

test('EMP damages enemy bases and changing sides dismisses old friendly escorts',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0],base=w.s.bases.find(b=>b.faction===1&&b.sector===4);p.x=base.x-300;p.y=base.y;const hp=base.hp;assert.equal(w.cmd(0,{type:'pulse'}).ok,true);assert.equal(base.hp,hp-110);
 p.x=-2200;p.y=120;p.scrap=2000;assert.equal(w.cmd(0,{type:'upgrade',id:'escort'}).ok,true);assert.equal(w.s.escorts.length,1);p.choiceAt=-100;assert.equal(w.cmd(0,{type:'choose',faction:1}).ok,true);assert.equal(w.s.escorts.length,0);
});

test('untrusted movement restrictions persist across reconnects and fresh worlds',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0];
 for(let i=1;i<=3;i++)w.tick(1,[{from:p.id,data:{seq:i,steering:true,motion:{x:3000,y:6000,vx:99999,vy:0,a:0,spawnSeq:p.spawnSeq}}}]);
 assert.equal(p.untrusted,true);const saved=w.cmd(0,{type:'leave'}).playerStates;assert.equal(saved[p.id].flightTrust.untrusted,true);
 const next=world(1,saved);next.s.worldId='fresh-world';next.s.pilots=[];next.tick();const restored=next.s.pilots[0];assert.equal(restored.untrusted,true);assert.equal(restored.hull,0);assert.ok(next.sandbox.movementAuthority(restored)<.25);
});

test('weapon status effects and escort bulkheads retain their shipyard tradeoffs online',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0];w.s.spawn=100000;w.s.rocks=[];
 const enemy={id:999,faction:1,x:0,y:0,vx:0,vy:0,a:0,hp:100,max:100,cd:1,kind:0};w.s.enemies=[enemy];w.sandbox.uDamage(w.s,enemy,10,p.id,{burn:3,jam:1.8});w.tick(20);assert.ok(enemy.hp<82&&enemy.hp>80);assert.ok(Math.hypot(enemy.x,enemy.y)<50,'ion slows patrol drives');assert.ok(enemy.cd>.8,'ion delays patrol weapons');
 p.scrap=5000;p.tech=100;p.upgrades.hangar=1;p.upgrades.wingguns=1;assert.equal(w.cmd(0,{type:'upgrade',id:'escort'}).ok,true);assert.equal(w.cmd(0,{type:'upgrade',id:'winghull'}).ok,true);assert.equal(w.s.escorts[0].max,205);assert.equal(w.s.escorts[0].hp,205);
});

test('obsolete flight-policy flags are retired when the validation policy changes',()=>{
 const id='00000000-0000-0000-0000-000000000000',w=world(1,{[id]:{flightTrust:{untrusted:true,violations:3},universe:{faction:0,trust:{untrusted:true,violations:3}}}});assert.equal(w.s.pilots[0].untrusted,false);assert.equal(w.s.pilots[0].violations,0);assert.equal(w.cmd(0,{type:'leave'}).playerStates[id].flightTrust.policy,4);
});

test('all 32 pilots can sustain fire together and every network packet stays bounded',()=>{
 const w=world(32);w.s.rocks=[];w.s.spawn=1e9;for(let i=0;i<32;i++){w.cmd(i,{type:'choose',faction:i%2});const p=w.s.pilots[i];p.x=(i%8)*180-600;p.y=Math.floor(i/8)*160-250;p.hp=p.max=1e6;p.loadout[0]='gatling';}
 let peak=0;for(let tick=0;tick<100;tick++){const r=w.tick(1,w.s.pilots.map((p,i)=>({from:p.id,data:{seq:tick+1,fire:true,steering:true,aim:i*.4}})));peak=Math.max(peak,w.s.bullets.length);for(const packet of r.broadcast)assert.ok(Buffer.byteLength(JSON.stringify(packet.data))<16000,'bounded frame');}
 assert.ok(peak>64);for(const p of w.s.pilots)assert.ok(p.shots>=40,'all players retain firing capacity');
});

test('empty worlds field an AI pilot in every hull and do not persist or address synthetic accounts',()=>{
 const w=world(0);assert.equal(w.s.pilots.length,5);assert.deepEqual(Array.from(w.s.pilots.map(p=>p.hull)).sort(),[0,1,2,3,4]);assert.ok(w.s.pilots.every(p=>p.ai&&p.hp>0));const r=w.tick(120);assert.equal(r.broadcast.length,0);assert.equal(Object.keys(w.sandbox.uSave(w.s,w.ctx)).length,0);
});
test('offline presence activates AI and bots spend earned scrap through role and upgrade gates',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});w.ctx.presence={[w.ctx.players[0].id]:{online:false}};w.tick();assert.equal(w.s.pilots.filter(p=>p.ai).length,5);const bot=w.s.pilots.find(p=>p.ai&&p.hull===4);bot.scrap=1000;bot.tech=10;const before=bot.scrap;w.sandbox.uBotThink(w.s,bot,w.ctx);assert.equal(bot.role,1);assert.ok(bot.scrap<before-280);assert.ok(bot.upgrades.armor>0);
});
test('timed controls wait until their timestamp and duplicate batches never apply twice',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0],packet={type:'input',seq:1,events:[[w.s.time+.032,1,1,0,0,1,0,0,0,1,0,0,null,0,0]]};w.cmd(0,packet);assert.equal(p.input.fire,false);w.ctx.now+=20;w.game.onTick(w.ctx);assert.equal(p.inputAck,0);w.ctx.now+=20;w.game.onTick(w.ctx);assert.equal(p.inputAck,1);assert.equal(p.input.fire,true);w.cmd(0,packet);assert.equal(p.pendingInputs.length,0);
});
test('ship projectiles inherit launch velocity and starbases lead accelerated targets',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0];p.a=0;p.vx=500;p.vy=100;p.av=0;w.sandbox.uFireMounts(w.s,p,.05,{fire:true});assert.equal(w.s.bullets[0].vx,1220);assert.equal(w.s.bullets[0].vy,100);
 const base=w.s.bases.find(b=>b.faction===1&&b.sector===4);p.x=base.x-450;p.y=base.y;p.vx=0;p.vy=100;p.ax=0;p.ay=80;w.s.bullets=[];w.sandbox.uBaseDefenses(w.s,.05);const shot=w.s.bullets.find(b=>b.owner===base.id);assert.ok(shot&&shot.vy>0);
});

test('AI pilots collect actual salvage and buy their chosen role with those earnings',()=>{
 const w=world(0),bot=w.s.pilots.find(p=>p.ai&&p.hull===0);w.s.loot=[{x:bot.x,y:bot.y,v:300}];w.tick(6);assert.equal(bot.total,300);assert.equal(bot.role,2);assert.ok(bot.scrap<420-220,'upgrade spending follows role purchase');
});

test('32 players with queued future controls still fit every transport frame',()=>{
 const w=world(32);for(let i=0;i<32;i++){w.cmd(i,{type:'choose',faction:i%2});const p=w.s.pilots[i];p.name='界'.repeat(20);p.x=i*10;p.y=0;w.cmd(i,{type:'input',seq:8,events:Array.from({length:8},(_,j)=>[w.s.time+.1+j*.01,j+1,1,0,.5,1,0,0,Math.PI,1,1,1,p.id,0,.7])});}
 const r=w.tick();for(const packet of r.broadcast)assert.ok(Buffer.byteLength(JSON.stringify(packet.data))<16000);
});

test('queued combat actions apply once after the window and allow fresh clients to reconnect',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const command={type:'scheduled-action',id:'first:1',at:w.s.time+.032,command:{type:'mine'}};assert.equal(w.cmd(0,command).ok,true);assert.equal(w.cmd(0,command).ok,true);assert.equal(w.s.mines.length,0);w.tick();assert.equal(w.s.mines.length,1);const p=w.s.pilots[0];p.mineCd=0;p.energy=100;assert.equal(w.cmd(0,{...command,id:'reconnected:1',at:w.s.time+.032}).ok,true);w.tick();assert.equal(w.s.mines.length,2);
});

test('AI pilots yield their slots when 32 humans join the world',()=>{
 const w=world(0);assert.equal(w.s.pilots.filter(p=>p.ai).length,5);w.ctx.players=Array.from({length:32},(_,i)=>({id:'human-'+i,name:'Human '+i,ai:false}));w.tick();assert.equal(w.s.pilots.length,32);assert.equal(w.s.pilots.some(p=>p.ai),false);
});

test('disconnect warps the ship out once, saves progression and restores a warp-in at a live base',()=>{
 const w=world(2);w.cmd(0,{type:'choose',faction:0});w.cmd(1,{type:'choose',faction:1});const p=w.s.pilots[0],id=p.id;p.x=-700;p.scrap=777;p.tech=4;p.hull=1;p.role=2;w.ctx.presence=Object.fromEntries(w.ctx.players.map(p=>[p.id,{online:true}]));w.ctx.presence[id].online=false;
 const result=w.tick();assert.ok(!w.s.pilots.some(p=>p.id===id));assert.equal(result.playerStates[id].universe.scrap,777);const out=w.s.fx.find(f=>f.effect==='warp'&&f.out);assert.equal(out.x,-700);assert.equal(out.hull,1);const seed=out.seed;w.tick(3);assert.equal(w.s.fx.filter(f=>f.effect==='warp'&&f.out).length,1);assert.equal(w.s.fx.find(f=>f.out).seed,seed);
 w.ctx.presence[id].online=true;w.tick();const returned=w.s.pilots.find(p=>p.id===id);assert.equal(returned.scrap,777);assert.equal(returned.role,2);assert.equal(returned.x,-2200);assert.equal(returned.warpAt,w.s.time);assert.ok(w.s.fx.some(f=>f.effect==='warp'&&!f.out&&f.hull===1));assert.equal(returned.untrusted,false);
});
test('a disconnect immediately frees one of 32 active seats even before stale membership is reclaimed',()=>{
 const w=world(32);w.ctx.presence=Object.fromEntries(w.ctx.players.map(p=>[p.id,{online:true}]));const old=w.ctx.players[0].id;w.cmd(0,{type:'choose',faction:0});w.ctx.players.push({id:'replacement',name:'Fresh pilot',ai:false});w.ctx.membership={change:'joined',userId:'replacement'};assert.equal(w.game.onMembershipChange(w.ctx).ok,false);
 w.ctx.presence[old].online=false;assert.equal(w.game.onMembershipChange(w.ctx).ok,true);w.ctx.presence.replacement={online:true};w.tick();assert.equal(w.s.pilots.filter(p=>!p.ai).length,32);assert.ok(!w.s.pilots.some(p=>p.id===old));assert.equal(w.cmd(32,{type:'choose',faction:1}).ok,true);
 w.ctx.presence[old].online=true;assert.equal(w.cmd(0,{type:'choose',faction:0}).ok,false);assert.equal(w.s.pilots.filter(p=>!p.ai).length,32);
});
test('explicit departure frees the ship while the socket is closing and does not resurrect on the next tick',()=>{
 const w=world(2);w.cmd(0,{type:'choose',faction:0});const id=w.s.pilots[0].id;assert.equal(w.cmd(0,{type:'leave'}).ok,true);w.tick(2);assert.ok(!w.s.pilots.some(p=>p.id===id));assert.ok(w.s.fx.some(f=>f.effect==='warp'&&f.out));w.cmd(0,{type:'resync'});assert.ok(w.s.pilots.some(p=>p.id===id));
});
test('destroyed pilots respawn through a bounded warp-in without resetting their upgrades',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0],seq=p.spawnSeq;p.upgrades.armor=2;w.sandbox.uDamage(w.s,p,10000,'hostile',{});w.tick(159);assert.equal(p.hp,0);w.tick(2);assert.ok(p.hp>0);assert.equal(p.spawnSeq,seq+1);assert.equal(p.upgrades.armor,2);assert.ok(w.s.time-p.warpAt<.1);assert.ok(w.s.fx.some(f=>f.effect==='warp'&&!f.out));
});
test('AI pilot names are unique natural names and old hull labels migrate',()=>{
 const w=world(0);assert.equal(new Set(w.s.pilots.map(p=>p.name)).size,5);assert.ok(w.s.pilots.every(p=>!/^AI |SKIFF|CORVETTE|FRIGATE|CRUISER|DREADNOUGHT/.test(p.name)));w.s.pilots[0].name='AI SKIFF';w.tick();assert.ok(!w.s.pilots[0].name.startsWith('AI '));
});
test('all five new weapons are purchasable and fire through the same solo and shared catalogs',()=>{
 for(const id of ['needle','helix','swarm','cluster','breach']){
  const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0];p.scrap=5000;p.tech=20;p.cleared=[0,1,2,3];assert.equal(w.cmd(0,{type:'fit',slot:0,item:id}).ok,true,id);w.s.bullets=[];w.sandbox.uFireMounts(w.s,p,.05,{fire:true});assert.ok(w.s.bullets.some(b=>b.weapon===id),id);assert.ok(p.energy<100);
  const s=createGame();s.scrap=5000;s.tech=20;s.cleared=[0,1,2,3];s.loadout[0]=id;s.ships=[s.player];s.rocks=[];s.nests=[];s.objectives=[];s.player.x=600;s.player.y=300;update(s,.02,{steering:true,thrust:0,aim:0,fire:true,boost:false,tractor:false});assert.ok(s.bullets.some(b=>b.weapon===id),'solo '+id);
 }
});
test('swarm seekers acquire an off-axis enemy without target selection and keep inherited drift',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0];p.x=p.y=p.a=0;p.vx=100;p.loadout[0]='swarm';w.s.rocks=[];w.s.enemies=[{id:'enemy',x:350,y:250,vx:0,vy:0,hp:500,max:500,faction:1,kind:0}];w.sandbox.uFireMounts(w.s,p,.05,{fire:true});w.sandbox.uProjectiles(w.s,.05);assert.ok(w.s.bullets.every(b=>b.target==='enemy'));assert.ok(w.s.bullets.some(b=>b.vy>0));assert.ok(w.s.bullets.every(b=>Math.abs(b.driftX-100)<.001));
});
test('cluster bombs split on expiry and contact with bounded fragments that can damage enemies',()=>{
 for(const hit of [false,true]){const w=world(1);w.cmd(0,{type:'choose',faction:0});w.s.rocks=[];w.s.enemies=hit?[{id:'target',x:10,y:0,hp:500,max:500,faction:1,kind:0}]:[];w.s.bullets=[{id:1,owner:w.s.pilots[0].id,x:0,y:0,vx:100,vy:0,t:hit?.7:.01,dmg:24,weapon:'cluster',faction:0,hits:[]}];w.sandbox.uProjectiles(w.s,.05);assert.equal(w.s.bullets.length,8);assert.ok(w.s.bullets.every(b=>b.weapon==='flak'&&b.owner===w.s.pilots[0].id));if(hit)assert.ok(w.s.enemies[0].hp<500);w.sandbox.uProjectiles(w.s,.6);assert.equal(w.s.bullets.length,0);}
});
test('breach torpedoes deal triple structural damage while needles pierce a second enemy',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const base=w.s.bases.find(b=>b.faction===1),enemy={id:'foe',x:0,y:0,hp:500,max:500,faction:1,kind:0};w.sandbox.uDamage(w.s,base,65,w.s.pilots[0].id,vm.runInContext("weapon('breach')",w.sandbox));w.sandbox.uDamage(w.s,enemy,65,w.s.pilots[0].id,vm.runInContext("weapon('breach')",w.sandbox));assert.equal(base.hp,1405);assert.equal(enemy.hp,435);
 w.s.rocks=[];w.s.enemies=[{...enemy,id:'a',x:50,y:0,hp:100},{...enemy,id:'b',x:120,y:0,hp:100}];w.s.bullets=[{id:1,x:0,y:0,vx:1250,vy:0,t:1,dmg:8,weapon:'needle',faction:0,pierce:1,hits:[]}];w.sandbox.uProjectiles(w.s,.12);assert.ok(w.s.enemies.every(e=>e.hp===92));assert.equal(w.s.bullets.length,0);
});

test('32 pilots using the expanded arsenal retain bounded combat and warp frames',()=>{
 const w=world(32);for(let i=0;i<32;i++){w.cmd(i,{type:'choose',faction:i%2});const p=w.s.pilots[i];p.x=(i%8)*120-450;p.y=Math.floor(i/8)*150;p.a=i%2?Math.PI:0;p.loadout[0]=['needle','helix','swarm','cluster','breach'][i%5];p.hp=p.max=100000;}w.s.rocks=[];w.s.spawn=1e9;
 for(let t=0;t<120;t++){const result=w.tick(1,w.s.pilots.map(p=>({from:p.id,data:{seq:t+1,steering:true,fire:true}})));assert.ok(w.s.bullets.length<=1536);for(const p of w.s.pilots)assert.ok(w.s.bullets.filter(b=>b.owner===p.id).length<=32);for(const m of result.broadcast)assert.ok(Buffer.byteLength(JSON.stringify(m.data))<16000);}
});

test('parked ships save their final progression once and stop rewriting offline account state',()=>{
 const w=world(2);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0],id=p.id;p.scrap=777;w.ctx.presence=Object.fromEntries(w.ctx.players.map(p=>[p.id,{online:true}]));w.ctx.presence[id].online=false;assert.equal(w.tick().playerStates[id].universe.scrap,777);let savedAgain=false;for(let i=0;i<100;i++){const out=w.tick();if(out.playerStates?.[id])savedAgain=true;}assert.equal(savedAgain,false,'an offline world must not overwrite progression or trust from a different session');
});

test('shared hull restrictions reject fitting and firing on the wrong hull and preserve valid licenses',()=>{
 for(const id of ['skirmisher','lancer','broadside','siege-lance'])for(let hull=0;hull<5;hull++){
  const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0];p.hull=hull;p.scrap=10000;p.tech=100;p.cleared=[0,1,2,3,4,5,6,7,8];p.owned.push(id);p.loadout=vm.runInContext('HULLS',w.sandbox)[hull].mounts.map(m=>m.type==='fixed'||m.type==='turret'?'cannon':m.type==='engine'?'drive':m.type==='reactor'?'reactor':null);const allowed=vm.runInContext(`weapon('${id}').hulls.includes(${hull})`,w.sandbox);assert.equal(w.cmd(0,{type:'fit',slot:0,item:id}).ok,allowed,id+' on '+hull);
  p.loadout=Array.from(p.loadout,()=>null);p.loadout[0]=id;p.energy=100;p.heat=0;p.mounts=[];w.s.fx=[];w.s.bullets=[];w.sandbox.uFireMounts(w.s,p,.05,{fire:true});assert.equal(w.s.fx.some(f=>f.weapon===id),allowed);if(!allowed)assert.equal(p.energy,100);
 }
});
test('shared utility miners fracture an asteroid, haul its real ore and award normal scrap and research',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0];p.scrap=1000;p.tech=10;assert.equal(w.cmd(0,{type:'fit',slot:1,item:'mining-bay'}).ok,true);p.x=p.y=0;p.total=90;w.s.rocks=[{x:150,y:0,r:12,hp:18,type:0,a:0,ore:24,seed:999}];w.s.beacons=[];w.s.spawn=1e9;const scrap=p.scrap,tech=p.tech;w.tick(500);assert.equal(w.s.rocks.length,0);assert.equal(w.s.loot.length,0);assert.equal(p.scrap-scrap,24);assert.equal(p.tech-tech,1);assert.equal(p.total,114);assert.equal(w.s.escorts.filter(e=>e.mining).length,2);assert.ok(w.s.escorts.every(e=>e.cargo===0));
});
test('shared mining lasers retain low offensive damage and their ships can be destroyed',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0];p.x=p.y=0;p.loadout[1]='mining-bay';w.s.rocks=[];const enemy={id:'enemy',x:100,y:0,hp:200,max:200,faction:1,kind:0};w.s.enemies=[enemy];for(let i=0;i<100;i++){w.s.time+=.05;w.sandbox.uMiningDrones(w.s,.05);}assert.ok(enemy.hp<200&&enemy.hp>=176);const d=w.s.escorts.find(e=>e.mining);w.sandbox.uDamage(w.s,d,40,'enemy',{});assert.equal(d.hp,0);w.sandbox.uMiningDrones(w.s,.05);assert.equal(w.s.escorts.filter(e=>e.mining).length,1);
});
test('mining drones do not consume escort hangar slots and are recalled on owner death or departure',()=>{
 const w=world(1);w.cmd(0,{type:'choose',faction:0});const p=w.s.pilots[0];p.scrap=2000;p.tech=10;w.cmd(0,{type:'fit',slot:1,item:'mining-bay'});w.tick();assert.equal(w.s.escorts.filter(e=>e.mining).length,2);assert.equal(w.cmd(0,{type:'upgrade',id:'escort'}).ok,true);assert.equal(w.cmd(0,{type:'upgrade',id:'escort'}).ok,true);assert.equal(w.cmd(0,{type:'upgrade',id:'escort'}).ok,false);assert.equal(w.s.escorts.filter(e=>!e.mining).length,2);p.hp=0;p.respawn=8;w.tick();assert.equal(w.s.escorts.filter(e=>e.mining).length,0);w.cmd(0,{type:'leave'});assert.equal(w.s.escorts.length,0);
});
test('32 capital miners plus full escort complements fit every transport frame',()=>{
 const w=world(32);for(let i=0;i<32;i++){w.cmd(i,{type:'choose',faction:i%2});const p=w.s.pilots[i];p.hull=4;p.x=(i%8)*120-450;p.y=Math.floor(i/8)*150;p.hp=p.max=100000;p.loadout=vm.runInContext('HULLS[4].mounts',w.sandbox).map(m=>m.type==='utility'?'survey-bay':m.type==='reactor'?'reactor':null);for(let j=0;j<5;j++)w.s.escorts.push({id:10000+i*5+j,owner:p.id,faction:p.faction,x:p.x,y:p.y+80,hp:100000,a:0,cd:100,slot:j});}
 w.s.rocks=Array.from({length:96},(_,i)=>({x:(i%12)*130-700,y:Math.floor(i/12)*120-400,r:24,hp:1000000,type:i%10,a:0,seed:i}));w.s.spawn=1e9;w.s.beacons=[];let peak=0;for(let i=0;i<20;i++){const out=w.tick();peak=Math.max(peak,w.s.escorts.filter(e=>e.mining).length);for(const m of out.broadcast)assert.ok(Buffer.byteLength(JSON.stringify(m.data))<16000);}assert.equal(peak,128);assert.equal(w.s.escorts.filter(e=>!e.mining).length,160);
});
