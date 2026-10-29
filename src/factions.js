export const WORLD_CAPACITY=32;
export const FACTIONS=[{name:'RIGHTEOUS REPUBLIC',short:'REPUBLIC',color:'#c7d1ab',baseX:-2200},{name:'LEFT WING REBELLION',short:'REBELLION',color:'#d4a296',baseX:2200}];
export const ROLES=[
 {id:'interceptor',name:'INTERCEPTOR',desc:'Fast, agile dogfighter; light armor, only 2 mines.',cost:0,speed:1.2,hp:.8,turn:1.3,damage:1,tractor:1,cloak:1,mines:2,shape:0},
 {id:'guardian',name:'GUARDIAN',desc:'Heavy shields and armor; slow, cannot cloak.',cost:280,speed:.72,hp:1.5,turn:.8,damage:1.1,tractor:.8,cloak:0,mines:3,shape:1},
 {id:'miner',name:'PROSPECTOR',desc:'60% more ore, wide tractor; weak combat weapons.',cost:220,speed:.85,hp:1.1,turn:.9,damage:.7,tractor:1.6,cloak:1,mines:4,shape:2},
 {id:'minelayer',name:'MINELAYER',desc:'12 persistent mines; modest hull and gun damage.',cost:260,speed:.95,hp:.9,turn:1,damage:.85,tractor:1,cloak:1,mines:12,shape:3},
 {id:'infiltrator',name:'INFILTRATOR',desc:'Efficient cloak and nimble flight; fragile hull.',cost:320,speed:1.12,hp:.72,turn:1.2,damage:.9,tractor:.8,cloak:.45,mines:3,shape:4},
 {id:'support',name:'SUPPORT TENDER',desc:'Repairs nearby allies; slow, low weapon damage.',cost:240,speed:.88,hp:1.1,turn:.85,damage:.7,tractor:1.2,cloak:1.2,mines:5,shape:5}
];
