"use strict";
(() => {
  const stage=document.getElementById("map-stage");
  const art=document.getElementById("map-art");
  const value=document.getElementById("zoom-value");
  const status=document.getElementById("map-status");
  let naturalWidth=2400,naturalHeight=1500,scale=1,fit=true;
  const fitScale=()=>Math.min(1,(stage.clientWidth-(stage.clientWidth<600?20:40))/naturalWidth);
  function apply(next,keepFit=false){
    const old=scale;
    const centerX=(stage.scrollLeft+stage.clientWidth/2)/old;
    const centerY=(stage.scrollTop+stage.clientHeight/2)/old;
    scale=Math.min(1.6,Math.max(.08,next));
    fit=keepFit;
    art.style.width=`${Math.round(naturalWidth*scale)}px`;
    art.style.height=`${Math.round(naturalHeight*scale)}px`;
    value.textContent=`${Math.round(scale*100)}%`;
    if(keepFit){stage.scrollLeft=0;stage.scrollTop=0;}
    else {stage.scrollLeft=Math.max(0,centerX*scale-stage.clientWidth/2);stage.scrollTop=Math.max(0,centerY*scale-stage.clientHeight/2);}
  }
  document.getElementById("zoom-in").addEventListener("click",()=>apply(scale*1.4));
  document.getElementById("zoom-out").addEventListener("click",()=>apply(scale/1.4));
  document.getElementById("zoom-fit").addEventListener("click",()=>apply(fitScale(),true));
  document.getElementById("zoom-actual").addEventListener("click",()=>apply(1));
  window.addEventListener("resize",()=>{if(fit)apply(fitScale(),true)});
  function ready(){
    try {
      const svg=art.contentDocument?.documentElement;
      if(svg?.localName!=="svg")return;
      const viewBox=svg.getAttribute("viewBox").split(/\s+/).map(Number);
      naturalWidth=viewBox[2];naturalHeight=viewBox[3];
      status.textContent=`关系图已载入 · ${naturalWidth} × ${naturalHeight} · 点击节点打开入口；更多链接与边界见详细清单图。`;
      apply(fitScale(),true);
    } catch {
      status.textContent="可使用上方入口单独打开高清图；矢量版保留可点击链接。";
    }
  }
  art.addEventListener("load",ready);
  apply(fitScale(),true);
  ready();
})();
