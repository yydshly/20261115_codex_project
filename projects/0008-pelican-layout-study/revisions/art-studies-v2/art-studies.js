"use strict";
(() => {
  const byId=id=>document.getElementById(id),body=document.body;
  const key=body.dataset.work,work=window.ART_STUDIES.works[key],chapters=work.chapters;
  const canvas=byId("painting"),ctx=canvas.getContext("2d"),viewer=document.querySelector(".viewer");
  const makeLayer=()=>{const surface=document.createElement("canvas");return{surface,c:surface.getContext("2d")};};
  const next=makeLayer(),mask=makeLayer();
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const images=chapters.map((scene,index)=>{const img=new Image();img.decoding="async";if(index===0)img.fetchPriority="high";img.src=scene.image;return img;});
  const tabs=[],numerals=["Ⅰ","Ⅱ","Ⅲ"],names=["第一幕","第二幕","第三幕"];
  let chapter=0,elapsed=0,motion=0,playing=false,ready=false,finished=false,entered=false,transition=null;
  let width=0,height=0,ratio=1,lastFrame=0,lastPaint=0,dirty=true,lastProgress=-1,lastPoem="";
  let pointer={x:.5,y:.5,tx:.5,ty:.5,active:false},ripples=[];
  const seed=(value=13)=>()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  const random=seed(34),specks=Array.from({length:160},()=>({x:random(),y:random(),phase:random()*6.28,size:.3+random()*1.3,speed:.4+random()}));
  const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);},mix=(a,b,t)=>a+(b-a)*t;
  const segment=(p,a,b)=>ease((p-a)/(b-a));
  function point(rect,pos){return{x:rect.x+rect.w*pos[0],y:rect.y+rect.h*pos[1]};}
  function circle(c,x,y,r,fill){c.beginPath();c.arc(x,y,Math.max(.1,r),0,Math.PI*2);c.fillStyle=fill;c.fill();}
  function ellipse(c,x,y,rx,ry,stroke,line=1){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}
  function camera(index,p,extra=1){
    const image=images[index],scene=chapters[index];
    const base=Math.max(width/image.width,height/image.height),curve=segment(p,.015,.94);
    const a=scene.camera[0],b=scene.camera[1];
    const zoom=reduced.matches?1.03:mix(a[0],b[0],curve)*extra;
    const focusX=mix(a[1],b[1],curve),focusY=mix(a[2],b[2],curve);
    const w=image.width*base*zoom,h=image.height*base*zoom;
    const dx=entered&&!reduced.matches?(pointer.x-.5)*width*.025:0,dy=entered&&!reduced.matches?(pointer.y-.5)*height*.02:0;
    return{x:clamp(width*.5-w*focusX+dx,width-w,0),y:clamp(height*.5-h*focusY+dy,height-h,0),w,h};
  }
  function imageAt(c,image,r,wave=0){
    if(!wave){c.drawImage(image,r.x,r.y,r.w,r.h);return;}
    const slices=52,sh=image.height/slices,dh=r.h/slices;
    for(let i=0;i<slices;i++){const offset=Math.sin(i*.34+motion*.7)*wave;c.drawImage(image,0,i*sh,image.width,sh,r.x+offset,r.y+i*dh,r.w,dh+1);}
  }
  function drawPainting(c,index,progress,extra=1){
    const scene=chapters[index],r=camera(index,progress,extra),image=images[index];
    c.fillStyle=key==="light"?"#11160f":"#e9e3d5";c.fillRect(0,0,width,height);
    const water=scene.fx==="garden"||scene.fx==="river";
    imageAt(c,image,r,!reduced.matches&&water?width*.0012:0);
    if(!entered)return r;
    if(!reduced.matches){
      drawAtmosphere(c,scene,r,motion);
      if(key==="light"&&index<2){
        const opening=segment(progress,0,index===0?.27:.34),f=point(r,scene.focus);
        const shade=c.createRadialGradient(f.x,f.y,width*.04,f.x,f.y,Math.hypot(width,height)*.85);
        shade.addColorStop(0,`rgba(5,9,7,${(1-opening)*.12})`);shade.addColorStop(.4,`rgba(5,9,7,${(1-opening)*.47})`);shade.addColorStop(1,`rgba(5,9,7,${(1-opening)*.87})`);c.fillStyle=shade;c.fillRect(0,0,width,height);
        c.save();c.globalCompositeOperation="screen";c.globalAlpha=(.04+.1*Math.sin(Math.PI*segment(progress,.03,.8)));
        const beam=c.createLinearGradient(0,0,width,height);beam.addColorStop(0,"#ddad6300");beam.addColorStop(.42,"#ddad6300");beam.addColorStop(.56,"#f2d295");beam.addColorStop(.68,"#ddad6300");beam.addColorStop(1,"#ddad6300");
        c.fillStyle=beam;c.fillRect(0,0,width,height);c.restore();
      }
      if(key==="light"&&pointer.active){
        c.save();c.globalCompositeOperation="screen";const x=pointer.x*width,y=pointer.y*height,g=c.createRadialGradient(x,y,0,x,y,width*.21);g.addColorStop(0,"#e8c88215");g.addColorStop(1,"#e8c88200");c.fillStyle=g;c.fillRect(0,0,width,height);c.restore();
      }
      ripples.forEach(ripple=>{const age=motion-ripple.at,p=clamp(age/3.5);c.save();c.globalAlpha=(1-p)*.48;ellipse(c,ripple.x*width,ripple.y*height,8+p*width*.15,2+p*width*.045,"#546e57",1);c.restore();});
    }
    return r;
  }
  function drawAtmosphere(c,scene,rect,t){
    c.save();c.beginPath();c.rect(rect.x,rect.y,rect.w,rect.h);c.clip();
    const x=(u)=>rect.x+u*rect.w,y=(v)=>rect.y+v*rect.h,scale=rect.w/1200;
    if(scene.fx==="cathedral"||scene.fx==="darkroom"){
      const cathedral=scene.fx==="cathedral",focus=point(rect,scene.focus);
      c.globalCompositeOperation="screen";
      const glow=c.createRadialGradient(focus.x,focus.y,0,focus.x,focus.y,rect.w*.22);
      glow.addColorStop(0,`rgba(237,190,109,${.025+.012*Math.sin(t*.43)})`);glow.addColorStop(1,"rgba(237,190,109,0)");c.fillStyle=glow;c.fillRect(rect.x,rect.y,rect.w,rect.h);
      specks.slice(0,cathedral?52:26).forEach(s=>{
        const v=(s.y+t*.007*s.speed)%1;
        const u=cathedral?.80-v*.27+(s.x-.5)*.20:.08+v*.62+(s.x-.5)*.16;
        const py=cathedral?.18+v*.66:.10+v*.66;
        c.globalAlpha=(.06+.12*(.5+.5*Math.sin(t*.7+s.phase)))*(cathedral?1:.65);
        circle(c,x(u),y(py),Math.max(.3,s.size*scale),cathedral?"#eedab4":"#e5c38c");
      });
    }else if(scene.fx==="garden"){
      c.globalCompositeOperation="screen";
      specks.slice(0,115).forEach(s=>{const u=.12+s.x*.78,v=.47+s.y*.48,a=Math.max(0,Math.sin(t*.66+s.phase*2));c.globalAlpha=a*.17;c.fillStyle=s.x>.48?"#fff0b7":"#b7dfd7";c.fillRect(x(u)+Math.sin(t*.23+s.phase)*3*scale,y(v),(.8+s.size*5)*scale,.6*scale);});
    }else{
      const near=scene.fx==="eaves",middle=scene.fx==="bamboo";
      const count=near?42:middle?90:20;
      c.lineWidth=Math.max(.45,.8*scale);c.strokeStyle=middle?"#4b6154":"#f2ecdb";
      specks.slice(0,count).forEach(s=>{
        let u=s.x,v=(s.y+t*(near?.20:middle?.31:.12)*s.speed)%1;
        if(near&&v<.40&&u<.79)return;
        const len=(near?.030:middle?.065:.022)*s.speed;
        c.globalAlpha=(near?.16:middle?.13:.065)*(1-s.x*.2);
        c.beginPath();c.moveTo(x(u),y(v));c.lineTo(x(u-(middle?.018:.005)),y(v+len));c.stroke();
      });
      if(near){
        const phase=(t/2.6)%1,dropX=x(.575),top=y(.40),bottom=y(.775);
        if(phase<.7){const v=phase/.7,dropY=mix(top,bottom,v*v);c.globalAlpha=.66;c.fillStyle="#f6efdc";c.beginPath();c.ellipse(dropX,dropY,1.8*scale,(2.7+v*1.2)*scale,0,0,Math.PI*2);c.fill();}
        for(let i=0;i<3;i++){const p=(phase+.33*i)%1;c.globalAlpha=(1-p)*.26;ellipse(c,dropX,bottom,(12+p*99)*scale,(3+p*18)*scale,"#eee8ce",.9*scale);}
      }else if(middle){
        c.globalAlpha=.055;c.strokeStyle="#314e3f";c.lineWidth=1.3*scale;
        for(let side=0;side<2;side++){const start=side?.92:.09,swing=Math.sin(t*.40+side)*.009;for(let i=0;i<4;i++){c.beginPath();c.moveTo(x(start),y(.18+i*.12));c.quadraticCurveTo(x(start+(side?-.05:.05)+swing),y(.23+i*.12),x(start+(side?-.11:.11)+swing),y(.21+i*.12));c.stroke();}}
        const mist=c.createLinearGradient(rect.x,0,rect.x+rect.w,0);mist.addColorStop(0,"#ece8da00");mist.addColorStop(.5,"#ece8da18");mist.addColorStop(1,"#ece8da00");c.globalAlpha=.45;c.fillStyle=mist;c.fillRect(x(-.15+Math.sin(t*.12)*.12),y(.48),rect.w*1.3,rect.h*.20);
      }else{
        for(let i=0;i<3;i++){const p=(t/6+i*.36)%1;c.globalAlpha=(1-p)*.09;ellipse(c,x(.64+i*.015),y(.82+i*.018),(6+p*31)*scale,(1.7+p*7)*scale,"#6a7f6e",.65*scale);}
      }
    }
    c.restore();
  }
  function softReveal(destination,u,from){
    const origin=point(camera(from,transition.fromProgress),chapters[from].focus);
    const r=Math.hypot(width,height)*(u*1.3),feather=Math.max(20,width*.12);
    mask.c.setTransform(ratio,0,0,ratio,0,0);mask.c.clearRect(0,0,width,height);
    const g=mask.c.createRadialGradient(origin.x,origin.y,Math.max(0,r-feather),origin.x,origin.y,Math.max(1,r));g.addColorStop(0,"#fff");g.addColorStop(1,"#ffffff00");mask.c.fillStyle=g;mask.c.fillRect(0,0,width,height);
    destination.save();destination.globalCompositeOperation="destination-in";destination.drawImage(mask.surface,0,0,width,height);destination.restore();
  }
  function transitionReveal(u){
    const from=transition.from,to=chapter;
    if(key==="light"&&from===0){
      drawPainting(ctx,from,transition.fromProgress,1+segment(u,0,.8)*.65);
      ctx.fillStyle=`rgba(7,10,7,${Math.sin(Math.PI*u)*.72})`;ctx.fillRect(0,0,width,height);
      const reveal=segment(u,.22,1);softReveal(next.c,reveal,from);ctx.drawImage(next.surface,0,0,width,height);
      const f=point(camera(from,transition.fromProgress),chapters[from].focus);ctx.save();ctx.globalCompositeOperation="screen";
      const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,width*(.06+.16*Math.sin(Math.PI*u)));g.addColorStop(0,`rgba(250,204,123,${Math.sin(Math.PI*u)*.48})`);g.addColorStop(1,"#edbd7500");ctx.fillStyle=g;ctx.fillRect(0,0,width,height);ctx.restore();
    }else if(key==="light"){
      drawPainting(ctx,from,transition.fromProgress);
      const cols=16,rows=Math.max(8,Math.round(cols*height/width)),cw=width/cols,ch=height/rows;
      mask.c.setTransform(ratio,0,0,ratio,0,0);mask.c.clearRect(0,0,width,height);
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const nx=(col+.5)/cols,ny=(row+.5)/rows,d=Math.hypot((nx-.64)*.8,(ny-.68)*.7),threshold=d*.58+((row*17+col*7)%13)/100;
        const p=segment(u,threshold,Math.min(.93,threshold+.30));if(p<=0)continue;
        const variation=((row*31+col*17)%29)/29,x=(col+.25+((row*7)%5)*.15)*cw,y=(row+.5)*ch;
        const rw=cw*(1.3+variation)*(.6+p*.4),rh=ch*(.9+((row*11+col*3)%17)/17);
        mask.c.save();mask.c.translate(x,y);mask.c.scale(rw,rh);const g=mask.c.createRadialGradient(0,0,.05,0,0,1);g.addColorStop(0,`rgba(255,255,255,${p})`);g.addColorStop(.35,`rgba(255,255,255,${p*.85})`);g.addColorStop(1,"#ffffff00");mask.c.fillStyle=g;mask.c.fillRect(-1,-1,2,2);mask.c.restore();
      }
      if(u>.74){mask.c.fillStyle=`rgba(255,255,255,${segment(u,.74,1)})`;mask.c.fillRect(0,0,width,height);}
      next.c.save();next.c.globalCompositeOperation="destination-in";next.c.drawImage(mask.surface,0,0,width,height);next.c.restore();ctx.drawImage(next.surface,0,0,width,height);
    }else if(from===0){
      drawPainting(ctx,from,transition.fromProgress,1+ease(u)*.15);softReveal(next.c,ease(u),from);ctx.drawImage(next.surface,0,0,width,height);
      const f=point(camera(from,transition.fromProgress),chapters[from].focus);ctx.save();ctx.globalAlpha=Math.sin(Math.PI*u)*.55;
      for(let i=0;i<4;i++){const r=(u*.95+i*.055)*width;ellipse(ctx,f.x,f.y,r,r*.36,i%2?"#e8e7d4":"#506d58",i===0?2:.7);}ctx.restore();
    }else{
      drawPainting(ctx,from,transition.fromProgress);
      const rows=80,band=height/rows,feather=width*.22;
      mask.c.setTransform(ratio,0,0,ratio,0,0);mask.c.clearRect(0,0,width,height);
      for(let i=0;i<rows;i++){
        const advance=segment(u,.015,.99),edge=width*(1.25-advance*1.5),bend=Math.sin(i*.08+u*5)*width*.06*Math.sin(Math.PI*u),x=edge+bend;
        const g=mask.c.createLinearGradient(x-feather,0,x+feather,0);g.addColorStop(0,"#ffffff00");g.addColorStop(1,"#fff");mask.c.fillStyle=g;mask.c.fillRect(0,i*band,width,band+1);
      }
      next.c.save();next.c.globalCompositeOperation="destination-in";next.c.drawImage(mask.surface,0,0,width,height);next.c.restore();ctx.drawImage(next.surface,0,0,width,height);
      const fog=Math.sin(Math.PI*u)*.10;ctx.fillStyle=`rgba(235,231,216,${fog})`;ctx.fillRect(0,0,width,height);
      if(u>.94){ctx.globalAlpha=segment(u,.94,1);ctx.drawImage(next.surface,0,0,width,height);ctx.globalAlpha=1;}
    }
  }
  function render(){
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    if(transition){next.c.setTransform(ratio,0,0,ratio,0,0);next.c.clearRect(0,0,width,height);drawPainting(next.c,chapter,Math.min(.12,transition.elapsed/chapters[chapter].duration));transitionReveal(clamp(transition.elapsed/transition.duration));}
    else drawPainting(ctx,chapter,entered?clamp(elapsed/chapters[chapter].duration):.35);
  }
  function syncPlayback(){
    dirty=true;body.dataset.state=finished?"finished":entered?"journey":"invitation";viewer.classList.toggle("is-playing",playing);viewer.dataset.playing=String(playing);
    const label=playing?"暂停观看":finished?"重看全篇":entered?"继续观看":"播放全篇";
    byId("play-art").textContent=label+" ";const icon=document.createElement("span");icon.textContent=playing?"Ⅱ":finished?"↺":"▷";byId("play-art").append(icon);byId("play-art").setAttribute("aria-pressed",String(playing));byId("finish-note").hidden=!finished;
    byId("invitation").inert=entered;byId("invitation").setAttribute("aria-hidden",String(entered));updateSound();
  }
  function syncScene(updateHash=true){
    const scene=chapters[chapter];dirty=true;lastPoem="";body.dataset.scene=String(chapter);byId("scene-numeral").textContent=numerals[chapter];byId("scene-word").textContent=names[chapter]+" / "+scene.short;byId("scene-art-label").textContent=scene.artLabel;
    for(const [id,text]of[["scene-kind",names[chapter]],["scene-title",scene.title],["scene-subtitle",scene.subtitle],["scene-feeling",scene.feeling],["scene-art",scene.art],["scene-connection",scene.connection],["poem-prefix",scene.poemPrefix],["poem-line",scene.poem],["discovery-label",scene.discovery]])byId(id).textContent=text;
    byId("scene-count").textContent=`0${chapter+1} / 03`;byId("art-panel").setAttribute("aria-labelledby",`chapter-${chapter+1}`);canvas.setAttribute("aria-label",`${work.title}，${scene.title}。${scene.art}`);byId("painting-description").textContent=scene.art;
    tabs.forEach((tab,index)=>{tab.setAttribute("aria-selected",String(index===chapter));tab.tabIndex=index===chapter?0:-1;});byId("previous-art").disabled=!ready||chapter===0;byId("next-art").disabled=!ready||chapter===2;
    if(updateHash)history.replaceState(null,"",`#scene-${chapter+1}`);syncPlayback();syncOverlays();
  }
  function syncOverlays(){
    const p=elapsed/chapters[chapter].duration,show=entered&&!finished&&!transition;
    const poemVisible=show&&p>.10&&p<.48;
    if(lastPoem!==String(poemVisible)){byId("poem").classList.toggle("is-visible",poemVisible);lastPoem=String(poemVisible);}
    const discovery=byId("discovery"),scene=chapters[chapter],r=ready?camera(chapter,p):{x:0,y:0,w:width,h:height},f=point(r,scene.focus);
    discovery.style.left=`${clamp(f.x+18,width*.12,width*.75)}px`;discovery.style.top=`${clamp(f.y-35,height*.17,height*.74)}px`;
    discovery.classList.toggle("is-visible",show&&p>.53&&p<.86);
  }
  function beginTransition(target,manual=false){
    const from=chapter,fromProgress=clamp(elapsed/chapters[from].duration);chapter=target;elapsed=0;finished=false;lastProgress=-1;
    if(from!==target&&!reduced.matches&&!manual){transition={from,fromProgress,elapsed:0,duration:work.transitionSeconds};byId("passage").textContent=chapters[from].transition;byId("passage").hidden=false;viewer.dataset.transition="active";}
    else{transition=null;byId("passage").hidden=true;viewer.dataset.transition="rest";}
    syncScene();
  }
  function selectChapter(index){if(!ready)return;entered=true;playing=false;beginTransition(index,true);}
  chapters.forEach((scene,index)=>{
    const tab=document.createElement("button");tab.type="button";tab.disabled=true;tab.id=`chapter-${index+1}`;tab.setAttribute("role","tab");tab.setAttribute("aria-controls","art-panel");const n=document.createElement("small");n.textContent=numerals[index];tab.append(n,document.createTextNode(scene.navLabel));
    tab.addEventListener("click",()=>selectChapter(index));tab.addEventListener("keydown",event=>{let target;if(event.key==="ArrowRight")target=Math.min(2,index+1);if(event.key==="ArrowLeft")target=Math.max(0,index-1);if(event.key==="Home")target=0;if(event.key==="End")target=2;if(target!==undefined){event.preventDefault();selectChapter(target);tabs[target].focus();}});tabs.push(tab);byId("chapter-strip").append(tab);
  });
  work.sources.forEach(source=>{const link=document.createElement("a");link.href=source.url;link.textContent=source.label+" ↗";link.target="_blank";link.rel="noopener noreferrer";byId("art-sources").append(link);});
  function start(){if(!ready)return;entered=true;chapter=0;elapsed=0;motion=0;finished=false;transition=null;playing=true;byId("passage").hidden=true;viewer.dataset.transition="rest";syncScene();canvas.focus({preventScroll:true});}
  byId("enter-art").addEventListener("click",start);
  function togglePlay(){if(!ready)return;if(finished||!entered){start();return;}playing=!playing;syncPlayback();}
  byId("play-art").addEventListener("click",togglePlay);
  byId("previous-art").addEventListener("click",()=>selectChapter(Math.max(0,chapter-1)));byId("next-art").addEventListener("click",()=>selectChapter(Math.min(2,chapter+1)));
  byId("art-progress").addEventListener("input",event=>{transition=null;viewer.dataset.transition="rest";byId("passage").hidden=true;elapsed=Number(event.target.value)/1000*chapters[chapter].duration;playing=false;finished=false;lastProgress=-1;syncPlayback();syncOverlays();});
  function immersion(active){body.classList.toggle("is-immersive",active);byId("immerse-art").textContent=active?"收起 ↙":"展开 ↗";byId("immerse-art").setAttribute("aria-pressed",String(active));resize();}
  byId("immerse-art").addEventListener("click",()=>immersion(!body.classList.contains("is-immersive")));
  addEventListener("keydown",event=>{if(event.key==="Escape"&&body.classList.contains("is-immersive"))immersion(false);if(event.code==="Space"&&document.activeElement===canvas){event.preventDefault();togglePlay();}});
  byId("notes-link").addEventListener("click",()=>{playing=false;syncPlayback();byId("creative-notes").open=true;});
  function pointerEvent(event){const r=canvas.getBoundingClientRect();pointer.tx=clamp((event.clientX-r.left)/r.width);pointer.ty=clamp((event.clientY-r.top)/r.height);pointer.active=true;dirty=true;}
  canvas.addEventListener("pointermove",pointerEvent);canvas.addEventListener("pointerleave",()=>{pointer.active=false;pointer.tx=.5;pointer.ty=.5;dirty=true;});
  canvas.addEventListener("pointerdown",event=>{pointerEvent(event);if(entered&&key==="rain"&&!reduced.matches){ripples.push({x:pointer.tx,y:pointer.ty,at:motion});ripples=ripples.slice(-6);dirty=true;}});
  function readHash(){const match=location.hash.match(/^#scene-([1-3])$/);if(match){chapter=Number(match[1])-1;entered=true;elapsed=0;playing=false;finished=false;transition=null;byId("passage").hidden=true;viewer.dataset.transition="rest";syncScene(false);}}
  addEventListener("hashchange",readHash);
  function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;ratio=Math.min(devicePixelRatio||1,1.25);for(const surface of[canvas,next.surface,mask.surface]){surface.width=Math.round(width*ratio);surface.height=Math.round(height*ratio);}dirty=true;}
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener("visibilitychange",()=>{lastFrame=0;updateSound();});
  reduced.addEventListener("change",event=>{if(event.matches){transition=null;viewer.dataset.transition="rest";byId("passage").hidden=true;dirty=true;syncOverlays();}});
  let audio=null,soundOn=false,lastDrop=-1;
  function createSound(){
    const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return false;
    const ac=new AudioContext(),master=ac.createGain();master.gain.value=0;master.connect(ac.destination);
    const filter=ac.createBiquadFilter();filter.type="lowpass";filter.frequency.value=key==="light"?900:1800;filter.connect(master);
    const voices=[0,1,2].map((_,i)=>{const o=ac.createOscillator(),g=ac.createGain();o.type="sine";o.frequency.value=[130.81,196,261.63][i];g.gain.value=[.11,.045,.025][i];o.connect(g);g.connect(filter);o.start();return o;});
    const noise=ac.createBuffer(1,ac.sampleRate*3,ac.sampleRate),data=noise.getChannelData(0),noiseRandom=seed(7);for(let i=0;i<data.length;i++)data[i]=noiseRandom()*2-1;
    const source=ac.createBufferSource();source.buffer=noise;source.loop=true;const noiseFilter=ac.createBiquadFilter();noiseFilter.type="bandpass";noiseFilter.frequency.value=key==="rain"?950:450;noiseFilter.Q.value=.45;const noiseGain=ac.createGain();noiseGain.gain.value=key==="rain"?.12:.012;source.connect(noiseFilter);noiseFilter.connect(noiseGain);noiseGain.connect(master);source.start();
    audio={ac,master,voices,filter,noiseGain};return true;
  }
  function updateSound(){if(!audio)return;const active=soundOn&&playing&&!document.hidden;audio.master.gain.setTargetAtTime(active?.65:0,audio.ac.currentTime,.35);if(active&&audio.ac.state==="suspended")audio.ac.resume().catch(()=>{});}
  byId("sound-art").addEventListener("click",()=>{if(!audio&&!createSound()){byId("sound-art").textContent="声音不可用";return;}soundOn=!soundOn;byId("sound-art").textContent=soundOn?"声音 开":"声音 关";byId("sound-art").setAttribute("aria-pressed",String(soundOn));audio.ac.resume().catch(()=>{});updateSound();});
  function soundFrame(){
    if(!audio||!soundOn||!playing||document.hidden)return;const t=audio.ac.currentTime,roots=key==="light"?[130.81,164.81,196]:[146.83,174.61,196],root=roots[chapter];
    audio.voices.forEach((v,i)=>v.frequency.setTargetAtTime(root*[1,1.5,2][i],t,2));audio.filter.frequency.setTargetAtTime(key==="light"?[650,1000,1600][chapter]:[1400,2300,800][chapter],t,2);audio.noiseGain.gain.setTargetAtTime(key==="rain"?[.08,.17,.045][chapter]:.012,t,2);
    const drop=Math.floor(motion/(chapter===0?2.6:5));if(key==="rain"&&drop!==lastDrop){lastDrop=drop;const o=audio.ac.createOscillator(),g=audio.ac.createGain();o.frequency.setValueAtTime(chapter===0?1100:660,t);o.frequency.exponentialRampToValueAtTime(330,t+.3);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.055,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+1.2);o.connect(g);g.connect(audio.master);o.start();o.stop(t+1.25);}
  }
  readHash();syncScene(false);resize();
  Promise.all(images.map(image=>image.decode())).then(()=>{ready=true;byId("loading").hidden=true;for(const id of["enter-art","play-art","art-progress"])byId(id).disabled=false;tabs.forEach(tab=>{tab.disabled=false;});viewer.dataset.ready="true";syncScene(false);}).catch(()=>{byId("loading").textContent="画面暂未载入，请刷新后重试。";viewer.dataset.ready="error";});
  function frame(now){
    const dt=lastFrame?Math.min((now-lastFrame)/1000,1):0;lastFrame=now;
    if(ready&&!document.hidden){
      const movingPointer=Math.abs(pointer.tx-pointer.x)+Math.abs(pointer.ty-pointer.y)>.001;
      if(movingPointer&&!reduced.matches){pointer.x=mix(pointer.x,pointer.tx,Math.min(1,dt*3));pointer.y=mix(pointer.y,pointer.ty,Math.min(1,dt*3));dirty=true;}
      if(playing)motion+=dt;
      if(transition){if(playing)transition.elapsed+=dt;if(transition.elapsed>=transition.duration){transition=null;viewer.dataset.transition="rest";byId("passage").hidden=true;dirty=true;}}
      else if(playing){elapsed+=dt;if(elapsed>=chapters[chapter].duration){elapsed=chapters[chapter].duration;if(chapter<2)beginTransition(chapter+1);else{playing=false;finished=true;syncPlayback();}}}
      if((playing||dirty)&&(dirty||now-lastPaint>=1000/30)){render();syncOverlays();soundFrame();dirty=false;lastPaint=now;}
      const progress=Math.round(clamp(elapsed/chapters[chapter].duration)*1000);if(progress!==lastProgress){byId("art-progress").value=progress;lastProgress=progress;}
      ripples=ripples.filter(ripple=>motion-ripple.at<3.5);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
