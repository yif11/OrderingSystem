import type { ReactNode } from 'react';
import Icon from './Icon';

type Props = { icon: 'kitchen' | 'check' | 'alert' | 'clock'; title: string; description?: string; children?: ReactNode };

export default function StatePanel({ icon, title, description, children }: Props) {
    return <div className="state-panel"><span className="state-icon"><Icon name={icon} /></span><h2>{title}</h2>{description && <p>{description}</p>}{children}</div>;
}
