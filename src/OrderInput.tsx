import React, { useState } from 'react';
import { addOrder } from './api/orders';

const OrderInput: React.FC = () => {
    const [orders, setOrders] = useState({
        hotCoffee: 0,
        icedCoffee: 0,
        hotTea: 0,
        icedTea: 0,
        pancake: 0,
        croissant: 0,
    });
    const [loading, setLoading] = useState(false);

    const updateOrder = (item: keyof typeof orders, quantity: number) => {
        setOrders((prevOrders) => ({
            ...prevOrders,
            [item]: Math.max(0, quantity), // 数量は0以上にする
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);

        const orderItems = Object.entries(orders)
            .filter(([_, quantity]) => quantity > 0)
            .map(([item, quantity]) => ({ item, quantity }));

        if (orderItems.length > 0) {
            await addOrder(orderItems);  // 複数のアイテムをまとめて一度の注文として送信
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
        setLoading(false);
    };

    return (
        <div className="p-4 bg-white shadow-md rounded">
            <h2 className="text-2xl font-bold mb-4">Place an Order</h2>

            {/* コーヒーの注文 */}
            <div className="mb-4">
                <h3 className="text-lg font-semibold">Coffee</h3>
                <div className="flex justify-between items-center">
                    <span>Hot Coffee</span>
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
                    <span>Iced Coffee</span>
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
                <h3 className="text-lg font-semibold">Tea</h3>
                <div className="flex justify-between items-center">
                    <span>Hot Tea</span>
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
                    <span>Iced Tea</span>
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
                <h3 className="text-lg font-semibold">Food</h3>
                <div className="flex justify-between items-center">
                    <span>Pancake</span>
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
                    <span>Croissant</span>
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

            <button
                onClick={handleSubmit}
                disabled={loading}
                className={`mt-6 w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 ${loading ? 'opacity-50' : ''}`}
            >
                {loading ? 'Placing Order...' : 'Place Order'}
            </button>
        </div>
    );
};

export default OrderInput;
