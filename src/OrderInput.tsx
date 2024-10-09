import React, { useState, useEffect } from 'react';
import { addOrder } from './api/orders';

const productPrices = {
    hotCoffee: 100,
    icedCoffee: 100,
    hotTea: 100,
    icedTea: 100,
    pancake: 100,
    croissant: 100,
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

const OrderInput: React.FC = () => {
    const [orders, setOrders] = useState({
        hotCoffee: 0,
        icedCoffee: 0,
        hotTea: 0,
        icedTea: 0,
        pancake: 0,
        croissant: 0,
    });
    const [totalPrice, setTotalPrice] = useState(0);
    const [receivedAmount, setReceivedAmount] = useState<string>(""); // 初期値を空文字に変更
    const [change, setChange] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isTakeout, setIsTakeout] = useState(false);

    useEffect(() => {
        const newTotal = Object.entries(orders).reduce(
            (total, [item, quantity]) => total + productPrices[item as keyof typeof orders] * quantity,
            0
        );
        setTotalPrice(newTotal);
    }, [orders]);

    useEffect(() => {
        const received = Number(receivedAmount) || 0; // 空のフィールドを考慮して数値に変換
        setChange(received - totalPrice);
    }, [receivedAmount, totalPrice]);

    const updateOrder = (item: keyof typeof orders, quantity: number) => {
        setOrders((prevOrders) => ({
            ...prevOrders,
            [item]: Math.max(0, quantity),
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);

        // 単価を含めた商品情報を作成
        const orderItems = Object.entries(orders)
            .filter(([_, quantity]) => quantity > 0)
            .map(([item, quantity]) => ({
                item,
                quantity,
                price: productPrices[item as keyof typeof orders] // 単価を追加
            }));

        const orderData = {
            items: orderItems,
            totalPrice,
            receivedAmount: Number(receivedAmount), // 送信時には数値に変換
            change,
            isTakeout
        };

        if (orderItems.length > 0) {
            await addOrder(orderData);
        }

        // alert('Order has been placed!');
        setOrders({
            hotCoffee: 0,
            icedCoffee: 0,
            hotTea: 0,
            icedTea: 0,
            pancake: 0,
            croissant: 0,
        });
        setReceivedAmount(""); // フィールドを空にリセット
        setIsTakeout(false);
        setLoading(false);
    };

    return (
        <div className="container mx-auto p-4 bg-white shadow-md rounded max-w-md lg:max-w-lg border border-black">
            <h2 className="text-3xl font-bold mb-4 text-center">注文画面</h2>

            {/* コーヒーの注文 */}
            <div className="mb-4">
                <h3 className="text-lg font-semibold">コーヒー</h3>
                <div className="flex justify-between items-center">
                    <span>{productNamesJa.hotCoffee}(¥{productPrices.hotCoffee})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('hotCoffee', orders.hotCoffee - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.hotCoffee}</span>
                        <button
                            onClick={() => updateOrder('hotCoffee', orders.hotCoffee + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span>{productNamesJa.icedCoffee} (¥{productPrices.icedCoffee})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('icedCoffee', orders.icedCoffee - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.icedCoffee}</span>
                        <button
                            onClick={() => updateOrder('icedCoffee', orders.icedCoffee + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* 紅茶の注文 */}
            <div className="mb-4">
                <h3 className="text-lg font-semibold">紅茶</h3>
                <div className="flex justify-between items-center">
                    <span>{productNamesJa.hotTea}(¥{productPrices.hotTea})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('hotTea', orders.hotTea - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.hotTea}</span>
                        <button
                            onClick={() => updateOrder('hotTea', orders.hotTea + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span>{productNamesJa.icedTea} (¥{productPrices.icedTea})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('icedTea', orders.icedTea - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.icedTea}</span>
                        <button
                            onClick={() => updateOrder('icedTea', orders.icedTea + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* フードメニューの注文 */}
            <div className="mb-4">
                <h3 className="text-lg font-semibold">フード</h3>
                <div className="flex justify-between items-center">
                    <span>{productNamesJa.pancake}(¥{productPrices.pancake})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('pancake', orders.pancake - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.pancake}</span>
                        <button
                            onClick={() => updateOrder('pancake', orders.pancake + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span>{productNamesJa.croissant}(¥{productPrices.croissant})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('croissant', orders.croissant - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.croissant}</span>
                        <button
                            onClick={() => updateOrder('croissant', orders.croissant + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* テイクアウトのチェックボックス */}
            <div className="mb-4">
                <label className="text-lg font-semibold mr-2">テイクアウト</label>
                <input
                    type="checkbox"
                    checked={isTakeout}
                    onChange={(e) => setIsTakeout(e.target.checked)}
                />
            </div>

            {/* 合計金額の表示 */}
            <div className="mt-6 text-xl font-bold text-center">
                合計金額: ¥{totalPrice}
            </div>

            <div className="mt-4">
                <label className="block text-lg font-medium mb-2">預り金</label>
                <input
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)} // 文字列として保存
                    className="w-full p-2 border rounded"
                    placeholder="受取金額を入力してください"
                />
            </div>

            <div className="mt-6 text-xl font-bold">
                お釣り: ¥{change >= 0 ? change : 0}
            </div>

            {/* 注文ボタン */}
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded w-full"
            >
                {loading ? '処理中...' : '注文を確定する'}
            </button>
        </div>
    );
};

export default OrderInput;