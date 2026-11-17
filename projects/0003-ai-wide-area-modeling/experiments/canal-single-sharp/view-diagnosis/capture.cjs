const fs=require('node:fs'),path=require('node:path');const [modules,out,url='http://127.0.0.1:8770']=process.argv.slice(2);
const{chromium}=require(path.join(modules,'playwright-core'));let browser;
(async()=>{
 const b=browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=d3d11','--enable-webgl','--ignore-gpu-blocklist']});
 const page=await b.newPage({viewport:{width:1500,height:780},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(String(e));console.log(String(e))});
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.diagnosisReady,{},{timeout:120000});
 await page.waitForFunction(()=>{const c=document.querySelector('canvas'),g=c.getContext('webgl2'),p=new Uint8Array(16384);g.readPixels(450,250,64,64,g.RGBA,g.UNSIGNED_BYTE,p);let n=0;for(let i=0;i<p.length;i+=4)if(Math.abs(p[i]-16)+Math.abs(p[i+1]-20)+Math.abs(p[i+2]-28)>40)n++;return n>300},{},{timeout:120000});
 const report={info:await page.evaluate(()=>window.diagnosisInfo),views:{},errors};
 for(const name of ['source','target']){const r=await page.evaluate(n=>window.renderDiagnosticPose(n),name);fs.writeFileSync(path.join(out,name+'-view.png'),Buffer.from(r.image.split(',')[1],'base64'));delete r.image;report.views[name]=r;console.log('CAPTURED',name);}
 fs.writeFileSync(path.join(out,'actual-camera-render.json'),JSON.stringify(report,null,2));await b.close();if(errors.length)process.exitCode=1;
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
