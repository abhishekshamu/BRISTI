import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface StatCardProps {
  label: string;
  value: ReactNode;
  todayValue?: ReactNode;
  icon?: ReactNode;
  iconClass?: string;
  delta?: { value: string; positive?: boolean };
  sparkline?: number[];
  to?: string;
}

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ');
  const isUp = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} className="block" viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#10b981' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StatCard({ label, value, todayValue, icon, iconClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', delta, sparkline, to }: StatCardProps) {
  const body = (
    <div className="admin-stat-card group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em]">{label}</p>
          <p className="mt-2 text-[28px] leading-none font-semibold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums truncate">{value}</p>
          {todayValue != null && (
            <p className="text-xs text-slate-400 mt-2">Today: <span className="font-medium text-slate-600 dark:text-slate-300">{todayValue}</span></p>
          )}
          {delta && (
            <p className={`text-xs font-medium mt-2 ${delta.positive === false ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {delta.positive === false ? '▼' : '▲'} {delta.value}
            </p>
          )}
        </div>
        {icon && <div className={`p-3.5 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-110 ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.06] ${iconClass}`}>{icon}</div>}
      </div>
      {sparkline && sparkline.length >= 2 && (
        <div className="mt-3 flex items-center gap-2">
          <Sparkline data={sparkline} />
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {body}
      </Link>
    );
  }
  return body;
}
