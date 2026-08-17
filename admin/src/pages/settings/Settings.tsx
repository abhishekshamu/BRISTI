import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Clock,
  CreditCard,
  Database,
  Download,
  Fingerprint,
  Globe,
  HardDriveDownload,
  HardDriveUpload,
  Image,
  Info,
  KeyRound,
  Link2,
  Lock,
  Mail,
  MapPin,
  Percent,
  Pin,
  Plug,
  Search,
  Send,
  ShieldCheck,
  Store,
  Truck,
  Upload,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import MediaPicker from '../../components/media/MediaPicker';
import PageShell from '../../components/ui/PageShell';
import PageSpinner from '../../components/ui/PageSpinner';
import StickySaveBar from '../../components/ui/StickySaveBar';
import { useUnsavedChanges } from '../../lib/unsaved-context';
import { CURRENCIES, DEFAULT_BRAND_TYPOGRAPHY, DEFAULT_EXCHANGE_RATES } from '@shared/constants';
import type { BrandNameTypography } from '@shared/types';
import { normalizeBrandNameTypography } from '@shared/utils';
import { BrandTypographyEditor } from '../../components/settings/BrandTypographyEditor';

/* ============================================================
   Constants
   ============================================================ */

const LS_EXTRAS_KEY = 'bristi.settings.extras.v1';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;
const URL_RE = /^https?:\/\//i;
const GST_RE = /^[A-Za-z0-9]{5,20}$/;
const GA_RE = /^G-[A-Z0-9]{6,12}$/;
const PIXEL_RE = /^\d{15,16}$/;
const REGION_RE = /^[a-z]{2}(-[a-z]+)+-\d$/;

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const LANGUAGES = [
  'English',
  'Français',
  'Deutsch',
  'Español',
  'Português',
  'Italiano',
  'Nederlands',
  'Türkçe',
  'العربية',
  'हिन्दी',
  '中文',
  '日本語',
  '한국어',
];

const WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz'];
const DIMENSION_UNITS = ['cm', 'in'];
const PAYMENT_DEFAULTS = ['Auto Capture', 'Manual Capture', 'Authorize Only'];
const TAX_DISPLAY_MODES = ['Inclusive', 'Exclusive'];

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'twitter', label: 'Twitter / X' },
  { key: 'tiktok', label: 'TikTok' },
];

/* ============================================================
   Types
   ============================================================ */

interface SocialLink {
  platform: string;
  url: string;
}

interface FormState {
  brandName: string;
  slogan: string;
  logo: string;
  favicon: string;
  contactInfo: { email: string; phone: string; address: string };
  socialLinks: SocialLink[];
  seo: { defaultTitle: string; defaultDescription: string; defaultImage: string };
  currency: string;
  baseCurrency: string;
  exchangeRates: Record<string, string>;
  brandIdentity: {
    wordmarkMode: 'text' | 'image';
    wordmarkText: string;
    wordmarkImageUrl: string;
    iconImageUrl: string;
  };
  brandNameTypography: BrandNameTypography;
  taxGstRate: number;
  freeShippingThreshold: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  policies: { privacy: string; terms: string; refund: string; shipping: string };
  orderSettings: {
    orderNumberPrefix: string;
    orderNumberLength?: number;
    allowGuestCheckout?: boolean;
    requirePhoneForShipping?: boolean;
    autoFulfillDigital?: boolean;
  };
  emailSettings: {
    fromName: string;
    fromEmail: string;
    replyTo: string;
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPass: string;
    sendgridApiKey: string;
    mailgunApiKey: string;
    mailgunDomain: string;
  };
  securitySettings: {
    sessionTimeout: number;
    rateLimitAuth: number;
    rateLimitApi: number;
    passwordMinLength: number;
    requirePasswordComplexity: boolean;
    requireEmailVerification: boolean;
  };
}

interface ExtrasState {
  store: {
    legalBusinessName: string;
    whatsApp: string;
    country: string;
    state: string;
    city: string;
    postalCode: string;
    timezone: string;
    language: string;
    gstVat: string;
  };
  contact: {
    supportEmail: string;
    salesEmail: string;
    returnEmail: string;
    businessHours: string;
    googleMaps: string;
  };
  seo: { keywords: string; robots: string; canonicalDomain: string; analyticsIds: string };
  shipping: {
    defaultOrigin: string;
    weightUnit: string;
    dimensionUnit: string;
    defaultCourier: string;
    packagingSettings: string;
  };
  tax: { vatRate: string; taxIncluded: boolean; taxDisplay: string };
  payment: { paymentDefaults: string; codEnabled: boolean };
  security: { twoFactorAuth: boolean; apiKeys: string };
  integrations: {
    cloudinary: { cloudName: string; apiKey: string; apiSecret: string };
    awsS3: { bucket: string; region: string; accessKey: string; secretKey: string };
    stripe: { publishableKey: string; secretKey: string; webhookSecret: string };
    razorpay: { keyId: string; keySecret: string };
    googleAnalytics: { measurementId: string };
    metaPixel: { pixelId: string };
    searchConsole: { verificationCode: string };
  };
}

interface Baseline {
  form: FormState;
  extras: ExtrasState;
}

const DEFAULT_FORM: FormState = {
  brandName: 'BRISTI',
  slogan: '',
  logo: '',
  favicon: '',
  contactInfo: { email: '', phone: '', address: '' },
  socialLinks: [],
  seo: { defaultTitle: '', defaultDescription: '', defaultImage: '' },
  currency: 'USD',
  baseCurrency: 'INR',
  exchangeRates: {},
  brandIdentity: {
    wordmarkMode: 'text',
    wordmarkText: '',
    wordmarkImageUrl: '',
    iconImageUrl: '',
  },
  brandNameTypography: { ...DEFAULT_BRAND_TYPOGRAPHY },
  taxGstRate: 10,
  freeShippingThreshold: 100,
  maintenanceMode: false,
  maintenanceMessage: '',
  policies: { privacy: '/privacy', terms: '/terms', refund: '/refund', shipping: '/shipping' },
  orderSettings: {
    orderNumberPrefix: 'BRS',
    orderNumberLength: 8,
    allowGuestCheckout: true,
    requirePhoneForShipping: true,
    autoFulfillDigital: true,
  },
  emailSettings: {
    fromName: 'BRISTI',
    fromEmail: 'hello@bristi.com',
    replyTo: 'hello@bristi.com',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    sendgridApiKey: '',
    mailgunApiKey: '',
    mailgunDomain: '',
  },
  securitySettings: {
    sessionTimeout: 30,
    rateLimitAuth: 5,
    rateLimitApi: 100,
    passwordMinLength: 8,
    requirePasswordComplexity: true,
    requireEmailVerification: true,
  },
};

const DEFAULT_EXTRAS: ExtrasState = {
  store: {
    legalBusinessName: '',
    whatsApp: '',
    country: '',
    state: '',
    city: '',
    postalCode: '',
    timezone: '',
    language: '',
    gstVat: '',
  },
  contact: { supportEmail: '', salesEmail: '', returnEmail: '', businessHours: '', googleMaps: '' },
  seo: { keywords: '', robots: '', canonicalDomain: '', analyticsIds: '' },
  shipping: { defaultOrigin: '', weightUnit: 'kg', dimensionUnit: 'cm', defaultCourier: '', packagingSettings: '' },
  tax: { vatRate: '', taxIncluded: false, taxDisplay: 'Exclusive' },
  payment: { paymentDefaults: 'Auto Capture', codEnabled: false },
  security: { twoFactorAuth: false, apiKeys: '' },
  integrations: {
    cloudinary: { cloudName: '', apiKey: '', apiSecret: '' },
    awsS3: { bucket: '', region: '', accessKey: '', secretKey: '' },
    stripe: { publishableKey: '', secretKey: '', webhookSecret: '' },
    razorpay: { keyId: '', keySecret: '' },
    googleAnalytics: { measurementId: '' },
    metaPixel: { pixelId: '' },
    searchConsole: { verificationCode: '' },
  },
};

