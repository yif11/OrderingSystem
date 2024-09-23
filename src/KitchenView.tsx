// import React from 'react';
// import useSWR from 'swr';
// import { fetchOrders, markItemAsServed } from './api/orders';
// import { v4 as uuidv4 } from 'uuid';

// const fetcher = async () => await fetchOrders();

// const KitchenView: React.FC = () => {
//     const { data, error, mutate } = useSWR('/orders', fetcher, {
//         refreshInterval: 2000, // 2秒ごとにポーリング
//     });

//     const handleServeItem = async (orderId: number, itemIndex: number) => {
//         await markItemAsServed(orderId, itemIndex);
//         mutate(); // データを再取得して画面を更新
//     };

//     if (!data || data.length === 0) return <div>No orders yet.</div>;

//     return (
//         <div className="p-4 bg-white shadow-md rounded">
//             <h2 className="text-2xl font-bold mb-4">Orders for Kitchen</h2>
//             {data.map((order, orderIndex) => (
//                 <div key={order.id} className="mb-4">
//                     {/* 注文グループが何番目の注文かを表示 */}
//                     <h3 className="text-xl font-semibold">Order #{orderIndex + 1}</h3>
//                     {order.items.map((item, itemIndex) => (
//                         <div key={uuidv4()} className="flex justify-between items-center">
//                             <span>{item.item} - {item.quantity}</span>
//                             <button
//                                 onClick={() => handleServeItem(order.id, itemIndex)}
//                                 disabled={item.served}
//                                 className={`ml-4 px-2 py-1 rounded ${item.served ? 'bg-gray-500' : 'bg-green-500'
//                                     } text-white`}
//                             >
//                                 {item.served ? 'Served' : 'Mark as Served'}
//                             </button>
//                         </div>
//                     ))}
//                     <div className="mt-2">=====</div>
//                 </div>
//             ))}
//         </div>
//     );
// };

// export default KitchenView;

import React from 'react';
import useSWR from 'swr';
import { fetchOrders, markItemAsServed } from './api/orders';
import { v4 as uuidv4 } from 'uuid';

const fetcher = async () => await fetchOrders();

// サーバーに注文内容を送信してCSVに保存する
// const saveOrderToServer = async (order: any) => {
//     const response = await fetch('/save-order', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//             items: order.items,
//         }),
//     });

//     if (!response.ok) {
//         console.error('Failed to save order to server');
//     } else {
//         console.log('Order saved to server');
//     }
// };
const saveOrderToServer = async (order: any) => {
    const response = await fetch('http://localhost:5000/save-order', {  // サーバーのポート番号に修正
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


const KitchenView: React.FC = () => {
    const { data, error, mutate } = useSWR('/orders', fetcher, {
        refreshInterval: 2000, // 2秒ごとにポーリング
    });

    const handleServeItem = async (orderId: number, itemIndex: number) => {
        await markItemAsServed(orderId, itemIndex);
        mutate(); // データを再取得して画面を更新
    };

    const handleServeOrder = async (orderId: number) => {
        if (!data) return;  // dataがundefinedの場合、処理をスキップ

        const order = data.find((o) => o.id === orderId);

        // 注文がすべて提供済みか確認
        if (order && order.items.every((item: any) => item.served)) {
            await saveOrderToServer(order); // サーバーに注文を送信して保存
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
                                onClick={async () => {
                                    await handleServeItem(order.id, itemIndex);
                                    handleServeOrder(order.id); // 注文が提供済みかチェックしてサーバーに送信
                                }}
                                disabled={item.served}
                                className={`ml-4 px-2 py-1 rounded ${item.served ? 'bg-gray-500' : 'bg-green-500'
                                    } text-white`}
                            >
                                {item.served ? 'Served' : 'Mark as Served'}
                            </button>
                        </div>
                    ))}
                    <div className="mt-2">=====</div>
                </div>
            ))}
        </div>
    );
};

export default KitchenView;
