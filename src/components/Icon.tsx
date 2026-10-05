import type { ReactNode } from 'react';

type IconName = 'receipt' | 'coffee' | 'leaf' | 'croffle' | 'kitchen' | 'check' | 'bag' | 'clock' | 'arrow' | 'ticket' | 'plus' | 'minus' | 'alert';

type Props = { name: IconName; className?: string };

export default function Icon({ name, className = '' }: Props) {
    const paths: Record<IconName, ReactNode> = {
        receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 7h6M9 11h6M9 15h3" /></>,
        coffee: <><path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9ZM16 10h2a3 3 0 1 1 0 6h-2M8 3v3M12 3v3M3 21h16" /></>,
        leaf: <><path d="M20 4c0 10-3 15-9 15a7 7 0 0 1-7-7C4 6 11 4 20 4ZM4 21 15 10" /></>,
        croffle: <><path d="m6 5 6-2 6 2 3 7-3 7-6 2-6-2-3-7 3-7Z" /><path d="M8 7v10M12 5v14M16 7v10M6 9h12M5 13h14M7 17h10" /></>,
        kitchen: <><path d="M4 14a8 8 0 0 1 16 0M3 14h18v3H3v-3ZM5 21h14M12 3v3M10 3h4" /></>,
        check: <path d="m5 12 4 4L19 6" />,
        bag: <><path d="M5 7h14l1 14H4L5 7ZM8 8V6a4 4 0 0 1 8 0v2" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
        ticket: <><path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V7ZM15 7v2m0 3v2m0 3v2" /></>,
        plus: <path d="M12 5v14M5 12h14" />,
        minus: <path d="M5 12h14" />,
        alert: <><path d="m12 3 10 18H2L12 3ZM12 9v5M12 17h.01" /></>,
    };

    return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
