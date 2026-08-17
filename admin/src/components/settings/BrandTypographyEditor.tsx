import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight, RotateCcw, Sparkles, Type } from 'lucide-react';
import {
  BRAND_FONT_SIZE_PRESETS,
  BRAND_FONT_SIZE_UNITS,
  BRAND_FONT_STYLE_OPTIONS,
  BRAND_FONT_WEIGHTS,
  BRAND_FONTS,
  BRAND_LETTER_SPACING_PRESETS,
  BRAND_LINE_HEIGHT_PRESETS,
  BRAND_TEXT_ALIGN_OPTIONS,
  BRAND_TEXT_DECORATION_OPTIONS,
  BRAND_TEXT_TRANSFORM_OPTIONS,
  BRAND_TYPOGRAPHY_PRESETS,
  DEFAULT_BRAND_TYPOGRAPHY,
  type BrandFontOption,
} from '@shared/constants';
import type { BrandNameTypography } from '@shared/types';
import { getBrandFontStack, parseBrandFontSize } from '@shared/utils';
import ConfirmDialog from '../ui/ConfirmDialog';
import { FontPicker } from './FontPicker';

interface BrandTypographyEditorProps {
  value: BrandNameTypography;
  onChange: (next: BrandNameTypography) => void;
  wordmarkText: string;
  slogan?: string;
  /** Disabled while Wordmark Display Mode = Image. */
  disabled?: boolean;
}

const fontMetaFor = (family: string): BrandFontOption | undefined =>
  BRAND_FONTS.find((f) => f.family === family);

const weightLabel = (weight: number): string =>
  BRAND_FONT_WEIGHTS.find((w) => w.value === weight)?.label ?? String(weight);

