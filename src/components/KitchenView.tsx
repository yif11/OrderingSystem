import { useState } from 'react';
import useSWR from 'swr';
import { fetchOrders, markItemAsServed } from '../api/orders';
import OrderCard from './OrderCard';

export default function KitchenView() {
    const { data, error, mutate } = useSWR('/orders', fetchOrders, { refreshInterval: 2000 });
    const [pending, setPending] = useState<Record<number, number | undefined>>({});
    const [serveError, setServeError] = useState('');

    const handleServeItem = async (orderId: number, itemIndex: number) => {
        if (pending[orderId] !== undefined) return;
        setPending(previous => ({ ...previous, [orderId]: itemIndex }));
        setServeError('');
        try {
            await markItemAsServed(orderId, itemIndex);
            await mutate();
        } catch (error) {
            setServeError(error instanceof Error ? error.message : '提供状態を更新できませんでした。');
        } finally {
            setPending(previous => ({ ...previous, [orderId]: undefined }));
        }
    };

    if (error) return <div>Error loading orders.</div>;
    if (!data || data.length === 0) return <div>No orders yet.</div>;
    return (
        <div className="container mx-auto p-4 bg-white shadow-md rounded max-w-md lg:max-w-lg">
            <h2 className="text-3xl font-bold mb-4 text-center">提供画面</h2>
            {serveError && <p role="alert" className="mb-4 text-red-700">{serveError}</p>}
            {data.map(order => <OrderCard key={order.id} order={order} pendingItem={pending[order.id]} onServe={index => { void handleServeItem(order.id, index); }} />)}
        </div>
    );
}
