import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import api, { FRONTEND_URL } from '../../lib/api';
import toast from 'react-hot-toast';
import { MARKETING_COLLECTION_SLUGS } from '@shared/constants';
import MediaGallery, { GalleryImage } from '../../components/media/MediaGallery';
import PageShell from '../../components/ui/PageShell';
import FormSection from '../../components/ui/FormSection';
import StickySaveBar from '../../components/ui/StickySaveBar';
import PageSpinner from '../../components/ui/PageSpinner';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface ProductForm {
  name: string;
  slug?: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  sku: string;
  barcode?: string;
  category: string;
  collections: string[];
  brand?: string;
  weight: number;
  status: 'draft' | 'active' | 'archived';
  trackQuantity: boolean;
  allowBackorder: boolean;
  lowStockThreshold: number;
  stock: number;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isOnSale: boolean;
  isFeatured: boolean;
  isRecommended: boolean;
  isExclusive: boolean;
  isLimitedEdition: boolean;
  isEditorsPick: boolean;
  isPremiumCollection: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string;
  images: GalleryImage[];
  options: Array<{ name: string; values: string[] }>;
  variants: Array<{ id: string; name: string; options: Record<string, string>; priceAdjustment: number; sku: string; stock: number; image?: string }>;
}

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const { dirty, setDirty } = useUnsavedChanges();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProductForm>();

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const images = watch('images');
  const variants = watch('variants') ?? [];
  const productOptions = watch('options') ?? [];
  const selectedCollections = watch('collections') ?? [];

  const productSlug = watch('slug');
  const productUrl = productSlug ? `${FRONTEND_URL}/product/${productSlug}` : undefined;

  const toggleCollection = (slug: string) => {
    const next = selectedCollections.includes(slug)
      ? selectedCollections.filter(s => s !== slug)
      : [...selectedCollections, slug];
    setValue('collections', next);
  };

  const addOption = () => {
    setValue('options', [...productOptions, { name: '', values: [] }]);
  };

  const updateOption = (index: number, field: 'name' | 'values', value: string) => {
    const next = productOptions.map((option: any, i: number) =>
      i === index
        ? field === 'name'
          ? { ...option, name: value }
          : { ...option, values: value.split(',').map((v) => v.trim()).filter(Boolean) }
        : option
    );
    setValue('options', next);
  };

  const removeOption = (index: number) => {
    setValue('options', productOptions.filter((_: any, i: number) => i !== index));
  };

  const addVariant = () => {
    const seed: any = {
      id: `v-${Date.now()}`,
      name: '',
      options: {},
      priceAdjustment: 0,
      sku: '',
      stock: 0,
    };
    for (const option of productOptions) {
      if (option.name && option.values?.length) seed.options[option.name] = option.values[0];
    }
    setValue('variants', [...variants, seed]);
  };

  const updateVariant = (index: number, field: string, value: string | number) => {
    const next = variants.map((variant: any, i: number) =>
      i === index ? { ...variant, [field]: value } : variant
    );
    setValue('variants', next);
  };

  const removeVariant = (index: number) => {
    setValue('variants', variants.filter((_: any, i: number) => i !== index));
  };

  const fetchProduct = useCallback(async () => {
    try {
      const response = await api.get(`/products/${id}`);
      const product = response.data.data;
      reset({
        ...product,
        category: typeof product.category === 'object' ? product.category._id : product.category,
        collections: Array.isArray(product.collections) ? product.collections : [],
        seoKeywords: product.seo?.keywords?.join(', ') || '',
        images: Array.isArray(product.images)
          ? product.images.map((img: any) => ({
              url: img?.url || img,
              alt: img?.alt ?? '',
              isFeatured: !!img?.isFeatured,
            }))
          : [],
      });
    } catch (error) {
      toast.error('Failed to fetch product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  }, [id, reset, navigate]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  }, []);

  const fetchCollections = useCallback(async () => {
    try {
      const response = await api.get('/collections');
      // Only real merchandising collections appear in Organization — marketing
      // sections are controlled by the Marketing Lists toggles.
      setCollections((response.data.data || []).filter((c: any) => !MARKETING_COLLECTION_SLUGS.includes(c.slug)));
    } catch (error) {
      console.error('Failed to fetch collections');
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchCategories();
      fetchCollections();
    }
  }, [id, fetchProduct, fetchCategories, fetchCollections]);

  const onSubmit = async (data: ProductForm) => {
    try {
      setSaving(true);
      const payload = {
        ...data,
        options: productOptions,
        variants,
        images: data.images.map((img) => ({ url: img.url, alt: img.alt ?? '', isFeatured: !!img.isFeatured })),
      };
      await api.put(`/products/${id}`, payload);
      toast.success('Product updated successfully');
      setDirty(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner label="Loading…" />;
  }

  return (
    <PageShell
      title="Edit Product"
      subtitle="Update product information"
      breadcrumbs={[{ label: 'Products', to: '/products' }, { label: 'Edit Product' }]}
      backTo="/products"
      sidebar={
        <>
          {/* Organization */}
          <FormSection title="Organization" description="Category, collections and brand.">
            <div className="space-y-4">
              <div>
                <label className="admin-label">Category</label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="admin-input mt-1"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="admin-label">Product Collections</label>
                <div className="mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 p-2 space-y-1">
                  {collections.map(col => {
                    const checked = selectedCollections.includes(col.slug);
                    return (
                      <label
                        key={col._id}
                        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {col.name}
                          <span className="ml-1.5 text-xs text-slate-400">{col.slug}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCollection(col.slug)}
                          className="w-4 h-4"
                        />
                      </label>
                    );
                  })}
                  {collections.length === 0 && (
                    <p className="px-2 py-1.5 text-sm text-slate-400">No collections available — create one first</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedCollections.length > 0
                    ? `${selectedCollections.length} selected — appears in: ${selectedCollections.join(', ')}`
                    : 'Products can belong to any number of collections'}
                </p>
              </div>

              <div>
                <label className="admin-label">Brand</label>
                <input
                  {...register('brand')}
                  className="admin-input mt-1"
                />
                <p className="admin-hint mt-1">Manufacturer or house label</p>
              </div>
            </div>
          </FormSection>

          {/* Inventory */}
          <FormSection title="Inventory" description="Stock levels, tracking and backorder behaviour.">
            <div className="space-y-4">
              <div>
                <label className="admin-label">SKU</label>
                <input
                  {...register('sku', { required: 'SKU is required' })}
                  className="admin-input mt-1"
                />
              </div>

              <div>
                <label className="admin-label">Barcode</label>
                <input
                  {...register('barcode')}
                  className="admin-input mt-1"
                />
              </div>

              <div>
                <label className="admin-label">Stock</label>
                <input
                  type="number"
                  {...register('stock', { min: 0 })}
                  className="admin-input mt-1"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="admin-label">Track Quantity</label>
                <input
                  type="checkbox"
                  {...register('trackQuantity')}
                  className="w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="admin-label">Allow Backorder</label>
                <input
                  type="checkbox"
                  {...register('allowBackorder')}
                  className="w-4 h-4"
                />
              </div>
            </div>
          </FormSection>

          {/* Status */}
          <FormSection title="Status" description="Publishing state of the product.">
            <div className="space-y-4">
              <div>
                <label className="admin-label">Status</label>
                <select
                  {...register('status')}
                  className="admin-input mt-1"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </FormSection>

          {/* Marketing Lists */}
          <FormSection
            title="Marketing Lists"
            description="Independent toggles — a product may belong to any number of lists at once."
          >
            <div className="space-y-3">
              {([
                ['isNewArrival', 'New Arrival'],
                ['isTrending', 'Trending'],
                ['isBestSeller', 'Best Seller'],
                ['isOnSale', 'On Sale'],
                ['isFeatured', 'Featured'],
                ['isRecommended', 'Recommended'],
                ['isExclusive', 'Exclusive'],
                ['isLimitedEdition', 'Limited Edition'],
                ['isEditorsPick', "Editor's Pick"],
                ['isPremiumCollection', 'Premium Collection'],
              ] as const).map(([field, label]) => (
                <div key={field} className="flex items-center justify-between">
                  <label className="admin-label">{label}</label>
                  <input type="checkbox" {...register(field)} className="w-4 h-4" />
                </div>
              ))}
            </div>
          </FormSection>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <FormSection number={1} title="Basic Information" description="Public details shown on the product page.">
          <div className="space-y-4">
            <div>
              <label className="admin-label">Product Name</label>
              <input
                {...register('name', { required: 'Product name is required' })}
                className="admin-input mt-1"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="admin-label">Short Description</label>
              <input
                {...register('shortDescription')}
                className="admin-input mt-1"
              />
            </div>

            <div>
              <label className="admin-label">Description</label>
              <textarea
                {...register('description', { required: 'Description is required' })}
                rows={4}
                className="admin-input mt-1"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>
          </div>
        </FormSection>

        {/* Pricing */}
        <FormSection number={2} title="Pricing" description="Retail price, original price and cost for margin reporting.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="admin-label">Price ($)</label>
              <input
                type="number"
                step="0.01"
                {...register('price', { required: 'Price is required', min: 0 })}
                className="admin-input mt-1"
              />
              {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
            </div>
            <div>
              <label className="admin-label">Compare at Price ($)</label>
              <input
                type="number"
                step="0.01"
                {...register('compareAtPrice', { min: 0 })}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                {...register('costPrice', { min: 0 })}
                className="admin-input mt-1"
              />
            </div>
          </div>
        </FormSection>

        {/* Images */}
        <FormSection number={3} title="Images" description="Gallery images, with the first marked featured used as the product thumbnail.">
          <MediaGallery
            images={images}
            onChange={(next) => setValue('images', next, { shouldDirty: true })}
            ratio="product"
            folder="products"
          />
        </FormSection>

        {/* SEO */}
        <FormSection number={4} title="SEO" description="Search engine title, description and keywords.">
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
        </FormSection>

        {/* Variants & Options */}
        <FormSection number={5} title="Variants & Options" description="Customizable options like size and color, each tracked with its own stock.">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 w-full">Options</h3>
            <button
              type="button"
              onClick={addOption}
              className="admin-btn-secondary py-1.5 px-3 text-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1 inline" /> Option
            </button>
          </div>

          <div className="space-y-3">
            {productOptions.map((option: any, index: number) => (
              <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={option.name}
                    onChange={(e) => updateOption(index, 'name', e.target.value)}
                    className="admin-input flex-1"
                    placeholder="Option name (e.g. Size)"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <input
                  value={(option.values ?? []).join(', ')}
                  onChange={(e) => updateOption(index, 'values', e.target.value)}
                  className="admin-input"
                  placeholder="Values, comma separated (e.g. S, M, L)"
                />
              </div>
            ))}
            {productOptions.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No options defined — the product sells without variants.</p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Variants ({variants.length})</h4>
            <button
              type="button"
              onClick={addVariant}
              className="admin-btn-secondary py-1.5 px-3 text-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1 inline" /> Variant
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {variants.map((variant: any, index: number) => (
              <div key={variant.id ?? index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={variant.name}
                    onChange={(e) => updateVariant(index, 'name', e.target.value)}
                    className="admin-input flex-1"
                    placeholder="Variant name (e.g. S / Black)"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                    className="admin-input"
                    placeholder="Variant SKU"
                  />
                  <input
                    type="number"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value) || 0)}
                    className="admin-input"
                    placeholder="Stock"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={variant.priceAdjustment}
                    onChange={(e) => updateVariant(index, 'priceAdjustment', parseFloat(e.target.value) || 0)}
                    className="admin-input"
                    placeholder="Price adj."
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Options: {Object.entries(variant.options ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}
                </div>
              </div>
            ))}
            {variants.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No variants — stock is tracked on the product itself.</p>
            )}
          </div>
        </FormSection>
      </form>

      <StickySaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/products')}
        saveLabel="Save changes"
        previewHref={productUrl}
        frontendHref={productUrl}
      />
    </PageShell>
  );
}
