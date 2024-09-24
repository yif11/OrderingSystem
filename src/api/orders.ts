const apiUrl = 'http://localhost:5000';  // サーバーのURL

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

export const addOrder = async (orderData: { items: { item: string; quantity: number }[], totalPrice: number, receivedAmount: number, change: number }) => {
    const response = await fetch(`${apiUrl}/add-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to add order');
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
