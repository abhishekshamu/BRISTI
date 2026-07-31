import { useState } from 'react';
import { MapPin, Plus, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/shared/EmptyState';
import { getErrorMessage } from '@/lib/utils';
import type { User } from '@shared/types';

type Address = User['addresses'][number];

const EMPTY: Address = {
  id: '',
  type: 'both',
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'United States',
  phone: '',
  isDefault: false,
};

export default function AddressesPage() {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState<Address | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const addresses = profile?.addresses ?? [];

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const required: Array<keyof Address> = ['firstName', 'lastName', 'addressLine1', 'city', 'state', 'postalCode', 'country', 'phone'];
    for (const field of required) {
      if (!String(editing[field] ?? '').trim()) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    setSaving(true);
    try {
      const { id, ...payload } = editing;
      const existing = addresses.find((address) => address.id === editing.id);
      if (existing) {
        await authService.updateAddress(id, payload);
      } else {
        await authService.addAddress(payload);
      }
      await refreshProfile();
      toast.success(existing ? 'Address updated' : 'Address added');
      setIsAdding(false);
      setEditing(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await authService.deleteAddress(id);
      const remaining = addresses.filter((address) => address.id !== id);
      if (remaining.length === 1 && !remaining[0].isDefault) {
        await authService.setDefaultAddress(remaining[0].id);
      }
      await refreshProfile();
      toast.success('Address removed');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await authService.setDefaultAddress(id);
      await refreshProfile();
      toast.success('Default address updated');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const setField = (field: keyof Address) => (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!editing) return;
    setEditing((prev) => (prev ? { ...prev, [field]: event.target.value } : prev));
  };

  const form = editing ?? EMPTY;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-lux-sm">Saved addresses</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditing({ ...EMPTY });
            setIsAdding(true);
          }}
          disabled={isAdding}
        >
          <Plus className="h-4 w-4" /> Add address
        </Button>
      </div>

      {addresses.length === 0 && !isAdding && (
        <EmptyState
          icon={<MapPin className="h-7 w-7" />}
          title="No addresses saved"
          description="Add an address to make checkout effortless."
        />
      )}

      {!isAdding && addresses.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="flex flex-col gap-4 border border-border p-6">
              <div className="flex items-start justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {address.firstName} {address.lastName}
                  {address.isDefault && <Star className="h-3.5 w-3.5 fill-accent text-accent" />}
                </span>
                <span className="text-[9px] uppercase tracking-lux-sm text-muted-foreground">{address.type}</span>
              </div>
              <address className="text-sm not-italic leading-6 text-muted-foreground">
                {address.addressLine1}
                {address.addressLine2 && <><br />{address.addressLine2}</>}
                <br />
                {address.city}, {address.state} {address.postalCode}
                <br />
                {address.country}
                <br />
                {address.phone}
              </address>
              <div className="mt-auto flex items-center gap-4 border-t border-border pt-4 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEditing({ ...address });
                    setIsAdding(true);
                  }}
                  className="text-accent underline underline-offset-4"
                >
                  Edit
                </button>
                {!address.isDefault && (
                  <button type="button" onClick={() => handleSetDefault(address.id)} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    Set default
                  </button>
                )}
                <button type="button" onClick={() => handleDelete(address.id)} className="ml-auto text-muted-foreground transition-colors hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isAdding && (
        <form onSubmit={handleSave} className="flex flex-col gap-5 border border-border p-8">
          <h3 className="text-xs font-medium uppercase tracking-lux-sm">{editing?.id ? 'Edit address' : 'Add address'}</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="addr-firstName">First name *</Label>
              <Input id="addr-firstName" value={form.firstName} onChange={setField('firstName')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="addr-lastName">Last name *</Label>
              <Input id="addr-lastName" value={form.lastName} onChange={setField('lastName')} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="addr-line1">Address *</Label>
            <Input id="addr-line1" value={form.addressLine1} onChange={setField('addressLine1')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="addr-line2">Apartment, suite (optional)</Label>
            <Input id="addr-line2" value={form.addressLine2} onChange={setField('addressLine2')} />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="addr-city">City *</Label>
              <Input id="addr-city" value={form.city} onChange={setField('city')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="addr-state">State *</Label>
              <Input id="addr-state" value={form.state} onChange={setField('state')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="addr-postal">Postal code *</Label>
              <Input id="addr-postal" value={form.postalCode} onChange={setField('postalCode')} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="addr-country">Country *</Label>
              <Input id="addr-country" value={form.country} onChange={setField('country')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="addr-phone">Phone *</Label>
              <Input id="addr-phone" type="tel" value={form.phone} onChange={setField('phone')} />
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm text-muted-foreground">
            <Checkbox
              checked={form.isDefault}
              onCheckedChange={(checked) => setEditing((prev) => (prev ? { ...prev, isDefault: Boolean(checked) } : prev))}
            />
            Set as default address
          </label>
          <div className="flex gap-3">
            <Button type="submit" variant="dark" disabled={saving}>
              {saving ? 'Saving…' : 'Save address'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsAdding(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
