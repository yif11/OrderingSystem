const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { createOrderStore } = require('../backend/order-store.cjs');
const { createOrderMaintenance, readBackup } = require('../backend/order-maintenance.cjs');
const { createOrderService } = require('../backend/order-service.cjs');

const request = { items: [{ item: 'hotCoffee', price: 200 }], totalPrice: 200, receivedAmount: 500, change: 300, isTakeout: true };
const fixture = () => ({
    orders: [{ id: 3, ...request, totalPrice: 300, change: 200, items: [{ item: 'hotCoffee', price: 300, quantity: 2, served: false }], note: '旧データの追加属性' }],
    servedOrders: [{ id: 5, ...request, totalPrice: 300, change: 200, items: [{ item: 'plainCroffle', price: 400, served: true }], isTakeout: false }],
    maxOrderId: 9
});

async function setup(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ordering-maintenance-test-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const dataDir = path.join(root, 'data');
    const backupDir = path.join(root, 'backups');
    const store = createOrderStore({ dataDir });
    const maintenance = createOrderMaintenance({ store, backupDir });
    await store.withState((state, commit) => commit(fixture()));
    const cli = (command, ...args) => spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'orders.cjs'), command,
        '--data-dir', dataDir, '--backup-dir', backupDir, ...args], { encoding: 'utf8' });
    return { root, dataDir, backupDir, store, maintenance, cli };
}

test('backup contains pending, served, legacy fields and the counter; restore preserves all of them', async t => {
    const { store, maintenance } = await setup(t);
    const before = await store.read();
    const backup = await maintenance.backup();
    assert.deepEqual(readBackup(backup.file).data, before);
    assert.equal(backup.items, 3);
    assert.deepEqual(await store.read(), before);
    await maintenance.reset();
    const restored = await maintenance.restore(backup.file);
    assert.deepEqual(await store.read(), before);
    assert.deepEqual(readBackup(restored.backup).data, { orders: [], servedOrders: [], maxOrderId: 0 });
    const service = createOrderService({ store, printOrder: async () => ({ jobId: 1 }) });
    assert.equal((await service.addOrder(request)).order.id, 10);
});

test('reset automatically backs up all records, resets IDs, and preserves unrelated files', async t => {
    const { store, maintenance, dataDir } = await setup(t);
    fs.writeFileSync(path.join(dataDir, 'keep.txt'), 'unrelated');
    const result = await maintenance.reset();
    assert.deepEqual(await store.read(), { orders: [], servedOrders: [], maxOrderId: 0 });
    assert.deepEqual(readBackup(result.backup).data, fixture());
    assert.equal(readBackup(result.backup).reason, 'before-reset');
    assert.equal(fs.readFileSync(path.join(dataDir, 'keep.txt'), 'utf8'), 'unrelated');
    const service = createOrderService({ store, printOrder: async () => ({}) });
    assert.equal((await service.addOrder(request)).order.id, 1);
});

test('reset can retain the counter for continued numbering', async t => {
    const { store, maintenance } = await setup(t);
    const reset = await maintenance.reset({ keepCounter: true });
    assert.equal(reset.nextOrderId, 10);
    assert.deepEqual(await store.read(), { orders: [], servedOrders: [], maxOrderId: 9 });
});

test('backup failures prevent reset and restore from modifying data', async t => {
    const { root, store, maintenance } = await setup(t);
    const backup = await maintenance.backup();
    const blockedDir = path.join(root, 'not-a-directory');
    fs.writeFileSync(blockedDir, 'blocked');
    const blocked = createOrderMaintenance({ store, backupDir: blockedDir });
    await assert.rejects(blocked.reset());
    await assert.rejects(blocked.restore(backup.file));
    assert.deepEqual(await store.read(), fixture());
});

test('invalid version, duplicate IDs, corrupt checksum and truncated backups cannot alter live data', async t => {
    const { root, store, maintenance } = await setup(t);
    const original = readBackup((await maintenance.backup()).file);
    const badFile = path.join(root, 'invalid.json');
    for (const invalid of [
        { ...original, version: 99 },
        { ...original, checksum: 'bad' },
        { ...original, data: { ...original.data, maxOrderId: 0 } },
        { ...original, data: { ...original.data, servedOrders: original.data.orders } }
    ]) {
        fs.writeFileSync(badFile, JSON.stringify(invalid));
        await assert.rejects(maintenance.restore(badFile));
        assert.deepEqual(await store.read(), fixture());
    }
    fs.writeFileSync(badFile, '{');
    await assert.rejects(maintenance.restore(badFile), /JSON/);
    assert.deepEqual(await store.read(), fixture());
});

