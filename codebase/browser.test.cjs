// Optional developer QA: node codebase/browser.test.cjs /path/to/playwright [browser-executable]
// Uses a fresh headless browser with synthetic data; never reads a user's browser profile.
const { chromium } = require(process.argv[2] || 'playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs/promises');

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.argv[3] ? { executablePath: process.argv[3] } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const checks = [];
  const output = process.env.CP2_QA_OUTPUT || '/tmp/discord-pulse-cp2-qa-results';
  await fs.mkdir(output, { recursive: true });
  async function start(scenario) {
    await page.locator('#scenario').selectOption(scenario);
    await page.getByRole('button', { name: 'Tạo lượt rà soát', exact: true }).click();
    await page.locator('#workspace[aria-busy="true"]').waitFor({ state: 'detached' });
  }
  async function sources() { await page.getByRole('button', { name: /^Mở \d+ tin nguồn$/ }).click(); }
  async function save() { await page.getByRole('button', { name: 'Lưu quyết định', exact: true }).click(); }
  async function finish() { await page.getByRole('button', { name: 'Chốt danh sách', exact: true }).click(); }
  async function download() {
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Tải kết quả JSON', exact: true }).click();
    const file = await downloading;
    return JSON.parse(await fs.readFile(await file.path(), 'utf8'));
  }
  try {
    // file:// checks the zero-install launch promised in the README.
    await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
    await page.screenshot({ path: path.join(output, 'desktop-start.png'), fullPage: true });
    assert.match(await page.locator('#capabilities').innerText(), /chưa có AI thật/);
    await start('happy');
    assert.equal(await page.getByRole('button', { name: 'Chốt danh sách', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Lưu quyết định', exact: true }).isDisabled(), true);
    await sources();
    await page.screenshot({ path: path.join(output, 'desktop-review.png'), fullPage: true });
    await save();
    await page.getByRole('button', { name: /Cần làm rõ cách nộp bài nhóm/ }).click(); await sources(); await save();
    await page.getByRole('button', { name: /Đã mở được tài liệu buổi học/ }).click(); await sources(); await save();
    await finish();
    assert.match(await page.locator('.result h2').innerText(), /2 hội thoại/);
    const happy = await download();
    assert.deepEqual(happy.followUp, ['DEMO-01', 'DEMO-02']);
    assert.equal(happy.realAICall, false);
    checks.push('CP2-01: source gate, 3 decisions, 2 follow-ups, JSON download');

    await start('low'); await sources(); await save();
    assert.match(await page.locator('#decision-error').innerText(), /Thêm lý do/);
    await page.locator('#note').fill('Hỏi thêm lỗi ở bước nào và xin mô tả ảnh.'); await save(); await finish();
    assert.match(await page.locator('.result').innerText(), /Cần kiểm tra thêm/);
    checks.push('CP2-02: uncertainty, required explanation, complete with context request');

    await start('no-grounding');
    assert.equal(await page.getByRole('button', { name: 'Chốt danh sách', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Kiểm tra dữ liệu đầu vào', exact: true }).click();
    assert.match(await page.locator('#raw-data').innerText(), /DEMO-MISSING/);
    await page.screenshot({ path: path.join(output, 'no-grounding.png'), fullPage: true });
    await page.getByRole('button', { name: 'Thử lượt có căn cứ', exact: true }).click();
    assert.equal(await page.locator('.conversation').count(), 3);
    checks.push('CP2-03: no invented result, inspect invalid source, recover to mock happy path');

    await start('correction'); await sources();
    await page.locator('#decision').selectOption('resolved'); await save();
    assert.match(await page.locator('#decision-error').innerText(), /Thêm lý do/);
    const note = 'DEMO-M06 xác nhận đã mở được tài liệu. <img src=x onerror=alert(1)>';
    await page.locator('#note').fill(note); await save(); await finish();
    const correction = await download();
    assert.deepEqual(correction.followUp, []);
    assert.equal(correction.decisions[0].taDecision, 'resolved');
    assert.equal(correction.decisions[0].aiSuggestion, 'follow');
    assert.equal(correction.decisions[0].note, note);
    assert.equal(await page.locator('.result img').count(), 0);
    await page.getByRole('button', { name: 'Quay lại chỉnh sửa', exact: true }).click();
    await page.getByRole('button', { name: 'Mở lại để duyệt', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Chốt danh sách', exact: true }).isDisabled(), true);
    await page.locator('#decision').selectOption('dismissed'); await page.locator('#note').fill('Không cần theo dõi vì đã có xác nhận.'); await save(); await finish();
    assert.equal((await download()).decisions[0].taDecision, 'dismissed');
    checks.push('CP2-04/07: correction, audit, escaped notes, reopen, dismiss, re-finalize');

    await page.locator('#server').selectOption('Nhóm workshop (demo)');
    await page.locator('#day').fill('2026-09-15');
    await start('error');
    assert.match(await page.locator('.failure').innerText(), /hết thời gian chờ/);
    await page.getByRole('button', { name: 'Kiểm tra dữ liệu đầu vào', exact: true }).click();
    assert.match(await page.locator('#raw-data').innerText(), /DEMO-M01/);
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    assert.match(await page.locator('.review-heading').innerText(), /Nhóm workshop \(demo\) \/ 15\/09\/2026/);
    checks.push('CP2-05: error, raw input, retry preserves selected server/day');
    await start('empty'); await page.getByRole('button', { name: 'Chốt danh sách rỗng', exact: true }).click();
    assert.deepEqual((await download()).followUp, []);
    assert.match(await page.locator('.result').innerText(), /không chứng minh toàn server/);
    checks.push('CP2-06: empty result has explicit scope limitation');

    await page.setViewportSize({ width: 390, height: 844 });
    await start('low'); await sources();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({ path: path.join(output, 'mobile-review.png'), fullPage: true });
    await page.locator('#note').fill('Cần hỏi lại chi tiết lỗi.'); await save(); await finish();
    checks.push('Mobile 390px: no horizontal overflow, review and finish');
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.brand').evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#server').evaluate(element => element === document.activeElement), true);
    checks.push('Keyboard entry: visible brand and form controls are focusable');
    assert.deepEqual(errors, []);
    const report = { checkedAt: new Date().toISOString(), browser: await browser.version(), checks, pageErrors: errors };
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
