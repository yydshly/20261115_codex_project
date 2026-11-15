export const button=(text,attrs='')=>`<button type="button" ${attrs}>${text}</button>`;
export const loop=fn=>{let id;const tick=t=>{fn(t);id=requestAnimationFrame(tick)};id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id)};
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const svgEl=(name,attrs={})=>{const el=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el};
export function canvasStage(stage,w=1200,h=550){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.setAttribute('aria-label','原创动态图形作品');stage.append(canvas);return[canvas,canvas.getContext('2d')];}
export function round(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
export function text(ctx,t,x,y,size=14,color='#e5efdc',weight=400){ctx.fillStyle=color;ctx.font=`${weight} ${size}px "Segoe UI","Microsoft YaHei",sans-serif`;ctx.fillText(t,x,y)}
export function saveBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
