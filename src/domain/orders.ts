import productPrices from '../../shared/product-prices.json';

export { productPrices };
export type ProductId = keyof typeof productPrices;
export type Quantities = Record<ProductId, number>;
export const DISCOUNT_PER_COUPON = 300;
export const menuGroups: { title: string; items: ProductId[] }[] = [
    { title: 'Coffee', items: ['hotCoffee', 'icedCoffee', 'cafeAuLait'] },
    { title: 'Tea', items: ['hotTea', 'icedTea', 'orangeJuice', 'appleJuice', 'calpis', 'greenTea'] },
    { title: 'Food', items: ['chocolateCroffle', 'mapleCroffle', 'greenTeaCroffle', 'strawberryCroffle', 'plainCroffle'] },
];

export type OrderItem = { item: string; price: number; quantity?: number; served?: boolean };
export type OrderData = {
    items: OrderItem[];
    totalPrice: number;
    receivedAmount: number;
    change: number;
    isTakeout: boolean;
};
export type Order = OrderData & { id: number; createdAt?: string };
export type OrderPrintResult = {
    order: Order;
    printing: { status: 'queued' | 'failed'; error?: string; jobId?: number };
};

export const orderNumber = (order: Pick<Order, 'id' | 'isTakeout'>) => `${order.isTakeout ? 'T' : ''}${order.id}`;
export const emptyQuantities = (): Quantities => Object.fromEntries(Object.keys(productPrices).map(item => [item, 0])) as Quantities;
export const calculateTotal = (quantities: Quantities, coupons: number) => Math.max(0,
    Object.entries(quantities).reduce((total, [item, quantity]) => total + productPrices[item as ProductId] * quantity, 0) - coupons * DISCOUNT_PER_COUPON);

// Keep individual items in the stored order so the kitchen can serve them one at a time.
export const buildOrderItems = (quantities: Quantities): OrderItem[] => Object.entries(quantities)
    .flatMap(([item, quantity]) => Array.from({ length: quantity }, () => ({ item, price: productPrices[item as ProductId], quantity: 1, served: false })));
