import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {FlightPrediction} from '../src/prediction.js';
import {stepPilotMovement} from '../src/universe-rules.js';

const pilot=(extra={})=>({id:'me',pilot:'me',name:'Pilot',x:0,y:0,a:0,vx:0,vy:0,hp:176,hull:0,role:0,faction:0,cloaked:false,inputAck:0,spawnSeq:1,...extra});
const input=(extra={})=>({steering:true,turn:0,strafe:0,thrust:0,x:0,y:0,aim:null,fire:false,boost:false,tractor:false,...extra});
function scene(me,others=[]){return {player:me,ships:[me,...others],rocks:[]};}
const copy=value=>JSON.parse(JSON.stringify(value));

test('local thrust and steering respond in the next frame before any network reply',()=>{
 const p=new FlightPrediction(),authoritative=pilot(),s=scene(copy(authoritative));p.receive(s,0,true);
 const seq=p.step(1/60,input({thrust:1,aim:Math.PI/2}),s);
 assert.equal(seq,1);assert.ok(s.player.x>0);assert.ok(s.player.a>0);assert.equal(authoritative.x,0);assert.equal(authoritative.a,0);
});

test('reconciliation drops acknowledged inputs, replays the remainder, and preserves visual continuity',()=>{
 const p=new FlightPrediction(),s=scene(pilot());p.receive(s,0,true);const drive=input({thrust:1});
 for(let i=0;i<9;i++)p.step(1/60,drive,s);
 const displayed={x:s.player.x,a:s.player.a},authority=pilot({inputAck:3});stepPilotMovement(authority,.05,drive,[],true);
 const received=scene(authority);p.receive(received,.05,true);
 assert.equal(p.history.length,6);assert.ok(Math.abs(received.player.x-displayed.x)<1e-9);assert.ok(Math.abs(received.player.a-displayed.a)<1e-9);
 assert.ok(p.local.x>authority.x);assert.ok(p.local.x>0);
 p.step(1/60,drive,received);assert.ok(received.player.x>displayed.x);
});

test('shared physics produces the same movement as the authoritative server for every hull and role',()=>{
 const sandbox=vm.createContext({});vm.runInContext(readFileSync(new URL('../server.js',import.meta.url),'utf8'),sandbox);
 for(let hull=0;hull<5;hull++)for(let role=0;role<6;role++){
  const predicted=pilot({hull,role,x:120,y:70,a:3.12,vx:20,vy:-10,cloaked:role!==1}),actual=copy(predicted);
  const rocks=[{x:200,y:70,r:35}],m=input({thrust:1,strafe:.5,aim:-3.1,tractor:true,seq:17});
  stepPilotMovement(predicted,.05,m,rocks,true);
  sandbox.testPilot=actual;sandbox.testInput=m;sandbox.testRocks=rocks;
  vm.runInContext('stepPilotMovement(testPilot,.05,testInput,testRocks,true)',sandbox);
  for(const key of ['x','y','a','vx','vy'])assert.equal(predicted[key],actual[key]);
 }
});

test('remote ships interpolate between snapshots and turn across the angle wrap without spinning',()=>{
 const p=new FlightPrediction();let s=scene(pilot(),[pilot({id:'other',pilot:'other',x:0,vx:100,a:3.1})]);p.receive(s,0,true);
 for(let i=0;i<6;i++)p.step(1/60,input(),s);
 s=scene(pilot(),[pilot({id:'other',pilot:'other',x:10,vx:100,a:-3.1})]);p.receive(s,.1,true);
 const positions=[];for(let i=0;i<6;i++){p.step(1/60,input(),s);positions.push(s.ships[1].x);}
 assert.ok(positions.some(x=>x>0&&x<10));assert.ok(positions.every((x,i)=>i===0||x>=positions[i-1]));
 assert.ok(Math.abs(s.ships[1].a)>3,'Turn follows the short arc across +/-pi');
});

test('packet loss bounds speculation and remote extrapolation; hidden ships are removed immediately',()=>{
 const p=new FlightPrediction();let s=scene(pilot(),[pilot({id:'other',pilot:'other',x:100,vx:100})]);p.receive(s,0,true);
 for(let i=0;i<300;i++)p.step(1/60,input({thrust:1}),s);
 assert.ok(p.history.length<=31);assert.ok(s.player.x<100);assert.ok(s.ships[1].x<=115.001);
 const x=s.player.x;p.step(1/60,input({thrust:1}),s);assert.equal(s.player.x,x);
 s=scene(pilot());p.receive(s,5,true);assert.equal(p.remote.size,0);assert.equal(s.ships.length,1);
});

test('respawns, refits and teleports reset prediction instead of replaying old thrust',()=>{
 const p=new FlightPrediction();let s=scene(pilot());p.receive(s,0,true);for(let i=0;i<6;i++)p.step(1/60,input({thrust:1}),s);
 s=scene(pilot({x:2200,y:120,spawnSeq:2,inputAck:2}));p.receive(s,.1,true);assert.equal(s.player.x,2200);assert.equal(p.history.length,0);assert.equal(p.error.x,0);
 s=scene(pilot({x:2200,y:120,hp:0,spawnSeq:2,inputAck:2}));p.receive(s,.2,true);p.step(1/60,input({thrust:1}),s);assert.equal(s.player.x,2200);
 p.reset();s=scene(pilot({inputAck:500}));p.receive(s,20,true);assert.equal(p.step(1/60,input(),s),501);
});

