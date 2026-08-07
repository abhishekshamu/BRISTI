import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { MARKETING_COLLECTION_SLUGS } from '@shared/constants';
import MediaGallery, { GalleryImage } from '../../components/media/MediaGallery';
import PageShell from '../../components/ui/PageShell';
import StickySaveBar from '../../components/ui/StickySaveBar';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface ProductForm {
  name: string;
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
}

export default function ProductCreate() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { dirty, setDirty } = useUnsavedChanges();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProductForm>({
    defaultValues: {
      status: 'draft',
      trackQuantity: true,
      allowBackorder: false,
      lowStockThreshold: 5,
      stock: 0,
      isNewArrival: false,
      isBestSeller: false,
      isTrending: false,
      isOnSale: false,
      isFeatured: false,
      isRecommended: false,
      isExclusive: false,
      isLimitedEdition: false,
      isEditorsPick: false,
      isPremiumCollection: false,
      seoKeywords: '',
      images: [],
      weight: 0,
      collections: [],
    },
  });

  const images = watch('images');
  const selectedCollections = watch('collections');

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const toggleCollection = (slug: string) => {
    const next = selectedCollections.includes(slug)
      ? selectedCollections.filter(s => s !== slug)
      : [...selectedCollections, slug];
    setValue('collections', next);
  };

  useEffect(() => {
    fetchCategories();
    fetchCollections();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await api.get('/collections');
      // Only real merchandising collections appear in Organization — marketing
      // sections are controlled by the Marketing Lists toggles.
      setCollections((response.data.data || []).filter((c: any) => !MARKETING_COLLECTION_SLUGS.includes(c.slug)));
    } catch (error) {
      console.error('Failed to fetch collections');
    }
  };

  const onSubmit = async (data: ProductForm) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        images: data.images.map((img, index) => ({
          url: img.url,
          alt: img.alt || data.name,
          isFeatured: index === 0 ? true : Boolean(img.isFeatured),
        })),
      };
      const response = await api.post('/products', payload);
      toast.success('Product created successfully');
      setDirty(false);
      navigate(`/products/${response.data.data._id}/edit`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Add Product"
      subtitle="Create a new product"
      breadcrumbs={[{ label: 'Products', to: '/products' }, { label: 'Add Product' }]}
      backTo="/products"
      sidebar={
        <>
          {/* Organization */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Organization</h3>
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
                {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
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
                  placeholder="Brand name"
                />
                <p className="admin-hint mt-1">Manufacturer or house label</p>
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Inventory</h3>
            <div className="space-y-4">
              <div>
                <label className="admin-label">SKU</label>
                <input
                  {...register('sku', { required: 'SKU is required' })}
                  className="admin-input mt-1"
                  placeholder="SKU-001"
                />
                {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>}
              </div>

              <div>
                <label className="admin-label">Barcode</label>
                <input
                  {...register('barcode')}
                  className="admin-input mt-1"
                  placeholder="Barcode"
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
          </div>

          {/* Status */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Status</h3>
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
          </div>

          {/* Marketing Lists */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">Marketing Lists</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Independent toggles — a product may belong to any number of lists at once.</p>
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
          </div>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Product Name</label>
              <input
                {...register('name', { required: 'Product name is required' })}
                className="admin-input mt-1"
                placeholder="Enter product name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="admin-label">Short Description</label>
              <input
                {...register('shortDescription')}
                className="admin-input mt-1"
                placeholder="Brief product description"
              />
            </div>

            <div>
              <label className="admin-label">Description</label>
              <textarea
                {...register('description', { required: 'Description is required' })}
                rows={4}
                className="admin-input mt-1"
                placeholder="Detailed product description"
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Pricing</h3>
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
        </div>

        {/* Images */}
        <div className="admin-card p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Images</h3>
            <span className="text-xs text-slate-400">1st image = featured · 2nd = hover</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Drag to reorder, upload multiple, or pick from the media library. Images are automatically fitted to the product card ratio (3:4).
          </p>
          <MediaGallery
            images={images}
            onChange={(next) => setValue('images', next, { shouldDirty: true })}
            ratio="product"
            folder="products"
          />
        </div>

        {/* SEO */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">SEO</h3>
          <div className="space-y-4">
            <div>
              <label className="admin-label">SEO Title</label>
              <input
                {...register('seoTitle')}
                className="admin-input mt-1"
                placeholder="SEO title"
              />
            </div>
            <div>
              <label className="admin-label">SEO Description</label>
              <textarea
                {...register('seoDescription')}
                rows={2}
                className="admin-input mt-1"
                placeholder="SEO description"
              />
            </div>
            <div>
              <label className="admin-label">SEO Keywords (comma separated)</label>
              <input
                {...register('seoKeywords')}
                className="admin-input mt-1"
                placeholder="keyword1, keyword2, keyword3"
              />
              <p className="admin-hint mt-1">Separate keywords with commas</p>
            </div>
          </div>
        </div>
      </form>

      <StickySaveBar
        dirty={dirty}
        saving={loading}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/products')}
        saveLabel="Save changes"
      />
    </PageShell>
  );
}
