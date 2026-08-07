import type { ReactNode } from 'react';
import { Eye, Globe, Check, AlertTriangle } from 'lucide-react';

interface StickySaveBarProps {
  dirty: boolean;
  onSave: () => void;
  onCancel?: () => void;
  saving?: boolean;
  saveLabel?: string;
  previewHref?: string;
  frontendHref?: string;
  children?: ReactNode;
}

export default function StickySaveBar({ dirty, onSave, onCancel, saving = false, saveLabel = 'Save changes', previewHref, frontendHref, children }: StickySaveBarProps) {
  return (
    <div className="admin-sticky-save">
      <div className="admin-sticky-save-inner">
        {children}
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${dirty ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}
          role="status"
        >
          {dirty ? <AlertTriangle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </span>
        {previewHref && (
          <a href={previewHref} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary !h-9 px-3.5 text-xs gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Preview
          </a>
        )}
        {frontendHref && (
          <a href={frontendHref} target="_blank" rel="noopener noreferrer" className="admin-btn-outline-gold !h-9 px-3.5 text-xs gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Open Frontend
          </a>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} className="admin-btn-secondary !h-9 px-4 text-sm">
            Cancel
          </button>
        )}
        <button type="button" onClick={onSave} disabled={saving} className="admin-btn-primary !h-9 px-5 text-sm">
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            saveLabel
          )}
        </button>
      </div>
    </div>
  );
}
