import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
  BRAND_FONTS,
  BRAND_FONT_CATEGORIES,
  BRAND_POPULAR_FONTS,
  type BrandFontCategory,
  type BrandFontOption,
} from '@shared/constants';
import { getBrandFontStack } from '@shared/utils';
import { loadGoogleFont, loadFontsForPreview } from '../../lib/fontLoader';

interface FontPickerProps {
  value: string;
  onChange: (family: string) => void;
  disabled?: boolean;
  id?: string;
  'aria-describedby'?: string;
}

type CategoryFilter = 'all' | BrandFontCategory;

const CATEGORY_LABELS: Record<BrandFontCategory, string> = {
  sans: 'Sans Serif',
  serif: 'Serif',
  display: 'Display',
  minimal: 'Minimal',
};

const fontMetaFor = (family: string): BrandFontOption | undefined =>
  BRAND_FONTS.find((f) => f.family === family);

/**
 * Searchable font picker for the BRISTI brand typography editor.
 *
 * - Renders every font name in its own typeface (lazy-loaded on visibility)
 * - "Popular for BRISTI" curation on top, category chips + keyboard search
 * - Full keyboard support: type to search, arrows to move, Enter to select
 */
export function FontPicker({ value, onChange, disabled, id }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [highlight, setHighlight] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLButtonElement>(null);

  const selectedMeta = fontMetaFor(value);

  // Keep the selected font available in the editor preview at all times.
  useEffect(() => {
    if (selectedMeta) {
      loadGoogleFont(selectedMeta.family, selectedMeta.weights, selectedMeta.italic);
    }
  }, [selectedMeta, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BRAND_FONTS.filter((f) => {
      if (category !== 'all' && !f.categories.includes(category)) return false;
      if (q && !f.family.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category]);

  const popular = useMemo(
    () =>
      BRAND_POPULAR_FONTS.map((name) => fontMetaFor(name)).filter(
        (f): f is BrandFontOption =>
          !!f &&
          filtered.some((item) => item.family === f.family),
      ),
    [filtered],
  );

  const rows = useMemo(() => {
    const rest = filtered.filter((f) => !popular.some((p) => p.family === f.family));
    return { popular, rest };
  }, [filtered, popular]);

  // Flattened index → font for keyboard navigation.
  const flatList = useMemo(
    () => [...rows.popular, ...rows.rest],
    [rows],
  );

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Focus the search box when the panel opens.
  useEffect(() => {
    if (open) {
      setHighlight(-1);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Lazy-load the typefaces of the rows that are actually visible.
  useEffect(() => {
    if (!open || flatList.length === 0) return;
    const container = scrollRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') {
      loadFontsForPreview(flatList.map((f) => ({ family: f.family, weights: f.weights, italic: f.italic })));
      return;
    }
    const loaded = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        const toLoad = entries
          .filter((e) => e.isIntersecting)
          .map((e) => (e.target as HTMLElement).dataset.family)
          .filter((family): family is string => !!family && !loaded.has(family));
        const metas = toLoad.map((family) => fontMetaFor(family)).filter((f): f is BrandFontOption => !!f);
        loadFontsForPreview(metas.map((f) => ({ family: f.family, weights: f.weights, italic: f.italic })));
        toLoad.forEach((family) => loaded.add(family));
      },
      { root: container, rootMargin: '240px 0px' },
    );
    const rowsEls = container.querySelectorAll<HTMLElement>('[data-font-row]');
    rowsEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [open, flatList]);

  // Keep the highlighted row scrolled into view.
  useEffect(() => {
    if (highlight >= 0) {
      highlightRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlight]);

  const selectFont = (family: string) => {
    onChange(family);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatList.length === 0) return;
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setHighlight((h) => {
        const next = h === -1 ? (dir === 1 ? 0 : flatList.length - 1) : (h + dir + flatList.length) % flatList.length;
        return next;
      });
      return;
    }
    if (e.key === 'Enter' && highlight >= 0 && flatList[highlight]) {
      e.preventDefault();
      selectFont(flatList[highlight].family);
    }
  };

  const renderRow = (font: BrandFontOption, index: number) => {
    const active = font.family === value;
    const highlighted = index === highlight;
    return (
      <button
        key={font.family}
        ref={highlighted ? highlightRef : undefined}
        type="button"
        data-font-row={font.family}
        data-family={font.family}
        role="option"
        aria-selected={active}
        onClick={() => selectFont(font.family)}
        onMouseEnter={() => setHighlight(index)}
        className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-[15px] transition-colors ${
          active
            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
            : highlighted
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
        }`}
        style={{ fontFamily: getBrandFontStack(font.family) }}
      >
        <span className="truncate">{font.family}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[10px] font-sans font-normal uppercase tracking-wider text-slate-400">
            {font.categories.map((c) => CATEGORY_LABELS[c]).join(' · ')}
          </span>
          {active && <Check className="h-4 w-4 shrink-0" />}
        </span>
      </button>
    );
  };

  const hasResults = flatList.length > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Font Family"
        className="admin-input flex items-center justify-between gap-2 text-left"
      >
        <span className="truncate" style={{ fontFamily: getBrandFontStack(value) }}>
          {value || 'Select a font…'}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Font Family"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_16px_48px_rgba(16,24,40,0.18)]"
          onKeyDown={onKeyDown}
        >
          <div className="border-b border-slate-100 dark:border-slate-800 p-2.5 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(-1);
                }}
                placeholder="Search fonts… e.g. bodoni"
                aria-label="Search fonts"
                className="admin-input !h-9 pl-9 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BRAND_FONT_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategory(c.id);
                    setHighlight(-1);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    category === c.id
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div ref={scrollRef} className="max-h-72 overflow-y-auto overscroll-contain py-1">
            {!hasResults && (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                No fonts match “{query}”
              </p>
            )}
            {rows.popular.length > 0 && (
              <div>
                <p className="sticky top-0 z-10 bg-white/95 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900/95">
                  Popular for BRISTI
                </p>
                {rows.popular.map((f) => renderRow(f, flatList.indexOf(f)))}
              </div>
            )}
            {rows.rest.length > 0 && (
              <div>
                <p className="sticky top-0 z-10 bg-white/95 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900/95">
                  {category === 'all' ? 'All Fonts' : CATEGORY_LABELS[category as BrandFontCategory]}
                </p>
                {rows.rest.map((f) => renderRow(f, flatList.indexOf(f)))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}