const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { emptyState, readJson } = require('./order-store.cjs');
const { validateState } = require('./order-domain.cjs');
const { OrderError } = require('./errors.cjs');
const itemNames = require('../shared/item-names.json');

const checksum = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');

function readBackup(file) {
    const backup = readJson(path.resolve(file));
    if (backup?.format !== 'OrderingSystemBackup' || backup.version !== 1 ||
        typeof backup.createdAt !== 'string' || !Number.isFinite(Date.parse(backup.createdAt))) {
        throw new OrderError('対応する形式のバックアップではありません。');
    }
    validateState(backup.data);
    if (backup.checksum !== checksum(backup.data)) throw new OrderError('バックアップのチェックサムが一致しません。');
    return backup;
}

function summarize(state) {
    const all = [...state.orders, ...state.servedOrders];
    return {
        pendingOrders: state.orders.length, servedOrders: state.servedOrders.length,
        items: all.reduce((total, order) => total + order.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0), 0),
        totalSales: all.reduce((total, order) => total + order.totalPrice, 0),
        maxOrderId: state.maxOrderId,
        nextOrderId: state.maxOrderId < Number.MAX_SAFE_INTEGER ? state.maxOrderId + 1 : null
    };
}

function createOrderMaintenance({ store, backupDir = process.env.ORDER_BACKUP_DIR || path.join(path.dirname(store.dataDir), 'order_backups') }) {
    backupDir = path.resolve(backupDir);

    function writeNewFile(file, content) {
        file = path.resolve(file);
        // Outputs must never replace live order files, including on a case-insensitive FS.
        const relative = path.relative(store.dataDir, file).toLowerCase();
        const reserved = ['orders.json', 'served-orders.json', 'max-order-id.txt', '.order-transaction.json', '.orders.lock'];
        if (reserved.some(name => relative === name || relative.startsWith(name + path.sep))) {
            throw new OrderError('出力先に稼働中の注文データを指定できません。');
        }
        fs.mkdirSync(path.dirname(file), { recursive: true });
        // Exclusive creation also prevents accidental overwrites of an existing backup/export.
        const handle = fs.openSync(file, 'wx');
        try {
            fs.writeFileSync(handle, content, 'utf8');
            fs.fsyncSync(handle);
        } catch (error) {
            fs.closeSync(handle);
            fs.unlinkSync(file);
            throw error;
        }
        fs.closeSync(handle);
        return file;
    }

    function saveBackup(state, file, reason = 'manual') {
        const createdAt = new Date().toISOString();
        const backup = { format: 'OrderingSystemBackup', version: 1, createdAt, reason, checksum: checksum(state), data: state };
        file ||= path.join(backupDir, `orders-${createdAt.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}.json`);
        return writeNewFile(file, JSON.stringify(backup, null, 2) + '\n');
    }

    return {
        backupDir,
        status: async () => ({ dataDir: store.dataDir, backupDir, ...summarize(await store.read()) }),
        backup: file => store.withState(state => ({ file: saveBackup(state, file), ...summarize(state) })),
        reset: ({ keepCounter = false } = {}) => store.withState((state, commit) => {
            const file = saveBackup(state, undefined, 'before-reset');
            const next = emptyState();
            if (keepCounter) next.maxOrderId = state.maxOrderId;
            commit(next);
            return { backup: file, ...summarize(next) };
        }),
        async restore(file) {
            // Fully validate before creating a data directory, backup, or mutating live data.
            const backup = readBackup(file);
            return store.withState((state, commit) => {
                const previous = saveBackup(state, undefined, 'before-restore');
                commit(backup.data);
                return { restoredFrom: path.resolve(file), backup: previous, ...summarize(backup.data) };
            });
        },
        async exportCsv(file) {
            const state = await store.read();
            // Defuse spreadsheet formulas in text supplied by historical/custom items.
            const cell = value => {
                let text = String(value ?? '');
                if (/^\s*[=+@-]/.test(text) && typeof value === 'string') text = `'${text}`;
                return `"${text.replace(/"/g, '""')}"`;
            };
            const rows = [['注文番号', '提供状態', '店内・持ち帰り', '注文時刻', '商品コード', '商品名', '数量', '単価', '商品金額', '注文合計', 'お預かり', 'お釣り']];
            for (const [status, orders] of [['未提供', state.orders], ['提供済み', state.servedOrders]]) {
                for (const order of orders) {
                    for (const item of order.items) {
                        rows.push([
                            `${order.isTakeout ? 'T' : ''}${order.id}`, item.served ? '提供済み' : status,
                            order.isTakeout ? 'テイクアウト' : '店内', order.createdAt || '', item.item,
                            itemNames[item.item] || item.item, item.quantity ?? 1, item.price,
                            item.price * (item.quantity ?? 1), order.totalPrice, order.receivedAmount, order.change
                        ]);
                    }
                }
            }
            file ||= path.join(backupDir, `orders-${Date.now()}-${randomUUID().slice(0, 8)}.csv`);
            return { file: writeNewFile(file, '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n') + '\r\n'), rows: rows.length - 1 };
        }
    };
}

module.exports = { createOrderMaintenance, readBackup, summarize };
