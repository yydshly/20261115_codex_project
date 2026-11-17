import {pathLines,MAILBOX} from './arrangement.mjs';
import {drawSample} from './free-assets.mjs';
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
export function drawPaths(c,l){
 c.save();c.lineJoin='round';c.lineCap='round';
 for(const line of pathLines(l)){c.beginPath();line.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle='#52694e42';c.lineWidth=32;c.stroke();c.strokeStyle=l.material==='earth'?'#bdb18b':'#a9ab99';c.lineWidth=25;c.stroke();c.strokeStyle='#d9cba245';c.lineWidth=17;c.stroke();
  if(l.material==='stone'){c.strokeStyle='#6c79664c';c.lineWidth=1;for(let i=1;i<line.length;i++){const [ax,ay]=line[i-1],[bx,by]=line[i],d=Math.hypot(bx-ax,by-ay),nx=-(by-ay)/d*11,ny=(bx-ax)/d*11;for(let n=9;n<d;n+=19){const x=ax+(bx-ax)*n/d,y=ay+(by-ay)*n/d;c.beginPath();c.moveTo(x+nx,y+ny);c.lineTo(x-nx,y-ny);c.stroke();}}}
 }
 // The one real crossing remains visible and traversable with every route.
 rect(c,'#526e5d77',461,411,133,30);for(let x=464;x<=586;x+=9){rect(c,'#b9ac86',x,405,8,33);rect(c,'#d2c29b',x,406,7,3);}rect(c,'#8e8165',460,401,135,4);rect(c,'#8e8165',460,435,135,4);for(let x=461;x<=594;x+=33){rect(c,'#8a8063',x,394,4,14);rect(c,'#d5c8a3',x,393,4,2);}c.restore();
}
export function drawFurniture(c,l,assets,time){const {x,y}=l.bench;c.save();c.translate(x-366,y-500);
 rect(c,'#61735566',323,503,83,14);rect(c,'#6b654d',330,489,4,18);rect(c,'#6b654d',393,489,4,18);rect(c,'#a4966d',324,483,80,8);rect(c,'#c1b184',324,481,80,3);rect(c,'#b5a37b',326,469,77,9);rect(c,'#7c7656',330,476,3,8);rect(c,'#7c7656',394,476,3,8);
 rect(c,'#786a50',416,485,3,16);rect(c,'#786a50',442,485,3,16);rect(c,'#ac976e',410,482,40,6);rect(c,'#c8b58b',410,481,40,2);drawSample(c,assets,'bread',423,485,{time});drawSample(c,assets,'apple',438,484,{time});c.restore();}
export function drawMailbox(c,story){const {x,y}=MAILBOX;rect(c,'#74664d',x-3,y-21,5,23);rect(c,'#b2966f',x-13,y-40,27,21);rect(c,'#d1b88b',x-14,y-42,28,5);rect(c,'#605f4b',x-7,y-35,14,2);rect(c,'#ede0bb',x-7,y-29,14,7);rect(c,'#ad9a74',x-7,y-23,14,1);
 if(story?.delivered.some(id=>!story.read.includes(id))){rect(c,'#cf9c6e',x+14,y-41,3,19);rect(c,'#efd6a2',x+17,y-41,9,7);c.fillStyle='#fff1c8';c.font='10px "Microsoft YaHei"';c.textAlign='center';c.fillText('有来信',x,y-49);}}
export function drawLayoutPreview(c,l,selected,valid){const p=selected==='bench'?l.bench:l.pots.find(p=>p.id===selected);if(!p)return;c.save();c.strokeStyle=valid?'#f7e8b6':'#d68e62';c.fillStyle=valid?'#f6e7b322':'#e09e732b';c.lineWidth=2;c.setLineDash([5,4]);const rx=selected==='bench'?47:19,ry=selected==='bench'?22:13;c.beginPath();c.ellipse(p.x,p.y-5,rx,ry,0,0,Math.PI*2);c.fill();c.stroke();c.restore();}
