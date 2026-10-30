// Shared frontier: bounded client movement, authoritative combat and progression.
var universeLegacy=globalThis.game;
function uRound(n){return Math.round(n*10)/10;}
function uRole(p){return ROLES[p.role]||ROLES[0];}
function uStats(p){var st=shipStats(p),motion=pilotMotionStats(p);return {hp:st.hp,shield:st.shield,speed:motion.speed,turn:motion.turn,radius:motion.radius};}
function uBase(f){return {x:FACTIONS[f].baseX,y:0};}
function uFriendlyBase(s,p){var candidates=s.bases.filter(function(b){return b.faction===p.faction&&b.hp>0;});return candidates.sort(function(a,b){return distance(p,a)-distance(p,b);})[0]||null;}
function uAtBase(s,p){var base=uFriendlyBase(s,p);return base&&distance(p,base)<280?base:null;}
function uProfile(p){return {hull:p.hull,role:p.role,tech:p.tech,upgrades:p.upgrades,loadout:p.loadout,owned:p.owned,cleared:p.cleared,stance:p.stance||0,trust:{policy:4,untrusted:!!p.untrusted,violations:p.violations||0,authority:movementAuthority(p),reason:p.lastFlightReason||''}};}
function uProfilePacket(p){return {to:[p.id],data:{type:'profile',profile:uProfile(p)}};}
function uSaved(p,s){return Object.assign(uProfile(p),{world:s.worldId,scrap:p.scrap,faction:p.faction,total:p.total,day:s.day,dayScrap:p.dayScrap});}
function uSave(s,ctx){var docs={};s.pilots.filter(function(p){return !p.ai;}).forEach(function(p){docs[p.id]=Object.assign({},ctx.playerStates&&ctx.playerStates[p.id]||{},{universe:uSaved(p,s),flightTrust:{policy:4,untrusted:!!p.untrusted,violations:p.violations||0}});});return docs;}
function uRecord(s,p){s.records[p.id]=[p.id,p.name,p.faction,p.kills||0,p.deaths||0,p.baseKills||0,Math.round(p.damage||0),p.total||0,p.shots||0,!!p.untrusted];}
function uAdd(s,ctx,person){
 var parked=s.parked[person.id],stored=ctx.playerStates&&ctx.playerStates[person.id]||{},saved=parked||stored.universe||{},same=saved.world===s.worldId,trust=stored.flightTrust||saved.trust||{};
 var currentTrust=trust.policy===4||saved.trust&&saved.trust.policy===4;
 var p={id:person.id,pilot:true,flightPolicy:4,name:(person.displayName||person.name||'Pilot').slice(0,20),faction:saved.faction===1?1:saved.faction===0?0:-1,x:0,y:0,vx:0,vy:0,a:-Math.PI/2,hp:0,max:176,energy:100,boost:100,heat:0,overheated:false,cloaked:false,lock:0,mineCd:0,respawn:0,input:clean({}),inputAck:0,lastInput:ctx.now,choiceAt:-100,spawnSeq:0,hull:same?clamp(saved.hull,0,4)|0:0,role:same?clamp(saved.role,0,5)|0:0,scrap:same?clamp(saved.scrap,0,1000000):120,tech:same?clamp(saved.tech,0,10000):0,upgrades:same&&saved.upgrades||{gun:1,armor:0},loadout:same&&saved.loadout||defaultLoadout(),owned:same&&saved.owned||['cannon','drive','reactor','barrier'],cleared:same&&saved.cleared||[],total:same?saved.total||0:0,dayScrap:saved.day===s.day?saved.dayScrap||0:0,sector:4,untrusted:!!(currentTrust&&(trust.untrusted||saved.trust&&saved.trust.untrusted)),violations:currentTrust?Math.max(trust.violations||0,saved.trust&&saved.trust.violations||0):0,kills:0,deaths:0,baseKills:0,damage:0,shots:0,profileDirty:true};
 p.loadout=HULLS[p.hull].mounts.map(function(m,i){return compatible(m,p.loadout[i])?p.loadout[i]||null:null;});
 if(s.records[p.id]){var row=s.records[p.id];p.kills=row[3];p.deaths=row[4];p.baseKills=row[5];p.damage=row[6];p.total=row[7];p.shots=row[8];}
 s.pilots.push(p);delete s.parked[p.id];if(p.faction>=0)uSpawn(s,p);
}
function uMigrate(s,ctx){
 s.pilots.forEach(function(p){if(p.flightPolicy!==4){p.flightPolicy=4;p.untrusted=false;p.violations=0;p.lastFlightReason='';if(p.audit)p.audit.score=0;p.profileDirty=true;}});
 if(s.version===2)return;
 s.worldId=s.worldId||ctx.sessionId||'local';s.escorts=s.escorts||[];s.records=s.records||{};s.parked=s.parked||{};
 var old=s.bases||[];s.bases=[];s.beacons=[];
 for(var sec=0;sec<9;sec++){for(var f=0;f<2;f++){var previous=sec===4?old.find(function(b){return b.faction===f;}):null;s.bases.push({id:'base-'+f+'-'+sec,base:true,x:FACTIONS[f].baseX,y:sectorY(sec),hp:previous?Math.min(1600,previous.hp):1600,max:1600,faction:f,sector:sec,cd:0,a:0});}s.beacons.push({x:0,y:sectorY(sec),sector:sec,owner:-1,charge:0});}
 s.pilots.forEach(function(p){p.pilot=true;p.tech=p.tech||0;p.upgrades=p.upgrades||{gun:1,armor:0};p.owned=p.owned||['cannon','drive','reactor','barrier'];p.cleared=p.cleared||[];p.loadout=p.loadout||HULLS[p.hull||0].mounts.map(function(m,i){return compatible(m,defaultLoadout()[i])?defaultLoadout()[i]||null:null;});p.boost=100;p.heat=0;p.sector=sectorAt(p.y);p.profileDirty=true;p.max=uStats(p).hp;p.hp=Math.min(p.hp,p.max);p.maxShield=uStats(p).shield;resetFlightAudit(p,ctx.now);});s.version=2;
}
function uReconcile(s,ctx){
 uMigrate(s,ctx);s.parked=s.parked||{};s.records=s.records||{};var humans=ctx.players.filter(function(p){return !p.ai;}),ids=humans.map(function(p){return p.id;});
 s.pilots=s.pilots.filter(function(p){if(p.ai||ids.indexOf(p.id)>=0)return true;uRecord(s,p);s.parked[p.id]=uSaved(p,s);return false;});
 while(Object.keys(s.parked).length>8)delete s.parked[Object.keys(s.parked)[0]];
 while(Object.keys(s.records).length>64)delete s.records[Object.keys(s.records)[0]];
 humans.forEach(function(person){if(!s.pilots.some(function(p){return p.id===person.id;}))uAdd(s,ctx,person);});s.pilots.forEach(function(p){p.online=p.ai||!ctx.presence||!!(ctx.presence[p.id]&&ctx.presence[p.id].online);});uBotPopulation(s,ctx);
}
function uSpawn(s,p){
 var base=uFriendlyBase(s,p);if(!base){p.hp=0;p.respawn=0;return false;}
 var st=uStats(p);p.x=base.x;p.y=base.y+120;p.sector=base.sector;p.vx=p.vy=p.av=0;p.pendingInputs=[];p.latestMotion=null;p.hp=p.max=st.hp;p.shield=p.maxShield=st.shield;p.energy=p.boost=100;p.heat=0;p.overheated=false;p.cloaked=false;p.respawn=0;p.lock=3;p.spawnSeq=(p.spawnSeq||0)+1;p.mounts=[];resetFlightAudit(p,s.now);return true;
}
function uCreate(ctx){
 if(ctx.players.filter(function(p){return !p.ai;}).length>WORLD_CAPACITY)return {ok:false,error:'Universe capacity reached.'};
 var s={kind:'universe',version:2,worldId:ctx.sessionId||'local',now:ctx.now,time:0,tick:0,day:Math.floor(ctx.now/86400000),pilots:[],parked:{},records:{},rocks:[],bullets:[],mines:[],loot:[],enemies:[],escorts:[],fx:[],next:1,spawn:6,control:[0,0],bases:[],beacons:[],ended:false,winner:-1};
 for(var sector=0;sector<WORLD_SECTORS;sector++){
  for(var faction=0;faction<2;faction++)s.bases.push({id:'base-'+faction+'-'+sector,base:true,x:FACTIONS[faction].baseX,y:sectorY(sector),hp:1600,max:1600,faction:faction,sector:sector,cd:0,a:0});
  s.beacons.push({x:0,y:sectorY(sector),sector:sector,owner:-1,charge:0});
  for(var j=0;j<4;j++){var index=sector*4+j,a=index*2.39996,r=500+j*240;s.rocks.push({x:uRound(Math.cos(a)*r),y:uRound(sectorY(sector)+Math.sin(a)*500),r:30+j*8,hp:42,type:index%10,a:index,seed:index+934,ore:36});}
 }
 uReconcile(s,ctx);return {ok:true,sessionState:s};
}
function uLeaderboard(s){
 var rows={};Object.keys(s.records).forEach(function(id){rows[id]=s.records[id];});s.pilots.forEach(function(p){rows[p.id]=[p.id,p.name,p.faction,p.kills||0,p.deaths||0,p.baseKills||0,Math.round(p.damage||0),p.total||0,p.shots||0,!!p.untrusted];});
 var score=function(r){return r[5]*1000+r[3]*100+Math.floor(r[6]/10)+r[7];};
 return [0,1].map(function(f){return Object.keys(rows).map(function(id){return rows[id];}).filter(function(r){return r[2]===f;}).sort(function(a,b){return score(b)-score(a)||a[4]-b[4]||a[0].localeCompare(b[0]);}).slice(0,64).map(function(r){return {id:r[0],name:r[1],kills:r[3],deaths:r[4],bases:r[5],damage:r[6],salvage:r[7],shots:r[8],untrusted:r[9],score:score(r)};});});
}
function uFinish(s){
 if(s.ended)return;var live=[0,1].map(function(f){return s.bases.some(function(b){return b.faction===f&&b.hp>0;});});
 if(live[0]&&live[1])return;
 s.ended=true;s.winner=live[0]?0:live[1]?1:-1;s.results={winner:s.winner,duration:Math.round(s.time),teams:uLeaderboard(s),bases:s.bases.map(function(b){return {faction:b.faction,sector:b.sector,destroyed:b.hp<=0};})};
}
function uMotionIntent(e){var row=encodeFlightEvent(e);row[0]=Math.round(row[0]*1000)/1000;row[1]=0;for(var i=3;i<=8;i++)if(Number.isFinite(row[i]))row[i]=Math.round(row[i]*1000)/1000;row[9]=0;return row.slice(0,12);}
function uPilotRows(s,f,sector){var nearby=function(e){return sector===undefined||Math.abs(e.y-sectorY(sector))<2400;};
 var allies=s.pilots.filter(function(p){return p.faction===f&&p.hp>0;}),shown=s.pilots.filter(function(p){return p.faction>=0&&nearby(p)&&(!p.cloaked||p.faction===f||allies.some(function(a){return visibleShip(a,p);}));});
 var pilots=shown.map(function(p){var st=pilotMotionStats(p);return [p.id,p.name,p.faction,uRound(p.x),uRound(p.y),uRound(p.vx),uRound(p.vy),Math.round(p.a*1000)/1000,Math.ceil(p.hp),p.max,Math.round(p.shield||0),p.hull,p.role,p.cloaked,Math.round(p.energy),p.faction===f?p.scrap:0,uRound(p.respawn),s.mines.filter(function(m){return m.owner===p.id;}).length,p.hp>0&&s.now-p.lastInput<800?p.input.voiceLevel||0:0,p.inputAck||0,p.spawnSeq||0,movementAuthority(p),p.correctionSeq||0,p.sector,Math.round(p.boost),Math.round(p.heat),Math.round((p.av||0)*1000)/1000,!!p.thrusting,uMotionIntent({at:p.inputAt||s.time,seq:p.input.seq||0,controls:p.input}),(p.pendingInputs||[]).concat(p.botPlanned?[{at:p.botPlanned.at,seq:0,controls:p.botPlanned.controls}]:[]).slice(0,3).map(uMotionIntent),[uRound(st.speed),Math.round(st.turn*1000)/1000]];});
 return pilots;
}
function uView(s,f,sector){
 var nearby=function(e){return sector===undefined||Math.abs(e.y-sectorY(sector))<2400+(e.r||0);};
 var allies=s.pilots.filter(function(p){return p.faction===f&&p.hp>0;}),pilots=uPilotRows(s,f,sector);
 var view={kind:'universe',worldId:s.worldId,mission:'universe',time:Math.round(s.time*1000)/1000,tick:s.tick,pilots:pilots,enemies:s.enemies.concat(s.escorts).filter(nearby).map(function(e){return [e.id,uRound(e.x),uRound(e.y),uRound(e.vx||0),uRound(e.vy||0),Math.round(e.a*1000)/1000,Math.ceil(e.hp),e.max||150,e.faction,e.kind||0,e.owner?s.pilots.findIndex(function(p){return p.id===e.owner;}):-1];}),pilotIds:s.pilots.map(function(p){return p.id;}),rocks:s.rocks.filter(nearby).map(function(r){return [uRound(r.x),uRound(r.y),uRound(r.r),Math.ceil(r.hp),r.type,Math.round(r.a*1000)/1000,uRound(r.vx||0),uRound(r.vy||0),Math.round((r.spin||0)*1000)/1000];}),bullets:[],shots:packShots(s.bullets.filter(function(b){return nearby(b)&&Math.abs(b.x)<3500&&Math.abs(b.y)<7500;}).map(function(b){return [b.id,uRound(b.x),uRound(b.y),uRound(b.vx),uRound(b.vy),uRound(b.t),b.faction,uRound(b.dmg),WEAPONS.findIndex(function(w){return w.id===b.weapon;})];})),loot:s.loot.filter(nearby),mines:s.mines.filter(function(m){return m.faction===f||allies.some(function(a){return distance(a,m)<240;});}).map(function(m){return [m.id,m.x,m.y,m.faction,uRound(m.arm),uRound(m.t)];}),bases:s.bases.map(function(b){return [b.faction,b.sector,b.x,b.y,Math.ceil(b.hp),b.max,Math.round(b.a*100)/100];}),beacons:s.beacons.map(function(b){return [b.x,b.y,b.owner,uRound(b.charge),b.sector];}),fx:s.fx.filter(function(e){return nearby(e)&&e.effect!=='muzzle';}),core:s.bases.find(function(b){return b.faction===f&&b.sector===4;})||s.bases[f],message:s.ended?'WORLD COMPLETE':('SECTOR WAR / '+s.pilots.filter(function(p){return !p.ai&&p.online!==false;}).length+'/'+WORLD_CAPACITY+' PILOTS / DESTROY EVERY ENEMY BASE'),ended:s.ended,won:s.ended&&s.winner===f,progress:s.bases.filter(function(b){return b.faction!==f&&b.hp<=0;}).length,goal:WORLD_SECTORS,results:s.ended?s.results:null};
 return view;
}
function uPackets(s,f,recipients,sector){
 var view=uView(s,f,sector),messages=[];
 if(JSON.stringify(view).length<=13500)return [{to:recipients,data:{type:'snapshot',world:view}}];
 // Stream bounded chunks before their commit snapshot. FIFO sockets make the
 // client publish the whole frame together, with no invisible nearby colliders.
 if(view.shots){for(var offset=0;offset<view.shots.length;offset+=11952)messages.push({to:recipients,data:{type:'shot-part',time:view.time,shots:view.shots.slice(offset,offset+11952)}});view.shots='';}
 var fields=['pilots','rocks','bullets','loot','mines','enemies','fx'];
 fields.forEach(function(kind){var values=view[kind];for(var i=0,chunk=kind==='pilots'?12:24;i<values.length;i+=chunk)messages.push({to:recipients,data:{type:'entity-part',time:view.time,kind:kind,values:values.slice(i,i+chunk)}});view[kind]=[];});
 if(view.results){var result=view.results;messages.push({to:recipients,data:{type:'world-results',worldId:s.worldId,results:Object.assign({},result,{teams:[[],[]]})}});result.teams.forEach(function(rows,faction){for(var i=0;i<rows.length;i+=12)messages.push({to:recipients,data:{type:'results-team',faction:faction,rows:rows.slice(i,i+12)}});});view.results=null;}
 view.multipart=true;messages.push({to:recipients,data:{type:'snapshot',world:view}});return messages;
}
function uBroadcast(s,both){var messages=[],groups={};s.pilots.forEach(function(p){if(p.faction<0||p.ai||p.online===false)return;var key=p.faction+':'+p.sector;if(!groups[key])groups[key]={f:p.faction,sector:p.sector,ids:[]};groups[key].ids.push(p.id);});Object.keys(groups).forEach(function(key){var g=groups[key];if(!both&&g.f!==s.tick%2){var rows=uPilotRows(s,g.f,g.sector);for(var i=0;i<rows.length;i+=12)messages.push({to:g.ids,data:{type:'motion',time:s.time,pilots:rows.slice(i,i+12)}});}else messages=messages.concat(uPackets(s,g.f,g.ids,g.sector));});return messages;}
function uRefit(s,p,heal){var st=uStats(p),missing=Math.max(0,p.max-p.hp);p.max=st.hp;p.hp=heal?p.max:Math.max(1,p.max-missing);p.maxShield=st.shield;p.shield=heal?st.shield:Math.min(p.shield||0,st.shield);p.profileDirty=true;p.mounts=[];p.spawnSeq++;resetFlightAudit(p,s.now);}
function uShipyard(s,p,m){
 if(p.hp<=0||!uAtBase(s,p))return 'Dock at a surviving friendly base.';
 var status;
 if(m.type==='hull'){
  status=shipHullStatus(p);if(!status.ok)return status.reason;
  var old=HULLS[p.hull],items=p.loadout.slice(),used=[];p.scrap-=status.cost;p.tech-=status.research;p.hull++;
  p.loadout=HULLS[p.hull].mounts.map(function(mount){var i=old.mounts.findIndex(function(o,i){return used.indexOf(i)<0&&o.type===mount.type&&items[i];});if(i>=0){used.push(i);return items[i];}return null;});uRefit(s,p,true);
 }else if(m.type==='role'){
  if(!Number.isInteger(m.role)||!ROLES[m.role])return 'Unknown role.';if(p.role===m.role)return '';if(p.scrap<ROLES[m.role].cost)return 'Not enough scrap.';p.scrap-=ROLES[m.role].cost;p.role=m.role;uRefit(s,p,true);
 }else if(m.type==='fit'){
  if(!Number.isInteger(m.slot))return 'Choose a mount.';var id=m.item||null;status=shipFitStatus(p,m.slot,id);if(!status.ok)return status.reason;p.scrap-=status.cost;p.tech-=status.research;if(id&&p.owned.indexOf(id)<0)p.owned.push(id);p.loadout[m.slot]=id;uRefit(s,p,false);
 }else if(m.type==='upgrade'){
  if(m.id==='repair'){var cost=SECTOR_INFO[p.sector].repair;if(p.scrap<cost)return 'Not enough scrap.';p.scrap-=cost;p.hp=p.max;p.shield=p.maxShield;s.escorts.forEach(function(e){if(e.owner===p.id)e.max=e.hp=150+shipLevel(p,'winghull')*55;});}
  else if(m.id==='escort'){var wing=s.escorts.filter(function(e){return e.owner===p.id;}).length,cost=95+wing*25;if(wing>=2+shipLevel(p,'hangar'))return 'HANGAR FULL / UPGRADE HANGAR DECK';if(p.scrap<cost)return 'Not enough scrap.';if(s.escorts.length>=160)return 'Escort traffic is at capacity.';p.scrap-=cost;s.escorts.push({id:s.next++,owner:p.id,faction:p.faction,x:p.x+65,y:p.y+35,hp:150+shipLevel(p,'winghull')*55,max:150+shipLevel(p,'winghull')*55,a:p.a,cd:1,slot:wing});}
  else{status=shipUpgradeStatus(p,m.id);if(!status.ok)return status.reason||'Unknown upgrade.';p.scrap-=status.cost;p.tech-=status.tech;p.upgrades[m.id]=status.level+1;if(m.id==='armor'||m.id==='shield')uRefit(s,p,true);if(m.id==='winghull')s.escorts.forEach(function(e){if(e.owner===p.id)e.max=e.hp=150+shipLevel(p,'winghull')*55;});}
  p.profileDirty=true;
 }
 return '';
}
function uCommand(ctx){
 var s=ctx.sessionState;uReconcile(s,ctx);var p=s.pilots.find(function(p){return p.id===ctx.message.from;}),m=ctx.message.data||{};if(!p)return {ok:false,error:'Wait for universe membership.'};
 if(m.type==='scheduled-action'){if(!m.command||['cloak','mine','pulse','stance'].indexOf(m.command.type)<0||typeof m.id!=='string'||m.id.length>64||!Number.isFinite(m.at))return {ok:false,error:'Invalid scheduled action.'};p.recentActions=p.recentActions||[];if(p.recentActions.indexOf(m.id)>=0)return {ok:true,sessionState:s};p.pendingActions=p.pendingActions||[];if(p.pendingActions.length>=16)return {ok:false,error:'Action queue is full.'};p.recentActions.push(m.id);p.recentActions=p.recentActions.slice(-64);p.pendingActions.push({at:clamp(m.at,s.time,s.time+.25),command:{type:m.command.type}});p.pendingActions.sort(function(a,b){return a.at-b.at;});return {ok:true,sessionState:s};}
 if(m.type==='resync')return {ok:true,sessionState:s,broadcast:p.faction>=0?[uProfilePacket(p)].concat(uPackets(s,p.faction,[p.id])):[{to:[p.id],data:{type:'choose-faction'}}]};
 if(m.type==='leave')return {ok:true,playerStates:uSave(s,ctx)};
 if(s.ended)return {ok:false,error:'This world is complete. Join the next world.'};
 if(m.type==='input'){acceptPilotInput(p,m,ctx.now,s.time);return {ok:true,sessionState:s};}
 if(m.type==='choose'){
  if(m.faction!==0&&m.faction!==1)return {ok:false,error:'Choose a faction.'};
  if(p.faction===m.faction)return {ok:true,sessionState:s,broadcast:[uProfilePacket(p)].concat(uPackets(s,p.faction,[p.id]))};
  if(p.faction>=0&&(p.hp<=0||!uAtBase(s,p)||s.time-p.choiceAt<60))return {ok:false,error:'Change sides at a surviving base after 60 seconds.'};
  if(!s.bases.some(function(b){return b.faction===m.faction&&b.hp>0;}))return {ok:false,error:'That faction has no surviving base.'};
  s.mines=s.mines.filter(function(mine){return mine.owner!==p.id;});s.escorts=s.escorts.filter(function(escort){return escort.owner!==p.id;});p.faction=m.faction;p.choiceAt=s.time;p.x=uBase(p.faction).x;p.y=0;uSpawn(s,p);
 }else if(p.faction<0)return {ok:false,error:'Choose a faction first.'};
 else if(m.type==='cloak'){if(p.cloaked)p.cloaked=false;else{if(p.hp<=0||!uRole(p).cloak||p.energy<25||p.lock>0)return {ok:false,error:'Cloak unavailable: recharge or change role.'};p.cloaked=true;}}
 else if(m.type==='mine'){if(p.hp<=0||p.cloaked||p.mineCd>0||p.energy<25||s.mines.filter(function(a){return a.owner===p.id;}).length>=uRole(p).mines||s.mines.length>=64)return {ok:false,error:'Mine rack or capacitor unavailable.'};p.energy-=25;p.mineCd=2.5;s.mines.push({id:s.next++,x:uRound(p.x-Math.cos(p.a)*45),y:uRound(p.y-Math.sin(p.a)*45),faction:p.faction,owner:p.id,arm:1.2,t:90,dmg:p.role===3?140:95});}
 else if(m.type==='jump-sector'){var destination=s.bases.find(function(b){return b.faction===p.faction&&b.sector===m.sector&&b.hp>0;});if(!uAtBase(s,p)||!destination||p.hp<=0)return {ok:false,error:'Jump from a surviving friendly base to another friendly base.'};p.x=destination.x;p.y=destination.y+120;p.sector=destination.sector;p.vx=p.vy=p.av=0;p.spawnSeq++;resetFlightAudit(p,s.now);}
 else if(m.type==='stance'){p.stance=p.stance?0:1;}
 else if(m.type==='pulse'){if(p.hp<=0||p.pulse>0)return {ok:false,error:'EMP is recharging.'};p.pulse=14-shipLevel(p,'emp')*2;var range=420+shipLevel(p,'emp')*70,amount=110+shipLevel(p,'emp')*40;uTargets(s).forEach(function(t){if(t.hp>0&&t.faction!==p.faction&&distance(p,t)<range)uDamage(s,t,amount,p.id,{});});s.bullets=s.bullets.filter(function(b){return b.faction===p.faction||distance(p,b)>range;});serverVisual(s,'pulse',p.x,p.y,{max:.65,size:range});}
 else if(['hull','role','fit','upgrade'].indexOf(m.type)>=0){var error=uShipyard(s,p,m);if(error)return {ok:false,error:error};}
 else return {ok:false,error:'Unknown universe command.'};
 return {ok:true,sessionState:s,playerStates:uSave(s,ctx),broadcast:[uProfilePacket(p)].concat(uBroadcast(s,true))};
}
function uTick(ctx){
 var s=ctx.sessionState;if(s.ended)return {ok:true,broadcast:uBroadcast(s,true)};
 var dt=Math.max(0,Math.min(.1,(ctx.now-s.now)/1000));s.now=ctx.now;s.time+=dt;s.tick++;s.fx=[];uReconcile(s,ctx);
 var day=Math.floor(ctx.now/86400000);if(day!==s.day){s.day=day;s.pilots.forEach(function(p){p.dayScrap=0;});}
 (ctx.inputs||[]).forEach(function(packet){var p=s.pilots.find(function(q){return q.id===packet.from;});if(p)acceptPilotInput(p,packet.data||{},ctx.now,s.time);});
 var actionPackets=[];s.pilots.slice().forEach(function(p){while(p.pendingActions&&p.pendingActions.length&&p.pendingActions[0].at<=s.time){var action=p.pendingActions.shift(),result=uCommand(Object.assign({},ctx,{message:{from:p.id,data:action.command}}));if(result.broadcast)actionPackets=actionPackets.concat(result.broadcast);if(!result.ok&&!p.ai)actionPackets.push({to:[p.id],data:{type:'notice',message:result.error}});}});
 s.pilots.forEach(function(p){
  if(p.faction<0)return;if(p.online===false){p.input=clean({});p.latestMotion=null;}
  if(p.ai){if(s.time>=(p.botThink||0)){p.botPlanned={at:s.time+.032,controls:uBotThink(s,p,ctx)};p.botThink=s.time+.1;}if(p.botPlanned&&p.botPlanned.at<=s.time){p.input=p.botPlanned.controls;p.inputAt=p.botPlanned.at;p.botPlanned=null;}p.lastInput=ctx.now;}
  if(p.hp<=0){p.respawn-=dt;if(p.respawn<=0)uSpawn(s,p);return;}
  applyQueuedPilotInput(p,s.time);var m=ctx.now-p.lastInput<800?p.input:clean({}),role=uRole(p),st=shipStats(p);
  p.mineCd=Math.max(0,p.mineCd-dt);p.pulse=Math.max(0,(p.pulse||0)-dt);p.jam=Math.max(0,(p.jam||0)-dt);p.lock=Math.max(0,p.lock-dt);p.burn=Math.max(0,(p.burn||0)-dt);if(p.burn>0)uDamage(s,p,dt*9,p.burnOwner,{});
  if(s.time-(p.lastHit||0)>6){p.shield=Math.min(p.maxShield||0,(p.shield||0)+dt*(9+shipLevel(p,'shield')*2));if(shipLevel(p,'regen'))p.hp=Math.min(p.max,p.hp+dt*shipLevel(p,'regen')*1.2);}
  if(m.fire||m.boost){p.cloaked=false;p.lock=Math.max(p.lock,2);}
  if(p.cloaked){p.energy=Math.max(0,p.energy-dt*18*role.cloak);if(!p.energy){p.cloaked=false;p.lock=3;}}else p.energy=Math.min(100,p.energy+dt*st.regen);
  p.boost=clamp(p.boost+dt*(m.boost?-34/(1+shipLevel(p,'engine')*.2):19),0,100);p.heat=Math.max(0,p.heat-dt*st.cooling);if(p.overheated&&p.heat<35)p.overheated=false;
  var oldVx=p.vx,oldVy=p.vy;stepPilotMovement(p,dt,m,s.rocks,true);
  var report=p.latestMotion||{seq:m.seq,report:m.motion};if(report.report){var auditResult=validateFlightReport(p,report.report,report.seq,ctx.now,m,s.rocks);if(!auditResult.accepted&&['none','old-input','old-spawn','resync','collision'].indexOf(auditResult.reason)<0){p.profileDirty=true;s.trustDirty=true;}}
  p.ax=clamp((p.vx-oldVx)/Math.max(dt,.001),-1200,1200);p.ay=clamp((p.vy-oldVy)/Math.max(dt,.001),-1200,1200);
  p.inputAck=Math.max(p.inputAck||0,p.input.seq||0);p.sector=sectorAt(p.y);
  uFireMounts(s,p,dt,m);
  var base=uAtBase(s,p);if(base){p.hp=Math.min(p.max,p.hp+dt*12);p.energy=Math.min(100,p.energy+dt*20);}
  if(p.role===5&&p.energy>10)s.pilots.forEach(function(q){if(q!==p&&q.faction===p.faction&&q.hp>0&&distance(p,q)<220&&q.hp<q.max){q.hp=Math.min(q.max,q.hp+dt*3);p.energy=Math.max(0,p.energy-dt*2);}});
 });
 s.enemies.concat(s.escorts).forEach(function(e){if(e.burn>0&&e.hp>0){e.burn=Math.max(0,e.burn-dt);uDamage(s,e,dt*9,e.burnOwner,{});}e.jam=Math.max(0,(e.jam||0)-dt);});
 uEscorts(s,dt);uBaseDefenses(s,dt);uProjectiles(s,dt);driftRocks(s.rocks,dt);
 var fragments=[];s.rocks=s.rocks.filter(function(r){if(r.hp>0)return true;var pieces=fractureRock(r,r.hitX||r.x-1,r.hitY||r.y);if(pieces.length&&s.rocks.length+fragments.length+pieces.length-1>96)pieces=[Object.assign({},r,{hp:Math.max(8,r.r*.85),vx:(r.vx||0)+20,spin:.5})];fragments=fragments.concat(pieces);if(!pieces.length){s.loot.push({x:uRound(r.x),y:uRound(r.y),v:r.ore??8});serverVisual(s,'explosion',r.x,r.y,{max:.7,size:r.r*.6});}return false;}).concat(fragments);
 s.mines=s.mines.filter(function(m){m.arm-=dt;m.t-=dt;if(m.t<=0)return false;if(m.arm>0)return true;var targets=uTargets(s),target=targets.find(function(p){return p.hp>0&&p.faction>=0&&p.faction!==m.faction&&distance(p,m)<(p.base?190:75);});if(!target)return true;targets.forEach(function(p){var d=distance(p,m);if(p.hp>0&&p.faction!==m.faction&&d<(p.base?260:180))uDamage(s,p,m.dmg*(1-d/(p.base?340:220)),m.owner,{});});serverVisual(s,'explosion',m.x,m.y,{max:.7,size:55});return false;});
 s.loot=s.loot.filter(function(l){var closest=null,dd=Infinity;s.pilots.forEach(function(p){if(p.hp>0&&p.faction>=0&&distance(p,l)<dd){closest=p;dd=distance(p,l);}});if(!closest)return true;var p=closest,range=(340+shipLevel(p,'tractor')*110+shipStats(p).magnet*140)*uRole(p).tractor;if(p.input.tractor&&ctx.now-p.lastInput<800&&p.energy>0&&dd<range){var a=Math.atan2(p.y-l.y,p.x-l.x);l.x+=Math.cos(a)*Math.min(dd,400*dt);l.y+=Math.sin(a)*Math.min(dd,400*dt);p.energy=Math.max(0,p.energy-dt*10);}if(dd<30){var value=Math.round(l.v*(p.role===2?1.6:1)),before=Math.floor(p.total/100);p.scrap+=value;p.total+=value;p.dayScrap+=value;p.tech+=Math.floor(p.total/100)-before;p.profileDirty=true;return false;}return true;}).slice(-48);
 s.spawn-=dt;if(s.spawn<=0){s.spawn=12;if(s.rocks.length<36){var sec=s.tick%9;s.rocks.push({x:uRound(Math.cos(s.tick)*1400),y:uRound(sectorY(sec)+Math.sin(s.tick)*500),r:45,hp:42,type:s.tick%10,a:0,seed:s.next++,ore:36});}if(s.enemies.length<8){var f=s.patrolFaction===0?1:0;s.patrolFaction=f;var active=s.pilots.filter(function(p){return p.hp>0;})[s.tick%Math.max(1,s.pilots.length)];s.enemies.push({id:s.next++,faction:f,x:(f?1:-1)*1100,y:active?sectorY(active.sector):0,vx:0,vy:0,a:0,hp:100,max:100,cd:1,kind:0});}}
 s.enemies=s.enemies.filter(function(e){if(e.hp<=0){s.loot.push({x:e.x,y:e.y,v:24});return false;}var target=s.pilots.filter(function(p){return p.hp>0&&p.faction>=0&&p.faction!==e.faction&&visibleShip(e,p);}).sort(function(a,b){return distance(a,e)-distance(b,e);})[0];if(target){var a=Math.atan2(target.y-e.y,target.x-e.x);e.a=a;if(distance(e,target)>300){e.vx=Math.cos(a)*90*(e.jam>0?.4:1);e.vy=Math.sin(a)*90*(e.jam>0?.4:1);e.x=uRound(e.x+e.vx*dt);e.y=uRound(e.y+e.vy*dt);}else e.vx=e.vy=0;e.cd-=dt*(e.jam>0?.15:1);if(e.cd<=0&&distance(e,target)<800&&s.bullets.length<1536){e.cd=1.6;s.bullets.push({id:s.next++,x:e.x,y:e.y,vx:uRound(Math.cos(a)*380+(e.vx||0)),vy:uRound(Math.sin(a)*380+(e.vy||0)),t:2.2,faction:e.faction,dmg:12,weapon:'cannon',owner:e.id,hits:[]});}}return true;});
 s.beacons.forEach(function(b){var near=s.pilots.filter(function(p){return p.online!==false&&p.hp>0&&!p.cloaked&&distance(p,b)<180;});if(near.length&&near.every(function(p){return p.faction===near[0].faction;})){if(b.owner!==near[0].faction){if(b.attacker!==near[0].faction){b.attacker=near[0].faction;b.charge=0;}b.charge+=dt;}if(b.charge>=12){b.owner=near[0].faction;b.charge=0;s.pilots.forEach(function(p){if(p.faction===b.owner){p.scrap+=80;p.tech+=1;p.profileDirty=true;}});}}else b.charge=Math.max(0,b.charge-dt);if(b.owner>=0)s.control[b.owner]+=dt;});
 s.rocks.forEach(function(r){r.x=uRound(r.x);r.y=uRound(r.y);r.r=Math.round(r.r*1000)/1000;r.a=Math.round(r.a*1000)/1000;});
 s.pilots.forEach(function(p){['x','y','vx','vy','a','hp','energy','boost','heat','lock','mineCd','respawn','damage'].forEach(function(k){p[k]=Math.round((p[k]||0)*1000)/1000;});});
 uFinish(s);var out={ok:true,sessionState:s,broadcast:actionPackets.concat(uBroadcast(s,s.ended))};
 var humans=s.pilots.filter(function(p){return !p.ai;});if(humans.length){var profile=humans[s.tick%humans.length];if(profile.profileDirty||s.tick%20===0){out.broadcast.unshift(uProfilePacket(profile));profile.profileDirty=false;}}
 if(s.tick%100===0||s.ended||s.trustDirty){s.trustDirty=false;var scores={};s.pilots.forEach(function(p){if(!p.ai)scores[p.id]=p.dayScrap;});out.scores={'daily-scrap':scores};out.playerStates=uSave(s,ctx);}
 if(s.ended)out.result={kind:'world-victory',winner:s.winner,statistics:s.results};return out;
}
globalThis.game={persistent:true,tickRateHz:30,replays:false,queues:universeLegacy.queues,createSession:function(ctx){return ctx.room&&ctx.room.metadata&&ctx.room.metadata.universe?uCreate(ctx):universeLegacy.createSession(ctx);},onMembershipChange:function(ctx){return {ok:!!(ctx.sessionState&&ctx.sessionState.kind==='universe'&&!ctx.sessionState.ended&&ctx.players.filter(function(p){return !p.ai;}).length<=WORLD_CAPACITY)};},onPlayerMessage:function(ctx){return ctx.sessionState&&ctx.sessionState.kind==='universe'?uCommand(ctx):universeLegacy.onPlayerMessage(ctx);},onTick:function(ctx){return ctx.sessionState&&ctx.sessionState.kind==='universe'?uTick(ctx):universeLegacy.onTick(ctx);}};
