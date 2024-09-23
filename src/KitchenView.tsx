import React, { useState } from 'react';
import useSWR from 'swr';
import { fetchOrders, markItemAsServed } from './api/orders';
import { v4 as uuidv4 } from 'uuid';

const fetcher = async () => await fetchOrders();

const KitchenView: React.FC = () => {
    const { data, error, mutate } = useSWR('/orders', fetcher, {
        refreshInterval: 2000, // 2秒ごとにポーリング
    });

    const [servingOrders, setServingOrders] = useState<{ [key: number]: boolean }>({});

    const handleServeItem = async (orderId: number, itemIndex: number) => {
        if (!data) return;

        const order = data.find((o) => o.id === orderId);
        if (!order) return;

        // アイテムの提供状態をトグル
        const itemServed = !order.items[itemIndex].served;
        order.items[itemIndex].served = itemServed;

        // 更新された状態を保存
        setServingOrders(prev => ({
            ...prev,
            [orderId]: itemServed,
        }));

        // 提供済みアイテムのカウント
        const allServed = order.items.every(item => item.served);
        if (allServed) {
            await saveOrderToServer(order); // 注文をサーバーに送信
            await markItemAsServed(orderId, itemIndex); // 注文を削除
        }

        mutate(); // データを再取得して画面を更新
    };

    const saveOrderToServer = async (order: any) => {
        const response = await fetch('http://localhost:5000/save-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: order.items,
            }),
        });

        if (!response.ok) {
            console.error('Failed to save order to server');
        } else {
            console.log('Order saved to server');
        }
    };

    if (!data || data.length === 0) return <div>No orders yet.</div>;

    return (
        <div className="p-4 bg-white shadow-md rounded">
            <h2 className="text-2xl font-bold mb-4">Orders for Kitchen</h2>
            {data.map((order, orderIndex) => (
                <div key={order.id} className="mb-4">
                    <h3 className="text-xl font-semibold">Order #{orderIndex + 1}</h3>
                    {order.items.map((item, itemIndex) => (
                        <div key={uuidv4()} className="flex justify-between items-center">
                            <span>{item.item} - {item.quantity}</span>
                            <button
                                onClick={() => handleServeItem(order.id, itemIndex)}
                                className={`ml-4 px-2 py-1 rounded ${item.served ? 'bg-gray-500' : 'bg-green-500'} text-white`}
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
