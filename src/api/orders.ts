// let orders: { id: number; items: { item: string; quantity: number; served: boolean }[] }[] = [];
// let servedOrders: { id: number; items: { item: string; quantity: number; served: boolean }[] }[] = [];

// export const fetchOrders = () => {
//     return new Promise<{ id: number; items: { item: string; quantity: number; served: boolean }[] }[]>(resolve => {
//         setTimeout(() => resolve([...orders]), 500); // 現在の注文リストを返す
//     });
// };

// export const fetchServedOrders = () => {
//     return new Promise<{ id: number; items: { item: string; quantity: number; served: boolean }[] }[]>(resolve => {
//         setTimeout(() => resolve([...servedOrders]), 500); // 提供済みの注文リストを返す
//     });
// };

// export const addOrder = (items: { item: string; quantity: number }[]) => {
//     return new Promise<void>((resolve) => {
//         const id = orders.length ? orders[orders.length - 1].id + 1 : 1;
//         const newItems = items.map(item => ({ ...item, served: false }));
//         orders.push({ id, items: newItems });
//         setTimeout(() => resolve(), 500);
//     });
// };

// export const markItemAsServed = (orderId: number, itemIndex: number) => {
//     return new Promise<void>((resolve) => {
//         const order = orders.find(o => o.id === orderId);
//         if (order) {
//             order.items[itemIndex].served = true;
//             // すべてのアイテムが提供済みなら、提供済みリストに移動
//             if (order.items.every(item => item.served)) {
//                 servedOrders.push(order);
//                 orders = orders.filter(o => o.id !== orderId); // 元のリストから削除
//             }
//         }
//         setTimeout(() => resolve(), 500);
//     });
// };

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

export const addOrder = async (items: { item: string; quantity: number }[]) => {
    const response = await fetch(`${apiUrl}/add-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
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
