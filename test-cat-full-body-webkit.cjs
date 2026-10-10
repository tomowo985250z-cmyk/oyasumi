const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {webkit} = require(process.env.OYASUMI_PLAYWRIGHT || 'playwright');
const output = path.join(__dirname, 'output/cat-full-body-webkit');
fs.mkdirSync(output, {recursive: true});

(async () => {
  const browser = await webkit.launch();
  const reports = [], assets = [];
  try {
    for (const standalone of [false, true]) {
      const context = await browser.newContext({
        viewport: {width: 390, height: 844}, deviceScaleFactor: 1,
        isMobile: true, hasTouch: true, timezoneId: 'Asia/Tokyo',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
      });
      await context.addInitScript(value => Object.defineProperty(navigator, 'standalone', {value}), standalone);
      await context.addInitScript(() => {
        globalThis.fullBodyIntervals = [];
        const interval = window.setInterval;
        window.setInterval = (...args) => { const id = interval(...args); fullBodyIntervals.push(id); return id; };
      });
      const page = await context.newPage(), errors = [], failed = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.url().includes('/assets/') && response.status() !== 200) failed.push(response.url());
      });
      await page.goto((process.env.TEST_BASE_URL || 'http://127.0.0.1:9390') + '/test-support/cat-care/screen.html');
      await page.waitForFunction(() => globalThis.CarePreview && document.querySelector('[data-cat-meal]'));
      await page.evaluate(() => {
        fullBodyIntervals.forEach(clearInterval);
        globalThis.fullBodyDay = DayCats;
        NightClock.now = () => Date.parse('2026-10-10T14:00:00+09:00');
        globalThis.showFullBody = async (coat, pose) => {
          state.coat = coat;
          globalThis.DayCats = Object.freeze({...fullBodyDay, current: () => ({id: pose, key: 'full-body-check', label: pose})});
          go('home');
          await document.fonts.ready;
          await Promise.all([...document.images].map(img => img.decode()));
        };
      });
      const coats = await page.evaluate(() => CatFaces.coats.map(coat => coat.id));
      const poses = await page.evaluate(() => DayCats.options.map(pose => pose.id));
      assert.equal(coats.length, 16);
      assert.equal(poses.length, 5);

      if (!standalone) {
        // Inspect the original alpha channel, independently of CSS clipping.
        assets.push(...await page.evaluate(async coats => {
          const result = [];
          for (const coat of coats) for (const frame of ['morning', 'night', ...fullBodyDay.options.map(p => 'day-' + p.id)]) {
            const img = new Image(); img.src = `assets/cat-refresh-v1/${coat}/${frame}.png`; await img.decode();
            const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
            const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const occupiedRow = y => {
              for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3] >= 16) return true;
              return false;
            };
            const occupiedColumn = x => {
              for (let y = 0; y < canvas.height; y++) if (data[(y * canvas.width + x) * 4 + 3] >= 16) return true;
              return false;
            };
            let left = 0, top = 0, right = canvas.width - 1, bottom = canvas.height - 1;
            while (top < canvas.height && !occupiedRow(top)) top++;
            while (bottom >= 0 && !occupiedRow(bottom)) bottom--;
            while (left < canvas.width && !occupiedColumn(left)) left++;
            while (right >= 0 && !occupiedColumn(right)) right--;
            result.push({coat, frame, width: canvas.width, height: canvas.height, left, top, right, bottom});
          }
          return result;
        }, coats));
        assert.equal(assets.length, 112);
        for (const asset of assets) {
          assert(asset.left > 0 && asset.top > 0 && asset.right < asset.width - 1 && asset.bottom < asset.height - 1,
            'Source artwork reaches its edge: ' + JSON.stringify(asset));
        }
        fs.writeFileSync(path.join(output, 'source-bounds.json'), JSON.stringify(assets, null, 2));
        console.log('PASS 112 original full-body PNGs: visible alpha bounds fit within the source canvas');
      }

      for (const width of [320, 375, 390, 430]) {
        await page.setViewportSize({width, height: 844});
        for (const coat of coats) for (const pose of poses) {
          await page.evaluate(({coat, pose}) => showFullBody(coat, pose), {coat, pose});
          const geometry = await page.evaluate(() => {
            const img = document.querySelector('.day-cat img'), rect = img.getBoundingClientRect(), css = getComputedStyle(img);
            const parent = img.parentElement.getBoundingClientRect();
            return {
              size: rect.width, height: rect.height, fit: css.objectFit, radius: css.borderRadius,
              inside: rect.left >= 0 && rect.right <= innerWidth && rect.top >= parent.top && rect.bottom <= parent.bottom,
              noOverflow: document.documentElement.scrollWidth <= innerWidth,
              avatars: [...document.querySelectorAll('.avatar')].every(el => getComputedStyle(el).borderRadius === '50%' && getComputedStyle(el).overflow === 'hidden'),
              roofLoaded: [...document.querySelectorAll('.roof-cat')].every(img => img.naturalWidth === 1024 && img.naturalHeight === 1536)
            };
          });
          assert.equal(geometry.size, 220, 'Keep the existing full-body display size');
          assert.equal(geometry.height, 220);
          assert.equal(geometry.fit, 'contain');
          assert.equal(geometry.radius, '0px');
          assert(geometry.inside && geometry.noOverflow && geometry.avatars && geometry.roofLoaded, JSON.stringify(geometry));
          if (width === 390 && coat === 'gray') await page.screenshot({path: path.join(output, `${standalone ? 'standalone' : 'browser'}-gray-${pose}.png`)});

          // Compare actual WebKit pixels to the entire source image drawn at the
          // same size. Opaque ear/tail pixels outside a circular crop must survive.
          let pixels = null;
          if (width === 390) {
            const alignment = await page.locator('.day-cat img').evaluate(img => {
              const r = img.getBoundingClientRect();
              return {x: Math.round(r.left) - r.left, y: Math.round(r.top) - r.top};
            });
            // Geometry above uses the real layout. Align only this pixel capture
            // to avoid WebKit's half-pixel screenshot resampling at odd widths.
            const backdrop = await page.addStyleTag({content: `.day-hero{background:rgb(255,0,255)}.day-cat img{transform:translate(${alignment.x}px,${alignment.y}px)}`});
            const screenshot = await page.locator('.day-cat img').screenshot({animations: 'disabled', timeout: 10000});
            pixels = await page.evaluate(async encoded => {
              const img = document.querySelector('.day-cat img'), shot = new Image();
              shot.src = 'data:image/png;base64,' + encoded; await shot.decode();
              const canvas = document.createElement('canvas'); canvas.width = shot.naturalWidth; canvas.height = shot.naturalHeight;
              const rect = img.getBoundingClientRect();
              // Element screenshots enclose fractional CSS positions in integer
              // pixels (e.g. a 220px cat centered in a 375px viewport).
              const xOffset = rect.left + scrollX - Math.floor(rect.left + scrollX);
              const yOffset = rect.top + scrollY - Math.floor(rect.top + scrollY);
              const ctx = canvas.getContext('2d'); ctx.drawImage(img, xOffset, yOffset, rect.width, rect.height);
              const source = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
              ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(shot, 0, 0);
              const actual = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
              let opaque = 0, missing = 0, outsideCircle = 0;
              for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
                const i = (y * canvas.width + x) * 4;
                if (source[i + 3] < 250) continue;
                opaque++;
                if (Math.hypot(x + .5 - xOffset - rect.width / 2, y + .5 - yOffset - rect.height / 2) > rect.width / 2 + 1) outsideCircle++;
                // CSS and canvas can choose slightly different sampling origins
                // at half-pixel positions. Allow a one-pixel neighbor match.
                let matched = false;
                for (let dy = -1; dy <= 1 && !matched; dy++) for (let dx = -1; dx <= 1 && !matched; dx++) {
                  if (x + dx < 0 || x + dx >= canvas.width || y + dy < 0 || y + dy >= canvas.height) continue;
                  const j = ((y + dy) * canvas.width + x + dx) * 4;
                  matched = Math.max(...[0, 1, 2].map(c => Math.abs(actual[j + c] - source[i + c]))) <= 40;
                }
                if (!matched) missing++;
              }
              return {opaque, missing, outsideCircle};
            }, screenshot.toString('base64'));
            await backdrop.evaluate(el => el.remove());
            assert(pixels.opaque > 1000 && pixels.missing / pixels.opaque < .001,
              'Full-body pixels were clipped: ' + JSON.stringify({standalone, width, coat, pose, pixels}));
          }
          reports.push({standalone, width, coat, pose, ...geometry, ...pixels});
        }
        console.log(`PASS WebKit ${standalone ? 'standalone simulation' : 'browser'} ${width}px: all 16 coats / 5 poses, size, fitting, circular avatars, roof images${width === 390 ? ', full-body pixels' : ''}`);
      }
      // Morning/sleep artwork shares the fitting rules, including all big cats.
      for (const coat of coats) for (const scene of ['awake', 'sleeping']) {
        await page.evaluate(({coat, scene}) => {
          document.querySelector('#public-profile-content').innerHTML = publicProfileRoom({coat, status: scene === 'awake' ? 'awake' : 'sleep'});
          document.querySelector('#public-profile-dialog').showModal();
        }, {coat, scene});
        assert(await page.evaluate(async () => {
          const img = document.querySelector('.room-cat img'); await img.decode();
          const css = getComputedStyle(img), r = img.getBoundingClientRect(), room = document.querySelector('.cat-room').getBoundingClientRect();
          return css.borderRadius === '0px' && css.objectFit === 'contain' && r.left >= room.left && r.right <= room.right && r.top >= room.top && r.bottom <= room.bottom;
        }), `Room artwork: ${coat}/${scene}`);
        await page.evaluate(() => document.querySelector('#public-profile-dialog').close());
      }
      await page.evaluate(() => go('home'));
      await page.locator('[data-day-cat-tap]').tap();
      assert(await page.evaluate(() => document.querySelector('.day-cat img').getAnimations().some(animation => animation.playState === 'running')),
        'Day-cat interaction still responds');
      assert.deepEqual(errors, []);
      assert.deepEqual(failed, []);
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({
      pass: true, engine: 'Playwright WebKit', actualIPhone: false,
      standalone: 'navigator.standalone simulation; not an installed iOS PWA',
      homeCases: reports.length, pixelCases: reports.filter(r => r.opaque).length,
      roomCases: 64, sourceAssets: assets, reports
    }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
