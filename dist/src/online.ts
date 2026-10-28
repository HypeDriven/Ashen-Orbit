import * as platform from 'starhermit:platform';
import type {Room,RoomSocket,GameSocket,LeaderboardEntry} from 'starhermit:platform';
import {createGame,makeShip} from './sim.js';
import type {Game} from './sim.js';
export const online={status:'Sign in through StarHermit to play online.',busy:false,room:null as Room|null,code:'',mission:'salvage',entries:[] as LeaderboardEntry[],boardReady:false,resetAt:0,active:false,ended:false,view:createGame() as Game,summary:'',partner:'',sessionId:'',isHost:false};
const visualSeen=new Set<number>();
let roomSocket:RoomSocket|null=null,socket:GameSocket|null=null,poll=0,sendClock=0;
let snapshotListener:((s:Game)=>void)|null=null;
export function onSnapshot(cb:(s:Game)=>void){snapshotListener=cb;}
function failure(e:unknown){online.busy=false;online.status=e instanceof Error?e.message:'StarHermit service is unavailable.';}
export function signIn(){platform.requestSignIn().then(()=>refresh()).catch(failure);}
export async function refresh(){
 if(!platform.player()){online.status='Sign in with F1 > Account, or use SIGN IN.';return;}
 try{const boards=await platform.leaderboards.list(),board=boards.find(b=>b.key==='daily-scrap');online.boardReady=!!board;if(board){online.resetAt=board.nextResetAt||0;online.entries=(await platform.leaderboards.entries(board.id,{pageSize:10})).items;}
 online.status=board?'Daily board resets at 00:00 UTC. Best server-validated run wins.':'Daily board not provisioned yet. Publisher setup is required.';
 if(!online.room&&!online.active){const r=await platform.rooms.mine();if(r)attachRoom(r);}
 }catch(e){failure(e);}
}
function snapshot(data:unknown){const packet=data as {type?:string;world?:any};if(packet.type!=='snapshot'||!packet.world)return;const w=packet.world,me=w.pilots.find((p:any)=>p.id===platform.player()?.userId)||w.pilots[0];if(!me)return;
 const s=online.view;s.ships=w.pilots.map((p:any)=>({...makeShip(p.x,p.y),id:p.id,pilot:p.id,name:p.name,hp:p.hp,max:p.max,a:p.a,vx:p.vx,vy:p.vy,revive:p.revive})).concat(w.enemies.map((e:any)=>({...makeShip(e.x,e.y,1,e.kind),...e})));
 s.player=s.ships.find(e=>e.pilot===me.id)||s.ships[0];s.rocks=[];s.nests=[];for(const f of w.fx||[]){if(!visualSeen.has(f.seed)){visualSeen.add(f.seed);s.fx.push({...f});}}if(visualSeen.size>512){const newest=[...visualSeen].slice(-256);visualSeen.clear();for(const id of newest)visualSeen.add(id);}if(s.fx.length>144)s.fx.splice(0,s.fx.length-144);s.objectives=[{id:'core',name:w.mission==='convoy'?'FREIGHTER / PROTECT':'MISSION CORE / PROTECT',...w.core,progress:0,total:1,reward:0,tech:0,done:false,failed:false,active:true}];if(w.mission==='relay')s.objectives.push(...w.beacons.map((b:any,i:number)=>({id:'relay',name:'RELAY '+(i+1),x:b.x,y:b.y,progress:w.progress,total:12,reward:0,tech:0,done:false,failed:false,active:true})));
 s.baseDefense=w.baseDefense||null;s.bullets=w.bullets;s.loot=w.loot;s.time=w.time;s.scrap=me.scrap;s.wing=1;s.energy=100;s.boost=100;s.tractorOn=me.input?.tractor||false;s.message=w.message;s.messageTime=10;s.dead=false;s.won=false;online.summary=w.mission.toUpperCase()+' / '+Math.floor(w.progress)+' / '+w.goal;online.partner=w.pilots.filter((p:any)=>p.id!==me.id).map((p:any)=>p.name+' '+Math.max(0,Math.ceil(p.hp))+' HP').join('');online.active=true;online.ended=w.ended;online.status=w.ended?(w.won?'MISSION COMPLETE':'MISSION LOST')+' / '+me.scrap+' SCRAP':w.message;snapshotListener?.(s);
}
function attachSession(id:string){if(online.sessionId===id&&socket)return;socket?.close();visualSeen.clear();online.view.fx=[];online.sessionId=id;socket=platform.connectGame(id);socket.on('open',()=>{online.status='Connected. Waiting for authoritative state.';socket?.sendCommand({type:'resync'});});socket.on('game',snapshot);socket.on('error',m=>{online.status=m;});socket.on('disconnected',()=>{online.status='Reconnecting to mission...';});socket.on('resumed',()=>socket?.sendCommand({type:'resync'}));socket.on('stopped',reason=>{online.status='Session '+reason;online.ended=true;});socket.on('abandoned',reason=>{online.status=reason;online.ended=true;});}
function attachRoom(r:Room){online.room=r;online.isHost=r.hostUserId===platform.player()?.userId;online.code=r.joinCode||'';roomSocket?.close();roomSocket=platform.rooms.connect(r.id);roomSocket.on('roster',changed=>{online.room=changed;online.isHost=changed.hostUserId===platform.player()?.userId;if(changed.gameSessionId)attachSession(changed.gameSessionId);});roomSocket.on('stopped',reason=>{online.status='Room '+reason;});if(r.gameSessionId)attachSession(r.gameSessionId);else online.status='Share the room code. Host starts when both pilots are here.';}
export async function host(){if(online.busy)return;online.busy=true;try{const r=await platform.rooms.create({teamCount:1,seatsPerTeam:2,name:'Ashen Orbit / '+online.mission,isVisible:true,joinInProgress:false,aiPlayers:0,metadata:{mission:online.mission}});attachRoom(await platform.rooms.open(r.id));online.busy=false;}catch(e){failure(e);}}
export async function join(){if(online.busy)return;online.busy=true;try{let r=online.code.trim()?await platform.rooms.joinByCode(online.code.trim()):await platform.rooms.quickJoin({teamCount:1,seatsPerTeam:2,metadata:{mission:online.mission},includeInProgress:false});if(r)attachRoom(r);else online.status='No open room for this mission. Host a room or enter its code.';online.busy=false;}catch(e){failure(e);}}
export async function start(){if(!online.room||online.busy)return;if(online.room.participants.filter(p=>!p.isAi).length!==2){online.status='Two human pilots must join before launch.';return;}online.busy=true;try{const r=await platform.rooms.start(online.room.id);online.room=r;if(r.gameSessionId)attachSession(r.gameSessionId);online.busy=false;}catch(e){failure(e);}}
export async function daily(){if(online.busy)return;online.busy=true;try{attachSession(await platform.sessions.practice());online.busy=false;}catch(e){failure(e);}}
export async function leave(){try{socket?.sendCommand({type:'leave'});socket?.close();socket=null;roomSocket?.close();roomSocket=null;if(online.room)await platform.rooms.leave(online.room.id);else if(online.sessionId)await platform.sessions.leave(online.sessionId);}catch(e){failure(e);}online.room=null;online.active=false;online.ended=false;online.sessionId='';}
export function updateOnline(dt:number,input:{steering?:boolean;turn?:number;strafe?:number;thrust?:number;brake?:boolean;x:number;y:number;fire:boolean;boost:boolean;aim:number|null;tractor:boolean}){
 if(online.active&&!online.ended){sendClock+=dt;if(sendClock>=.05){sendClock=0;socket?.sendInput(input);}}
 poll+=dt;if(poll>2){poll=0;if(online.room&&!online.active)platform.rooms.get(online.room.id).then(r=>{if(r){online.room=r;online.isHost=r.hostUserId===platform.player()?.userId;if(r.gameSessionId)attachSession(r.gameSessionId);}}).catch(failure);}
}
export function resumeLaunch(){const id=platform.launchContext()?.sessionId;if(id)attachSession(id);}