test('existing backup/export files and live data files cannot be overwritten', async t => {
    const { root, dataDir, store, maintenance } = await setup(t);
    const output = path.join(root, 'backup.json');
    await maintenance.backup(output);
    const contents = fs.readFileSync(output, 'utf8');
    await assert.rejects(maintenance.backup(output), { code: 'EEXIST' });
    await assert.rejects(maintenance.exportCsv(output), { code: 'EEXIST' });
    for (const name of ['orders.json', 'served-orders.json', 'max-order-id.txt', '.order-transaction.json', path.join('.orders.lock', 'backup.json')]) {
        await assert.rejects(maintenance.backup(path.join(dataDir, name)), /出力先/);
        await assert.rejects(maintenance.exportCsv(path.join(dataDir, name)), /出力先/);
    }
    assert.equal(fs.readFileSync(output, 'utf8'), contents);
    assert.deepEqual(await store.read(), fixture());
});

test('CSV exports both order lists with Japanese names, quantities, quoting and Excel BOM', async t => {
    const { store, maintenance } = await setup(t);
    await store.withState((state, commit) => {
        state.orders[0].items.push({ item: '=SUM(1,2)"\ncustom', price: 0 });
        commit(state);
    });
    const result = await maintenance.exportCsv();
    const csv = fs.readFileSync(result.file, 'utf8');
    assert.ok(csv.startsWith('\uFEFF'));
    assert.match(csv, /ホットコーヒー/);
    assert.match(csv, /クロッフル\(プレーン\)/);
    assert.match(csv, /"T3","未提供"/);
    assert.match(csv, /"5","提供済み"/);
    assert.match(csv, /"2","300","600"/);
    assert.ok(csv.includes('"\'=SUM(1,2)""\ncustom"'));
    assert.equal(result.rows, 3);
});

test('voucher payments survive backup and restoration and appear in CSV without reducing the sale', async t => {
    const { store, maintenance } = await setup(t);
    const service = createOrderService({ store, printOrder: async () => ({}) });
    const { order } = await service.addOrder({ ...request, vouchers: { 500: 1 }, receivedAmount: 0, change: 0 });
    const before = await store.read();
    assert.equal((await maintenance.status()).totalSales, 800);
    const backup = await maintenance.backup();
    assert.deepEqual(readBackup(backup.file).data.orders.find(saved => saved.id === order.id).vouchers, order.vouchers);
    await maintenance.reset();
    await maintenance.restore(backup.file);
    assert.deepEqual(await store.read(), before);
    const csv = fs.readFileSync((await maintenance.exportCsv()).file, 'utf8');
    assert.ok(csv.includes('"商品券額面合計","商品券充当額","現金支払額"'));
    assert.ok(csv.includes('"50円商品券枚数","100円商品券枚数","200円商品券枚数","300円商品券枚数","500円商品券枚数","1000円商品券枚数"'));
    const row = csv.split('\r\n').find(line => line.startsWith(`"T${order.id}",`));
    assert.ok(row.endsWith('"200","0","0","500","200","0","0","0","0","0","1","0"'));
});

test('interrupted multi-file writes are recovered from the journal before any operation', async t => {
    const { store, dataDir } = await setup(t);
    const next = { ...fixture(), orders: [], maxOrderId: 12 };
    fs.writeFileSync(path.join(dataDir, '.order-transaction.json'), JSON.stringify(next));
    fs.writeFileSync(path.join(dataDir, 'orders.json'), '[]');
    assert.deepEqual(await store.read(), next);
    assert.equal(fs.readFileSync(path.join(dataDir, 'max-order-id.txt'), 'utf8'), '12');
    assert.equal(fs.existsSync(path.join(dataDir, '.order-transaction.json')), false);
});

