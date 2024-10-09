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
        <div className="container mx-auto p-4 bg-white shadow-md rounded max-w-md lg:max-w-lg border border-black">
            <h2 className="text-3xl font-bold mb-4 text-center">Served Orders</h2>
            {data.map((order) => (
                <div key={order.id} className="mb-6">
                    {/* Order ID displayed as a title above the table */}
                    <h3 className="text-2xl font-semibold mb-2">
                        Order #{order.isTakeout ? `T${order.id}` : order.id}
                    </h3>
                    <table className="table-auto w-full border-collapse border border-gray-200">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-300 px-4 py-2">Item</th>
                                <th className="border border-gray-300 px-4 py-2">Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-4 py-2">{item.item}</td>
                                    <td className="border border-gray-300 px-4 py-2 text-center">{item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

export default ServedOrdersView;