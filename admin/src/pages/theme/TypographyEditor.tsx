import { useState, useEffect } from 'react';
import { Type, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function TypographyEditor() {
  const [settings, setSettings] = useState({
    headingFont: 'Cormorant Garamond',
    bodyFont: 'Inter',
    baseSize: '16px',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.data?.typography) {
        setSettings(response.data.data.typography);
      }
    } catch (error) {
      console.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings/typography', settings);
      toast.success('Typography settings saved');
    } catch (error) {
      toast.error('Failed to save typography settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Typography</h2>
          <p className="text-slate-500 dark:text-slate-400">Configure fonts and text styles</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="admin-btn-primary py-2.5 px-4 flex items-center"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>

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
                onChange={(e) => setSettings({ ...settings, headingFont: e.target.value })}
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
                onChange={(e) => setSettings({ ...settings, bodyFont: e.target.value })}
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
                onChange={(e) => setSettings({ ...settings, baseSize: e.target.value })}
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
    </div>
  );
}