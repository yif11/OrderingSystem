const { OrderError } = require('./errors.cjs');
const { createOrder, validateOrderInput } = require('./order-domain.cjs');

function createOrderService({ store, printOrder }) {
    const printSavedOrder = async order => {
        try {
            return { status: 'queued', ...await printOrder(order) };
        } catch (error) {
            console.error(`注文 ${order.id} の印刷失敗: ${error.message}`);
            return { status: 'failed', error: error.message };
        }
    };
    return {
        listOrders: async () => (await store.read()).orders,
        listServedOrders: async () => (await store.read()).servedOrders,
        async addOrder(body) {
            validateOrderInput(body);
            const order = await store.withState((state, commit) => {
                if (state.maxOrderId === Number.MAX_SAFE_INTEGER) throw new OrderError('注文番号の上限に達しました。', 409);
                const order = createOrder(body, state.maxOrderId + 1);
                state.orders.push(order);
                state.maxOrderId = order.id;
                commit(state);
                return order;
            });
            // Release the data lock before printing so backup/read requests work
            // even while a printer is slow or disconnected.
            return { order, printing: await printSavedOrder(order) };
        },
        async reprintOrder(orderId) {
            const state = await store.read();
            const order = [...state.orders, ...state.servedOrders].find(order => order.id === orderId);
            if (!order) throw new OrderError('注文が見つかりません。', 404);
            return { order, printing: await printSavedOrder(order) };
        },
        async markServed(orderId, itemIndex) {
            return store.withState((state, commit) => {
                const order = state.orders.find(order => order.id === orderId);
                if (!order) throw new OrderError('Order not found', 404);
                if (!Number.isInteger(itemIndex) || !order.items[itemIndex]) throw new OrderError('Invalid item index');
                order.items[itemIndex].served = true;
                if (order.items.every(item => item.served)) {
                    state.servedOrders.push(order);
                    state.orders = state.orders.filter(order => order.id !== orderId);
                }
                commit(state);
            });
        }
    };
}

module.exports = { createOrderService };