const TABS = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'store', label: 'Store', icon: Store },
  { id: 'social', label: 'Social', icon: Link2 },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'tax', label: 'Tax', icon: Percent },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'backup', label: 'Backup', icon: Database },
] as const;

type TabId = (typeof TABS)[number]['id'];

/* ============================================================
   Helpers
   ============================================================ */

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

function mergeExtras(raw: unknown): ExtrasState {
  const def = DEFAULT_EXTRAS;
  if (!isRecord(raw)) return def;
  const rawInt = isRecord(raw.integrations) ? raw.integrations : {};
  return {
    store: { ...def.store, ...(isRecord(raw.store) ? raw.store : {}) },
    contact: { ...def.contact, ...(isRecord(raw.contact) ? raw.contact : {}) },
    seo: { ...def.seo, ...(isRecord(raw.seo) ? raw.seo : {}) },
    shipping: { ...def.shipping, ...(isRecord(raw.shipping) ? raw.shipping : {}) },
    tax: { ...def.tax, ...(isRecord(raw.tax) ? raw.tax : {}) },
    payment: { ...def.payment, ...(isRecord(raw.payment) ? raw.payment : {}) },
    security: { ...def.security, ...(isRecord(raw.security) ? raw.security : {}) },
    integrations: {
      cloudinary: { ...def.integrations.cloudinary, ...(isRecord(rawInt.cloudinary) ? rawInt.cloudinary : {}) },
      awsS3: { ...def.integrations.awsS3, ...(isRecord(rawInt.awsS3) ? rawInt.awsS3 : {}) },
      stripe: { ...def.integrations.stripe, ...(isRecord(rawInt.stripe) ? rawInt.stripe : {}) },
      razorpay: { ...def.integrations.razorpay, ...(isRecord(rawInt.razorpay) ? rawInt.razorpay : {}) },
      googleAnalytics: {
        ...def.integrations.googleAnalytics,
        ...(isRecord(rawInt.googleAnalytics) ? rawInt.googleAnalytics : {}),
      },
      metaPixel: { ...def.integrations.metaPixel, ...(isRecord(rawInt.metaPixel) ? rawInt.metaPixel : {}) },
      searchConsole: {
        ...def.integrations.searchConsole,
        ...(isRecord(rawInt.searchConsole) ? rawInt.searchConsole : {}),
      },
    },
  };
}

function mergeForm(raw: Record<string, unknown>): FormState {
  const d = DEFAULT_FORM;
  const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && !Number.isNaN(v) ? v : fallback);
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    brandName: str(raw.brandName, d.brandName),
    slogan: str(raw.slogan, d.slogan),
    logo: str(raw.logo, d.logo),
    favicon: str(raw.favicon, d.favicon),
    contactInfo: {
      ...d.contactInfo,
      ...(isRecord(raw.contactInfo) ? raw.contactInfo : {}),
    },
    socialLinks: Array.isArray(raw.socialLinks) ? (raw.socialLinks as SocialLink[]) : d.socialLinks,
    seo: { ...d.seo, ...(isRecord(raw.seo) ? raw.seo : {}) },
    currency: str(raw.currency, d.currency),
    baseCurrency: str(raw.baseCurrency, d.baseCurrency).toUpperCase(),
    exchangeRates: isRecord(raw.exchangeRates)
      ? Object.fromEntries(
          Object.entries(raw.exchangeRates)
            .filter(([, value]) => typeof value === 'number' && value > 0)
            .map(([code, value]) => [code.toUpperCase(), String(value)]),
        )
      : {},
    brandIdentity: (() => {
      const rawBI = isRecord(raw.brandIdentity) ? raw.brandIdentity : {};
      const rawWM = isRecord(rawBI.wordmark) ? rawBI.wordmark : {};
      const legacyLogo = str(raw.logo, '');
      return {
        wordmarkMode:
          rawWM.mode === 'image' || rawWM.mode === 'text'
            ? rawWM.mode
            : legacyLogo
              ? 'image'
              : d.brandIdentity.wordmarkMode,
        wordmarkText: str(rawWM.text, str(raw.brandName, d.brandName)),
        wordmarkImageUrl: str(rawWM.imageUrl, legacyLogo),
        iconImageUrl: str(isRecord(rawBI.icon) ? rawBI.icon.imageUrl : undefined, ''),
      };
    })(),
    brandNameTypography: normalizeBrandNameTypography(
      isRecord(raw.brandNameTypography) ? (raw.brandNameTypography as Partial<BrandNameTypography>) : undefined,
    ),
    taxGstRate: num(raw.taxGstRate, d.taxGstRate),
    freeShippingThreshold: num(raw.freeShippingThreshold, d.freeShippingThreshold),
    maintenanceMode: bool(raw.maintenanceMode, d.maintenanceMode),
    maintenanceMessage: str(raw.maintenanceMessage, d.maintenanceMessage),
    policies: { ...d.policies, ...(isRecord(raw.policies) ? raw.policies : {}) },
    orderSettings: { ...d.orderSettings, ...(isRecord(raw.orderSettings) ? raw.orderSettings : {}) },
    emailSettings: { ...d.emailSettings, ...(isRecord(raw.emailSettings) ? raw.emailSettings : {}) },
    securitySettings: { ...d.securitySettings, ...(isRecord(raw.securitySettings) ? raw.securitySettings : {}) },
  };
}

function buildPayload(f: FormState) {
  const smtp: Record<string, unknown> = {};
  if (f.emailSettings.smtpHost.trim()) smtp.smtpHost = f.emailSettings.smtpHost.trim();
  if (f.emailSettings.smtpPort.trim()) {
    const port = parseInt(f.emailSettings.smtpPort, 10);
    if (!Number.isNaN(port)) smtp.smtpPort = port;
  }
  if (f.emailSettings.smtpUser.trim()) smtp.smtpUser = f.emailSettings.smtpUser.trim();
  if (f.emailSettings.smtpPass) smtp.smtpPass = f.emailSettings.smtpPass;
  if (f.emailSettings.sendgridApiKey) smtp.sendgridApiKey = f.emailSettings.sendgridApiKey;
  if (f.emailSettings.mailgunApiKey) smtp.mailgunApiKey = f.emailSettings.mailgunApiKey;
  if (f.emailSettings.mailgunDomain) smtp.mailgunDomain = f.emailSettings.mailgunDomain;
  return {
    brandName: f.brandName.trim() || 'BRISTI',
    slogan: f.slogan.trim(),
    favicon: f.favicon,
    contactInfo: {
      email: f.contactInfo.email.trim(),
      phone: f.contactInfo.phone.trim(),
      address: f.contactInfo.address.trim(),
    },
    socialLinks: f.socialLinks
      .filter((l) => l.url.trim())
      .map((l) => ({ platform: l.platform, url: l.url.trim() })),
    seo: {
      defaultTitle: f.seo.defaultTitle.trim(),
      defaultDescription: f.seo.defaultDescription.trim(),
      defaultImage: f.seo.defaultImage,
    },
    currency: f.currency,
    baseCurrency: f.baseCurrency || 'INR',
    exchangeRates: (() => {
      const rates: Record<string, number> = {};
      for (const [code, value] of Object.entries(f.exchangeRates)) {
        const num = Number(value);
        if (value.trim() && Number.isFinite(num) && num > 0) rates[code.toUpperCase()] = num;
      }
      return rates;
    })(),
    brandIdentity: {
      wordmark: {
        mode: f.brandIdentity.wordmarkMode,
        text: f.brandIdentity.wordmarkText.trim() || f.brandName.trim() || 'BRISTI',
        imageUrl: f.brandIdentity.wordmarkImageUrl || null,
      },
      icon: { imageUrl: f.brandIdentity.iconImageUrl || null },
    },
    brandNameTypography: normalizeBrandNameTypography(f.brandNameTypography),
    // Backward compatibility: keep the legacy logo field in sync with the
    // wordmark image so older consumers of settings.logo keep working.
    logo: f.brandIdentity.wordmarkImageUrl || f.logo,
    taxRate: (Number(f.taxGstRate) || 0) / 100,
    freeShippingThreshold: Number(f.freeShippingThreshold) || 0,
    maintenanceMode: f.maintenanceMode,
    maintenanceMessage: f.maintenanceMessage,
    policies: {
      privacy: f.policies.privacy.trim(),
      terms: f.policies.terms.trim(),
      refund: f.policies.refund.trim(),
      shipping: f.policies.shipping.trim(),
    },
    orderSettings: {
      ...f.orderSettings,
      orderNumberPrefix: f.orderSettings.orderNumberPrefix.trim(),
    },
    emailSettings: {
      fromName: f.emailSettings.fromName.trim() || 'BRISTI',
      fromEmail: f.emailSettings.fromEmail.trim(),
      replyTo: f.emailSettings.replyTo.trim(),
      ...smtp,
    },
    securitySettings: f.securitySettings,
  };
}

