import { useState, useEffect } from 'react';
import { Store, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface SiteSettings {
  brandName: string;
  logo: string;
  favicon: string;
  slogan: string;
  currency: string;
  taxRate: number;
  freeShippingThreshold: number;
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
  socialLinks: Array<{
    platform: string;
    url: string;
  }>;
  announcement?: {
    enabled?: boolean;
    messages?: string[];
  };
  homepageSections?: Array<{
    type: string;
    props?: any;
    sortOrder?: number;
    isActive?: boolean;
  }>;
}

export default function Settings() {
  const [settings, setSettings] = useState<SiteSettings>({
    brandName: 'BRISTI',
    logo: '',
    favicon: '',
    slogan: 'Premium E-commerce',
    currency: 'USD',
    taxRate: 10,
    freeShippingThreshold: 100,
    contactInfo: {
      email: 'support@bristi.com',
      phone: '+1 234 567 8900',
      address: '123 Commerce St, City, Country',
    },
    socialLinks: [],
  });
  const [saving, setSaving] = useState(false);
  const [messagesText, setMessagesText] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.data) {
        const data = response.data.data;
        setSettings(data);
        setMessagesText((data.announcement?.messages ?? []).join('\n'));
      }
    } catch (error) {
      console.error('Failed to fetch settings');
    }
  };

  const getSection = (type: string) => settings.homepageSections?.find((s) => s.type === type);

  const updateSection = (type: string, props: any) => {
    const sections = [...(settings.homepageSections ?? [])];
    const index = sections.findIndex((s) => s.type === type);
    if (index >= 0) {
      sections[index] = { ...sections[index], props: { ...sections[index].props, ...props } };
    } else {
      sections.push({ type, props, sortOrder: sections.length + 1, isActive: true });
    }
    setSettings({ ...settings, homepageSections: sections });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...settings,
        announcement: {
          ...(settings.announcement ?? {}),
          messages: messagesText.split('\n').map((m) => m.trim()).filter(Boolean),
        },
      };
      await api.put('/settings', payload);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h2>
          <p className="text-slate-500 dark:text-slate-400">Configure your store settings</p>
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
        {/* General */}
        <div className="admin-card p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Store className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">General</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Brand Name</label>
              <input
                type="text"
                value={settings.brandName}
                onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Slogan</label>
              <input
                type="text"
                value={settings.slogan}
                onChange={(e) => setSettings({ ...settings, slogan: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Logo URL</label>
              <input
                type="text"
                value={settings.logo}
                onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Favicon URL</label>
              <input
                type="text"
                value={settings.favicon}
                onChange={(e) => setSettings({ ...settings, favicon: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
          </div>
        </div>

        {/* Currency & Tax */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Currency & Tax</h3>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="admin-input mt-1"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) })}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Free Shipping Threshold ($)</label>
              <input
                type="number"
                value={settings.freeShippingThreshold}
                onChange={(e) => setSettings({ ...settings, freeShippingThreshold: parseFloat(e.target.value) })}
                className="admin-input mt-1"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Contact Information</h3>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Email</label>
              <input
                type="email"
                value={settings.contactInfo.email}
                onChange={(e) => setSettings({
                  ...settings,
                  contactInfo: { ...settings.contactInfo, email: e.target.value }
                })}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Phone</label>
              <input
                type="text"
                value={settings.contactInfo.phone}
                onChange={(e) => setSettings({
                  ...settings,
                  contactInfo: { ...settings.contactInfo, phone: e.target.value }
                })}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Address</label>
              <textarea
                value={settings.contactInfo.address}
                onChange={(e) => setSettings({
                  ...settings,
                  contactInfo: { ...settings.contactInfo, address: e.target.value }
                })}
                rows={2}
                className="admin-input mt-1"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Social Links</h3>
          <div className="space-y-4">
            {['Facebook', 'Twitter', 'Instagram', 'LinkedIn', 'YouTube'].map((platform) => (
              <div key={platform}>
                <label className="admin-label">{platform} URL</label>
                <input
                  type="text"
                  value={settings.socialLinks.find(l => l.platform === platform)?.url || ''}
                  onChange={(e) => {
                    const newLinks = settings.socialLinks.filter(l => l.platform !== platform);
                    if (e.target.value) {
                      newLinks.push({ platform, url: e.target.value });
                    }
                    setSettings({ ...settings, socialLinks: newLinks });
                  }}
                  className="admin-input mt-1"
                  placeholder={`https://${platform.toLowerCase()}.com/yourpage`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Announcement Bar */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Announcement Bar</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.announcement?.enabled ?? true}
                onChange={(e) => setSettings({
                  ...settings,
                  announcement: { ...(settings.announcement ?? {}), enabled: e.target.checked },
                })}
                className="h-4 w-4"
              />
              <label className="admin-label mb-0">Show announcement bar</label>
            </div>
            <div>
              <label className="admin-label">Messages (one per line)</label>
              <textarea
                value={messagesText}
                onChange={(e) => setMessagesText(e.target.value)}
                rows={5}
                placeholder={'Complimentary shipping on orders over $100\nNew season, new silhouettes'}
                className="admin-input mt-1 font-mono text-xs"
              />
              <p className="mt-1 text-xs text-slate-400">Each line scrolls in rotation across the top of the store.</p>
            </div>
          </div>
        </div>

        {/* Homepage Hero */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Homepage Hero</h3>
          {(() => {
            const hero = getSection('hero')?.props ?? {};
            return (
              <div className="space-y-4">
                <div>
                  <label className="admin-label">Image URL</label>
                  <input
                    type="text"
                    value={hero.image || ''}
                    onChange={(e) => updateSection('hero', { image: e.target.value })}
                    className="admin-input mt-1"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div>
                  <label className="admin-label">Eyebrow</label>
                  <input
                    type="text"
                    value={hero.eyebrow || ''}
                    onChange={(e) => updateSection('hero', { eyebrow: e.target.value })}
                    className="admin-input mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="admin-label">Heading Line 1</label>
                    <input
                      type="text"
                      value={hero.headingLine1 || ''}
                      onChange={(e) => updateSection('hero', { headingLine1: e.target.value })}
                      className="admin-input mt-1"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Heading Line 2 (gold)</label>
                    <input
                      type="text"
                      value={hero.headingLine2 || ''}
                      onChange={(e) => updateSection('hero', { headingLine2: e.target.value })}
                      className="admin-input mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="admin-label">Subheading</label>
                  <textarea
                    value={hero.subheading || ''}
                    onChange={(e) => updateSection('hero', { subheading: e.target.value })}
                    rows={2}
                    className="admin-input mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="admin-label">Primary CTA Label</label>
                    <input
                      type="text"
                      value={hero.primaryCta?.label || ''}
                      onChange={(e) => updateSection('hero', { primaryCta: { label: e.target.value, to: hero.primaryCta?.to || '/collections' } })}
                      className="admin-input mt-1"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Primary CTA Link</label>
                    <input
                      type="text"
                      value={hero.primaryCta?.to || ''}
                      onChange={(e) => updateSection('hero', { primaryCta: { to: e.target.value, label: hero.primaryCta?.label || '' } })}
                      className="admin-input mt-1"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Secondary CTA Label</label>
                    <input
                      type="text"
                      value={hero.secondaryCta?.label || ''}
                      onChange={(e) => updateSection('hero', { secondaryCta: { label: e.target.value, to: hero.secondaryCta?.to || '/shop' } })}
                      className="admin-input mt-1"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Secondary CTA Link</label>
                    <input
                      type="text"
                      value={hero.secondaryCta?.to || ''}
                      onChange={(e) => updateSection('hero', { secondaryCta: { to: e.target.value, label: hero.secondaryCta?.label || '' } })}
                      className="admin-input mt-1"
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Campaign Banner */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Campaign Banner</h3>
          {(() => {
            const campaign = getSection('campaign-banner')?.props ?? {};
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={getSection('campaign-banner')?.isActive ?? true}
                    onChange={(e) => {
                      const sections = [...(settings.homepageSections ?? [])];
                      const index = sections.findIndex((s) => s.type === 'campaign-banner');
                      if (index >= 0) {
                        sections[index] = { ...sections[index], isActive: e.target.checked };
                        setSettings({ ...settings, homepageSections: sections });
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <label className="admin-label mb-0">Show campaign banner</label>
                </div>
                <div>
                  <label className="admin-label">Image URL</label>
                  <input
                    type="text"
                    value={campaign.image || ''}
                    onChange={(e) => updateSection('campaign-banner', { image: e.target.value })}
                    className="admin-input mt-1"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="admin-label">Eyebrow</label>
                    <input
                      type="text"
                      value={campaign.eyebrow || ''}
                      onChange={(e) => updateSection('campaign-banner', { eyebrow: e.target.value })}
                      className="admin-input mt-1"
                    />
                  </div>
                  <div>
                    <label className="admin-label">Title</label>
                    <input
                      type="text"
                      value={campaign.title || ''}
                      onChange={(e) => updateSection('campaign-banner', { title: e.target.value })}
                      className="admin-input mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="admin-label">Description</label>
                  <textarea
                    value={campaign.description || ''}
                    onChange={(e) => updateSection('campaign-banner', { description: e.target.value })}
                    rows={2}
                    className="admin-input mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="admin-label">CTA Label</label>
                    <input
                      type="text"
                      value={campaign.cta?.label || ''}
                      onChange={(e) => updateSection('campaign-banner', { cta: { label: e.target.value, to: campaign.cta?.to || '/collections' } })}
                      className="admin-input mt-1"
                    />
                  </div>
                  <div>
                    <label className="admin-label">CTA Link</label>
                    <input
                      type="text"
                      value={campaign.cta?.to || ''}
                      onChange={(e) => updateSection('campaign-banner', { cta: { to: e.target.value, label: campaign.cta?.label || '' } })}
                      className="admin-input mt-1"
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}