import React from 'react';
import useSWR from 'swr';
import { fetchServedOrders } from '../api/orders';
import { itemMapJa } from '../api/itemMap';

type OrderItem = {
    item: string;
    quantity: number;
    served: boolean;
};

type Order = {
    id: number;
    items: OrderItem[];
    isTakeout: boolean;
};

const fetcher = async (): Promise<Order[]> => await fetchServedOrders();

const ServedOrdersView: React.FC = () => {
    const { data, error } = useSWR<Order[]>('/served-orders', fetcher, {
        refreshInterval: 2000, // 2秒ごとに最新のデータを取得
    });

    if (error) return <div>Error loading served orders.</div>;
    if (!data || data.length === 0) return <div>No served orders yet.</div>;

    return (
        <div className="container mx-auto p-4 bg-white shadow-md rounded max-w-md lg:max-w-lg">
            <h2 className="text-3xl font-bold mb-4 text-center">提供済み注文画面</h2>
            {data.map((order) => (
                <div key={order.id} className="mb-4">
                    <h3 className="text-2xl font-semibold">Order #{order.isTakeout ? `T${order.id}` : order.id}</h3>
                    {order.items.map((item) => (
                        <div className="flex justify-between items-center">
                            <span>{itemMapJa[item.item]}</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );

};

export default ServedOrdersView;