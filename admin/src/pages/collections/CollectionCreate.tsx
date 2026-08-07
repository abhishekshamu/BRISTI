import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import MediaPicker from '../../components/media/MediaPicker';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import StickySaveBar from '../../components/ui/StickySaveBar';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface CollectionForm {
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  bannerTablet?: string;
  mobileBanner?: string;
  icon?: string;
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
  seoImage?: string;
}

export default function CollectionCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
    formState: { errors, isDirty },
  } = useForm<CollectionForm>({
    defaultValues: {
      featured: false,
      sortOrder: 0,
      isActive: true,
      showOnHomepage: true,
      showInNavigation: false,
    },
  });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const onSubmit = async (data: CollectionForm) => {
    try {
      setLoading(true);
      await api.post('/collections', {
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
      toast.success('Collection created successfully');
      setDirty(false);
      navigate('/collections');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Add Collection"
      subtitle="Create a collection — assign products from the product page"
      breadcrumbs={[{ label: 'Collections', to: '/collections' }, { label: 'Add Collection' }]}
      backTo="/collections"
      sidebar={
        <>
          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Settings</h3>
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
            <div>
              <label className="admin-label">Display Order (lowest first)</label>
              <input type="number" {...register('sortOrder', { valueAsNumber: true })} className="admin-input mt-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="admin-label">Theme Color</label>
                <input type="color" {...register('themeColor')} className="admin-input mt-1 h-10 p-1" />
              </div>
              <div>
                <label className="admin-label">Button Color</label>
                <input type="color" {...register('buttonColor')} className="admin-input mt-1 h-10 p-1" />
              </div>
              <div>
                <label className="admin-label">Button Text</label>
                <input {...register('buttonText')} className="admin-input mt-1" placeholder="e.g. Shop the sale" />
              </div>
            </div>
          </div>

          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">SEO</h3>
            <div>
              <label className="admin-label">SEO Title</label>
              <input {...register('seoTitle')} className="admin-input mt-1" />
            </div>
            <div>
              <label className="admin-label">SEO Description</label>
              <textarea {...register('seoDescription')} rows={2} className="admin-input mt-1" />
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
          </div>
        </>
      }
    >
      <form id="collection-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="admin-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Basic Information</h3>
          <div>
            <label className="admin-label">Name</label>
            <input {...register('name', { required: 'Name is required' })} className="admin-input mt-1" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="admin-label">Slug</label>
            <input {...register('slug', { required: 'Slug is required' })} className="admin-input mt-1" placeholder="e.g. summer-collection, wedding-collection" />
            <p className="admin-hint mt-1">Lowercase letters, numbers and hyphens — used in the public URL</p>
            {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
          </div>
          <div>
            <label className="admin-label">Short Description</label>
            <textarea {...register('shortDescription')} rows={2} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Description</label>
            <textarea {...register('description')} rows={3} className="admin-input mt-1" />
          </div>
        </div>

        <div className="admin-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Media</h3>
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
        </div>
      </form>

      <StickySaveBar
        dirty={dirty}
        saving={loading}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/collections')}
        saveLabel="Save changes"
      />
    </PageShell>
  );
}
