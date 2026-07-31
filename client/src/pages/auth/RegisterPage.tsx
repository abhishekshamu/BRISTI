import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePageMeta } from '@/lib/seo';
import { getErrorMessage, isValidEmailAddress } from '@/lib/utils';
import { AuthShell } from '@/components/shared/AuthShell';

export default function RegisterPage() {
  usePageMeta({ title: 'Create Account — BRISTI' });
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const redirect = new URLSearchParams(location.search).get('redirect') ?? '/account';

  const setField = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!isValidEmailAddress(form.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({ email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName });
      toast.success('Welcome to BRISTI');
      navigate(redirect, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Join the maison for early access and private previews">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" value={form.firstName} onChange={setField('firstName')} autoComplete="given-name" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" value={form.lastName} onChange={setField('lastName')} autoComplete="family-name" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={setField('email')} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={setField('password')} placeholder="Min. 8 characters" autoComplete="new-password" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={setField('confirmPassword')} placeholder="Repeat password" autoComplete="new-password" />
          </div>
        </div>
        <Button type="submit" variant="dark" size="lg" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already a member?{' '}
        <Link to={`/login${redirect !== '/account' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-medium text-foreground underline underline-offset-4 hover:text-accent">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
