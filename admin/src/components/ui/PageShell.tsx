import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageShellProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  backTo?: string;
  actions?: ReactNode;
  children: ReactNode;
  sidebar?: ReactNode;
  sidebarWidth?: string;
}

export default function PageShell({ title, subtitle, breadcrumbs, backTo, actions, children, sidebar, sidebarWidth = '340px' }: PageShellProps) {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="admin-breadcrumb" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, i) => (
                <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
                  {i > 0 && <ChevronRight className="w-3 h-3 shrink-0 text-slate-300 dark:text-slate-600" />}
                  {crumb.to ? (
                    <Link to={crumb.to} className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors truncate">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-slate-700 dark:text-slate-300 truncate">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-3.5">
            {backTo && (
              <Link
                to={backTo}
                aria-label="Go back"
                className="admin-icon-btn shrink-0 !w-10 !h-10 border border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="w-[18px] h-[18px]" />
              </Link>
            )}
            <div className="min-w-0">
              <h1 className="admin-page-title truncate">{title}</h1>
              {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
            </div>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2.5 shrink-0 flex-wrap">{actions}</div>}
      </div>

      {sidebar ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="min-w-0 space-y-8">{children}</div>
          <aside className="xl:w-full space-y-8 xl:sticky xl:top-6" style={{ maxWidth: sidebarWidth }}>
            {sidebar}
          </aside>
        </div>
      ) : (
        <div className="space-y-8">{children}</div>
      )}
    </div>
  );
}
