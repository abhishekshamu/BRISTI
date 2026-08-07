import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { FRONTEND_URL } from '../../lib/api';
import toast from 'react-hot-toast';
import { Save, Eye, ExternalLink, X, CheckCircle2, Image, RectangleHorizontal } from 'lucide-react';
import PageShell from '../../components/ui/PageShell';
import PageSpinner from '../../components/ui/PageSpinner';
import { useUnsavedChanges } from '../../lib/unsaved-context';
import CategoryImagePicker from './CategoryImagePicker';

interface CategoryForm {
  name: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

const inputCls = 'admin-input h-12 rounded-xl bg-[#FAFAFA] dark:bg-slate-900/60 px-4';

function Card({
  title,
  description,
  children,
  className = '',
  bodyClassName = 'space-y-4',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`admin-card rounded-2xl p-6 shadow-[0_1px_3px_rgba(16,24,40,0.05),0_12px_32px_-16px_rgba(16,24,40,0.12)] ${className}`}>
      <header className="mb-6">
        <h2 className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 max-w-xl">{description}</p>}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="admin-label">{label}</label>
      {children}
      {hint && <p className="admin-hint">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function CategoryEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const { dirty, setDirty } = useUnsavedChanges();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<CategoryForm>();

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const categorySlug = watch('slug');
  const categoryUrl = categorySlug ? `${FRONTEND_URL}/category/${categorySlug}` : undefined;
  const isActive = watch('isActive');

  const fetchCategory = useCallback(async () => {
    try {
      const response = await api.get(`/categories/${id}`);
      const category = response.data.data;
      reset({
        name: category.name,
        slug: category.slug,
        subtitle: category.subtitle,
        description: category.description,
        image: category.image,
        bannerImage: category.bannerImage,
        parentId: category.parentId ?? '',
        sortOrder: category.sortOrder ?? 0,
        isActive: category.isActive ?? true,
        seoTitle: category.seo?.title,
        seoDescription: category.seo?.description,
      });
    } catch (error) {
      toast.error('Failed to fetch category');
      navigate('/categories');
    } finally {
      setLoading(false);
    }
  }, [id, reset, navigate]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/categories?includeInactive=true');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchCategory();
      fetchCategories();
    }
  }, [id, fetchCategory, fetchCategories]);

  const onSubmit = async (data: CategoryForm) => {
    try {
      setSaving(true);
      await api.put(`/categories/${id}`, {
        ...data,
        sortOrder: Number(data.sortOrder ?? 0),
        seo: { title: data.seoTitle, description: data.seoDescription },
        slug: data.slug?.trim() || undefined,
      });
      toast.success('Category updated successfully');
      setDirty(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner label="Loading…" />;
  }

  const submit = handleSubmit(onSubmit);

  return (
    <PageShell
      title="Edit Category"
      subtitle="Update category information"
      breadcrumbs={[{ label: 'Categories', to: '/categories' }, { label: 'Edit Category' }]}
      backTo="/categories"
    >
      <form id="category-form" onSubmit={submit} className="pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT — Media workspace (8/12) */}
          <div className="lg:col-span-8 min-w-0">
            <Card
              title="Category Media"
              description="Primary visuals for this category. Upload, replace, crop or manage images — every action is available here."
              bodyClassName="space-y-0"
              className="xl:min-h-[900px]"
            >
              <section>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Image className="w-[18px] h-[18px] text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Category Image</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">4:5 portrait shown across category pages and listings</p>
                  </div>
                </div>
                <div className="mt-4">
                  <CategoryImagePicker
                    value={watch('image') ?? ''}
                    onChange={(url) => setValue('image', url, { shouldDirty: true })}
                    ratio="category"
                    folder="categories"
                  />
                </div>
              </section>

              <section className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <RectangleHorizontal className="w-[18px] h-[18px] text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Category Banner</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">21:9 wide banner at the top of the category landing page</p>
                  </div>
                </div>
                <div className="mt-4">
                  <CategoryImagePicker
                    value={watch('bannerImage') ?? ''}
                    onChange={(url) => setValue('bannerImage', url, { shouldDirty: true })}
                    ratio="categoryBanner"
                    folder="categories"
                  />
                </div>
              </section>
            </Card>
          </div>

          {/* RIGHT — Details (4/12) */}
          <div className="lg:col-span-4 min-w-0 space-y-8">
            <Card title="Basic Information" description="Public details shown on the category page and product listings.">
              <div className="space-y-4">
                <Field label="Category Name" error={errors.name?.message}>
                  <input {...register('name', { required: 'Name is required' })} className={inputCls} placeholder="e.g. Fine Jewellery" />
                </Field>
                <Field label="Category Slug" hint="Leave empty to auto-generate from the name">
                  <input {...register('slug')} className={inputCls} placeholder="auto-generated from name" />
                </Field>
                <Field label="Category Subtitle">
                  <textarea
                    {...register('subtitle')}
                    rows={2}
                    placeholder="Shown as the premium description on the category landing page"
                    className={`${inputCls} min-h-[88px] resize-y py-3 leading-relaxed`}
                  />
                </Field>
                <Field label="Description">
                  <textarea {...register('description')} rows={3} className={`${inputCls} min-h-[120px] resize-y py-3 leading-relaxed`} />
                </Field>
                <Field label="Parent Category">
                  <select {...register('parentId')} className={`${inputCls} cursor-pointer`}>
                    <option value="">None (Top Level)</option>
                    {categories.filter((c) => c._id !== id).map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                  </select>
                </Field>
                <Field label="Display Order">
                  <input type="number" min={0} {...register('sortOrder', { valueAsNumber: true })} className={inputCls} />
                </Field>
              </div>
            </Card>

            <Card title="Search Engine Optimization" description="How this category appears in search engine results.">
              <div className="space-y-4">
                <Field label="SEO Title" hint="Keep it under 60 characters for best results">
                  <input {...register('seoTitle')} placeholder="e.g. BRISTI | {Category Name}" className={inputCls} />
                </Field>
                <Field label="SEO Description" hint="A concise summary shown below the title in search results">
                  <textarea {...register('seoDescription')} rows={3} className={`${inputCls} min-h-[120px] resize-y py-3 leading-relaxed`} />
                </Field>
              </div>
            </Card>

            <Card title="Status" description="Hidden categories stay published but are removed from navigation.">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Active</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Visible in storefront navigation</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  aria-label="Toggle category active"
                  onClick={() => setValue('isActive', !isActive, { shouldDirty: true })}
                  className={`admin-switch shrink-0 ${isActive ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span className={`admin-switch-knob ${isActive ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-white'}`} />
                </button>
              </div>
            </Card>

            {/* Sticky save card — always visible while scrolling */}
            <Card title="Save Changes" className="lg:sticky lg:bottom-6">
              <div className="flex items-center gap-2">
                {dirty ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">You have unsaved changes</p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">All changes saved</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {categoryUrl ? (
                  <a
                    href={categoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn-secondary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Save a slug first to preview the page"
                    className="admin-btn-secondary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                )}
                {categoryUrl ? (
                  <a
                    href={categoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn-secondary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Frontend
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Save a slug first to open the frontend"
                    className="admin-btn-secondary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Frontend
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => void submit()}
                disabled={saving}
                className="admin-btn-primary !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2 disabled:opacity-60 w-full"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/categories')}
                className="admin-btn-ghost !h-12 !rounded-xl px-4 text-[13px] flex items-center justify-center gap-2 w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </Card>
          </div>
        </div>
      </form>
    </PageShell>
  );
}
