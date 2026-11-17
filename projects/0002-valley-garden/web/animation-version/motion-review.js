/** Local inspection controls; absent from the ordinary garden entry. */
export function createMotionReview({root,seek,observe,getStatus}){
  const enabled=new URLSearchParams(location.search).has('inspect')&&new URLSearchParams(location.search).has('review');
  const state={enabled,paused:false,rate:1,focus:null,errors:[]};if(!enabled)return state;
  const panel=document.createElement('aside');panel.id='motion-review';panel.setAttribute('aria-label','动作检查');
  panel.style.cssText='position:absolute;z-index:60;top:82px;left:18px;max-width:calc(100% - 36px);padding:10px;border-radius:12px;background:rgba(23,36,28,.9);color:#fff;font:12px/1.5 sans-serif;box-shadow:0 3px 15px #0003;';
  const row=document.createElement('div');row.style.cssText='display:flex;gap:5px;flex-wrap:wrap;';panel.append(row);
  const button=(label,action)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='border:1px solid #ffffff40;border-radius:6px;padding:5px 8px;background:#506450;color:white;cursor:pointer;';b.addEventListener('click',action);row.append(b);return b;};
  for(const [label,view]of [['行走侧面','side'],['站立接地','feet'],['行走脚部','walkFeet'],['停步接地','stopFeet'],['抬头环顾','look'],['吃草嘴部','head'],['甩尾近景','tail'],['浅滩水流','water']])button(label,()=>{state.focus=view;state.paused=false;seek(view);observe(view);});
  const pause=button('暂停',()=>{state.paused=!state.paused;pause.textContent=state.paused?'播放':'暂停';});
  button('慢放',()=>{state.rate=state.rate===1?.5:1;});
  button('逐帧',()=>{state.paused=true;pause.textContent='播放';seek('step');});
  const expand=button('放大画面',async()=>{if(document.fullscreenElement){await document.exitFullscreen();expand.textContent='放大画面';}else{await root.requestFullscreen();expand.textContent='还原画面';}});
  const status=document.createElement('div');status.id='motion-review-status';status.setAttribute('role','status');status.style.cssText='margin-top:5px;white-space:pre-wrap;';panel.append(status);root.append(panel);
  state.update=()=>{status.textContent=getStatus()+(state.errors.length?'\n渲染错误：'+state.errors.join('\n'):' · 渲染错误 0');};
  return state;
}
