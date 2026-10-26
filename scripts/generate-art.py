from PIL import Image,ImageDraw,ImageFilter
import numpy as np, math, random, os
out='game/assets'; os.makedirs(out,exist_ok=True)
for seed in range(10):
 rng=np.random.default_rng(seed+42); n=256
 y,x=np.mgrid[-1:1:complex(n),-1:1:complex(n)]; a=np.arctan2(y,x); r=np.sqrt(x*x+y*y)
 edge=.83+.05*np.sin(3*a+seed)+.04*np.cos(5*a+seed*2)+.025*np.sin(9*a)
 z=np.sqrt(np.maximum(0,1-(r/edge)**2)); shade=np.maximum(0,.2+.7*(-x*.7-y*.6+z*.6))
 for j in range(14):
  cx,cy=rng.uniform(-.65,.65,2); cr=rng.uniform(.045,.22); d=np.sqrt((x-cx)**2+(y-cy)**2)/cr
  shade-=.4*np.exp(-d*d*2); shade+=.22*np.exp(-((d-1)/.13)**2)*(0.4+(y-cy)/cr)
 shade=np.clip(shade*.82,0,1); dot=rng.random((n,n))<shade
 im=np.zeros((n,n,4),dtype=np.uint8); im[:,:,:3]=np.where(dot[:,:,None],np.array([226,222,197]),np.array([39,40,39])); im[:,:,3]=np.where(r<edge,255,0)
 Image.fromarray(im).save(f'{out}/rock{seed}.png')
n=600; im=Image.new('RGBA',(n,n));d=ImageDraw.Draw(im)
d.ellipse((54,54,546,546),fill=(109,108,99),outline=(219,215,189),width=3)
d.ellipse((112,112,488,488),fill=(0,0,0,0),outline=(219,215,189),width=3)
for j in range(16):
 a=j*math.tau/16; pts=[]
 for rr,aa in [(191,a+.025),(247,a+.025),(247,a+.33),(191,a+.33)]:pts.append((300+rr*math.cos(aa),300+rr*math.sin(aa)))
 d.polygon(pts,fill=(199,196,174),outline=(240,236,213))
 for r in [202,217,233]:
  d.line([(300+r*math.cos(a+.05),300+r*math.sin(a+.05)),(300+r*math.cos(a+.3),300+r*math.sin(a+.3))],fill=(66,66,61),width=2)
for j in range(4):
 a=j*math.tau/4+.5;d.line((300,300,300+200*math.cos(a),300+200*math.sin(a)),fill=(153,151,134),width=14)
d.ellipse((237,237,363,363),fill=(207,203,179),outline=(239,237,213),width=4)
d.ellipse((260,260,340,340),fill=(30,32,32),outline=(117,118,105),width=9)
d.rectangle((286,539,314,586),fill=(191,187,163));d.rectangle((272,565,328,581),fill=(220,215,187))
a=np.array(im);rng=np.random.default_rng(33);grain=rng.random((n,n));a[(grain<.25)&(a[:,:,3]>0),:3]//=2;a[(grain<.055)&(a[:,:,3]>0),:3]=13
Image.fromarray(a).save(f'{out}/station.png')
# Transparent reusable print grain, kept subtle over the field.
rng=np.random.default_rng(17);a=np.zeros((256,256,4),dtype=np.uint8);a[:,:,:3]=[222,218,194];a[:,:,3]=rng.choice([0,10,22],(256,256),p=[.75,.2,.05]);Image.fromarray(a).save(f'{out}/grain.png')
