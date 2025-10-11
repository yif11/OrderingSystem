import React, { useState, useEffect } from 'react';
import { addOrder } from './api/orders';

const productPrices = {
    icedCoffee: 300,
    hotCoffee: 300,
    cafeAuLait: 350,
    icedTea: 300,
    hotTea: 300,
    calpis: 200,
    appleJuice: 200,
    grapeJuice: 200,
    gingerAleBottle: 300
};

const DISCOUNT_PER_COUPON = 300; // 1枚あたりの割引額

const OrderInput: React.FC = () => {
    const [orders, setOrders] = useState({
        icedCoffee: 0,
        hotCoffee: 0,
        cafeAuLait: 0,
        icedTea: 0,
        hotTea: 0,
        calpis: 0,
        appleJuice: 0,
        grapeJuice: 0,
        gingerAleBottle: 0
    });
    const [totalPrice, setTotalPrice] = useState(0);
    const [receivedAmount, setReceivedAmount] = useState<string>(""); // 初期値を空文字に変更
    const [change, setChange] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isTakeout, setIsTakeout] = useState(false);
    const [discountCoupons, setDiscountCoupons] = useState(0); // 割引券の数

    useEffect(() => {
        const newTotal = Object.entries(orders).reduce(
            (total, [item, quantity]) => total + productPrices[item as keyof typeof orders] * quantity,
            0
        ) - discountCoupons * DISCOUNT_PER_COUPON;
        setTotalPrice(newTotal > 0 ? newTotal : 0); // 割引が合計金額を超えないように調整
    }, [orders, discountCoupons]);

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

        // 選択された商品を個別に分割して、単品ごとの注文として追加
        const orderItems = Object.entries(orders)
            .flatMap(([item, quantity]) =>
                Array.from({ length: quantity }).map(() => ({
                    item,
                    served: false, // 初期状態はすべて未提供
                    price: productPrices[item as keyof typeof orders] // 単価を追加
                }))
            );

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

        setOrders({
            icedCoffee: 0,
            hotCoffee: 0,
            cafeAuLait: 0,
            icedTea: 0,
            hotTea: 0,
            calpis: 0,
            appleJuice: 0,
            grapeJuice: 0,
            gingerAleBottle: 0
        });
        setReceivedAmount("");
        setIsTakeout(false);
        setLoading(false);
        setDiscountCoupons(0); // 割引券もリセット
    };

    return (
        <div className="mx-auto p-4 bg-white shadow-md rounded max-w-md md:max-w-full md:mx-0">
            <h2 className="text-3xl font-bold mb-4 text-center">注文画面</h2>

            {/* メニュー（ジャンル別タイル） */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* コーヒーの注文 */}
                <div className="mb-4 bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition">
                    <h3 className="text-lg font-semibold">Coffee</h3>
                <div className="flex justify-between items-center">
                    <span>ホットコーヒー (¥{productPrices.hotCoffee})</span>
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
                    <span>アイスコーヒー (¥{productPrices.icedCoffee})</span>
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
                <div className="flex justify-between items-center">
                    <span>カフェオレ(アイス) (¥{productPrices.cafeAuLait})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('cafeAuLait', orders.cafeAuLait - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.cafeAuLait}</span>
                        <button
                            onClick={() => updateOrder('cafeAuLait', orders.cafeAuLait + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                </div>

                {/* 紅茶の注文 */}
                <div className="mb-4 bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition">
                    <h3 className="text-lg font-semibold">Tea</h3>
                <div className="flex justify-between items-center">
                    <span>紅茶(ホット) (¥{productPrices.hotTea})</span>
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
                    <span>紅茶(アイス) (¥{productPrices.icedTea})</span>
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

                {/* ソフトドリンクの注文 */}
                <div className="mb-4 bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition">
                    <h3 className="text-lg font-semibold">SoftDrink</h3>
                <div className="flex justify-between items-center">
                    <span>カルピス (¥{productPrices.calpis})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('calpis', orders.calpis - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.calpis}</span>
                        <button
                            onClick={() => updateOrder('calpis', orders.calpis + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span>りんごジュース (¥{productPrices.appleJuice})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('appleJuice', orders.appleJuice - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.appleJuice}</span>
                        <button
                            onClick={() => updateOrder('appleJuice', orders.appleJuice + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span>ぶどうジュース (¥{productPrices.grapeJuice})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('grapeJuice', orders.grapeJuice - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.grapeJuice}</span>
                        <button
                            onClick={() => updateOrder('grapeJuice', orders.grapeJuice + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span>ジンジャーエール（瓶） (¥{productPrices.gingerAleBottle})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('gingerAleBottle', orders.gingerAleBottle - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.gingerAleBottle}</span>
                        <button
                            onClick={() => updateOrder('gingerAleBottle', orders.gingerAleBottle + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                </div>

                {/* No Food items in the new menu */}
            </div>

            {/* テイクアウトのチェックボックス */}
            <div className="mb-4 flex items-center">
                <label className="text-2xl md:text-3xl font-bold mr-4">テイクアウト</label>
                <input
                    type="checkbox"
                    checked={isTakeout}
                    onChange={(e) => setIsTakeout(e.target.checked)}
                    className="w-8 h-8 md:w-10 md:h-10 accent-blue-600"
                    aria-label="テイクアウト"
                />
            </div>

            {/* 割引券の数を調整するプラス・マイナスボタン */}
            <div className="mb-4">
                <h3 className="text-lg font-semibold">どりーむきっず用割引券</h3>
                <div className="flex items-center">
                    <button
                        onClick={() => setDiscountCoupons((prev) => Math.max(0, prev - 1))}
                        className="bg-red-500 text-white px-3 py-1 rounded-l"
                    >
                        -
                    </button>
                    <span className="px-4">{discountCoupons}</span>
                    <button
                        onClick={() => setDiscountCoupons((prev) => prev + 1)}
                        className="bg-green-500 text-white px-3 py-1 rounded-r"
                    >
                        +
                    </button>
                </div>
                <p className="text-gray-600">1枚につき¥{DISCOUNT_PER_COUPON}の割引</p>
            </div>

            {/* 合計金額の表示 */}
            <div className="mt-6 text-3xl md:text-4xl font-extrabold text-center">
                合計金額: ¥{totalPrice}
            </div>

            {/* お預かり金額の入力 */}
            <div className="mt-4">
                <label className="block text-lg font-medium mb-2">お預かり金額</label>
                <input
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)} // 文字列として保存
                    className="w-full p-2 border rounded"
                    placeholder="お預かり金額を入力してください"
                />
            </div>

            {/* お釣りの表示 */}
            <div className="mt-4 text-2xl md:text-3xl font-semibold">
                お釣り: ¥{change >= 0 ? change : 0}
            </div>

            {/* 注文を送信 */}
            <button
                onClick={handleSubmit}
                disabled={loading}
                className="mt-6 bg-blue-500 text-white px-4 py-2 rounded w-full"
            >
                {loading ? 'Processing...' : '注文を送信'}
            </button>
        </div>
    );
};

export default OrderInput;