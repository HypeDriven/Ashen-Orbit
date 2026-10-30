// Procedural combat visuals: cosmetic data never changes hit tests or damage.
export const MAX_EFFECTS=144;
let serial=0;
export function emitVisual(list,effect,x,y,options={}){
 const life=options.max||(effect==='explosion'?1.7:effect==='muzzle'?.12:effect==='shield'?.48:.65);
 list.push({x,y,vx:0,vy:0,t:life,max:life,effect,seed:++serial, ...options});
 if(list.length>MAX_EFFECTS)list.splice(0,list.length-MAX_EFFECTS);
}
export function stepVisuals(list,dt){for(const f of list){f.t-=dt;f.x+=(f.vx||0)*dt;f.y+=(f.vy||0)*dt;}return list.filter(f=>f.t>0).slice(-MAX_EFFECTS);}
export function rememberTrail(b,dt){if(!['homing','rocket','siege','plasma','disruptor','ion','particle','flame'].includes(b.weapon))return;b.trailClock=(b.trailClock||0)+dt;if(b.trailClock>=.035){b.trailClock=0;(b.trail||(b.trail=[])).unshift({x:b.x,y:b.y});if(b.trail.length>12)b.trail.length=12;}}
const colors={cannon:'#e0c9a2',gatling:'#e5bd7e',flak:'#e6c497',laser:'#f47873',pulse:'#f99b83',disruptor:'#bd8eff',ion:'#84ddfa',homing:'#e9be85',rocket:'#efa56a',particle:'#b3f2aa',rail:'#cae8ff',plasma:'#8ee6ba',tesla:'#aab7ff',flame:'#ffac69',mine:'#e1a3b9',siege:'#e6b2fa',siphon:'#9ddbc4',pd:'#b6dcea'};
export const effectColor=id=>colors[id]||'#d0b49d';
function hash(n){const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);}
function alpha(c,a){return c.slice(0,7)+Math.round(Math.max(0,Math.min(1,a))*255).toString(16).padStart(2,'0');}
// The painter adapts geometric detail to *physical* projected scale. All effects,
// projectiles and barrel details share one strict draw-command budget per frame.
export function createEffectPainter(sink,view,budget=3000){
 const p={simple:false,zoom:view.zoom,detail:view.zoom*(view.scale||1),count:0,budget};
 const project=(x,y)=>[(x-view.cx)*view.zoom+view.width/2,(y-view.cy)*view.zoom+view.height/2];
 const take=(n=1)=>{if(p.count+n>p.budget)return false;p.count+=n;return true;};
 p.line=(x,y,xx,yy,c,w=1)=>{if(!take())return;const a=project(x,y),b=project(xx,yy);sink.line(a[0],a[1],b[0],b[1],c,Math.max(.35,w*view.zoom));};
 p.poly=(points,c)=>{if(take())sink.polygon(points.map(q=>project(q[0],q[1])),c);};
 p.ring=(x,y,r,c,w=1,start=0,end=Math.PI*2)=>{if(r<=0)return;const steps=Math.max(6,Math.min(48,Math.ceil(r*p.detail*.7*(end-start)/(Math.PI*2))));if(!take(steps))return;const points=[];for(let i=0;i<=steps;i++){const a=start+(end-start)*i/steps;points.push(project(x+Math.cos(a)*r,y+Math.sin(a)*r));}sink.path(points,c,Math.max(.35,w*view.zoom));};
 p.disc=(x,y,r,c)=>{if(r<=0)return;const steps=p.detail>1.6?18:10,points=[];for(let i=0;i<steps;i++){const a=i*Math.PI*2/steps;points.push([x+Math.cos(a)*r,y+Math.sin(a)*r]);}p.poly(points,c);};
 p.glow=(x,y,r,c,strength=1)=>{p.disc(x,y,r*1.8,alpha(c,.035*strength));p.disc(x,y,r*1.25,alpha(c,.09*strength));p.disc(x,y,r*.7,alpha(c,.22*strength));};
 return p;
}
export function renderBeam(p,f,time){
 const x=f.x,y=f.y,xx=f.x2??x,yy=f.y2??y,id=f.weapon||'laser',c=f.color||effectColor(id),fade=Math.max(0,Math.min(1,f.t/(f.max||.14))),a=Math.atan2(yy-y,xx-x),nx=-Math.sin(a),ny=Math.cos(a),length=Math.hypot(xx-x,yy-y);
 if(id==='tesla'){
  const n=Math.max(4,Math.min(36,Math.ceil(length/22))),points=[[x,y]];
  for(let i=1;i<n;i++){const t=i/n,noise=Math.sin(i*6.7+(f.seed||0)*2+time*38)*9*Math.sin(t*Math.PI);points.push([x+(xx-x)*t+nx*noise,y+(yy-y)*t+ny*noise]);}points.push([xx,yy]);
  for(let i=1;i<points.length;i++){const q=points[i-1],r=points[i];p.line(...q,...r,alpha(c,.14*fade),6);p.line(...q,...r,alpha(c,.8*fade),1.4);p.line(...q,...r,alpha('#f0eeff',fade),.4);if(p.detail>1.4&&i%4===0){const t=i/n;p.line(...r,r[0]+nx*14*Math.sin(i),r[1]+ny*14*Math.sin(i),alpha(c,.5*fade),.6);}}
 }else{
  p.line(x,y,xx,yy,alpha(c,.09*fade),10);p.line(x,y,xx,yy,alpha(c,.3*fade),4.3);p.line(x,y,xx,yy,alpha(c,.9*fade),1.6);p.line(x,y,xx,yy,alpha('#fff4de',fade),.5);
  if(p.detail>1.4){const n=Math.min(28,Math.ceil(length/24));for(let i=0;i<n;i++){const t=((i/n+(id==='siphon'?-1:1)*time*1.6)%1+1)%1,qx=x+(xx-x)*t,qy=y+(yy-y)*t;if(id==='siphon'){p.line(qx+nx*3,qy+ny*3,qx+nx*3-Math.cos(a)*7,qy+ny*3-Math.sin(a)*7,alpha(c,.85*fade),.8);p.ring(qx,qy,3,alpha(c,.3*fade),.5);}else p.line(qx+nx*2,qy+ny*2,qx+nx*5,qy+ny*5,alpha(c,.4*fade),.4);}}
 }
 p.glow(x,y,5,c,fade);p.glow(xx,yy,id==='tesla'?7:5,c,fade);p.ring(xx,yy,2+6*(1-fade),alpha(c,.65*fade),.7);
}
export function renderProjectile(p,b,time){
 const id=b.weapon||'cannon',c=effectColor(id),x=b.x,y=b.y,a=Math.atan2(b.vy,b.vx),ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux,near=p.detail>1.4;
 const point=(along,across)=>[x+ux*along+nx*across,y+uy*along+ny*across];
 if(p.simple){p.line(x,y,x-ux*14,y-uy*14,c,2);return;}
 if(['homing','rocket','siege'].includes(id)){
  const size=id==='siege'?2:1,trail=b.trail||[];
  for(let i=trail.length-1;i>=0;i-=near?1:2){const q=trail[i],t=1-i/(trail.length||1);p.disc(q.x,q.y,(3+i*.75)*size,alpha('#83928c',.035*t));if(i<4)p.disc(q.x,q.y,(2+i*.5)*size,alpha(c,.14*t));}
  p.glow(...point(-9*size,0),6*size,c);p.poly([point(-8*size,-2*size),point((-17-Math.sin(time*60)*3)*size,0),point(-8*size,2*size)],alpha(c,.8));p.line(...point(-9*size,0),...point(-16*size,0),'#fff0bf',1.4*size);
  p.poly([point(8*size,0),point(3*size,-2.4*size),point(-8*size,-2.4*size),point(-8*size,2.4*size),point(3*size,2.4*size)],'#adb5ae');p.poly([point(8*size,0),point(2*size,-2.1*size),point(2*size,2.1*size)],c);
  if(near){p.line(...point(2*size,0),...point(-7*size,0),'#353d3c',.65);for(const side of [-1,1]){p.poly([point(-3*size,side*2*size),point(-8*size,side*5*size),point(-7*size,side*2*size)],'#6d7e78');p.line(...point(-2*size,side*2.3*size),...point(2*size,side*2.3*size),'#e7e3cf',.5);}p.line(...point(-6*size,-2),...point(-6*size,2),'#35453e',.6);}
 }else if(id==='mine'){
  const armed=b.t<=8;const points=[];for(let i=0;i<6;i++){const q=i*Math.PI/3;points.push([x+Math.cos(q)*6,y+Math.sin(q)*6]);}p.poly(points,'#6c7672');p.ring(x,y,5,'#d2bfb1',.7);p.disc(x,y,2,armed?c:'#afa780');p.glow(x,y,4,c,.6);for(let i=0;i<4;i++){const q=i*Math.PI/2+time*.3;p.line(x+Math.cos(q)*6,y+Math.sin(q)*6,x+Math.cos(q)*9,y+Math.sin(q)*9,'#8c9e92',.8);}if(near){p.ring(x,y,12+Math.sin(time*5)*2,alpha(c,armed?.35:.1),.5);p.disc(x+3,y-2,.6,Math.sin(time*9)>0?'#ffe7d0':'#515c57');}
 }else if(id==='plasma'){
  p.glow(x,y,11,c);p.disc(x,y,6,c);p.disc(x+1,y-1,2.7,'#eef9d6');p.ring(x,y,8,alpha(c,.65),1,time*3,time*3+4.3);p.ring(x,y,10,alpha(c,.35),.6,-time*2,-time*2+3);if(near)for(let i=0;i<5;i++){const q=time*4+i*1.256;p.line(x+Math.cos(q)*4,y+Math.sin(q)*4,x+Math.cos(q+.25)*12,y+Math.sin(q+.25)*12,alpha(c,.7),.55);}for(let i=0;i<(near?8:3);i++)p.disc(...point(-10-i*5,Math.sin(time*9+i)*2),4+i*.6,alpha(c,.12*(1-i/9)));
 }else if(id==='disruptor'||id==='ion'){
  p.glow(x,y,5,c);p.line(...point(3,0),...point(-28,0),alpha(c,.25),4);p.line(...point(4,0),...point(-23,0),'#e3f3ff',.7);
  for(let i=0;i<(near?12:5);i++){const t=i/(near?12:5),q=time*16+t*9,off=Math.sin(q)*3.5;for(const side of [-1,1])p.line(...point(-t*30,off*side),...point(-t*30-3,Math.sin(q+1)*3.5*side),alpha(c,1-t*.65),.65);}p.ring(x,y,5,alpha(c,.7),.8);
 }else if(id==='particle'||id==='rail'){
  const len=id==='rail'?80:55;p.line(...point(8,0),...point(-len,0),alpha(c,.08),7);p.line(...point(7,0),...point(-len,0),alpha(c,.7),1.8);p.line(...point(7,0),...point(-20,0),'#fffdea',.65);p.glow(x,y,4,c);
  if(near)for(let i=0;i<5;i++){p.ring(...point(-8-i*9,0),2+i*.4,alpha(c,.5-i*.08),.45);p.line(...point(-15-i*9,2),...point(-20-i*9,2),alpha(c,.3),.45);}
 }else if(id==='flame'){
  const age=1-b.t/.38;for(let i=0;i<(near?7:3);i++){const offset=Math.sin(time*13+i*2)*3*(age+.2);p.disc(...point(-i*3,offset),2+age*5+i*.5,alpha(i<2?'#ffd6a1':c,.35-i*.04));}p.disc(x,y,1.5,'#ffeabf');
 }else{
  const pulse=id==='pulse',len=pulse?19:id==='flak'?10:17;p.line(...point(2,0),...point(-len,0),alpha(c,.12),pulse?6:3);p.line(...point(2,0),...point(-len,0),alpha(c,.8),pulse?2.2:1.2);p.line(...point(2,0),...point(-4,0),'#fff2d7',.65);p.glow(x,y,pulse?4:2.5,c,.7);if(near){p.line(...point(-2,-.7),...point(-6,-.7),'#5e6359',.55);p.disc(...point(2,0),.7,'#fff9e8');}
 }
}
export function renderVisual(p,f,time){
 if(f.beam){renderBeam(p,f,time);return;}const age=Math.max(0,(f.max||1)-f.t),life=Math.max(.001,f.max||1),t=Math.max(0,Math.min(1,age/life)),fade=1-t,c=f.color||effectColor(f.weapon),x=f.x,y=f.y,size=f.size||12,seed=f.seed||0,near=p.detail>1.4;
 if(f.effect==='muzzle'){
  const a=f.a||0,ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux,r=size*(.35+fade);p.glow(x,y,r*.7,c,fade);for(let i=0;i<3;i++){const w=(3-i)*fade;p.poly([[x+nx*w,y+ny*w],[x+ux*r*(1.5-i*.2),y+uy*r*(1.5-i*.2)],[x-nx*w,y-ny*w]],alpha(i===2?'#fff6da':c,fade*(.35+i*.2)));}if(near)for(let i=0;i<4;i++){const aa=a+(i-1.5)*.5;p.line(x+Math.cos(aa)*r*.4,y+Math.sin(aa)*r*.4,x+Math.cos(aa)*r,y+Math.sin(aa)*r,alpha(c,fade*.6),.55);}
 }else if(f.effect==='explosion'){
  const expansion=size*(.3+t*1.8),hot=Math.max(0,1-t*3.3);p.glow(x,y,expansion,c,fade*1.5);p.ring(x,y,size*(.4+t*2.3),alpha(c,fade*fade*.55),Math.max(.4,2*fade));if(hot>0){p.disc(x,y,size*(.15+hot*.45),alpha('#ffe4aa',hot*.6));p.disc(x,y,size*.2*hot,'#fff3d4');}
  for(let i=0;i<(near?16:7);i++){const a=hash(seed+i)*Math.PI*2,v=size*(.5+hash(seed+i+50)*2),r=v*t;const qx=x+Math.cos(a)*r,qy=y+Math.sin(a)*r;const dark=alpha('#57615a',fade*.18);p.disc(qx,qy,size*(.09+t*.14)*(1+hash(i)),dark);if(i%2===0){const rr=(1+hash(seed+i+9)*2)*fade;p.poly([[qx-rr,qy-rr*.5],[qx+rr,qy-rr],[qx+rr*.5,qy+rr]],alpha('#aeb3a2',fade*.75));}p.line(qx,qy,qx-Math.cos(a)*size*.15*fade,qy-Math.sin(a)*size*.15*fade,alpha(c,fade*.7),.6);}
 }else if(f.effect==='shield'){
  p.glow(x,y,size*.65,c,fade);for(let j=0;j<3;j++)p.ring(x,y,size*(.15+t*(1+j*.2)),alpha(c,fade*(.8-j*.2)),.6);if(near)for(let i=0;i<6;i++){const a=i*Math.PI/3,r=size*(.2+t*.7),hx=x+Math.cos(a)*r,hy=y+Math.sin(a)*r;const pts=[];for(let j=0;j<7;j++){const aa=j*Math.PI/3;pts.push([hx+Math.cos(aa)*size*.16,hy+Math.sin(aa)*size*.16]);}for(let j=1;j<pts.length;j++)p.line(...pts[j-1],...pts[j],alpha(c,fade*.4),.4);}
 }else if(f.effect==='impact'){
  const hot=Math.max(0,1-t*4);p.glow(x,y,size*(.25+hot*.5),c,fade);p.ring(x,y,2+t*size,alpha(c,fade*.6),.6);if(hot>0){p.disc(x,y,3*hot,'#fff4d2');p.line(x-size*hot,y,x+size*hot,y,alpha(c,hot),.6);}
  for(let i=0;i<(near?12:5);i++){const a=(f.a||0)+Math.PI+(hash(seed+i)-.5)*2.9,r=(9+hash(seed+i+13)*size*3)*t,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;const tail=(3+hash(seed+i+7)*8)*fade;p.line(px,py,px-Math.cos(a)*tail,py-Math.sin(a)*tail,alpha(i%3===0?'#fff0c5':c,fade),i%4===0?1:.5);if(near&&i%3===0)p.disc(px,py,.8*fade,alpha('#d0c8b0',fade));}if(near)p.disc(x,y,3+t*6,alpha('#424c46',fade*.14));
  const id=f.weapon||'cannon';
  if(['ion','disruptor','siphon'].includes(id)){for(let j=0;j<3;j++){const a=time*(j%2?4:-4)+j*2;p.ring(x,y,size*(.3+t*.9)+j*2,alpha(c,fade*.65),.55,a,a+3.7);}if(near)for(let j=0;j<6;j++){const a=j*Math.PI/3+time*2,r=size*(.3+t);p.disc(x+Math.cos(a)*r,y+Math.sin(a)*r,.8,alpha('#e4ebff',fade));}}
  else if(id==='tesla'){for(let j=0;j<(near?5:2);j++){const a=j*2.4+seed,dx=Math.cos(a)*size*(.2+t),dy=Math.sin(a)*size*(.2+t);p.line(x,y,x+dx*.5+4,y+dy*.5-3,alpha(c,fade),.6);p.line(x+dx*.5+4,y+dy*.5-3,x+dx,y+dy,alpha(c,fade),.6);}}
  else if(id==='plasma'||id==='flame'){for(let j=0;j<(near?7:3);j++){const a=hash(seed+j+22)*Math.PI*2,r=size*t*.8;p.disc(x+Math.cos(a)*r,y+Math.sin(a)*r,(1.5+hash(j)*3)*fade,alpha(j%2?c:'#f0cf98',fade*.4));}p.ring(x,y,size*.4*fade,alpha(c,fade*.7),1.1);}
  else if(id==='rail'||id==='particle'){const a=f.a||0,ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux;for(let j=0;j<3;j++){const length=size*(.5+t*1.5),width=(3+j*2)*fade;p.line(x+nx*width,y+ny*width,x+ux*length,y+uy*length,alpha(c,fade*(.6-j*.15)),.5);p.line(x-nx*width,y-ny*width,x+ux*length,y+uy*length,alpha(c,fade*(.6-j*.15)),.5);}}
  else if(near&&['laser','pulse'].includes(id)){for(let j=0;j<5;j++){const a=hash(seed+j+40)*6.28,r=size*t*.5;const xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;p.disc(xx,yy,.7+fade,alpha('#ffd0a0',fade*.65));p.line(xx,yy,xx+Math.cos(a)*3,yy+Math.sin(a)*3,alpha(c,fade*.7),.4);}}

 }else if(f.pulse){p.ring(x,y,(1-f.t/f.max)*(f.r||440),'#c5d8bb',1);p.ring(x,y,(1-f.t/f.max)*(f.r||420),'#57685a',.6);}else p.disc(x,y,Math.max(.3,f.t*1.5),'#b9b7a5');
}
export function renderHullDetail(p,e,r,time,mounts=[],loadout=[]){
 if(p.detail<.9)return;const a=e.a,ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux,point=(along,across)=>[e.x+ux*along+nx*across,e.y+uy*along+ny*across];
 // Inset armor plates, seams, cooling fins, recessed cockpit and tiny fasteners.
 for(const side of [-1,1]){const pts=[point(r*.12,side*r*.17),point(-r*.27,side*r*.43),point(-r*.51,side*r*.36),point(-r*.32,side*r*.13)];p.poly(pts,'#647267');for(let i=1;i<pts.length;i++)p.line(...pts[i-1],...pts[i],'#35443d',.55);if(p.detail>1.5){for(let i=0;i<4;i++)p.line(...point(-r*.2-i*r*.06,side*r*.22),...point(-r*.24-i*r*.06,side*r*.33),'#293a32',.5);p.disc(...point(-r*.34,side*r*.34),.5,'#c3c4ad');p.disc(...point(-r*.15,side*r*.24),.45,'#b9c3af');}}
 p.poly([point(r*.48,0),point(r*.23,-r*.09),point(r*.05,0),point(r*.23,r*.09)],'#243d3c');p.line(...point(r*.38,-r*.02),...point(r*.18,-r*.04),'#93b8ae',.6);
 if(p.detail>1.5)for(let i=0;i<3;i++)p.disc(...point(-r*.4,i*r*.06-r*.06),.55,i===1?'#8db5a4':'#465f52');
 for(let i=0;i<mounts.length;i++){const m=mounts[i],id=loadout[i];if(!id||!['fixed','turret'].includes(m.type))continue;const [x,y]=point(m.x,m.y),ma=e.mountAngles?.[i]??a,c=effectColor(id),u=Math.cos(ma),v=Math.sin(ma),size=id==='siege'?1.35:1;
  if(m.type==='turret'){p.disc(x,y,5,'#627369');p.ring(x,y,5.5,'#34483c',.65);if(p.detail>1.5)p.ring(x,y,3.8,'#a4b49b',.4,ma+.5,ma+4.8);}
  p.line(x,y,x+u*13*size,y+v*13*size,'#34443c',4*size);p.line(x,y,x+u*13*size,y+v*13*size,'#9ba994',2*size);p.line(x+u*5,y+v*5,x+u*12*size,y+v*12*size,c,.7);
  if(p.detail>1.5){const vpoint=(along,across)=>[x+u*along-v*across,y+v*along+u*across];
   if(['homing','rocket','siege','mine'].includes(id)){p.poly([vpoint(-3,-4),vpoint(8,-4),vpoint(8,4),vpoint(-3,4)],'#65786a');for(let j=0;j<3;j++)for(const side of [-1,1]){const q=vpoint(j*3,side*2);p.disc(...q,1.1,'#253c30');p.disc(...q,.45,c);}}
   else if(['laser','pulse','plasma','ion','disruptor','siphon','tesla'].includes(id)){p.disc(x+u*6,y+v*6,3.2,'#314c3c');for(let j=0;j<3;j++)p.ring(x+u*(5+j*2),y+v*(5+j*2),2.6-j*.3,c,.45);p.disc(x+u*12,y+v*12,1,c);}
   else if(['particle','rail'].includes(id)){for(const side of [-1,1]){p.line(...vpoint(1,side*2.5),...vpoint(15,side*2.5),'#344b3f',1.6);p.line(...vpoint(2,side*2.5),...vpoint(14,side*2.5),c,.5);}}
   else if(id==='gatling'){for(const side of [-1,0,1])p.line(...vpoint(3,side*1.8),...vpoint(13,side*1.8),'#2d4235',.8);p.ring(x+u*11,y+v*11,2.8,'#a3b098',.5);}
   for(let j=0;j<3;j++){const q=5+j*2.4;p.line(x+u*q-v*2,y+v*q+u*2,x+u*q+v*2,y+v*q-u*2,'#3b5244',.6);}p.disc(x+u*13*size,y+v*13*size,1.3,'#26372e');}
 }
 if(p.detail>1.2)for(const scar of e.scars||[]){const [x,y]=point(scar.x,scar.y),age=Math.max(0,time-scar.born),fade=Math.max(0,1-age/45);if(!fade)continue;p.disc(x,y,scar.size*1.5,alpha('#24312d',fade*.55));p.ring(x,y,scar.size,alpha('#a08963',fade*.6),.6);const aa=scar.a+a;p.line(x-Math.cos(aa)*scar.size,y-Math.sin(aa)*scar.size,x+Math.cos(aa)*scar.size,y+Math.sin(aa)*scar.size,alpha('#18251f',fade),1);if(age<3)p.disc(x,y,scar.size*.35,alpha(effectColor(scar.weapon),(1-age/3)*.7));}
}
