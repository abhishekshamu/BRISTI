import { useState, useEffect } from 'react';
import { GripVertical, Plus, Trash2, Settings, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface BuilderSection {
  id: string;
  type: 'hero' | 'product-grid' | 'banner' | 'text' | 'video' | 'image-gallery' | 'testimonials' | 'newsletter' | 'custom';
  props: Record<string, any>;
  order: number;
}

export default function PageBuilder() {
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [pageName, setPageName] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageId, setPageId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const addSection = (type: string) => {
    const newSection: BuilderSection = {
      id: Date.now().toString(),
      type: type as any,
      props: {},
      order: sections.length,
    };
    setSections([...sections, newSection]);
    setSelectedSection(newSection.id);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (selectedSection === id) {
      setSelectedSection(null);
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSections.length) return;
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    newSections.forEach((s, i) => s.order = i);
    setSections(newSections);
  };

  const updateSectionProp = (id: string, key: string, value: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, props: { ...s.props, [key]: value } } : s));
  };

  const handleSave = async () => {
    if (!pageName.trim()) {
      toast.error('Page name is required');
      return;
    }

    try {
      setSaving(true);
      const builderSections = sections.map((s, idx) => ({
        type: s.type,
        props: s.props,
        sortOrder: s.order ?? idx,
        isActive: true,
      }));

      if (pageId) {
        await api.put(`/pages/${pageId}`, {
          title: pageName,
          slug: pageSlug || pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          builderSections,
        });
        toast.success('Page updated successfully');
      } else {
        const response = await api.post('/pages', {
          title: pageName,
          slug: pageSlug || pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          content: {},
          builderSections,
        });
        setPageId(response.data.data._id);
        toast.success('Page created successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const selectedSectionData = sections.find(s => s.id === selectedSection);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Page Builder</h2>
          <p className="text-slate-500 dark:text-slate-400">Build custom pages with drag and drop</p>
        </div>
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={pageName}
            onChange={(e) => setPageName(e.target.value)}
            placeholder="Page name"
            className="admin-input"
          />
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
                Save Page
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section palette */}
        <div className="lg:col-span-1">
          <div className="admin-card p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Sections</h3>
            <div className="space-y-2">
              {[
                { type: 'hero', label: 'Hero Section', icon: '🎯' },
                { type: 'product-grid', label: 'Product Grid', icon: '📦' },
                { type: 'banner', label: 'Banner', icon: '🖼️' },
                { type: 'text', label: 'Text Block', icon: '📝' },
                { type: 'video', label: 'Video', icon: '🎬' },
                { type: 'image-gallery', label: 'Image Gallery', icon: '🖼️' },
                { type: 'testimonials', label: 'Testimonials', icon: '💬' },
                { type: 'newsletter', label: 'Newsletter', icon: '📧' },
                { type: 'custom', label: 'Custom', icon: '⚙️' },
              ].map((section) => (
                <button
                  key={section.type}
                  onClick={() => addSection(section.type)}
                  className="w-full flex items-center space-x-3 p-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <span className="text-2xl">{section.icon}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{section.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-2">
          <div className="admin-card p-6 min-h-[600px]">
            {sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                <Plus className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 mb-4">No sections added yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">Add sections from the left panel</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedSection === section.id
                        ? 'border-slate-900 dark:border-slate-50 ring-2 ring-slate-900/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedSection(section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <GripVertical className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                            {section.type.replace('-', ' ')}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Section {index + 1}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveSection(index, 'up'); }}
                          disabled={index === 0}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveSection(index, 'down'); }}
                          disabled={index === sections.length - 1}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Properties panel */}
        <div className="lg:col-span-1">
          {selectedSectionData ? (
            <div className="admin-card p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Section Properties</h3>
              <div className="space-y-4">
                <div>
                  <label className="admin-label">Type</label>
                  <input
                    type="text"
                    value={selectedSectionData.type}
                    disabled
                    className="admin-input mt-1 bg-slate-100 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="admin-label">Background</label>
                  <input
                    type="color"
                    value={selectedSectionData.props.backgroundColor || '#ffffff'}
                    onChange={(e) => updateSectionProp(selectedSectionData.id, 'backgroundColor', e.target.value)}
                    className="admin-input mt-1 h-10"
                  />
                </div>
                <div>
                  <label className="admin-label">Padding</label>
                  <input
                    type="text"
                    value={selectedSectionData.props.padding || ''}
                    onChange={(e) => updateSectionProp(selectedSectionData.id, 'padding', e.target.value)}
                    className="admin-input mt-1"
                    placeholder="e.g. 40px 20px"
                  />
                </div>
                <div>
                  <label className="admin-label">Custom CSS</label>
                  <textarea
                    rows={4}
                    value={selectedSectionData.props.customCss || ''}
                    onChange={(e) => updateSectionProp(selectedSectionData.id, 'customCss', e.target.value)}
                    className="admin-input mt-1 font-mono text-sm"
                    placeholder=".section { }"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-card p-6 text-center">
              <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select a section to edit
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}