const eq = (a: BrandNameTypography, b: BrandNameTypography): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** Compact dropdown that renders every weight in the selected typeface. */
function WeightPicker({
  value,
  onChange,
  disabled,
  fontFamily,
  weights,
}: {
  value: number;
  onChange: (weight: number) => void;
  disabled?: boolean;
  fontFamily: string;
  weights: number[];
}) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => {
    const supported = weights.length > 0 ? [...weights] : [400];
    if (!supported.includes(value)) supported.push(value);
    return supported.sort((a, b) => a - b);
  }, [weights, value]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Font Weight"
        className="admin-input flex items-center justify-between gap-2 text-left"
      >
        <span
          className="truncate"
          style={{ fontFamily: getBrandFontStack(fontFamily), fontWeight: value }}
        >
          {value} — {weightLabel(value)}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="listbox"
            aria-label="Font Weight"
            className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-[0_16px_48px_rgba(16,24,40,0.18)]"
          >
            {options.map((weight) => (
              <button
                key={weight}
                type="button"
                role="option"
                aria-selected={weight === value}
                onClick={() => {
                  onChange(weight);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-[15px] transition-colors ${
                  weight === value
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
                style={{ fontFamily: getBrandFontStack(fontFamily), fontWeight: weight }}
              >
                <span>
                  {weight} — {weightLabel(weight)}
                </span>
                {weight === value && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  disabled,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

/**
 * Full Brand Name Typography editor — the "Brand Name Typography" section of
 * Settings → General → Brand Identity. Live preview updates on every change;
 * nothing is persisted until the admin saves the page. Controls are disabled
 * (values preserved) while Wordmark Display Mode = Image.
 */
export function BrandTypographyEditor({
  value,
  onChange,
  wordmarkText,
  slogan,
  disabled,
}: BrandTypographyEditorProps) {
  const [resetOpen, setResetOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const fontMeta = fontMetaFor(value.fontFamily);
  const sizeParsed = parseBrandFontSize(value.fontSize);
  const sizeNumber = sizeParsed?.unit ? String(sizeParsed.value) : '';
  const sizeUnit = sizeParsed?.unit ?? 'px';

  const patch = (partial: Partial<BrandNameTypography>) => onChange({ ...value, ...partial });

  const activePreset = BRAND_TYPOGRAPHY_PRESETS.find((p) => eq(p.values, value));

  const previewStyle: CSSProperties = {
    fontFamily: getBrandFontStack(value.fontFamily),
    fontWeight: value.fontWeight,
    fontSize: value.fontSize,
    letterSpacing: value.letterSpacing,
    lineHeight: value.lineHeight,
    fontStyle: value.fontStyle,
    textTransform: value.textTransform,
    textDecoration: value.textDecoration === 'none' ? undefined : value.textDecoration,
    textAlign: value.textAlign,
  };

  return (
    <div
      className={`mt-2 rounded-xl border border-dashed p-4 transition-opacity ${
        disabled ? 'opacity-60' : ''
      } border-slate-300 dark:border-slate-600`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <Type className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Brand Name Typography</h4>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Applied to the text wordmark only — image mode is never affected
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          disabled={disabled}
          className="admin-btn-secondary !h-8 px-3 text-xs gap-1.5 shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Typography
        </button>
      </div>

      {disabled && (
        <p className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Wordmark Display Mode is set to <strong>Image</strong> — typography controls are disabled. Your configured
          values are preserved and reapplied when you switch back to Text mode.
        </p>
      )}

      {/* Presets */}
      <div className="mb-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Preset Typography Styles
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BRAND_TYPOGRAPHY_PRESETS.map((preset) => (
            <Chip
              key={preset.id}
              active={activePreset?.id === preset.id}
              disabled={disabled}
              onClick={() => onChange({ ...preset.values })}
              title={preset.description}
            >
              {preset.name}
            </Chip>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Presets fill the controls below — you can keep refining them afterwards.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Font Family */}
        <div className="sm:col-span-2">
          <label className="admin-label mb-1.5 block">Font Family</label>
          <FontPicker
            value={value.fontFamily}
            onChange={(family) => {
              const meta = fontMetaFor(family);
              if (meta && !meta.weights.includes(value.fontWeight)) {
                const closest = meta.weights.reduce(
                  (best, wgt) => (Math.abs(wgt - value.fontWeight) < Math.abs(best - value.fontWeight) ? wgt : best),
                  meta.weights[0],
                );
                patch({ fontFamily: family, fontWeight: closest });
                return;
              }
              patch({ fontFamily: family });
            }}
            disabled={disabled}
          />
        </div>

        {/* Font Weight */}
        <div>
          <label className="admin-label mb-1.5 block">Font Weight</label>
          <WeightPicker
            value={value.fontWeight}
            onChange={(weight) => patch({ fontWeight: weight })}
            disabled={disabled}
            fontFamily={value.fontFamily}
            weights={fontMeta?.weights ?? []}
          />
        </div>

        {/* Font Size */}
        <div>
          <label className="admin-label mb-1.5 block">Font Size</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={sizeNumber}
              disabled={disabled}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  patch({ fontSize: `0${sizeUnit}` });
                  return;
                }
                const num = Number(raw);
                if (Number.isFinite(num)) patch({ fontSize: `${num}${sizeUnit}` });
              }}
              aria-label="Font size value"
              className="admin-input w-24"
            />
            <select
              value={sizeUnit}
              disabled={disabled}
              onChange={(e) => {
                const unit = e.target.value as (typeof BRAND_FONT_SIZE_UNITS)[number];
                patch({ fontSize: `${sizeParsed?.value ?? 32}${unit}` });
              }}
              aria-label="Font size unit"
              className="admin-input w-20"
            >
              {BRAND_FONT_SIZE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {BRAND_FONT_SIZE_PRESETS.map((preset) => (
              <Chip
                key={preset}
                active={sizeParsed?.value === preset && sizeParsed?.unit === 'px'}
                disabled={disabled}
                onClick={() => patch({ fontSize: `${preset}${sizeUnit}` })}
              >
                {preset}
              </Chip>
            ))}
          </div>
        </div>

        {/* Letter Spacing */}
        <div>
          <label className="admin-label mb-1.5 block">Letter Spacing</label>
          <input
            type="text"
            value={value.letterSpacing}
            disabled={disabled}
            onChange={(e) => patch({ letterSpacing: e.target.value })}
            placeholder="0.08em"
            aria-label="Letter spacing"
            className="admin-input"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {BRAND_LETTER_SPACING_PRESETS.map((preset) => (
              <Chip
                key={preset}
                active={value.letterSpacing === preset}
                disabled={disabled}
                onClick={() => patch({ letterSpacing: preset })}
              >
                {preset}
              </Chip>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Wide values (0.12em+) give the luxury editorial look — e.g. B R I S T I
          </p>
        </div>

        {/* Line Height */}
        <div>
          <label className="admin-label mb-1.5 block">Line Height</label>
          <div className="flex gap-2">
            <select
              value={BRAND_LINE_HEIGHT_PRESETS.includes(value.lineHeight) ? value.lineHeight : '__custom'}
              disabled={disabled}
              onChange={(e) => {
                if (e.target.value === '__custom') return;
                patch({ lineHeight: e.target.value });
              }}
              aria-label="Line height"
              className="admin-input flex-1"
            >
              {BRAND_LINE_HEIGHT_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
              <option value="__custom">Custom…</option>
            </select>
            <input
              type="text"
              value={value.lineHeight}
              disabled={disabled}
              onChange={(e) => patch({ lineHeight: e.target.value })}
              placeholder="1.1"
              aria-label="Custom line height"
              className="admin-input w-20"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">1 or 1.1 is ideal for a single-line brand name</p>
        </div>

        {/* Font Style */}
        <div>
          <label className="admin-label mb-1.5 block">Font Style</label>
          <select
            value={value.fontStyle}
            disabled={disabled}
            onChange={(e) => patch({ fontStyle: e.target.value as BrandNameTypography['fontStyle'] })}
            aria-label="Font style"
            className="admin-input"
          >
            {BRAND_FONT_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Text Transform */}
        <div>
          <label className="admin-label mb-1.5 block">Text Transform</label>
          <select
            value={value.textTransform}
            disabled={disabled}
            onChange={(e) => patch({ textTransform: e.target.value as BrandNameTypography['textTransform'] })}
            aria-label="Text transform"
            className="admin-input"
          >
            {BRAND_TEXT_TRANSFORM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.sample})
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Display-only — the stored brand name is never rewritten
          </p>
        </div>

        {/* Text Alignment */}
        <div>
          <label className="admin-label mb-1.5 block">Text Alignment</label>
          <select
            value={value.textAlign}
            disabled={disabled}
            onChange={(e) => patch({ textAlign: e.target.value as BrandNameTypography['textAlign'] })}
            aria-label="Text alignment"
            className="admin-input"
          >
            {BRAND_TEXT_ALIGN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Typography */}
      <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          <span>Advanced Typography</span>
          <ChevronRight className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-90' : ''}`} />
        </button>
        {advancedOpen && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-3.5 py-3">
            <label className="admin-label mb-1.5 block">Text Decoration</label>
            <select
              value={value.textDecoration}
              disabled={disabled}
              onChange={(e) => patch({ textDecoration: e.target.value as BrandNameTypography['textDecoration'] })}
              aria-label="Text decoration"
              className="admin-input"
            >
              {BRAND_TEXT_DECORATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Live preview */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">Brand Name Preview</p>
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 px-4 py-8">
          <div style={{ textAlign: value.textAlign }}>
            <span style={previewStyle} className="block break-words">
              {wordmarkText || 'BRISTI'}
            </span>
            {slogan && (
              <span
                className="mt-1 block text-[10px] uppercase tracking-[0.3em] text-slate-400"
                style={{ textAlign: value.textAlign }}
              >
                {slogan}
              </span>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Reset Brand Name Typography?"
        body="Restore the default typography (Inter · 500 · 32px · no tracking)? Your other brand settings are untouched."
        confirmLabel="Reset"
        onConfirm={() => {
          onChange({ ...DEFAULT_BRAND_TYPOGRAPHY });
          setResetOpen(false);
        }}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}