test('a write failure leaves a recoverable journal and releases the lock', async t => {
    const { store, dataDir } = await setup(t);
    const originalRename = fs.renameSync;
    t.mock.method(fs, 'renameSync', (from, to) => {
        if (to === path.join(dataDir, 'served-orders.json')) throw new Error('simulated disk failure');
        return originalRename(from, to);
    });
    const next = { ...fixture(), orders: [], maxOrderId: 12 };
    await assert.rejects(store.withState((state, commit) => commit(next)), /disk failure/);
    t.mock.restoreAll();
    assert.equal(fs.existsSync(path.join(dataDir, '.orders.lock')), false);
    assert.deepEqual(await store.read(), next);
    assert.equal(fs.existsSync(path.join(dataDir, '.order-transaction.json')), false);
});

test('legacy files with no counter recover their highest order number without dropping records', async t => {
    const { store, dataDir } = await setup(t);
    fs.unlinkSync(path.join(dataDir, 'max-order-id.txt'));
    const state = await store.read();
    assert.equal(state.maxOrderId, 5);
    assert.deepEqual(state.orders, fixture().orders);
    assert.deepEqual(state.servedOrders, fixture().servedOrders);
});

test('multiple processes allocate unique IDs without overwriting orders', async t => {
    const { store, dataDir } = await setup(t);
    const source = `
        const { createOrderStore } = require('./backend/order-store.cjs');
        const { createOrderService } = require('./backend/order-service.cjs');
        const service = createOrderService({ store: createOrderStore({ dataDir: process.argv[1] }), printOrder: async () => ({}) });
        Promise.all(Array.from({ length: 4 }, () => service.addOrder(${JSON.stringify(request)})))
            .then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
    `;
    const children = Array.from({ length: 3 }, () => spawn(process.execPath, ['-e', source, dataDir], {
        cwd: path.join(__dirname, '..'), stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true
    }));
    for (const child of children) {
        t.after(() => { if (child.exitCode === null) child.kill(); });
    }
    await Promise.all(children.map(child => new Promise((resolve, reject) => {
        let stderr = '';
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.once('error', reject);
        child.once('close', code => code === 0 ? resolve() : reject(new Error(stderr)));
    })));
    const state = await store.read();
    assert.equal(state.orders.length, 13);
    assert.equal(state.maxOrderId, 21);
    assert.deepEqual(state.orders.slice(1).map(order => order.id).sort((a, b) => a - b), Array.from({ length: 12 }, (_, index) => index + 10));
});

test('CLI reset/restore require --yes and errors leave data unchanged', async t => {
    const { root, store, maintenance, cli } = await setup(t);
    const backup = await maintenance.backup();
    for (const result of [cli('reset'), cli('restore', '--file', backup.file), cli('backup', '--keep-counter'), cli('unknown')]) {
        assert.equal(result.status, 1);
    }
    assert.match(cli('reset').stderr, /--yes/);
    assert.deepEqual(await store.read(), fixture());
    assert.equal(cli('verify', '--file', backup.file).status, 0);
    assert.equal(cli('reset', '--yes').status, 0);
    assert.equal(cli('restore', '--file', backup.file, '--yes').status, 0);
    assert.deepEqual(await store.read(), fixture());
    assert.equal(cli('export', '--output', path.join(root, 'orders.csv')).status, 0);
    const status = cli('status');
    assert.equal(status.status, 0);
    assert.equal(JSON.parse(status.stdout).maxOrderId, 9);
});

test('CLI and server operations use one lock and backup sees a consistent completed transaction', async t => {
    const { store, dataDir, backupDir } = await setup(t);
    let release;
    let locked;
    const gate = new Promise(resolve => { release = resolve; });
    const acquired = new Promise(resolve => { locked = resolve; });
    const change = store.withState(async (state, commit) => {
        locked();
        await gate;
        state.maxOrderId = 10;
        commit(state);
    });
    await acquired;
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'scripts', 'orders.cjs'), 'backup',
        '--data-dir', dataDir, '--backup-dir', backupDir], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    t.after(() => { if (child.exitCode === null) child.kill(); });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    const finished = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
    release();
    await change;
    assert.equal(await finished, 0, stderr);
    assert.equal(readBackup(JSON.parse(stdout).file).data.maxOrderId, 10);
});
