import { useState } from 'react';
import { Copy, GripVertical, Pencil, Plus, Rocket, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../ui/Badge';
import ConfirmDialog from '../../ui/ConfirmDialog';
import type { HeroSetDraft } from '../types';
import HeroSetModal, { emptySet, nextLocalId } from './HeroSetModal';

interface HeroSetEditorProps {
  sets: HeroSetDraft[];
  onChange: (sets: HeroSetDraft[]) => void;
}

/**
 * The hero section's inspector content: manage hero sets in priority order.
 * Changes are local until the unified save (one save system applies the diff).
 */
export default function HeroSetEditor({ sets, onChange }: HeroSetEditorProps) {
  const [editing, setEditing] = useState<HeroSetDraft | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [drag, setDrag] = useState<{ from: number | null; over: number | null }>({ from: null, over: null });

  const upsert = (draft: HeroSetDraft) => {
    const next = draft._id
      ? sets.map((s) => (s._id === draft._id ? draft : s))
      : [...sets, draft];
    onChange(next.map((s, i) => ({ ...s, priority: i })));
  };

  const remove = (localId: string) => {
    onChange(sets.filter((s) => s.localId !== localId));
    toast.success('Hero set removed — saved when you save the page');
  };

  const duplicate = (set: HeroSetDraft) => {
    const copy: HeroSetDraft = {
      ...JSON.parse(JSON.stringify(set)),
      _id: undefined,
      localId: nextLocalId(),
      name: `${set.name} (Copy)`,
      slides: set.slides.map((s) => ({ ...s, localId: nextLocalId() })),
    };
    onChange([...sets, copy].map((s, i) => ({ ...s, priority: i })));
    toast.success('Set duplicated (draft) — saved with the page');
  };

  const reorder = () => {
    const { from, over } = drag;
    if (from === null || over === null || from === over) {
      setDrag({ from: null, over: null });
      return;
    }
    const next = [...sets];
    const [moved] = next.splice(from, 1);
    next.splice(over, 0, moved);
    onChange(next.map((s, i) => ({ ...s, priority: i })));
    setDrag({ from: null, over: null });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Hero Sets</h4>
          <span className="admin-badge-slate text-[11px] px-2 py-0.5">{sets.length}</span>
        </div>
        <button
          type="button"
          onClick={() => setConfirmAdd(true)}
          className="admin-btn-secondary px-3 py-1.5 text-sm flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> New Set
        </button>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        The storefront rotates the first published, active set shown to the visitor. Drag sets to change priority.
      </p>

      {sets.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">No hero sets yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add a set to start building your slider</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sets.map((set, index) => (
            <div
              key={set.localId}
              draggable
              onDragStart={() => setDrag({ from: index, over: index })}
              onDragOver={(e) => {
                e.preventDefault();
                if (drag.from !== index) setDrag((d) => ({ ...d, over: index }));
              }}
              onDrop={reorder}
              onDragEnd={() => setDrag({ from: null, over: null })}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl border bg-white dark:bg-slate-900 ${
                drag.over === index && drag.from !== null && drag.from !== index ? 'ring-2 ring-amber-400 border-amber-400' : 'border-slate-200 dark:border-slate-700'
              } ${drag.from === index ? 'opacity-60' : ''}`}
            >
              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 cursor-grab shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{set.name || 'Untitled set'}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {set.slides.length} {set.slides.length === 1 ? 'slide' : 'slides'} · priority {set.priority + 1}
                </p>
              </div>
              <Badge tone={set.status === 'published' ? 'green' : 'slate'}>{set.status}</Badge>
              {set.isActive ? <Badge tone="amber">active</Badge> : null}
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" onClick={() => setEditing(set)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Edit set">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => duplicate(set)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Duplicate set">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setConfirmRemoveId(set.localId)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Delete set">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <HeroSetModal
        open={editing !== null}
        initial={editing ?? emptySet()}
        onSave={(draft) => {
          upsert(draft);
          toast.success(editing?._id ? 'Set updated (saved with page)' : 'Set created (saved with page)');
        }}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={confirmAdd}
        title="Add a hero set"
        body="Adding a set creates a new draft hero rotation on this page. Continue?"
        confirmLabel="Add Set"
        onConfirm={() => {
          const fresh = emptySet(sets.length > 0 ? `Hero Set ${sets.length + 1}` : 'Hero Set 1');
          setEditing(fresh);
          setConfirmAdd(false);
        }}
        onCancel={() => setConfirmAdd(false)}
      />

      <ConfirmDialog
        open={confirmRemoveId !== null}
        title="Remove hero set"
        body="This removes the set from this page. It is saved when you click Save Page."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => {
          if (confirmRemoveId !== null) remove(confirmRemoveId);
          setConfirmRemoveId(null);
        }}
        onCancel={() => setConfirmRemoveId(null)}
      />
    </div>
  );
}