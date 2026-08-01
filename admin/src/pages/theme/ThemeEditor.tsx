import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy,
  Download,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Sun,
  Upload,
  Zap,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import type { ThemeSettings, ThemeButtons, ThemeTypography, ThemeEffects } from '@shared/types';
import { themePresets, resolvePreset, type ThemePresetName } from '@shared/theme';
import {
  COLOR_GROUPS,
  FONT_OPTIONS,
  TRANSFORM_OPTIONS,
  HEADING_SIZE_FIELDS,
  BREAKPOINT_LABELS,
} from '../../lib/theme-schema';

type Tab = 'overview' | 'colors' | 'typography' | 'buttons' | 'headerFooter' | 'effects';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'headerFooter', label: 'Header & Footer' },
  { id: 'effects', label: 'Effects' },
];

interface ThemeListEntry {
  _id: string;
  name: string;
  isActive: boolean;
  isDark: boolean;
}

const IS_HEX = /^#[0-9a-fA-F]{6}$/;

export default function ThemeEditor() {
  const [tab, setTab] = useState<Tab>('overview');
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [themeList, setThemeList] = useState<ThemeListEntry[]>([]);
  const [colorFilter, setColorFilter] = useState('');
  const [applyingPreset, setApplyingPreset] = useState<ThemePresetName | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTheme = useCallback(async () => {
    const response = await api.get('/theme');
    setTheme(response.data.data as ThemeSettings);
    return response.data.data as ThemeSettings;
  }, []);

  const fetchThemeList = useCallback(async () => {
    try {
      const response = await api.get('/theme/all');
      const list = (response.data.data || []).map((t: any) => ({
        _id: t._id,
        name: t.name,
        isActive: t.isActive,
        isDark: t.isDark,
      }));
      setThemeList(list);
    } catch {
      setThemeList([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await fetchTheme();
        await fetchThemeList();
      } catch (error) {
        console.error('Failed to fetch theme', error);
        toast.error('Failed to load theme');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchTheme, fetchThemeList]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const persist = useCallback(async (data: ThemeSettings) => {
    try {
      setSaving(true);
      await api.put('/theme', data);
      return true;
    } catch (error) {
      console.error('Failed to save theme', error);
      toast.error('Failed to save theme');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const handleChange = useCallback(
    (updater: (prev: ThemeSettings) => ThemeSettings) => {
      setTheme((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        if (autoSave) {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => persist(next), 600);
        }
        return next;
      });
    },
    [autoSave, persist],
  );

  const updateColor = (key: string, value: string) => {
    handleChange((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  const updateTypography = (updater: (prev: ThemeTypography) => ThemeTypography) => {
    handleChange((prev) => ({ ...prev, typography: updater(prev.typography) }));
  };

  const updateButtons = (updater: (prev: ThemeButtons) => ThemeButtons) => {
    handleChange((prev) => ({ ...prev, buttons: updater(prev.buttons) }));
  };

  const updateEffects = (updater: (prev: ThemeEffects) => ThemeEffects) => {
    handleChange((prev) => ({ ...prev, effects: updater(prev.effects) }));
  };

  const handleSave = async () => {
    if (!theme) return;
    const ok = await persist(theme);
    if (ok) {
      toast.success('Theme saved — storefront updates automatically');
      await fetchThemeList();
    }
  };

  const applyPreset = async (name: ThemePresetName) => {
    setApplyingPreset(name);
    try {
      const response = await api.post('/theme/preset', { name });
      const data = response.data.data as ThemeSettings;
      setTheme(data);
      toast.success(`Applied ${name} preset`);
      await fetchThemeList();
    } catch (error) {
      console.error('Failed to apply preset', error);
      toast.error('Failed to apply preset');
    } finally {
      setApplyingPreset(null);
    }
  };

  const resetToDefault = async () => {
    if (!window.confirm('Reset the active theme to the BRISTI default (black/white/gold)?')) return;
    try {
      const response = await api.post('/theme/reset');
      setTheme(response.data.data as ThemeSettings);
      toast.success('Theme reset to default');
      await fetchThemeList();
    } catch (error) {
      console.error('Failed to reset theme', error);
      toast.error('Failed to reset theme');
    }
  };

  const duplicateTheme = async () => {
    try {
      const response = await api.post('/theme/duplicate');
      const created = response.data.data as ThemeSettings;
      toast.success(`Duplicated as "${created.name}"`);
      await fetchThemeList();
    } catch (error) {
      console.error('Failed to duplicate theme', error);
      toast.error('Failed to duplicate theme');
    }
  };

  const exportTheme = () => {
    if (!theme) return;
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bristi-theme-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Theme exported');
  };

  const importTheme = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== 'object' || !parsed.colors) {
          throw new Error('Invalid theme file');
        }
        const merged = resolvePreset('default');
        const imported = {
          name: parsed.name || 'Imported Theme',
          description: parsed.description || '',
          isActive: true,
          isDark: parsed.isDark ?? false,
          colors: { ...(merged.colors || {}), ...(parsed.colors || {}) },
          typography: { ...(merged.typography || {}), ...(parsed.typography || {}) },
          buttons: { ...(merged.buttons || {}), ...(parsed.buttons || {}) },
          header: { ...(merged.header || {}), ...(parsed.header || {}) },
          footer: { ...(merged.footer || {}), ...(parsed.footer || {}) },
          effects: { ...(merged.effects || {}), ...(parsed.effects || {}) },
        } as ThemeSettings;
        setTheme(imported);
        toast.success('Theme imported — review and save');
      } catch (error) {
        console.error('Failed to import theme', error);
        toast.error('Invalid theme file');
      }
    };
    reader.readAsText(file);
  };

  const activateTheme = async (id: string) => {
    try {
      await api.put(`/theme/${id}/activate`);
      toast.success('Theme activated');
      await fetchTheme();
      await fetchThemeList();
    } catch (error) {
      console.error('Failed to activate theme', error);
      toast.error('Failed to activate theme');
    }
  };

  const deleteTheme = async (id: string) => {
    if (!window.confirm('Delete this theme?')) return;
    try {
      await api.delete(`/theme/${id}`);
      toast.success('Theme deleted');
      await fetchThemeList();
    } catch (error) {
      console.error('Failed to delete theme', error);
      toast.error('Failed to delete theme');
    }
  };

  const filteredGroups = useMemo(() => {
    const q = colorFilter.trim().toLowerCase();
    if (!q) return COLOR_GROUPS;
    return COLOR_GROUPS.map((group) => ({
      ...group,
      tokens: group.tokens.filter(
        (t) => t.label.toLowerCase().includes(q) || t.key.toLowerCase().includes(q),
      ),
    })).filter((group) => group.tokens.length > 0);
  }, [colorFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="admin-card p-8 text-center text-slate-500">
        No theme loaded. Refresh the page to retry.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Theme Editor</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Live design engine — changes appear on the storefront within seconds
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoSave((v) => !v)}
            className={`admin-btn py-2 px-3 text-xs ${autoSave ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}
            title="Save automatically on every change"
          >
            <Zap className="w-4 h-4 mr-1.5 inline" />
            Auto-save {autoSave ? 'ON' : 'OFF'}
          </button>
          <button onClick={exportTheme} className="admin-btn-secondary py-2 px-3 flex items-center text-xs">
            <Download className="w-4 h-4 mr-1.5" /> Export
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="admin-btn-secondary py-2 px-3 flex items-center text-xs">
            <Upload className="w-4 h-4 mr-1.5" /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importTheme(file);
              e.target.value = '';
            }}
          />
          <button onClick={duplicateTheme} className="admin-btn-secondary py-2 px-3 flex items-center text-xs">
            <Copy className="w-4 h-4 mr-1.5" /> Duplicate
          </button>
          <button onClick={resetToDefault} className="admin-btn-secondary py-2 px-3 flex items-center text-xs">
            <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="admin-btn-primary py-2.5 px-4 flex items-center text-xs">
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" /> Save Theme
              </>
            )}
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['default', 'dark', 'light'] as ThemePresetName[]).map((name) => (
          <button
            key={name}
            onClick={() => applyPreset(name)}
            disabled={applyingPreset !== null}
            className="admin-card p-4 text-left transition-all hover:shadow-md disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700">
                {name === 'dark' ? <Moon className="w-5 h-5" /> : name === 'light' ? <Sun className="w-5 h-5" /> : <Palette className="w-5 h-5" />}
              </span>
              <div>
                <p className="font-semibold capitalize text-slate-900 dark:text-slate-100">{name} preset</p>
                <p className="text-xs text-slate-500">
                  {name === 'default' ? 'Signature black / white / gold' : name === 'dark' ? 'Dark luxury mode' : 'Bright minimal mode'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-1">
              {Object.entries(themePresets[name].colors || {}).slice(0, 6).map(([key, value]) => (
                <span key={key} className="h-5 w-5 rounded-full border border-slate-200 dark:border-slate-700" style={{ backgroundColor: value }} />
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-b-2 border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Theme Details</h3>
            <div>
              <label className="admin-label">Name</label>
              <input
                value={theme.name}
                onChange={(e) => handleChange((prev) => ({ ...prev, name: e.target.value }))}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Description</label>
              <input
                value={(theme as any).description || ''}
                onChange={(e) => handleChange((prev) => ({ ...prev, description: e.target.value }))}
                className="admin-input mt-1"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">Dark mode</p>
                <p className="text-xs text-slate-500">Marks this theme as a dark design</p>
              </div>
              <button
                onClick={() => handleChange((prev) => ({ ...prev, isDark: !prev.isDark }))}
                className={`relative h-7 w-12 rounded-full transition-colors ${theme.isDark ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${theme.isDark ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="pt-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-600" />
                Live preview: the storefront polls the theme endpoint and updates without a page refresh.
              </p>
            </div>
          </div>

          <div className="admin-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Theme Library</h3>
              <button onClick={duplicateTheme} className="admin-btn-secondary py-1.5 px-3 flex items-center text-xs">
                <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate current
              </button>
            </div>
            <div className="space-y-2">
              {themeList.length === 0 && (
                <p className="text-sm text-slate-500">No saved themes yet.</p>
              )}
              {themeList.map((t) => (
                <div key={t._id} className="flex items-center justify-between rounded border border-slate-200 dark:border-slate-700 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {t.isDark ? <Moon className="w-4 h-4 text-slate-500" /> : <Sun className="w-4 h-4 text-slate-500" />}
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.name}</p>
                      {t.isActive && <p className="text-[10px] uppercase tracking-wide text-emerald-600">Active</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!t.isActive && (
                      <button onClick={() => activateTheme(t._id)} className="admin-btn-secondary py-1 px-3 text-xs">
                        Activate
                      </button>
                    )}
                    {!t.isActive && (
                      <button onClick={() => deleteTheme(t._id)} className="admin-btn-danger py-1 px-2.5" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'colors' && (
        <div className="space-y-6">
          <div className="admin-card p-4">
            <input
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              placeholder="Search colors by name or token…"
              className="admin-input"
            />
          </div>
          {filteredGroups.map((group) => (
            <div key={group.id} className="admin-card p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{group.label}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {group.tokens.map((token) => {
                  const value = theme.colors[token.key] || '';
                  const isHex = IS_HEX.test(value);
                  return (
                    <div key={token.key}>
                      <label className="admin-label">
                        {token.label}
                        <span className="ml-1 font-mono text-[10px] text-slate-400">{token.key}</span>
                      </label>
                      <div className="flex items-center space-x-2 mt-1">
                        {isHex && (
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => updateColor(token.key, e.target.value)}
                            className="w-10 h-10 rounded border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0"
                          />
                        )}
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateColor(token.key, e.target.value)}
                          className="admin-input flex-1 text-sm font-mono"
                        />
                      </div>
                      {!isHex && (
                        <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">alpha/raw CSS value — edit as text</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'typography' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Fonts</h3>
            <div>
              <label className="admin-label">Heading Font</label>
              <select
                value={theme.typography.headingFont}
                onChange={(e) => updateTypography((prev) => ({ ...prev, headingFont: e.target.value }))}
                className="admin-input mt-1"
              >
                {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="admin-label">Body Font</label>
              <select
                value={theme.typography.bodyFont}
                onChange={(e) => updateTypography((prev) => ({ ...prev, bodyFont: e.target.value }))}
                className="admin-input mt-1"
              >
                {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="admin-label">Heading Weight</label>
                <input
                  type="number"
                  value={theme.typography.headingWeight}
                  onChange={(e) => updateTypography((prev) => ({ ...prev, headingWeight: Number(e.target.value) }))}
                  className="admin-input mt-1"
                />
              </div>
              <div>
                <label className="admin-label">Body Weight</label>
                <input
                  type="number"
                  value={theme.typography.bodyWeight}
                  onChange={(e) => updateTypography((prev) => ({ ...prev, bodyWeight: Number(e.target.value) }))}
                  className="admin-input mt-1"
                />
              </div>
              <div>
                <label className="admin-label">Heading Transform</label>
                <select
                  value={theme.typography.headingTransform}
                  onChange={(e) => updateTypography((prev) => ({ ...prev, headingTransform: e.target.value as any }))}
                  className="admin-input mt-1"
                >
                  {TRANSFORM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="admin-label">Heading Line Height</label>
                <input
                  type="number"
                  step="0.05"
                  value={theme.typography.headingLineHeight}
                  onChange={(e) => updateTypography((prev) => ({ ...prev, headingLineHeight: Number(e.target.value) }))}
                  className="admin-input mt-1"
                />
              </div>
              <div>
                <label className="admin-label">Body Line Height</label>
                <input
                  type="number"
                  step="0.05"
                  value={theme.typography.bodyLineHeight}
                  onChange={(e) => updateTypography((prev) => ({ ...prev, bodyLineHeight: Number(e.target.value) }))}
                  className="admin-input mt-1"
                />
              </div>
              <div>
                <label className="admin-label">Heading Letter Spacing</label>
                <input
                  type="text"
                  value={theme.typography.headingLetterSpacing}
                  onChange={(e) => updateTypography((prev) => ({ ...prev, headingLetterSpacing: e.target.value }))}
                  className="admin-input mt-1 font-mono"
                  placeholder="0.02em"
                />
              </div>
              <div>
                <label className="admin-label">Eyebrow Transform</label>
                <select
                  value={theme.typography.eyebrowTransform}
                  onChange={(e) => updateTypography((prev) => ({ ...prev, eyebrowTransform: e.target.value as any }))}
                  className="admin-input mt-1"
                >
                  {TRANSFORM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-label">Eyebrow Letter Spacing</label>
                <input
                  type="text"
                  value={theme.typography.eyebrowLetterSpacing}
                  onChange={(e) => updateTypography((prev) => ({ ...prev, eyebrowLetterSpacing: e.target.value }))}
                  className="admin-input mt-1 font-mono"
                  placeholder="0.35em"
                />
              </div>
            </div>
          </div>

          <div className="admin-card p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Base Font Size</h3>
                <p className="text-xs text-slate-500">px</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(BREAKPOINT_LABELS) as Array<'desktop' | 'tablet' | 'mobile'>).map((bp) => (
                  <div key={bp}>
                    <label className="admin-label">{BREAKPOINT_LABELS[bp]}</label>
                    <input
                      type="number"
                      value={theme.typography.baseSize[bp]}
                      onChange={(e) =>
                        updateTypography((prev) => ({
                          ...prev,
                          baseSize: { ...prev.baseSize, [bp]: Number(e.target.value) },
                        }))
                      }
                      className="admin-input mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Heading Sizes (px)</h3>
              <div className="space-y-3">
                {HEADING_SIZE_FIELDS.map((field) => (
                  <div key={field.key} className="grid grid-cols-4 items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</span>
                    {(Object.keys(BREAKPOINT_LABELS) as Array<'desktop' | 'tablet' | 'mobile'>).map((bp) => (
                      <input
                        key={bp}
                        type="number"
                        value={(theme.typography.headingSizes[field.key] as any)?.[bp] ?? 0}
                        onChange={(e) =>
                          updateTypography((prev) => ({
                            ...prev,
                            headingSizes: {
                              ...prev.headingSizes,
                              [field.key]: {
                                ...(prev.headingSizes as any)[field.key],
                                [bp]: Number(e.target.value),
                              },
                            },
                          }))
                        }
                        className="admin-input text-sm"
                        placeholder={BREAKPOINT_LABELS[bp]}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'buttons' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Button Style</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="admin-label">Radius</label>
                <input type="text" value={theme.buttons.borderRadius} onChange={(e) => updateButtons((prev) => ({ ...prev, borderRadius: e.target.value }))} className="admin-input mt-1 font-mono" />
              </div>
              <div>
                <label className="admin-label">Padding X</label>
                <input type="text" value={theme.buttons.paddingX} onChange={(e) => updateButtons((prev) => ({ ...prev, paddingX: e.target.value }))} className="admin-input mt-1 font-mono" />
              </div>
              <div>
                <label className="admin-label">Padding Y</label>
                <input type="text" value={theme.buttons.paddingY} onChange={(e) => updateButtons((prev) => ({ ...prev, paddingY: e.target.value }))} className="admin-input mt-1 font-mono" />
              </div>
              <div>
                <label className="admin-label">Font Size</label>
                <input type="text" value={theme.buttons.fontSize} onChange={(e) => updateButtons((prev) => ({ ...prev, fontSize: e.target.value }))} className="admin-input mt-1 font-mono" />
              </div>
              <div>
                <label className="admin-label">Font Weight</label>
                <input type="number" value={theme.buttons.fontWeight} onChange={(e) => updateButtons((prev) => ({ ...prev, fontWeight: Number(e.target.value) }))} className="admin-input mt-1" />
              </div>
              <div>
                <label className="admin-label">Text Transform</label>
                <select value={theme.buttons.textTransform} onChange={(e) => updateButtons((prev) => ({ ...prev, textTransform: e.target.value as any }))} className="admin-input mt-1">
                  {TRANSFORM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-label">Letter Spacing</label>
                <input type="text" value={theme.buttons.letterSpacing} onChange={(e) => updateButtons((prev) => ({ ...prev, letterSpacing: e.target.value }))} className="admin-input mt-1 font-mono" />
              </div>
            </div>
          </div>

          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Button Colors</h3>
            {(
              [
                ['primaryBg', 'Primary Background'],
                ['primaryText', 'Primary Text'],
                ['primaryHoverBg', 'Primary Hover'],
                ['goldBg', 'Gold Background'],
                ['goldText', 'Gold Text'],
                ['goldHoverBg', 'Gold Hover'],
                ['outlineText', 'Outline Text'],
                ['outlineBorder', 'Outline Border'],
                ['outlineHoverBg', 'Outline Hover BG'],
                ['outlineHoverText', 'Outline Hover Text'],
                ['ghostText', 'Ghost Text'],
                ['whiteBg', 'White Background'],
                ['whiteText', 'White Text'],
                ['whiteHoverBg', 'White Hover'],
              ] as Array<[keyof ThemeButtons, string]>
            ).map(([key, label]) => {
              const value = theme.buttons[key] as string;
              const isHex = IS_HEX.test(value);
              return (
                <div key={key}>
                  <label className="admin-label">{label}</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {isHex && (
                      <input type="color" value={value} onChange={(e) => updateButtons((prev) => ({ ...prev, [key]: e.target.value }))} className="w-10 h-10 rounded border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0" />
                    )}
                    <input type="text" value={value} onChange={(e) => updateButtons((prev) => ({ ...prev, [key]: e.target.value }))} className="admin-input flex-1 text-sm font-mono" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'headerFooter' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Header</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="admin-label">Height</label>
                <input type="text" value={theme.header.height} onChange={(e) => handleChange((prev) => ({ ...prev, header: { ...prev.header, height: e.target.value } }))} className="admin-input mt-1 font-mono" />
              </div>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 admin-label mb-0 cursor-pointer">
                  <input type="checkbox" checked={theme.header.sticky} onChange={(e) => handleChange((prev) => ({ ...prev, header: { ...prev.header, sticky: e.target.checked } }))} />
                  Sticky
                </label>
                <label className="flex items-center gap-2 admin-label mb-0 cursor-pointer">
                  <input type="checkbox" checked={theme.header.showAnnouncementBar} onChange={(e) => handleChange((prev) => ({ ...prev, header: { ...prev.header, showAnnouncementBar: e.target.checked } }))} />
                  Announcement bar
                </label>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Colors are managed in the Colors tab → Header group. The storefront header renders live against these tokens.
            </p>
          </div>
          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Footer</h3>
            <div>
              <label className="admin-label">Vertical Padding</label>
              <input type="text" value={theme.footer.paddingY} onChange={(e) => handleChange((prev) => ({ ...prev, footer: { ...prev.footer, paddingY: e.target.value } }))} className="admin-input mt-1 font-mono" />
            </div>
            <p className="text-xs text-slate-500">
              Colors are managed in the Colors tab → Footer group.
            </p>
          </div>
        </div>
      )}

      {tab === 'effects' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Radius</h3>
            {(
              [
                ['radiusSm', 'Small'],
                ['radiusMd', 'Medium'],
                ['radiusLg', 'Large'],
              ] as Array<[keyof ThemeEffects, string]>
            ).map(([key, label]) => (
              <div key={key}>
                <label className="admin-label">{label}</label>
                <input type="text" value={theme.effects[key]} onChange={(e) => updateEffects((prev) => ({ ...prev, [key]: e.target.value }))} className="admin-input mt-1 font-mono" />
              </div>
            ))}
          </div>
          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Shadows & Motion</h3>
            {(
              [
                ['shadowSm', 'Shadow Small'],
                ['shadowMd', 'Shadow Medium'],
                ['shadowLg', 'Shadow Large'],
              ] as Array<[keyof ThemeEffects, string]>
            ).map(([key, label]) => (
              <div key={key}>
                <label className="admin-label">{label}</label>
                <input type="text" value={theme.effects[key]} onChange={(e) => updateEffects((prev) => ({ ...prev, [key]: e.target.value }))} className="admin-input mt-1 font-mono" />
              </div>
            ))}
            <div>
              <label className="admin-label">Transition</label>
              <input type="text" value={theme.effects.transition} onChange={(e) => updateEffects((prev) => ({ ...prev, transition: e.target.value }))} className="admin-input mt-1 font-mono" />
            </div>
            <div>
              <label className="admin-label">Marquee Duration</label>
              <input type="text" value={theme.effects.marqueeDuration} onChange={(e) => updateEffects((prev) => ({ ...prev, marqueeDuration: e.target.value }))} className="admin-input mt-1 font-mono" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
