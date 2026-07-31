import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePageMeta } from '@/lib/seo';
import { getErrorMessage, isValidEmailAddress } from '@/lib/utils';
import { AuthShell } from '@/components/shared/AuthShell';

export default function ForgotPasswordPage() {
  usePageMeta({ title: 'Forgot Password — BRISTI' });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidEmailAddress(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your inbox" subtitle={`We've sent a password reset link to ${email}.`}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Check className="h-6 w-6" />
          </span>
          <p className="text-sm leading-6 text-muted-foreground">
            The link expires in 30 minutes. If you don't see the email, check your spam folder.
          </p>
          <Link to="/login" className="btn-lux-outline mt-2 w-full">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we'll send you a secure reset link.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <Button type="submit" variant="dark" size="lg" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link to="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-accent">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
