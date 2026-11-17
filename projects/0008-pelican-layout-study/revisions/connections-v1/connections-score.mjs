// The score is shared by playback, seeking and verification. No frame-dependent motion.
export const DURATION=24;
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const ramp=(t,a,b)=>smooth((t-a)/(b-a));
export const lerp=(a,b,u)=>a+(b-a)*u;
export const vector=(a,b,u)=>a.map((v,i)=>lerp(v,b[i],u));
export const METHODS=[
 {id:'walk',name:'连续行旅',kind:'空间连续',title:'走过去，远方就变成眼前。',body:'开篇就能望见蓝色水庭。旅人穿过斜照的金色回廊，越过最后一道拱，水面和月亮逐渐展开。途中没有更换世界，距离本身就是承接。',feeling:'陪伴、期待 → 山水行旅、艺术巡游',verse:'走过去，\n世界就会接住你。',kicker:'一条路，把远方慢慢带近。',end:'远方，是一步步走近的。',turn:11,arrival:16},
 {id:'portal',name:'门与传送',kind:'空间跨越',title:'门还没穿过，向往已经发生。',body:'拱门先显露靛蓝水庭，回廊仍然包围着旅人。人先过门，镜头随后越过门槛；金色石墙从两侧离开，另一个世界接住同一段步伐。',feeling:'发现、向往 → 梦境、艺术世界、时代入口',verse:'那扇门里，\n藏着另一种夜色。',kicker:'先看见，再跨越。',end:'门后的世界，原来可以走进去。',turn:10.6,arrival:15},
 {id:'detail',name:'进入细节',kind:'尺度深入',title:'眼前的一滴，装得下整个远方。',body:'先跟随旅人注意到台座上的水滴，再靠近水滴里映出的月亮。圆形视野逐渐占满眼前，水滴的局部成为水庭的整体；到达后留出时间重新辨认尺度。',feeling:'惊奇、探索 → 微观宇宙、材料、自然细节',verse:'再靠近一点，\n这一滴里有远方。',kicker:'把注意力，交给一个细节。',end:'刚才的一滴，成了此刻的天地。',turn:10.8,arrival:15},
 {id:'morph',name:'世界形变',kind:'艺术语言转译',title:'路还在，世界换了一种表达。',body:'旅人保持行走，完整的石拱逐渐拉长、倾斜、离地，赭石过渡到靛蓝。原本厚重的回廊成为悬在水面的拱形雕塑，旧形状在新世界里留下记忆。',feeling:'惊奇、流动 → 艺术语言、梦境、材料演化',verse:'还是那一道拱，\n却开始像梦一样生长。',kicker:'保留形的记忆，改变它的语法。',end:'认得来处，也看见了新的可能。',turn:11.6,arrival:17},
 {id:'time',name:'同地换时',kind:'时间连续',title:'人停在这里，时间替他远行。',body:'旅人留在同一座回廊。午后的长影转向夜色，月亮越过拱顶，最后清晨的光重新触到石墙。建筑、台阶和人物位置都保留，让时间的流动有参照。',feeling:'沉静、回望 → 昼夜、季节、城市记忆',verse:'不用离开，\n也能看见另一段时间。',kicker:'同一处坐标，三种光的记忆。',end:'换了晨光，仍是来时的地方。',turn:12,arrival:19},
 {id:'action',name:'行动触发',kind:'行为因果',title:'他伸出的手，改变了接下来的世界。',body:'旅人停下，伸手触碰石台上的光。回应从触点向外传播：脚边先浮起水纹，近处的拱先展开，远处随后变化。到达成为一个行动的结果。',feeling:'参与、回应 → 探索、唤醒、创造的主题',verse:'轻轻碰一下，\n看看世界怎样回应。',kicker:'从一个动作，生长出整个变化。',end:'世界的回答，从指尖一直延伸到远方。',turn:9.5,arrival:18},
 {id:'match',name:'形状与动作接棒',kind:'视觉联想',title:'一把伞，接住了一轮月亮。',body:'镜头从旅人抬升到伞面上方，圆形逐渐占满画面；同位置、同色调的月亮接过这个圆。镜头退开，水庭与旅人重新出现，借形状把两个空间接成一句话。',feeling:'灵巧、诗意 → 蒙太奇、意象、跨媒介表达',verse:'抬头之前，\n伞已经替你接住月亮。',kicker:'一个圆，成为下一幕的开头。',end:'离开的是伞面，留下的是一个圆。',turn:11,arrival:17}
];

