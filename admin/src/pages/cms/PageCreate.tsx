import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import MediaPicker from '../../components/media/MediaPicker';
import PageShell from '../../components/ui/PageShell';
import StickySaveBar from '../../components/ui/StickySaveBar';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface PageForm {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  status: 'draft' | 'published' | 'archived';
  isInMenu: boolean;
  menuOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string;
}

export default function PageCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { dirty, setDirty } = useUnsavedChanges();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<PageForm>({
    defaultValues: {
      status: 'draft',
      isInMenu: false,
      menuOrder: 0,
      seoKeywords: '',
    },
  });

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  const content = watch('content');
  const featuredImage = watch('featuredImage');

  const onSubmit = async (data: PageForm) => {
    try {
      setLoading(true);
      // Backend stores SEO under a nested `seo` object; the flat form fields
      // are mapped here so SEO settings are not silently dropped.
      const { seoTitle, seoDescription, seoKeywords, ...rest } = data;
      const payload = {
        ...rest,
        seo: {
          ...(seoTitle ? { title: seoTitle } : {}),
          ...(seoDescription ? { description: seoDescription } : {}),
          ...(seoKeywords
            ? { keywords: seoKeywords.split(',').map((k: string) => k.trim()).filter(Boolean) }
            : {}),
        },
      };
      const response = await api.post('/pages', payload);
      toast.success('Page created successfully');
      navigate(`/pages/${response.data.data._id}/edit`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Add Page"
      subtitle="Create a new CMS page"
      breadcrumbs={[{ label: 'Pages', to: '/pages' }]}
      backTo="/pages"
      sidebar={
        <>
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="admin-label">Status</label>
                <select
                  {...register('status')}
                  className="admin-input mt-1"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="admin-label">Show in Menu</label>
                <input
                  type="checkbox"
                  {...register('isInMenu')}
                  className="w-4 h-4"
                />
              </div>

              <div>
                <label className="admin-label">Menu Order</label>
                <input
                  type="number"
                  {...register('menuOrder', { valueAsNumber: true })}
                  className="admin-input mt-1"
                />
              </div>
            </div>
          </div>

          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">SEO</h3>
            <div className="space-y-4">
              <div>
                <label className="admin-label">SEO Title</label>
                <input
                  {...register('seoTitle')}
                  className="admin-input mt-1"
                />
              </div>
              <div>
                <label className="admin-label">SEO Description</label>
                <textarea
                  {...register('seoDescription')}
                  rows={2}
                  className="admin-input mt-1"
                />
              </div>
              <div>
                <label className="admin-label">SEO Keywords</label>
                <input
                  {...register('seoKeywords')}
                  className="admin-input mt-1"
                />
              </div>
            </div>
          </div>
        </>
      }
    >
      <form id="page-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Content</h3>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Title</label>
              <input
                {...register('title', { required: 'Title is required' })}
                className="admin-input mt-1"
                placeholder="Page title"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
            </div>

            <div>
              <label className="admin-label">Slug</label>
              <input
                {...register('slug', { required: 'Slug is required' })}
                className="admin-input mt-1"
                placeholder="page-url-slug"
              />
              {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
            </div>

            <div>
              <label className="admin-label">Content</label>
              <div className="mt-1">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={(value) => setValue('content', value, { shouldDirty: true })}
                  style={{ height: '300px' }}
                />
              </div>
            </div>

            <div>
              <label className="admin-label">Excerpt</label>
              <textarea
                {...register('excerpt')}
                rows={2}
                className="admin-input mt-1"
                placeholder="Brief excerpt"
              />
            </div>

            <div>
              <MediaPicker
                label="Featured Image"
                value={featuredImage}
                onChange={(url) => setValue('featuredImage', url, { shouldDirty: true })}
                ratio="editorial"
                folder="pages"
              />
            </div>
          </div>
        </div>
      </form>
      <StickySaveBar
        dirty={dirty}
        saving={loading}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/pages')}
        saveLabel="Save Page"
      />
    </PageShell>
  );
}