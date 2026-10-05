const express = require('express');
const cors = require('cors');
const { createOrderPrinter } = require('./printing/order-printer.cjs');
const { createOrderStore } = require('./backend/order-store.cjs');
const { createOrderService } = require('./backend/order-service.cjs');
const { OrderError } = require('./backend/errors.cjs');

const route = handler => (req, res, next) => Promise.resolve().then(() => handler(req, res)).catch(next);

function createApp({ dataDir, printOrder = createOrderPrinter(), store = createOrderStore({ dataDir }) } = {}) {
    const app = express();
    const router = express.Router();
    const orders = createOrderService({ store, printOrder });
    app.use(express.json());
    app.use(cors());

    router.get('/orders', route(async (req, res) => res.json(await orders.listOrders())));
    router.get('/served-orders', route(async (req, res) => res.json(await orders.listServedOrders())));
    router.post('/add-order', route(async (req, res) => res.status(201).json(await orders.addOrder(req.body))));
    router.post('/orders/:orderId/print', route(async (req, res) => {
        const result = await orders.reprintOrder(Number(req.params.orderId));
        res.status(result.printing.status === 'queued' ? 200 : 502).json(result);
    }));
    router.post('/mark-served', route(async (req, res) => {
        await orders.markServed(req.body?.orderId, req.body?.itemIndex);
        res.send('Order marked as served');
    }));

    app.use('/api', router);
    app.use(router);

    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        const status = error instanceof OrderError ? error.status : error.status === 400 ? 400 : 500;
        if (status === 500) console.error(error);
        res.status(status).json({ error: status === 500 ? '注文データを処理できませんでした。サーバーのログを確認してください。' : error.message });
    });
    return app;
}

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    createApp().listen(PORT, () => console.log('Server is running on port ' + PORT));
}

module.exports = { createApp };
