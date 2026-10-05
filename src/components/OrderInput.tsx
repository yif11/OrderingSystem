import { useState } from 'react';
import { addOrder, reprintOrder } from '../api/orders';
import { itemMapJa } from '../api/itemMap';
import { buildOrderItems, calculateTotal, DISCOUNT_PER_COUPON, emptyQuantities, menuGroups, orderNumber, productPrices, type ProductId } from '../domain/orders';
import QuantityControl from './QuantityControl';

export default function OrderInput() {
    const [orders, setOrders] = useState(emptyQuantities);
    const [receivedAmount, setReceivedAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [isTakeout, setIsTakeout] = useState(false);
    const [couponCount, setCouponCount] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [failedPrintOrder, setFailedPrintOrder] = useState<number | null>(null);
    const totalPrice = calculateTotal(orders, couponCount);
    const change = (Number(receivedAmount) || 0) - totalPrice;

    const updateOrder = (item: ProductId, quantity: number) => setOrders(previous => ({ ...previous, [item]: quantity }));

    const handleSubmit = async () => {
        if (loading) return;
        if (failedPrintOrder !== null) {
            setError('前の注文の再印刷を完了するか、番号を控えてから次の注文に進んでください。');
            return;
        }
        const items = buildOrderItems(orders);
        if (items.length === 0) { setError('商品を選択してください。'); return; }
        if (!Number.isSafeInteger(Number(receivedAmount)) || change < 0) {
            setError('お預かり金額を確認してください。'); return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const result = await addOrder({ items, totalPrice, receivedAmount: Number(receivedAmount), change, isTakeout });
            const number = orderNumber(result.order);
            if (result.printing.status === 'failed') {
                setFailedPrintOrder(result.order.id);
                setMessage(`注文番号 ${number} を登録しました。`);
                setError(`印刷できませんでした。プリンタを確認して再印刷してください。${result.printing.error || ''}`);
            } else {
                setMessage(`注文番号 ${number} を登録し、レシートと番号票を印刷キューに送信しました。`);
            }
            setOrders(emptyQuantities());
            setReceivedAmount('');
            setIsTakeout(false);
            setCouponCount(0);
        } catch (error) {
            setError(error instanceof Error ? error.message : '注文を登録できませんでした。');
        } finally {
            setLoading(false);
        }
    };

    const handleReprint = async () => {
        if (loading || failedPrintOrder === null) return;
        setLoading(true);
        setError('');
        try {
            const result = await reprintOrder(failedPrintOrder);
            setFailedPrintOrder(null);
            setMessage(`注文番号 ${orderNumber(result.order)} のレシートと番号票を印刷キューに送信しました。`);
        } catch (error) {
            setError(error instanceof Error ? error.message : '再印刷できませんでした。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 bg-white shadow-md rounded max-w-md lg:max-w-lg">
            <h2 className="text-3xl font-bold mb-4 text-center">注文画面</h2>
            {message && <p role="status" className="mb-4 text-green-700">{message}</p>}
            {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
            {failedPrintOrder !== null && (
                <div className="mb-4 flex gap-2">
                    <button onClick={handleReprint} disabled={loading} className="bg-blue-500 text-white px-4 py-2 rounded">登録済みの注文を再印刷</button>
                    <button onClick={() => { setFailedPrintOrder(null); setError(''); }} disabled={loading} className="border px-4 py-2 rounded">番号を控えて次の注文へ</button>
                </div>
            )}
            <fieldset disabled={loading}>
                {menuGroups.map(group => (
                    <div key={group.title} className="mb-4">
                        <h3 className="text-lg font-semibold">{group.title}</h3>
                        {group.items.map(item => (
                            <div key={item} className="flex justify-between items-center">
                                <span>{itemMapJa[item]} (¥{productPrices[item]})</span>
                                <QuantityControl label={itemMapJa[item]} value={orders[item]} onChange={quantity => updateOrder(item, quantity)} />
                            </div>
                        ))}
                    </div>
                ))}
                <div className="mb-4">
                    <label className="text-lg font-semibold mr-2" htmlFor="takeout">テイクアウト</label>
                    <input id="takeout" type="checkbox" checked={isTakeout} onChange={event => setIsTakeout(event.target.checked)} />
                </div>
                <div className="mb-4">
                    <h3 className="text-lg font-semibold">どりーむきっず用割引券</h3>
                    <QuantityControl label="割引券" value={couponCount} onChange={setCouponCount} />
                    <p className="text-gray-600">1枚につき¥{DISCOUNT_PER_COUPON}の割引</p>
                </div>
                <div className="mt-6 text-xl font-bold text-center">合計金額: ¥{totalPrice}</div>
                <div className="mt-4">
                    <label className="block text-lg font-medium mb-2" htmlFor="receivedAmount">お預かり金額</label>
                    <input id="receivedAmount" type="number" value={receivedAmount} onChange={event => setReceivedAmount(event.target.value)}
                        className="w-full p-2 border rounded" placeholder="お預かり金額を入力してください" />
                </div>
                <div className="mt-4 text-lg">お釣り: ¥{Math.max(0, change)}</div>
                <button onClick={handleSubmit} className="mt-6 bg-blue-500 text-white px-4 py-2 rounded w-full">
                    {loading ? 'Processing...' : '注文を送信'}
                </button>
            </fieldset>
        </div>
    );
}
