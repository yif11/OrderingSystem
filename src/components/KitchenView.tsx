import React, { useState } from 'react';
import useSWR from 'swr';
import { fetchOrders, markItemAsServed } from '../api/orders';
import { itemMapJa } from '../api/itemMap';

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

        if (localData) {
            const updatedOrders = localData.map((order) => {
                if (order.id === orderId) {
                    return {
                        ...order,
                        items: order.items.map((item, index) =>
                            index === itemIndex ? { ...item, served: true } : item
                        ),
                    };
                }
                return order;
            });
            setLocalData(updatedOrders);
        }

        mutate();
    };

    // ローカルデータの更新がない場合は、SWRから取得したデータを使う
    if (error) return <div>Error loading orders.</div>;
    if (!data || data.length === 0) return <div>No orders yet.</div>;

    const ordersToDisplay = localData || data;

    return (
        <div className="container mx-auto p-4 bg-white shadow-md rounded max-w-md lg:max-w-lg">
            <h2 className="text-3xl font-bold mb-4 text-center">提供画面</h2>
            {ordersToDisplay.map((order) => (
                <div key={order.id} className="mb-4">
                    <h3 className="text-2xl font-semibold">Order #{order.isTakeout ? `T${order.id}` : order.id}</h3>
                    {order.items.map((item, itemIndex) => (
                        <div className="flex justify-between items-center">
                            <span>{itemMapJa[item.item]}</span>
                            <button
                                onClick={() => handleServeItem(order.id, itemIndex)}
                                className={`ml-4 mb-2 px-2 py-1 rounded ${item.served ? 'bg-gray-500' : 'bg-green-500'} text-white`}
                                disabled={item.served}
                            >
                                {item.served ? 'Served' : '提供しました'}
                            </button>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default KitchenView;