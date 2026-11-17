"use strict";
const data=JSON.parse(document.getElementById("research-data").textContent);
const byId=new Map(data.tools.map(t=>[t.id,t]));
const routeButtons=document.querySelector(".route-buttons");
const routeDetail=document.getElementById("route-detail");
function el(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x;}
function showRoute(route){
 routeButtons.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.route===route.id)));
 routeDetail.replaceChildren(el("h3",route.label),el("p",route.goal));
 const flow=el("div",undefined,"route-flow");
 route.stages.forEach((stage,i)=>{if(i)flow.append(el("span","→"));const box=el("div",undefined,"route-stage");box.append(el("strong",stage.label));const links=el("div");stage.ids.forEach((id,j)=>{if(j)links.append(el("span"," / "));const a=el("a",byId.get(id).name);a.href="#tool-"+id;a.addEventListener("click",()=>resetFilters());links.append(a);});box.append(links);flow.append(box);});
 routeDetail.append(flow,el("p",route.note,"small"));
 if(route.optional.length)routeDetail.append(el("p","按需要再参考："+route.optional.map(id=>byId.get(id).name).join("、"),"small"));
}
for(const route of data.routes){const b=el("button",route.label);b.type="button";b.dataset.route=route.id;b.setAttribute("aria-pressed","false");b.addEventListener("click",()=>showRoute(route));routeButtons.append(b);}
showRoute(data.routes[0]);
const search=document.getElementById("search"),category=document.getElementById("category"),onlyMade=document.getElementById("only-made");
const cards=[...document.querySelectorAll(".tool")];
function filter(){
 const query=search.value.trim().toLowerCase().replaceAll("3d","三维");
 let count=0;
 const tags={realistic:"写实",avatar:"数字人 口播",text:"文字 字幕 标题",data:"数据 图表",world:"世界 场景",pixel:"像素",film:"视频 短片",web:"网页 界面 ui",workflow:"工作流 技能 规则"};
 for(const card of cards){const t=byId.get(card.dataset.id);const text=[t.name,t.kind,t.role,t.effect,t.value,t.when,t.input,t.output,t.goal,t.uses.map(x=>tags[x]||x).join(" "),["three","blender"].includes(t.id)?"三维":""].join(" ").toLowerCase();
 const visible=(!category.value||category.value===t.group)&&(!query||text.includes(query))&&(!onlyMade.checked||["made","shared"].includes(t.level));
 card.hidden=!visible;if(visible)count++;
 }
 document.querySelectorAll("[data-group-section]").forEach(s=>s.hidden=![...s.querySelectorAll(".tool")].some(x=>!x.hidden));
 document.getElementById("filter-status").textContent="当前显示 "+count+" / 15 项。"+(onlyMade.checked?"本地制作与共享应用的范围各有不同，详见每项验证说明。":"");
 document.getElementById("no-results").hidden=count!==0;
}
function resetFilters(){search.value="";category.value="";onlyMade.checked=false;filter();}
search.addEventListener("input",filter);category.addEventListener("change",filter);onlyMade.addEventListener("change",filter);document.getElementById("reset-filters").addEventListener("click",resetFilters);
const picked=new Set(["remotion","remotion-skills"]);
const compareStatus=document.getElementById("compare-status");
function renderCompare(){
 document.querySelectorAll("[data-compare]").forEach(c=>c.checked=picked.has(c.dataset.compare));
 const tableHost=document.getElementById("compare-table");tableHost.replaceChildren();
 if(!picked.size){tableHost.append(el("p","在上方卡片勾选最多3项。","small"));return;}
 const table=el("table"),caption=el("caption","当前工具分工对照");caption.className="sr-only";table.append(caption);
 const tools=[...picked].map(id=>byId.get(id)),head=el("thead"),tr=el("tr");tr.append(el("th","比较内容"));tools.forEach(t=>tr.append(el("th",t.name)));head.append(tr);table.append(head);
 const body=el("tbody");
 for(const [label,field]of [["作用","role"],["输入 → 输出",null],["什么时候参考","when"],["对我们的价值","value"],["已验证范围","evidence"],["理解边界","avoid"]]){
  const row=el("tr"),th=el("th",label);th.scope="row";row.append(th);tools.forEach(t=>row.append(el("td",field?t[field]:t.input+" → "+t.output)));body.append(row);
 }
 table.append(body);tableHost.append(table);
}
document.querySelectorAll("[data-compare]").forEach(c=>c.addEventListener("change",()=>{
 if(c.checked&&picked.size>=3){c.checked=false;compareStatus.textContent="最多同时对照3项，请先取消一项。";return;}
 if(c.checked)picked.add(c.dataset.compare);else picked.delete(c.dataset.compare);
 compareStatus.textContent="已选择 "+picked.size+" 项；可滚动查看表格。";renderCompare();
}));
document.getElementById("clear-compare").addEventListener("click",()=>{picked.clear();compareStatus.textContent="已清空，可重新选择。";renderCompare();});renderCompare();
const dialog=document.getElementById("image-dialog");
document.querySelectorAll("[data-zoom]").forEach(b=>b.addEventListener("click",()=>{
 const t=byId.get(b.dataset.zoom);document.getElementById("zoom-title").textContent=t.name;
 const img=document.getElementById("zoom-image");img.src="../assets/thumbs/"+t.media+".jpg";img.alt=t.effect;document.getElementById("zoom-credit").textContent=t.identity+" · "+t.credit+"。"+t.effect;dialog.showModal();
}));
document.getElementById("close-dialog").addEventListener("click",()=>dialog.close());
document.querySelectorAll("[data-youtube]").forEach(b=>b.addEventListener("click",()=>{const f=el("iframe");f.src="https://www.youtube-nocookie.com/embed/I29rn92gkC4";f.title="Blender MCP作者使用Polyhaven资产的演示";f.allowFullscreen=true;b.replaceWith(f);}));
document.querySelectorAll("video").forEach(v=>{v.addEventListener("play",()=>document.querySelectorAll("video").forEach(o=>{if(o!==v)o.pause();}));});
window.addEventListener("hashchange",()=>{if(location.hash.startsWith("#tool-"))resetFilters();});
if(location.hash.startsWith("#tool-"))resetFilters();
