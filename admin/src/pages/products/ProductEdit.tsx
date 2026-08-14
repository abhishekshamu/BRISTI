import { useState, useEffect, useCallback, useRef } from 'react';
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

interface ProductOption {
  name: string;
  values: string[];
}

interface ProductVariant {
  id: string;
  name: string;
  options: Record<string, string>;
  priceAdjustment: number;
  sku: string;
  stock: number;
  image?: string;
}

const normalizeOptions = (options: any[] = []): ProductOption[] => {
  const seen = new Map<string, ProductOption>();
  for (const raw of options) {
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
    if (!name) continue;
    const key = name.toLowerCase();
    const values = (Array.isArray(raw.values) ? raw.values : [])
      .map((v: any) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean);
    const unique = values.filter((v: string, i: number) => values.indexOf(v) === i);
    const existing = seen.get(key);
    if (existing) {
      for (const v of unique) {
        if (!existing.values.some(x => x.toLowerCase() === v.toLowerCase())) existing.values.push(v);
      }
    } else {
      seen.set(key, { name, values: unique });
    }
  }
  return Array.from(seen.values()).filter(o => o.values.length > 0);
};

const findDuplicateOptionName = (options: any[]): string | null => {
  const seen = new Set<string>();
  for (const option of options) {
    const name = typeof option?.name === 'string' ? option.name.trim() : '';
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) return name;
    seen.add(key);
  }
  return null;
};

const canonicalComboKey = (options: Record<string, string>): string =>
  Object.entries(options)
    .map(([k, v]) => `${k.trim().toLowerCase()}::${String(v).trim()}`)
    .sort()
    .join('|');

const normalizeVariantOptions = (variant: any, optionNames: string[]): Record<string, string> => {
  const known = new Set(optionNames.map(n => n.toLowerCase()));
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(variant?.options ?? {})) {
    const trimmedKey = (key ?? '').trim();
    const trimmedValue = typeof value === 'string' ? value.trim() : '';
    if (!trimmedKey || !trimmedValue) continue;
    if (!known.has(trimmedKey.toLowerCase())) continue;
    if (Object.keys(result).some(k => k.toLowerCase() === trimmedKey.toLowerCase())) continue;
    result[trimmedKey] = trimmedValue;
  }
  return result;
};

const buildCombinations = (options: ProductOption[]): Record<string, string>[] => {
  if (options.length === 0) return [];
  let combos: Record<string, string>[] = [{}];
  for (const option of options) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of option.values) {
        next.push({ ...combo, [option.name]: value });
      }
    }
    combos = next;
  }
  return combos;
};

const comboLabel = (options: Record<string, string>): string => Object.values(options).join(' / ');

