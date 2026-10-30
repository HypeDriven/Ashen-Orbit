import test from 'node:test';
import assert from 'node:assert/strict';
import {resetFlightAudit,validateFlightReport,movementAuthority} from '../src/flight-authority.js';
import {stepPilotMovement} from '../src/universe-rules.js';
import {FlightPrediction} from '../src/prediction.js';
const pilot=()=>({id:'me',pilot:true,x:0,y:0,a:0,vx:0,vy:0,hp:176,hull:0,role:0,loadout:['cannon',null,'drive','reactor'],upgrades:{gun:1},boost:100,spawnSeq:1,inputAck:0});
const input={steering:true,thrust:1,strafe:0,turn:0,boost:false,tractor:false,aim:0};
test('legitimate 60Hz flight with 20Hz reports and network jitter retains full authority',()=>{
 const p=pilot(),client=pilot();resetFlightAudit(p,0);let now=0,seq=0;
 for(let i=0;i<600;i++){
  const dt=[.04,.06,.05,.05,.07,.03][i%6];now+=dt*1000;
  const m={...input,aim:Math.sin(i/30)*2,boost:i%120<30};
  for(let j=0;j<3;j++)stepPilotMovement(client,dt/3,m,[],true);
  stepPilotMovement(p,dt,m,[],true);
  const r=validateFlightReport(p,{...client},++seq,now,m);
  assert.equal(r.accepted,true,`${i}: ${r.reason}`);
  assert.equal(p.untrusted,undefined);
 }
 assert.equal(movementAuthority(p),1);
});
test('teleports and nonfinite reports reduce authority and cannot teach larger boundaries',()=>{
 const p=pilot();resetFlightAudit(p,0);
 for(let i=1;i<=6;i++){const x=p.x;const r=validateFlightReport(p,{...p,x:3000},i,i*50,input);assert.equal(r.accepted,false);assert.equal(p.x,x);}
 assert.equal(p.untrusted,true);assert.ok(movementAuthority(p)<=.1);
 resetFlightAudit(p,400);assert.equal(p.untrusted,true);assert.ok(p.audit.score>=3);
 assert.equal(validateFlightReport(p,{...p,x:NaN},7,450,input).reason,'non-finite');
});
test('stale spawns, duplicate reports and lag resynchronize without cheating flags',()=>{
 const p=pilot();resetFlightAudit(p,0);
 assert.equal(validateFlightReport(p,{...p,spawnSeq:0},1,50,input).reason,'old-spawn');
 assert.equal(validateFlightReport(p,{...p},0,50,input).reason,'old-input');
 assert.equal(validateFlightReport(p,{...p,x:2000},1,1000,input).reason,'resync');assert.equal(p.violations,undefined);
});
test('trusted snapshots retain immediate local pose and rejected reports reconcile',()=>{
 const prediction=new FlightPrediction(),p={...pilot(),authority:1,correctionSeq:1},s={player:p,ships:[p],rocks:[]};prediction.receive(s,0,true);
 for(let i=0;i<6;i++)prediction.step(1/60,input,s);
 const local=prediction.report().x,next={...pilot(),authority:1,correctionSeq:1,inputAck:3},view={player:next,ships:[next],rocks:[]};prediction.receive(view,.05,true);assert.equal(prediction.report().x,local);
 const corrected={...pilot(),authority:0,correctionSeq:2,inputAck:6};prediction.receive({player:corrected,ships:[corrected],rocks:[]},.1,true);assert.equal(prediction.report().x,0);
});

test('arrival jitter consumes bounded server-time credit without false trust flags',()=>{
 const p=pilot(),c=pilot();resetFlightAudit(p,0);let now=0,lastDelivery=0,seq=0;
 for(let i=0;i<250;i++){
  stepPilotMovement(c,.05,input,[],true);const arrival=(i+1)*50+[90,130,100,160,100][i%5];
  if(arrival<=lastDelivery)continue;const dt=(arrival-now)/1000;now=arrival;lastDelivery=arrival;stepPilotMovement(p,dt,input,[],true);
  const r=validateFlightReport(p,{...c},++seq,now,input);assert.equal(r.accepted,true,`${i}: ${r.reason}`);
 }
 assert.equal(p.untrusted,undefined);
});

test('repeated impossible acceleration incidents restrict authority while their in-flight reports are debounced',()=>{
 const p=pilot();resetFlightAudit(p,0);
 for(let i=1;i<=3;i++)validateFlightReport(p,{...p,a:3},i,i*50,input);
 assert.equal(p.violations,1);assert.equal(p.untrusted,undefined);
 validateFlightReport(p,{...p,a:3},4,450,input);assert.equal(p.untrusted,undefined);
});

test('asteroid collision resolution cannot push a legitimate pilot outside world bounds',()=>{
 const p=pilot();p.x=3190;p.y=7195;stepPilotMovement(p,.05,input,[{x:3180,y:7180,r:50}],true);assert.ok(p.x<=3200);assert.ok(p.y<=7200);
});

test('32 predicted pilots retain authority through 200ms round trips and jitter',()=>{
 const peers=Array.from({length:32},()=>{const server=pilot(),prediction=new FlightPrediction(),view={player:{...server,authority:1,correctionSeq:0},ships:[],rocks:[]};view.ships=[view.player];resetFlightAudit(server,0);view.player.correctionSeq=server.correctionSeq;prediction.receive(view,0,true);return {server,prediction,view,up:[],down:[],last:input};});
 for(let frame=1;frame<=720;frame++)for(const peer of peers){
  const now=frame/60,m={...input,aim:Math.sin(frame/100),thrust:frame%180<140?1:0};const seq=peer.prediction.step(1/60,m,peer.view);
  if(frame%2===0)peer.up.push({at:frame+6+(frame%9===0?1:0),seq,m,report:peer.prediction.report()});
  while(peer.up[0]?.at<=frame){const packet=peer.up.shift();peer.last=packet.m;stepPilotMovement(peer.server,1/30,packet.m,[],true);validateFlightReport(peer.server,packet.report,packet.seq,now*1000,packet.m);peer.server.inputAck=packet.seq;}
  if(frame%2===0)peer.down.push({at:frame+6,time:now,p:{...peer.server,authority:movementAuthority(peer.server)}});
  while(peer.down[0]?.at<=frame){const packet=peer.down.shift(),p=packet.p;peer.view={player:p,ships:[p],rocks:[]};peer.prediction.receive(peer.view,packet.time,true);}
 }
 for(const peer of peers){assert.equal(peer.server.untrusted,undefined);assert.equal(movementAuthority(peer.server),1);assert.ok(peer.prediction.history.length<120);}
});
