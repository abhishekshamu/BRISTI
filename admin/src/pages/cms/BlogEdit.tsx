import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api, { FRONTEND_URL } from '../../lib/api';
import toast from 'react-hot-toast';
import MediaPicker from '../../components/media/MediaPicker';
import PageShell from '../../components/ui/PageShell';
import FormSection from '../../components/ui/FormSection';
import StickySaveBar from '../../components/ui/StickySaveBar';
import PageSpinner from '../../components/ui/PageSpinner';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface BlogForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  author: string;
  tags: string;
  category?: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string;
}

export default function BlogEdit() {
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
  } = useForm<BlogForm>();

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  const content = watch('content');
  const featuredImage = watch('featuredImage');

  const blogSlug = watch('slug');
  const blogUrl = blogSlug ? `${FRONTEND_URL}/journal/${blogSlug}` : undefined;

  const fetchBlog = useCallback(async () => {
    try {
      const response = await api.get(`/blogs/${id}`);
      const blog = response.data.data;
      reset({
        ...blog,
        tags: blog.tags?.join(', ') || '',
        seoKeywords: blog.seo?.keywords?.join(', ') || '',
      });
    } catch (error) {
      toast.error('Failed to fetch blog post');
      navigate('/blogs');
    } finally {
      setLoading(false);
    }
  }, [id, reset, navigate]);

  useEffect(() => {
    if (id) {
      fetchBlog();
    }
  }, [id, fetchBlog]);

  const onSubmit = async (data: BlogForm) => {
    try {
      setSaving(true);
      // Backend stores SEO under a nested `seo` object; the flat form fields
      // are mapped here so SEO settings are not silently dropped.
      const { seoTitle, seoDescription, seoKeywords, featuredImage, ...rest } = data;
      const payload = {
        ...rest,
        // An unset featured image is sent as omitted rather than "" so the
        // backend's optional() validator does not reject it as an invalid URL.
        ...(featuredImage ? { featuredImage } : {}),
        tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        seo: {
          ...(seoTitle ? { title: seoTitle } : {}),
          ...(seoDescription ? { description: seoDescription } : {}),
          ...(seoKeywords
            ? { keywords: seoKeywords.split(',').map((k: string) => k.trim()).filter(Boolean) }
            : {}),
        },
      };
      await api.put(`/blogs/${id}`, payload);
      toast.success('Blog post updated successfully');
      reset(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update blog post');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner label="Loading blog post" />;
  }

  return (
    <PageShell
      title="Edit Blog Post"
      subtitle="Update blog post content"
      breadcrumbs={[{ label: 'Blog', to: '/blogs' }]}
      backTo="/blogs"
      sidebar={
        <>
          <FormSection title="Settings" description="Authorship, taxonomy and publishing state.">
            <div className="admin-field">
              <label className="admin-label">Author</label>
              <input {...register('author', { required: 'Author is required' })} className="admin-input" />
              {errors.author && <p className="text-xs text-red-600">{errors.author.message}</p>}
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="admin-field">
                <label className="admin-label">Category</label>
                <input {...register('category')} className="admin-input" />
              </div>
              <div className="admin-field">
                <label className="admin-label">Status</label>
                <select {...register('status')} className="admin-input">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="admin-field">
              <label className="admin-label">Tags (comma separated)</label>
              <input {...register('tags')} className="admin-input" />
            </div>
            <div className="flex items-center justify-between">
              <label className="admin-label">Featured</label>
              <input type="checkbox" {...register('featured')} className="w-4 h-4" />
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
      <form id="blog-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
        <FormSection number={1} title="Content" description="The post body rendered on the journal.">
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
              <input {...register('excerpt', { required: 'Excerpt is required' })} className="admin-input" />
              {errors.excerpt && <p className="text-xs text-red-600">{errors.excerpt.message}</p>}
            </div>
          </div>
          <div className="admin-field">
            <label className="admin-label">Content</label>
            <div>
              <ReactQuill
                theme="snow"
                value={content}
                onChange={(value) => setValue('content', value, { shouldDirty: true })}
                style={{ height: '360px' }}
              />
            </div>
          </div>
          <div>
            <MediaPicker
              label="Featured Image"
              value={featuredImage}
              onChange={(url) => setValue('featuredImage', url, { shouldDirty: true })}
              ratio="blogFeatured"
              folder="blogs"
            />
          </div>
        </FormSection>
      </form>
      <StickySaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/blogs')}
        saveLabel="Save Changes"
        previewHref={blogUrl}
        frontendHref={blogUrl}
      />
    </PageShell>
  );
}