import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import MediaPicker from '../../components/media/MediaPicker';
import api, { FRONTEND_URL } from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import FormSection from '../../components/ui/FormSection';
import StickySaveBar from '../../components/ui/StickySaveBar';
import PageSpinner from '../../components/ui/PageSpinner';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface CollectionForm {
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  featured: boolean;
  sortOrder: number;
  isActive: boolean;
  showOnHomepage: boolean;
  showInNavigation: boolean;
  themeColor?: string;
  buttonColor?: string;
  buttonText?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export default function CollectionEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [bannerTablet, setBannerTablet] = useState('');
  const [mobileBanner, setMobileBanner] = useState('');
  const [icon, setIcon] = useState('');
  const [seoImage, setSeoImage] = useState('');
  const { dirty, setDirty } = useUnsavedChanges();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<CollectionForm>();

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const collectionSlug = watch('slug');
  const collectionUrl = collectionSlug ? `${FRONTEND_URL}/collection/${collectionSlug}` : undefined;

  const fetchCollection = useCallback(async () => {
    try {
      const response = await api.get(`/collections/${id}`);
      const data = response.data.data;
      reset({
        name: data.name,
        slug: data.slug,
        shortDescription: data.shortDescription || '',
        description: data.description || '',
        featured: Boolean(data.featured),
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive !== false,
        showOnHomepage: Boolean(data.showOnHomepage),
        showInNavigation: Boolean(data.showInNavigation),
        themeColor: data.themeColor || '',
        buttonColor: data.buttonColor || '',
        buttonText: data.buttonText || '',
        seoTitle: data.seo?.title || '',
        seoDescription: data.seo?.description || '',
      });
      setImage(data.image || '');
      setBannerImage(data.bannerImage || '');
      setBannerTablet(data.bannerTablet || '');
      setMobileBanner(data.mobileBanner || '');
      setIcon(data.icon || '');
      setSeoImage(data.seo?.image || '');
    } catch (error) {
      toast.error('Failed to fetch collection');
      navigate('/collections');
    } finally {
      setLoading(false);
    }
  }, [id, reset, navigate]);

  useEffect(() => {
    if (id) {
      fetchCollection();
    }
  }, [id, fetchCollection]);

  const onSubmit = async (data: CollectionForm) => {
    try {
      setSaving(true);
      await api.put(`/collections/${id}`, {
        ...data,
        sortOrder: Number(data.sortOrder) || 0,
        image,
        bannerImage,
        bannerTablet,
        mobileBanner,
        icon,
        seo: {
          title: data.seoTitle || undefined,
          description: data.seoDescription || undefined,
          image: seoImage || undefined,
        },
      });
      toast.success('Collection updated successfully');
      setDirty(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update collection');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner label="Loading…" />;
  }

  return (
    <PageShell
      title="Edit Collection"
      subtitle="Products appear here when assigned from the product page"
      breadcrumbs={[{ label: 'Collections', to: '/collections' }, { label: 'Edit Collection' }]}
      backTo="/collections"
      sidebar={
        <>
          <FormSection title="Settings" description="Visibility, ordering and CTA styling.">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="admin-label">Active (shown on storefront)</label>
                <input type="checkbox" {...register('isActive')} className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between">
                <label className="admin-label">Featured (collections showcase)</label>
                <input type="checkbox" {...register('featured')} className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between">
                <label className="admin-label">Show on Homepage</label>
                <input type="checkbox" {...register('showOnHomepage')} className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between">
                <label className="admin-label">Show in Navigation</label>
                <input type="checkbox" {...register('showInNavigation')} className="w-4 h-4" />
              </div>
              <div className="admin-field">
                <label className="admin-label">Display Order (lowest first)</label>
                <input type="number" {...register('sortOrder', { valueAsNumber: true })} className="admin-input" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="admin-label">Theme Color</label>
                  <input type="color" {...register('themeColor')} className="admin-input h-10 p-1" />
                </div>
                <div>
                  <label className="admin-label">Button Color</label>
                  <input type="color" {...register('buttonColor')} className="admin-input h-10 p-1" />
                </div>
                <div>
                  <label className="admin-label">Button Text</label>
                  <input {...register('buttonText')} className="admin-input" placeholder="e.g. Shop the sale" />
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection title="SEO" description="Search engine title, description and meta image.">
            <div className="admin-field">
              <label className="admin-label">SEO Title</label>
              <input {...register('seoTitle')} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-label">SEO Description</label>
              <textarea {...register('seoDescription')} rows={3} className="admin-input" />
            </div>
            <MediaPicker
              label="Meta Image"
              value={seoImage}
              onChange={(url) => {
                setSeoImage(url);
                setDirty(true);
              }}
              ratio="seo"
              folder="collections"
            />
          </FormSection>
        </>
      }
    >
      <form id="collection-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
        <FormSection number={1} title="Basic Information" description="Public details shown on the collection page.">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="admin-field">
              <label className="admin-label">Name</label>
              <input {...register('name', { required: 'Name is required' })} className="admin-input" />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="admin-field">
              <label className="admin-label">Slug</label>
              <input {...register('slug', { required: 'Slug is required' })} className="admin-input" />
              <p className="admin-hint">Lowercase letters, numbers and hyphens — used in the public URL</p>
              {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
            </div>
            <div className="sm:col-span-2 admin-field">
              <label className="admin-label">Short Description</label>
              <textarea {...register('shortDescription')} rows={2} className="admin-input" />
            </div>
            <div className="sm:col-span-2 admin-field">
              <label className="admin-label">Description</label>
              <textarea {...register('description')} rows={3} className="admin-input" />
            </div>
          </div>
        </FormSection>

        <FormSection number={2} title="Media" description="Large visuals used across the storefront, each with its own crop ratio.">
          <MediaPicker
            label="Card Image"
            value={image}
            onChange={(url) => {
              setImage(url);
              setDirty(true);
            }}
            ratio="collection"
            folder="collections"
          />
          <MediaPicker
            label="Banner — Desktop"
            value={bannerImage}
            onChange={(url) => {
              setBannerImage(url);
              setDirty(true);
            }}
            ratio="collectionBannerDesktop"
            folder="collections"
          />
          <MediaPicker
            label="Banner — Tablet"
            value={bannerTablet}
            onChange={(url) => {
              setBannerTablet(url);
              setDirty(true);
            }}
            ratio="collectionBannerTablet"
            folder="collections"
          />
          <MediaPicker
            label="Banner — Mobile"
            value={mobileBanner}
            onChange={(url) => {
              setMobileBanner(url);
              setDirty(true);
            }}
            ratio="collectionBannerMobile"
            folder="collections"
          />
          <MediaPicker
            label="Collection Icon"
            value={icon}
            onChange={(url) => {
              setIcon(url);
              setDirty(true);
            }}
            ratio="square"
            folder="collections"
          />
        </FormSection>
      </form>

      <StickySaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/collections')}
        saveLabel="Save changes"
        previewHref={collectionUrl}
        frontendHref={collectionUrl}
      />
    </PageShell>
  );
}
