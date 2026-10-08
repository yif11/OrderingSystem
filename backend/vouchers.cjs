const voucherDenominations = require('../shared/voucher-denominations.json');
const { OrderError } = require('./errors.cjs');

const voucherAmount = (vouchers = {}) => voucherDenominations.reduce((total, amount) => total + amount * (vouchers[amount] ?? 0), 0);
const cashDue = (totalPrice, vouchers) => Math.max(0, totalPrice - voucherAmount(vouchers));

function validateVouchers(vouchers = {}) {
    if (!vouchers || typeof vouchers !== 'object' || Array.isArray(vouchers) ||
        Object.entries(vouchers).some(([amount, count]) => !voucherDenominations.some(value => String(value) === amount) ||
            !Number.isSafeInteger(count) || count < 0) || !Number.isSafeInteger(voucherAmount(vouchers))) {
        throw new OrderError('商品券の額面・枚数が正しくありません。');
    }
}

module.exports = { voucherDenominations, voucherAmount, cashDue, validateVouchers };
