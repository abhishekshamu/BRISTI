import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export default function EmptyState({ title, body, action, icon }: EmptyStateProps) {
  return (
    <div className="admin-empty">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5 text-slate-400 dark:text-slate-500 ring-1 ring-inset ring-slate-200/70 dark:ring-slate-700/60">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {body && <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
