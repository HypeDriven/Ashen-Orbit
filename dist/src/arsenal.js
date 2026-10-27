// All weapons share the same damage/energy/heat rules. No client-only damage effects.
export const WEAPONS=[
 {id:'cannon',name:'Autocannon',desc:'Cheap balanced slugs; limited reach.',cost:0,research:0,tier:0,power:2,energy:1,heat:3,rate:.25,speed:720,life:1.1,damage:24,color:'#dedbc5'},
 {id:'laser',name:'Beam laser',desc:'Instant accurate beam; high capacitor drain.',cost:150,research:1,tier:0,power:4,energy:9,heat:8,rate:.45,speed:0,life:0,damage:40,range:650,beam:true,color:'#ef7970'},
 {id:'pulse',name:'Pulse laser',desc:'Fast light bolts; poor armor damage.',cost:170,research:1,tier:0,power:3,energy:3,heat:4,rate:.12,speed:1050,life:.65,damage:15,armor:.55,color:'#fa9f83'},
 {id:'disruptor',name:'Disruptor',desc:'3x shield damage; weak against bare hull.',cost:220,research:2,tier:1,power:4,energy:6,heat:6,rate:.35,speed:600,life:1.1,damage:14,shield:3,color:'#b787ff'},
 {id:'ion',name:'Ion projector',desc:'Jams enemy weapons and slows drives; low damage.',cost:240,research:2,tier:1,power:4,energy:8,heat:7,rate:.65,speed:660,life:1.2,damage:16,jam:1.8,color:'#83d7ed'},
 {id:'homing',name:'Homing missiles',desc:'Tracks selected target; slow turning, long reload.',cost:260,research:2,tier:1,power:5,energy:5,heat:12,rate:1.5,speed:300,life:3.5,damage:65,homing:2.1,splash:65,color:'#e7cc8d'},
 {id:'rocket',name:'Unguided rockets',desc:'Fast explosive salvo; blast can damage your ship.',cost:180,research:1,tier:0,power:4,energy:3,heat:13,rate:.85,speed:580,life:1.8,damage:50,splash:110,self:true,count:2,spread:.09,color:'#e3a16b'},
 {id:'particle',name:'Particle lance',desc:'Pierces three ships; high heat and power load.',cost:430,research:3,tier:3,power:7,energy:12,heat:24,rate:.9,speed:1500,life:1,damage:80,pierce:3,color:'#b6eea1'},
 {id:'rail',name:'Railgun',desc:'Extreme range, armor piercing; very slow reload.',cost:330,research:2,tier:2,power:6,energy:15,heat:18,rate:2.1,speed:2100,life:1,damage:145,pierce:2,armor:1.5,color:'#c8e6f5'},
 {id:'plasma',name:'Plasma mortar',desc:'Large blast; slow blobs are easy to outrun.',cost:300,research:2,tier:2,power:5,energy:10,heat:17,rate:1.2,speed:230,life:3,damage:85,splash:145,self:true,color:'#96e8aa'},
 {id:'flak',name:'Flak battery',desc:'Seven fragments punish swarms; poor distant accuracy.',cost:210,research:1,tier:1,power:4,energy:4,heat:14,rate:.85,speed:680,life:.5,damage:16,count:7,spread:.15,color:'#dec7a1'},
 {id:'gatling',name:'Rotary cannon',desc:'Cheap rapid suppressive fire; spread and heat build fast.',cost:190,research:1,tier:0,power:3,energy:.7,heat:3,rate:.055,speed:830,life:.85,damage:7,spread:.19,color:'#d7c7ab'},
 {id:'tesla',name:'Arc coil',desc:'Chains to three nearby enemies; very short range.',cost:390,research:3,tier:3,power:6,energy:16,heat:20,rate:1.1,speed:0,life:0,damage:68,range:300,beam:true,chain:3,color:'#9db6ff'},
 {id:'flame',name:'Thermite jet',desc:'Burns hull over time; dangerous close approach required.',cost:270,research:2,tier:2,power:4,energy:2,heat:5,rate:.13,speed:450,life:.38,damage:10,burn:3,spread:.2,color:'#f2a46c'},
 {id:'mine',name:'Proximity mines',desc:'Stationary area denial; one-second arming delay.',cost:250,research:2,tier:1,power:3,energy:6,heat:10,rate:1.4,speed:0,life:9,damage:95,splash:140,mine:true,self:true,color:'#df9ca9'},
 {id:'siege',name:'Antimatter torpedo',desc:'Huge warhead; slow, high drain, and dangerous blast.',cost:550,research:4,tier:4,power:8,energy:28,heat:38,rate:3.8,speed:190,life:5,damage:250,splash:210,self:true,color:'#e6a8f5'},
 {id:'siphon',name:'Siphon beam',desc:'Heals 20% hull damage dealt; costly low DPS.',cost:360,research:3,tier:3,power:5,energy:14,heat:12,rate:.8,speed:0,life:0,damage:35,range:420,beam:true,heal:.2,color:'#9bd1b0'}
];
export const COMPONENTS=[
 {id:'radiator',name:'Radiator',type:'utility',power:1,cost:140,research:1,desc:'+14 heat cooling/sec.'},
 {id:'magnet',name:'Salvage winch',type:'utility',power:2,cost:140,research:1,desc:'+140 tractor range; -10% speed.'},
 {id:'bulkhead',name:'Heavy bulkhead',type:'utility',power:1,cost:180,research:1,desc:'+110 hull; -8% speed.'},
 {id:'drive',name:'Vector engine',type:'engine',power:3,cost:0,research:0,desc:'+18% speed, +15% turn rate.'},
 {id:'cruise',name:'Cruise engine',type:'engine',power:2,cost:220,research:2,desc:'+32% speed; -25% turn rate.'},
 {id:'agile',name:'Maneuver engine',type:'engine',power:4,cost:220,research:2,desc:'+45% turn rate, only +5% speed.'},
 {id:'reactor',name:'Fusion reactor',type:'reactor',power:0,cost:0,research:0,desc:'+10 capacitor regeneration/sec.'},
 {id:'overdrive',name:'Overdrive reactor',type:'reactor',power:0,cost:280,research:2,desc:'+22 regeneration/sec; -8 heat cooling/sec.'},
 {id:'barrier',name:'Shield emitter',type:'shield',power:4,cost:0,research:0,desc:'+90 regenerating shields.'},
 {id:'fortress',name:'Fortress shield',type:'shield',power:7,cost:310,research:2,desc:'+190 shields; -15% speed.'}
];
const mount=(type,x,y)=>({type,x,y});
export const HULLS=[
 {name:'SKIFF',cost:0,research:0,sectors:0,hp:220,radius:24,speed:1,turn:2.8,power:15,mounts:[mount('fixed',24,0),mount('utility',-8,0),mount('engine',-16,0),mount('reactor',0,0)]},
 {name:'CORVETTE',cost:480,research:3,sectors:1,hp:330,radius:31,speed:.93,turn:2.45,power:24,mounts:[mount('fixed',30,0),mount('turret',2,-17),mount('utility',-8,12),mount('engine',-23,0),mount('reactor',0,0),mount('shield',-5,-8)]},
 {name:'FRIGATE',cost:850,research:4,sectors:3,hp:490,radius:40,speed:.83,turn:2.05,power:34,mounts:[mount('fixed',39,-12),mount('fixed',39,12),mount('turret',0,-25),mount('turret',0,25),mount('utility',-12,-10),mount('utility',-12,10),mount('engine',-32,0),mount('reactor',0,0),mount('shield',12,0)]},
 {name:'CRUISER',cost:1350,research:6,sectors:5,hp:710,radius:52,speed:.72,turn:1.65,power:46,mounts:[mount('fixed',50,-15),mount('fixed',50,15),mount('turret',12,-34),mount('turret',12,34),mount('turret',-25,0),mount('utility',-14,-18),mount('utility',-14,18),mount('engine',-44,0),mount('reactor',0,0),mount('shield',18,0)]},
 {name:'DREADNOUGHT',cost:2200,research:8,sectors:8,hp:1050,radius:66,speed:.6,turn:1.25,power:62,mounts:[mount('fixed',63,-17),mount('fixed',63,17),mount('turret',25,-43),mount('turret',25,43),mount('turret',-22,-38),mount('turret',-22,38),mount('utility',-30,-15),mount('utility',-30,15),mount('utility',0,0),mount('engine',-55,0),mount('reactor',-10,0),mount('shield',30,0)]}
];
export const weapon=id=>WEAPONS.find(w=>w.id===id);
export const component=id=>COMPONENTS.find(c=>c.id===id);
export const compatible=(slot,id)=>!id||(['fixed','turret'].includes(slot.type)?!!weapon(id):component(id)?.type===slot.type);
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export const turnTowards=(a,b,step)=>a+Math.max(-step,Math.min(step,angleDelta(a,b)));
export function segmentDistance(x,y,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy);}
