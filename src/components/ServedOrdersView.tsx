import useSWR from 'swr';
import { fetchServedOrders } from '../api/orders';
import OrderCard from './OrderCard';
import Icon from './Icon';
import StatePanel from './StatePanel';

export default function ServedOrdersView() {
    const { data, error, mutate } = useSWR('/served-orders', fetchServedOrders, { refreshInterval: 2000 });
    const orders = data ?? [];
    const itemCount = orders.reduce((count, order) => count + order.items.reduce((total, item) => total + (item.quantity ?? 1), 0), 0);
    return (
        <div className="served-page">
            <div className="page-heading"><h1>提供済み</h1><span className="refresh-note"><Icon name="clock" />2秒ごとに自動更新</span></div>
            <div className="board-overview"><div className="overview-primary"><span className="overview-icon"><Icon name="check" /></span><div><span>提供済みの注文</span><strong>{orders.length}<small>件</small></strong></div></div><div className="overview-stat"><span>提供済みの商品</span><strong>{itemCount}<small>点</small></strong></div><div className="overview-stat"><span>テイクアウト</span><strong>{orders.filter(order => order.isTakeout).length}<small>件</small></strong></div></div>
            <div className="section-heading history-heading"><h2>注文履歴</h2><span className="section-hint">最近提供した注文から表示</span></div>
            {error ? <StatePanel icon="alert" title="注文履歴を読み込めませんでした" description="接続を確認して、もう一度お試しください。"><button className="button button-secondary" onClick={() => { void mutate().catch(() => undefined); }}>再読み込み</button></StatePanel>
                : !data ? <div role="status"><StatePanel icon="clock" title="注文履歴を読み込んでいます" /></div>
                    : orders.length === 0 ? <StatePanel icon="check" title="提供済みの注文はまだありません" />
                        : <div className="orders-grid">{[...orders].reverse().map(order => <OrderCard key={order.id} order={order} />)}</div>}
        </div>
    );
}
