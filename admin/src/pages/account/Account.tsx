import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { KeyRound, ShieldCheck, LogOut } from 'lucide-react';
import PageShell from '../../components/ui/PageShell';
import FormSection from '../../components/ui/FormSection';
import StickySaveBar from '../../components/ui/StickySaveBar';
import PageSpinner from '../../components/ui/PageSpinner';
import { useUnsavedChanges } from '../../lib/unsaved-context';
import { useAuth } from '../../lib/auth-context';
import api, { getApiError } from '../../lib/api';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function Account() {
  const { admin, logout, updateAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const { dirty, setDirty } = useUnsavedChanges();

  const profile = useForm<ProfileForm>({ defaultValues: { firstName: '', lastName: '', email: '' } });
  const password = useForm<PasswordForm>();

  useEffect(() => setDirty(profile.formState.isDirty), [profile.formState.isDirty, setDirty]);

  const loadProfile = async () => {
    try {
      const res = await api.get('/admin/me');
      const me = res.data.data;
      profile.reset({
        firstName: me.firstName ?? '',
        lastName: me.lastName ?? '',
        email: me.email ?? '',
      });
    } catch (error) {
      toast.error(getApiError(error, 'Failed to load account'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveProfile = async (data: ProfileForm) => {
    if (!admin) return;
    try {
      setSaving(true);
      const res = await api.put(`/admin/${admin._id}`, {
        firstName: data.firstName,
        lastName: data.lastName,
      });
      const updated = res.data.data;
      updateAdmin({ firstName: updated.firstName, lastName: updated.lastName });
      setDirty(false);
      toast.success('Profile updated');
      void loadProfile();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (data: PasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      setChanging(true);
      await api.post('/admin/me/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      password.reset();
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(getApiError(error, 'Failed to change password'));
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return <PageSpinner label="Loading account…" />;
  }

  return (
    <PageShell
      title="Account & Security"
      subtitle="Manage your admin profile, credentials and sign-in details."
      breadcrumbs={[{ label: 'Account' }]}
    >
      <form id="profile-form" onSubmit={profile.handleSubmit(onSaveProfile)} className="space-y-8 max-w-4xl">
        <FormSection
          number={1}
          title="Profile"
          description="How you appear across the admin panel — this name is shown in the header and on activity logs."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="admin-field">
              <label htmlFor="firstName" className="admin-label">First name</label>
              <input id="firstName" className="admin-input" placeholder="Jane" {...profile.register('firstName', { required: 'First name is required' })} />
              {profile.formState.errors.firstName && (
                <p className="text-xs text-red-600">{profile.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="admin-field">
              <label htmlFor="lastName" className="admin-label">Last name</label>
              <input id="lastName" className="admin-input" placeholder="Doe" {...profile.register('lastName', { required: 'Last name is required' })} />
              {profile.formState.errors.lastName && (
                <p className="text-xs text-red-600">{profile.formState.errors.lastName.message}</p>
              )}
            </div>
            <div className="admin-field sm:col-span-2">
              <label htmlFor="email" className="admin-label">Email</label>
              <input id="email" type="email" className="admin-input" {...profile.register('email')} disabled />
              <p className="admin-hint">Email address is managed by an administrator. Contact your super admin to change it.</p>
            </div>
          </div>
        </FormSection>

        <FormSection
          number={2}
          title="Change password"
          description="Use a strong password you do not use anywhere else. You will not be signed out after changing it."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="admin-field">
              <label htmlFor="currentPassword" className="admin-label">Current password</label>
              <input id="currentPassword" type="password" className="admin-input" autoComplete="current-password" {...password.register('currentPassword', { required: 'Current password is required' })} />
              {password.formState.errors.currentPassword && (
                <p className="text-xs text-red-600">{password.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="hidden sm:block" />
            <div className="admin-field">
              <label htmlFor="newPassword" className="admin-label">New password</label>
              <input id="newPassword" type="password" className="admin-input" autoComplete="new-password" {...password.register('newPassword', { required: 'New password is required', minLength: { value: 8, message: 'Must be at least 8 characters' } })} />
              {password.formState.errors.newPassword && (
                <p className="text-xs text-red-600">{password.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="admin-field">
              <label htmlFor="confirmPassword" className="admin-label">Confirm new password</label>
              <input id="confirmPassword" type="password" className="admin-input" autoComplete="new-password" {...password.register('confirmPassword', { required: 'Please confirm the new password' })} />
              {password.formState.errors.confirmPassword && (
                <p className="text-xs text-red-600">{password.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button type="button" onClick={password.handleSubmit(onChangePassword)} disabled={changing} className="admin-btn-secondary">
              <KeyRound className="w-4 h-4 mr-2" />
              {changing ? 'Changing…' : 'Update password'}
            </button>
          </div>
        </FormSection>

        <FormSection number={3} title="Session" description="Your sign-in status in this browser.">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Signed in as {admin?.email}</p>
                <p className="text-xs text-slate-500 capitalize">{admin?.role?.replace('_', ' ')} · Active session</p>
              </div>
            </div>
            <button type="button" onClick={logout} className="admin-btn-danger !h-9 text-xs">
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign out of this browser
            </button>
          </div>
        </FormSection>
      </form>

      <StickySaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => profile.handleSubmit(onSaveProfile)()}
        saveLabel="Save profile"
      />
    </PageShell>
  );
}
