// Fixed projectile records: 0.25m/0.25m/s precision; JSON-safe base64.
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function packShots(shots){
 const bytes=[];const put=(n,count)=>{n=Math.round(n);for(let i=0;i<count;i++){bytes.push(n&255);n>>=8;}};
 for(const b of shots){put(b[0],4);for(let i=1;i<=4;i++)put(b[i]*4,2);put(b[5]*20,2);put(b[6],1);put(b[7],2);put(b[8],1);}
 let out='';for(let i=0;i<bytes.length;i+=3){const n=(bytes[i]<<16)|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);out+=alphabet[n>>>18]+alphabet[(n>>>12)&63]+(i+1<bytes.length?alphabet[(n>>>6)&63]:'=')+(i+2<bytes.length?alphabet[n&63]:'=');}return out;
}
export function unpackShots(text){
 const bytes=[];let buffer=0,bits=0;for(const c of text){if(c==='=')break;const n=alphabet.indexOf(c);if(n<0)continue;buffer=(buffer<<6)|n;bits+=6;if(bits>=8){bits-=8;bytes.push((buffer>>>bits)&255);}}
 let offset=0;const get=(count,signed=false)=>{let n=0;for(let i=0;i<count;i++)n+=bytes[offset++]*2**(8*i);if(signed&&n>=32768)n-=65536;return n;},shots=[];
 while(offset+18<=bytes.length){const b=[get(4)];for(let i=0;i<4;i++)b.push(get(2,true)/4);b.push(get(2)/20,get(1),get(2),get(1));shots.push(b);}return shots;
}
