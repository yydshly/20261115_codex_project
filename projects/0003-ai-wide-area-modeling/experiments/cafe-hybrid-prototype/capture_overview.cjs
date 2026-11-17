const fs = require('node:fs');
const path = require('node:path');
const [modules, out, assets, url = 'http://127.0.0.1:8771/'] = process.argv.slice(2);
const { chromium } = require(path.join(modules, 'playwright-core'));
let browser;
(async () => {
  browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1050 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.cafeReady, {}, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const initial = await page.evaluate(() => window.bindingCheck().state);
  if (initial.view !== 'overview') throw Error('Expected initial whole-scene view');
  const shots = {};
  for (const [name, frame] of [['hybrid-overview-closed', 1], ['hybrid-overview-open', 49]]) {
    const data = await page.evaluate(frame => window.renderCafe({ view: 'overview', frame, light: 'warm', wire: false }), frame);
    const bytes = Buffer.from(data.split(',')[1], 'base64');
    fs.writeFileSync(path.join(out, `${name}.png`), bytes);
    fs.writeFileSync(path.join(assets, `${name}.png`), bytes);
    shots[name] = await page.evaluate(() => ({ width: document.querySelector('canvas').width, height: document.querySelector('canvas').height, state: window.bindingCheck().state }));
    console.log('CAPTURED', name, shots[name].width, shots[name].height);
  }
  await page.locator('[data-view="door"]').click();
  const closeup = await page.evaluate(() => ({ state: window.bindingCheck().state, height: document.querySelector('canvas').height }));
  await page.locator('[data-view="interior"]').click();
  const interior = await page.evaluate(() => window.bindingCheck().state);
  await page.locator('[data-view="overview"]').click();
  await page.evaluate(() => window.renderCafe({ frame: 1 }));
  await page.screenshot({ path: path.join(out, 'overview-viewer.png') });
  const report = { initial, shots, closeup, interior, errors };
  fs.writeFileSync(path.join(out, 'overview-report.json'), JSON.stringify(report, null, 2));
  if (errors.length || closeup.height !== 650 || interior.hybrid !== false) throw Error(JSON.stringify(report));
  console.log('PASS whole-scene capture and view switching');
  await browser.close();
})().catch(async error => {
  console.error(error);
  if (browser) await browser.close();
  process.exitCode = 1;
});