/* ============================================================
   Small presentational components
   ============================================================ */

function Card({
  icon: Icon,
  title,
  description,
  local,
  children,
  className = '',
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  local?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`admin-card p-6 ${className}`}>
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
        </div>
        {local && (
          <span className="admin-badge bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20 shrink-0">
            Browser-local
          </span>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  local,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  local?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="admin-label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {local && (
          <span className="ml-1.5 inline-block text-[10px] font-medium text-amber-600 dark:text-amber-400">browser-local</span>
        )}
      </label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

/* ============================================================
   Settings page
   ============================================================ */

export default function Settings() {
  const { dirty, setDirty } = useUnsavedChanges();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [extras, setExtras] = useState<ExtrasState>(DEFAULT_EXTRAS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const baselineRef = useRef<Baseline | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const actionRef = useRef<'import' | 'restore'>('import');

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExtras = () => {
    try {
      const raw = localStorage.getItem(LS_EXTRAS_KEY);
      return raw ? mergeExtras(JSON.parse(raw)) : DEFAULT_EXTRAS;
    } catch {
      return DEFAULT_EXTRAS;
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings');
      const data = (response.data?.data ?? {}) as Record<string, unknown>;
      const merged = mergeForm(data);
      setForm(merged);
      const loadedExtras = loadExtras();
      setExtras(loadedExtras);
      baselineRef.current = { form: clone(merged), extras: clone(loadedExtras) };
    } catch {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const update = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const updateExtras = (patch: Partial<ExtrasState>) => {
    setExtras((e) => ({ ...e, ...patch }));
    setDirty(true);
  };

  const updateSocial = (platform: string, url: string) => {
    const rest = form.socialLinks.filter((l) => l.platform !== platform);
    update({ socialLinks: url.trim() ? [...rest, { platform, url }] : rest });
  };

  const inputCls = (id: string) =>
    `admin-input w-full ${errors[id] ? 'border-red-400' : ''}`;

  const textareaCls = (id: string) =>
    `admin-input w-full min-h-24 resize-y py-3 leading-relaxed ${errors[id] ? 'border-red-400' : ''}`;

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (!form.brandName.trim()) errs['general.brandName'] = 'Store name is required';
    if (!form.contactInfo.email.trim()) errs['general.email'] = 'Contact email is required';
    else if (!EMAIL_RE.test(form.contactInfo.email.trim())) errs['general.email'] = 'Enter a valid email address';
    if (form.contactInfo.phone.trim() && !PHONE_RE.test(form.contactInfo.phone.trim())) {
      errs['general.phone'] = 'Enter a valid phone number';
    }
    if (extras.store.whatsApp.trim() && !PHONE_RE.test(extras.store.whatsApp.trim())) {
      errs['general.whatsApp'] = 'Enter a valid WhatsApp number';
    }
    if (extras.store.gstVat.trim() && !GST_RE.test(extras.store.gstVat.trim())) {
      errs['general.gstVat'] = 'GST/VAT must be 5–20 alphanumeric characters';
    }
    if (!CURRENCIES.some((c) => c.code === form.currency)) {
      errs['general.currency'] = 'Select a valid currency';
    }
    if (!CURRENCIES.some((c) => c.code === form.baseCurrency)) {
      errs['general.baseCurrency'] = 'Select a valid base currency';
    }
    for (const [code, value] of Object.entries(form.exchangeRates)) {
      const num = Number(value);
      if (value.trim() && (!Number.isFinite(num) || num <= 0)) {
        errs[`general.rate.${code}`] = 'Rate must be a positive number';
      }
    }
    if (form.brandIdentity.wordmarkImageUrl && !/^(https?:\/\/|\/uploads\/)/i.test(form.brandIdentity.wordmarkImageUrl)) {
      errs['general.wordmarkImage'] = 'Must be an http(s) URL or /uploads/ path';
    }
    if (form.brandIdentity.iconImageUrl && !/^(https?:\/\/|\/uploads\/)/i.test(form.brandIdentity.iconImageUrl)) {
      errs['general.brandIcon'] = 'Must be an http(s) URL or /uploads/ path';
    }
    if (extras.store.timezone && !TIMEZONES.includes(extras.store.timezone)) {
      errs['general.timezone'] = 'Select a valid timezone';
    }

    form.socialLinks.forEach((l) => {
      if (l.url && !URL_RE.test(l.url)) errs[`social.${l.platform}`] = 'URL must start with http:// or https://';
    });

    if (form.seo.defaultTitle.length > 120) errs['seo.defaultTitle'] = 'Keep under 120 characters';
    if (form.seo.defaultDescription.length > 160) errs['seo.defaultDescription'] = 'Keep under 160 characters';
    if (extras.seo.canonicalDomain && !URL_RE.test(extras.seo.canonicalDomain)) {
      errs['seo.canonicalDomain'] = 'Must start with http:// or https://';
    }
    if (
      extras.seo.analyticsIds.split('\n').some((line) => line.trim() && !/^[A-Za-z0-9_-]{4,32}$/.test(line.trim()))
    ) {
      errs['seo.analyticsIds'] = 'One alphanumeric ID per line';
    }

    (['supportEmail', 'salesEmail', 'returnEmail'] as const).forEach((key) => {
      const value = extras.contact[key];
      if (value.trim() && !EMAIL_RE.test(value.trim())) errs[`store.${key}`] = 'Enter a valid email address';
    });
    if (extras.contact.googleMaps && !URL_RE.test(extras.contact.googleMaps)) {
      errs['store.googleMaps'] = 'Must start with http:// or https://';
    }

    (['privacy', 'terms', 'refund', 'shipping'] as const).forEach((key) => {
      const value = form.policies[key];
      if (value && !/^\/(?!\/)/.test(value) && !URL_RE.test(value)) {
        errs[`store.${key}`] = 'Use a path (e.g. /privacy) or an http(s) URL';
      }
    });

    if (form.emailSettings.fromEmail && !EMAIL_RE.test(form.emailSettings.fromEmail.trim())) {
      errs['email.fromEmail'] = 'Enter a valid sender email';
    }
    if (form.emailSettings.replyTo && !EMAIL_RE.test(form.emailSettings.replyTo.trim())) {
      errs['email.replyTo'] = 'Enter a valid reply email';
    }
    if (form.emailSettings.smtpPort.trim()) {
      const port = parseInt(form.emailSettings.smtpPort, 10);
      if (Number.isNaN(port) || port < 1 || port > 65535) errs['email.smtpPort'] = 'Port must be 1–65535';
    }
    if (form.emailSettings.sendgridApiKey && !/^SG\.[A-Za-z0-9_-]+$/.test(form.emailSettings.sendgridApiKey.trim())) {
      errs['email.sendgrid'] = 'SendGrid keys start with "SG."';
    }

    if (!/^[A-Za-z0-9_-]{1,10}$/.test(form.orderSettings.orderNumberPrefix)) {      errs['payments.invoicePrefix'] = '1–10 letters, numbers, _ or -';
    }

    if (form.securitySettings.sessionTimeout < 1 || form.securitySettings.sessionTimeout > 1440) {
      errs['security.sessionTimeout'] = '1–1440 minutes';
    }
    if (form.securitySettings.passwordMinLength < 6 || form.securitySettings.passwordMinLength > 64) {
      errs['security.passwordMinLength'] = '6–64 characters';
    }
    if (form.securitySettings.rateLimitAuth < 1 || form.securitySettings.rateLimitAuth > 100) {
      errs['security.loginAttempts'] = '1–100 attempts';
    }

    if (
      extras.integrations.googleAnalytics.measurementId &&
      !GA_RE.test(extras.integrations.googleAnalytics.measurementId.trim())
    ) {
      errs['integrations.ga'] = 'Format: G-XXXXXXXXXX';
    }
    if (extras.integrations.metaPixel.pixelId && !PIXEL_RE.test(extras.integrations.metaPixel.pixelId.trim())) {
      errs['integrations.pixel'] = 'Meta Pixel IDs are 15–16 digits';
    }
    if (extras.integrations.awsS3.region && !REGION_RE.test(extras.integrations.awsS3.region.trim())) {
      errs['integrations.s3'] = 'e.g. us-east-1';
    }

    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstTab = Object.keys(errs)[0].split('.')[0] as TabId;
      setActiveTab(firstTab);
      toast.error('Please fix the highlighted fields before saving');
      return;
    }
    setSaving(true);
    try {
      await api.put('/settings', buildPayload(form));
      localStorage.setItem(LS_EXTRAS_KEY, JSON.stringify(extras));
      baselineRef.current = { form: clone(form), extras: clone(extras) };
      setErrors({});
      setDirty(false);
      toast.success('Settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (baselineRef.current) {
      setForm(clone(baselineRef.current.form));
      setExtras(clone(baselineRef.current.extras));
      setErrors({});
    }
    setDirty(false);
  };

  const handleEmailTest = () => {
    if (!form.emailSettings.smtpHost.trim() || !form.emailSettings.smtpPort.trim()) {
      toast.error('Enter an SMTP host and port first');
      return;
    }
    toast.success('SMTP configuration looks valid — save to apply');
  };

  const exportData = () => ({
    app: 'bristi-settings',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: form,
    extras,
  });

  const handleExport = () => {
    downloadJson(`bristi-settings-${new Date().toISOString().slice(0, 10)}.json`, exportData());
    toast.success('Settings exported');
  };

  const handleBackup = () => {
    downloadJson(
      `bristi-settings-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
      exportData()
    );
    toast.success('Backup downloaded');
  };

  const restoreFrom = async (f: FormState, e: ExtrasState) => {
    setSaving(true);
    try {
      await api.put('/settings', buildPayload(f));
      localStorage.setItem(LS_EXTRAS_KEY, JSON.stringify(e));
      setForm(f);
      setExtras(e);
      setErrors({});
      setDirty(false);
      baselineRef.current = { form: clone(f), extras: clone(e) };
      toast.success('Settings restored from backup');
    } catch {
      toast.error('Restore failed — please try again');
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isRecord(parsed) || !isRecord(parsed.settings) || !isRecord(parsed.extras)) {
        toast.error('Invalid settings file — expected a BRISTI settings export');
        return;
      }
      const f = mergeForm(parsed.settings);
      const e = mergeExtras(parsed.extras);
      if (actionRef.current === 'restore') {
        await restoreFrom(f, e);
      } else {
        setForm(f);
        setExtras(e);
        setErrors({});
        setDirty(true);
        toast.success('Settings imported — review and save');
      }
    } catch {
      toast.error('Could not parse the selected file');
    }
  };

  const triggerFile = (action: 'import' | 'restore') => {
    actionRef.current = action;
    fileRef.current?.click();
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card icon={Building2} title="Store Information" description="Identity, contact and locale details for the store">
              <Field label="Store Name" required error={errors['general.brandName']}>
                <input
                  type="text"
                  value={form.brandName}
                  onChange={(e) => update({ brandName: e.target.value })}
                  className={inputCls('general.brandName')}
                  placeholder="BRISTI"
                />
              </Field>
              <Field label="Brand Slogan" hint="Short tagline shown alongside the brand">
                <input
                  type="text"
                  value={form.slogan}
                  onChange={(e) => update({ slogan: e.target.value })}
                  className={inputCls('general.slogan')}
                  placeholder="Luxury, redefined"
                />
              </Field>
              <Field label="Legal Business Name" local>
                <input
                  type="text"
                  value={extras.store.legalBusinessName}
                  onChange={(e) => updateExtras({ store: { ...extras.store, legalBusinessName: e.target.value } })}
                  className={inputCls('general.legalBusinessName')}
                  placeholder="BRISTI LLP"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email" required error={errors['general.email']}>
                  <input
                    type="text"
                    value={form.contactInfo.email}
                    onChange={(e) => update({ contactInfo: { ...form.contactInfo, email: e.target.value } })}
                    className={inputCls('general.email')}
                    placeholder="hello@bristi.com"
                  />
                </Field>
                <Field label="Phone" error={errors['general.phone']}>
                  <input
                    type="text"
                    value={form.contactInfo.phone}
                    onChange={(e) => update({ contactInfo: { ...form.contactInfo, phone: e.target.value } })}
                    className={inputCls('general.phone')}
                    placeholder="+1 555 000 0000"
                  />
                </Field>
              </div>
              <Field label="WhatsApp" local error={errors['general.whatsApp']}>
                <input
                  type="text"
                  value={extras.store.whatsApp}
                  onChange={(e) => updateExtras({ store: { ...extras.store, whatsApp: e.target.value } })}
                  className={inputCls('general.whatsApp')}
                  placeholder="+1 555 000 0000"
                />
              </Field>
              <Field label="Address">
                <textarea
                  value={form.contactInfo.address}
                  onChange={(e) => update({ contactInfo: { ...form.contactInfo, address: e.target.value } })}
                  className={textareaCls('general.address')}
                  rows={2}
                  placeholder="Street, building, area"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Country" local>
                  <input
                    type="text"
                    value={extras.store.country}
                    onChange={(e) => updateExtras({ store: { ...extras.store, country: e.target.value } })}
                    className={inputCls('general.country')}
                    placeholder="India"
                  />
                </Field>
                <Field label="State / Region" local>
                  <input
                    type="text"
                    value={extras.store.state}
                    onChange={(e) => updateExtras({ store: { ...extras.store, state: e.target.value } })}
                    className={inputCls('general.state')}
                    placeholder="Maharashtra"
                  />
                </Field>
                <Field label="City" local>
                  <input
                    type="text"
                    value={extras.store.city}
                    onChange={(e) => updateExtras({ store: { ...extras.store, city: e.target.value } })}
                    className={inputCls('general.city')}
                    placeholder="Mumbai"
                  />
                </Field>
                <Field label="Postal Code" local>
                  <input
                    type="text"
                    value={extras.store.postalCode}
                    onChange={(e) => updateExtras({ store: { ...extras.store, postalCode: e.target.value } })}
                    className={inputCls('general.postalCode')}
                    placeholder="400001"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Timezone" local error={errors['general.timezone']}>
                  <select
                    value={extras.store.timezone}
                    onChange={(e) => updateExtras({ store: { ...extras.store, timezone: e.target.value } })}
                    className={inputCls('general.timezone')}
                  >
                    <option value="">Select timezone…</option>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Language" local>
                  <select
                    value={extras.store.language}
                    onChange={(e) => updateExtras({ store: { ...extras.store, language: e.target.value } })}
                    className={inputCls('general.language')}
                  >
                    <option value="">Select language…</option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Currency" required error={errors['general.currency']} hint="Display currency used across the storefront — prices are converted from the base currency">
                  <select
                    value={form.currency}
                    onChange={(e) => update({ currency: e.target.value })}
                    className={inputCls('general.currency')}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Base Currency" error={errors['general.baseCurrency']} hint="Currency your catalog prices are stored in. Usually set once when prices were entered">
                  <select
                    value={form.baseCurrency}
                    onChange={(e) => update({ baseCurrency: e.target.value })}
                    className={inputCls('general.baseCurrency')}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="GST / VAT" local hint="Registration / tax identification number" error={errors['general.gstVat']}>
                <input
                  type="text"
                  value={extras.store.gstVat}
                  onChange={(e) => updateExtras({ store: { ...extras.store, gstVat: e.target.value } })}
                  className={inputCls('general.gstVat')}
                  placeholder="27AAPFU0939F1ZV"
                />
              </Field>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Exchange Rates</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  1 {form.baseCurrency || 'INR'} equals the rate below — the storefront converts base prices to the display
                  currency using these rates. Leave blank to use the built-in default (shown as placeholder).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CURRENCIES.map((c) => (
                    <div key={c.code} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">{c.code}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.000001"
                        inputMode="decimal"
                        value={form.exchangeRates[c.code] ?? ''}
                        onChange={(e) =>
                          update({ exchangeRates: { ...form.exchangeRates, [c.code]: e.target.value } })
                        }
                        className={inputCls(`general.rate.${c.code}`)}
                        placeholder={DEFAULT_EXCHANGE_RATES[c.code] != null ? String(DEFAULT_EXCHANGE_RATES[c.code]) : ''}
                        aria-label={`Exchange rate for ${c.code}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <MediaPicker
                label="Favicon"
                value={form.favicon}
                onChange={(url) => update({ favicon: url })}
                ratio="favicon"
                folder="favicons"
              />
            </Card>

            <Card icon={Image} title="Brand Identity" description="Brand name / wordmark and the independent brand icon — rendered exactly like this in the storefront">
              <Field label="Wordmark Display Mode" hint="Image mode shows the wordmark image; text is used as the automatic fallback if the image ever breaks">
                <div className="flex gap-2">
                  {(['text', 'image'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => update({ brandIdentity: { ...form.brandIdentity, wordmarkMode: mode } })}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        form.brandIdentity.wordmarkMode === mode
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {mode === 'text' ? 'Text' : 'Image'}
                    </button>
                  ))}
                </div>
              </Field>
              <Field
                label="Brand Name (Wordmark)"
                hint="Rendered in the header and footer. Defaults to the Store Name when empty"
              >
                <input
                  type="text"
                  value={form.brandIdentity.wordmarkText}
                  onChange={(e) => update({ brandIdentity: { ...form.brandIdentity, wordmarkText: e.target.value } })}
                  className={inputCls('general.wordmarkText')}
                  placeholder={form.brandName || 'BRISTI'}
                />
              </Field>
              <BrandTypographyEditor
                value={form.brandNameTypography}
                onChange={(next) => update({ brandNameTypography: next })}
                wordmarkText={form.brandIdentity.wordmarkText || form.brandName || 'BRISTI'}
                slogan={form.slogan}
                disabled={form.brandIdentity.wordmarkMode === 'image'}
              />
              <MediaPicker
                label="Wordmark Image"
                value={form.brandIdentity.wordmarkImageUrl}
                onChange={(url) =>
                  update({
                    brandIdentity: { ...form.brandIdentity, wordmarkImageUrl: url },
                    logo: url,
                  })
                }
                ratio="logo"
                folder="logos"
              />
              <MediaPicker
                label="Brand Icon"
                value={form.brandIdentity.iconImageUrl}
                onChange={(url) => update({ brandIdentity: { ...form.brandIdentity, iconImageUrl: url } })}
                ratio="favicon"
                folder="icons"
              />
            </Card>

            <Card icon={Globe} title="Store Status" description="Availability of the storefront">
              <Field label="Store Status">
                <select
                  value={form.maintenanceMode ? 'maintenance' : 'active'}
                  onChange={(e) => update({ maintenanceMode: e.target.value === 'maintenance' })}
                  className={inputCls('general.status')}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Under Maintenance</option>
                </select>
              </Field>
              <Toggle
                checked={form.maintenanceMode}
                onChange={(next) => update({ maintenanceMode: next })}
                label="Maintenance Mode"
                description="Shows the maintenance message to visitors"
              />
              <Field label="Maintenance Message" hint="Shown while maintenance mode is enabled">
                <textarea
                  value={form.maintenanceMessage}
                  onChange={(e) => update({ maintenanceMessage: e.target.value })}
                  className={textareaCls('general.maintenanceMessage')}
                  rows={3}
                  placeholder="We're polishing the shelves — back soon."
                />
              </Field>
            </Card>
          </div>
        );

      case 'store':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card icon={MapPin} title="Contact Information" description="Channel-specific contact details" local>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Support Email" error={errors['store.supportEmail']}>
                  <input
                    type="text"
                    value={extras.contact.supportEmail}
                    onChange={(e) => updateExtras({ contact: { ...extras.contact, supportEmail: e.target.value } })}
                    className={inputCls('store.supportEmail')}
                    placeholder="support@bristi.com"
                  />
                </Field>
                <Field label="Sales Email" error={errors['store.salesEmail']}>
                  <input
                    type="text"
                    value={extras.contact.salesEmail}
                    onChange={(e) => updateExtras({ contact: { ...extras.contact, salesEmail: e.target.value } })}
                    className={inputCls('store.salesEmail')}
                    placeholder="sales@bristi.com"
                  />
                </Field>
              </div>
              <Field label="Return / Exchange Email" error={errors['store.returnEmail']}>
                <input
                  type="text"
                  value={extras.contact.returnEmail}
                  onChange={(e) => updateExtras({ contact: { ...extras.contact, returnEmail: e.target.value } })}
                  className={inputCls('store.returnEmail')}
                  placeholder="returns@bristi.com"
                />
              </Field>
              <Field label="Business Hours">
                <textarea
                  value={extras.contact.businessHours}
                  onChange={(e) => updateExtras({ contact: { ...extras.contact, businessHours: e.target.value } })}
                  className={textareaCls('store.businessHours')}
                  rows={3}
                  placeholder={'Mon–Fri: 9:00–18:00\nSat: 10:00–16:00\nSun: Closed'}
                />
              </Field>
              <Field label="Google Maps" hint="Embed URL of your store location" error={errors['store.googleMaps']}>
                <input
                  type="text"
                  value={extras.contact.googleMaps}
                  onChange={(e) => updateExtras({ contact: { ...extras.contact, googleMaps: e.target.value } })}
                  className={inputCls('store.googleMaps')}
                  placeholder="https://maps.google.com/?q=…"
                />
              </Field>
            </Card>

            <Card icon={Link2} title="Policy Links" description="Storefront page paths for legal content">
              {(['privacy', 'terms', 'refund', 'shipping'] as const).map((key) => (
                <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} error={errors[`store.${key}`]}>
                  <input
                    type="text"
                    value={form.policies[key]}
                    onChange={(e) => update({ policies: { ...form.policies, [key]: e.target.value } })}
                    className={inputCls(`store.${key}`)}
                    placeholder={`/${key}`}
                  />
                </Field>
              ))}
            </Card>
          </div>
        );

      case 'social':
        return (
          <div className="grid grid-cols-1 gap-6">
            <Card icon={Link2} title="Social Media" description="Official store profiles — displayed across the storefront">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {SOCIAL_PLATFORMS.map((platform) => (
                  <Field
                    key={platform.key}
                    label={platform.label}
                    error={errors[`social.${platform.key}`]}
                  >
                    <input
                      type="text"
                      value={form.socialLinks.find((l) => l.platform === platform.key)?.url ?? ''}
                      onChange={(e) => updateSocial(platform.key, e.target.value)}
                      className={inputCls(`social.${platform.key}`)}
                      placeholder={`https://${platform.key}.com/yourpage`}
                    />
                  </Field>
                ))}
              </div>
            </Card>
          </div>
        );

      case 'seo':
        return (
          <div className="grid grid-cols-1 gap-6">
            <Card icon={Search} title="SEO Defaults" description="Fallbacks applied when a page does not define its own SEO">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Field label="Default SEO Title" hint="Recommended under 120 characters" error={errors['seo.defaultTitle']}>
                  <input
                    type="text"
                    value={form.seo.defaultTitle}
                    onChange={(e) => update({ seo: { ...form.seo, defaultTitle: e.target.value } })}
                    className={inputCls('seo.defaultTitle')}
                    placeholder="BRISTI — Luxury Fashion"
                  />
                </Field>
                <Field label="Robots" local hint="e.g. index, follow">
                  <input
                    type="text"
                    value={extras.seo.robots}
                    onChange={(e) => updateExtras({ seo: { ...extras.seo, robots: e.target.value } })}
                    className={inputCls('seo.robots')}
                    placeholder="index, follow"
                  />
                </Field>
              </div>
              <Field label="Meta Description" hint="Recommended under 160 characters" error={errors['seo.defaultDescription']}>
                <textarea
                  value={form.seo.defaultDescription}
                  onChange={(e) => update({ seo: { ...form.seo, defaultDescription: e.target.value } })}
                  className={textareaCls('seo.defaultDescription')}
                  rows={3}
                  placeholder="Handcrafted luxury fashion…"
                />
              </Field>
              <Field label="Keywords" local hint="Comma-separated">
                <input
                  type="text"
                  value={extras.seo.keywords}
                  onChange={(e) => updateExtras({ seo: { ...extras.seo, keywords: e.target.value } })}
                  className={inputCls('seo.keywords')}
                  placeholder="luxury, fashion, handcrafted"
                />
              </Field>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <MediaPicker
                  label="OG Image"
                  value={form.seo.defaultImage}
                  onChange={(url) => update({ seo: { ...form.seo, defaultImage: url } })}
                  ratio="seo"
                  folder="seo"
                />
                <Field label="Canonical Domain" local error={errors['seo.canonicalDomain']}>
                  <input
                    type="text"
                    value={extras.seo.canonicalDomain}
                    onChange={(e) => updateExtras({ seo: { ...extras.seo, canonicalDomain: e.target.value } })}
                    className={inputCls('seo.canonicalDomain')}
                    placeholder="https://www.bristi.com"
                  />
                </Field>
              </div>
              <Field label="Analytics IDs" local hint="One ID per line (GA, GTM, etc.)" error={errors['seo.analyticsIds']}>
                <textarea
                  value={extras.seo.analyticsIds}
                  onChange={(e) => updateExtras({ seo: { ...extras.seo, analyticsIds: e.target.value } })}
                  className={textareaCls('seo.analyticsIds')}
                  rows={3}
                  placeholder={'G-ABC123XYZ\nGTM-ABC123'}
                />
              </Field>
            </Card>
          </div>
        );

      case 'shipping':
        return (
          <div className="grid grid-cols-1 gap-6">
            <Card icon={Truck} title="Shipping Defaults" description="Defaults applied to new shipments" local>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Field label="Default Shipping Origin">
                  <input
                    type="text"
                    value={extras.shipping.defaultOrigin}
                    onChange={(e) => updateExtras({ shipping: { ...extras.shipping, defaultOrigin: e.target.value } })}
                    className={inputCls('shipping.defaultOrigin')}
                    placeholder="Mumbai, India"
                  />
                </Field>
                <Field label="Default Courier">
                  <input
                    type="text"
                    value={extras.shipping.defaultCourier}
                    onChange={(e) => updateExtras({ shipping: { ...extras.shipping, defaultCourier: e.target.value } })}
                    className={inputCls('shipping.defaultCourier')}
                    placeholder="DHL Express"
                  />
                </Field>
                <Field label="Weight Unit">
                  <select
                    value={extras.shipping.weightUnit}
                    onChange={(e) => updateExtras({ shipping: { ...extras.shipping, weightUnit: e.target.value } })}
                    className={inputCls('shipping.weightUnit')}
                  >
                    {WEIGHT_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Dimension Unit">
                  <select
                    value={extras.shipping.dimensionUnit}
                    onChange={(e) => updateExtras({ shipping: { ...extras.shipping, dimensionUnit: e.target.value } })}
                    className={inputCls('shipping.dimensionUnit')}
                  >
                    {DIMENSION_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Packaging Settings" hint="Material, boxes, handling notes">
                <textarea
                  value={extras.shipping.packagingSettings}
                  onChange={(e) =>
                    updateExtras({ shipping: { ...extras.shipping, packagingSettings: e.target.value } })
                  }
                  className={textareaCls('shipping.packagingSettings')}
                  rows={3}
                  placeholder="Recycled kraft boxes, gift wrap available"
                />
              </Field>
              <Field label="Free Shipping Threshold" hint="Cart total (in store currency) above which shipping is free">
                <input
                  type="number"
                  min={0}
                  value={form.freeShippingThreshold}
                  onChange={(e) => update({ freeShippingThreshold: parseFloat(e.target.value) || 0 })}
                  className={inputCls('shipping.freeShippingThreshold')}
                />
              </Field>
            </Card>
          </div>
        );

      case 'tax':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card icon={Percent} title="Tax" description="Rates and display behaviour">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="GST Rate (%)" hint="Saved to the store tax rate">
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={form.taxGstRate}
                    onChange={(e) => update({ taxGstRate: parseFloat(e.target.value) || 0 })}
                    className={inputCls('tax.gstRate')}
                  />
                </Field>
                <Field label="VAT Rate (%)" local>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={100}
                    value={extras.tax.vatRate}
                    onChange={(e) => updateExtras({ tax: { ...extras.tax, vatRate: e.target.value } })}
                    className={inputCls('tax.vatRate')}
                  />
                </Field>
              </div>
              <Toggle
                checked={extras.tax.taxIncluded}
                onChange={(next) => updateExtras({ tax: { ...extras.tax, taxIncluded: next } })}
                label="Tax Included"
                description="Prices already include tax"
              />
              <Field label="Tax Display">
                <select
                  value={extras.tax.taxDisplay}
                  onChange={(e) => updateExtras({ tax: { ...extras.tax, taxDisplay: e.target.value } })}
                  className={inputCls('tax.taxDisplay')}
                >
                  {TAX_DISPLAY_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </Field>
            </Card>
          </div>
        );

      case 'email':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card icon={Mail} title="Sender Details" description="From / reply-to used on transactional emails">
              <Field label="Sender Name">
                <input
                  type="text"
                  value={form.emailSettings.fromName}
                  onChange={(e) => update({ emailSettings: { ...form.emailSettings, fromName: e.target.value } })}
                  className={inputCls('email.fromName')}
                  placeholder="BRISTI"
                />
              </Field>
              <Field label="Sender Email" error={errors['email.fromEmail']}>
                <input
                  type="text"
                  value={form.emailSettings.fromEmail}
                  onChange={(e) => update({ emailSettings: { ...form.emailSettings, fromEmail: e.target.value } })}
                  className={inputCls('email.fromEmail')}
                  placeholder="hello@bristi.com"
                />
              </Field>
              <Field label="Reply Email" error={errors['email.replyTo']}>
                <input
                  type="text"
                  value={form.emailSettings.replyTo}
                  onChange={(e) => update({ emailSettings: { ...form.emailSettings, replyTo: e.target.value } })}
                  className={inputCls('email.replyTo')}
                  placeholder="hello@bristi.com"
                />
              </Field>
            </Card>

            <Card icon={Send} title="SMTP" description="Outgoing mail server — credentials are write-only">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="SMTP Host">
                  <input
                    type="text"
                    value={form.emailSettings.smtpHost}
                    onChange={(e) => update({ emailSettings: { ...form.emailSettings, smtpHost: e.target.value } })}
                    className={inputCls('email.smtpHost')}
                    placeholder="smtp.example.com"
                  />
                </Field>
                <Field label="SMTP Port" error={errors['email.smtpPort']}>
                  <input
                    type="text"
                    value={form.emailSettings.smtpPort}
                    onChange={(e) => update({ emailSettings: { ...form.emailSettings, smtpPort: e.target.value } })}
                    className={inputCls('email.smtpPort')}
                    placeholder="587"
                  />
                </Field>
              </div>
              <Field label="SMTP Username">
                <input
                  type="text"
                  value={form.emailSettings.smtpUser}
                  onChange={(e) => update({ emailSettings: { ...form.emailSettings, smtpUser: e.target.value } })}
                  className={inputCls('email.smtpUser')}
                  placeholder="apikey"
                />
              </Field>
              <Field label="SMTP Password" hint="Stored securely — never shown again after saving">
                <input
                  type="password"
                  value={form.emailSettings.smtpPass}
                  onChange={(e) => update({ emailSettings: { ...form.emailSettings, smtpPass: e.target.value } })}
                  className={inputCls('email.smtpPass')}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
              <button type="button" onClick={handleEmailTest} className="admin-btn-secondary !h-9 px-3.5 text-xs gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Test Email Configuration
              </button>
            </Card>

            <Card icon={KeyRound} title="Email Providers" description="Alternative delivery providers — keys are write-only" className="lg:col-span-2">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Field label="SendGrid API Key" error={errors['email.sendgrid']}>
                  <input
                    type="password"
                    value={form.emailSettings.sendgridApiKey}
                    onChange={(e) => update({ emailSettings: { ...form.emailSettings, sendgridApiKey: e.target.value } })}
                    className={inputCls('email.sendgrid')}
                    placeholder="SG.xxxxxxxx"
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Mailgun API Key">
                  <input
                    type="password"
                    value={form.emailSettings.mailgunApiKey}
                    onChange={(e) => update({ emailSettings: { ...form.emailSettings, mailgunApiKey: e.target.value } })}
                    className={inputCls('email.mailgun')}
                    placeholder="key-xxxxxxxx"
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Mailgun Domain">
                  <input
                    type="text"
                    value={form.emailSettings.mailgunDomain}
                    onChange={(e) => update({ emailSettings: { ...form.emailSettings, mailgunDomain: e.target.value } })}
                    className={inputCls('email.mailgunDomain')}
                    placeholder="mg.bristi.com"
                  />
                </Field>
              </div>
            </Card>
          </div>
        );

      case 'payments':
        return (
          <div className="grid grid-cols-1 gap-6">
            <Card icon={CreditCard} title="Payments" description="Checkout defaults and invoice numbering">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Field label="Currency">
                  <select
                    value={form.currency}
                    onChange={(e) => update({ currency: e.target.value })}
                    className={inputCls('payments.currency')}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Payment Defaults" local>
                  <select
                    value={extras.payment.paymentDefaults}
                    onChange={(e) => updateExtras({ payment: { ...extras.payment, paymentDefaults: e.target.value } })}
                    className={inputCls('payments.paymentDefaults')}
                  >
                    {PAYMENT_DEFAULTS.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Toggle
                checked={extras.payment.codEnabled}
                onChange={(next) => updateExtras({ payment: { ...extras.payment, codEnabled: next } })}
                label="Cash on Delivery"
                description="Allow COD at checkout"
              />
              <Field label="Invoice Prefix" error={errors['payments.invoicePrefix']}>
                <input
                  type="text"
                  value={form.orderSettings.orderNumberPrefix}
                  onChange={(e) => update({ orderSettings: { ...form.orderSettings, orderNumberPrefix: e.target.value } })}
                  className={inputCls('payments.invoicePrefix')}
                  placeholder="BRS"
                />
              </Field>
            </Card>
          </div>
        );

      case 'security':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card icon={Clock} title="Session & Access" description="Auth hardening defaults">
              <Field label="Session Timeout (minutes)" error={errors['security.sessionTimeout']}>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={form.securitySettings.sessionTimeout}
                  onChange={(e) =>
                    update({ securitySettings: { ...form.securitySettings, sessionTimeout: parseInt(e.target.value, 10) || 0 } })
                  }
                  className={inputCls('security.sessionTimeout')}
                />
              </Field>
              <Field label="Max Login Attempts" hint="Per rate-limit window" error={errors['security.loginAttempts']}>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.securitySettings.rateLimitAuth}
                  onChange={(e) =>
                    update({ securitySettings: { ...form.securitySettings, rateLimitAuth: parseInt(e.target.value, 10) || 0 } })
                  }
                  className={inputCls('security.loginAttempts')}
                />
              </Field>
              <Field label="API Rate Limit" hint="Requests per window per client">
                <input
                  type="number"
                  min={1}
                  value={form.securitySettings.rateLimitApi}
                  onChange={(e) =>
                    update({ securitySettings: { ...form.securitySettings, rateLimitApi: parseInt(e.target.value, 10) || 0 } })
                  }
                  className={inputCls('security.rateLimitApi')}
                />
              </Field>
            </Card>

            <Card icon={Lock} title="Password Policy" description="Requirements for new passwords">
              <Field label="Minimum Password Length" error={errors['security.passwordMinLength']}>
                <input
                  type="number"
                  min={6}
                  max={64}
                  value={form.securitySettings.passwordMinLength}
                  onChange={(e) =>
                    update({ securitySettings: { ...form.securitySettings, passwordMinLength: parseInt(e.target.value, 10) || 0 } })
                  }
                  className={inputCls('security.passwordMinLength')}
                />
              </Field>
              <Toggle
                checked={form.securitySettings.requirePasswordComplexity}
                onChange={(next) => update({ securitySettings: { ...form.securitySettings, requirePasswordComplexity: next } })}
                label="Require Complexity"
                description="Uppercase, number and symbol required"
              />
              <Toggle
                checked={form.securitySettings.requireEmailVerification}
                onChange={(next) => update({ securitySettings: { ...form.securitySettings, requireEmailVerification: next } })}
                label="Require Email Verification"
                description="New accounts must verify their email"
              />
            </Card>

            <Card icon={Fingerprint} title="Advanced" description="Additional access controls" local className="lg:col-span-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Toggle
                  checked={extras.security.twoFactorAuth}
                  onChange={(next) => updateExtras({ security: { ...extras.security, twoFactorAuth: next } })}
                  label="Two-Factor Authentication"
                  description="Require a second factor for admin sign-in"
                />
                <Field label="API Keys" hint="One key per line">
                  <textarea
                    value={extras.security.apiKeys}
                    onChange={(e) => updateExtras({ security: { ...extras.security, apiKeys: e.target.value } })}
                    className={textareaCls('security.apiKeys')}
                    rows={3}
                    placeholder={'sk-live-xxxxxxxx\nsk-live-yyyyyyyy'}
                  />
                </Field>
              </div>
            </Card>
          </div>
        );

      case 'integrations':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card icon={Image} title="Cloudinary" description="Media delivery & transformations" local>
              <Field label="Cloud Name">
                <input
                  type="text"
                  value={extras.integrations.cloudinary.cloudName}
                  onChange={(e) =>
                    updateExtras({ integrations: { ...extras.integrations, cloudinary: { ...extras.integrations.cloudinary, cloudName: e.target.value } } })
                  }
                  className={inputCls('integrations.cloudinaryName')}
                  placeholder="your-cloud"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="API Key">
                  <input
                    type="password"
                    value={extras.integrations.cloudinary.apiKey}
                    onChange={(e) =>
                      updateExtras({ integrations: { ...extras.integrations, cloudinary: { ...extras.integrations.cloudinary, apiKey: e.target.value } } })
                    }
                    className={inputCls('integrations.cloudinaryKey')}
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="API Secret">
                  <input
                    type="password"
                    value={extras.integrations.cloudinary.apiSecret}
                    onChange={(e) =>
                      updateExtras({ integrations: { ...extras.integrations, cloudinary: { ...extras.integrations.cloudinary, apiSecret: e.target.value } } })
                    }
                    className={inputCls('integrations.cloudinarySecret')}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            </Card>

            <Card icon={Database} title="AWS S3" description="Object storage for media" local>
              <Field label="Bucket">
                <input
                  type="text"
                  value={extras.integrations.awsS3.bucket}
                  onChange={(e) =>
                    updateExtras({ integrations: { ...extras.integrations, awsS3: { ...extras.integrations.awsS3, bucket: e.target.value } } })
                  }
                  className={inputCls('integrations.s3Bucket')}
                  placeholder="bristi-media"
                />
              </Field>
              <Field label="Region" error={errors['integrations.s3']}>
                <input
                  type="text"
                  value={extras.integrations.awsS3.region}
                  onChange={(e) =>
                    updateExtras({ integrations: { ...extras.integrations, awsS3: { ...extras.integrations.awsS3, region: e.target.value } } })
                  }
                  className={inputCls('integrations.s3Region')}
                  placeholder="us-east-1"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Access Key ID">
                  <input
                    type="password"
                    value={extras.integrations.awsS3.accessKey}
                    onChange={(e) =>
                      updateExtras({ integrations: { ...extras.integrations, awsS3: { ...extras.integrations.awsS3, accessKey: e.target.value } } })
                    }
                    className={inputCls('integrations.s3AccessKey')}
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Secret Access Key">
                  <input
                    type="password"
                    value={extras.integrations.awsS3.secretKey}
                    onChange={(e) =>
                      updateExtras({ integrations: { ...extras.integrations, awsS3: { ...extras.integrations.awsS3, secretKey: e.target.value } } })
                    }
                    className={inputCls('integrations.s3Secret')}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            </Card>

            <Card icon={CreditCard} title="Stripe" description="Card payments & subscriptions" local>
              <Field label="Publishable Key">
                <input
                  type="text"
                  value={extras.integrations.stripe.publishableKey}
                  onChange={(e) =>
                    updateExtras({ integrations: { ...extras.integrations, stripe: { ...extras.integrations.stripe, publishableKey: e.target.value } } })
                  }
                  className={inputCls('integrations.stripePublishable')}
                  placeholder="pk_live_…"
                />
              </Field>
              <Field label="Secret Key">
                <input
                  type="password"
                  value={extras.integrations.stripe.secretKey}
                  onChange={(e) =>
                    updateExtras({ integrations: { ...extras.integrations, stripe: { ...extras.integrations.stripe, secretKey: e.target.value } } })
                  }
                  className={inputCls('integrations.stripeSecret')}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Webhook Secret">
                <input
                  type="password"
                  value={extras.integrations.stripe.webhookSecret}
                  onChange={(e) =>
                    updateExtras({ integrations: { ...extras.integrations, stripe: { ...extras.integrations.stripe, webhookSecret: e.target.value } } })
                  }
                  className={inputCls('integrations.stripeWebhook')}
                  autoComplete="new-password"
                />
              </Field>
            </Card>

            <Card icon={Wallet} title="Razorpay" description="Indian payment gateway" local>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Key ID">
                  <input
                    type="text"
                    value={extras.integrations.razorpay.keyId}
                    onChange={(e) =>
                      updateExtras({ integrations: { ...extras.integrations, razorpay: { ...extras.integrations.razorpay, keyId: e.target.value } } })
                    }
                    className={inputCls('integrations.razorpayKeyId')}
                    placeholder="rzp_live_…"
                  />
                </Field>
                <Field label="Key Secret">
                  <input
                    type="password"
                    value={extras.integrations.razorpay.keySecret}
                    onChange={(e) =>
                      updateExtras({ integrations: { ...extras.integrations, razorpay: { ...extras.integrations.razorpay, keySecret: e.target.value } } })
                    }
                    className={inputCls('integrations.razorpaySecret')}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            </Card>

            <Card icon={Globe} title="Google Analytics" description="Web traffic measurement" local>
              <Field label="Measurement ID" error={errors['integrations.ga']}>
                <input
                  type="text"
                  value={extras.integrations.googleAnalytics.measurementId}
                  onChange={(e) =>
                    updateExtras({ integrations: { ...extras.integrations, googleAnalytics: { ...extras.integrations.googleAnalytics, measurementId: e.target.value } } })
                  }
                  className={inputCls('integrations.ga')}
                  placeholder="G-XXXXXXXXXX"
                />
              </Field>
            </Card>

            <Card icon={Pin} title="Meta Pixel" description="Facebook / Instagram conversion tracking" local>
              <Field label="Pixel ID" error={errors['integrations.pixel']}>
                <input
                  type="text"
                  value={extras.integrations.metaPixel.pixelId}
                  onChange={(e) =>
                    updateExtras({ integrations: { ...extras.integrations, metaPixel: { ...extras.integrations.metaPixel, pixelId: e.target.value } } })
                  }
                  className={inputCls('integrations.pixel')}
                  placeholder="123456789012345"
                />
              </Field>
            </Card>

            <Card icon={Search} title="Google Search Console" description="Site verification" local className="lg:col-span-2">
              <Field label="Verification Code" hint="Content of the google-site-verification meta tag">
                <input
                  type="text"
                  value={extras.integrations.searchConsole.verificationCode}
                  onChange={(e) =>
                    updateExtras({ integrations: { ...extras.integrations, searchConsole: { ...extras.integrations.searchConsole, verificationCode: e.target.value } } })
                  }
                  className={inputCls('integrations.searchConsole')}
                  placeholder="google-site-verification=…"
                />
              </Field>
            </Card>
          </div>
        );

      case 'backup':
        return (
          <div className="grid grid-cols-1 gap-6">
            <Card icon={Database} title="Backup & Restore" description="Export, import, back up and restore global settings">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button type="button" onClick={handleExport} className="admin-btn-secondary h-11 px-4 text-sm gap-2">
                  <Download className="w-4 h-4" />
                  Export Settings
                </button>
                <button type="button" onClick={handleBackup} className="admin-btn-secondary h-11 px-4 text-sm gap-2">
                  <HardDriveDownload className="w-4 h-4" />
                  Backup
                </button>
                <button type="button" onClick={() => triggerFile('import')} className="admin-btn-secondary h-11 px-4 text-sm gap-2">
                  <Upload className="w-4 h-4" />
                  Import Settings
                </button>
                <button type="button" onClick={() => triggerFile('restore')} className="admin-btn-primary h-11 px-4 text-sm gap-2">
                  <HardDriveUpload className="w-4 h-4" />
                  Restore
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFile}
              />
              <div className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
                <p>
                  Export and Backup download a JSON file of all global settings. Import loads it into this page for
                  review before saving; Restore applies it immediately. Module-owned configuration (hero, campaign
                  banners, announcement bar, navigation, homepage sections) is never touched by backup or restore.
                </p>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageShell title="Settings" subtitle="Global application settings">
      {loading ? (
        <PageSpinner label="Loading settings…" />
      ) : (
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-start gap-3 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/40 p-4 mb-6">
            <Info className="w-4 h-4 mt-0.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <div className="text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
              This page manages <strong>global application settings only</strong>. Homepage hero, campaign banners and
              the announcement bar are configured in their own dedicated editors —{' '}
              <Link to="/visual-builder" className="underline hover:opacity-80">
                Visual Builder
              </Link>{' '}
              and{' '}
              <Link to="/theme/announcement" className="underline hover:opacity-80">
                Announcement Bar
              </Link>
              .
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-slate-200 dark:border-slate-800">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap rounded-t-lg border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {renderTab()}

          <StickySaveBar
            dirty={dirty}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
            saveLabel="Save Settings"
          />
        </div>
      )}
    </PageShell>
  );
}
