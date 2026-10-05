import { itemMapJa } from '../api/itemMap';
import { orderNumber, type Order } from '../domain/orders';
import Icon from './Icon';

type Props = { order: Order; onServe?: (itemIndex: number) => void; pendingItem?: number };

export default function OrderCard({ order, onServe, pendingItem }: Props) {
    const itemCount = order.items.reduce((count, item) => count + (item.quantity ?? 1), 0);
    const servedCount = order.items.reduce((count, item) => count + (item.served ? item.quantity ?? 1 : 0), 0);
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    const time = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : null;

    return (
        <article className={`order-card${!onServe ? ' completed-order' : ''}`} aria-label={`注文番号 ${orderNumber(order)}`}>
            <div className="order-card-heading">
                <div><p className="order-number-label">注文番号</p><h2><span>#</span>{orderNumber(order)}</h2></div>
                <span className={`fulfillment-badge${order.isTakeout ? ' is-takeout' : ''}`}><Icon name={order.isTakeout ? 'bag' : 'coffee'} />{order.isTakeout ? 'テイクアウト' : '店内'}</span>
            </div>
            <div className="order-meta"><span>{time ? <><Icon name="clock" /><time dateTime={order.createdAt}>{time} 受付</time></> : '受付時刻未記録'}</span><span>{itemCount} 点</span></div>
            <ul className="order-items">
                {order.items.map((item, itemIndex) => (
                    <li key={itemIndex} className={item.served || !onServe ? 'item-served' : ''}>
                        <span className="order-item-name">{itemMapJa[item.item] || item.item}{(item.quantity ?? 1) > 1 && <small>× {item.quantity}</small>}</span>
                        {onServe && !item.served ? (
                            <button type="button" onClick={() => onServe(itemIndex)} className="serve-button" aria-label={`${itemMapJa[item.item] || item.item}を提供する`}
                                disabled={pendingItem !== undefined}>{pendingItem === itemIndex ? '更新中…' : <><Icon name="check" />提供する</>}</button>
                        ) : <span className="served-label"><Icon name="check" />提供済み</span>}
                    </li>
                ))}
            </ul>
            {onServe ? <div className="order-progress"><div><span>提供状況</span><strong>{servedCount} / {itemCount} 点</strong></div><progress value={servedCount} max={itemCount || 1} aria-label={`注文 ${orderNumber(order)} の提供状況`} /></div>
                : <div className="completed-footer"><span><Icon name="check" />すべて提供済み</span><strong>¥{order.totalPrice.toLocaleString('ja-JP')}</strong></div>}
        </article>
    );
}
