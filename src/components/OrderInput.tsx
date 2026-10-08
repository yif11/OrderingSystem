import { useEffect, useRef, useState } from 'react';
import { addOrder, reprintOrder } from '../api/orders';
import { itemMapJa } from '../api/itemMap';
import { buildOrderItems, calculateCashDue, calculateTotal, calculateVoucherAmount, emptyQuantities, emptyVouchers, menuItems, orderNumber, productPrices, voucherDenominations, type ProductId } from '../domain/orders';
import QuantityControl from './QuantityControl';
import Icon from './Icon';

const yen = (amount: number) => `¥${amount.toLocaleString('ja-JP')}`;

export default function OrderInput() {
    const [orders, setOrders] = useState(emptyQuantities);
    const [receivedAmount, setReceivedAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [isTakeout, setIsTakeout] = useState(false);
    const [vouchers, setVouchers] = useState(emptyVouchers);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [failedPrintOrder, setFailedPrintOrder] = useState<number | null>(null);
    const [checkoutVisible, setCheckoutVisible] = useState(false);
    const checkoutRef = useRef<HTMLElement>(null);
    const totalPrice = calculateTotal(orders);
    const voucherAmount = calculateVoucherAmount(vouchers);
    const voucherCount = voucherDenominations.reduce((count, amount) => count + vouchers[amount], 0);
    const cashDue = calculateCashDue(totalPrice, vouchers);
    const selectedItems = menuItems.filter(item => orders[item] > 0);
    const itemCount = selectedItems.reduce((count, item) => count + orders[item], 0);
    const change = (Number(receivedAmount) || 0) - cashDue;

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setCheckoutVisible(entry.isIntersecting), { rootMargin: '-128px 0px -64px 0px' });
        if (checkoutRef.current) observer.observe(checkoutRef.current);
        return () => observer.disconnect();
    }, []);

    const updateOrder = (item: ProductId, quantity: number) => setOrders(previous => ({ ...previous, [item]: quantity }));

    const handleSubmit = async () => {
        if (loading) return;
        if (failedPrintOrder !== null) {
            setError('前の注文の再印刷を完了するか、番号を控えてから次の注文に進んでください。');
            return;
        }
        const items = buildOrderItems(orders);
        if (items.length === 0) { setError('商品を選択してください。'); return; }
        if (!Number.isSafeInteger(Number(receivedAmount)) || Number(receivedAmount) < 0 || change < 0) {
            setError('お預かり金額を確認してください。'); return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const result = await addOrder({ items, totalPrice, vouchers, receivedAmount: Number(receivedAmount), change, isTakeout });
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
            setVouchers(emptyVouchers());
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
        <div className="order-page">
            <div className="page-heading">
                <h1>注文受付</h1>
            </div>
            {message && <div role="status" className="notice notice-success"><Icon name="check" /><p>{message}</p></div>}
            {error && <div role="alert" className="notice notice-error"><Icon name="alert" /><p>{error}</p></div>}
            {failedPrintOrder !== null && (
                <div className="reprint-actions">
                    <button onClick={handleReprint} disabled={loading} className="button button-primary">登録済みの注文を再印刷</button>
                    <button onClick={() => { setFailedPrintOrder(null); setError(''); }} disabled={loading} className="button button-secondary">番号を控えて次の注文へ</button>
                </div>
            )}
            <form onSubmit={event => { event.preventDefault(); void handleSubmit(); }}>
                <fieldset disabled={loading} className="order-layout">
                    <legend className="sr-only">注文商品・商品券・お会計</legend>
                    <section className="menu-panel" aria-labelledby="menu-heading">
                        <div className="panel-heading"><h2 id="menu-heading">メニュー</h2></div>
                        <div className="product-list">
                            {menuItems.map(item => (
                                <div key={item} className={`product-row${orders[item] > 0 ? ' is-selected' : ''}`}>
                                    <div className="product-info"><span className="product-name">{itemMapJa[item]}</span><span className="product-price">{yen(productPrices[item])}</span></div>
                                    <QuantityControl label={itemMapJa[item]} value={orders[item]} onChange={quantity => updateOrder(item, quantity)} />
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className="voucher-panel" aria-labelledby="voucher-heading">
                        <div className="panel-heading"><div><Icon name="ticket" /><h2 id="voucher-heading">商品券</h2></div><span className="count-pill">{voucherCount} 枚</span></div>
                        <p className="voucher-note">商品券分のお釣りは出ません。</p>
                        <div className="voucher-list">{voucherDenominations.map(amount => (
                            <div key={amount} className="voucher-row"><span>{yen(amount)}</span><QuantityControl label={`${amount}円商品券`} value={vouchers[amount]} onChange={quantity => setVouchers(previous => ({ ...previous, [amount]: quantity }))} /></div>
                        ))}</div>
                    </section>
                    <section ref={checkoutRef} id="checkout" className="checkout-panel" aria-labelledby="checkout-heading">
                        <div className="checkout-heading"><div><Icon name="receipt" /><h2 id="checkout-heading">お会計</h2></div><span className="count-pill">{itemCount} 点</span></div>
                        <fieldset className="fulfillment-fieldset">
                            <div className="fulfillment-control">
                                <label><input type="radio" name="fulfillment" checked={!isTakeout} onChange={() => setIsTakeout(false)} /><span><Icon name="coffee" />店内</span></label>
                                <label><input id="takeout" type="radio" name="fulfillment" checked={isTakeout} onChange={() => setIsTakeout(true)} /><span><Icon name="bag" />テイクアウト</span></label>
                            </div>
                        </fieldset>
                        <div className="cart-summary">
                            {itemCount === 0 ? <div className="cart-empty"><Icon name="coffee" /><p>メニューから商品を選択</p></div> : (
                                <ul className="cart-items">{selectedItems.map(item => <li key={item}><span>{itemMapJa[item]}<small>× {orders[item]}</small></span><strong>{yen(productPrices[item] * orders[item])}</strong></li>)}</ul>
                            )}
                        </div>
                        <div className="total-row"><span>合計金額</span><strong><small>¥</small>{totalPrice.toLocaleString('ja-JP')}</strong></div>
                        <div className="price-breakdown">
                            {voucherCount > 0 && <div className="voucher-line"><span>商品券（{voucherCount}枚）</span><span>{yen(voucherAmount)}</span></div>}
                            {voucherAmount > totalPrice && <p className="voucher-note">商品券の超過分 {yen(voucherAmount - totalPrice)} はお釣りの対象外です。</p>}
                            <div><span>現金でのお支払い</span><strong>{yen(cashDue)}</strong></div>
                        </div>
                        <div className="payment-area">
                            <label className="field-label" htmlFor="receivedAmount">お預かり金額（現金）</label>
                            <div className="currency-input"><span>¥</span><input id="receivedAmount" type="number" min="0" step="1" inputMode="numeric" value={receivedAmount} onChange={event => setReceivedAmount(event.target.value)} placeholder="0" aria-describedby={receivedAmount !== '' && change < 0 ? 'payment-hint' : undefined} /></div>
                            {receivedAmount !== '' && change < 0 && <p id="payment-hint" className="payment-hint is-insufficient">あと {yen(-change)} 不足しています</p>}
                            <div className="change-row"><span>お釣り</span><strong>{yen(Math.max(0, change))}</strong></div>
                        </div>
                        <button type="submit" className="button button-primary submit-order">{loading ? '注文を処理しています…' : '注文を送信'}<Icon name="arrow" /></button>
                        {/* <p className="checkout-footnote">レシート・番号票を印刷します</p> */}
                    </section>
                </fieldset>
            </form>
            {itemCount > 0 && !checkoutVisible && <button type="button" className="mobile-checkout-button" aria-controls="checkout" onClick={() => checkoutRef.current?.scrollIntoView({ block: 'start' })}><span><strong>{itemCount} 点</strong><span>{yen(totalPrice)}</span></span><span>お会計へ<Icon name="arrow" /></span></button>}
        </div>
    );
}
