const fs=require('node:fs'),path=require('node:path');const [modules,out,url='http://127.0.0.1:8770']=process.argv.slice(2);const{chromium}=require(path.join(modules,'playwright-core'));let browser;
(async()=>{browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=d3d11','--enable-webgl','--ignore-gpu-blocklist']});
 const p=await browser.newPage({viewport:{width:1500,height:800},deviceScaleFactor:1});const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(url);await p.waitForFunction(()=>window.diagnosisReady,{},{timeout:120000});
 const checks={};
 for(const[id,name]of [['annotation','annotated-target.png'],['draft','source-reprojected-draft.png'],['depth','target-depth-proxy.png']]){
   await p.locator('#'+id).click();await p.waitForFunction(n=>{const i=document.querySelector('#overlay');return i.src.endsWith(n)&&i.complete&&i.naturalWidth===1000},name);checks[id]=true;
 }
 for(const id of ['source','target']){await p.locator('#'+id).click();checks[id]=await p.locator('#overlay').evaluate(i=>i.style.display==='none');}
 await p.locator('#annotation').click();await p.waitForFunction(()=>{const i=document.querySelector('#overlay');return i.complete&&i.src.endsWith('annotated-target.png')});await p.screenshot({path:path.join(out,'diagnostic-page.png')});
 if(errors.length||Object.values(checks).some(v=>!v))throw Error(JSON.stringify({checks,errors}));
 fs.writeFileSync(path.join(out,'ui-check.json'),JSON.stringify({checks,errors},null,2));console.log('PASS',checks);await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
