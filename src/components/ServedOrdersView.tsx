import useSWR from 'swr';
import { fetchServedOrders } from '../api/orders';
import OrderCard from './OrderCard';

export default function ServedOrdersView() {
    const { data, error } = useSWR('/served-orders', fetchServedOrders, { refreshInterval: 2000 });
    if (error) return <div>Error loading served orders.</div>;
    if (!data || data.length === 0) return <div>No served orders yet.</div>;
    return (
        <div className="container mx-auto p-4 bg-white shadow-md rounded max-w-md lg:max-w-lg">
            <h2 className="text-3xl font-bold mb-4 text-center">提供済み注文画面</h2>
            {data.map(order => <OrderCard key={order.id} order={order} />)}
        </div>
    );
}