export function samplePassage(id,seconds){
 const t=clamp(seconds,0,DURATION),p={id,t,world:'a',blend:0,position:[0,0,3],yaw:Math.PI,distance:0,walk:0,reach:0,camera:[6,3.9,10.5],target:[0,1.6,-3],fov:44,phase:0,disc:0,cut:false};
 const walkTo=(start,end,a,b)=>{const u=ramp(t,a,b);p.position=vector(start,end,u);p.distance=Math.hypot(end[0]-start[0],end[2]-start[2])*u;p.walk=(t>a&&t<b)?Math.min(1,ramp(t,a,a+.9)*(1-ramp(t,b-.9,b))):0;};
 if(id==='walk'){
  p.world='journey';walkTo([0,0,4],[0,0,-22],1,21);p.camera=[5.4-2*ramp(t,12,23),4+1.1*ramp(t,16,24),p.position[2]+9+3*ramp(t,17,24)];p.target=[0,1.45,p.position[2]-5];p.blend=ramp(t,6,17);
 }else if(id==='portal'){
  walkTo([0,0,3],[0,0,-17],3,21);p.camera=[2.2*(1-ramp(t,2,9)),3,p.position[2]+7.3];p.target=[0,1.7,p.position[2]-4];p.portalTravel=p.position[2];p.blend=ramp(t,2,5);p.world=p.camera[2]>-4.48?'a':'b';p.destinationCamera=p.camera.map((v,i)=>i===2?v+12:v);p.destinationTarget=p.target.map((v,i)=>i===2?v+12:v);p.destinationPosition=[0,0,p.position[2]+12];
 }else if(id==='detail'){
  p.reach=ramp(t,2,5)*(1-ramp(t,8,10));const u=ramp(t,5,12);p.camera=vector([4.8,3.3,9],[.03,1.73,1.55],u);p.target=vector([0,1.5,-2],[0,1.72,.2],u);p.disc=ramp(t,7,13);p.blend=ramp(t,7,13);p.destinationCamera=vector([0,4.4,13.5],[5.5,4.7,11],ramp(t,13,23));p.destinationTarget=vector([0,6,-20],[0,1.8,-3],ramp(t,13,18));p.destinationPosition=[0,0,3-3*ramp(t,15,21)];
 }else if(id==='morph'){
  walkTo([0,0,3],[0,0,-3],1,20);p.blend=ramp(t,5.5,17);p.camera=[6-2*ramp(t,8,20),3.6+1.5*ramp(t,10,24),p.position[2]+10];p.target=[0,1.8,-5];
 }else if(id==='time'){
  p.phase=ramp(t,3,22)*2;p.camera=[6-2*ramp(t,0,24),3.7,10.5];p.target=[0,1.6,-3];p.yaw=Math.PI-.18;p.blend=p.phase<1?p.phase:2-p.phase;
 }else if(id==='action'){
  p.position=[0,0,1];p.reach=ramp(t,2.5,6)*(1-ramp(t,11,14));p.wave=lerp(-.3,50,ramp(t,6,20));p.blend=ramp(t,6,20);p.camera=vector([4.4,2.8,7],[5.5,4.5,10.5],ramp(t,8,23));p.target=[0,1.4,-3];
 }else if(id==='match'){
  const rise=ramp(t,3,7),zoom=ramp(t,7,11);p.camera=vector([6,3.9,10.5],[-.40,9,2.82],rise);p.camera=vector(p.camera,[-.40,5.65,2.82],zoom);p.target=vector([0,1.6,-3],[-.40,2.45,2.82],rise);p.fov=44;p.cut=t>=11;p.world=p.cut?'b':'a';const out=ramp(t,11,21);p.destinationCamera=vector([0,10,-13.3],[6,6.5,14],out);p.destinationTarget=vector([0,10,-28],[0,1.7,-2],ramp(t,11,18));p.destinationPosition=[0,0,2-2*ramp(t,17,22)];p.blend=out;
 }
 return p;
}
