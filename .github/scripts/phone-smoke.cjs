const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { chromium } = require('playwright-core');

const appUrl = process.env.PHONE_SMOKE_URL || 'http://localhost:18782';
const profiles = [
  ['Compact Android', 320, 568, 1],
  ['Standard Android', 393, 851, 2.75],
  ['Large Android', 430, 932, 3],
  ['iPhone-sized', 390, 844, 3],
  ['Tablet', 820, 1100, 2],
];

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.PHONE_SMOKE_CHROME });
});
after(() => browser?.close());

for (const [name, width, height, deviceScaleFactor] of profiles) {
  test(name, { timeout: 75_000 }, async () => {
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor, isMobile: true, hasTouch: true, reducedMotion: 'reduce',
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('https://brain-twist.onrender.com/**', (route) =>
        route.fulfill({ json: { ok: true, entries: [], ranked: 0 } }));
      const button = (label) => page.getByRole('button', { name: label, exact: typeof label === 'string' });
      const open = (path = '') => page.goto(`${appUrl}/${path}`);
      const noOverflow = () => page.evaluate(() => {
        const viewport = document.documentElement.clientWidth;
        return document.documentElement.scrollWidth === viewport;
      }).then((fits) => assert(fits, 'Horizontal overflow'));
      async function start(label) {
        const action = button(label);
        await action.waitFor();
        if (height === 568) {
          const box = await action.boundingBox();
          assert(box.y >= 0 && box.y + box.height <= height, `${label} is below the first screen`);
        }
        await action.tap();
      }

      await open();
      await page.getByRole('textbox', { name: 'Name' }).fill('Device QA');
      await button('Save').tap();
      await button('Settings').waitFor();
      await noOverflow();
      await page.reload();
      await button('Settings').waitFor();
      assert.equal(await page.getByText('Device QA', { exact: true }).count(), 1);

      const sections = [
        ['sudoku?difficulty=hard', /^Row [1-9], column [1-9],/, 81],
        ['lights?difficulty=hard', /^Light row /, 25, 'Start puzzle'],
        ['schulte?difficulty=hard', /^\d+$/, 36, 'Start'],
        ['sequence?difficulty=hard', /^(Circle|Square|Triangle|Diamond)$/, 4, 'Start sequence'],
        ['stroop', /^(RED|BLUE|GREEN|YELLOW)$/, 4, 'Start'],
      ];
      for (const [path, labels, size, starter] of sections) {
        await open(path);
        if (starter) await start(starter);
        const tiles = button(labels);
        await tiles.first().waitFor();
        assert.equal(await tiles.count(), size, path);
        await noOverflow();
        const game = path.split('?')[0];
        if (game === 'sudoku') {
          const blank = button(/, blank$/).first();
          const label = await blank.getAttribute('aria-label');
          const coordinates = label.replace(/, blank$/, '');
          await blank.tap();
          await button(/^[1-9], [1-9] remaining$/).first().tap();
          await button(new RegExp(`^${coordinates}, [1-9]`)).waitFor();
          await button('Erase').tap();
          await button(label).waitFor();
        } else if (game === 'lights') {
          const first = button(/^Light row 1, column 1,/);
          const previous = await first.getAttribute('aria-label');
          await first.tap();
          assert.notEqual(await first.getAttribute('aria-label'), previous);
        } else if (game === 'schulte') {
          await button('1').tap();
          await button('1 found').waitFor();
        } else if (game === 'stroop') {
          await button('RED').tap();
          await page.getByText(/^(✓ Correct|× Miss)/).waitFor();
        } else {
          await page.getByText('Your turn', { exact: true }).waitFor();
          assert.equal(await button('Circle').isEnabled(), true);
        }
        if (game !== 'sequence') {
          await button('Pause').tap();
          await button('Resume').tap();
        }
      }

      await open('leaderboard');
      await page.getByText('No ranked scores yet', { exact: true }).waitFor();
      await noOverflow();
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
}
