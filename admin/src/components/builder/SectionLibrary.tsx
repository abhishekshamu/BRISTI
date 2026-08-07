import { Plus } from 'lucide-react';
import type { BuilderSection, SectionScope } from './types';
import { typesForScope } from './sectionTypes';

interface SectionLibraryProps {
  scope: Exclude<SectionScope, 'all'>;
  onAdd: (section: BuilderSection) => void;
}

/** Left panel: pick a section type to append to the canvas. */
export default function SectionLibrary({ scope, onAdd }: SectionLibraryProps) {
  const types = typesForScope(scope);

  return (
    <div className="admin-card p-4 h-fit">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">Sections</h3>
        <span className="admin-badge-slate text-[11px] px-2 py-0.5">Library</span>
      </div>
      <div className="space-y-2">
        {types.map((meta) => {
          const Icon = meta.icon;
          return (
            <button
              key={meta.type}
              type="button"
              onClick={() =>
                onAdd({
                  id: `${meta.type}-${Date.now()}`,
                  type: meta.type,
                  props: {},
                  order: 0,
                })
              }
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-left"
            >
              <span className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight">{meta.label}</span>
                <span className="block text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug line-clamp-2">{meta.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-1.5 mt-4 px-1 text-[11px] text-slate-400 dark:text-slate-500">
        <Plus className="w-3 h-3" /> Click a section to add it to the canvas
      </p>
    </div>
  );
}