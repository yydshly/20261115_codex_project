// Original vector asset. All paths, colors and animation data are authored here.
// Three segments: uploading 0–90, delivered 90–165, retry 165–240 (30fps).
const color=h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255,1];
const fixed=k=>({a:0,k});
const animated=frames=>({a:1,k:frames.map(([t,s],i)=>({t,s:Array.isArray(s)?s:[s],...(i<frames.length-1?{e:Array.isArray(frames[i+1][1])?frames[i+1][1]:[frames[i+1][1]],i:{x:[.66],y:[1]},o:{x:[.33],y:[0]}}:{})}))});
const fill=h=>({ty:'fl',c:fixed(color(h)),o:fixed(100),r:1});
const stroke=(h,w)=>({ty:'st',c:fixed(color(h)),o:fixed(100),w:fixed(w),lc:2,lj:2,ml:4});
const ellipse=(x,y,w,h=w)=>({ty:'el',p:fixed([x,y]),s:fixed([w,h]),d:1});
const rect=(x,y,w,h,r=0)=>({ty:'rc',p:fixed([x,y]),s:fixed([w,h]),r:fixed(r),d:1});
const path=(vertices,closed=false)=>({ty:'sh',ks:fixed({v:vertices,i:vertices.map(()=>[0,0]),o:vertices.map(()=>[0,0]),c:closed})});
const group=items=>({ty:'gr',it:[...items,{ty:'tr',p:fixed([0,0]),a:fixed([0,0]),s:fixed([100,100]),r:fixed(0),o:fixed(100),sk:fixed(0),sa:fixed(0)}],nm:'Original vector group'});
let id=0;const layer=(name,shapes,overrides={})=>({ddd:0,ind:++id,ty:4,nm:name,sr:1,ks:{o:fixed(100),r:fixed(0),p:fixed([200,200,0]),a:fixed([0,0,0]),s:fixed([100,100,100]),...overrides},ao:0,shapes:shapes.map(group),ip:0,op:240,st:0,bm:0});
export function makeCloudpostAsset(){id=0;const layers=[];
 // Foreground: successful delivery symbol with a drawn path.
 layers.push(layer('Delivered / hand-drawn check',[[path([[-28,0],[-8,20],[31,-24]]),stroke('#f4f7e8',9),{ty:'tm',s:fixed(0),e:animated([[0,0],[96,0],[126,100],[164,100],[165,0],[240,0]]),o:fixed(0),m:1}]],{p:fixed([200,209,0]),o:animated([[0,0],[92,0],[96,100],[164,100],[165,0],[240,0]])}));
 layers.push(layer('Delivered / seal',[[ellipse(0,0,108),fill('#54775b')],[ellipse(0,0,128),stroke('#9eb98b',1)]],{p:fixed([200,209,0]),s:animated([[0,[0,0,100]],[90,[0,0,100]],[112,[100,100,100]],[148,[100,100,100]],[164,[80,80,100]],[165,[0,0,100]],[240,[0,0,100]]])}));
 // Retry: an intentionally different, reusable state.
 layers.push(layer('Retry / cross',[[path([[-18,-18],[18,18]]),stroke('#f8eee0',8)],[path([[18,-18],[-18,18]]),stroke('#f8eee0',8)]],{p:fixed([200,209,0]),o:animated([[0,0],[174,0],[185,100],[239,100],[240,0]]),r:animated([[0,0],[180,0],[188,-7],[195,7],[202,0],[240,0]])}));
 layers.push(layer('Retry / seal',[[ellipse(0,0,108),fill('#b87959')],[ellipse(0,0,128),stroke('#cda78a',1)]],{p:fixed([200,209,0]),s:animated([[0,[0,0,100]],[165,[0,0,100]],[185,[100,100,100]],[240,[100,100,100]]])}));
 // The document has a folded corner, ruled text and its own shadow.
 const docOpacity=animated([[0,100],[87,100],[99,0],[164,0],[165,0],[240,0]]);
 layers.push(layer('Upload / document',[[path([[-31,-44],[10,-44],[31,-22],[31,44],[-31,44]],true),fill('#fffdef'),stroke('#90a67a',1.4)],[path([[10,-44],[10,-22],[31,-22]],false),stroke('#90a67a',1.4)],[path([[-18,-8],[18,-8]]),stroke('#bbc9a5',3)],[path([[-18,4],[18,4]]),stroke('#bbc9a5',3)],[path([[-18,16],[7,16]]),stroke('#bbc9a5',3)],[ellipse(14,30,6),fill('#78986c')]],{p:animated([[0,[200,197,0]],[22,[200,184,0]],[45,[200,197,0]],[67,[200,184,0]],[90,[200,197,0]],[240,[200,197,0]]]),o:docOpacity,r:animated([[0,-5],[45,5],[90,-5],[240,-5]])}));
 layers.push(layer('Upload / progress orbit',[[ellipse(0,0,150),stroke('#87a86f',2),{ty:'tm',s:fixed(0),e:fixed(22),o:fixed(0),m:1}]],{p:fixed([200,203,0]),r:animated([[0,0],[90,720],[240,720]]),o:docOpacity}));
 // A cloud assembled from original vector forms; no embedded imagery.
 layers.push(layer('Cloud / contour',[[ellipse(-47,20,92),ellipse(7,-3,130),ellipse(66,27,78),rect(9,47,141,66,20),fill('#d7e3c4')]],{p:fixed([200,221,0])}));
 layers.push(layer('Cloud / depth',[[ellipse(-47,20,92),ellipse(7,-3,130),ellipse(66,27,78),rect(9,47,141,66,20),fill('#b7cc9f')]],{p:fixed([200,228,0])}));
 // Sparkle paths reveal around the success seal.
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,dx=Math.cos(a),dy=Math.sin(a);layers.push(layer('Delivered / sparkle '+i,[[path([[dx*92,dy*92],[dx*111,dy*111]]),stroke(i%2?'#c5a76d':'#7a9c68',3)]],{p:fixed([200,209,0]),o:animated([[0,0],[96+i,0],[110+i,100],[137+i,100],[161,0],[240,0]]),s:animated([[0,[80,80,100]],[98,[80,80,100]],[130,[110,110,100]],[164,[120,120,100]],[240,[120,120,100]]])}));}
 layers.push(layer('Orbiting satellite',[[ellipse(0,-141,9),fill('#a4b37c')]],{r:animated([[0,0],[90,180],[165,310],[240,480]])}));
 layers.push(layer('Fine orbit',[[ellipse(0,0,282),stroke('#b9c7a7',.8)],[ellipse(0,0,317),stroke('#c7d0b9',.6)]],{p:fixed([200,209,0])}));
 layers.push(layer('Small stars',[[path([[-136,-67],[-122,-67]]),path([[-129,-74],[-129,-60]]),stroke('#8aa071',2)],[path([[123,67],[135,67]]),path([[129,61],[129,73]]),stroke('#9aad7f',2)],[ellipse(110,-110,5),fill('#bdaa7e')],[ellipse(-116,100,4),fill('#8aa071')]],{r:animated([[0,-3],[120,3],[240,-3]])}));
 layers.push(layer('Atmospheric discs',[[ellipse(0,0,247),fill('#e2e9d2')],[ellipse(0,0,210),fill('#edf0dd')]],{p:fixed([200,209,0])}));
 return{v:'5.13.0',fr:30,ip:0,op:240,w:400,h:400,nm:'Cloudpost / Original state illustration',ddd:0,assets:[],markers:[{tm:0,cm:'uploading',dr:90},{tm:90,cm:'delivered',dr:75},{tm:165,cm:'retry',dr:75}],layers};
}
