let orders: { id: number; items: { item: string; quantity: number; served: boolean }[] }[] = [];
let servedOrders: { id: number; items: { item: string; quantity: number; served: boolean }[] }[] = [];

export const fetchOrders = () => {
    return new Promise<{ id: number; items: { item: string; quantity: number; served: boolean }[] }[]>(resolve => {
        setTimeout(() => resolve([...orders]), 500); // 現在の注文リストを返す
    });
};

export const fetchServedOrders = () => {
    return new Promise<{ id: number; items: { item: string; quantity: number; served: boolean }[] }[]>(resolve => {
        setTimeout(() => resolve([...servedOrders]), 500); // 提供済みの注文リストを返す
    });
};

export const addOrder = (items: { item: string; quantity: number }[]) => {
    return new Promise<void>((resolve) => {
        const id = orders.length ? orders[orders.length - 1].id + 1 : 1;
        const newItems = items.map(item => ({ ...item, served: false }));
        orders.push({ id, items: newItems });
        setTimeout(() => resolve(), 500);
    });
};

export const markItemAsServed = (orderId: number, itemIndex: number) => {
    return new Promise<void>((resolve) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            order.items[itemIndex].served = true;
            // すべてのアイテムが提供済みなら、提供済みリストに移動
            if (order.items.every(item => item.served)) {
                servedOrders.push(order);
                orders = orders.filter(o => o.id !== orderId); // 元のリストから削除
            }
        }
        setTimeout(() => resolve(), 500);
    });
};
