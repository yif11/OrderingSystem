import productPrices from '../../shared/product-prices.json';
import voucherDenominations from '../../shared/voucher-denominations.json';

export { productPrices, voucherDenominations };
export type ProductId = keyof typeof productPrices;
export type Quantities = Record<ProductId, number>;
export type VoucherCounts = Record<number, number>;
export const menuItems = Object.keys(productPrices) as ProductId[];

export type OrderItem = { item: string; price: number; quantity?: number; served?: boolean };
export type OrderData = {
    items: OrderItem[];
    totalPrice: number;
    receivedAmount: number;
    change: number;
    isTakeout: boolean;
    vouchers?: VoucherCounts;
};
export type Order = OrderData & { id: number; createdAt?: string };
export type OrderPrintResult = {
    order: Order;
    printing: { status: 'queued' | 'failed'; error?: string; jobId?: number };
};

export const orderNumber = (order: Pick<Order, 'id' | 'isTakeout'>) => `${order.isTakeout ? 'T' : ''}${order.id}`;
export const emptyQuantities = (): Quantities => Object.fromEntries(Object.keys(productPrices).map(item => [item, 0])) as Quantities;
export const calculateTotal = (quantities: Quantities) =>
    Object.entries(quantities).reduce((total, [item, quantity]) => total + productPrices[item as ProductId] * quantity, 0);
export const emptyVouchers = (): VoucherCounts => Object.fromEntries(voucherDenominations.map(amount => [amount, 0]));
export const calculateVoucherAmount = (vouchers: VoucherCounts) =>
    voucherDenominations.reduce((total, amount) => total + amount * (vouchers[amount] ?? 0), 0);
export const calculateCashDue = (totalPrice: number, vouchers: VoucherCounts) => Math.max(0, totalPrice - calculateVoucherAmount(vouchers));

// Keep individual items in the stored order so the kitchen can serve them one at a time.
export const buildOrderItems = (quantities: Quantities): OrderItem[] => Object.entries(quantities)
    .flatMap(([item, quantity]) => Array.from({ length: quantity }, () => ({ item, price: productPrices[item as ProductId], quantity: 1, served: false })));
