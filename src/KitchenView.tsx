import React, { useState } from 'react';
import useSWR from 'swr';
import { fetchOrders, markItemAsServed } from './api/orders';
import { v4 as uuidv4 } from 'uuid';

// OrderItem型を定義
type OrderItem = {
    item: string;
    quantity: number;
    served: boolean;
};

// Order型を定義
type Order = {
    id: number;
    items: OrderItem[];
    isTakeout: boolean;
};

const fetcher = async (): Promise<Order[]> => await fetchOrders();

const KitchenView: React.FC = () => {
    const { data, error, mutate } = useSWR<Order[]>('/orders', fetcher, {
        refreshInterval: 2000,
    });

    const [localData, setLocalData] = useState<Order[] | undefined>(data);

    // 注文が提供済みになった場合の処理
    const handleServeItem = async (orderId: number, itemIndex: number) => {
        await markItemAsServed(orderId, itemIndex);

        // ローカルデータを即座に更新してUIを変更
        if (localData) {
            const updatedOrders = localData.map((order) => {
                if (order.id === orderId) {
                    return {
                        ...order,
                        items: order.items.map((item, index) => {
                            if (index === itemIndex) {
                                return { ...item, served: true };
                            }
                            return item;
                        }),
                    };
                }
                return order;
            });
            setLocalData(updatedOrders);
        }

        // mutateを使用してSWRのキャッシュを更新し、最新のサーバーデータも取得
        mutate();
    };

    // ローカルデータの更新がない場合は、SWRから取得したデータを使う
    if (error) return <div>Error loading orders.</div>;
    if (!data || data.length === 0) return <div>No orders yet.</div>;

    const ordersToDisplay = localData || data;

    return (
        <div className="container mx-auto p-4 bg-white shadow-md rounded max-w-md lg:max-w-lg border border-black">
            <h2 className="text-3xl font-bold mb-4 text-center">Orders for Kitchen</h2>
            {ordersToDisplay.map((order) => (
                <div key={order.id} className="mb-4">
                    <h3 className="text-2xl font-semibold text-center">Order #{order.isTakeout ? `T${order.id}` : order.id}</h3>
                    <table className="min-w-full border-collapse border border-gray-300">
                        <thead>
                            <tr>
                                <th className="border border-gray-300 p-2">Item</th>
                                <th className="border border-gray-300 p-2">Quantity</th>
                                <th className="border border-gray-300 p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, itemIndex) => (
                                <tr key={`${order.id}-${itemIndex}`} className="border-b border-gray-200">
                                    <td className="border border-gray-300 p-2">{item.item}</td>
                                    <td className="border border-gray-300 p-2">{item.quantity}</td>
                                    <td className="border border-gray-300 p-2">
                                        <button
                                            onClick={() => handleServeItem(order.id, itemIndex)}
                                            className={`px-2 py-1 rounded ${item.served ? 'bg-gray-500' : 'bg-green-500'} text-white`}
                                            disabled={item.served}
                                        >
                                            {item.served ? 'Served' : 'Mark as Served'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

export default KitchenView;
