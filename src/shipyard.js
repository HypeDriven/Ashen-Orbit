import {HULLS,weapon,component,compatible,hullAllows} from './arsenal.js';
import {ROLES} from './factions.js';
export const UPGRADES=[
 {id:'gun',tree:0,name:'CANNON COILS',desc:'+7 damage; faster firing each rank.',max:5,base:70,need:'',rank:0,tech:0},
 {id:'multishot',tree:0,name:'SPLIT BARRELS',desc:'Additional projectiles in a narrow spread.',max:3,base:130,need:'gun',rank:2,tech:1},
 {id:'pierce',tree:0,name:'PHASE ROUNDS',desc:'Pierce one extra target per rank.',max:3,base:180,need:'multishot',rank:1,tech:1},
 {id:'armor',tree:1,name:'HULL PLATING',desc:'+60 flagship hull. Repairs hull on purchase.',max:4,base:85,need:'',rank:0,tech:0},
 {id:'shield',tree:1,name:'AEGIS SHIELD',desc:'+45 regenerating shields per rank.',max:4,base:110,need:'armor',rank:1,tech:1},
 {id:'regen',tree:1,name:'NANITE REPAIR',desc:'Regenerate hull after 6s without damage.',max:3,base:160,need:'shield',rank:1,tech:1},
 {id:'engine',tree:2,name:'VECTOR DRIVES',desc:'+9% thrust; more efficient afterburners.',max:4,base:80,need:'',rank:0,tech:0},
 {id:'tractor',tree:2,name:'TRACTOR ARRAY',desc:'+110m beam range; faster wreck recovery.',max:4,base:105,need:'engine',rank:1,tech:0},
 {id:'emp',tree:2,name:'PULSE CAPACITOR',desc:'Stronger EMP, larger radius, less cooldown.',max:3,base:155,need:'tractor',rank:1,tech:1},
 {id:'hangar',tree:3,name:'HANGAR DECK',desc:'+1 escort capacity per rank (up to 5).',max:3,base:130,need:'',rank:0,tech:0},
 {id:'wingguns',tree:3,name:'SQUADRON WEAPONS',desc:'+40% escort damage per rank.',max:3,base:140,need:'hangar',rank:1,tech:1},
 {id:'winghull',tree:3,name:'ESCORT BULKHEADS',desc:'+55 escort hull per rank; repairs escorts.',max:3,base:120,need:'wingguns',rank:1,tech:1}
];
export const TREES=['WEAPONS','DEFENSE','ENGINEERING','FLEET'];
export const shipLevel=(s,id)=>Math.max(0,Math.floor(s.upgrades?.[id]||0));
export function shipUpgradeStatus(s,id){const u=UPGRADES.find(u=>u.id===id);if(!u)return {cost:0,tech:0,ok:false,reason:'UNKNOWN UPGRADE',level:0};const l=shipLevel(s,id),cost=Math.ceil(u.base*(l+(id==='gun'?0:1)));let reason=l>=u.max?'MAX RANK':u.need&&shipLevel(s,u.need)<u.rank?'REQUIRES '+u.need.toUpperCase()+' '+u.rank:s.scrap<cost?'NEED SALVAGE':s.tech<u.tech?'NEED RESEARCH':'';return {cost,tech:u.tech,ok:!reason,reason,level:l};}
export function shipStats(s){const ids=s.loadout||[],count=id=>ids.filter(x=>x===id).length,h=HULLS[s.hull||0],role=ROLES[s.role||0];return {power:ids.reduce((v,id)=>v+(weapon(id)?.power||component(id)?.power||0),0),budget:h.power,cooling:Math.max(7,24+14*count('radiator')-8*count('overdrive')),regen:18+10*count('reactor')+22*count('overdrive'),magnet:count('magnet'),speed:h.speed*(role?.speed||1)*(1+.18*count('drive')+.32*count('cruise')+.05*count('agile'))*(1-.1*count('magnet'))*(1-.08*count('bulkhead'))*(1-.15*count('fortress')),turn:h.turn*(role?.turn||1)*(1+.15*count('drive')-.25*count('cruise')+.45*count('agile')),hp:Math.round((h.hp+shipLevel(s,'armor')*60+count('bulkhead')*110)*(role?.hp||1)),shield:(s.role===1?140:0)+shipLevel(s,'shield')*45+count('barrier')*90+count('fortress')*190};}
export function shipHullStatus(s){const h=HULLS[s.hull+1];if(!h)return {ok:false,reason:'LARGEST HULL',cost:0,research:0};const reason=s.cleared.filter(id=>id!==6).length<h.sectors?'CLEAR '+h.sectors+' SECTORS':s.scrap<h.cost?'NEED SCRAP':s.tech<h.research?'NEED RESEARCH':'';return {ok:!reason,reason,cost:h.cost,research:h.research};}
export function shipFitStatus(s,slot,id){const m=HULLS[s.hull].mounts[slot],def=weapon(id)||component(id);if(!m||!compatible(m,id))return {ok:false,reason:'INCOMPATIBLE MOUNT',cost:0,research:0};const cost=id&&!s.owned.includes(id)?def.cost:0,research=id&&!s.owned.includes(id)?def.research||0:0;const draw=shipStats(s).power-(weapon(s.loadout[slot])?.power||component(s.loadout[slot])?.power||0)+(def?.power||0);const reason=!hullAllows(id,s.hull)?(def.hulls.length===1?'REQUIRES '+HULLS[def.hulls[0]].name:'WRONG HULL / SEE HULLS'):weapon(id)&&s.cleared.length<def.tier?'CLEAR '+def.tier+' SECTORS':draw>HULLS[s.hull].power?'POWER BUDGET EXCEEDED':s.scrap<cost?'NEED SCRAP':s.tech<research?'NEED RESEARCH':'';return {ok:!reason,reason,cost,research};}
export function defaultLoadout(){return ['cannon',null,'drive','reactor'];}
