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
 const w=world();w.cmd(0,{type:'choose',faction:1});const p=w.s.pilots[0];p.scrap=2000;
 assert.equal(w.cmd(0,{type:'role',role:1}).ok,true);assert.equal(p.max,330);assert.equal(p.shield,140);
 assert.equal(w.cmd(0,{type:'hull'}).ok,true);assert.equal(p.hull,1);assert.equal(p.max,585);
 const id=p.id,saved=w.cmd(0,{type:'leave'}).playerStates;
 w.ctx.players.shift();w.tick();assert.equal(w.s.parked[id].faction,1);
 const restored=world(1,saved);assert.equal(restored.s.pilots[0].faction,1);assert.equal(restored.s.pilots[0].hull,1);assert.equal(restored.s.pilots[0].role,1);
 assert.equal(restored.cmd(0,{type:'resync'}).broadcast[0].data.world.kind,'universe');
});

test('cloaks drain energy, hide hostile pilots, and break on fire or damage',()=>{
 const w=world();w.cmd(0,{type:'choose',faction:0});w.cmd(1,{type:'choose',faction:1});w.tick(65);
 const p=w.s.pilots[1];p.x=1500;p.y=500;assert.equal(w.cmd(1,{type:'cloak'}).ok,true);
 let view=w.cmd(0,{type:'resync'}).broadcast[0].data.world;
 assert.equal(view.pilots.some(pilot=>pilot[0]===p.id),false);
 w.tick(10);assert.ok(p.energy<100);assert.equal(p.cloaked,true);
 w.s.pilots[0].x=p.x+100;w.s.pilots[0].y=p.y;
 view=w.cmd(0,{type:'resync'}).broadcast[0].data.world;assert.equal(view.pilots.some(pilot=>pilot[0]===p.id),true);
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
  const r=w.cmd(faction,{type:'resync'}),view=r.broadcast[0].data.world;
  assert.equal(view.rocks.length,96);assert.equal(view.pilots.length,32);
  assert.ok(Buffer.byteLength(JSON.stringify(w.tick()))<65536,'Tick result must fit the platform result budget');
  assert.ok(Buffer.byteLength(JSON.stringify(r.broadcast[0].data))<16000);
 }
 w.s.tick=99;assert.ok(Buffer.byteLength(JSON.stringify(w.tick()))<65536,'Periodic saves must also fit the result budget');
 w.ctx.players.push({id:'overflow',ai:false});assert.equal(w.game.onMembershipChange(w.ctx).ok,false);
});

test('solo roles apply tradeoffs and laid mines retain their original damage',()=>{
 const s=createGame();s.player.x=s.player.y=0;s.scrap=2000;const interceptor=stats(s);
 assert.equal(chooseRole(s,1),true);const guardian=stats(s);assert.ok(guardian.hp>interceptor.hp);assert.ok(guardian.speed<interceptor.speed);
 chooseRole(s,3);assert.equal(layMine(s),true);assert.equal(s.mines[0].dmg,140);chooseRole(s,0);assert.equal(s.mines[0].dmg,140);
 update(s,1/60,{x:0,y:0,thrust:0,strafe:0,turn:0,fire:false,boost:false,aim:0});assert.ok(Number.isFinite(s.player.hp));
});
