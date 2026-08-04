import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getErrorMessage } from '@/lib/utils';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    phone: profile?.phone ?? '',
    gender: profile?.gender ?? 'prefer_not_to_say',
  });
  const [preferences, setPreferences] = useState({
    newsletter: profile?.preferences?.newsletter ?? true,
    marketing: profile?.preferences?.marketing ?? true,
    orderUpdates: profile?.preferences?.orderUpdates ?? true,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const setField = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await authService.updateUserProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        gender: form.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say',
      });
      await refreshProfile();
      toast.success('Profile updated');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePreferences = async () => {
    setSavingPrefs(true);
    try {
      await authService.updatePreferences(preferences);
      toast.success('Preferences saved');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <form onSubmit={handleProfile} className="flex flex-col gap-6">
        <h2 className="text-xs font-medium uppercase tracking-lux-sm">Personal information</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-firstName">First name</Label>
            <Input id="profile-firstName" value={form.firstName} onChange={setField('firstName')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-lastName">Last name</Label>
            <Input id="profile-lastName" value={form.lastName} onChange={setField('lastName')} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-phone">Phone</Label>
          <Input id="profile-phone" type="tel" value={form.phone} onChange={setField('phone')} placeholder="+1 555 000 0000" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="profile-gender">Gender</Label>
          <select id="profile-gender" value={form.gender} onChange={setField('gender')} className="input-lux">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
        <div>
          <Button type="submit" variant="dark" disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>

      <div className="flex flex-col gap-5 border-t border-border pt-8">
        <h2 className="text-xs font-medium uppercase tracking-lux-sm">Communication preferences</h2>
        {(
          [
            { key: 'newsletter' as const, label: 'Newsletter', description: 'Seasonal stories and collection notes' },
            { key: 'marketing' as const, label: 'Marketing', description: 'Offers and private previews' },
            { key: 'orderUpdates' as const, label: 'Order updates', description: 'Shipping and delivery notifications' },
          ]
        ).map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch
              checked={preferences[key]}
              onCheckedChange={(checked) => setPreferences((prev) => ({ ...prev, [key]: checked }))}
            />
          </div>
        ))}
        <div>
          <Button variant="outline" onClick={handlePreferences} disabled={savingPrefs}>
            {savingPrefs && <Loader2 className="h-4 w-4 animate-spin" />}
            Save preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
