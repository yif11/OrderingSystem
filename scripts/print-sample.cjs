const fs = require('node:fs');
const path = require('node:path');
const receiptline = require('receiptline');
const { buildDocuments, buildPrintData, createOrderPrinter } = require('../printing/order-printer.cjs');

// This sample never registers an order or changes the order counter.
const sample = {
    id: 0, isTakeout: true, createdAt: new Date().toISOString(),
    items: [
        { item: 'hotCoffee', price: 300, quantity: 2 },
        { item: 'plainCroffle', price: 400, quantity: 1 },
        { item: '印刷テスト（注文登録なし）', price: 0, quantity: 1 }
    ],
    totalPrice: 700, receivedAmount: 1000, change: 300
};

async function main() {
    if (process.argv.includes('--preview')) {
        const directory = path.join(__dirname, '..', 'print-preview');
        fs.mkdirSync(directory, { recursive: true });
        const { receipt, ticket } = buildDocuments(sample);
        for (const [name, document] of Object.entries({ receipt, ticket })) {
            fs.writeFileSync(path.join(directory, `${name}.svg`), receiptline.transform(document, {
                command: 'svg', cpl: 32, encoding: 'shiftjis', spacing: true
            }));
            fs.writeFileSync(path.join(directory, `${name}.txt`), receiptline.transform(document, {
                command: 'text', cpl: 32, encoding: 'shiftjis'
            }));
        }
        fs.writeFileSync(path.join(directory, 'test-receipt.prn'), buildPrintData(sample));
        console.log(`プレビューを保存しました: ${directory}`);
        return;
    }
    const result = await createOrderPrinter()(sample);
    console.log(`テスト用レシートと番号票 T0 を送信しました: ${result.printerName} / job ${result.jobId} / ${result.bytes} bytes`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
