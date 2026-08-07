import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, UserRound, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export default function UserMenu() {
  const { admin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  const initials = `${admin?.firstName?.[0] ?? 'A'}${admin?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-900 dark:from-slate-200 dark:to-slate-400 flex items-center justify-center text-[11px] font-semibold text-white dark:text-slate-900 ring-2 ring-white dark:ring-slate-700 shadow-sm">
          {initials}
        </span>
        <span className="hidden xl:flex flex-col items-start leading-tight">
          <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
            {admin?.firstName} {admin?.lastName}
          </span>
          <span className="text-[10.5px] text-slate-400 capitalize">{admin?.role?.replace('_', ' ')}</span>
        </span>
        <ChevronDown className={`hidden xl:block w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 admin-card p-1.5 shadow-2xl z-50" role="menu">
          <div className="px-3 pt-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {admin?.firstName} {admin?.lastName}
            </p>
            <p className="text-xs text-slate-400 truncate">{admin?.email}</p>
          </div>
          <div className="pt-1.5">
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              role="menuitem"
            >
              <UserRound className="w-4 h-4 text-slate-400" /> Account & Security
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              role="menuitem"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
