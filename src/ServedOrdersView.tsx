import React from 'react';
import useSWR from 'swr';
import { fetchServedOrders } from './api/orders';
import { v4 as uuidv4 } from 'uuid';

const fetcher = async () => await fetchServedOrders();

const ServedOrdersView: React.FC = () => {
    const { data, error } = useSWR('/served-orders', fetcher, {
        refreshInterval: 1000, // 1秒ごとにポーリング
    });

    if (!data || data.length === 0) return <div>No served orders yet.</div>;

    return (
        <div className="p-4 bg-white shadow-md rounded">
            <h2 className="text-2xl font-bold mb-4">Served Orders</h2>
            {data.map((order, orderIndex) => (
                <div key={uuidv4()} className="mb-4">
                    <h3 className="text-xl font-semibold">Served Order #{orderIndex + 1}</h3>
                    {order.items.map((item) => (
                        <div key={uuidv4()}>
                            <span>{item.item} - {item.quantity}</span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default ServedOrdersView;
