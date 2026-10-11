const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { webkit, chromium } = require(process.env.OYASUMI_PLAYWRIGHT_PATH || './output/webkit-tools/core/package');
const published = process.argv.includes('--published');
const engine = process.argv.includes('--edge') ? 'edge' : 'webkit';
const port = engine === 'edge' ? 9396 : 9395;
const base = published ? 'https://tomowo985250z-cmyk.github.io/oyasumi/' : `http://127.0.0.1:${port}/`;
const output = path.join(__dirname, 'output/home-post-choices-v1', `${published ? 'published' : 'local'}-${engine}`);
fs.mkdirSync(output, { recursive: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = published ? null : spawn(process.execPath, ['server.js'], { cwd: __dirname, env: { ...process.env, PORT: String(port) }, windowsHide: true, stdio: 'ignore' });
let browser;

// Isolate writes from production while exercising the actual app, event handlers and styles.
function installFixture() {
 const storage = new Map();
 for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(window, key, { value: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) }, configurable: true });
 localStorage.setItem('oyasumi-dark-hint-seen', 'test');
 const own = '00000000-0000-0000-0000-000000000001';
 const peer = '00000000-0000-0000-0000-000000000002';
 const f = globalThis.HomePostFixture = { at: Date.parse('2026-10-11T23:00:00+09:00'), rows: [], calls: [], reactions: {}, peer: false, complete: true, fail: false };
 const sleeping = choice => ['sleep', 'try-sleep', 'early-sleep'].includes(choice);
 const mapped = row => ({ id: row.id, userId: row.user_id, status: row.choice, time: Date.parse(row.created_at), nightDate: row.night_date, order: row.event_order, name: row.user_id === own ? '確認ねこ' : 'おとなり', expression: 'calm', coat: 'calico', catRole: null, profileNote: '', self: row.user_id === own, color: 'peach' });
 f.row = (choice, user = own) => ({ id: `home-post-${f.rows.length + 1}`, user_id: user, choice, created_at: new Date(f.at).toISOString(), night_date: SleepFlow.night(f.at), event_order: f.rows.length + 1 });
 f.reset = () => { f.rows = []; f.calls = []; f.reactions = {}; f.peer = false; f.complete = true; f.fail = false; };
 const care = () => ({ day: SleepFlow.day(f.at), mealEligible: f.rows.some(row => sleeping(row.choice)), mealDone: false, treatGiven: false, receivedToday: 0, receivedTotal: 0, receivedDays: [] });
 const api = {
  initialize: async () => own,
  getCatCareStatus: async () => care(),
  submitPost: async choice => {
   assertChoice(choice);
   f.calls.push({ kind: 'post', choice });
   await new Promise(resolve => setTimeout(resolve, 80));
   if (f.fail) throw Error('Isolated post failure');
   if (f.rows[0]?.choice === choice) return f.rows[0];
   const row = f.row(choice); f.rows.unshift(row); return row;
  },
  setReaction: async (id, choice) => { f.calls.push({ kind: 'reaction', id, choice }); if (choice) f.reactions[id] = choice; else delete f.reactions[id]; return true; },
  deletePost: async id => { const count = f.rows.length; f.rows = f.rows.filter(row => row.id !== id); return count !== f.rows.length; },
  snapshot: async () => {
   const ownPosts = f.rows.map(mapped);
   const feed = [...ownPosts.slice(0, 1), ...(f.peer ? [mapped({ ...f.row('early-sleep', peer), id: 'legacy-peer' })] : [])];
   const sleepingCount = feed.filter(post => sleeping(post.status)).length;
   const activeAwakePosts = feed.filter(post => post.status === 'awake');
   const reactionCounts = Object.fromEntries(Object.entries(f.reactions).map(([id, choice]) => [id, { [choice]: 1 }]));
   return { userId: own, name: '確認ねこ', coat: 'calico', expression: 'calm', catRole: null, profileNote: '', profileComplete: f.complete, needsCat: !f.complete, needsNickname: false, ownPosts, feed, reactions: { ...f.reactions }, reactionCounts, activeAwakePosts, awakeCount: activeAwakePosts.length, sleepingCount, ownSleepCount: f.rows.filter(row => sleeping(row.choice)).length, myState: ownPosts.length ? sleeping(ownPosts[0].status) ? 'sleep' : 'awake' : null, nightDate: SleepFlow.night(f.at), trend: [], trendSupported: false, catCoatStatus: { nextChangeAt: null, temporarilyUnlocked: true }, catCare: care(), tonightSummary: { sleepingCount, coats: sleepingCount ? [{ coat: 'calico', count: sleepingCount }] : [], peakHours: [] } };
  }
 };
 function assertChoice(choice) { if (!['awake', 'sleep', 'try-sleep', 'early-sleep'].includes(choice)) throw Error('Unexpected DB choice: ' + choice); }
 Object.defineProperty(window, 'OyasumiAPI', { get: () => api, set: () => {}, configurable: true });
}

