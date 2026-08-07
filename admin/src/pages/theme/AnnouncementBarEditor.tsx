import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Megaphone, Eye } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import StickySaveBar from '../../components/ui/StickySaveBar';
import PageSpinner from '../../components/ui/PageSpinner';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface AnnouncementSettings {
  enabled: boolean;
  messages: string[];
}

export default function AnnouncementBarEditor() {
  const { dirty, setDirty } = useUnsavedChanges();
  const [announcement, setAnnouncement] = useState<AnnouncementSettings>({ enabled: true, messages: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const baselineRef = useRef<AnnouncementSettings>({ enabled: true, messages: [] });

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const fetchAnnouncement = async () => {
    try {
      const response = await api.get('/settings');
      const data: AnnouncementSettings = {
        enabled: response.data.data?.announcement?.enabled ?? true,
        messages: (response.data.data?.announcement?.messages ?? []).filter(Boolean),
      };
      setAnnouncement(data);
      baselineRef.current = data;
    } catch (error) {
      toast.error('Failed to load announcement settings');
    } finally {
      setLoading(false);
    }
  };

  const update = (patch: Partial<AnnouncementSettings>) => {
    setAnnouncement((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const addMessage = () => {
    const text = newMessage.trim();
    if (!text) return;
    update({ messages: [...announcement.messages, text] });
    setNewMessage('');
  };

  const removeMessage = (index: number) => {
    update({ messages: announcement.messages.filter((_, i) => i !== index) });
  };

  const moveMessage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= announcement.messages.length) return;
    const next = [...announcement.messages];
    [next[index], next[target]] = [next[target], next[index]];
    update({ messages: next });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const messages = announcement.messages.map((m) => m.trim()).filter(Boolean);
      await api.put('/settings/announcement', { enabled: announcement.enabled, messages });
      setAnnouncement({ enabled: announcement.enabled, messages });
      baselineRef.current = { enabled: announcement.enabled, messages };
      setDirty(false);
      toast.success('Announcement bar saved');
    } catch (error) {
      toast.error('Failed to save announcement bar');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setAnnouncement(baselineRef.current);
    setDirty(false);
  };

  if (loading) {
    return <PageSpinner label="Loading announcement bar…" />;
  }

  const showPreview = announcement.enabled && announcement.messages.filter(Boolean).length > 0;

  return (
    <PageShell title="Announcement Bar" subtitle="The scrolling ticker shown above the navbar on every page">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages */}
        <div className="lg:col-span-2 space-y-6">
          <div className="admin-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                <Megaphone className="w-5 h-5 text-slate-600 dark:text-slate-400" /> Messages
              </h3>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={announcement.enabled}
                  onChange={(e) => update({ enabled: e.target.checked })}
                  className="admin-checkbox"
                />
                Show announcement bar
              </label>
            </div>

            <div className="space-y-2">
              {announcement.messages.map((message, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveMessage(index, -1)}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                      aria-label="Move message up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMessage(index, 1)}
                      disabled={index === announcement.messages.length - 1}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                      aria-label="Move message down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) =>
                      update({ messages: announcement.messages.map((m, i) => (i === index ? e.target.value : m)) })
                    }
                    className="admin-input flex-1"
                    placeholder="Announcement message…"
                  />
                  <button
                    type="button"
                    onClick={() => removeMessage(index)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                    aria-label="Remove message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {announcement.messages.length === 0 && (
                <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No messages yet — add one below. The bar stays hidden until a message exists.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMessage();
                  }
                }}
                className="admin-input flex-1"
                placeholder="e.g. Complimentary shipping on orders over $100"
              />
              <button
                type="button"
                onClick={addMessage}
                className="admin-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add message
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The bar scrolls as a continuous marquee on the storefront. Colors and the on/off switch live in the{' '}
            <a href="/theme/editor" className="underline hover:text-slate-700 dark:hover:text-slate-200">
              Theme Editor
            </a>{' '}
            under the Announcement Bar color group. This editor controls content only.
          </p>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-1">
          <div className="admin-card p-6 sticky top-24">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              <Eye className="w-5 h-5 text-slate-600 dark:text-slate-400" /> Live preview
            </h3>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="bg-slate-900 dark:bg-slate-950 px-4 py-3 flex items-center justify-between">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="bg-white dark:bg-slate-900">
                {showPreview ? (
                  <div className="overflow-hidden bg-[var(--announcement-background, #000000)] py-1.5 text-[var(--announcement-text, #ffffff)]">
                    <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap">
                      {[...announcement.messages.filter(Boolean), ...announcement.messages.filter(Boolean)].map((m, i) => (
                        <span key={i} className="flex items-center gap-12 text-[9px] font-medium uppercase tracking-wider">
                          {m}
                          <span className="text-[var(--announcement-accent, #c9a227)]">✦</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-16 text-xs text-slate-400">
                    Bar hidden — enable it and add a message
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-semibold tracking-lux-sm uppercase text-slate-800 dark:text-slate-100">
                    BRISTI
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
              Matches the storefront marquee. Actual colors follow the active theme's Announcement Bar tokens.
            </p>
          </div>
        </div>
      </div>

      <StickySaveBar
        dirty={dirty}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        saveLabel="Save Announcement Bar"
      />
    </PageShell>
  );
}
