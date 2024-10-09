import React from 'react';
import useSWR from 'swr';
import { fetchServedOrders } from './api/orders';
import { v4 as uuidv4 } from 'uuid';

type OrderItem = {
    item: string; // 英語の商品名を使用
    quantity: number;
    served: boolean;
};

type Order = {
    id: number;
    items: OrderItem[];
    isTakeout: boolean;
};

// 日本語の商品名マッピング
const productNamesJa: Record<string, string> = {
    hotCoffee: "ホットコーヒー",
    icedCoffee: "アイスコーヒー",
    hotTea: "ホットティー",
    icedTea: "アイスティー",
    pancake: "パンケーキ",
    croissant: "クロワッサン",
};

const fetcher = async (): Promise<Order[]> => await fetchServedOrders();

const ServedOrdersView: React.FC = () => {
    const { data, error } = useSWR<Order[]>('/served-orders', fetcher, {
        refreshInterval: 2000, // 2秒ごとに最新のデータを取得
    });

    if (error) return <div>送信された注文の読み込みエラー。</div>;
    if (!data || data.length === 0) return <div>提供された注文はまだない。</div>;

    return (
        <div className="container mx-auto p-4 bg-white shadow-md rounded max-w-md lg:max-w-lg border border-black">
            <h2 className="text-3xl font-bold mb-4 text-center">提供済み注文</h2>
            {data.map((order) => (
                <div key={order.id} className="mb-4">
                    <h3 className="text-2xl font-semibold text-center">
                        注文番号 #{order.isTakeout ? `T${order.id}` : order.id}
                    </h3>
                    <table className="min-w-full border-collapse border border-gray-300">
                        <tbody>
                            {order.items.map((item) => (
                                <tr key={uuidv4()} className="border-b border-gray-300">
                                    <td className="border border-gray-300 p-2">{productNamesJa[item.item as keyof typeof productNamesJa]}</td>
                                    <td className="border border-gray-300 p-2">{item.quantity}</td>
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

