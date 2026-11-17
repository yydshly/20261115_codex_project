"use strict";
(() => {
  const byId=id=>document.getElementById(id);
  const key=document.body.dataset.work,work=window.ART_STUDIES.works[key],chapters=work.chapters;
  const canvas=byId("painting"),ctx=canvas.getContext("2d"),viewer=document.querySelector(".viewer");
  const nextLayer=document.createElement("canvas"),nextCtx=nextLayer.getContext("2d");
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  const images=chapters.map((chapter,index)=>{const img=new Image();img.decoding="async";if(index===0)img.fetchPriority="high";img.src=chapter.image;return img;});
  const numerals=["Ⅰ","Ⅱ","Ⅲ"],names=["第一幕","第二幕","第三幕"],tabs=[];
  let chapter=0,elapsed=0,motion=0,playing=false,ready=false,finished=false,transition=null;
  let width=0,height=0,ratio=1,lastFrame=0,lastPaint=0,dirty=true,lastProgress=-1;
  const seed=(value=13)=>()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  const random=seed(34),specks=Array.from({length:160},()=>({x:random(),y:random(),phase:random()*6.28,size:.3+random()*1.3,speed:.4+random()}));
  const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
  const ease=value=>value*value*(3-2*value);
  const mix=(a,b,t)=>a+(b-a)*t;
  function rectFor(image){const fit=Math.min(width/image.width,height/image.height);return{x:(width-image.width*fit)/2,y:(height-image.height*fit)/2,w:image.width*fit,h:image.height*fit};}
  function point(rect,position){return{x:rect.x+rect.w*position[0],y:rect.y+rect.h*position[1]};}
  function circle(c,x,y,r,fill){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();}
  function ellipse(c,x,y,rx,ry,stroke,line=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}
  function drawPainting(c,index,progress){
    const image=images[index],scene=chapters[index],rect=rectFor(image);
    c.fillStyle=key==="light"?"#11160f":"#e9e3d5";c.fillRect(0,0,width,height);
    c.save();c.beginPath();c.rect(rect.x,rect.y,rect.w,rect.h);c.clip();
    let zoom=1;
    if(!reduced.matches){const ranges=key==="light"?[[1,1.025],[1.012,1.055],[1.038,1]]:[[1.015,1.048],[1.028,1.008],[1.045,1]];zoom=mix(...ranges[index],ease(progress));}
    const focus=point(rect,scene.focus);c.translate(focus.x,focus.y);c.scale(zoom,zoom);c.translate(-focus.x,-focus.y);c.drawImage(image,rect.x,rect.y,rect.w,rect.h);c.restore();
    if(!reduced.matches)drawAtmosphere(c,scene,rect,motion);
    return rect;
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
  function transitionReveal(c,u,from,to){
    const sourceRect=rectFor(images[from]),destinationRect=rectFor(images[to]);
    const source=point(sourceRect,chapters[from].focus),destination=point(destinationRect,chapters[to].focus);
    const focus={x:mix(source.x,destination.x,ease(u)),y:mix(source.y,destination.y,ease(u))};
    if(key==="rain"&&from===1){
      c.globalAlpha=ease(u);c.drawImage(nextLayer,0,0,width,height);c.globalAlpha=1;
      const strength=Math.sin(u*Math.PI)*.16,cloud=c.createLinearGradient(0,height*.16,0,height*.88);
      cloud.addColorStop(0,"#eae4d400");cloud.addColorStop(.5,`rgba(234,228,212,${strength})`);cloud.addColorStop(1,"#eae4d400");c.fillStyle=cloud;c.fillRect(0,0,width,height);
    }else{
      nextCtx.save();nextCtx.globalCompositeOperation="destination-in";
      const radius=Math.max(1,Math.hypot(width,height)*1.45*ease(u));
      const reveal=nextCtx.createRadialGradient(focus.x,focus.y,Math.max(0,radius-Math.hypot(width,height)*.18),focus.x,focus.y,radius);
      reveal.addColorStop(0,"#fff");reveal.addColorStop(1,"#ffffff00");nextCtx.fillStyle=reveal;nextCtx.fillRect(0,0,width,height);nextCtx.restore();
      c.drawImage(nextLayer,0,0,width,height);
    }
    c.save();
    if(key==="light"){
      c.globalCompositeOperation="screen";const radius=width*(.025+Math.sin(Math.PI*u)*.30),bloom=c.createRadialGradient(focus.x,focus.y,0,focus.x,focus.y,radius);
      bloom.addColorStop(0,`rgba(255,221,160,${Math.sin(Math.PI*u)*.25})`);bloom.addColorStop(1,"#efca8b00");c.fillStyle=bloom;c.fillRect(0,0,width,height);
      specks.slice(0,32).forEach(s=>{const spread=from===0?1-u:u,angle=s.phase,r=spread*width*(.02+s.x*.20);c.globalAlpha=Math.sin(Math.PI*u)*.20;c.fillStyle=from===0?["#d3ac7b","#c7b5d5","#dbbc81"][Math.floor(s.x*3)%3]:"#f5df9d";c.fillRect(focus.x+Math.cos(angle)*r,focus.y+Math.sin(angle)*r*.4,(1+s.size*3)*(width/1200),1.2*(width/1200));});
    }else if(from===0){
      const p=ease(u),r=width*(.02+p*.85);c.globalAlpha=Math.sin(Math.PI*u)*.17;ellipse(c,source.x,source.y,r,r*.28,"#e8e4ce",1.2);ellipse(c,source.x,source.y,r*.78,r*.21,"#566e5a",.6);
    }
    c.restore();
  }
  function render(){
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
    if(transition){
      drawPainting(ctx,transition.from,transition.fromProgress);
      nextCtx.setTransform(ratio,0,0,ratio,0,0);nextCtx.clearRect(0,0,width,height);drawPainting(nextCtx,chapter,0);
      transitionReveal(ctx,clamp(transition.elapsed/transition.duration),transition.from,chapter);
    }else drawPainting(ctx,chapter,clamp(elapsed/chapters[chapter].duration));
  }
  function syncPlayback(){
    dirty=true;viewer.classList.toggle("is-playing",playing);byId("play-art").setAttribute("aria-pressed",String(playing));byId("play-art").replaceChildren(document.createTextNode(playing?"暂停观看 ":finished?"重看全篇 ":chapter>0||elapsed>0||transition?"继续观看 ":"播放全篇 "));
    const icon=document.createElement("span");icon.textContent=playing?"Ⅱ":finished?"↺":"▷";byId("play-art").append(icon);byId("finish-note").hidden=!finished;
  }
  function syncScene(updateHash=true){
    dirty=true;const scene=chapters[chapter];
    byId("scene-numeral").textContent=numerals[chapter];byId("scene-word").textContent=names[chapter];byId("scene-kind").textContent=`${names[chapter]} / ${scene.short}`;
    for(const [id,value] of [["scene-title",scene.title],["scene-subtitle",scene.subtitle],["scene-feeling",scene.feeling],["scene-art",scene.art],["scene-connection",scene.connection]])byId(id).textContent=value;
    byId("scene-count").textContent=`0${chapter+1} / 03`;byId("art-panel").setAttribute("aria-labelledby",`chapter-${chapter+1}`);canvas.setAttribute("aria-label",`${work.title}，${scene.title}。${scene.subtitle}${scene.art}`);byId("painting-description").textContent=scene.art;
    tabs.forEach((tab,index)=>{const active=index===chapter;tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;});
    byId("previous-art").disabled=!ready||chapter===0;byId("next-art").disabled=!ready||chapter===2;
    if(updateHash)history.replaceState(null,"",`#scene-${chapter+1}`);
    syncPlayback();
  }
  function beginTransition(target,manual=false){
    const from=chapter,fromProgress=clamp(elapsed/chapters[from].duration);chapter=target;elapsed=0;finished=false;lastProgress=-1;
    if(from!==target&&!reduced.matches){transition={from,fromProgress,elapsed:0,duration:manual?1.15:work.transitionSeconds,manual};byId("passage").textContent=chapters[from].transition;byId("passage").hidden=manual;viewer.dataset.transition="active";}
    else{transition=null;byId("passage").hidden=true;viewer.dataset.transition="rest";}
    syncScene();
  }
  function selectChapter(index){playing=false;beginTransition(index,true);}
  chapters.forEach((scene,index)=>{
    const tab=document.createElement("button");tab.type="button";tab.id=`chapter-${index+1}`;tab.setAttribute("role","tab");tab.setAttribute("aria-controls","art-panel");
    const thumb=document.createElement("img");thumb.src=scene.image;thumb.alt="";thumb.width=108;thumb.height=61;
    const copy=document.createElement("span"),number=document.createElement("small"),title=document.createElement("b");number.textContent=`0${index+1} / ${scene.duration} SEC`;title.textContent=scene.title;copy.append(number,title);tab.append(thumb,copy);
    tab.addEventListener("click",()=>selectChapter(index));
    tab.addEventListener("keydown",event=>{let target;if(event.key==="ArrowRight")target=Math.min(2,index+1);if(event.key==="ArrowLeft")target=Math.max(0,index-1);if(event.key==="Home")target=0;if(event.key==="End")target=2;if(target!==undefined){event.preventDefault();selectChapter(target);tabs[target].focus();}});
    tabs.push(tab);byId("chapter-strip").append(tab);
  });
  work.sources.forEach(source=>{const link=document.createElement("a");link.href=source.url;link.textContent=source.label+" ↗";link.target="_blank";link.rel="noopener noreferrer";byId("art-sources").append(link);});
  byId("play-art").addEventListener("click",()=>{
    if(finished){chapter=0;elapsed=0;finished=false;transition=null;byId("passage").hidden=true;playing=true;syncScene();}
    else{playing=!playing;if(transition&&playing)transition.manual=false;syncPlayback();}
  });
  byId("previous-art").addEventListener("click",()=>selectChapter(Math.max(0,chapter-1)));
  byId("next-art").addEventListener("click",()=>selectChapter(Math.min(2,chapter+1)));
  byId("art-progress").addEventListener("input",event=>{transition=null;viewer.dataset.transition="rest";byId("passage").hidden=true;elapsed=Number(event.target.value)/1000*chapters[chapter].duration;playing=false;finished=false;lastProgress=-1;syncPlayback();});
  function immersion(active){document.body.classList.toggle("is-immersive",active);byId("immerse-art").textContent=active?"退出沉浸 ↙":"沉浸观看 ↗";byId("immerse-art").setAttribute("aria-pressed",String(active));resize();}
  byId("immerse-art").addEventListener("click",()=>immersion(!document.body.classList.contains("is-immersive")));
  addEventListener("keydown",event=>{if(event.key==="Escape"&&document.body.classList.contains("is-immersive"))immersion(false);});
  function readHash(){const match=location.hash.match(/^#scene-([1-3])$/);if(match){chapter=Number(match[1])-1;elapsed=0;playing=false;finished=false;transition=null;byId("passage").hidden=true;syncScene(false);}}
  addEventListener("hashchange",readHash);
  function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;ratio=Math.min(devicePixelRatio||1,1.25);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);nextLayer.width=canvas.width;nextLayer.height=canvas.height;dirty=true;}
  new ResizeObserver(resize).observe(canvas);
  document.addEventListener("visibilitychange",()=>{lastFrame=0;});
  reduced.addEventListener("change",event=>{if(event.matches){playing=false;transition=null;byId("passage").hidden=true;syncPlayback();}});
  readHash();syncScene(false);resize();
  Promise.all(images.map(image=>image.decode())).then(()=>{ready=true;byId("loading").hidden=true;byId("play-art").disabled=false;byId("art-progress").disabled=false;viewer.dataset.ready="true";syncScene(false);}).catch(()=>{byId("loading").textContent="画面暂未载入，请刷新后重试。";viewer.dataset.ready="error";});
  function frame(now){
    const dt=lastFrame?Math.min((now-lastFrame)/1000,1):0;lastFrame=now;
    if(ready&&!document.hidden){
      if(playing)motion+=dt;
      if(transition){
        if(playing||transition.manual)transition.elapsed+=dt;
        if(transition.elapsed>=transition.duration){transition=null;viewer.dataset.transition="rest";byId("passage").hidden=true;dirty=true;}
      }else if(playing){
        elapsed+=dt;
        if(elapsed>=chapters[chapter].duration){elapsed=chapters[chapter].duration;if(chapter<2)beginTransition(chapter+1);else{playing=false;finished=true;syncPlayback();}}
      }
      if((playing||(transition&&transition.manual)||dirty)&&(dirty||now-lastPaint>=1000/30)){render();dirty=false;lastPaint=now;}
      const progress=Math.round(clamp(elapsed/chapters[chapter].duration)*1000);if(progress!==lastProgress){byId("art-progress").value=progress;lastProgress=progress;}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
