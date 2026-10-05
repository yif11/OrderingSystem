const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const lockfile = require('proper-lockfile');
const { OrderError } = require('./errors.cjs');
const { validateState } = require('./order-domain.cjs');

const defaultDataDir = () => path.resolve(process.env.ORDER_DATA_DIR || path.join(__dirname, '..', 'order_logs'));
const emptyState = () => ({ orders: [], servedOrders: [], maxOrderId: 0 });

function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
        throw new OrderError(`JSONを読み込めません: ${file} (${error.message})`, 500);
    }
}

function atomicWrite(file, content) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    let handle;
    try {
        handle = fs.openSync(temporary, 'wx');
        fs.writeFileSync(handle, content, 'utf8');
        fs.fsyncSync(handle);
        fs.closeSync(handle);
        handle = undefined;
        fs.renameSync(temporary, file);
    } finally {
        if (handle !== undefined) fs.closeSync(handle);
        if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
}

function createOrderStore({ dataDir = defaultDataDir() } = {}) {
    dataDir = path.resolve(dataDir);
    const files = {
        orders: path.join(dataDir, 'orders.json'),
        servedOrders: path.join(dataDir, 'served-orders.json'),
        maxOrderId: path.join(dataDir, 'max-order-id.txt'),
        transaction: path.join(dataDir, '.order-transaction.json')
    };

    const writeFiles = state => {
        atomicWrite(files.orders, JSON.stringify(state.orders));
        atomicWrite(files.servedOrders, JSON.stringify(state.servedOrders));
        atomicWrite(files.maxOrderId, String(state.maxOrderId));
    };
    const commit = state => {
        validateState(state);
        // Journal the complete snapshot before replacing the three legacy files.
        // A subsequent operation completes an interrupted transaction under lock.
        atomicWrite(files.transaction, JSON.stringify(state));
        writeFiles(state);
        fs.unlinkSync(files.transaction);
    };
    const readState = () => {
        if (fs.existsSync(files.transaction)) {
            const recovered = validateState(readJson(files.transaction));
            writeFiles(recovered);
            fs.unlinkSync(files.transaction);
        }
        const orders = fs.existsSync(files.orders) ? readJson(files.orders) : [];
        const servedOrders = fs.existsSync(files.servedOrders) ? readJson(files.servedOrders) : [];
        if (!Array.isArray(orders) || !Array.isArray(servedOrders)) throw new OrderError('保存された商品一覧が正しくありません。', 500);
        const rawCounter = fs.existsSync(files.maxOrderId) ? fs.readFileSync(files.maxOrderId, 'utf8').trim() : null;
        const maxOrderId = rawCounter === null
            ? [...orders, ...servedOrders].reduce((maximum, order) => Math.max(maximum, order?.id ?? NaN), 0)
            : /^\d+$/.test(rawCounter) ? Number(rawCounter) : NaN;
        const state = validateState({ orders, servedOrders, maxOrderId });
        if (![files.orders, files.servedOrders, files.maxOrderId].every(file => fs.existsSync(file))) commit(state);
        return state;
    };

    async function lockedState(action) {
        fs.mkdirSync(dataDir, { recursive: true });
        let release;
        try {
            release = await lockfile.lock(dataDir, {
                lockfilePath: path.join(dataDir, '.orders.lock'),
                stale: 10000, retries: { retries: 10, minTimeout: 20, maxTimeout: 200 }
            });
        } catch (error) {
            if (error.code === 'ELOCKED') throw new OrderError('別の注文処理・管理コマンドが実行中です。少し待って再実行してください。', 409);
            throw error;
        }
        try {
            return await action(readState(), commit);
        } finally {
            await release();
        }
    }

    // Avoid retry contention among requests in the same server process.
    let pending = Promise.resolve();
    function withState(action) {
        const operation = pending.then(() => lockedState(action));
        pending = operation.catch(() => {});
        return operation;
    }

    return { dataDir, withState, read: () => withState(state => state) };
}

module.exports = { createOrderStore, defaultDataDir, emptyState, readJson, atomicWrite };
