const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server.cjs');

const orderData = {
    items: [{ item: 'hotCoffee', price: 200 }],
    totalPrice: 200, receivedAmount: 500, change: 300, isTakeout: true
};

async function setup(t, printOrder) {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ordering-print-test-'));
    const server = createApp({ dataDir, printOrder }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(async () => {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
        fs.rmSync(dataDir, { recursive: true, force: true });
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    return {
        dataDir,
        get: url => fetch(base + url),
        post: (url, body) => fetch(base + url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        })
    };
}

test('saves orders before printing and reprints the same saved order', async t => {
    const printed = [];
    const client = await setup(t, async order => {
        const stored = JSON.parse(fs.readFileSync(path.join(client.dataDir, 'orders.json')));
        assert.equal(stored[0].id, order.id);
        printed.push(order);
        return { jobId: 42 };
    });
    const response = await client.post('/add-order', orderData);
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.order.id, 1);
    assert.equal(result.order.items[0].quantity, 1);
    assert.equal(result.order.items[0].served, false);
    assert.deepEqual(result.printing, { status: 'queued', jobId: 42 });
    assert.equal((await client.post('/orders/1/print')).status, 200);
    assert.equal(printed.length, 2);
    assert.deepEqual(printed[0], printed[1]);
    assert.equal((await (await client.get('/orders')).json()).length, 1);
    assert.equal(fs.readFileSync(path.join(client.dataDir, 'max-order-id.txt'), 'utf8'), '1');
});

test('a print failure preserves the order and retry does not create another order', async t => {
    let failed = true;
    const client = await setup(t, async () => {
        if (failed) throw new Error('printer offline');
        return { jobId: 99 };
    });
    const response = await client.post('/add-order', orderData);
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.equal(result.order.id, 1);
    assert.deepEqual(result.printing, { status: 'failed', error: 'printer offline' });
    assert.equal((await client.post('/orders/1/print')).status, 502);
    failed = false;
    const retry = await client.post('/orders/1/print');
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).printing.jobId, 99);
    assert.equal((await (await client.get('/orders')).json()).length, 1);
    assert.equal((await client.post('/orders/999/print')).status, 404);
});

test('a served order can still be reprinted with its original order number', async t => {
    const printed = [];
    const client = await setup(t, async order => { printed.push(order); return { jobId: 1 }; });
    await client.post('/add-order', orderData);
    assert.equal((await client.post('/mark-served', { orderId: 1, itemIndex: 0 })).status, 200);
    assert.deepEqual(await (await client.get('/orders')).json(), []);
    assert.equal((await client.post('/orders/1/print')).status, 200);
    assert.equal(printed[1].id, 1);
    assert.equal(printed[1].isTakeout, true);
});

test('invalid requests are rejected before saving or printing', async t => {
    let prints = 0;
    const client = await setup(t, async () => { prints++; });
    for (const invalid of [
        {}, { ...orderData, items: [] }, { ...orderData, change: 0 },
        { ...orderData, items: [{ item: 'hotCoffee', price: -1 }] },
        { ...orderData, items: [{ item: 'hotCoffee', price: 200, quantity: 0 }] },
        { ...orderData, receivedAmount: 100, change: -100 },
        { ...orderData, totalPrice: 600, receivedAmount: 700, change: 100 },
        { ...orderData, totalPrice: 100, receivedAmount: 500, change: 400 },
        { ...orderData, items: [{ item: 'plainCroffle', price: 400 }], totalPrice: 400, change: 100 },
        { ...orderData, items: [{ item: 'hotCoffee', price: 300 }], totalPrice: 300, change: 200 },
        ...[null, [], 1, { 75: 1 }, { '050': 1 }, { 100: -1 }, { 200: 0.5 }, { 300: '1' }, { 1000: Number.MAX_SAFE_INTEGER }]
            .map(vouchers => ({ ...orderData, vouchers })),
        { ...orderData, vouchers: { 100: 1 }, change: 300 },
        { ...orderData, vouchers: { 500: 1 }, receivedAmount: 0, change: 300 }
    ]) {
        assert.equal((await client.post('/add-order', invalid)).status, 400);
    }
    assert.equal(prints, 0);
    assert.deepEqual(await (await client.get('/orders')).json(), []);
    assert.equal(fs.readFileSync(path.join(client.dataDir, 'max-order-id.txt'), 'utf8'), '0');
});

test('mixed vouchers preserve the sale value, cash change and denomination counts through serving and reprinting', async t => {
    const printed = [];
    const client = await setup(t, async order => { printed.push(order); return { jobId: 1 }; });
    const vouchers = { 50: 1, 100: 1, 200: 1, 300: 1, 500: 1, 1000: 1 };
    const response = await client.post('/add-order', {
        items: [{ item: 'gingerAle', price: 300, quantity: 8 }], totalPrice: 2400,
        vouchers, receivedAmount: 500, change: 250, isTakeout: false
    });
    assert.equal(response.status, 201);
    const { order } = await response.json();
    assert.equal(order.totalPrice, 2400);
    assert.equal(order.receivedAmount, 500);
    assert.equal(order.change, 250);
    assert.deepEqual(order.vouchers, vouchers);
    assert.deepEqual((await (await client.get('/orders')).json())[0].vouchers, vouchers);
    assert.equal((await client.post('/mark-served', { orderId: order.id, itemIndex: 0 })).status, 200);
    const served = (await (await client.get('/served-orders')).json())[0];
    assert.deepEqual(served.vouchers, vouchers);
    assert.equal((await client.post(`/orders/${order.id}/print`)).status, 200);
    assert.deepEqual(printed[1].vouchers, vouchers);
    assert.equal(printed[1].change, 250);
});

test('vouchers cover an order exactly or exceed it without returning voucher change', async t => {
    const client = await setup(t, async () => ({}));
    for (const vouchers of [{ 50: 2, 100: 1 }, { 1000: 1 }]) {
        const response = await client.post('/add-order', { ...orderData, vouchers, receivedAmount: 0, change: 0 });
        assert.equal(response.status, 201);
        const { order } = await response.json();
        assert.equal(order.totalPrice, 200);
        assert.equal(order.change, 0);
    }
    const response = await client.post('/add-order', { ...orderData, vouchers: { 500: 1 }, receivedAmount: 100, change: 100 });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).order.change, 100, 'only the cash tender is returned');
});

test('concurrent orders get unique IDs while a slow printer does not block reads', async t => {
    let release;
    let started;
    const printing = new Promise(resolve => { release = resolve; });
    const firstStarted = new Promise(resolve => { started = resolve; });
    const client = await setup(t, async order => { if (order.id === 1) { started(); await printing; } return { jobId: order.id }; });
    const first = client.post('/add-order', orderData);
    await firstStarted;
    const second = await client.post('/add-order', orderData);
    assert.equal((await second.json()).order.id, 2);
    const saved = await (await client.get('/orders')).json();
    assert.deepEqual(saved.map(order => order.id), [1, 2]);
    release();
    assert.equal((await (await first).json()).order.id, 1);
});
