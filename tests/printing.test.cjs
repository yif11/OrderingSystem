const test = require('node:test');
const assert = require('node:assert/strict');
const receiptline = require('receiptline');
const iconv = require('iconv-lite');
const { buildDocuments, buildPrintData, createOrderPrinter } = require('../printing/order-printer.cjs');
const { writeRaw, submitRaw } = require('../printing/windows-printer.cjs');

const sample = {
    id: 123, isTakeout: true, createdAt: '2026-10-05T10:00:00.000Z',
    items: [{ item: 'hotCoffee', price: 300 }, { item: 'hotCoffee', price: 300 }, { item: 'plainCroffle', price: 400 }],
    totalPrice: 700, receivedAmount: 1000, change: 300
};
const renderText = doc => receiptline.transform(doc, { command: 'text', cpl: 32, encoding: 'shiftjis' });

test('receipt groups single items, prints Japanese names, discount and payment', () => {
    const { receipt, ticket } = buildDocuments(sample);
    const text = renderText(receipt);
    assert.equal(text.match(/ホットコーヒー/g).length, 1);
    assert.match(text, /2点 × ￥300\s+￥600/);
    assert.match(text, /小計\s+￥1,000/);
    assert.match(text, /割引\s+-￥300/);
    assert.match(text, /合計\s+￥700/);
    assert.match(text, /お預かり\s+￥1,000/);
    assert.match(text, /お釣り\s+￥300/);
    assert.match(text, /注文番号 T123/);
    assert.match(renderText(ticket), /テイクアウト/);

    const data = buildPrintData(sample);
    const cuts = data.toString('latin1').split('\x1dVB\x00');
    assert.equal(cuts.length, 3, 'receipt and number ticket each end with a cut');
    assert.ok(Buffer.from(cuts[0], 'latin1').includes(iconv.encode('ホットコーヒー', 'shiftjis')));
    assert.ok(cuts[1].includes('T123'));
    assert.ok(cuts[1].includes('\x1d!\x22'), 'number ticket uses triple size');
    assert.ok(data.subarray(0, 5).equals(Buffer.from('\x1b@\x1b=\x01', 'latin1')));
    assert.ok(data.subarray(-7).equals(Buffer.from('\n\n\n\x1dVB\x00', 'latin1')));
});

test('supports explicit quantities, free orders and long eat-in order numbers', () => {
    const order = { ...sample, id: Number.MAX_SAFE_INTEGER, isTakeout: false,
        items: [{ item: 'icedTea', price: 300, quantity: 3 }], totalPrice: 0, receivedAmount: 0, change: 0 };
    const { receipt, ticket } = buildDocuments(order);
    assert.match(renderText(receipt), /3点 × ￥300\s+￥900/);
    assert.match(renderText(receipt), /割引\s+-￥900/);
    assert.match(renderText(receipt), /合計\s+￥0/);
    assert.match(renderText(ticket), /9007199254740991/);
    assert.match(renderText(ticket), /店内/);
    assert.ok(buildPrintData(order).includes(Buffer.from('9007199254740991')));
});

test('product text cannot inject ReceiptLine markup or printer commands', () => {
    const name = 'item|{command:evil}_~^`"=\\test\x1b@';
    const order = { ...sample, items: [{ item: name, price: 700 }] };
    const data = buildPrintData(order).toString('latin1');
    assert.equal(data.split('\x1dVB\x00').length, 3);
    assert.equal(data.split('\x1b@').length, 3);
    const text = renderText(buildDocuments(order).receipt);
    assert.ok(text.replace(/\s/g, '').includes('item|{command:evil}_~^`"=\\test@'));
});

function fakeApi(overrides = {}) {
    const calls = [];
    const api = {
        OpenPrinter: (name, handle) => { calls.push('open'); handle[0] = 'handle'; return 1; },
        StartDocPrinter: (handle, level, info) => {
            calls.push('start'); assert.equal(info.pDatatype, 'RAW'); assert.equal(level, 1); return 42;
        },
        StartPagePrinter: () => { calls.push('page'); return 1; },
        WritePrinter: (handle, chunk, length, written) => { calls.push(Buffer.from(chunk)); written[0] = length; return 1; },
        EndPagePrinter: () => { calls.push('end-page'); return 1; },
        EndDocPrinter: () => { calls.push('end'); return 1; },
        AbortPrinter: () => { calls.push('abort'); return 1; },
        ClosePrinter: () => { calls.push('close'); return 1; },
        GetLastError: () => 1801,
        ...overrides
    };
    return { api, calls };
}

test('RAW spooler handles partial writes without dropping or duplicating bytes', () => {
    const sent = [];
    const { api, calls } = fakeApi({ WritePrinter: (handle, chunk, length, written) => {
        written[0] = Math.min(3, length); sent.push(chunk.subarray(0, written[0])); return 1;
    } });
    const data = Buffer.from('0123456789');
    const result = writeRaw(data, 'NEC', '日本語', api);
    assert.deepEqual(result, { jobId: 42, printerName: 'NEC', bytes: 10 });
    assert.deepEqual(Buffer.concat(sent), data);
    assert.deepEqual(calls, ['open', 'start', 'page', 'end-page', 'end', 'close']);
});

test('spooler failures abort an unfinished job and always release the handle', () => {
    for (const operation of ['StartPagePrinter', 'WritePrinter', 'EndPagePrinter', 'EndDocPrinter']) {
        const { api, calls } = fakeApi({ [operation]: () => 0 });
        assert.throws(() => writeRaw(Buffer.from('test'), 'NEC', 'test', api), /Windowsエラー 1801/);
        assert.deepEqual(calls.slice(-2), ['abort', 'close']);
    }
    const { api, calls } = fakeApi({ StartDocPrinter: () => 0 });
    assert.throws(() => writeRaw(Buffer.from('test'), 'NEC', 'test', api), /StartDocPrinter/);
    assert.deepEqual(calls, ['open', 'close']);
});

test('a zero-byte write aborts rather than looping forever', () => {
    const { api, calls } = fakeApi({ WritePrinter: () => 1 });
    assert.throws(() => writeRaw(Buffer.from('test'), 'NEC', 'test', api), /送信できません/);
    assert.deepEqual(calls.slice(-2), ['abort', 'close']);
});

test('print jobs are serialized and recover after a rejected job', async () => {
    let release;
    let started;
    const firstStarted = new Promise(resolve => { started = resolve; });
    const firstJob = new Promise((resolve, reject) => { release = () => reject(new Error('offline')); });
    const calls = [];
    const print = createOrderPrinter({ printerName: 'NEC', send: (data, printerName, name) => {
        calls.push(name); assert.equal(printerName, 'NEC');
        if (calls.length === 1) { started(); return firstJob; }
        return Promise.resolve({ jobId: 2 });
    } });
    const first = print(sample);
    const rejected = assert.rejects(first, /offline/);
    const second = print({ ...sample, id: 124 });
    await firstStarted;
    assert.equal(calls.length, 1);
    release();
    await rejected;
    assert.deepEqual(await second, { jobId: 2 });
    assert.equal(calls.length, 2);
});

test('Windows worker reports an unregistered printer without creating a job', { skip: process.platform !== 'win32' }, async () => {
    await assert.rejects(submitRaw(Buffer.from('test'), 'OrderingSystem nonexistent test printer', 'test'), /OpenPrinter.*1801/);
});
