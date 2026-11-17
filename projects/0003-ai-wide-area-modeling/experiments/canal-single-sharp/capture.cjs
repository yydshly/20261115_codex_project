// Capture actual WebGL splat renders in an isolated headless Chrome instance.
const fs=require('node:fs');const path=require('node:path');
const [modules,out,url='http://127.0.0.1:8769',frameArg='60']=process.argv.slice(2);
const {chromium}=require(path.join(modules,'playwright-core'));
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=d3d11','--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1200,height:820},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE_ERROR',String(e));});
 page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,500));});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.sharpReady,{},{timeout:120000});
 // Decoding completion precedes the first asynchronous GPU upload/sort.
 // Require actual non-background canvas pixels before saving any evidence.
 await page.waitForFunction(()=>{
   const c=document.querySelector('canvas'),gl=c.getContext('webgl2'),p=new Uint8Array(64*64*4);
   gl.readPixels(Math.floor(c.width/2),Math.floor(c.height/2),64,64,gl.RGBA,gl.UNSIGNED_BYTE,p);
   let visible=0;for(let i=0;i<p.length;i+=4)if(Math.abs(p[i]-16)+Math.abs(p[i+1]-20)+Math.abs(p[i+2]-28)>40)visible++;
   return visible>300;
 },{},{timeout:120000});
 fs.mkdirSync(out,{recursive:true});
 const info=await page.evaluate(()=>window.sharpInfo);console.log('RENDER_INFO',info);
 for(const name of ['original','left','right','forward','wide']){
   const image=await page.evaluate(n=>window.renderView(n),name);
   fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(image.split(',')[1],'base64'));
   console.log('CAPTURED',name);
 }
 const count=Number(frameArg);
 const frames=path.join(out,'frames');if(count)fs.mkdirSync(frames,{recursive:true});
 for(let i=0;i<count;i++){
   const image=await page.evaluate(t=>window.renderPhase(t),i/count*2*Math.PI);
   fs.writeFileSync(path.join(frames,String(i).padStart(3,'0')+'.png'),Buffer.from(image.split(',')[1],'base64'));
   if(i%15===0)console.log('FRAME',i,'/',count);
 }
 await page.evaluate(()=>window.renderView('original'));
 await page.screenshot({path:path.join(out,'viewer-screenshot.png')});
 fs.writeFileSync(path.join(out,'render-report.json'),JSON.stringify({...info,errors,frames:count,browser:await browser.version(),representation:'Actual predicted anisotropic 3D Gaussians rendered by Spark 2.4.0; no point-cloud or triangle replacement',cameraOffsets:'Left/right +/- 3% median predicted depth, forward 3%, wide right 10%; camera looks at center at median depth'},null,2));
 await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
