const test = require('node:test');
const assert = require('node:assert/strict');
const receiptline = require('receiptline');
const iconv = require('iconv-lite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PNG } = require('pngjs');
const { buildDocuments, buildPrintData, renderPreview, createOrderPrinter } = require('../printing/order-printer.cjs');
const { prepareReceiptImage, loadReceiptImages } = require('../printing/receipt-images.cjs');
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
    assert.match(renderText(ticket), /この番号票をお持ちください/);
    assert.doesNotMatch(renderText(ticket), /クリップ/);

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
    assert.ok(renderText(ticket).replace(/\s/g, '').includes('注文番号をクリップにはさんでおいてください'));
    assert.ok(buildPrintData(order).includes(Buffer.from('9007199254740991')));
});

test('receipt prints monochrome logo first and QR after thank-you, within 58 mm paper', () => {
    const { receipt } = buildDocuments(sample);
    const lines = receipt.split('\n');
    assert.match(lines[1], /^\{image:/);
    assert.doesNotMatch(receipt, / レシート /);
    const images = [...receipt.matchAll(/\{image:([^}]+)\}/g)].map(match => PNG.sync.read(Buffer.from(match[1], 'base64')));
    assert.equal(images.length, 2);
    assert.ok(images[0].width <= 384);
    assert.ok(images[0].height < images[0].width, 'transparent logo margins are removed');
    assert.equal(images[1].width, 384);
    const qrSource = PNG.sync.read(fs.readFileSync(path.join(__dirname, '..', 'public', 'qr.png')));
    assert.ok(Math.abs(images[1].height / images[1].width - qrSource.height / qrSource.width) < 1 / images[1].width, 'QR aspect ratio is preserved');
    assert.equal(images[1].data[0], 255, 'QR quiet border stays white');
    for (const image of images) {
        let black = 0, white = 0;
        for (let pixel = 0; pixel < image.data.length; pixel += 4) {
            const gray = image.data[pixel];
            assert.ok(gray === 0 || gray === 255);
            assert.equal(image.data[pixel + 1], gray);
            assert.equal(image.data[pixel + 2], gray);
            assert.equal(image.data[pixel + 3], 255);
            if (gray === 0) black++; else white++;
        }
        assert.ok(black > 0 && white > 0, 'both image content and white paper survive');
    }

    const data = buildPrintData(sample);
    const raster = Buffer.from('\x1dv0', 'latin1');
    const frames = [];
    for (let cursor = 0; cursor < data.length;) {
        const start = data.indexOf(raster, cursor);
        if (start === -1) break;
        const widthBytes = data.readUInt16LE(start + 4), height = data.readUInt16LE(start + 6);
        const end = start + 8 + widthBytes * height;
        assert.ok(end <= data.length);
        frames.push({ start, end, widthBytes, height });
        cursor = end;
    }
    assert.equal(frames.length, 2);
    const thankYou = data.indexOf(iconv.encode('ありがとうございました', 'shiftjis'));
    assert.ok(thankYou > frames[0].end && thankYou < frames[1].start);
    assert.ok(frames[1].end < data.indexOf(Buffer.from('\x1dVB\x00', 'latin1')), 'QR precedes the receipt cut');
    for (let index = 0; index < images.length; index++) {
        const image = images[index], frame = frames[index];
        assert.equal(frame.widthBytes, Math.ceil(image.width / 8));
        assert.equal(frame.height, image.height);
        for (let y = 0; y < image.height; y++) {
            for (let x = 0; x < image.width; x++) {
                const printed = data[frame.start + 8 + y * frame.widthBytes + (x >> 3)] & (128 >> (x & 7));
                assert.equal(Boolean(printed), image.data[(y * image.width + x) * 4] === 0);
            }
        }
    }
});

test('receipt image scaling retains lighter QR dots and flattens transparency onto white', () => {
    const source = new PNG({ width: 4, height: 2 });
    for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 4; x++) {
            source.data.set(x < 2 ? [247, 120, 60, 255] : [0, 0, 0, 0], (y * 4 + x) * 4);
        }
    }
    const image = PNG.sync.read(prepareReceiptImage(PNG.sync.write(source), { maxWidth: 2 }));
    assert.equal(image.width, 2);
    assert.equal(image.height, 1);
    assert.deepEqual([...image.data], [0, 0, 0, 255, 255, 255, 255, 255]);
});

test('receipt and ticket center their 32-column content within the NEC 35-column area', () => {
    const data = buildPrintData(sample);
    const raster = Buffer.from('\x1dv0', 'latin1');
    let areas = 0;
    for (let offset = 0; offset < data.length;) {
        if (data.subarray(offset, offset + 3).equals(raster)) {
            const widthBytes = data.readUInt16LE(offset + 4), height = data.readUInt16LE(offset + 6);
            offset += 8 + widthBytes * height;
        } else if (data[offset] === 0x1d && data[offset + 1] === 0x4c) {
            const left = data.readUInt16LE(offset + 2);
            assert.equal(left, 18, '18-dot left margin applies to every row and image');
            assert.ok(data.subarray(offset + 4, offset + 6).equals(Buffer.from('\x1dW', 'latin1')));
            const width = data.readUInt16LE(offset + 6);
            assert.equal(width, 384);
            assert.equal(420 - left - width, left, 'left and right margins are equal');
            areas++;
            offset += 8;
        } else offset++;
    }
    assert.ok(areas > 10);

    const { receipt, ticket } = buildDocuments(sample);
    for (const document of [receipt, ticket]) {
        const svg = renderPreview(document);
        assert.match(svg, /^<svg width="420px"/);
        assert.match(svg, /viewBox="0 0 420 \d+"/);
    }
    const svg = renderPreview(receipt);
    const imagePlacements = [...svg.matchAll(/<g transform="translate\(([\d.]+),[\d.]+\)"><image[^>]+width="(\d+)"/g)];
    assert.equal(imagePlacements.length, 2);
    for (const [, x, width] of imagePlacements) assert.equal(Number(x) + Number(width) / 2, 210, 'both image centers match the paper center');
});

test('receipt assets reload after replacement and missing or corrupt PNGs report their filename', t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ordering-receipt-images-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    const source = new PNG({ width: 2, height: 2 });
    source.data.fill(255);
    const png = PNG.sync.write(source);
    fs.writeFileSync(path.join(directory, 'logo.png'), png);
    fs.writeFileSync(path.join(directory, 'qr.png'), png);
    const first = loadReceiptImages(directory);
    assert.deepEqual(loadReceiptImages(directory), first);
    fs.writeFileSync(path.join(directory, 'qr.png'), PNG.sync.write(new PNG({ width: 3, height: 2 })));
    assert.notEqual(loadReceiptImages(directory).qr, first.qr);
    fs.writeFileSync(path.join(directory, 'logo.png'), 'invalid');
    assert.throws(() => loadReceiptImages(directory), /レシート画像 logo\.png を読み込めませんでした/);
    fs.writeFileSync(path.join(directory, 'logo.png'), png);
    fs.unlinkSync(path.join(directory, 'qr.png'));
    assert.throws(() => loadReceiptImages(directory), /レシート画像 qr\.png を読み込めませんでした/);
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
