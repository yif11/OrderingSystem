import Icon from './Icon';

type Props = { label: string; value: number; onChange: (quantity: number) => void };

export default function QuantityControl({ label, value, onChange }: Props) {
    return (
        <div className={`quantity-control${value > 0 ? ' has-quantity' : ''}`}>
            <button type="button" aria-label={`${label}を減らす`} disabled={value === 0} onClick={() => onChange(Math.max(0, value - 1))}><Icon name="minus" /></button>
            <output aria-label={`${label}の数量`}>{value}</output>
            <button type="button" aria-label={`${label}を増やす`} onClick={() => onChange(value + 1)}><Icon name="plus" /></button>
        </div>
    );
}
