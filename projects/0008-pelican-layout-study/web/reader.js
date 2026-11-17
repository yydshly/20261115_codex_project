"use strict";
(() => {
  const scenes=window.ORIGINAL_SCENES;
  const byId=id=>document.getElementById(id);
  const stamp=time=>`${String(Math.floor(time/60)).padStart(2,"0")}:${String(time%60).padStart(2,"0")}`;
  let current=0;
  const tabs=[];
  scenes.forEach((scene,index)=>{
    const button=document.createElement("button");button.type="button";button.id=`scene-tab-${scene.id}`;button.setAttribute("role","tab");button.setAttribute("aria-controls","scene-panel");button.setAttribute("aria-selected",String(index===0));button.tabIndex=index===0?0:-1;
    const number=document.createElement("small");number.textContent=`${String(scene.id).padStart(2,"0")} / ${stamp(scene.time)}`;
    const name=document.createElement("span");name.textContent=scene.name;button.append(number,name);
    button.addEventListener("click",()=>render(index,true));
    button.addEventListener("keydown",event=>{let next;if(event.key==="ArrowRight")next=Math.min(scenes.length-1,index+1);if(event.key==="ArrowLeft")next=Math.max(0,index-1);if(event.key==="Home")next=0;if(event.key==="End")next=scenes.length-1;if(next!==undefined){event.preventDefault();render(next,true);tabs[next].focus();}});
    tabs.push(button);byId("scene-index").append(button);
  });
  function render(index,updateHash=false){
    current=Math.max(0,Math.min(scenes.length-1,index));const scene=scenes[current];
    byId("scene-image").src=`../assets/reference/${scene.image}`;byId("scene-image").alt=`原片 ${stamp(scene.time)} 抽帧：${scene.name}。${scene.observed}`;
    for(const field of ["theme","observed","art","atmosphere","character","before","after","design"])byId(`scene-${field}`).textContent=scene[field];
    byId("scene-title").textContent=scene.name;byId("scene-caption").textContent=`${stamp(scene.time)} 抽帧 · ${scene.name}`;byId("scene-count").textContent=`${String(current+1).padStart(2,"0")} / ${scenes.length}`;byId("scene-phase").textContent=scene.phase;
    tabs.forEach((tab,i)=>{tab.setAttribute("aria-selected",String(i===current));tab.tabIndex=i===current?0:-1;});
    byId("scene-panel").setAttribute("aria-labelledby",`scene-tab-${scene.id}`);byId("scene-prev").disabled=current===0;byId("scene-next").disabled=current===scenes.length-1;byId("scene-next").textContent=current===scenes.length-1?"已到原片结尾":"后一场景 →";
    if(updateHash)history.replaceState(null,"",`#scene-${scene.id}`);
  }
  byId("scene-prev").addEventListener("click",()=>render(current-1,true));byId("scene-next").addEventListener("click",()=>render(current+1,true));
  function readHash(){const match=location.hash.match(/^#scene-(\d+)$/);if(match){const index=scenes.findIndex(scene=>scene.id===Number(match[1]));if(index>=0){render(index);byId("scene-panel").scrollIntoView({behavior:"instant"});}}}
  byId("expand-frame").addEventListener("click",()=>{const scene=scenes[current];byId("dialog-image").src=`../assets/reference/${scene.image}`;byId("dialog-image").alt=byId("scene-image").alt;byId("dialog-caption").textContent=`${stamp(scene.time)} 抽帧 · ${scene.name} / @NFT_Chen 原帖视频`;byId("image-dialog").showModal();});
  byId("close-dialog").addEventListener("click",()=>byId("image-dialog").close());
  byId("image-dialog").addEventListener("click",event=>{if(event.target===byId("image-dialog")){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)event.currentTarget.close();}});
  addEventListener("hashchange",readHash);render(0);readHash();
})();
