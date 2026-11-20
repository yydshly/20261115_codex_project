// Compressed-height upland meadow and peatland. No peat growth or groundwater simulation.
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const UPLAND={minX:-1410,maxX:-1190,minZ:0,maxZ:600};
export const PEAT={x:-1300,z:230,rx:52,rz:62,level:235.15};
export const UPLAND_STAGES=['高原与微地形','草毡与泥炭','塘群与溪流','低矮植被群落'];
export const UPLAND_SITES=[
 {id:'upland-meadow',name:'高原草甸与开阔起伏',terrain:'高原草甸',x:-1225,z:80,floor:244,targetX:-1300,targetZ:90,targetY:243},
 {id:'upland-peat',name:'草丘与泥炭浅洼',terrain:'泥炭湿地',x:-1225,z:230,floor:239,targetX:-1290,targetZ:230,targetY:235.3},
 {id:'upland-pools',name:'相连浅水塘群',terrain:'浅水塘群',x:-1225,z:392,floor:234,targetX:-1285,targetZ:392,targetY:230.15},
 {id:'upland-stream',name:'塘群出水与高原溪流',terrain:'高原溪流',x:-1275,z:520,floor:229,targetX:-1295,targetZ:520,targetY:222.2}
].map((r,index)=>({...r,index,upland:true}));
export const UPLAND_POOLS=[{x:-1325,z:350,rx:17,rz:13,level:232,depth:2.4},{x:-1285,z:392,rx:18,rz:14,level:230,depth:2.2},{x:-1320,z:430,rx:17,rz:13,level:228,depth:2.2},{x:-1295,z:515,rx:9,rz:8,level:222,depth:1.6},{x:-1295,z:555,rx:12,rz:9,level:220,depth:1.6}];
export const uplandWeight=(x,z)=>smooth((x+1410)/30)*smooth((-1190-x)/30)*smooth(z/25)*smooth((600-z)/25);
export function uplandChannel(i,t){const a=UPLAND_POOLS[i],b=UPLAND_POOLS[i+1],length=Math.hypot(b.x-a.x,b.z-a.z),start=(Math.max(a.rx,a.rz)+2)/length,end=1-(Math.max(b.rx,b.rz)+2)/length,u=clamp((t-start)/(end-start));return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,level:a.level+(b.level-a.level)*u,half:2,depth:1.4,t,i};}
export function uplandFields(x,z){return UPLAND_POOLS.slice(1).map((b,i)=>{const a=UPLAND_POOLS[i],dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),p=uplandChannel(i,t);return {...p,distance:Math.hypot(x-p.x,z-p.z)};});}
export function uplandGuide(x,z){let best={distance:Infinity,y:244};for(let i=1;i<4;i++){const a=UPLAND_SITES[i-1],b=UPLAND_SITES[i],dx=b.x-a.x,dz=b.z-a.z,u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)),distance=Math.hypot(x-a.x-dx*u,z-a.z-dz*u);if(distance<best.distance)best={distance,y:a.floor+(b.floor-a.floor)*u};}return best;}
export function uplandBed(x,z){let h=242-.035*(z-60)+Math.sin(x*.08)*Math.cos(z*.03),r=Math.hypot((x-PEAT.x)/PEAT.rx,(z-PEAT.z)/PEAT.rz);if(r<1.25){const target=235.1+.6*Math.sin(x*.13)*Math.cos(z*.12)+.3*r*r,k=1-smooth((r-.8)/.45);h=h*(1-k)+target*k;}const fields=uplandFields(x,z);for(const p of fields){if(p.distance>12)continue;const target=p.level-1.4+2.6*smooth((p.distance-p.half)/5),k=1-smooth((p.distance-7)/5);h=h*(1-k)+target*k;}for(const p of UPLAND_POOLS){const r=Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz);if(r>=1.4)continue;const target=p.level-p.depth*Math.max(0,1-r*r)+4*Math.max(0,r-1),k=1-smooth((r-1)/.4),channelBlend=Math.max(0,...fields.filter(f=>f.t>0&&f.t<1).map(f=>1-smooth((f.distance-f.half)/5))),normal=h*(1-k)+target*k,joined=h*(1-k)+Math.min(h,target)*k;h=normal*(1-channelBlend)+joined*channelBlend;}for(const p of fields)if(p.distance<p.half+5){const k=1-smooth((p.distance-p.half)/5),target=p.level-1.4+2.6*smooth((p.distance-p.half)/5);h=h*(1-k)+Math.min(h,target)*k;}const g=uplandGuide(x,z),k=1-smooth((g.distance-2)/4);return h*(1-k)+g.y*k;}
export function uplandTerrain(x,z,h){
 if(x< -1565||x> -1010||z< -90||z>660)return h;
 const westFoot=-1545+10*Math.sin(z*.017),eastFoot=-1020+16*Math.sin(z*.014);
 let section=30+(242-.035*(z-60)-30)*Math.min(smooth((x-westFoot)/173),smooth((eastFoot-x)/220));
 // A low divide keeps plateau runoff out of the saline hollows. Its far
 // side falls into a dry swale, which grades down toward the southern slope.
 const swaleX=-1480+7*Math.sin(z*.014),rimX=-1526+5*Math.sin(z*.018);
 const low=46-.045*(z+40),length=smooth((z+90)/100)*smooth((660-z)/110);
 const swale=(1-smooth(Math.abs(x-swaleX)/50))*length;
 section+=(low-section)*swale;
 section=Math.max(section,30+26*(1-smooth(Math.abs(x-rimX)/39))*length);
 const skirt=smooth((x+1565)/54)*smooth((-1010-x)/94)*smooth((z+90)/110)*smooth((660-z)/102);
 const ground=h+(section-h)*skirt;
 const w=uplandWeight(x,z);
 return w?ground+(uplandBed(x,z)-ground)*w:ground;
}
export function uplandWaterLevel(x,z){if(Math.hypot((x-PEAT.x)/PEAT.rx,(z-PEAT.z)/PEAT.rz)<1.2)return PEAT.level;for(const p of UPLAND_POOLS)if(Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz)<1)return p.level;const f=uplandFields(x,z).filter(p=>p.distance<p.half+7).sort((a,b)=>a.distance-b.distance)[0];return f?.level??null;}
export function uplandWaterAt(x,z){if(uplandWeight(x,z)<.98)return null;const level=uplandWaterLevel(x,z),bed=uplandBed(x,z);return level!==null&&bed<level?{level,bed,depth:level-bed,upland:true,fresh:true,salt:0}:null;}
export function uplandHabitat(x,z){if(uplandWeight(x,z)<.98)return null;const peat=Math.hypot((x-PEAT.x)/PEAT.rx,(z-PEAT.z)/PEAT.rz),water=uplandWaterAt(x,z);return {peat,water,moist:peat<1.2||uplandFields(x,z).some(p=>p.distance<12)};}
export function uplandColor(x,z){const f=uplandHabitat(x,z);if(!f)return null;if(f.water)return [97,131,122];if(f.peat<1.1)return [102,112,78];return f.moist?[112,135,86]:[133,153,99];}
export const uplandReserved=(x,z)=>uplandWeight(x,z)>.001;
export const uplandNearTile=(x,z)=>x> -1630&&x< -930&&z> -165&&z<745;
