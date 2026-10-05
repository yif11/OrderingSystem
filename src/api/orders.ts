const apiUrl = 'http://localhost:5000';  // サーバーのURL
// const apiUrl = 'http://192.168.64.72:5000';

export const fetchOrders = async () => {
    const response = await fetch(`${apiUrl}/orders`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    return await response.json();
};

export const fetchServedOrders = async () => {
    const response = await fetch(`${apiUrl}/served-orders`);
    if (!response.ok) throw new Error('Failed to fetch served orders');
    return await response.json();
};

type OrderData = {
    items: { item: string; price: number; quantity?: number }[];
    totalPrice: number;
    receivedAmount: number;
    change: number;
    isTakeout: boolean;
};

export type OrderPrintResult = {
    order: OrderData & { id: number };
    printing: { status: 'queued' | 'failed'; error?: string; jobId?: number };
};

export const addOrder = async (orderData: OrderData): Promise<OrderPrintResult> => {
    const response = await fetch(`${apiUrl}/add-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '注文を登録できませんでした。');
    return result;
};

export const reprintOrder = async (orderId: number): Promise<OrderPrintResult> => {
    const response = await fetch(`${apiUrl}/orders/${orderId}/print`, { method: 'POST' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.printing?.error || result.error || '再印刷できませんでした。');
    return result;
};

export const markItemAsServed = async (orderId: number, itemIndex: number) => {
    const response = await fetch(`${apiUrl}/mark-served`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, itemIndex }),
    });
    if (!response.ok) throw new Error('Failed to mark item as served');
};
