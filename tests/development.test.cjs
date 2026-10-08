const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createOrderApiPlugin } = require('../development/order-api.cjs');
const { createApp } = require('../server.cjs');

test('Vite alone serves same-origin order APIs, frontend routes and the favicon with --host', async t => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ordering-dev-test-'));
    const printed = [];
    const { createServer } = await import('vite');
    const server = await createServer({
        configFile: false,
        cacheDir: path.join(dataDir, 'vite-cache'),
        optimizeDeps: { noDiscovery: true, include: [] },
        plugins: [createOrderApiPlugin({ dataDir, printOrder: async order => { printed.push(order.id); return { jobId: 7 }; } })],
        server: { host: '0.0.0.0', port: 0, hmr: false, watch: null }
    });
    t.after(async () => {
        server.httpServer?.closeAllConnections();
        await server.close();
        fs.rmSync(dataDir, { recursive: true, force: true });
    });
    await server.listen();
    const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    assert.deepEqual(await (await fetch(base + '/api/orders')).json(), []);
    const response = await fetch(base + '/api/add-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ item: 'hotCoffee', price: 200 }], totalPrice: 200, vouchers: { 50: 1 }, receivedAmount: 500, change: 350, isTakeout: false })
    });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).printing.status, 'queued');
    assert.deepEqual(printed, [1]);
    assert.equal((await (await fetch(base + '/api/orders')).json())[0].id, 1);
    assert.equal((await fetch(base + '/order')).status, 200);
    const favicon = await fetch(base + '/favicon.svg');
    assert.equal(favicon.status, 200);
    assert.match(favicon.headers.get('content-type'), /image\/svg\+xml/);
    const unknown = await fetch(base + '/api/unknown');
    assert.equal(unknown.status, 404);
    assert.deepEqual(await unknown.json(), { error: 'APIが見つかりません。' });
    const apiModule = await (await fetch(base + '/src/api/orders.ts')).text();
    assert.ok(apiModule.includes('"/api"') || apiModule.includes("'/api'"));
    assert.equal(apiModule.includes('http://localhost:5000'), false);
});

test('standalone server supports both /api and existing endpoint URLs', async t => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ordering-api-prefix-test-'));
    const server = createApp({ dataDir, printOrder: async () => ({}) }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(async () => {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        fs.rmSync(dataDir, { recursive: true, force: true });
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const endpoint of ['/orders', '/api/orders', '/served-orders', '/api/served-orders']) {
        const response = await fetch(base + endpoint);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), []);
    }
});
