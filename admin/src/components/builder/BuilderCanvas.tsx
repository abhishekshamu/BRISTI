import { useRef } from 'react';
import { GripVertical, Plus, Trash2, Settings, ChevronUp, ChevronDown, EyeOff, Eye, Copy, Zap, LayoutPanelTop } from 'lucide-react';
import type { BuilderSection } from './types';
import { metaFor } from './sectionTypes';

interface BuilderCanvasProps {
  sections: BuilderSection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onRemove: (id: string) => void;
  onToggleVisible?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

/**
 * The one drag-and-drop canvas used by every page in the Visual Builder.
 * Sections are HTML5-draggable rows; click selects; arrows nudge; trash removes;
 * live sections carry a "live data" badge and layout sections a layout badge.
 */
export default function BuilderCanvas({
  sections,
  selectedId,
  onSelect,
  onReorder,
  onMove,
  onRemove,
  onToggleVisible,
  onDuplicate,
}: BuilderCanvasProps) {
  const dragIndex = useRef<number | null>(null);

  return (
    <div className="admin-card p-6 min-h-[calc(100vh-200px)] overflow-y-auto">
      <header className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">Page Canvas</h3>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Mirrors the live storefront — drag to reorder, click to select, configure in the inspector.</p>
        </div>
        <span className="admin-badge-slate shrink-0">
          {sections.length} {sections.length === 1 ? 'section' : 'sections'}
        </span>
      </header>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[480px] border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No sections yet</p>
          <p className="text-[13px] text-slate-400 dark:text-slate-500 mt-1">Add sections from the Sections Library on the left</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => {
            const meta = metaFor(section.type);
            const Icon = meta?.icon ?? Settings;
            const hidden = section.visible === false;
            const live = section.live || meta?.live || false;
            const layout = section.layout || meta?.layout || false;
            return (
              <div
                key={section.id}
                draggable={!hidden}
                onDragStart={() => { dragIndex.current = index; }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => { dragIndex.current = null; }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex.current !== null && dragIndex.current !== index) {
                    onReorder(dragIndex.current, index);
                  }
                  dragIndex.current = null;
                }}
                onClick={() => onSelect(section.id)}
                className={`h-16 flex items-center gap-3 px-4 rounded-xl border cursor-pointer transition-all select-none ${
                  hidden
                    ? 'border-dashed border-slate-300 dark:border-slate-600 opacity-50 bg-slate-50 dark:bg-slate-800/30'
                    : selectedId === section.id
                      ? 'border-slate-900 dark:border-slate-50 ring-2 ring-slate-900/10 dark:ring-slate-100/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <GripVertical className="w-5 h-5 text-slate-300 dark:text-slate-600 cursor-grab shrink-0" />
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {section.label ?? meta?.label ?? section.type}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <span>Section {index + 1}</span>
                    {live && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Zap className="w-3 h-3" /> Live data
                      </span>
                    )}
                    {layout && (
                      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <LayoutPanelTop className="w-3 h-3" /> Layout
                      </span>
                    )}
                    {hidden && <span className="text-slate-500">· hidden on canvas</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onToggleVisible && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleVisible(section.id); }}
                      title={hidden ? 'Show section' : 'Hide section'}
                      aria-label={hidden ? 'Show section' : 'Hide section'}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                    >
                      {hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  )}
                  {onDuplicate && !layout && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDuplicate(section.id); }}
                      title="Duplicate section"
                      aria-label="Duplicate section"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMove(index, 'up'); }}
                    disabled={index === 0}
                    aria-label="Move section up"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onMove(index, 'down'); }}
                    disabled={index === sections.length - 1}
                    aria-label="Move section down"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemove(section.id); }}
                    aria-label="Delete section"
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