const comboMatchesVariantName = (combo: Record<string, string>, name: string): boolean => {
  const normalized = (name ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return Object.values(combo).some(v => String(v).trim().toLowerCase() === normalized);
};

const newVariantId = (existing: string[]): string => {
  let id = '';
  do {
    id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } while (existing.includes(id));
  return id;
};

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const { dirty, setDirty } = useUnsavedChanges();
  const originalOptions = useRef<ProductOption[]>([]);

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
    setValue('options', [...productOptions, { name: '', values: [] }], { shouldDirty: true });
  };

  const updateOptionName = (index: number, value: string) => {
    const previous = productOptions[index]?.name ?? '';
    setValue(
      'options',
      productOptions.map((option: any, i: number) => (i === index ? { ...option, name: value } : option)),
      { shouldDirty: true }
    );
    const from = previous.trim();
    const to = value.trim();
    if (!from || !to || from === to) return;
    setValue(
      'variants',
      variants.map((variant: any) => {
        if (!(from in (variant.options ?? {}))) return variant;
        const options = { ...variant.options };
        const current = options[from];
        delete options[from];
        options[to] = current;
        return { ...variant, options };
      }),
      { shouldDirty: true }
    );
  };

  const updateOptionValues = (index: number, value: string) => {
    const values = value.split(',').map((v) => v.trim()).filter(Boolean);
    const unique = values.filter((v, i) => values.indexOf(v) === i);
    setValue(
      'options',
      productOptions.map((option: any, i: number) => (i === index ? { ...option, values: unique } : option)),
      { shouldDirty: true }
    );
  };

  const removeOption = (index: number) => {
    setValue('options', productOptions.filter((_: any, i: number) => i !== index), { shouldDirty: true });
  };

  const addVariant = () => {
    const seed: any = {
      id: newVariantId(variants.map((v: any) => v.id)),
      name: '',
      options: {},
      priceAdjustment: 0,
      sku: '',
      stock: 0,
    };
    for (const option of productOptions) {
      if (option.name && option.values?.length) seed.options[option.name.trim()] = option.values[0];
    }
    setValue('variants', [...variants, seed], { shouldDirty: true });
  };

  const updateVariant = (index: number, field: string, value: string | number) => {
    const next = variants.map((variant: any, i: number) =>
      i === index ? { ...variant, [field]: value } : variant
    );
    setValue('variants', next, { shouldDirty: true });
  };

  const setVariantOption = (index: number, optionName: string, value: string) => {
    if (!optionName) return;
    const next = variants.map((variant: any, i: number) => {
      if (i !== index) return variant;
      const options = { ...(variant.options ?? {}) };
      if (!value) delete options[optionName];
      else options[optionName] = value;
      return { ...variant, options };
    });
    const combo = next[index].options ?? {};
    const conflict = next.findIndex(
      (v: any, i: number) =>
        i !== index && Object.keys(combo).length > 0 && canonicalComboKey(v.options ?? {}) === canonicalComboKey(combo)
    );
    if (conflict !== -1) {
      toast.error('A variant with this exact combination already exists');
      return;
    }
    setValue('variants', next, { shouldDirty: true });
  };

  const removeVariant = (index: number) => {
    setValue('variants', variants.filter((_: any, i: number) => i !== index), { shouldDirty: true });
  };

  const reconcileVariants = (options: ProductOption[], variants: ProductVariant[] = []) => {
    const optionNames = options.map(o => o.name);
    let working = variants.map((v: any) => ({ ...v, options: { ...(v.options ?? {}) } }));

    for (const option of options) {
      const original = originalOptions.current.find(
        (o) => o.name.toLowerCase() === option.name.toLowerCase()
      );
      if (!original) continue;
      const removed = original.values.filter(
        (v) => !option.values.some((n) => n.toLowerCase() === v.toLowerCase())
      );
      const added = option.values.filter(
        (v) => !original.values.some((o) => o.toLowerCase() === v.toLowerCase())
      );
      if (removed.length === 1 && added.length === 1) {
        const renamedValue = added[0];
        working = working.map((v: any) => {
          const current = (v.options ?? {})[option.name];
          if (typeof current === 'string' && current.toLowerCase() === removed[0].toLowerCase()) {
            return { ...v, options: { ...v.options, [option.name]: renamedValue } };
          }
          return v;
        });
      } else if (removed.length > 0) {
        working = working.filter((v: any) => {
          const current = (v.options ?? {})[option.name];
          return typeof current !== 'string' || !removed.some((r) => r.toLowerCase() === current.toLowerCase());
        });
      }
    }

    working = working.map((v: any) => ({ ...v, options: normalizeVariantOptions(v, optionNames) }));

    const combos = buildCombinations(options);
    const gridKeys = new Set(combos.map(canonicalComboKey));
    const kept = new Map<string, any>();
    const orphans: any[] = [];
    for (const v of working) {
      const key = canonicalComboKey(v.options ?? {});
      if (kept.has(key)) continue;
      if (gridKeys.has(key)) kept.set(key, v);
      else orphans.push(v);
    }

    const result: any[] = [];
    const adopted = new Set<string>();
    const usedIds = new Set(working.map((v: any) => v.id));
    for (const combo of combos) {
      const key = canonicalComboKey(combo);
      const existing = kept.get(key);
      if (existing) {
        result.push(existing);
        continue;
      }
      const match = orphans.find(
        (o) => !adopted.has(o.id) && comboMatchesVariantName(combo, o.name)
      );
      if (match) {
        adopted.add(match.id);
        result.push({ ...match, options: { ...combo } });
        continue;
      }
      result.push({
        id: newVariantId([...usedIds, ...result.map((r) => r.id)]),
        name: comboLabel(combo),
        options: { ...combo },
        priceAdjustment: 0,
        sku: '',
        stock: 0,
      });
    }
    for (const o of orphans) {
      if (!adopted.has(o.id)) result.push(o);
    }
    return result;
  };

  const fetchProduct = useCallback(async () => {
    try {
      const response = await api.get(`/products/${id}`);
      const product = response.data.data;
      const options = normalizeOptions(product.options);
      originalOptions.current = options.map((o) => ({ name: o.name, values: [...o.values] }));
      const optionNames = options.map((o) => o.name);
      reset({
        ...product,
        options,
        variants: Array.isArray(product.variants)
          ? product.variants.map((v: any) => ({
              ...v,
              name: typeof v.name === 'string' ? v.name.trim() : v.name,
              options: normalizeVariantOptions(v, optionNames),
            }))
          : [],
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
      const duplicate = findDuplicateOptionName(productOptions);
      if (duplicate) {
        toast.error(`Duplicate option name "${duplicate.trim()}" — each option needs a unique name`);
        setSaving(false);
        return;
      }
      const options = normalizeOptions(productOptions);
      const reconciledVariants = reconcileVariants(options, variants);
      const { barcode, ...rest } = data;
      const payload = {
        ...rest,
        // The barcode field is a sparse unique index — an empty string would
        // collide with other products and block the save entirely.
        ...(barcode ? { barcode } : {}),
        options,
        variants: reconciledVariants,
        images: data.images.map((img) => ({ url: img.url, alt: img.alt ?? '', isFeatured: !!img.isFeatured })),
      };
      await api.put(`/products/${id}`, payload);
      originalOptions.current = options.map((o) => ({ name: o.name, values: [...o.values] }));
      setValue('options', options);
      setValue('variants', reconciledVariants);
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
                    onChange={(e) => updateOptionName(index, e.target.value)}
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
                  onChange={(e) => updateOptionValues(index, e.target.value)}
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
                {productOptions.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {productOptions.map((option: any, oi: number) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-16 shrink-0">{option.name || 'Option'}</span>
                        <select
                          value={(variant.options ?? {})[option.name] ?? ''}
                          onChange={(e) => setVariantOption(index, option.name, e.target.value)}
                          className="admin-input text-sm"
                        >
                          <option value="">—</option>
                          {(option.values ?? []).map((v: string) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
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
