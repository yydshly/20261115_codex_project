const fs=require('node:fs'),path=require('node:path');const[modules,out,url='http://127.0.0.1:8771']=process.argv.slice(2);const{chromium}=require(path.join(modules,'playwright-core'));let browser;
(async()=>{browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=d3d11','--enable-webgl','--ignore-gpu-blocklist']});const p=await browser.newPage({viewport:{width:1200,height:1020},deviceScaleFactor:1});const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(url);await p.waitForFunction(()=>window.cafeReady,{},{timeout:120000});const checks={};
await p.locator('#open').click();checks.open=(await p.evaluate(()=>window.bindingCheck())).frame===49;
await p.locator('#closed').click();checks.close=(await p.evaluate(()=>window.bindingCheck())).frame===1;
await p.locator('[data-view="interior"]').click();checks.interior=(await p.evaluate(()=>window.bindingCheck())).state.hybrid===false;
await p.locator('[data-light="day"]').click();checks.day=(await p.evaluate(()=>window.bindingCheck())).state.light==='day';
await p.locator('[data-view="reverse"]').click();checks.reverse=(await p.evaluate(()=>window.bindingCheck())).state.view==='reverse';
await p.locator('[data-view="door"]').click();checks.doorHybrid=(await p.evaluate(()=>window.bindingCheck())).state.hybrid;
await p.locator('#wire').check();checks.wire=(await p.evaluate(()=>window.bindingCheck())).state.wire;
const samples=[];for(const f of [1,25,49,73,97]){await p.evaluate(n=>window.renderCafe({frame:n}),f);samples.push(await p.evaluate(()=>window.bindingCheck()));}
await p.evaluate(()=>window.renderCafe({view:'interior',frame:49,light:'warm',wire:false}));await p.screenshot({path:path.join(out,'viewer-screenshot.png')});
if(errors.length||Object.values(checks).some(v=>!v))throw Error(JSON.stringify({checks,errors}));fs.writeFileSync(path.join(out,'ui-check.json'),JSON.stringify({checks,samples,errors},null,2));console.log('PASS',checks);await browser.close();})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
