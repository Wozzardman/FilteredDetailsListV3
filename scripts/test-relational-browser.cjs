/* Local browser integration check. Uses installed Edge and synthetic data; no Power Apps connection. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const webpack = require('webpack');
const { chromium } = require('@playwright/test');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'out', 'relational-browser-test');

async function main() {
    await new Promise((resolve, reject) => webpack({
        mode: 'development', devtool: false,
        entry: path.join(root, 'DetailsList/__tests__/relational-browser/fixture.tsx'),
        output: { path: output, filename: 'fixture.js' },
        resolve: { extensions: ['.tsx', '.ts', '.js'] },
        module: { rules: [
            { test: /\.tsx?$/, exclude: /node_modules/, use: { loader: 'ts-loader', options: { transpileOnly: true } } },
            { test: /\.css$/, use: ['style-loader', 'css-loader'] },
            { test: /\.(woff2?|ttf|eot|svg)$/, type: 'asset/inline' }
        ] },
        performance: { hints: false }
    }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
    const server = http.createServer((request, response) => {
        if (request.url === '/fixture.js') { response.setHeader('Content-Type', 'application/javascript'); response.end(fs.readFileSync(path.join(output, 'fixture.js'))); }
        else { response.setHeader('Content-Type', 'text/html'); response.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>'); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser, page;
    try {
        browser = await chromium.launch({ channel: 'msedge', headless: true });
        page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
        page.setDefaultTimeout(15000);
        const errors = [];
        page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message); });
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        await page.locator('[data-scope="parent"][data-record-id="1"]').waitFor();
        const parent = page.locator('[data-scope="parent"][data-record-id="1"]');
        assert.equal(await page.locator('[data-scope="parent"][data-record-id="0"] .relation-chevron').count(), 0);
        await parent.locator('.relation-chevron').click();
        await page.locator('[data-scope="child"][data-record-id="0"]').waitFor();
        assert.equal(await page.locator('.relation-child-header').getByText('Line description', { exact: true }).count(), 1);
        const description = page.locator('[data-scope="child"][data-record-id="0"] [data-column-key="Description"]');
        await description.dblclick();
        const editor = description.locator('input,textarea').first();
        await editor.fill('Edited line');
        await editor.press('Tab');
        const statusEditor = page.locator('[data-scope="child"][data-record-id="0"] [data-column-key="Status"]').locator('input,textarea');
        await statusEditor.waitFor();
        await statusEditor.press('Shift+Tab');
        await editor.waitFor();
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => JSON.parse(window.relationalHarness.controller.outputs().ChildPendingChanges)[0].changes.Description), 'Edited line');
        await parent.locator('.relation-chevron').click();
        await page.locator('[data-scope="child"][data-record-id="0"]').waitFor({ state: 'hidden' });
        await parent.locator('.relation-chevron').click();
        await description.waitFor();
        assert.equal(await description.textContent().then(t => t.includes('Edited line')), true);
        await page.getByRole('button', { name: /^Save Changes/ }).click();
        await page.waitForFunction(() => window.relationalHarness.controller.busy);
        assert.equal(await page.evaluate(() => window.lastOutputs.EventDataset), 'child');
        await page.evaluate(() => {
            const h = window.relationalHarness;
            h.context.parameters.SaveResult.raw = JSON.stringify({ requestId: h.controller.saveRequestId, child: { status: 'failed', message: 'Synthetic failure' } }); h.render();
        });
        await page.getByText('child: Synthetic failure').waitFor();
        assert.equal(await page.evaluate(() => window.relationalHarness.controller.changes.changes.child.size), 1);
        await page.getByRole('button', { name: 'Cancel Changes', exact: true }).click();
        assert.equal(await page.evaluate(() => window.relationalHarness.controller.changes.changes.child.size), 0);
        await page.locator('select[aria-label="Order lines filter column"]').selectOption('Status');
        await page.getByRole('button', { name: 'Filter', exact: true }).click();
        await page.getByRole('checkbox', { name: /Select All/ }).uncheck();
        await page.locator('.ms-Callout').getByText('Pending', { exact: true }).locator('..').locator('.ms-Checkbox-label').click();
        await page.getByRole('button', { name: 'Apply', exact: true }).click();
        await page.waitForFunction(() => !document.querySelector('[data-scope="parent"][data-record-id="0"]'));
        assert.equal(await page.locator('[data-scope="child"]').count() > 0, true);
        assert.equal(await page.evaluate(() => window.relationalHarness.controller.scopes.child.filters.Status[0]), 'Pending');
        await page.screenshot({ path: path.join(output, 'relational-grid.png'), fullPage: true });
        await page.evaluate(() => window.relationalHarness.controller.filter('child', 'Status', []));
        for (const flag of [false, true]) {
            await page.evaluate(flag => {
                const h = window.relationalHarness;
                h.context.parameters.ChildAddNewRowsSave.raw = flag;
                h.render();
                document.querySelector('.relation-scroll').scrollTop = 0;
            }, flag);
            await page.locator('[data-scope="parent"][data-record-id="0"] .relation-add').click();
            await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click();
            await page.locator('.ms-Modal').waitFor({ state: 'detached' });
            await page.waitForFunction(() => window.relationalHarness.controller.changes.drafts.child.size === 1);
            const draftId = await page.evaluate(() => [...window.relationalHarness.controller.changes.drafts.child.keys()][0]);
            const draft = page.locator(`[data-scope="child"][data-record-id="${draftId}"]`);
            await draft.waitFor();
            assert.equal(await page.getByRole('button', { name: /^Save Changes/ }).count(), flag ? 1 : 0);
            if (!flag) {
                const cell = draft.locator('[data-column-key="Description"]');
                await cell.click();
                await cell.locator('input,textarea').first().fill('Saved new line');
                await cell.locator('input,textarea').first().press('Enter');
                await page.keyboard.press('Escape');
            }
            await page.getByRole('button', { name: /^Save Changes/ }).click();
            await page.waitForFunction(() => window.relationalHarness.controller.busy);
            await page.evaluate(() => {
                const h = window.relationalHarness;
                const batch = h.controller.changes.batch;
                const saved = batch.child.map((change, i) => ({ id: `saved-${Date.now()}-${i}`, ...change.changes, isNewRow: undefined }));
                const existing = h.controller.scopes.child.base.map(record => ({ id: record.recordId, ...record.values }));
                h.context.parameters.SaveResult.raw = JSON.stringify({ requestId: batch.requestId, child: { status: 'succeeded' } });
                h.render();
                // Simulate the actual host refresh response after the acknowledgement.
                h.context.parameters.records.records = { ...h.context.parameters.records.records };
                h.context.parameters.childRecords = h.dataset([...existing, ...saved], h.context.parameters.childRecords.columns);
                h.render();
            });
            await draft.waitFor({ state: 'hidden' });
            assert.equal(await page.evaluate(() => window.relationalHarness.controller.changes.drafts.child.size), 0);
            assert.equal(await page.getByRole('button', { name: /^Save Changes/ }).count(), 0);
            assert.equal(await page.locator('[data-scope="child"][data-record-id^="saved-"]').count() > 0, true);
        }
        assert.deepEqual(errors, []);
        console.log('PASS: expansion, independent child columns, Tab/Shift+Tab, collapse persistence, failure retention, cancel, filter UI, and add/save/refresh cleanup with both toggle settings.');
        console.log(`Screenshot: ${path.join(output, 'relational-grid.png')}`);
    } catch (error) {
        if (page) await page.screenshot({ path: path.join(output, 'failure.png'), timeout: 3000 }).catch(() => undefined);
        throw error;
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
