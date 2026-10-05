import type { Order, OrderData, OrderPrintResult } from '../domain/orders';

const apiUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function request<Result>(endpoint: string, options?: RequestInit): Promise<Result> {
    const response = await fetch(apiUrl + endpoint, options);
    const result = response.headers.get('content-type')?.includes('application/json')
        ? await response.json() : await response.text();
    if (!response.ok) throw new Error(result.printing?.error || result.error || result || '注文APIとの通信に失敗しました。');
    return result as Result;
}

const post = <Result>(endpoint: string, body?: unknown) => request<Result>(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export const fetchOrders = () => request<Order[]>('/orders');
export const fetchServedOrders = () => request<Order[]>('/served-orders');
export const addOrder = (order: OrderData) => post<OrderPrintResult>('/add-order', order);
export const reprintOrder = (orderId: number) => post<OrderPrintResult>(`/orders/${orderId}/print`);
export const markItemAsServed = (orderId: number, itemIndex: number) => post<string>('/mark-served', { orderId, itemIndex });
