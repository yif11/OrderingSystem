const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const itemNames = require('../shared/item-names.json');

test('cashier calculations, individual serving items and the full menu survive the refactor', async t => {
    const { createServer } = await import('vite');
    const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null } });
    t.after(() => server.close());
    const domain = await server.ssrLoadModule('/src/domain/orders.ts');
    const quantities = { ...domain.emptyQuantities(), hotCoffee: 2, plainCroffle: 1 };
    assert.equal(domain.calculateTotal(quantities, 0), 1000);
    assert.equal(domain.calculateTotal(quantities, 1), 700);
    assert.equal(domain.calculateTotal(quantities, 10), 0);
    const items = domain.buildOrderItems(quantities);
    assert.equal(items.length, 3);
    assert.equal(items.filter(item => item.item === 'hotCoffee').length, 2);
    assert.ok(items.every(item => item.quantity === 1 && item.served === false));
    assert.equal(domain.orderNumber({ id: 12, isTakeout: true }), 'T12');
    assert.equal(domain.orderNumber({ id: 12, isTakeout: false }), '12');

    const { default: OrderInput } = await server.ssrLoadModule('/src/components/OrderInput.tsx');
    const html = renderToStaticMarkup(React.createElement(OrderInput));
    for (const name of Object.values(itemNames)) assert.ok(html.includes(name), name);
    assert.ok(html.includes('テイクアウト'));
    assert.ok(html.includes('どりーむきっず用割引券'));
    assert.ok(html.includes('お預かり金額'));
    assert.ok(html.includes('注文を送信'));
});
