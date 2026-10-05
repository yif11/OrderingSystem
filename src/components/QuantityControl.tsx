type Props = { label: string; value: number; onChange: (quantity: number) => void };

export default function QuantityControl({ label, value, onChange }: Props) {
    return (
        <div className="flex items-center">
            <button aria-label={`${label}を減らす`} onClick={() => onChange(Math.max(0, value - 1))} className="bg-red-500 text-white px-3 py-1 rounded-l">-</button>
            <span className="px-4">{value}</span>
            <button aria-label={`${label}を増やす`} onClick={() => onChange(value + 1)} className="bg-green-500 text-white px-3 py-1 rounded-r">+</button>
        </div>
    );
}
