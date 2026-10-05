import { useState } from 'react';
import useSWR from 'swr';
import { fetchOrders, markItemAsServed } from '../api/orders';
import OrderCard from './OrderCard';
import Icon from './Icon';
import StatePanel from './StatePanel';
import { Link } from 'react-router-dom';

export default function KitchenView() {
    const { data, error, mutate } = useSWR('/orders', fetchOrders, { refreshInterval: 2000 });
    const [pending, setPending] = useState<Record<number, number | undefined>>({});
    const [serveError, setServeError] = useState('');
    const [filter, setFilter] = useState<'all' | 'dine-in' | 'takeout'>('all');
    const orders = data ?? [];
    const visibleOrders = orders.filter(order => filter === 'all' || (filter === 'takeout' ? order.isTakeout : !order.isTakeout));
    const remainingItems = orders.reduce((count, order) => count + order.items.reduce((total, item) => total + (item.served ? 0 : item.quantity ?? 1), 0), 0);

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

    return (
        <div className="kitchen-page">
            <div className="page-heading"><h1>キッチン</h1><span className="refresh-note"><Icon name="clock" />2秒ごとに自動更新</span></div>
            <div className="board-overview"><div className="overview-primary"><span className="overview-icon"><Icon name="kitchen" /></span><div><span>提供待ちの注文</span><strong>{orders.length}<small>件</small></strong></div></div><div className="overview-stat"><span>未提供の商品</span><strong>{remainingItems}<small>点</small></strong></div><div className="overview-stat"><span>テイクアウト</span><strong>{orders.filter(order => order.isTakeout).length}<small>件</small></strong></div></div>
            <div className="board-toolbar"><div className="filter-control" aria-label="お渡し方法で絞り込み">{([{ value: 'all', label: 'すべて' }, { value: 'dine-in', label: '店内' }, { value: 'takeout', label: 'テイクアウト' }] as const).map(option => <button type="button" key={option.value} aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>{option.label}{option.value === 'all' && <span>{orders.length}</span>}</button>)}</div><span className="section-hint">受付順に表示</span></div>
            {serveError && <div role="alert" className="notice notice-error"><Icon name="alert" /><p>{serveError}</p></div>}
            {error ? <StatePanel icon="alert" title="注文を読み込めませんでした" description="接続を確認して、もう一度お試しください。"><button className="button button-secondary" onClick={() => { void mutate().catch(() => undefined); }}>再読み込み</button></StatePanel>
                : !data ? <div role="status"><StatePanel icon="clock" title="注文を読み込んでいます" /></div>
                    : visibleOrders.length === 0 ? <StatePanel icon="kitchen" title={orders.length === 0 ? '新しい注文を待っています' : '該当する注文はありません'}>{orders.length === 0 && <Link to="/order" className="button button-primary">注文を受け付ける<Icon name="arrow" /></Link>}</StatePanel>
                        : <div className="orders-grid">{visibleOrders.map(order => <OrderCard key={order.id} order={order} pendingItem={pending[order.id]} onServe={index => { void handleServeItem(order.id, index); }} />)}</div>}
        </div>
    );
}
