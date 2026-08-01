import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Copy, GripVertical, Monitor, Tablet, Smartphone, Calendar, CheckSquare } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { HeroBlock } from '../../types/index';

type StatusFilter = 'all' | 'draft' | 'published';
type ActiveFilter = 'all' | 'active' | 'inactive';

function StatusBadge({ block }: { block: HeroBlock }) {
  const published = block.status === 'published';
  const inSchedule =
    published &&
    (!block.scheduledStart || new Date(block.scheduledStart).getTime() <= Date.now()) &&
    (!block.scheduledEnd || new Date(block.scheduledEnd).getTime() >= Date.now());
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          published
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
        }`}
      >
        {published ? 'Published' : 'Draft'}
      </span>
      <span
        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          block.isActive
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}
      >
        {block.isActive ? 'Active' : 'Inactive'}
      </span>
      {inSchedule ? (
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Live
        </span>
      ) : published && (block.scheduledStart || block.scheduledEnd) ? (
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          Scheduled
        </span>
      ) : null}
    </div>
  );
}

function VisibilityIcons({ visibility }: { visibility: HeroBlock['visibility'] }) {
  return (
    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
      <Monitor className={`w-4 h-4 ${visibility?.desktop ? 'text-slate-700 dark:text-slate-200' : 'opacity-30'}`} />
      <Tablet className={`w-4 h-4 ${visibility?.tablet ? 'text-slate-700 dark:text-slate-200' : 'opacity-30'}`} />
      <Smartphone className={`w-4 h-4 ${visibility?.mobile ? 'text-slate-700 dark:text-slate-200' : 'opacity-30'}`} />
    </div>
  );
}

export default function HeroManager() {
  const [blocks, setBlocks] = useState<HeroBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [draggingOver, setDraggingOver] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchBlocks = useCallback(async () => {
    try {
      const response = await api.get('/hero/all');
      setBlocks(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch hero blocks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hero block?')) return;
    try {
      await api.delete(`/hero/${id}`);
      toast.success('Hero block deleted');
      fetchBlocks();
    } catch (error) {
      toast.error('Failed to delete hero block');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/hero/${id}/duplicate`);
      toast.success('Hero block duplicated');
      fetchBlocks();
    } catch (error) {
      toast.error('Failed to duplicate hero block');
    }
  };

  const handleReorder = async (orderedIds: string[]) => {
    try {
      await api.post('/hero/reorder', { orderedIds });
      toast.success('Order updated');
    } catch (error) {
      toast.error('Failed to save order');
    }
  };

  const onDragStart = (index: number) => {
    setDragIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggingOver(index);
  };

  const onDrop = () => {
    if (dragIndex === null || draggingOver === null || dragIndex === draggingOver) {
      setDragIndex(null);
      setDraggingOver(null);
      return;
    }
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(draggingOver, 0, moved);
      handleReorder(next.map((b) => b._id));
      return next;
    });
    setDragIndex(null);
    setDraggingOver(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((b) => b._id));
  };

  const bulkUpdate = async (patch: Record<string, unknown>, message: string) => {
    if (selected.length === 0) return;
    try {
      await Promise.all(selected.map((id) => api.put(`/hero/${id}`, patch)));
      toast.success(message);
      setSelected([]);
      fetchBlocks();
    } catch (error) {
      toast.error('Bulk action failed');
    }
  };

  const bulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} hero block(s)?`)) return;
    try {
      await Promise.all(selected.map((id) => api.delete(`/hero/${id}`)));
      toast.success('Blocks deleted');
      setSelected([]);
      fetchBlocks();
    } catch (error) {
      toast.error('Bulk delete failed');
    }
  };

  const filtered = blocks.filter((block) => {
    const matchesSearch = (block.title + ' ' + (block.subtitle ?? '') + ' ' + (block.seoLabel ?? '') + ' ' + (block.badge ?? ''))
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || block.status === statusFilter;
    const matchesActive =
      activeFilter === 'all' || (activeFilter === 'active' ? block.isActive : !block.isActive);
    return matchesSearch && matchesStatus && matchesActive;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hero Manager</h2>
          <p className="text-slate-500 dark:text-slate-400">Build the editorial hero — drag to reorder, publish, schedule and control visibility.</p>
        </div>
        <Link to="/hero/create" className="admin-btn-primary py-2.5 px-4 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Hero Block
        </Link>
      </div>

      <div className="admin-card p-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search hero blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-input pl-10"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="admin-input">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)} className="admin-input">
          <option value="all">Active + inactive</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      {selected.length > 0 && (
        <div className="admin-card p-3 flex flex-wrap items-center gap-2 border-amber-300 dark:border-amber-700">
          <CheckSquare className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium mr-2">{selected.length} selected</span>
          <button onClick={() => bulkUpdate({ isActive: true }, 'Blocks activated')} className="admin-btn-secondary text-xs px-3 py-1.5">
            Activate
          </button>
          <button onClick={() => bulkUpdate({ isActive: false }, 'Blocks deactivated')} className="admin-btn-secondary text-xs px-3 py-1.5">
            Deactivate
          </button>
          <button onClick={() => bulkUpdate({ status: 'published' }, 'Blocks published')} className="admin-btn-secondary text-xs px-3 py-1.5">
            Publish
          </button>
          <button onClick={() => bulkUpdate({ status: 'draft' }, 'Blocks moved to draft')} className="admin-btn-secondary text-xs px-3 py-1.5">
            Unpublish
          </button>
          <button onClick={bulkDelete} className="admin-btn-danger text-xs px-3 py-1.5">
            Delete
          </button>
        </div>
      )}

      <div ref={listRef} className="space-y-3">
        {loading ? (
          <div className="admin-card flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-card p-16 text-center">
            <p className="text-slate-500 dark:text-slate-400">No hero blocks found. Create your first editorial panel.</p>
          </div>
        ) : (
          filtered.map((block, index) => (
            <div
              key={block._id}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={onDrop}
              onDragEnd={() => {
                setDragIndex(null);
                setDraggingOver(null);
              }}
              className={`admin-card p-4 flex items-center gap-4 cursor-grab active:cursor-grabbing transition-all ${
                draggingOver === index && dragIndex !== null && dragIndex !== index
                  ? 'ring-2 ring-amber-400 border-amber-400'
                  : ''
              } ${dragIndex === index ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(block._id)}
                  onChange={() => toggleSelect(block._id)}
                  className="w-4 h-4"
                />
                <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600" />
              </div>
              <div className="w-28 h-16 shrink-0 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800">
                {block.image ? (
                  <img src={block.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">NO IMAGE</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{block.title}</h3>
                  <span className="text-xs text-slate-400">#{block.priority ?? index}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="truncate max-w-[220px]">{block.subtitle || block.seoLabel || '—'}</span>
                  {block.scheduledStart || block.scheduledEnd ? (
                    <span className="inline-flex items-center gap-1 shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      {block.scheduledStart ? new Date(block.scheduledStart).toLocaleDateString() : '…'} →{' '}
                      {block.scheduledEnd ? new Date(block.scheduledEnd).toLocaleDateString() : '∞'}
                    </span>
                  ) : null}
                </div>
              </div>
              <VisibilityIcons visibility={block.visibility} />
              <div className="flex flex-col items-end gap-1.5">
                <StatusBadge block={block} />
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDuplicate(block._id)}
                    title="Duplicate"
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                  >
                    <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                  <Link to={`/hero/${block._id}/edit`} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md" title="Edit">
                    <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </Link>
                  <button
                    onClick={() => handleDelete(block._id)}
                    title="Delete"
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