test('160ms round trips with jitter move every frame and settle onto authoritative state',()=>{
 const p=new FlightPrediction(),server=pilot();let s=scene(copy(server)),held=input(),queue=[],maxCorrectionJump=0,moving=0;
 p.receive(s,0,true);
 for(let frame=1;frame<=600;frame++){
  const now=frame/60;
  queue.sort((a,b)=>a.at-b.at);
  while(queue.length&&queue[0].at<=now){const event=queue.shift();if(event.kind==='input')held=event.value;else if(event.time>=p.latestTime){const before=s.player.x;s=scene(event.value);p.receive(s,event.time,true);maxCorrectionJump=Math.max(maxCorrectionJump,Math.abs(s.player.x-before));}}
  const controls=input({thrust:now<3?1:0});const before=s.player.x,seq=p.step(1/60,controls,s);
  if(frame>10&&frame<170&&s.player.x>before)moving++;
  if(frame%3===0)queue.push({kind:'input',at:now+.08,value:{...controls,seq}});
  if(frame%3===0){stepPilotMovement(server,.05,held,[],true);server.inputAck=held.seq||0;}
  if(frame%6===0)queue.push({kind:'snapshot',at:now+.08+(frame%18===0?.035:0),time:now,value:copy(server)});
 }
 assert.ok(moving>150,'Held thrust must not wait for server snapshot frames');
 assert.ok(maxCorrectionJump<1e-6,'Ordinary corrections preserve the displayed position');
 assert.ok(Math.abs(s.player.x-server.x)<1,'The prediction converges after the ship stops');
});

test('the server acknowledges only applied input and ignores older sequence numbers',()=>{
 const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../server.js',import.meta.url),'utf8'),context);
 const ctx={players:[{id:'me',name:'Pilot'}],now:1000,room:{metadata:{universe:true}},playerStates:{}};
 ctx.sessionState=context.game.createSession(ctx).sessionState;
 context.game.onPlayerMessage({...ctx,message:{from:'me',data:{type:'choose',faction:0}}});
 const p=ctx.sessionState.pilots[0];ctx.now+=50;
 context.game.onTick({...ctx,inputs:[{from:'me',data:input({seq:20,thrust:1})}]});assert.equal(p.inputAck,20);
 ctx.now+=50;context.game.onTick({...ctx,inputs:[{from:'me',data:input({seq:19,thrust:-1})}]});assert.equal(p.inputAck,20);assert.equal(p.input.thrust,1);
 const view=context.game.onPlayerMessage({...ctx,message:{from:'me',data:{type:'resync'}}}).broadcast[0].data.world;
 assert.equal(view.pilots[0][19],20);assert.equal(view.pilots[0][20],1);
});

test('reloading after an idle timeout preserves the sequence floor and accepts thrust immediately',()=>{
 const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../server.js',import.meta.url),'utf8'),context);
 const ctx={players:[{id:'me',name:'Pilot'}],now:1000,room:{metadata:{universe:true}},playerStates:{}};
 ctx.sessionState=context.game.createSession(ctx).sessionState;
 context.game.onPlayerMessage({...ctx,message:{from:'me',data:{type:'choose',faction:0}}});
 const server=ctx.sessionState.pilots[0];ctx.now+=50;
 context.game.onTick({...ctx,inputs:[{from:'me',data:input({seq:90000})}]});
 for(let i=0;i<24;i++){ctx.now+=50;context.game.onTick({...ctx,inputs:[]});}
 assert.equal(server.inputAck,90000,'Idle must stop thrust without resetting the acknowledged sequence');
 const view=context.game.onPlayerMessage({...ctx,message:{from:'me',data:{type:'resync'}}}).broadcast[0].data.world;
 const predictor=new FlightPrediction(),s=scene(pilot({x:server.x,y:server.y,a:server.a,inputAck:view.pilots[0][19]}));
 predictor.receive(s,view.time,true);const seq=predictor.step(1/60,input({thrust:1}),s);
 assert.equal(seq,90001);ctx.now+=50;
 context.game.onTick({...ctx,inputs:[{from:'me',data:input({seq,thrust:1})}]});
 assert.equal(server.input.thrust,1);assert.equal(server.inputAck,seq);assert.ok(server.vy<0,'The first new input must move the authoritative ship');
});

test('idle timeout repairs sequence counters in a universe already affected by the bug',()=>{
 const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../server.js',import.meta.url),'utf8'),context);
 const ctx={players:[{id:'me',name:'Pilot'}],now:1000,room:{metadata:{universe:true}},playerStates:{}};
 ctx.sessionState=context.game.createSession(ctx).sessionState;
 context.game.onPlayerMessage({...ctx,message:{from:'me',data:{type:'choose',faction:0}}});
 const p=ctx.sessionState.pilots[0];p.input={...input({seq:50000})};p.inputAck=0;
 ctx.now+=1500;context.game.onTick({...ctx,inputs:[]});
 assert.equal(p.inputAck,50000);
 // A legacy/neutral packet must not allow a delayed sequenced input to rewind controls.
 ctx.now+=50;context.game.onTick({...ctx,inputs:[{from:'me',data:input()}]});
 ctx.now+=50;context.game.onTick({...ctx,inputs:[{from:'me',data:input({seq:40000,thrust:-1})}]});
 assert.equal(p.inputAck,50000);assert.equal(p.input.thrust,0);
});
