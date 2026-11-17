"use strict";
(() => {
  const groups = {
    medium: {
      label: "MEDIUM / 媒介转译", title: "媒介的转译", question: "同一个世界，换一种表达，感受会怎样改变？",
      rule: "保留桥、山水与骑行动作，改变画面和角色的材质、线条与光。",
      scenes: [
        {name:"纸与晨雾", subtitle:"一条路，在纸上轻轻展开。", feeling:"轻、静，带着一点出发的好奇。", connection:"雾把远山推开，纸面与留白让这段路舒展开。同一座桥会成为下一幕的参照。", style:"paper", duration:10},
        {name:"刻线与潮声", subtitle:"相同的山海，有了时间留下的纹路。", feeling:"沉着、细密，想靠近看一看。", connection:"保留上一幕的桥与山形，把色面转成密集刻线。观看从远望转为辨认纹理，下一幕再将线条释放为光。", style:"engraving", duration:10},
        {name:"光与回响", subtitle:"线条离开纸面，成为夜里的信号。", feeling:"轻盈、陌生，又能认出刚才的路。", connection:"山形、桥和白鸟仍可辨；刻线变成发光轮廓与回响。三种表达最终收在同一处构图里。", style:"signal", duration:12}
      ]
    },
    scale: {
      label:"SCALE / 尺度与感知", title:"尺度与感知", question:"当角色越来越小，我们开始看见什么？",
      rule:"保留同一世界、角色与行动，让角色和环境一起缩放；观看距离改变注意力。",
      scenes:[
        {name:"近处的同行", subtitle:"先看见一个动作，一条围巾，一阵风。", feeling:"亲近，像和它并肩经过。", connection:"从桥上的骑行开始，把注意力交给身体和动作；随后慢慢退开，让道路显现。", style:"island", duration:10},
        {name:"山海中的点景", subtitle:"角色让路给山海，也替山海留下尺度。", feeling:"舒展，开始顺着路看向更远的地方。", connection:"退开之后，桥连接了两岸，山、水和道路共同进入视野；下一幕继续退开，才看见这方天地的轮廓。", style:"island", duration:11},
        {name:"天地间的一点", subtitle:"仍然认得它，却终于看见整个世界。", feeling:"辽阔，带着一点安静的惊奇。", connection:"同一段骑行成为浮岛上的一个小点。最后回想近处的动作，才感到角色与天地之间的距离。", style:"island", duration:12}
      ]
    },
    rhythm: {
      label:"RHYTHM / 情绪与停留", title:"情绪的停留", question:"走过同样三幕，停留的方式会改变感受吗？",
      rule:"保留角色与前进方向；用场景的疏密、明暗和停留时间组织探索、舒展与回望。",
      scenes:[
        {name:"入林", subtitle:"光很碎，路却一直往前。", feeling:"好奇、稍有包围感，想往深处去。", connection:"竖直树干和密叶先收紧视野。短一些的停留，把继续前行的愿望留给下一幕。", style:"forest", duration:6},
        {name:"越水", subtitle:"离开树影，风与水面一起展开。", feeling:"松开，呼吸变慢。", connection:"承接林中的密度，水面、远山与横向的路让视野舒展。多停一会儿，让空处真正被感到。", style:"coast", duration:12},
        {name:"见月", subtitle:"路还在延伸，观看却可以慢下来。", feeling:"安静，留下继续前行的余味。", connection:"白昼的亮面收为月下的一束光。最后停留，回看林、水与月怎样共同构成这一程。", style:"moon", duration:10}
      ]
    }
  };
  const el = id => document.getElementById(id);
  const canvas = el("artwork"), ctx = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const keys = Object.keys(groups), cache = new Map();
  let group = "medium", chapter = 0, playing = !reduced.matches, elapsed = 0, motion = 0;
  let finished = false, width = 0, height = 0, ratio = 1, lastFrame = 0, distanceOverride = null;
  let transition = null, previousProgress = -1, dirty = true;
  const palette = {
    paper:{sky:["#eee8d7","#dce3ce"], water:["#c4d3bc","#739f91"], far:"#c7ceba", mid:"#9caf9a", near:"#547e70", ink:"#48634f", bridge:"#d9d2ae", line:"#667d5e", light:"#f4e8ba", accent:"#b56742"},
    engraving:{sky:["#153b35","#365a45"], water:["#294e41","#12392f"], far:"#47654c", mid:"#345a45", near:"#193e34", ink:"#e3dcb1", bridge:"#325342", line:"#d2ce9f", light:"#e8d8a5", accent:"#d0a36c"},
    signal:{sky:["#0d1527","#142e3a"], water:["#102d3c","#0c192b"], far:"#183a48", mid:"#1e4c53", near:"#132d36", ink:"#86d9d3", bridge:"#142d3d", line:"#6cd8ce", light:"#f2c588", accent:"#f0ad71"}
  };
  function rand(seed=17){let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
  function path(c, points, fill, stroke, lineWidth=1){c.beginPath();points(c);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}}
  function gradient(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach(([at,color])=>g.addColorStop(at,color));return g;}
  function circle(c,x,y,r,fill,stroke,sw=1){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=sw;c.stroke();}}
  function oval(c,x,y,rx,ry,fill,rotation=0){c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,Math.PI*2);c.fillStyle=fill;c.fill();}
  function grain(c,seed=6,amount=4600,color="#3d4c2c",alpha=.09){const r=rand(seed);c.save();c.fillStyle=color;c.globalAlpha=alpha;for(let i=0;i<amount;i++){const size=.3+r()*1.1;c.fillRect(r()*1200,r()*760,size,size*.55);}c.restore();}
  function mountain(c,y,color,variant=0){
    path(c,p=>{p.moveTo(-50,555);p.lineTo(-50,y+80);p.bezierCurveTo(80,y+15,150,y+80,230,y-20);p.bezierCurveTo(290,y-110,320,y-145,355,y-95);p.bezierCurveTo(405,y-10,450,y+5,510,y+35);p.bezierCurveTo(610,y-20,670,y-85,720,y-47);p.bezierCurveTo(820,y+42,850,y+25,900,y-10);p.bezierCurveTo(1010,y-110+variant,1120,y-75,1250,y+35);p.lineTo(1250,590);p.closePath();},color);
  }
  function pine(c,x,y,size,color,wire=false){
    c.save();c.translate(x,y);c.scale(size,size);c.strokeStyle=color;c.lineWidth=1.4;c.beginPath();c.moveTo(0,0);c.lineTo(-3,-86);c.stroke();
    for(let i=0;i<5;i++){const y1=-80+i*14,w=10+i*5;path(c,p=>{p.moveTo(-3,y1-15);p.quadraticCurveTo(-w*.5,y1,-w,y1+8);p.quadraticCurveTo(0,y1+1,w,y1+8);p.closePath();},wire?null:color,color,wire?.8:1);}
    c.restore();
  }
  const bridgeY=x=>530-260*((x-250)/700)*(1-(x-250)/700);
  function bridge(c,p,style){
    path(c,q=>{q.moveTo(250,530);q.quadraticCurveTo(600,400,950,530);q.lineTo(946,572);q.quadraticCurveTo(600,446,254,572);q.closePath();},p.bridge,p.line,style==="signal"?1.8:1.1);
    if(style!=="paper"){
      c.save();c.strokeStyle=p.line;c.globalAlpha=.48;c.lineWidth=.65;
      for(let x=260;x<947;x+=12){const y=bridgeY(x);c.beginPath();c.moveTo(x,y+6);c.lineTo(x-9,y+37);c.stroke();}c.restore();
    }
    for(let x=260;x<950;x+=27){const y=bridgeY(x);path(c,q=>{q.moveTo(x,y-3);q.lineTo(x,y-26);},null,p.line,1.5);circle(c,x,y-27,1.8,p.line);}
    path(c,q=>{q.moveTo(260,501);q.quadraticCurveTo(600,377,944,501);},null,p.line,1.6);
    if(style==="paper")path(c,q=>{q.moveTo(254,535);q.quadraticCurveTo(600,408,946,535);},null,"#ede8c9",4);
  }
  function landscape(c,style){
    const p=palette[style];
    c.fillStyle=gradient(c,0,0,0,760,[[0,p.sky[0]],[.7,p.sky[1]],[1,p.water[0]]]);c.fillRect(0,0,1200,760);
    const sunX=783,sunY=191;
    if(style==="signal"){
      c.save();c.strokeStyle="#72b9b34a";c.lineWidth=.7;
      for(let i=0;i<6;i++)circle(c,sunX,sunY,46+i*13,null,"#82c9bd20");
      circle(c,sunX,sunY,41,null,p.light,1.1);c.restore();
    }else{circle(c,sunX,sunY,50,p.light);circle(c,sunX,sunY,58,null,p.light+"55",.8);}
    mountain(c,345,p.far,25);mountain(c,412,p.mid,-15);
    c.fillStyle=gradient(c,0,435,0,760,[[0,p.water[0]],[1,p.water[1]]]);c.fillRect(0,470,1200,290);
    const r=rand(44);c.save();c.strokeStyle=p.line;c.globalAlpha=style==="paper"?.17:.33;c.lineWidth=style==="signal"?.7:.8;
    for(let i=0;i<155;i++){const x=r()*1200,y=475+r()*285,w=12+r()*80;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+w/2,y-2,x+w,y);c.stroke();}c.restore();
    path(c,q=>{q.moveTo(-30,465);q.bezierCurveTo(95,402,122,481,194,486);q.bezierCurveTo(270,486,274,520,310,548);q.lineTo(219,595);q.bezierCurveTo(130,640,50,622,-30,655);q.closePath();},p.near,p.line,style==="paper"?.6:1.1);
    path(c,q=>{q.moveTo(905,552);q.bezierCurveTo(971,475,1023,497,1087,431);q.bezierCurveTo(1134,389,1210,450,1240,401);q.lineTo(1240,650);q.bezierCurveTo(1100,616,991,621,905,552);q.closePath();},p.near,p.line,style==="paper"?.6:1.1);
    pine(c,179,491,.87,p.ink,style==="signal");pine(c,128,482,1.18,p.ink,style==="signal");pine(c,1064,482,.74,p.ink,style==="signal");pine(c,1109,449,1.05,p.ink,style==="signal");
    bridge(c,p,style);
    if(style==="paper"){
      for(let i=0;i<6;i++){c.save();c.globalAlpha=.13;c.fillStyle="#f6f0db";c.beginPath();c.ellipse(300+i*170,380+(i%2)*60,250,17+i*2,0,0,Math.PI*2);c.fill();c.restore();}
      for(let i=0;i<11;i++)path(c,q=>{const x=65+i*11;q.moveTo(x,615);q.quadraticCurveTo(x-3,575-i%3*10,x+13,556-i%3*8);},null,"#476b56aa",.9);
      grain(c);grain(c,32,1800,"#fffde8",.3);
    } else if(style==="engraving"){
      c.save();c.globalAlpha=.22;c.strokeStyle=p.light;c.lineWidth=.65;
      for(let y=15;y<460;y+=6)path(c,q=>{q.moveTo(0,y);q.bezierCurveTo(300,y-30,850,y+25,1200,y-25);},null,p.light,.5);
      for(let i=0;i<250;i++){let x=r()*1200,y=280+r()*230;path(c,q=>{q.moveTo(x,y);q.lineTo(x-9,y+22);},null,p.light,.6);}c.restore();
      grain(c,72,6000,p.light,.15);
      c.strokeStyle=p.line;c.lineWidth=.8;c.strokeRect(27,27,1146,706);c.strokeRect(33,33,1134,694);
    }else{
      c.save();c.globalAlpha=.55;
      for(let i=0;i<14;i++)path(c,q=>{q.moveTo(-20,318+i*12);for(let x=0;x<=1220;x+=12){const y=330+i*12-75*Math.sin(x/173+i*.035)-25*Math.sin(x/67);q.lineTo(x,y);}},null,p.line,.6);
      c.restore();
      for(let i=0;i<80;i++){const x=r()*1200,y=r()*430;circle(c,x,y,.7+r()*.8,"#b4e5d0"+(i%3?"55":"aa"));}
      c.save();c.setLineDash([2,8]);circle(c,sunX,sunY,94,null,"#c5d9ad55",.8);c.restore();
    }
    for(let i=0;i<4;i++){const x=482+i*19,y=216+(i%2)*10;path(c,q=>{q.moveTo(x-4,y+2);q.quadraticCurveTo(x,y-3,x+4,y+2);q.quadraticCurveTo(x+8,y-2,x+12,y+2);},null,p.ink,style==="paper"?.8:1);}
  }
  function backdrop(c){
    c.fillStyle=gradient(c,0,0,0,760,[[0,"#163947"],[.55,"#497f80"],[1,"#a2bbaa"]]);c.fillRect(0,0,1200,760);
    const glow=c.createRadialGradient(680,380,5,680,380,440);glow.addColorStop(0,"#d2d4aa40");glow.addColorStop(1,"#d2d4aa00");c.fillStyle=glow;c.fillRect(0,0,1200,760);
    const r=rand(65);for(let i=0;i<130;i++)circle(c,r()*1200,r()*760,.4+r()*1.4,"#eee5b8"+(i%4?"65":"b0"));
    path(c,q=>{q.moveTo(40,615);q.quadraticCurveTo(95,570,167,621);q.quadraticCurveTo(112,659,40,615);},"#c0c7a344");
    path(c,q=>{q.moveTo(990,270);q.quadraticCurveTo(1060,213,1148,273);q.quadraticCurveTo(1080,330,990,270);},"#c5c5a13a");
    grain(c,77,3000,"#f9f4d5",.08);
  }
  function rhythmScene(c,style){
    if(style==="forest"){
      c.fillStyle=gradient(c,0,0,0,760,[[0,"#173f3a"],[.55,"#70978a"],[1,"#183d34"]]);c.fillRect(0,0,1200,760);
      const r=rand(62);
      for(let i=0;i<48;i++){const x=r()*1400-100,thick=8+r()*25;c.fillStyle=i<24?"#2c65595c":"#1c5146b0";path(c,q=>{q.moveTo(x-thick,620);q.bezierCurveTo(x+12,420,x-12,190,x-35,-40);q.lineTo(x+thick-25,-40);q.bezierCurveTo(x+thick,230,x+thick+5,430,x+thick,620);q.closePath();},c.fillStyle);}
      c.save();c.globalAlpha=.15;c.fillStyle="#fff1b7";
      for(let i=0;i<4;i++)path(c,q=>{q.moveTo(600+i*70,-20);q.lineTo(290+i*80,650);q.lineTo(375+i*83,650);q.lineTo(630+i*70,-20);q.closePath();},"#eee6ac");c.restore();
      for(let i=0;i<190;i++){const x=r()*1300-50,y=r()*640;oval(c,x,y,14+r()*23,3+r()*7,"#143d32"+(i%3?"a0":"e0"),r()*3.14);}
      const mist=c.createLinearGradient(0,330,0,640);mist.addColorStop(0,"#b5cab400");mist.addColorStop(.6,"#b5cab45b");mist.addColorStop(1,"#b5cab400");c.fillStyle=mist;c.fillRect(0,330,1200,310);
      path(c,q=>{q.moveTo(0,620);q.quadraticCurveTo(600,512,1200,620);q.lineTo(1200,760);q.lineTo(0,760);q.closePath();},"#214b38");
      for(let i=0;i<150;i++){const x=r()*1200,y=620+r()*140;path(c,q=>{q.moveTo(x,y);q.quadraticCurveTo(x-8,y-24,x+3,y-29);},null,i%2?"#496e48":"#7d91603b",1.2);}
    }else if(style==="coast"){
      c.fillStyle=gradient(c,0,0,0,760,[[0,"#f0e9d4"],[.48,"#dbe3ce"],[1,"#75a69c"]]);c.fillRect(0,0,1200,760);
      circle(c,790,212,52,"#e6c58d");mountain(c,390,"#bbcdb8");mountain(c,462,"#93b4a7");
      c.fillStyle=gradient(c,0,475,0,760,[[0,"#c0d6c3"],[1,"#669c93"]]);c.fillRect(0,477,1200,283);
      const r=rand(12);for(let i=0;i<140;i++){const x=r()*1200,y=490+r()*265,w=r()*70+9;path(c,q=>{q.moveTo(x,y);q.lineTo(x+w,y);},null,"#eef0d27a",.75);}
      path(c,q=>{q.moveTo(-20,590);q.bezierCurveTo(300,515,900,610,1230,560);q.lineTo(1230,760);q.lineTo(-20,760);q.closePath();},"#6f8c6a");
      for(let i=0;i<22;i++){const x=20+i*56,y=645+i%3*24;path(c,q=>{q.moveTo(x,y);q.quadraticCurveTo(x-12,y-43,x+2,y-60);},null,"#d3d5a9",1.3);}
    }else{
      c.fillStyle=gradient(c,0,0,0,760,[[0,"#102c3b"],[.5,"#235664"],[1,"#315f60"]]);c.fillRect(0,0,1200,760);
      const halo=c.createRadialGradient(719,226,40,719,226,200);halo.addColorStop(0,"#f0e6b62a");halo.addColorStop(1,"#f0e6b600");c.fillStyle=halo;c.fillRect(0,0,1200,760);circle(c,719,226,51,"#e9e3ba");
      mountain(c,467,"#284f59");c.fillStyle="#1c4a55";c.fillRect(0,490,1200,270);
      const r=rand(33);for(let i=0;i<100;i++){const y=490+r()*270,x=715+(r()-.5)*(y-400)*1.4;path(c,q=>{q.moveTo(x,y);q.lineTo(x+5+r()*26,y);},null,"#e5dcad55",.8);}
      for(let i=0;i<100;i++)circle(c,r()*1200,r()*400,.4+r()*.8,"#e9e7c37a");
      path(c,q=>{q.moveTo(0,608);q.bezierCurveTo(300,540,900,620,1200,565);q.lineTo(1200,760);q.lineTo(0,760);q.closePath();},"#173d3e");
      pine(c,1100,590,1.1,"#0f3134");pine(c,1146,618,1.6,"#0f3134");
    }
    const road=style==="forest"?"#a79e6c":style==="coast"?"#ddd5ae":"#627e72";
    path(c,q=>{q.moveTo(-100,588);q.bezierCurveTo(300,523,800,608,1300,550);q.lineTo(1300,585);q.bezierCurveTo(800,645,300,563,-100,620);q.closePath();},road);
    path(c,q=>{q.moveTo(-100,587);q.bezierCurveTo(300,522,800,607,1300,549);},null,style==="moon"?"#bfbd8a":"#ece3be",1.2);
    grain(c,5,5000,style==="moon"?"#a3d4c0":"#345539",.09);
  }
  function getBackground(key){
    if(cache.has(key))return cache.get(key);
    const buffer=document.createElement("canvas");buffer.width=1800;buffer.height=1140;const c=buffer.getContext("2d");c.scale(1.5,1.5);
    if(key==="island"){
      landscape(c,"paper");c.globalCompositeOperation="destination-in";
      path(c,q=>{q.moveTo(-20,456);q.bezierCurveTo(100,389,170,438,230,325);q.bezierCurveTo(310,148,345,162,400,265);q.bezierCurveTo(520,375,590,354,700,304);q.bezierCurveTo(820,246,833,354,918,333);q.bezierCurveTo(1090,140,1225,262,1230,482);q.bezierCurveTo(1190,680,880,764,600,749);q.bezierCurveTo(290,760,50,695,-20,456);q.closePath();},"#000");
    }else if(palette[key])landscape(c,key);else rhythmScene(c,key);
    cache.set(key,buffer);if(cache.size>5)cache.delete(cache.keys().next().value);return buffer;
  }
  function rider(c,x,y,scale,style,t){
    const wire=style==="signal",engraved=style==="engraving",ink=wire?"#9ce8d3":engraved?"#ece5bc":style==="moon"?"#aacbb7":"#2e5045",body=wire?"#152e3b":"#f2edce",accent=wire?"#edb878":"#c3774c";
    c.save();c.translate(x,y);c.scale(scale,scale);c.lineCap="round";c.lineJoin="round";
    if(wire){c.shadowColor="#72ddd0";c.shadowBlur=7;}
    oval(c,1,4,56,5,wire?"#96dcc31f":"#294b3b26");
    for(const wx of [-31,33]){
      circle(c,wx,-20,20,null,ink,2.2);circle(c,wx,-20,17.5,null,ink+"88",.6);
      c.save();c.translate(wx,-20);c.rotate(t*2.9);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;path(c,q=>{q.moveTo(0,0);q.lineTo(Math.cos(a)*18,Math.sin(a)*18);},null,ink,.65);}circle(c,0,0,2,accent);c.restore();
    }
    path(c,q=>{q.moveTo(-31,-20);q.lineTo(-10,-46);q.lineTo(10,-20);q.closePath();q.moveTo(-10,-46);q.lineTo(23,-46);q.lineTo(10,-20);q.lineTo(33,-20);q.lineTo(20,-54);q.lineTo(35,-58);},null,accent,2.2);
    path(c,q=>{q.moveTo(-10,-46);q.lineTo(-13,-53);q.moveTo(-22,-53);q.lineTo(-6,-53);},null,ink,2);
    const pedalX=10+Math.cos(t*2.9)*10,pedalY=-20+Math.sin(t*2.9)*7;
    path(c,q=>{q.moveTo(2,-65);q.lineTo(12,-44);q.lineTo(pedalX,pedalY);q.moveTo(-7,-65);q.lineTo(-4,-42);q.lineTo(20-pedalX,-40-pedalY);},null,ink,2);
    circle(c,10,-20,4,null,ink,1);path(c,q=>{q.moveTo(10,-20);q.lineTo(pedalX,pedalY);},null,ink,1.2);
    const bob=Math.sin(t*5.8)*1.1;c.translate(0,bob);
    path(c,q=>{q.moveTo(2,-65);q.bezierCurveTo(15,-75,3,-99,19,-105);q.bezierCurveTo(27,-108,35,-103,35,-96);q.bezierCurveTo(34,-86,20,-82,23,-67);q.closePath();},body,ink,wire?1.1:.7);
    path(c,q=>{q.moveTo(32,-102);q.lineTo(77,-94);q.quadraticCurveTo(50,-85,32,-93);q.closePath();},wire?null:"#d4ae6e",accent,1.1);
    oval(c,-6,-67,26,15,body,-.15);if(wire){c.beginPath();c.ellipse(-6,-67,26,15,-.15,0,Math.PI*2);c.strokeStyle=ink;c.lineWidth=.9;c.stroke();}path(c,q=>{q.moveTo(-25,-70);q.quadraticCurveTo(-12,-83,7,-71);q.quadraticCurveTo(0,-61,-15,-62);},null,ink,.8);
    path(c,q=>{q.moveTo(-28,-69);q.lineTo(-42,-74);q.lineTo(-30,-63);},body,ink,.7);
    circle(c,27,-100,1.6,wire?accent:"#2c453a");
    path(c,q=>{q.moveTo(9,-86);q.lineTo(20,-83);q.lineTo(17,-77);q.lineTo(5,-80);q.closePath();},accent);
    path(c,q=>{q.moveTo(7,-82);q.bezierCurveTo(-11,-91,-25,-76+Math.sin(t*3)*4,-47,-84);q.lineTo(-34,-77);q.bezierCurveTo(-18,-80+Math.sin(t*3)*5,-5,-80,8,-78);q.closePath();},accent);
    if(engraved){c.globalAlpha=.4;for(let i=0;i<7;i++)path(c,q=>{q.moveTo(-25+i*6,-73);q.lineTo(-31+i*6,-61);},null,ink,.6);}
    c.restore();
  }
  function air(c,style,t){
    const r=rand(90);c.save();
    if(style==="signal"){
      c.strokeStyle="#81d9c6";c.lineWidth=.6;c.globalAlpha=.25;
      for(let i=0;i<8;i++){const y=505+i*22;path(c,q=>{q.moveTo(420+Math.sin(t*.5+i)*10,y);q.quadraticCurveTo(600,y-12,800,y);},null,"#80dcca",.7);}
    }else{
      for(let i=0;i<24;i++){const x=(r()*1300+t*(style==="forest"?5:9))%1300-50,y=170+r()*440,sz=.6+r()*1.5;circle(c,x,y,sz,style==="forest"?"#f0d79778":style==="moon"?"#e9e4b34f":"#f7efcb65");}
    }
    c.restore();
  }
  function zoomValue(){
    if(distanceOverride!==null)return 2.25-distanceOverride*.017;
    const progress=Math.min(1,elapsed/duration());
    return [[2.25,1.65],[1.65,.98],[.98,.55]][chapter][0]+([[2.25,1.65],[1.65,.98],[.98,.55]][chapter][1]-[[2.25,1.65],[1.65,.98],[.98,.55]][chapter][0])*progress;
  }
  function draw(now){
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    const unit=Math.max(width/1200,height/760);ctx.save();ctx.translate(width/2,height/2);ctx.scale(unit,unit);ctx.translate(-600,-380);
    const scene=groups[group].scenes[chapter],style=scene.style,t=motion;
    if(group==="scale"){
      backdrop(ctx);const z=zoomValue();ctx.save();ctx.translate(600,430);ctx.scale(z,z);ctx.translate(-600,-430);ctx.drawImage(getBackground("island"),0,0,1200,760);rider(ctx,600+Math.sin(t*.18)*7,bridgeY(600)-2,1.05,"paper",t);ctx.restore();
      const d=Math.round((2.25-z)/.017);el("distance").value=Math.max(0,Math.min(100,d));el("distance-value").textContent=`${Math.max(0,Math.min(100,d))}%`;
    }else{
      ctx.drawImage(getBackground(style),0,0,1200,760);
      air(ctx,style,t);
      const y=group==="medium"?bridgeY(600)-2:570;
      rider(ctx,600+Math.sin(t*.18)*7,y,group==="medium"?1.05:.94,style,t);
    }
    ctx.restore();
    if(transition){const alpha=Math.min(1,(now-transition.start)/700);if(alpha<1){ctx.globalAlpha=1-alpha;ctx.drawImage(transition.image,0,0,width,height);ctx.globalAlpha=1;}else transition=null;}
  }
  function duration(){return group==="rhythm"&&el("pacing").value==="even"?7:groups[group].scenes[chapter].duration;}
  function captureTransition(){
    if(reduced.matches||!width)return;
    const image=document.createElement("canvas");image.width=canvas.width;image.height=canvas.height;image.getContext("2d").drawImage(canvas,0,0);transition={image,start:performance.now()};
  }
  function updateUI(updateHash=true){
    dirty=true;
    const g=groups[group],s=g.scenes[chapter];
    el("group-label").textContent=g.label;el("group-question").textContent=g.question;el("study-rule").textContent=g.rule;
    el("stage-kicker").textContent=`0${keys.indexOf(group)+1} / ${g.title}`;el("stage-title").textContent=s.name;el("stage-subtitle").textContent=s.subtitle;
    el("feeling").textContent=s.feeling;el("connection").textContent=s.connection;
    const description=`本站原创网页动画：${g.title}，${s.name}。${s.subtitle}${g.rule}`;canvas.setAttribute("aria-label",description);el("art-description").textContent=description;
    el("scale-control").hidden=group!=="scale";el("rhythm-control").hidden=group!=="rhythm";
    document.querySelector(".art-stage").classList.toggle("scale-art",group==="scale");
    document.querySelector(".art-stage").style.setProperty("--stage-ink",s.style==="engraving"?"#e6deb5":["signal","forest","moon","island"].includes(s.style)?"#e8e8c7":"#304b40");
    document.querySelectorAll("[data-group]").forEach(tab=>{const selected=tab.dataset.group===group;tab.setAttribute("aria-selected",String(selected));tab.tabIndex=selected?0:-1;});
    el("atelier").setAttribute("aria-labelledby",`experiment-${group}`);
    el("chapters").replaceChildren(...g.scenes.map((scene,index)=>{const button=document.createElement("button");button.type="button";button.setAttribute("aria-pressed",String(index===chapter));button.dataset.chapter=String(index);const number=document.createElement("span");number.textContent=`0${index+1}`;button.append(number,document.createTextNode(scene.name));button.addEventListener("click",()=>selectChapter(index));return button;}));
    if(updateHash)history.replaceState(null,"",`#${group}-${chapter+1}`);
    updatePlayback();
  }
  function updatePlayback(){
    dirty=true;
    el("play").replaceChildren(document.createTextNode(playing?"暂停巡游 ":finished?"重看这一程 ":"播放这一程 "));const icon=document.createElement("span");icon.textContent=playing?"Ⅱ":finished?"↺":"▷";el("play").append(icon);el("play").setAttribute("aria-pressed",String(playing));
    el("play-status").textContent=finished?"已走完这一程":`0${chapter+1} / 03`;
  }
  function selectChapter(index){captureTransition();chapter=index;elapsed=0;playing=false;finished=false;distanceOverride=group==="scale"?[0,55,100][chapter]:null;previousProgress=-1;updateUI();}
  function selectGroup(key){captureTransition();group=key;chapter=0;elapsed=0;distanceOverride=null;finished=false;playing=!reduced.matches;previousProgress=-1;updateUI();}
  document.querySelectorAll("[data-group]").forEach((tab,index)=>{
    tab.addEventListener("click",()=>selectGroup(tab.dataset.group));
    tab.addEventListener("keydown",event=>{let next;if(event.key==="ArrowRight")next=(index+1)%keys.length;if(event.key==="ArrowLeft")next=(index+keys.length-1)%keys.length;if(event.key==="Home")next=0;if(event.key==="End")next=keys.length-1;if(next!==undefined){event.preventDefault();selectGroup(keys[next]);el(`experiment-${keys[next]}`).focus();}});
  });
  el("play").addEventListener("click",()=>{
    if(finished){captureTransition();chapter=0;elapsed=0;distanceOverride=null;finished=false;playing=true;updateUI();}
    else{playing=!playing;if(playing&&distanceOverride!==null){const z=2.25-distanceOverride*.017,bounds=[[2.25,1.65],[1.65,.98],[.98,.55]][chapter];elapsed=Math.max(0,Math.min(1,(bounds[0]-z)/(bounds[0]-bounds[1])))*duration();distanceOverride=null;}updatePlayback();}
  });
  el("progress").addEventListener("input",event=>{elapsed=Number(event.target.value)/1000*duration();playing=false;finished=false;distanceOverride=null;updatePlayback();});
  el("distance").addEventListener("input",event=>{
    distanceOverride=Number(event.target.value);const next=distanceOverride<34?0:distanceOverride<75?1:2;playing=false;finished=false;if(next!==chapter){chapter=next;elapsed=0;updateUI();}else updatePlayback();
  });
  el("pacing").addEventListener("change",()=>{captureTransition();chapter=0;elapsed=0;finished=false;playing=false;updateUI();});
  function immersion(active){document.body.classList.toggle("is-immersive",active);el("immerse").textContent=active?"退出沉浸 ↙":"沉浸观看 ↗";el("immerse").setAttribute("aria-pressed",String(active));resize();}
  el("immerse").addEventListener("click",()=>immersion(!document.body.classList.contains("is-immersive")));
  addEventListener("keydown",event=>{if(event.key==="Escape"&&document.body.classList.contains("is-immersive"))immersion(false);});
  function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);transition=null;dirty=true;}
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener("visibilitychange",()=>{lastFrame=0;});
  reduced.addEventListener("change",event=>{if(event.matches){playing=false;transition=null;updatePlayback();}});
  const hash=location.hash.match(/^#(medium|scale|rhythm)-([1-3])$/);if(hash){group=hash[1];chapter=Number(hash[2])-1;distanceOverride=group==="scale"?[0,55,100][chapter]:null;playing=false;}
  updateUI(false);resize();
  function frame(now){
    const dt=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;
    if(!document.hidden){
      if(playing){motion+=dt;elapsed+=dt;if(elapsed>=duration()){if(chapter<2){captureTransition();chapter++;elapsed=0;updateUI();}else{elapsed=duration();playing=false;finished=true;updatePlayback();}}}
      if(playing||transition||dirty){draw(now);dirty=false;}const progress=Math.round(Math.min(1,elapsed/duration())*1000);if(previousProgress!==progress){el("progress").value=progress;previousProgress=progress;}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
