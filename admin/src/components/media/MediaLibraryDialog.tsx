import { X } from 'lucide-react';
import type { MediaFile } from '@shared/types';
import MediaLibrary from './MediaLibrary';

interface MediaLibraryDialogProps {
  open: boolean;
  onClose: () => void;
  /** Single-select mode: required unless multi with onPickMulti is used. */
  onSelect?: (file: MediaFile) => void;
  onPickMulti?: (files: MediaFile[]) => void;
  multi?: boolean;
  title?: string;
  folder?: string;
  usage?: boolean;
  allowUpload?: boolean;
}

export default function MediaLibraryDialog({
  open,
  onClose,
  onSelect,
  onPickMulti,
  multi = false,
  title = 'Choose from media library',
  folder,
  usage = true,
  allowUpload = true,
}: MediaLibraryDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{multi ? 'Select one or more images' : 'Click an image to use it'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Close media library">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <MediaLibrary
            onSelect={onSelect}
            onPickMulti={onPickMulti}
            multi={multi}
            compact
            initialFolder={folder}
            usage={usage}
            allowUpload={allowUpload}
            autoCloseAfterSelect={false}
          />
        </div>
      </div>
    </div>
  );
}
