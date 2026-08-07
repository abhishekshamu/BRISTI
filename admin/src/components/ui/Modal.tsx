import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  /** Wide, fixed-height variant: min(96vw, 1700px) × 92vh with a scrollable
   * body and sticky header + footer (used by the campaign banner editor). */
  wide?: boolean;
}

export default function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg', wide = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <motion.div
        className={`admin-modal ${wide ? 'admin-modal-wide' : maxWidth}`}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 ${wide ? 'shrink-0' : ''}`}>
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h3>
            <button type="button" onClick={onClose} className="admin-icon-btn" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className={wide ? 'flex-1 min-h-0 px-6 py-5 overflow-y-auto overflow-x-hidden' : 'px-6 py-5'}>{children}</div>
        {footer && <div className={`flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 rounded-b-2xl ${wide ? 'shrink-0' : ''}`}>{footer}</div>}
      </motion.div>
    </div>
  );
}
