import { itemMapJa } from '../api/itemMap';
import { orderNumber, type Order } from '../domain/orders';

type Props = { order: Order; onServe?: (itemIndex: number) => void; pendingItem?: number };

export default function OrderCard({ order, onServe, pendingItem }: Props) {
    return (
        <div className="mb-4">
            <h3 className="text-2xl font-semibold">Order #{orderNumber(order)}</h3>
            {order.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex justify-between items-center">
                    <span>{itemMapJa[item.item] || item.item}</span>
                    {onServe && (
                        <button onClick={() => onServe(itemIndex)}
                            className={`ml-4 mb-2 px-2 py-1 rounded ${item.served ? 'bg-gray-500' : 'bg-green-500'} text-white`}
                            disabled={item.served || pendingItem !== undefined}>
                            {item.served ? 'Served' : '提供しました'}
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