(async () => {
 try {
  if (!published) { let started = false; for (let i = 0; i < 100; i++) { try { started = (await fetch(base)).ok; if (started) break; } catch {} await delay(150); } assert(started, 'Static server started'); }
  browser = await (engine === 'edge' ? chromium : webkit).launch(engine === 'edge' ? { executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' } : {});
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await context.addInitScript(installFixture);
  const page = await context.newPage();
  const errors = [], failedResponses = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failedResponses.push({ url: response.url(), status: response.status() }); });
  await page.route('**/*', route => {
   const url = new URL(route.request().url());
   if (!url.href.startsWith(base)) { external.push(url.href); return route.abort(); }
   if (/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname)) return route.fulfill({ contentType: 'text/javascript', body: '// Isolated app verification: no production DB writes.' });
   return route.continue();
  });
  await page.goto(base + '?home-choice-check=' + Date.now());
  await page.waitForFunction(() => typeof ready !== 'undefined' && ready && !busy);
  await page.evaluate(async () => { NightClock.now = () => HomePostFixture.at; await refreshShared(); });
  const settled = () => page.waitForFunction(() => !busy && !refreshPromise && !refreshQueued);
  const reset = async () => {
   await settled();
   await page.evaluate(async () => { HomePostFixture.reset(); state.lastSleep = null; filter = 'all'; clearTimeout(toastTimer); document.querySelector('#toast').classList.remove('visible'); document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); await refreshShared(); go('home'); });
  };
  assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'), JSON.parse(fs.readFileSync(path.join(__dirname, 'release.json'), 'utf8')).release);
  const layouts = [], posts = [];
  for (const width of [320, 375, 390, 430]) {
   await page.setViewportSize({ width, height: 844 });
   for (const light of [false, true]) {
    await reset();
    await page.evaluate(light => { state.light = light; render(); }, light);
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => {
     const buttons = [...document.querySelectorAll('[data-home-choice]')];
     const boxes = buttons.map(button => { const r = button.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
     const icons = buttons.slice(0, 2).map(button => { const icon = button.querySelector('.status-symbol svg'), r = icon.getBoundingClientRect(), b = button.getBoundingClientRect(), s = getComputedStyle(icon); return { width: r.width, height: r.height, x: r.x - b.x, y: r.y - b.y, fill: s.fill, filter: s.filter, viewBox: icon.getAttribute('viewBox') }; });
     const textFits = buttons.every(button => [...button.querySelectorAll('strong,small,.post-label-line')].every(el => { const r = el.getBoundingClientRect(), b = button.getBoundingClientRect(); return r.left >= b.left && r.right <= b.right && el.scrollWidth <= el.clientWidth + 1; }));
     return { choices: buttons.map(button => button.dataset.homeChoice), statuses: buttons.map(button => button.dataset.post), labels: buttons.map(button => button.innerText.replace(/\s/g, '')), boxes, icons, textFits, noOverflow: document.documentElement.scrollWidth <= innerWidth, backgrounds: buttons.map(button => ({ image: getComputedStyle(button).backgroundImage, color: getComputedStyle(button).backgroundColor })) };
    });
    assert.deepEqual(result.choices, ['relax', 'sleep', 'sleepless', 'try-sleep']);
    assert.deepEqual(result.statuses, ['awake', 'sleep', 'awake', 'try-sleep']);
    assert.deepEqual(result.labels, ['起きてるよ（のんびり中）', 'もう寝るよ（おやすみする）', 'まだ眠れない…（起きてる）', '眠れないけど寝てみる💤']);
    const [a, b, c, d] = result.boxes;
    assert(Math.abs(a.y - b.y) < 1 && Math.abs(c.y - d.y) < 1 && c.y > a.y && a.x < b.x && c.x < d.x && Math.abs(a.x - c.x) < 1 && Math.abs(b.x - d.x) < 1, '2 columns, 2 rows');
    assert(result.textFits && result.noOverflow, `Text and layout fit ${width}px`);
    assert.deepEqual(result.icons[0], result.icons[1], 'Sun and moon have identical size, placement, cream fill and glow');
    assert.equal(result.icons[0].fill, 'rgb(255, 240, 194)');
    assert.equal(result.icons[0].width, 48);
    if (!light) { assert(result.backgrounds[0].image.includes('rgb(131, 152, 255)')); assert(result.backgrounds[1].image.includes('rgb(255, 172, 163)')); assert.deepEqual(result.backgrounds[2], result.backgrounds[3]); }
    await page.evaluate(() => window.scrollTo(0, window.scrollY + document.querySelector('.status-actions').getBoundingClientRect().top - 140));
    assert(await page.evaluate(() => [...document.querySelectorAll('[data-home-choice]')].every(button => button.getBoundingClientRect().bottom < document.querySelector('#navigation').getBoundingClientRect().top)), 'All four choices are visible above navigation');
    await page.locator('.status-actions').screenshot({ path: path.join(output, `choices-${width}-${light ? 'light' : 'dark'}.png`) });
    layouts.push({ width, light, ...result });
   }
   for (const [intent, choice, sleeping] of [['relax', 'awake', false], ['sleep', 'sleep', true], ['sleepless', 'awake', false], ['try-sleep', 'try-sleep', true]]) {
    await reset();
    await page.locator(`[data-home-choice="${intent}"]`).click();
    await settled();
    const result = await page.evaluate(() => ({ view, rows: HomePostFixture.rows, calls: HomePostFixture.calls, lastSleep: state.lastSleep, myState: shared.myState, ownSleepCount: shared.ownSleepCount, sleepingCount: shared.sleepingCount, awakeCount: shared.awakeCount, mealEligible: shared.catCare.mealEligible, renderedStatus: statusText(state.posts[0].status) }));
    assert.equal(result.rows[0].choice, choice);
    assert.equal(result.view, sleeping ? 'sleep' : 'timeline');
    assert.equal(result.myState, sleeping ? 'sleep' : 'awake');
    assert.equal(result.ownSleepCount, Number(sleeping));
    assert.equal(result.sleepingCount, Number(sleeping));
    assert.equal(result.awakeCount, Number(!sleeping));
    assert.equal(result.mealEligible, sleeping);
    assert.equal(result.calls.length, 1);
    if (sleeping) assert.equal(result.lastSleep.postId, result.rows[0].id); else { assert.equal(result.lastSleep, null); assert.equal(result.renderedStatus, '起きてるよ'); }
    posts.push({ width, intent, ...result });
   }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await reset();
  await page.evaluate(() => { const button = document.querySelector('[data-home-choice="sleepless"]'); button.click(); button.click(); });
  await settled();
  assert.equal(await page.evaluate(() => HomePostFixture.calls.length), 1, 'Duplicate taps create one request');
  await reset();
  await page.evaluate(() => { HomePostFixture.fail = true; });
  await page.locator('[data-home-choice="relax"]').click(); await settled();
  assert.deepEqual(await page.evaluate(() => ({ view, count: state.posts.length, lastSleep: state.lastSleep })), { view: 'home', count: 0, lastSleep: null });
  assert.equal(await page.locator('[data-home-choice="relax"]').isDisabled(), false);
  await page.evaluate(() => { HomePostFixture.fail = false; });
  await page.locator('[data-home-choice="relax"]').click(); await settled();
  assert.equal(await page.evaluate(() => shared.myState), 'awake', 'Failed save can retry');
  await reset();
  await page.evaluate(async () => { HomePostFixture.complete = false; await refreshShared(); });
  for (const intent of ['relax', 'sleep', 'sleepless', 'try-sleep']) { await page.evaluate(() => go('home')); await page.locator(`[data-home-choice="${intent}"]`).click(); await settled(); assert.equal(await page.evaluate(() => view), 'profile'); }
  assert.equal(await page.evaluate(() => HomePostFixture.calls.length), 0, 'All choices keep the profile gate');
  await reset();
  await page.evaluate(async () => { HomePostFixture.rows = [HomePostFixture.row('early-sleep')]; HomePostFixture.peer = true; await refreshShared(); go('profile'); });
  assert(await page.locator('.history-status').textContent().then(text => text.includes('お先に寝ます')));
  assert.equal(await page.evaluate(() => isSleeping('early-sleep')), true, 'Legacy sleep reports stay sleeping');
  assert.equal(await page.evaluate(() => shared.ownSleepCount), 1);
  assert.equal(await page.locator('[data-coat-picker]').isDisabled(), false, 'Seven-day restriction remains lifted');
  await page.evaluate(() => { filter = 'sleep'; go('timeline'); });
  assert.equal(await page.locator('.post').count(), 2, 'Legacy records remain in the sleep filter');
  for (const reaction of ['goodnight', 'dream', 'tomorrow', 'comfort']) {
   await page.locator(`[data-react="legacy-peer"][data-reaction="${reaction}"]`).click(); await settled();
   assert.equal(await page.evaluate(() => state.reactions['legacy-peer']), reaction);
   assert.equal(await page.evaluate(reaction => shared.reactionCounts['legacy-peer'][reaction], reaction), 1);
  }
  await page.locator('[data-react="legacy-peer"][data-reaction="comfort"]').click(); await settled();
  assert.equal(await page.evaluate(() => state.reactions['legacy-peer']), undefined, 'Reaction can be removed');
  await page.evaluate(() => go('stats'));
  assert.equal(await page.locator('.sleeping-cats .cat-scene').count(), 2, 'Latest sleeping users still populate statistics');
  await page.evaluate(() => { state.lastSleep = { userId: shared.userId, postId: state.posts[0].id, at: new Date(HomePostFixture.at).toISOString(), finished: true, nightDate: shared.nightDate }; go('home'); });
  await page.locator('[data-home-choice="sleepless"]').click(); await settled();
  assert.equal(await page.evaluate(() => view), 'timeline');
  assert.equal(await page.evaluate(() => state.lastSleep.finished), false, 'Awake report cancels a finished sleep screen');
  assert.equal(await page.evaluate(() => shared.ownSleepCount), 1, 'Awake does not increment historical sleep reports');
  assert.equal(await page.evaluate(() => shared.sleepingCount), 1, 'Only the peer remains sleeping');
  await page.evaluate(() => { filter = 'awake'; go('timeline'); });
  assert.equal(await page.locator('.post').count(), 1);
  assert.equal(await page.locator('.awake-text').textContent(), '起きてるよ');
  await page.locator('[data-delete]').click(); await settled();
  assert.equal(await page.evaluate(() => state.posts.length), 1, 'Deleting awake retains legacy sleep history');
  await reset();
  await page.evaluate(() => { state.light = false; go('home'); });
  await page.screenshot({ path: path.join(output, 'home-390.png'), fullPage: true });
  assert.deepEqual(errors, []); assert.deepEqual(failedResponses, []); assert.deepEqual(external, []);
  const report = { pass: true, engine, published, actualIPhone: false, productionDbWrites: false, layouts, posts, duplicateTap: true, failedSaveRetry: true, profileGate: true, legacySleepHistory: true, fourReactions: true, reactionRemoval: true, statistics: true, deletion: true, awakeAfterSleep: true, catCoatCooldownStillUnlocked: true, errors, failedResponses, external };
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`PASS ${engine}: ${layouts.length} mobile layouts, ${posts.length} real post-handler cases, legacy history/reactions/statistics and error recovery; no production DB writes`);
 } finally { await browser?.close(); server?.kill(); }
})().catch(error => { fs.writeFileSync(path.join(output, 'failure.txt'), error.stack); console.error(error); process.exitCode = 1; });
