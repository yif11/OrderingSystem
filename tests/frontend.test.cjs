const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const itemNames = require('../shared/item-names.json');

test('cashier uses the requested drink menu, voucher denominations and individual serving items', async t => {
    const { createServer } = await import('vite');
    const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null } });
    t.after(() => server.close());
    const domain = await server.ssrLoadModule('/src/domain/orders.ts');
    assert.deepEqual(domain.productPrices, {
        hotCoffee: 200, icedCoffee: 200, icedTea: 200, appleJuice: 200, grapeJuice: 200, calpis: 200, gingerAle: 300
    });
    assert.deepEqual(domain.voucherDenominations, [50, 100, 200, 300, 500, 1000]);
    const quantities = { ...domain.emptyQuantities(), hotCoffee: 2, gingerAle: 1 };
    assert.equal(domain.calculateTotal(quantities), 700);
    assert.equal(domain.calculateVoucherAmount(domain.emptyVouchers()), 0);
    assert.equal(domain.calculateCashDue(700, domain.emptyVouchers()), 700);
    for (const denomination of domain.voucherDenominations) {
        const vouchers = { ...domain.emptyVouchers(), [denomination]: 2 };
        assert.equal(domain.calculateVoucherAmount(vouchers), denomination * 2);
        assert.equal(domain.calculateCashDue(700, vouchers), Math.max(0, 700 - denomination * 2));
    }
    const vouchers = { ...domain.emptyVouchers(), 50: 1, 100: 1, 200: 1 };
    assert.equal(domain.calculateVoucherAmount(vouchers), 350);
    assert.equal(domain.calculateCashDue(700, vouchers), 350);
    assert.equal(domain.calculateCashDue(700, { 200: 1, 500: 1 }), 0);
    assert.equal(domain.calculateCashDue(700, { 1000: 1 }), 0);
    const items = domain.buildOrderItems(quantities);
    assert.equal(items.length, 3);
    assert.equal(items.filter(item => item.item === 'hotCoffee').length, 2);
    assert.ok(items.every(item => item.quantity === 1 && item.served === false));
    assert.equal(domain.orderNumber({ id: 12, isTakeout: true }), 'T12');
    assert.equal(domain.orderNumber({ id: 12, isTakeout: false }), '12');

    const { default: OrderInput } = await server.ssrLoadModule('/src/components/OrderInput.tsx');
    const html = renderToStaticMarkup(React.createElement(OrderInput));
    for (const item of Object.keys(domain.productPrices)) assert.ok(html.includes(itemNames[item]), item);
    for (const item of Object.keys(itemNames).filter(item => !(item in domain.productPrices))) assert.ok(!html.includes(itemNames[item]), item);
    assert.ok(html.includes('テイクアウト'));
    assert.ok(!html.includes('どりーむきっず'));
    assert.ok(!html.includes('割引券'));
    for (const denomination of domain.voucherDenominations) assert.ok(html.includes(`${denomination}円商品券を増やす`));
    assert.ok(html.includes('商品券分のお釣りは出ません'));
    assert.ok(html.includes('現金でのお支払い'));
    assert.ok(html.includes('お預かり金額'));
    assert.ok(html.includes('注文を送信'));
});
