const { OrderError } = require('./errors.cjs');

const isMoney = value => Number.isSafeInteger(value) && value >= 0;

function validateItems(items) {
    if (!Array.isArray(items)) throw new OrderError('商品一覧が正しくありません。');
    for (const item of items) {
        if (!item || typeof item.item !== 'string' || !item.item.trim() || !isMoney(item.price) ||
            (item.quantity !== undefined && (!Number.isSafeInteger(item.quantity) || item.quantity <= 0)) ||
            (item.served !== undefined && typeof item.served !== 'boolean')) {
            throw new OrderError('商品名・価格・数量が正しくありません。');
        }
    }
}

function validateOrderInput(body) {
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
        throw new OrderError('商品を選択してください。');
    }
    validateItems(body.items);
    if (![body.totalPrice, body.receivedAmount, body.change].every(isMoney) ||
        body.receivedAmount - body.totalPrice !== body.change) {
        throw new OrderError('合計・お預かり・お釣りの金額を確認してください。');
    }
    const subtotal = body.items.reduce((total, item) => total + item.price * (item.quantity ?? 1), 0);
    if (!Number.isSafeInteger(subtotal) || body.totalPrice > subtotal ||
        (body.isTakeout !== undefined && typeof body.isTakeout !== 'boolean')) {
        throw new OrderError('注文内容が正しくありません。');
    }
}

function createOrder(body, id) {
    validateOrderInput(body);
    return {
        id,
        items: body.items.map(item => ({ item: item.item, quantity: item.quantity ?? 1, price: item.price, served: false })),
        totalPrice: body.totalPrice, receivedAmount: body.receivedAmount, change: body.change,
        isTakeout: body.isTakeout ?? false, createdAt: new Date().toISOString()
    };
}

function validateState(state) {
    if (!state || !Array.isArray(state.orders) || !Array.isArray(state.servedOrders) || !isMoney(state.maxOrderId)) {
        throw new OrderError('注文データまたは連番が正しくありません。');
    }
    const ids = new Set();
    for (const order of [...state.orders, ...state.servedOrders]) {
        if (!order || !Number.isSafeInteger(order.id) || order.id <= 0 || order.id > state.maxOrderId || ids.has(order.id)) {
            throw new OrderError('注文番号が重複しているか、保存された連番と一致しません。');
        }
        ids.add(order.id);
        validateItems(order.items);
        // Older data may omit quantities, served flags and timestamps, or contain
        // negative change. Preserve those records during backup and restoration.
        if (![order.totalPrice, order.receivedAmount].every(isMoney) || !Number.isSafeInteger(order.change) ||
            (order.isTakeout !== undefined && typeof order.isTakeout !== 'boolean')) {
            throw new OrderError('保存された注文の金額・持ち帰り区分が正しくありません。');
        }
    }
    return state;
}

module.exports = { createOrder, validateOrderInput, validateState };
