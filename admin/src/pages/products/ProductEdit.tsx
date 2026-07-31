import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Upload, X, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

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
  collection?: string;
  brand?: string;
  weight: number;
  status: 'draft' | 'active' | 'archived';
  trackQuantity: boolean;
  allowBackorder: boolean;
  lowStockThreshold: number;
  stock: number;
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string;
  images: string[];
}

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductForm>();

  const images = watch('images');

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchCategories();
      fetchCollections();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      const product = response.data.data;
      reset({
        ...product,
        category: typeof product.category === 'object' ? product.category._id : product.category,
        collection: product.collection ? (typeof product.collection === 'object' ? product.collection._id : product.collection) : '',
        seoKeywords: product.seo?.keywords?.join(', ') || '',
      });
    } catch (error) {
      toast.error('Failed to fetch product');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

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
      setCollections(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch collections');
    }
  };

  const addImage = () => {
    if (imageUrl && !images.includes(imageUrl)) {
      setValue('images', [...images, imageUrl]);
      setImageUrl('');
    }
  };

  const removeImage = (url: string) => {
    setValue('images', images.filter(img => img !== url));
  };

  const onSubmit = async (data: ProductForm) => {
    try {
      setSaving(true);
      await api.put(`/products/${id}`, data);
      toast.success('Product updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update product');
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/products')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit Product</h2>
            <p className="text-slate-500 dark:text-slate-400">Update product information</p>
          </div>
        </div>
        <button
          type="submit"
          form="product-form"
          disabled={saving}
          className="admin-btn-primary py-2.5 px-4 flex items-center"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>

      <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <div className="admin-card p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Basic Information</h3>
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
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Images</h3>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="admin-input flex-1"
                    placeholder="Enter image URL"
                  />
                  <button
                    type="button"
                    onClick={addImage}
                    className="admin-btn-secondary py-2 px-4"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt="" className="w-full h-32 object-cover rounded-md" />
                        <button
                          type="button"
                          onClick={() => removeImage(url)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
                </div>

                <div>
                  <label className="admin-label">Collection</label>
                  <select
                    {...register('collection')}
                    className="admin-input mt-1"
                  >
                    <option value="">Select collection</option>
                    {collections.map(col => (
                      <option key={col._id} value={col._id}>{col.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="admin-label">Brand</label>
                  <input
                    {...register('brand')}
                    className="admin-input mt-1"
                  />
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

                <div className="flex items-center justify-between">
                  <label className="admin-label">Featured</label>
                  <input
                    type="checkbox"
                    {...register('featured')}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}