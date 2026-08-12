import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { getErrorMessage, getInitials } from '@/lib/utils';

const PROVIDER_LABEL: Record<string, string> = {
  email: 'Email',
  google: 'Google',
  phone: 'Phone',
};

const PHONE_PATTERN = /^\+?[1-9]\d{9,14}$/;

export default function ProfilePage() {
  const { profile, refreshProfile, requestOtp, verifyOtp, googleLogin } = useAuth();
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
  const [phoneStep, setPhoneStep] = useState<'idle' | 'otp'>('idle');
  const [phoneInput, setPhoneInput] = useState(profile?.phone ?? '');
  const [otpInput, setOtpInput] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleSendCode = async () => {
    const trimmed = phoneInput.trim();
    if (!PHONE_PATTERN.test(trimmed)) {
      toast.error('Please enter a valid phone number in international format (e.g. +8801712345678)');
      return;
    }
    setSendingOtp(true);
    try {
      const { resendInSeconds } = await requestOtp(trimmed);
      setPhoneStep('otp');
      setOtpInput('');
      startResendCountdown(resendInSeconds);
      toast.success('Verification code sent');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!/^\d{6}$/.test(otpInput)) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setVerifyingOtp(true);
    try {
      await verifyOtp(phoneInput.trim(), otpInput);
      await refreshProfile();
      setForm((prev) => ({ ...prev, phone: phoneInput.trim() }));
      setPhoneStep('idle');
      toast.success('Phone number verified and linked to your account');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleGoogleLink = async (credential: string) => {
    setLinkingGoogle(true);
    try {
      await googleLogin(credential);
      await refreshProfile();
      toast.success('Google account linked');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLinkingGoogle(false);
    }
  };

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
      <div className="flex items-center gap-4 border border-border p-6">
        <Avatar className="h-16 w-16 border border-border">
          {profile?.avatar ? <AvatarImage src={profile.avatar} alt="Profile photo" /> : null}
          <AvatarFallback className="text-base">{getInitials(`${form.firstName || 'B'} ${form.lastName || 'B'}`.trim())}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-display text-xl font-medium">
            {form.firstName || form.lastName ? `${form.firstName} ${form.lastName}`.trim() : 'BRISTI Member'}
          </p>
          <p className="text-sm text-muted-foreground">{profile?.email ?? 'No email on file'}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {profile?.authProvider && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {PROVIDER_LABEL[profile.authProvider] ?? profile.authProvider}
              </Badge>
            )}
            {typeof profile?.rewardPoints === 'number' && (
              <span className="text-[10px] uppercase tracking-wider text-accent">{profile.rewardPoints.toLocaleString()} points</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 border-b border-border pb-8">
        <h2 className="text-xs font-medium uppercase tracking-lux-sm">Sign-in methods</h2>

        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-xs text-muted-foreground">{profile?.email ?? 'No email on file'}</p>
          </div>
          {profile?.emailVerified ? (
            <Badge variant="outline" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider">
              <ShieldOff className="h-3 w-3" /> {profile?.email ? 'Unverified' : 'Not set'}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Phone</p>
            {phoneStep === 'otp' ? (
              <div className="mt-2 flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Code sent to <span className="font-medium text-foreground">{phoneInput.trim()}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    value={otpInput}
                    onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-32 text-center text-lg tracking-[0.4em]"
                  />
                  <Button type="button" variant="dark" size="sm" onClick={handleVerifyCode} disabled={verifyingOtp}>
                    {verifyingOtp && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Verify &amp; link
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneStep('idle');
                      setOtpInput('');
                    }}
                    className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Change number
                  </button>
                  {resendIn > 0 ? (
                    <span className="text-muted-foreground tabular-nums">Resend in {resendIn}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sendingOtp}
                      className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4 hover:text-accent disabled:opacity-50"
                    >
                      <RefreshCw className="h-3 w-3" /> Resend code
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-2 flex max-w-sm items-center gap-2">
                <Input
                  type="tel"
                  inputMode="tel"
                  value={phoneInput}
                  onChange={(event) => setPhoneInput(event.target.value)}
                  placeholder="+8801712345678"
                  className="text-sm"
                />
                {profile?.phone ? (
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-accent">
                    {profile.phoneVerified ? 'Verified' : 'Unverified'}
                  </span>
                ) : null}
              </div>
            )}
          </div>
          {phoneStep !== 'otp' && (
            <Button variant="outline" size="sm" onClick={handleSendCode} disabled={sendingOtp} className="shrink-0">
              {sendingOtp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
              {profile?.phoneVerified ? 'Change phone' : 'Verify phone'}
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-medium">Google</p>
            <p className="text-xs text-muted-foreground">
              {profile?.googleId ? 'Linked to your Google account' : 'Not linked'}
            </p>
          </div>
          {profile?.googleId ? (
            <Badge variant="outline" className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider">
              <ShieldCheck className="h-3 w-3" /> Linked
            </Badge>
          ) : (
            <div className="w-48 shrink-0">
              <GoogleButton onCredential={handleGoogleLink} label="Link Google" />
            </div>
          )}
        </div>
        {linkingGoogle && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Linking your Google account…
          </p>
        )}
      </div>

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
          <Input id="profile-phone" type="tel" value={form.phone} onChange={setField('phone')} placeholder="Phone number" />
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
