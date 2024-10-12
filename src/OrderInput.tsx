import React, { useState, useEffect } from 'react';
import { addOrder } from './api/orders';

const productPrices = {
    hotCoffee: 300,
    icedCoffee: 300,
    cafeAuLait: 350,
    hotTea: 300,
    icedTea: 300,
    orangeJuice: 200,
    appleJuice: 200,
    calpis: 200,
    greenTea: 200,
    chocolateCroffle: 400,
    mapleCroffle: 400,
    greenTeaCroffle: 400,
    strawberryCroffle: 400,
    plainCroffle: 400
};

const DISCOUNT_PER_COUPON = 300; // 1枚あたりの割引額

const OrderInput: React.FC = () => {
    const [orders, setOrders] = useState({
        hotCoffee: 0,
        icedCoffee: 0,
        cafeAuLait: 0,
        hotTea: 0,
        icedTea: 0,
        orangeJuice: 0,
        appleJuice: 0,
        calpis: 0,
        greenTea: 0,
        chocolateCroffle: 0,
        mapleCroffle: 0,
        greenTeaCroffle: 0,
        strawberryCroffle: 0,
        plainCroffle: 0
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
            hotCoffee: 0,
            icedCoffee: 0,
            cafeAuLait: 0,
            hotTea: 0,
            icedTea: 0,
            orangeJuice: 0,
            appleJuice: 0,
            calpis: 0,
            greenTea: 0,
            chocolateCroffle: 0,
            mapleCroffle: 0,
            greenTeaCroffle: 0,
            strawberryCroffle: 0,
            plainCroffle: 0
        });
        setReceivedAmount("");
        setIsTakeout(false);
        setLoading(false);
        setDiscountCoupons(0); // 割引券もリセット
    };

    return (
        <div className="container mx-auto p-4 bg-white shadow-md rounded max-w-md lg:max-w-lg">
            <h2 className="text-3xl font-bold mb-4 text-center">注文画面</h2>

            {/* コーヒーの注文 */}
            <div className="mb-4">
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
            <div className="mb-4">
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
            <div className="mb-4">
                <h3 className="text-lg font-semibold">SoftDrink</h3>
                <div className="flex justify-between items-center">
                    <span>オレンジジュース (¥{productPrices.orangeJuice})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('orangeJuice', orders.orangeJuice - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.orangeJuice}</span>
                        <button
                            onClick={() => updateOrder('orangeJuice', orders.orangeJuice + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span>アップルジュース (¥{productPrices.appleJuice})</span>
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
                    <span>緑茶 (¥{productPrices.greenTea})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('greenTea', orders.greenTea - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.greenTea}</span>
                        <button
                            onClick={() => updateOrder('greenTea', orders.greenTea + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* フードメニューの注文 */}
            <div className="mb-4">
                <h3 className="text-lg font-semibold">Food</h3>
                <div className="flex justify-between items-center">
                    <span>クロッフル(チョコ) (¥{productPrices.chocolateCroffle})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('chocolateCroffle', orders.chocolateCroffle - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.chocolateCroffle}</span>
                        <button
                            onClick={() => updateOrder('chocolateCroffle', orders.chocolateCroffle + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span>クロッフル(メープル) (¥{productPrices.mapleCroffle})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('mapleCroffle', orders.mapleCroffle - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.mapleCroffle}</span>
                        <button
                            onClick={() => updateOrder('mapleCroffle', orders.mapleCroffle + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span>クロッフル(抹茶) (¥{productPrices.greenTeaCroffle})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('greenTeaCroffle', orders.greenTeaCroffle - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.greenTeaCroffle}</span>
                        <button
                            onClick={() => updateOrder('greenTeaCroffle', orders.greenTeaCroffle + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span>クロッフル(いちご) (¥{productPrices.strawberryCroffle})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('strawberryCroffle', orders.strawberryCroffle - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.strawberryCroffle}</span>
                        <button
                            onClick={() => updateOrder('strawberryCroffle', orders.strawberryCroffle + 1)}
                            className="bg-green-500 text-white px-3 py-1 rounded-r"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span>クロッフル(プレーン) (¥{productPrices.plainCroffle})</span>
                    <div className="flex items-center">
                        <button
                            onClick={() => updateOrder('plainCroffle', orders.plainCroffle - 1)}
                            className="bg-red-500 text-white px-3 py-1 rounded-l"
                        >
                            -
                        </button>
                        <span className="px-4">{orders.plainCroffle}</span>
                        <button
                            onClick={() => updateOrder('plainCroffle', orders.plainCroffle + 1)}
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
            <div className="mt-6 text-xl font-bold text-center">
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
            <div className="mt-4 text-lg">
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