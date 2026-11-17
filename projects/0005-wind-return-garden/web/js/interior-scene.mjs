import {drawSample} from './free-assets.mjs';
import {HOME_CUSHION} from './home-model.mjs';
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function ellipse(c,color,x,y,rx,ry){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(241,185,100,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
export class InteriorScene {
  constructor(assets,gardenScene){
    this.assets=assets;this.gardenScene=gardenScene;this.mini=document.createElement('canvas');this.mini.width=960;this.mini.height=600;this.miniAt=-1;
  }
  draw(c,{time,wind,player,life,completed,read,env,cameraX,width,path,now,outdoorPlayer}){
    if(this.miniAt<0||time-this.miniAt>.15||this.lastLight!==env.label){
      this.miniAt=time;this.lastLight=env.label;
      this.gardenScene.draw(this.mini.getContext('2d'),{time,wind,player:outdoorPlayer||life.player,life,completed,read,charge:0,cameraX:0,width:960,path:[],sitting:false,env,now});
    }
    c.save();c.translate(-cameraX,0);c.imageSmoothingEnabled=false;
    const wall=c.createLinearGradient(0,0,0,300);wall.addColorStop(0,'#b3a486');wall.addColorStop(1,'#e0cfaa');c.fillStyle=wall;c.fillRect(0,0,960,600);
    // Timber joints and limewashed walls keep the room in the same quiet palette.
    rect(c,'#71654e',68,0,15,302);rect(c,'#9a8561',83,0,5,302);rect(c,'#71654e',876,0,15,302);
    rect(c,'#a18f6e',80,270,796,15);rect(c,'#6f654e',80,284,796,8);
    rect(c,'#9d8c6d',0,292,960,308);
    for(let row=0;row<15;row++){
      const y=292+row*22;rect(c,row%2?'#b6a17b':'#ad9874',60,y,840,20);rect(c,'#86755555',60,y+20,840,2);
      for(let x=70+(row%2)*79;x<900;x+=158){rect(c,'#89775466',x,y,1,20);rect(c,'#c6af8240',x+15,y+6,95,1);}
    }
    rect(c,'#655d4b',48,295,14,305);rect(c,'#655d4b',900,295,14,305);
    // The window shows the current garden, using the actual outdoor renderer.
    rect(c,'#73684e',344,126,272,143);rect(c,'#d4c394',350,132,260,130);rect(c,'#6a775e',358,139,244,113);
    c.drawImage(this.mini,130,210,570,280,360,142,240,109);
    rect(c,'#c9b88c',477,139,5,114);rect(c,'#c9b88c',358,191,244,4);rect(c,'#947c58',335,255,290,9);rect(c,'#d6bd89',335,254,290,3);
    if(env.rain){c.save();c.globalAlpha=.22;c.strokeStyle='#e4ecdf';for(let i=0;i<9;i++){const x=370+i*26,y=145+((time*13+i*17)%85);c.beginPath();c.moveTo(x,y);c.lineTo(x-1,y+12);c.stroke();}c.restore();}
    if(!env.night&&!env.cloud){c.save();c.globalAlpha=.1;c.fillStyle='#f6df9e';c.beginPath();c.moveTo(362,261);c.lineTo(601,261);c.lineTo(700,460);c.lineTo(370,460);c.closePath();c.fill();c.restore();}
    // Hearth, logs and two small embers: always available, no fuel chores.
    rect(c,'#958a72',151,178,120,150);rect(c,'#c0ad89',158,183,106,137);
    for(let y=187;y<320;y+=17){rect(c,'#82796377',158,y,105,1);for(let x=158+(Math.floor(y/17)%2)*26;x<263;x+=52)rect(c,'#82796366',x,y,1,16);}
    rect(c,'#74664b',144,202,135,9);rect(c,'#c5b28a',140,199,143,4);rect(c,'#4b4939',172,244,79,75);
    rect(c,'#342f26',177,253,69,64);rect(c,'#735c3c',181,304,58,5);rect(c,'#ac8450',187,301,45,3);
    const flicker=env.reduced?0:Math.round(Math.sin(time*2)*2);
    rect(c,'#bf8151',192,288-flicker,12,16+flicker);rect(c,'#dea45e',207,279+flicker,11,25-flicker);rect(c,'#f2ca7e',209,290,5,12);
    rect(c,'#b29872',141,322,140,9);ellipse(c,'#9b835c44',210,344,79,14);glow(c,211,304,100,'rgba(245,190,102,.16)');
    // Quiet chair, woven rug and the cat's cushion.
    ellipse(c,'#857b5d',HOME_CUSHION.x,HOME_CUSHION.y,31,13);ellipse(c,'#bca981',HOME_CUSHION.x,HOME_CUSHION.y-2,30,12);
    ellipse(c,'#8c8d68',504,432,116,49);ellipse(c,'#b1ae81',504,431,109,44);ellipse(c,'#939b73',504,431,99,38);
    for(let i=-4;i<=4;i++){rect(c,'#c5bd8b66',504+i*18,414,1,34);rect(c,'#c5bd8b66',430,431+i*6,146,1);}
    rect(c,'#6e6c50',331,399,75,65);rect(c,'#8c9573',334,391,69,50);rect(c,'#a3ab83',340,395,58,40);rect(c,'#c0b68a',339,431,59,13);
    rect(c,'#727c59',325,421,12,31);rect(c,'#727c59',403,421,12,31);rect(c,'#6a654b',337,452,5,15);rect(c,'#6a654b',399,452,5,15);
    // Shelf and writing table reuse the credited pot, apple and bread originals.
    rect(c,'#78694f',702,163,133,137);rect(c,'#a18b63',709,170,119,124);
    for(const y of [209,250,291])rect(c,'#70634b',708,y,121,5);
    for(let i=0;i<10;i++){const x=716+i*10;rect(c,['#71806b','#ab916d','#b6a184','#7c8675'][i%4],x,180+i%3*3,7,27-i%3*3);}
    rect(c,'#d5c396',724,222,41,5);rect(c,'#8b9a7a',775,220,31,26);rect(c,'#c9b68d',725,270,71,7);
    rect(c,'#796747',687,354,7,47);rect(c,'#796747',806,354,7,47);rect(c,'#9c8058',676,340,151,14);rect(c,'#c5ac7a',675,337,153,5);
    rect(c,'#eee0bb',701,326,27,11);rect(c,'#a6a07b',705,329,18,1);rect(c,'#a6a07b',705,332,13,1);
    drawSample(c,this.assets.free,'pot',687,335,{scale:.055});rect(c,'#6f8358',686,310,1,16);rect(c,'#e6d7ac',684,307,5,4);
    drawSample(c,this.assets.free,'apple',793,336,{scale:.035});drawSample(c,this.assets.free,'bread',776,336,{scale:.035});
    rect(c,'#81724f',748,316,4,20);rect(c,'#b9a678',739,332,22,3);rect(c,life.home.lampOn?'#ead09a':'#a69c7d',737,305,27,14);rect(c,'#9b8b66',742,303,17,3);
    rect(c,'#786e55',448,540,65,11);rect(c,'#b7a27a',445,539,70,3);rect(c,'#bfae83',453,524,53,13);
    rect(c,'#d5c292',451,526,56,1);
    const drawables=[{y:player.y,run:()=>this.gardenScene.drawPlayer(c,player,time,false,life.home.resting)}];
    const cat=life.cat;
    if(cat.unlocked&&cat.space==='inside')drawables.push({y:cat.indoorY,run:()=>{
      ellipse(c,'#675c4438',cat.indoorX,cat.indoorY+1,10,3);
      drawSample(c,this.assets.free,'cat',cat.indoorX,cat.indoorY,{time:cat.mode==='curl'&&!cat.moving?0:time,state:cat.moving?'walk':'idle',face:cat.face});
      if(cat.mode==='curl'&&!cat.moving){c.fillStyle='#ded3ac';c.font='9px Georgia';c.fillText('z',cat.indoorX+10,cat.indoorY-28);}
      if(cat.mode==='affection'&&now-cat.lastPetAt<8000){rect(c,'#e0b98a',cat.indoorX-2,cat.indoorY-33,3,3);rect(c,'#e0b98a',cat.indoorX+2,cat.indoorY-33,3,3);rect(c,'#e0b98a',cat.indoorX,cat.indoorY-30,3,3);}
    }});
    drawables.sort((a,b)=>a.y-b.y).forEach(d=>d.run());
    if(path.length){const end=path.at(-1);c.strokeStyle='#e9d4a177';c.beginPath();c.ellipse(end.x,end.y,9,4,0,0,Math.PI*2);c.stroke();}
    c.fillStyle=`rgba(38,44,47,${env.night*(life.home.lampOn ? .16 : .36)+env.cloud*.04})`;c.fillRect(cameraX,0,width,600);
    if(life.home.lampOn){glow(c,750,319,155,'rgba(247,204,132,.23)');glow(c,550,357,265,'rgba(244,205,144,.08)');}
    glow(c,211,300,130,'rgba(242,181,94,.15)');
    c.restore();
  }
}
