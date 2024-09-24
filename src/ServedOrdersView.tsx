import React from 'react';
import useSWR from 'swr';
import { fetchServedOrders } from './api/orders';
import { v4 as uuidv4 } from 'uuid';

// OrderItem型とOrder型を再利用
type OrderItem = {
    item: string;
    quantity: number;
    served: boolean;
};

type Order = {
    id: number;
    items: OrderItem[];
};

const fetcher = async (): Promise<Order[]> => await fetchServedOrders();

const ServedOrdersView: React.FC = () => {
    const { data, error } = useSWR<Order[]>('/served-orders', fetcher, {
        refreshInterval: 2000, // 2秒ごとに最新のデータを取得
    });

    if (error) return <div>Error loading served orders.</div>;
    if (!data || data.length === 0) return <div>No served orders yet.</div>;

    return (
        <div className="p-4 bg-white shadow-md rounded">
            <h2 className="text-2xl font-bold mb-4">Served Orders</h2>
            {data.map((order, orderIndex) => (
                <div key={order.id} className="mb-4">
                    <h3 className="text-xl font-semibold">Order #{orderIndex + 1}</h3>
                    {order.items.map((item) => (
                        <div key={uuidv4()} className="flex justify-between items-center">
                            <span>{item.item} - {item.quantity}</span>
                            {/* <span className="ml-4 px-2 py-1 rounded bg-blue-500 text-white">Served</span> */}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default ServedOrdersView;
