import React, { useState } from 'react';
import useSWR from 'swr';
import { fetchOrders, markItemAsServed } from './api/orders';

// 商品名を日本語に変換するためのマッピング
const itemNameJaMap: { [key: string]: string } = {
    hotCoffee: 'ホットコーヒー',
    icedCoffee: 'アイスコーヒー',
    hotTea: 'ホットティー',
    icedTea: 'アイスティー',
    pancake: 'パンケーキ',
    croissant: 'クロワッサン',
};

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

// SWRで注文データを取得
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
    if (error) return <div>注文の読み込み中にエラーが発生しました。</div>;
    if (!data || data.length === 0) return <div>注文はありません。</div>;

    const ordersToDisplay = localData || data;

    return (
        <div className="container mx-auto p-4 bg-white shadow-md rounded max-w-md lg:max-w-lg border border-black">
            <h2 className="text-3xl font-bold mb-4 text-center">提供待ち画面</h2>
            {ordersToDisplay.map((order) => (
                <div key={order.id} className="mb-4">
                    <h3 className="text-2xl font-semibold text-center">
                        注文番号 #{order.isTakeout ? `T${order.id}` : order.id}
                    </h3>
                    <table className="min-w-full border-collapse border border-gray-300">
                        <tbody>
                            {order.items.map((item, itemIndex) => (
                                <tr key={`${order.id}-${itemIndex}`} className="border-b border-gray-200">
                                    <td className="border border-gray-300 p-2">
                                        {/* 商品名を日本語で表示 */}
                                        {itemNameJaMap[item.item] || item.item}
                                    </td>
                                    <td className="border border-gray-300 p-2">{item.quantity}</td>
                                    <td className="border border-gray-300 p-2">
                                        <button
                                            onClick={() => handleServeItem(order.id, itemIndex)}
                                            className={`px-2 py-1 rounded ${item.served ? 'bg-gray-500' : 'bg-green-500'} text-white`}
                                            disabled={item.served}
                                        >
                                            {item.served ? '提供済み' : '提供する'}
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
