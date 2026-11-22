const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const {webkit} = require(path.resolve(root, '../../webkit-tools/core/package'));
const out = path.resolve(root, '../event-cards-check-' + Date.now());
fs.mkdirSync(out, {recursive: true});
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.resolve(root, '.' + url.pathname + (url.pathname.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, body) => {
    if (error) return res.writeHead(404).end();
    res.writeHead(200, {'Content-Type': {'.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json'}[path.extname(file)] || 'application/octet-stream'});
    res.end(body);
  });
});
const companies = ['canbas', 'kringle', 'joby'];
const labels = ['進捗状況', '重要度', '予定日／実績日', '最終更新日'];
(async () => {
  let browser;
  const report = {cases: [], errors: []};
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = process.env.EVENT_CARDS_BASE || 'http://127.0.0.1:' + server.address().port;
    browser = await webkit.launch({headless: true});
    for (const width of [320, 375, 390, 430]) {
      const context = await browser.newContext({viewport: {width, height: 844}, isMobile: true, hasTouch: true});
      await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      for (const company of companies) {
        const data = JSON.parse(fs.readFileSync(path.join(root, company, 'data/events.json')));
        await page.goto(base + '/' + company + '/');
        await page.waitForSelector('.monitor-event');
        for (const event of data.reviewed.events) {
          const card = page.locator('.monitor-event[data-event="' + event.id + '"]');
          assert.equal(await card.count(), 1);
          assert.equal(await card.locator('.monitor-event-heading').textContent().then(text => text.includes(event.title)), true);
          assert.equal(await card.textContent().then(text => text.includes(event.detail)), true);
        }
        const first = page.locator('.monitor-event').first();
        assert.deepEqual(await first.locator('.monitor-event-fields dt').allTextContents(), labels);
        const values = await first.locator('.monitor-event-fields dd').allTextContents();
        assert.equal(values[1], '未確認');
        assert.equal(values[3], '未確認');
        assert.equal(await first.locator('.monitor-event-assessment').textContent(), '材料評価：未確認');
        const presentation = await first.evaluate(card => {
          const field = card.querySelector('dd'), heading = card.querySelector('h3,h4');
          return [getComputedStyle(card).padding, getComputedStyle(field).fontSize, getComputedStyle(heading).fontSize];
        });
        assert.deepEqual(presentation, ['18px', '16px', '18px']);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const unchangedElsewhere = await page.evaluate(() => {
          const sheet = document.querySelector('link[href*="event-shared/card.css"]').sheet;
          const elements = [...document.querySelectorAll('header, .masthead, .country, .stage-card, .pipeline-card, .ev-card, .source-card')];
          const styles = () => elements.map(element => {
            const s = getComputedStyle(element);
            return [s.fontSize, s.padding, s.backgroundColor, s.borderColor, s.display];
          });
          const actual = JSON.stringify(styles());
          sheet.disabled = true;
          const before = JSON.stringify(styles());
          sheet.disabled = false;
          return actual === before;
        });
        assert.equal(unchangedElsewhere, true);
        // Long source text must wrap without changing the card's content or width.
        const bounds = await first.evaluate(card => {
          const title = card.querySelector('h3,h4');
          title.textContent = '長いイベント名と公式出典'.repeat(30) + 'https://example.invalid/' + 'x'.repeat(180);
          return card.scrollWidth <= card.clientWidth && title.scrollWidth <= title.clientWidth;
        });
        assert.equal(bounds, true);
        if (width === 390) {
          await page.reload();
          await page.waitForSelector('.monitor-event');
          const target = page.locator(company === 'canbas' ? '#ev-timeline' : company === 'kringle' ? '#timeline-groups' : '#timeline');
          await target.screenshot({path: path.join(out, company + '-390.png')});
          await page.locator('.monitor-event').first().screenshot({path: path.join(out, company + '-card-390.png')});
        }
        const filter = page.locator(company === 'canbas' ? '#ev-category' : '#category');
        const category = data.reviewed.events[0].category;
        await filter.selectOption(category);
        const expected = data.reviewed.events.filter(event => event.category === category);
        for (const event of expected) assert.equal(await page.locator('.monitor-event[data-event="' + event.id + '"]').count(), 1);
        await filter.selectOption('all');
        await page.locator(company === 'canbas' ? '#ev-reload' : '#reload').click();
        await page.waitForFunction(id => !document.getElementById(id).disabled, company === 'canbas' ? 'ev-reload' : 'reload');
        assert.equal(await page.locator('.monitor-event').count() >= data.reviewed.events.length, true);
        report.cases.push({company, width, fields: true, typography: true, noOverflow: true, contentAndControls: true});
      }
      await context.close();
    }
    // Exercise only explicit assessments; progress and financing text never infer sentiment.
    const context = await browser.newContext({viewport: {width: 375, height: 812}});
    const page = await context.newPage();
    let expectedColors;
    for (const company of companies) {
      await page.goto(base + '/' + company + '/');
      await page.waitForSelector('.monitor-event');
      const colors = await page.evaluate(async () => {
      const {eventCardHeader} = await import(new URL('../event-shared/card.mjs', location.href));
      const original = document.querySelector('.monitor-event');
      return ['positive', 'negative', 'neutral', undefined].map(sentiment => {
        const card = original.cloneNode(false), heading = document.createElement('h3');
        heading.textContent = '表示検証';
        card.append(...eventCardHeader(card, {sentiment}, {heading, formatDate: String}));
        original.parentElement.append(card);
        return {sentiment: card.dataset.sentiment, color: getComputedStyle(card).borderLeftColor, values: [...card.querySelectorAll('dd')].map(n => n.textContent)};
      });
    });
    assert.deepEqual(colors.map(c => c.sentiment), ['positive', 'negative', 'neutral', 'unknown']);
    assert.equal(new Set(colors.slice(0, 3).map(c => c.color)).size, 3);
    if (expectedColors) assert.deepEqual(colors, expectedColors);
    expectedColors = colors;
    for (const row of colors) assert.deepEqual(row.values, Array(4).fill('未確認'));
    }
    await context.close();
    assert.deepEqual(report.errors, []);
    report.explicitSentimentAndMissingFields = true;
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({passed: report.cases.length, explicitSentimentAndMissingFields: true, out}));
  } finally {
    await browser?.close();
    server.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
