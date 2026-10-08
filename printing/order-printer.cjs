const receiptline = require('receiptline');
const { submitRaw } = require('./windows-printer.cjs');
const { loadReceiptImages } = require('./receipt-images.cjs');

const itemNames = require('../shared/item-names.json');
const { voucherDenominations, voucherAmount, cashDue } = require('../backend/vouchers.cjs');

// Center the 384-dot layout on this NEC's 420-dot (58 mm / 35-column) area.
// ReceiptLine margins use 12-dot character units: 1.5 characters = 18 dots.
const printLayout = { cpl: 32, margin: 1.5, marginRight: 1.5, encoding: 'shiftjis', spacing: true, gradient: false, gamma: 1 };

// Escape ReceiptLine's layout/decorations and reject embedded printer controls.
function escapeText(value) {
    return String(value).replace(/\p{Cc}/gu, ' ')
        .replace(/\\/g, '\\\\').replace(/[|{}_~^`"=-]/g, '\\$&');
}

function buildDocuments(order) {
    const images = loadReceiptImages();
    const orderNumber = `${order.isTakeout ? 'T' : ''}${order.id}`;
    const groups = new Map();
    for (const item of order.items) {
        const key = JSON.stringify([item.item, item.price]);
        const group = groups.get(key) || { ...item, quantity: 0 };
        group.quantity += item.quantity ?? 1;
        groups.set(key, group);
    }
    const subtotal = [...groups.values()].reduce((total, item) => total + item.price * item.quantity, 0);
    const vouchers = voucherAmount(order.vouchers);
    const yen = (amount) => `￥${amount.toLocaleString('ja-JP')}`;
    const receipt = [
        '{border:none}', `{image:${images.logo}}`, ` 注文番号 ${orderNumber} `,
        ` ${order.isTakeout ? 'テイクアウト' : '店内'} `,
        ...(order.createdAt ? [` ${new Date(order.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} `] : []),
        '--------------------------------', '{width:*,10}',
        ...[...groups.values()].flatMap(item => [
            `${escapeText(itemNames[item.item] || item.item)} |`,
            `  ${item.quantity}点 × ${yen(item.price)} | ${yen(item.price * item.quantity)}`
        ]),
        '--------------------------------',
        ...(subtotal > order.totalPrice ? [`小計 | ${yen(subtotal)}`, `割引 | -${yen(subtotal - order.totalPrice)}`] : []),
        `合計 | ${yen(order.totalPrice)}`,
        ...(vouchers > 0 ? [
            ...voucherDenominations.filter(amount => order.vouchers[amount] > 0).map(amount =>
                `商品券 ${yen(amount)} × ${order.vouchers[amount]}枚 | ${yen(amount * order.vouchers[amount])}`),
            `商品券合計 | ${yen(vouchers)}`,
            ...(vouchers > order.totalPrice ? [`商品券超過分 | ${yen(vouchers - order.totalPrice)}`, ' 商品券分の釣銭なし '] : []),
            `現金でのお支払い | ${yen(cashDue(order.totalPrice, order.vouchers))}`
        ] : []),
        `${order.vouchers !== undefined ? 'お預かり（現金）' : 'お預かり'} | ${yen(order.receivedAmount)}`,
        `お釣り | ${yen(order.change)}`, '{width:*}',
        ' ありがとうございました ', '', `{image:${images.qr}}`
    ].join('\n');
    const ticket = [
        '{border:none}', ' 注文番号 ',
        // Fit even a long persisted order ID on 58 mm paper.
        ` ${'^'.repeat(orderNumber.length <= 8 ? 4 : 2)}${orderNumber} `,
        ` ${order.isTakeout ? 'テイクアウト' : '店内'} `,
        ' 商品のお受け取りまで ',
        ...(order.isTakeout ? [' この番号票をお持ちください '] : [' 注文番号をクリップに ', ' はさんでおいてください '])
    ].join('\n');
    return { receipt, ticket, orderNumber };
}

function buildPrintData(order) {
    const documents = buildDocuments(order);
    const generic = receiptline.commands.generic;
    const command = {
        ...generic,
        open(printer) {
            // NEC's tested RAW sample explicitly selects the printer (ESC = 1).
            return generic.open.call(this, printer).replace('\x1b@', '\x1b@\x1b=\x01');
        },
        hr(width) { return '-'.repeat(width); },
        // Do not request USB status; leave three lines before each partial cut.
        close() { return '\n\n\n\x1dVB\x00'; }
    };
    const configuration = { ...printLayout, command };
    return Buffer.from(
        receiptline.transform(documents.receipt, configuration) +
        receiptline.transform(documents.ticket, configuration), 'latin1'
    );
}

function renderPreview(document, format = 'svg') {
    let command = format;
    if (format === 'svg') {
        const svg = receiptline.commands.svg;
        command = {
            ...svg,
            open(printer) {
                const result = svg.open.call(this, printer);
                this.previewMargin = printer.margin;
                this.svgWidth += (printer.margin + printer.marginRight) * this.charWidth;
                return result;
            },
            area(left, width, right) {
                // The built-in SVG command does not apply printer margins.
                return svg.area.call(this, left + this.previewMargin, width, right);
            }
        };
    }
    return receiptline.transform(document, { ...printLayout, command });
}

function createOrderPrinter({ printerName = process.env.PRINTER_NAME || 'NEC MultiCoder 300S2DC', send = submitRaw } = {}) {
    let pending = Promise.resolve();
    return (order) => {
        const data = buildPrintData(order);
        const documentName = `注文 ${order.isTakeout ? 'T' : ''}${order.id} レシート・番号票`;
        const job = pending.then(() => send(data, printerName, documentName));
        // A failed job must not prevent subsequent orders from printing.
        pending = job.catch(() => {});
        return job;
    };
}

module.exports = { buildDocuments, buildPrintData, renderPreview, createOrderPrinter };
