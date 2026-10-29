import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

async function client(file,platform){
 globalThis.__frontierTestPlatform=platform;
 let source=stripTypeScriptTypes(readFileSync(new URL('../src/'+file,import.meta.url),'utf8'))
  .replace("import * as platform from 'starhermit:platform';",'const platform=globalThis.__frontierTestPlatform;')
  .replace(/import \{\s*stopVoice\s*\} from '\.\/comms\.js';/,'const stopVoice=async()=>{};');
 for(const name of ['sim','universe-rules','prediction'])source=source.replaceAll(`'./${name}.js'`,JSON.stringify(new URL(`../src/${name}.js`,import.meta.url).href));
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')+'#'+Math.random());
}
function frozen(value){if(value&&typeof value==='object'){for(const v of Object.values(value))frozen(v);Object.freeze(value);}return value;}
function socket(){return {state:'open',events:{},sent:[],on(event,cb){this.events[event]=cb;},close(){this.state='closed';},sendCommand(data){this.sent.push(data);},sendInput(){}};}

test('online updates predict movement between packets and send sequence numbers at 20Hz',async()=>{
 const sock=socket(),sent=[];sock.sendInput=data=>sent.push(data);
 const mod=await client('online.ts',{player:()=>({userId:'me'}),launchContext:()=>({sessionId:'session'}),connectGame:()=>sock});mod.resumeLaunch();
 const world={kind:'universe',pilots:[['me','Pilot',0,0,0,0,0,0,176,176,0,0,0,false,100,120,0,0,0,0,1]],enemies:[],rocks:[],mines:[],bases:[],fx:[],beacons:[],core:{x:-2200,y:0},bullets:[],loot:[],time:0,message:'Shared frontier',progress:0,goal:10000,ended:false};
 sock.events.game(frozen({type:'snapshot',world}));
 const input={steering:true,thrust:1,turn:0,strafe:0,x:0,y:0,aim:0,fire:false,boost:false,tractor:false};
 mod.updateOnline(1/60,input);assert.ok(mod.online.view.player.x>0);assert.equal(sent.length,0);
 for(let i=1;i<60;i++)mod.updateOnline(1/60,input);
 assert.equal(sent.length,20);assert.ok(sent.every((p,i)=>p.seq===(i+1)*3));
 const position=mod.online.view.player.x;
 sock.events.game({type:'snapshot',world:{...world,time:-1}});assert.equal(mod.online.view.player.x,position);
});

test('shared discovery joins through filtered quick-join without reading a private room',async()=>{
 const sock=socket();let joined=false;
 const room={id:'world',metadata:{universe:true},name:'Righteous Republic / Common Universe',hostUserId:'host',gameSessionId:'session',participants:[{userId:'me'}],joinCode:'secret'};
 const platform={player:()=>({userId:'me'}),connectGame:()=>sock,rooms:{mine:async()=>null,browse:async()=>[{id:'world',name:room.name,freeSeats:99,joinInProgress:true}],get:async()=>{throw Error('Private roster must never be read before joining');},quickJoin:async options=>{assert.equal(options.metadata.universe,true);assert.equal(options.includeInProgress,true);joined=true;return room;},connect:()=>socket()}};
 const mod=await client('online.ts',platform);await mod.enterUniverse(1);
 assert.equal(joined,true);assert.equal(mod.online.sessionId,'session');sock.events.open();assert.deepEqual(sock.sent[0],{type:'choose',faction:1});
});

test('immutable snapshots decode compact pilots and never substitute another player for self',async()=>{
 const sock=socket();const mod=await client('online.ts',{player:()=>({userId:'me'}),launchContext:()=>({sessionId:'session'}),connectGame:()=>sock});mod.resumeLaunch();
 const world=frozen({kind:'universe',pilots:[['me','Pilot',1,2200,120,0,0,0,176,176,0,0,0,false,100,120,0,0,.6],['foe','Enemy',0,-2200,120,0,0,0,176,176,0,0,0,false,100,0,0,0,0]],enemies:[],rocks:[],mines:[],bases:[],fx:[],beacons:[],core:{x:2200,y:0},bullets:[],loot:[],time:1,message:'Shared frontier',progress:0,goal:10000,ended:false});
 assert.doesNotThrow(()=>sock.events.game(frozen({type:'snapshot',world})));
 assert.equal(mod.online.view.player.pilot,'me');assert.equal(mod.online.view.player.voiceLevel,.6);assert.equal(mod.online.view.ships[1].team,1);
 const player=mod.online.view.player;sock.events.game({type:'snapshot',world:{...world,pilots:[world.pilots[1]]}});assert.equal(mod.online.view.player,player);
 sock.events.game({type:'choose-faction'});assert.equal(sock.sent.at(-1).faction,1);
});

test('the final pilot exits without closing the common universe',async()=>{
 const sock=socket();let leaves=0;
 const room={id:'world',metadata:{universe:true},hostUserId:'me',gameSessionId:'session',participants:[{userId:'me'}]};
 const mod=await client('online.ts',{player:()=>({userId:'me'}),connectGame:()=>sock,rooms:{mine:async()=>room,connect:()=>socket(),get:async()=>room,leave:async()=>{leaves++;}}});
 await mod.enterUniverse(0);await mod.leave();
 assert.equal(leaves,0);assert.equal(sock.state,'closed');assert.equal(mod.online.active,false);assert.equal(mod.online.room,null);
});

test('proximity voice attenuates once, mutes hostile ships and restores user settings',async()=>{
 const participants=[{userId:'friend',volume:.8,locallyMuted:false,speaking:true},{userId:'enemy',volume:1.2,locallyMuted:false,speaking:true}];
 const state={connection:'connected',transmitting:true,inputLevel:.7,muted:false,serverMuted:false,participants};
 const pans={};const mod=await client('comms.ts',{player:()=>({userId:'me'}),sessions:{get:async()=>({chatConversationId:'voice'})},voice:{join:async()=>{},leave:async()=>{},setMode(){},setTransmitting(){},status:()=>state,setVolume(id,v){participants.find(p=>p.userId===id).volume=v;},setLocallyMuted(id,v){participants.find(p=>p.userId===id).locallyMuted=v;},setPan(id,v){pans[id]=v;}}});
 await mod.toggleVoice('session');const me={pilot:'me',x:0,y:0,faction:0,hp:100};const friend={pilot:'friend',x:610,y:0,faction:0,hp:100,voiceLevel:.5};const enemy={pilot:'enemy',x:50,y:0,faction:1,hp:100};const game={player:me,ships:[me,friend,enemy]};
 mod.updateVoice(.05,game);assert.equal(participants[0].volume,.2);assert.equal(participants[1].locallyMuted,true);assert.equal(mod.comms.bars.friend.at(-1),.5);assert.equal(mod.voiceLevel(),.7);
 mod.updateVoice(.05,game);assert.equal(participants[0].volume,.2);
 friend.x=120;mod.updateVoice(.05,game);assert.equal(participants[0].volume,.8);
 me.hp=0;mod.updateVoice(.05,game);assert.equal(participants[0].locallyMuted,true);
 await mod.stopVoice();assert.equal(participants[0].volume,.8);assert.equal(participants[0].locallyMuted,false);assert.equal(participants[1].volume,1.2);assert.equal(pans.friend,null);
});
