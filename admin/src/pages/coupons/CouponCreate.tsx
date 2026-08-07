import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import StickySaveBar from '../../components/ui/StickySaveBar';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface CouponForm {
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'bogo';
  value: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  usageLimit: number;
  perCustomerLimit?: number;
  appliesTo: 'all' | 'specific_products' | 'specific_categories' | 'specific_collections';
  appliesToSaleItems: boolean;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
}

export default function CouponCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { dirty, setDirty } = useUnsavedChanges();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<CouponForm>({
    defaultValues: {
      type: 'percentage',
      appliesTo: 'all',
      appliesToSaleItems: false,
      isActive: true,
      usageLimit: 100,
    },
  });

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  const onSubmit = async (data: CouponForm) => {
    try {
      setLoading(true);
      await api.post('/coupons', data);
      toast.success('Coupon created successfully');
      navigate('/coupons');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Add Coupon"
      subtitle="Create a new discount coupon"
      breadcrumbs={[{ label: 'Coupons', to: '/coupons' }]}
      backTo="/coupons"
    >
      <form id="coupon-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="admin-card p-6 space-y-4">
          <div>
            <label className="admin-label">Coupon Code</label>
            <input {...register('code', { required: 'Code is required' })} className="admin-input mt-1" placeholder="SUMMER2024" />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
          </div>
          <div>
            <label className="admin-label">Name</label>
            <input {...register('name', { required: 'Name is required' })} className="admin-input mt-1" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="admin-label">Description</label>
            <textarea {...register('description')} rows={2} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Type</label>
            <select {...register('type')} className="admin-input mt-1">
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
              <option value="free_shipping">Free Shipping</option>
              <option value="bogo">Buy One Get One</option>
            </select>
          </div>
          <div>
            <label className="admin-label">Value</label>
            <input type="number" {...register('value', { required: 'Value is required', min: 0 })} className="admin-input mt-1" />
            {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>}
          </div>
          <div>
            <label className="admin-label">Minimum Purchase ($)</label>
            <input type="number" {...register('minimumPurchase', { min: 0 })} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Usage Limit</label>
            <input type="number" {...register('usageLimit', { required: true, min: 1 })} className="admin-input mt-1" />
          </div>
          <div className="flex items-center justify-between">
            <label className="admin-label">Active</label>
            <input type="checkbox" {...register('isActive')} className="w-4 h-4" />
          </div>
        </div>
      </form>
      <StickySaveBar
        dirty={dirty}
        saving={loading}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/coupons')}
        saveLabel="Save Coupon"
      />
    </PageShell>
  );
}