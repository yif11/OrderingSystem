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
        <div className="p-4 bg-white shadow-md rounded">
            <h2 className="text-2xl font-bold mb-4">Orders for Kitchen</h2>
            {ordersToDisplay.map((order) => (
                <div key={order.id} className="mb-4">
                    {/* 注文番号として order.id を使用 */}
                    <h3 className="text-xl font-semibold">Order #{order.isTakeout ? `T${order.id}` : order.id}</h3>
                    {order.items.map((item, itemIndex) => (
                        <div key={uuidv4()} className="flex justify-between items-center">
                            <span>{item.item} - {item.quantity}</span>
                            <button
                                onClick={() => handleServeItem(order.id, itemIndex)}
                                className={`ml-4 px-2 py-1 rounded ${item.served ? 'bg-gray-500' : 'bg-green-500'} text-white`}
                                disabled={item.served}
                            >
                                {item.served ? 'Served' : 'Mark as Served'}
                            </button>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default KitchenView;
