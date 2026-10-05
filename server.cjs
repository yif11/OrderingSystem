const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const cors = require('cors');
const { createOrderPrinter } = require('./printing/order-printer.cjs');

function validateOrder(body) {
    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
        return '商品を選択してください。';
    }
    for (const item of body.items) {
        if (!item || typeof item.item !== 'string' || !item.item.trim() ||
            !Number.isSafeInteger(item.price) || item.price < 0 ||
            (item.quantity !== undefined && (!Number.isSafeInteger(item.quantity) || item.quantity <= 0))) {
            return '商品名・価格・数量が正しくありません。';
        }
    }
    if (![body.totalPrice, body.receivedAmount, body.change].every(value => Number.isSafeInteger(value) && value >= 0) ||
        body.receivedAmount - body.totalPrice !== body.change) {
        return '合計・お預かり・お釣りの金額を確認してください。';
    }
    const subtotal = body.items.reduce((total, item) => total + item.price * (item.quantity ?? 1), 0);
    if (!Number.isSafeInteger(subtotal) || body.totalPrice > subtotal ||
        (body.isTakeout !== undefined && typeof body.isTakeout !== 'boolean')) {
        return '注文内容が正しくありません。';
    }
    return null;
}

function createApp({ dataDir = path.join(__dirname, 'order_logs'), printOrder = createOrderPrinter() } = {}) {
    const app = express();
    app.use(express.json());
    app.use(cors());

    fs.mkdirSync(dataDir, { recursive: true });
    const ordersFilePath = path.join(dataDir, 'orders.json');
    const servedOrdersFilePath = path.join(dataDir, 'served-orders.json');
    const maxOrderIdPath = path.join(dataDir, 'max-order-id.txt');
    for (const file of [ordersFilePath, servedOrdersFilePath]) {
        if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8');
    }
    if (!fs.existsSync(maxOrderIdPath)) fs.writeFileSync(maxOrderIdPath, '0', 'utf8');

    const readOrders = () => JSON.parse(fs.readFileSync(ordersFilePath, 'utf8'));
    const readServedOrders = () => JSON.parse(fs.readFileSync(servedOrdersFilePath, 'utf8'));
    const writeOrders = orders => fs.writeFileSync(ordersFilePath, JSON.stringify(orders), 'utf8');
    const writeServedOrders = orders => fs.writeFileSync(servedOrdersFilePath, JSON.stringify(orders), 'utf8');

    // A saved order returns 201 even if printing failed, preventing duplicate orders.
    const printSavedOrder = async (order) => {
        try {
            return { status: 'queued', ...await printOrder(order) };
        } catch (error) {
            console.error('注文 ' + order.id + ' の印刷失敗: ' + error.message);
            return { status: 'failed', error: error.message };
        }
    };

    app.get('/orders', (req, res) => res.json(readOrders()));
    app.get('/served-orders', (req, res) => res.json(readServedOrders()));

    app.post('/add-order', async (req, res, next) => {
        try {
            const validationError = validateOrder(req.body);
            if (validationError) return res.status(400).json({ error: validationError });

            const { items, totalPrice, receivedAmount, change, isTakeout = false } = req.body;
            const orders = readOrders();
            const maxOrderId = Number(fs.readFileSync(maxOrderIdPath, 'utf8').trim());
            if (!Number.isSafeInteger(maxOrderId) || maxOrderId < 0 || maxOrderId >= Number.MAX_SAFE_INTEGER) {
                throw new Error('保存された注文番号が正しくありません。');
            }
            const newOrder = {
                id: maxOrderId + 1,
                items: items.map(item => ({
                    item: item.item, quantity: item.quantity ?? 1, price: item.price, served: false
                })),
                totalPrice, receivedAmount, change, isTakeout,
                createdAt: new Date().toISOString()
            };

            // Reserve the number before saving so a write failure cannot reuse it.
            fs.writeFileSync(maxOrderIdPath, String(newOrder.id), 'utf8');
            orders.push(newOrder);
            writeOrders(orders);
            const printing = await printSavedOrder(newOrder);
            return res.status(201).json({ order: newOrder, printing });
        } catch (error) {
            next(error);
        }
    });

    app.post('/orders/:orderId/print', async (req, res, next) => {
        try {
            const orderId = Number(req.params.orderId);
            const order = [...readOrders(), ...readServedOrders()].find(order => order.id === orderId);
            if (!order) return res.status(404).json({ error: '注文が見つかりません。' });
            const printing = await printSavedOrder(order);
            return res.status(printing.status === 'queued' ? 200 : 502).json({ order, printing });
        } catch (error) {
            next(error);
        }
    });

    app.post('/mark-served', (req, res) => {
        const { orderId, itemIndex } = req.body;
        let orders = readOrders();
        const servedOrders = readServedOrders();
        const order = orders.find(order => order.id === orderId);
        if (!order) return res.status(404).send('Order not found');
        if (!Number.isInteger(itemIndex) || !order.items[itemIndex]) {
            return res.status(400).send('Invalid item index');
        }
        order.items[itemIndex].served = true;
        if (order.items.every(item => item.served)) {
            servedOrders.push(order);
            orders = orders.filter(order => order.id !== orderId);
        }
        writeOrders(orders);
        writeServedOrders(servedOrders);
        return res.send('Order marked as served');
    });

    return app;
}

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    createApp().listen(PORT, () => console.log('Server is running on port ' + PORT));
}

module.exports = { createApp };
