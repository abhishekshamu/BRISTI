import { useState, useEffect, useRef } from 'react';
import { Type } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import StickySaveBar from '../../components/ui/StickySaveBar';
import PageSpinner from '../../components/ui/PageSpinner';
import { useUnsavedChanges } from '../../lib/unsaved-context';

export default function TypographyEditor() {
  const { dirty, setDirty } = useUnsavedChanges();
  const [settings, setSettings] = useState({
    headingFont: 'Cormorant Garamond',
    bodyFont: 'Inter',
    baseSize: '16px',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const baselineRef = useRef<typeof settings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.data?.typography) {
        setSettings(response.data.data.typography);
        baselineRef.current = response.data.data.typography;
      }
    } catch (error) {
      console.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = (next: typeof settings) => {
    setSettings(next);
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings/typography', settings);
      setDirty(false);
      baselineRef.current = settings;
      toast.success('Typography settings saved');
    } catch (error) {
      toast.error('Failed to save typography settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (baselineRef.current) {
      setSettings(baselineRef.current);
    }
    setDirty(false);
  };

  if (loading) {
    return <PageSpinner label="Loading typography…" />;
  }

  return (
    <PageShell title="Typography" subtitle="Configure fonts and text styles">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fonts */}
        <div className="admin-card p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Type className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Fonts</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Heading Font</label>
              <select
                value={settings.headingFont}
                onChange={(e) => updateSettings({ ...settings, headingFont: e.target.value })}
                className="admin-input mt-1"
              >
                <option value="Cormorant Garamond">Cormorant Garamond</option>
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="Montserrat">Montserrat</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Body Font</label>
              <select
                value={settings.bodyFont}
                onChange={(e) => updateSettings({ ...settings, bodyFont: e.target.value })}
                className="admin-input mt-1"
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Poppins">Poppins</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Base Font Size</label>
              <input
                type="text"
                value={settings.baseSize}
                onChange={(e) => updateSettings({ ...settings, baseSize: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Preview</h3>
          <div className="space-y-4">
            <h1 style={{ fontFamily: settings.headingFont, fontSize: '2.25rem', fontWeight: 700 }}>
              Heading 1
            </h1>
            <h2 style={{ fontFamily: settings.headingFont, fontSize: '1.875rem', fontWeight: 600 }}>
              Heading 2
            </h2>
            <h3 style={{ fontFamily: settings.headingFont, fontSize: '1.5rem', fontWeight: 600 }}>
              Heading 3
            </h3>
            <p style={{ fontFamily: settings.bodyFont, fontSize: settings.baseSize, lineHeight: 1.5 }}>
              This is a paragraph of body text using the configured body font and size settings.
            </p>
            <code style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
              const example = 'code snippet';
            </code>
          </div>
        </div>
      </div>

      <StickySaveBar
        dirty={dirty}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        saveLabel="Save Settings"
      />
    </PageShell>
  );
}
