// Contact sheet drawn by the actual procedural renderer; no browser or mocked art.
import fs from 'node:fs';
import {WEAPONS} from '../game/src/arsenal.js';
import {createEffectPainter,renderProjectile,renderVisual,renderHullDetail} from '../game/src/effects.js';
const width=1440,height=1410,parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#101516"/>`];
const attrs=(c,type)=>`${type}="${c.slice(0,7)}" ${type}-opacity="${c.length===9?parseInt(c.slice(7),16)/255:1}"`;
function sink(dx,dy){return {line:(x,y,xx,yy,c,w)=>parts.push(`<path d="M ${dx+x} ${dy+y} L ${dx+xx} ${dy+yy}" ${attrs(c,'stroke')} stroke-width="${w}" fill="none"/>`),polygon:(pts,c)=>parts.push(`<polygon points="${pts.map(q=>`${q[0]+dx},${q[1]+dy}`).join(' ')}" ${attrs(c,'fill')}/>`),path:(pts,c,w)=>parts.push(`<polyline points="${pts.map(q=>`${q[0]+dx},${q[1]+dy}`).join(' ')}" ${attrs(c,'stroke')} stroke-width="${w}" fill="none"/>`)};}
for(let i=0;i<20;i++){
 const dx=(i%4)*360,dy=Math.floor(i/4)*282,p=createEffectPainter(sink(dx,dy),{zoom:3.2,cx:0,cy:0,width:360,height:270});
 parts.push(`<rect x="${dx+8}" y="${dy+8}" width="344" height="266" rx="5" fill="#141d1a" stroke="#34453c"/><text x="${dx+20}" y="${dy+35}" fill="#c9ccb7" font-family="monospace" font-size="14">${WEAPONS[i]?.name.toUpperCase()||['SHIELD CONTACT','ARMOR / SCORCH','DETONATION'][i-17]}</text>`);
 const w=WEAPONS[i];
 if(w){if(w.beam)renderVisual(p,{beam:true,weapon:w.id,color:w.color,x:-43,y:-7,x2:37,y2:-7,t:.09,max:.14,seed:i},2.37);else renderProjectile(p,{weapon:w.id,x:15,y:-8,vx:w.speed,vy:0,t:w.life*.6,trail:Array.from({length:12},(_,j)=>({x:10-j*2.8,y:-8+Math.sin(j*.3)*1.5}))},2.37);renderVisual(p,{effect:'muzzle',weapon:w.id,x:-34,y:18,a:0,size:10,t:.08,max:.12,seed:i},2.37);renderVisual(p,{effect:'impact',weapon:w.id,x:27,y:20,a:0,size:12,t:.47,max:.65,seed:i},2.37);}
 else if(i===17)renderVisual(p,{effect:'shield',x:0,y:0,size:30,color:'#8fc7ed',t:.32,max:.48},2.37);
 else if(i===18){p.poly([[44,0],[10,-15],[-25,-30],[-35,-20],[-20,0],[-35,20],[-25,30],[10,15]],'#b9bda7');renderHullDetail(p,{x:0,y:0,a:0,scars:[{x:-9,y:7,a:.5,size:3,born:1,weapon:'plasma'}]},45,2.37,[{type:'turret',x:0,y:-20}],['plasma']);renderVisual(p,{effect:'impact',x:24,y:0,a:Math.PI,size:17,t:.46,max:.65,seed:73},2.37);}
 else renderVisual(p,{effect:'explosion',x:0,y:0,size:25,t:1.25,max:1.7,seed:47},2.37);
}
parts.push('</svg>');fs.writeFileSync(process.argv[2]||'/tmp/ashen-effects-sheet.svg',parts.join('\n'));
