import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Smartphone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/utils';

const PHONE_PATTERN = /^\+?[1-9]\d{9,14}$/;

/**
 * PhoneOtpForm — phone-number OTP sign in.
 *
 * Flow: phone → request code → 6-digit verification → authenticated session.
 * A 30s resend cooldown and a 5-attempt limit are enforced server-side; this
 * form mirrors the cooldown with a local countdown for a premium feel.
 */
export function PhoneOtpForm() {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const redirect = new URLSearchParams(location.search).get('redirect') ?? '/account';

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendCountdown = (seconds: number) => {
    setResendIn(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendIn((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = phone.trim();
    if (!PHONE_PATTERN.test(trimmed)) {
      toast.error('Please enter a valid phone number in international format (e.g. +8801712345678)');
      return;
    }
    setLoading(true);
    try {
      const { resendInSeconds } = await requestOtp(trimmed);
      setStep('otp');
      setOtp('');
      startResendCountdown(resendInSeconds);
      toast.success('Verification code sent');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone.trim(), otp);
      toast.success('Welcome to BRISTI');
      navigate(redirect, { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={handleRequestCode} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="otp-phone">Phone number</Label>
          <Input
            id="otp-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+8801712345678"
            autoComplete="tel"
            autoFocus
          />
        </div>
        <Button type="submit" variant="dark" size="lg" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
          Send verification code
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          We&apos;ll send a 6-digit code to this number. No password needed.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerify} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="otp-code">Verification code</Label>
        <Input
          id="otp-code"
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="text-center text-xl tracking-[0.6em]"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Sent to <span className="font-medium text-foreground">{phone}</span>
        </p>
      </div>
      <Button type="submit" variant="dark" size="lg" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Sign in
      </Button>
      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => {
            setStep('phone');
            setOtp('');
          }}
          className="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Change number
        </button>
        {resendIn > 0 ? (
          <span className="text-muted-foreground tabular-nums">Resend in {resendIn}s</span>
        ) : (
          <button
            type="button"
            onClick={handleRequestCode}
            disabled={loading}
            className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4 transition-colors hover:text-accent disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" /> Resend code
          </button>
        )}
      </div>
    </form>
  );
}
