const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn, execFileSync} = require('node:child_process');
const {webkit, chromium} = require('./output/webkit-tools/core/package');
const published = process.argv.includes('--published'), edge = process.argv.includes('--edge');
const port = edge ? 9407 : 9406;
const base = published ? 'https://tomowo985250z-cmyk.github.io/oyasumi/' : `http://127.0.0.1:${port}/`;
const output = path.join(__dirname, 'output/window-gaze-v1', `${published ? 'published' : 'local'}-${edge ? 'edge' : 'webkit'}`);
fs.mkdirSync(output, {recursive: true});
const source = fs.readFileSync('test-home-post-choices.cjs', 'utf8');
const fixture = source.slice(source.indexOf('function installFixture()'), source.indexOf('\n(async () => {'));
const previousAssets = execFileSync('git', ['show', '83a76ef:cat-image-assets.js'], {encoding: 'utf8', windowsHide: true});
// Compare room interactions with the current pre-contact-fix behavior.
const previousRoom = execFileSync('git', ['show', '17a5bff:day-room.js'], {encoding: 'utf8', windowsHide: true});
const server = published ? null : spawn(process.execPath, ['server.js'], {env: {...process.env, PORT: String(port)}, windowsHide: true, stdio: 'ignore'});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser;
(async () => {try {
 if (!published) {
  let started = false;
  for (let i = 0; i < 100; i++) {try {started = (await fetch(base)).ok; if (started) break;} catch {} await delay(100);}
  assert(started, 'Local server started');
 }
 browser = await (edge ? chromium : webkit).launch(edge ? {executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'} : {});
 const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
 await context.addInitScript({content: fixture + ';installFixture();'});
 const page = await context.newPage(), errors = [], failed = [];
 page.on('pageerror', e => errors.push(e.message));
 page.on('response', r => {if (r.status() >= 400) failed.push({url: r.url(), status: r.status()});});
 await page.route('**/*', route => {
  const u = new URL(route.request().url());
  if (!u.href.startsWith(base)) return route.abort();
  if (/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(u.pathname)) return route.fulfill({contentType: 'text/javascript', body: '// Isolated UI verification: no production DB access.'});
  return route.continue();
 });
 await page.goto(base + '?window-gaze-check=' + Date.now());
 await page.waitForFunction(() => typeof ready !== 'undefined' && ready && !busy);
 assert.equal(await page.locator('meta[name="oyasumi-release"]').getAttribute('content'), JSON.parse(fs.readFileSync('release.json', 'utf8')).release);
 const comparisons = await page.evaluate(({previousAssets, previousRoom}) => {
  const current = {faces: CatFaces, scenes: CatScenes, day: DayCats, roof: RoofCats, room: DayRoom};
  const actual = Object.fromEntries(CatFaces.coats.map(({id}) => [id, {
   faces: CatFaces.options.map(p => CatFaces.svg(p.id, id)),
   scenes: ['awake', 'sleeping'].map(p => CatScenes.svg(p, id)),
   day: DayCats.options.filter(p => p.id !== 'gaze').map(p => DayCats.svg(p.id, id)),
   roof: RoofCats.svg(id)
  }]));
  Function(previousAssets)();
  const before = Object.fromEntries(CatFaces.coats.map(({id}) => [id, {
   faces: CatFaces.options.map(p => CatFaces.svg(p.id, id)),
   scenes: ['awake', 'sleeping'].map(p => CatScenes.svg(p, id)),
   day: DayCats.options.filter(p => p.id !== 'gaze').map(p => DayCats.svg(p.id, id)),
   roof: RoofCats.svg(id)
  }]));
  Object.assign(globalThis, {CatFaces: current.faces, CatScenes: current.scenes, DayCats: current.day, RoofCats: current.roof});
  Function(previousRoom)(); globalThis.PreviousDayRoom = DayRoom; globalThis.DayRoom = current.room;
  HomePostFixture.at = Date.parse('2026-10-11T14:00:00+09:00');
  NightClock.now = () => HomePostFixture.at;
  globalThis.WindowGazeFixture = {day: '2026-10-11', active: true, place: 'corner', pose: 'gaze', away: false};
  DayRoom.snapshot = () => ({...WindowGazeFixture});
  PreviousDayRoom.snapshot = DayRoom.snapshot;
  return {actual, before, coats: CatFaces.coats};
 }, {previousAssets, previousRoom});
 assert.deepEqual(comparisons.actual, comparisons.before, 'Every other expression, day action, night/morning and rooftop mapping is byte-identical');
 await page.evaluate(async () => {await refreshShared();});
 const layouts = [], scenes = [];
 for (const width of [320, 375, 390, 430]) {
  await page.setViewportSize({width, height: 844});
  for (const coat of comparisons.coats) {
   await page.evaluate(id => {state.coat = id; WindowGazeFixture.pose = 'gaze'; WindowGazeFixture.place = 'corner'; WindowGazeFixture.away = false; HomePostFixture.at = Date.parse('2026-10-11T14:00:00+09:00'); go('home'); DayRoom.sync();}, coat.id);
   await page.locator('.day-room img[data-cat-pose="window-rear"]').waitFor();
   await page.waitForFunction(() => [...document.querySelectorAll('.day-room img')].every(i => i.complete && i.naturalWidth > 0));
   const layout = await page.evaluate(() => {
    const stage = document.querySelector('.day-room'), cat = stage.querySelector('.room-resident'), image = cat.querySelector('img');
    const s = stage.getBoundingClientRect(), c = cat.getBoundingClientRect(), w = stage.querySelector('.day-room-world-window').getBoundingClientRect();
    const before = document.createElement('div'); before.innerHTML = PreviousDayRoom.stage(stage.dataset.coat, stage.dataset.roomUser, {status: stage.dataset.postStatus}, true);
    return {place: stage.dataset.place, src: image.getAttribute('src'), coat: image.dataset.catCoat, heading: document.querySelector('.day-room-hero h2').textContent,
     noOverflow: document.documentElement.scrollWidth <= innerWidth, contained: c.left >= s.left && c.right <= s.right && c.top >= s.top && c.bottom <= s.bottom,
     alignedWindow: Math.abs((c.left + c.width / 2) - (w.left + w.width / 2)) < 2,
     sameRoomArt: stage.querySelector('.day-room-art').outerHTML === before.querySelector('.day-room-art').outerHTML,
     sameLandscape: stage.querySelector('.day-room-world-window').outerHTML === before.querySelector('.day-room-world-window').outerHTML,
     roomWidth: s.width, catWidth: c.width, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight};
   });
   assert.equal(layout.place, 'window'); assert.equal(layout.coat, coat.id); assert.equal(layout.heading, '外を眺めてる');
   assert(layout.src.startsWith(`assets/window-gaze-v1/${coat.id}.png?v=`));
   assert(layout.noOverflow && layout.contained && layout.alignedWindow && layout.sameRoomArt && layout.sameLandscape);
   layouts.push({width, ...layout});
   if (width === 390) {
    const file = `${coat.id}-390.png`;
    await page.locator('.day-room-hero').screenshot({path: path.join(output, file)});
    scenes.push({coat: coat.id, label: coat.label || coat.name || coat.id, file});
    if (coat.id === 'calico') await page.screenshot({path: path.join(output, 'home-390.png'), fullPage: true});
   }
  }
 }
 const transitions = [];
 for (const coat of comparisons.coats) for (const place of ['window', 'cushion', 'corner']) {
  await page.evaluate(({id, place}) => {state.coat = id; WindowGazeFixture.place = place; WindowGazeFixture.pose = 'gaze'; go('home'); DayRoom.sync();}, {id: coat.id, place});
  assert.equal(await page.locator('.day-room').getAttribute('data-place'), 'window');
  for (const pose of ['relax', 'play', 'groom', 'doze']) {
   const equal = await page.evaluate(pose => {
    WindowGazeFixture.pose = pose; DayRoom.sync(); const stage = document.querySelector('.day-room');
    const previous = document.createElement('div'); previous.innerHTML = PreviousDayRoom.stage(stage.dataset.coat, stage.dataset.roomUser, {status: stage.dataset.postStatus}, true);
    const resident = stage.querySelector('.room-resident').cloneNode(true);
    // Window contact correction changes only the transparent-padding offset.
    resident.style.removeProperty('--window-cat-pad'); if (!resident.style.length) resident.removeAttribute('style');
    resident.querySelectorAll('img').forEach(img => img.removeAttribute('loading'));
    return stage.dataset.place === WindowGazeFixture.place && resident.outerHTML === previous.querySelector('.room-resident').outerHTML;
   }, pose);
   assert(equal, `${coat.id}/${place}/${pose}: original artwork, placement and button preserved`);
  }
  await page.evaluate(() => {WindowGazeFixture.pose = 'gaze'; DayRoom.sync();});
  assert.equal(await page.locator('.day-room').getAttribute('data-place'), 'window');
  for (const status of ['awake', 'sleep']) {
   const same = await page.evaluate(status => {
    HomePostFixture.at = Date.parse('2026-10-11T23:00:00+09:00'); state.posts = [{self: true, time: HomePostFixture.at, status}]; const stage = document.querySelector('.day-room'); stage.dataset.postStatus = status; DayRoom.sync();
    const previous = document.createElement('div'); previous.innerHTML = PreviousDayRoom.stage(stage.dataset.coat, stage.dataset.roomUser, {status}, true);
    const resident = stage.querySelector('.room-resident').cloneNode(true);
    resident.style.removeProperty('--window-cat-pad'); if (!resident.style.length) resident.removeAttribute('style');
    resident.querySelectorAll('img').forEach(img => img.removeAttribute('loading'));
    return stage.dataset.place === WindowGazeFixture.place && resident.outerHTML === previous.querySelector('.room-resident').outerHTML;
   }, status); assert(same, 'Nighttime image and placement preserved');
  }
  // The current room no longer schedules absence; keep its resident tappable.
  await page.evaluate(() => {HomePostFixture.at = Date.parse('2026-10-11T14:00:00+09:00'); state.posts = []; WindowGazeFixture.away = false; DayRoom.sync();});
  assert.equal(await page.evaluate(() => DayRoomState.at(NightClock.now(), shared.userId).away), false);
  assert.equal(await page.locator('.room-resident').isVisible(), true); assert.equal(await page.locator('.room-resident').isDisabled(), false);
  transitions.push({coat: coat.id, place, otherPoses: 4, nightStatuses: 2, residentTappable: true});
 }
 await page.setViewportSize({width: 390, height: 844});
 await page.evaluate(() => {state.coat = 'calico'; WindowGazeFixture.pose = 'gaze'; go('home');});
 await page.locator('.room-resident').tap();
 await page.evaluate(() => go('profile'));
 assert.equal(await page.locator('[data-coat-picker]').isDisabled(), false, 'Seven-day restriction remains lifted');
 assert.equal(await page.locator('.profile-history[open]').count(), 0, 'Recent records still start collapsed');
 assert.equal(await page.evaluate(() => HomePostFixture.calls.length), 0, 'Image changes and taps never write to DB');
 assert.deepEqual(errors, []); assert.deepEqual(failed, []);
 const board = await context.newPage();
 await board.setViewportSize({width: 1200, height: 1800});
 await board.setContent(`<html lang="ja"><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#f5efe7;font:16px sans-serif;color:#483c36}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}figure{margin:0;padding:10px;background:white;border-radius:16px}img{width:100%;display:block}figcaption{text-align:center;padding-top:8px}</style><h1>外を眺めてる — 全16猫種・390px WebKit表示</h1><main>${scenes.map(s => `<figure><img src="${base}assets/window-gaze-v1/${s.coat}.png"><figcaption>${s.label}</figcaption></figure>`).join('')}</main></html>`);
 await board.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
 await board.screenshot({path: path.join(output, 'all-16-sprites.png'), fullPage: true});
 // Compose the actual 390px room captures as a preview without changing image pixels.
 for (const s of scenes) await board.route(`https://preview.invalid/${s.file}`, route => route.fulfill({contentType: 'image/png', body: fs.readFileSync(path.join(output, s.file))}));
 await board.setContent(`<html lang="ja"><meta charset="utf-8"><style>body{margin:0;padding:24px;background:#f5efe7;font:16px sans-serif;color:#483c36}h1{font-size:24px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}figure{margin:0;padding:10px;background:#ece9e3;border-radius:16px}img{width:100%;display:block}figcaption{text-align:center;padding-top:8px}</style><h1>外を眺めてる — 全16猫種・390px ${edge ? 'Edge' : 'WebKit'}表示</h1><main>${scenes.map(s => `<figure><img src="https://preview.invalid/${s.file}"><figcaption>${s.label}</figcaption></figure>`).join('')}</main></html>`);
 await board.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
 await board.screenshot({path: path.join(output, 'all-16-rooms.png'), fullPage: true});
 const report = {pass: true, engine: edge ? 'Edge' : 'WebKit', published, productionDbWrites: false, layouts, transitions, otherImagesIdentical: true, roomDesignIdentical: true, errors, failed};
 fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
 console.log(`PASS ${published ? 'published' : 'local'} ${report.engine}: 16 coats × 4 mobile widths; 48 placement transitions, 192 other-action and 96 night comparisons; resident/tap preserved, no DB writes.`);
} finally {await browser?.close(); server?.kill();}})().catch(e => {fs.writeFileSync(path.join(output, 'failure.txt'), e.stack); console.error(e); process.exitCode = 1;});
