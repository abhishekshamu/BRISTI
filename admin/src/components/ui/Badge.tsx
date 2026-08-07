import type { ReactNode } from 'react';

export type BadgeTone = 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'purple';

const TONES: Record<BadgeTone, string> = {
  slate: 'admin-badge-slate',
  green: 'admin-badge-green',
  amber: 'admin-badge-amber',
  red: 'admin-badge-red',
  blue: 'admin-badge-blue',
  purple: 'admin-badge-purple',
};

export default function Badge({ tone = 'slate', children, className = '' }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={`${TONES[tone]} ${className}`}>{children}</span>;
}
