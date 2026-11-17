const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const [modules, out, mode = 'preview', url = 'http://127.0.0.1:8771/'] = process.argv.slice(2);
const { chromium } = require(path.join(modules, 'playwright-core'));
const fixedAssets = ['cafe-hybrid-prototype.blend', 'cafe-structure.glb', 'background.ply', 'door-skin.ply', 'layout.json', 'binding.json'];
function hashes() {
  return Object.fromEntries(fixedAssets.map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(out, name))).digest('hex')]));
}
let browser;
(async () => {
  const before = hashes();
  const dest = path.join(out, mode === 'preview' ? 'tour-preview' : 'tour-frames');
  fs.mkdirSync(dest, { recursive: true });
  browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--use-angle=d3d11', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1050 } });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.cafeReady, {}, { timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.locator('#tourPlay').click();
  await page.waitForTimeout(900);
  const playing = await page.evaluate(() => window.tourSnapshot());
  await page.locator('#tourPlay').click();
  const paused = await page.evaluate(() => window.tourSnapshot().time);
  await page.waitForTimeout(150);
  const pauseStable = Math.abs((await page.evaluate(() => window.tourSnapshot().time)) - paused) < 1e-8;
  if (playing.time <= 0 || !pauseStable) throw Error('Tour play/pause did not work');
  const fps = 15, duration = await page.evaluate(() => window.cafeTourPath.duration);
  const times = mode === 'preview' ? [0, 3, 6, 10, 13, 15, 17, 19, 21, 24, 26, 28] : Array.from({ length: fps * duration }, (_, i) => i / fps);
  const trace = [];
  for (let i = 0; i < times.length; i++) {
    const data = await page.evaluate(t => window.renderCafeTour(t), times[i]);
    const name = mode === 'preview' ? `t${String(times[i]).padStart(2, '0')}.png` : `${String(i).padStart(4, '0')}.png`;
    fs.writeFileSync(path.join(dest, name), Buffer.from(data.split(',')[1], 'base64'));
    trace.push(await page.evaluate(() => window.tourSnapshot()));
    if (mode === 'preview' || i % 30 === 0) console.log('CAPTURE', i + 1, '/', times.length, 't=' + times[i].toFixed(2));
  }
  const after = hashes();
  const unchanged = JSON.stringify(before) === JSON.stringify(after);
  const layerStates = [...new Set(trace.map(t => JSON.stringify({ hybrid: t.hybrid, bg: t.backgroundVisible, skin: t.skinVisible, light: t.light, hidden: t.hiddenProxyMaterialCount, background: t.background })))];
  let maxStep = 0, maxRotationDegrees = 0;
  for (let i = 1; i < trace.length; i++) {
    maxStep = Math.max(maxStep, Math.hypot(...trace[i].position.map((x, j) => x - trace[i - 1].position[j])));
    const dot = Math.abs(trace[i].quaternion.reduce((sum, x, j) => sum + x * trace[i - 1].quaternion[j], 0));
    maxRotationDegrees = Math.max(maxRotationDegrees, 2 * Math.acos(Math.min(1, dot)) * 180 / Math.PI);
  }
  const report = { mode, fps, duration, frames: times.length, errors, ui: { play: playing.time > 0, pause: pauseStable }, assetsBefore: before, assetsAfter: after, assetsUnchanged: unchanged, layerStates, continuous: { maxPositionStep: maxStep, maxRotationDegrees }, trace };
  fs.writeFileSync(path.join(out, mode === 'preview' ? 'tour-preview-report.json' : 'tour-report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  if (errors.length || !unchanged || layerStates.length !== 1) throw Error('Scene continuity or asset preservation failed');
  if (mode !== 'preview' && (maxStep > 0.3 || maxRotationDegrees > 6)) throw Error('Unexpected camera jump');
  console.log('PASS', JSON.stringify({ frames: times.length, assetsUnchanged: unchanged, constantLayerStates: layerStates.length, maxStep, maxRotationDegrees }));
})().catch(async error => {
  console.error(error);
  if (browser) await browser.close();
  process.exitCode = 1;
});
