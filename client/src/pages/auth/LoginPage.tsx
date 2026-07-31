import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePageMeta } from '@/lib/seo';
import { getErrorMessage } from '@/lib/utils';
import { AuthShell } from '@/components/shared/AuthShell';

export default function LoginPage() {
  usePageMeta({ title: 'Sign In — BRISTI' });
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const redirect = new URLSearchParams(location.search).get('redirect') ?? '/account';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Welcome back');
      navigate(redirect, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your BRISTI account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-accent">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </div>
        <Button type="submit" variant="dark" size="lg" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to BRISTI?{' '}
        <Link to={`/register${redirect !== '/account' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-medium text-foreground underline underline-offset-4 hover:text-accent">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
