import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import MediaPicker from '../../components/media/MediaPicker';
import api, { FRONTEND_URL } from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import FormSection from '../../components/ui/FormSection';
import StickySaveBar from '../../components/ui/StickySaveBar';
import PageSpinner from '../../components/ui/PageSpinner';
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

export default function PageEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { dirty, setDirty } = useUnsavedChanges();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<PageForm>();

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  const content = watch('content');
  const featuredImage = watch('featuredImage');

  const fetchPage = useCallback(async () => {
    try {
      const response = await api.get(`/pages/${id}`);
      const page = response.data.data;
      reset({
        ...page,
        seoKeywords: page.seo?.keywords?.join(', ') || '',
      });
    } catch (error) {
      toast.error('Failed to fetch page');
      navigate('/pages');
    } finally {
      setLoading(false);
    }
  }, [id, reset, navigate]);

  useEffect(() => {
    if (id) {
      fetchPage();
    }
  }, [id, fetchPage]);

  const onSubmit = async (data: PageForm) => {
    try {
      setSaving(true);
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
      await api.put(`/pages/${id}`, payload);
      toast.success('Page updated successfully');
      reset(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update page');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner label="Loading page" />;
  }

  return (
    <PageShell
      title="Edit Page"
      subtitle="Update page content"
      breadcrumbs={[{ label: 'Pages', to: '/pages' }]}
      backTo="/pages"
      sidebar={
        <>
          <FormSection title="Settings" description="Publishing state and navigation placement.">
            <div className="admin-field">
              <label className="admin-label">Status</label>
              <select {...register('status')} className="admin-input">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="admin-label">Show in Menu</label>
              <input type="checkbox" {...register('isInMenu')} className="w-4 h-4" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Menu Order</label>
              <input type="number" {...register('menuOrder', { valueAsNumber: true })} className="admin-input" />
            </div>
          </FormSection>

          <FormSection title="SEO" description="Search engine title, description and keywords.">
            <div className="admin-field">
              <label className="admin-label">SEO Title</label>
              <input {...register('seoTitle')} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-label">SEO Description</label>
              <textarea {...register('seoDescription')} rows={3} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-label">SEO Keywords</label>
              <input {...register('seoKeywords')} className="admin-input" />
            </div>
          </FormSection>
        </>
      }
    >
      <form id="page-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
        <FormSection number={1} title="Content" description="The main body of the page as it appears on the storefront.">
          <div className="admin-field">
            <label className="admin-label">Title</label>
            <input {...register('title', { required: 'Title is required' })} className="admin-input" />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="admin-field">
              <label className="admin-label">Slug</label>
              <input {...register('slug', { required: 'Slug is required' })} className="admin-input" />
              {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
            </div>
            <div className="admin-field">
              <label className="admin-label">Excerpt</label>
              <input {...register('excerpt')} className="admin-input" />
            </div>
          </div>
          <div className="admin-field">
            <label className="admin-label">Content</label>
            <div>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={(value) => setValue('content', value, { shouldDirty: true })}
                style={{ height: '320px' }}
              />
            </div>
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
        </FormSection>
      </form>
      <StickySaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/pages')}
        saveLabel="Save Changes"
        frontendHref={FRONTEND_URL}
      />
    </PageShell>
  );
}