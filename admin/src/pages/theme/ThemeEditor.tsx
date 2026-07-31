import { useState, useEffect } from 'react';
import { Palette, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface ThemeSettings {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    baseSize: string;
  };
  layout: {
    headerStyle: string;
    footerStyle: string;
  };
}

export default function ThemeEditor() {
  const [settings, setSettings] = useState<ThemeSettings>({
    colors: {
      primary: '#000000',
      secondary: '#FFFFFF',
      background: '#FFFFFF',
      text: '#000000',
      accent: '#C9A227',
    },
    typography: {
      headingFont: 'Cormorant Garamond',
      bodyFont: 'Inter',
      baseSize: '16px',
    },
    layout: {
      headerStyle: 'classic',
      footerStyle: 'classic',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.data) {
        const data = response.data.data;
        setSettings({
          colors: data.colors || settings.colors,
          typography: data.typography || settings.typography,
          layout: data.layout || settings.layout,
        });
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
      await api.put('/settings', settings);
      toast.success('Theme saved successfully');
    } catch (error) {
      toast.error('Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const updateColor = (key: keyof ThemeSettings['colors'], value: string) => {
    setSettings({
      ...settings,
      colors: { ...settings.colors, [key]: value }
    });
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Theme Editor</h2>
          <p className="text-slate-500 dark:text-slate-400">Customize your store's appearance</p>
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
              Save Theme
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Color settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="admin-card p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Palette className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Colors</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(settings.colors).map(([key, value]) => (
                <div key={key}>
                  <label className="admin-label capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => updateColor(key as keyof ThemeSettings['colors'], e.target.value)}
                      className="w-12 h-10 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateColor(key as keyof ThemeSettings['colors'], e.target.value)}
                      className="admin-input flex-1 text-sm font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Preview</h3>
            <div
              className="p-6 rounded-lg"
              style={{
                backgroundColor: settings.colors.background,
                color: settings.colors.text,
              }}
            >
              <div className="space-y-4">
                <h4 className="text-2xl font-bold" style={{ color: settings.colors.primary }}>
                  Heading Text
                </h4>
                <p style={{ color: settings.colors.text }}>
                  This is a preview of your theme colors and typography settings.
                </p>
                <button
                  className="px-4 py-2 rounded-md text-white"
                  style={{ backgroundColor: settings.colors.primary }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded-md text-white ml-2"
                  style={{ backgroundColor: settings.colors.accent }}
                >
                  Accent Button
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Typography</h3>
            <div className="space-y-4">
              <div>
                <label className="admin-label">Heading Font</label>
                <select
                  value={settings.typography.headingFont}
                  onChange={(e) => setSettings({
                    ...settings,
                    typography: { ...settings.typography, headingFont: e.target.value }
                  })}
                  className="admin-input mt-1"
                >
                  <option value="Cormorant Garamond">Cormorant Garamond</option>
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Playfair Display">Playfair Display</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Body Font</label>
                <select
                  value={settings.typography.bodyFont}
                  onChange={(e) => setSettings({
                    ...settings,
                    typography: { ...settings.typography, bodyFont: e.target.value }
                  })}
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
                  value={settings.typography.baseSize}
                  onChange={(e) => setSettings({
                    ...settings,
                    typography: { ...settings.typography, baseSize: e.target.value }
                  })}
                  className="admin-input mt-1"
                />
              </div>
            </div>
          </div>

          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Layout</h3>
            <div className="space-y-4">
              <div>
                <label className="admin-label">Header Style</label>
                <select
                  value={settings.layout.headerStyle}
                  onChange={(e) => setSettings({
                    ...settings,
                    layout: { ...settings.layout, headerStyle: e.target.value }
                  })}
                  className="admin-input mt-1"
                >
                  <option value="classic">Classic</option>
                  <option value="modern">Modern</option>
                  <option value="minimal">Minimal</option>
                  <option value="transparent">Transparent</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Footer Style</label>
                <select
                  value={settings.layout.footerStyle}
                  onChange={(e) => setSettings({
                    ...settings,
                    layout: { ...settings.layout, footerStyle: e.target.value }
                  })}
                  className="admin-input mt-1"
                >
                  <option value="classic">Classic</option>
                  <option value="modern">Modern</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}