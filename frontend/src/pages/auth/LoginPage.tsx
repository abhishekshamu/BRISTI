import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoogleButton, GoogleLogo } from '@/components/auth/GoogleButton';
import { PhoneOtpForm } from '@/components/auth/PhoneOtpForm';
import { usePageMeta } from '@/lib/seo';
import { getErrorMessage } from '@/lib/utils';
import { AuthShell } from '@/components/shared/AuthShell';
import { useBrandName } from '@/context/SettingsContext';

export default function LoginPage() {
  const brandName = useBrandName();
  usePageMeta({ title: `Sign In — ${brandName}` });
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleCredential = async (credential: string) => {
    setGoogleLoading(true);
    try {
      await googleLogin(credential);
      toast.success('Welcome back');
      navigate(redirect, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your BRISTI account">
      <Tabs defaultValue="email" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="google" className="flex-1 gap-1.5">
            <GoogleLogo size={14} /> Google
          </TabsTrigger>
          <TabsTrigger value="phone" className="flex-1 gap-1.5">
            <Smartphone className="h-3.5 w-3.5" /> Phone
          </TabsTrigger>
          <TabsTrigger value="email" className="flex-1 gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="google">
          <GoogleButton onCredential={handleGoogleCredential} />
          {googleLoading && (
            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying your Google account…
            </p>
          )}
        </TabsContent>

        <TabsContent value="phone">
          <PhoneOtpForm />
        </TabsContent>

        <TabsContent value="email">
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
        </TabsContent>
      </Tabs>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to BRISTI?{' '}
        <Link to={`/register${redirect !== '/account' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-medium text-foreground underline underline-offset-4 hover:text-accent">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
