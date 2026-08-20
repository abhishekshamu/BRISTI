import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { lookup as dnsLookup } from 'dns/promises';
import cloudinary from 'cloudinary';
import sharp from 'sharp';
import { Model } from 'mongoose';
import { MediaRepository } from '../repositories/media.repository';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/exceptions';
import { ProductModel } from '../models/Product';
import { CategoryModel } from '../models/Category';
import { CollectionModel } from '../models/Collection';
import { BlogPostModel } from '../models/BlogPost';
import { HeroBlockModel } from '../models/HeroBlock';
import { PromotionBannerModel } from '../models/PromotionBanner';
import { PageModel } from '../models/Page';
import { ReviewModel } from '../models/Review';
import { LayoutModel } from '../models/Layout';
import { SettingsModel } from '../models/Settings';
import { MediaUsageEntry } from '../../shared/types';
import { detectRatio } from '../../shared/utils';

type MulterFile = NonNullable<Express.Request['file']>;

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Allowed mime types -> safe extension. The on-disk extension is derived from
// the validated MIME type, never from the client-controlled original filename,
// so a .html / .svg / .php payload cannot be stored and served statically.
const ALLOWED_MIMES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

// Raster images that the upload pipeline converts to WebP. SVG is preserved as
// a vector asset; videos are stored as-is.
const RASTER_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
];

// WebP encoding profile. Quality 85 keeps visual fidelity high while removing
// most of the original weight; transparency is preserved natively by WebP and
// never flattened against a background.
const WEBP_QUALITY = 85;
const THUMB_WIDTH = 320;

// URLs stored in the DB are absolute (or Cloudinary secure_url) so they work on
// any host the API is deployed to. When API_URL is unset the URL falls back to
// the server base (localhost in dev); consumers rewrite dev-host URLs to their
// configured API origin.
const SERVER_BASE = () =>
  process.env.API_URL ? process.env.API_URL.replace(/\/$/, '') : `http://localhost:${process.env.PORT || 5000}`;
const API_BASE = () => SERVER_BASE();

const isCloudinary = () => Boolean(process.env.CLOUDINARY_URL);

// ---------------------------------------------------------------------------
// Storage helpers (Cloudinary when configured, local uploads/ otherwise)
// ---------------------------------------------------------------------------

/**
 * Builds a safe unique filename stem from a client-supplied original name:
 * lowercased, unicode-normalized, non-alphanumerics collapsed to '-', bounded
 * length. Never includes directory separators or user path segments.
 */
function safeStem(originalName: string): string {
  const base = path.basename(originalName || '').replace(/\.[^.]+$/, '');
  const slug = base
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'image';
}

function uniquePublicId(stem: string, ext: string): string {
  return `${stem}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

async function storeBuffer(buffer: Buffer, ext: string, _tag: string, stem = 'file'): Promise<{ url: string; publicId: string }> {
  if (isCloudinary()) {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        { folder: 'bristi', public_id: uniquePublicId(stem, ''), resource_type: 'auto' },
        (error, upload) => (error ? reject(error) : resolve(upload))
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const publicId = uniquePublicId(stem, ext);
  fs.writeFileSync(path.join(UPLOADS_DIR, publicId), buffer);
  return { url: `${API_BASE()}/uploads/${publicId}`, publicId };
}

function deleteStored(publicIds: string[] = []) {
  const unique = [...new Set(publicIds.filter(Boolean))];
  if (isCloudinary()) {
    for (const id of unique) {
      cloudinary.v2.uploader.destroy(id, { resource_type: 'image' }).catch(() => undefined);
    }
    return;
  }
  for (const id of unique) {
    const filePath = path.join(UPLOADS_DIR, path.basename(id));
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* best effort */
      }
    }
  }
}

/** Verifies that a freshly stored object is actually readable before a media record is created. */
async function assertStored(stored: { url: string; publicId: string }): Promise<void> {
  if (!isCloudinary()) {
    const filePath = path.join(UPLOADS_DIR, path.basename(stored.publicId));
    if (!fs.existsSync(filePath)) throw new Error('Unable to store image — file is missing after upload');
    const stat = fs.statSync(filePath);
    if (stat.size === 0) throw new Error('Unable to store image — stored file is empty');
    return;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(stored.url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Image was uploaded but could not be verified (HTTP ${res.status})`);
  } catch (error: any) {
    if (error?.message?.startsWith('Image was uploaded')) throw error;
    throw new Error('Image was uploaded but could not be verified');
  }
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Content sniffing — never trust the multipart MIME header alone. Detects the
 * real payload type from magic bytes; returns null for unknown content.
 */
function sniffMime(buffer: Buffer): string | null {
  if (!buffer || buffer.length === 0) return null;
  const b = buffer;
  const ascii = (start: number, len: number) => b.subarray(start, start + len).toString('ascii');

  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return 'image/png';

  if (b.length >= 6) {
    const gif = ascii(0, 6);
    if (gif === 'GIF87a' || gif === 'GIF89a') return 'image/gif';
  }

  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';

  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp';
  if (b.length >= 4) {
    if (b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) return 'image/tiff';
    if (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a) return 'image/tiff';
  }

  if (b.length >= 12 && ascii(4, 4) === 'ftyp') {
    const compat = ascii(8, Math.min(24, b.length - 8));
    if (/^(avif|avis)\b/i.test(ascii(8, 4)) || /\b(avif|avis)\b/i.test(compat)) return 'image/avif';
    if (/^(heic|heix|hevc|hevx|mif1|msf1)\b/i.test(ascii(8, 4)) || /\b(heic|heix|hevc|hevx|mif1|msf1)\b/i.test(compat)) return 'image/heic';
    return 'video/mp4';
  }

  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm';

  // SVG is textual: optional BOM, whitespace, then an XML/SVG/DOCTYPE declaration.
  const text = b.subarray(0, 512).toString('utf8').replace(/^\uFEFF/, '').trimStart();
  if (text.startsWith('<?xml') || text.startsWith('<svg') || text.startsWith('<!DOCTYPE')) return 'image/svg+xml';

  return null;
}

function unsafeSvgReason(buffer: Buffer): string | null {
  const text = buffer.toString('utf8').toLowerCase();
  const patterns: Array<[RegExp, string]> = [
    [/<script[\s>]/, 'script tags'],
    [/<foreignobject[\s>]/, 'foreignObject elements'],
    [/<object[\s>]/, 'object tags'],
    [/<embed[\s>]/, 'embed tags'],
    [/<iframe[\s>]/, 'iframe tags'],
    [/on(load|error|click|mouseover|focus|blur|change|animation)/, 'inline event handlers'],
    [/javascript:/, 'javascript: URLs'],
    [/data:text\/html/i, 'data: HTML URLs'],
  ];
  for (const [re, label] of patterns) {
    if (re.test(text)) return label;
  }
  return null;
}

// Video magic-byte sniffing (kept in addition to sniffMime for a friendlier error).
function videoMagicReason(buffer: Buffer): string | null {
  if (buffer.length < 12) return 'file too small to be a video';
  const isMp4 = buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  const isWebm = buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  if (!isMp4 && !isWebm) return 'file does not match its declared video type';
  return null;
}

// Blocks SSRF in URL verification: refuse loopback, private, link-local and
// unique-local addresses (IPv4 and IPv6) before the server fetches anything.
function isPrivateIp(ip: string): boolean {
  const v4 = ip.includes('.');
  if (v4) {
    const [a, b, c, d] = ip.split('.').map(Number);
    if (a === 10) return true;                       // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true;         // 192.168.0.0/16
    if (a === 127) return true;                      // loopback
    if (a === 169 && b === 254) return true;         // link-local
    if (a === 0 && b === 0 && c === 0 && d === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    return false;
  }
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;         // loopback / unspecified
  if (normalized.startsWith('fe80')) return true;                       // link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // ULA
  return false;
}

async function assertPublicUrl(url: string): Promise<void> {
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new BadRequestError('Invalid URL');
  }
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new BadRequestError('URLs pointing at private networks are not allowed');
  }
  const addresses = await dnsLookup(hostname, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new BadRequestError('URLs pointing at private networks are not allowed');
  }
}

// ---------------------------------------------------------------------------
// Image processing (sharp): WebP conversion, thumbnails, responsive variants
// ---------------------------------------------------------------------------

interface StoredVariant {
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
  publicId: string;
}

interface ProcessedImage {
  /** WebP-encoded copy of the raster original (null for SVG/video/animated GIF). */
  webp: Buffer | null;
  width: number;
  height: number;
  isAnimated: boolean;
  variants: Record<string, StoredVariant>;
  storedPublicIds: string[];
  /** Canonical format of the stored original ('webp' | 'svg' | 'gif' | ...). */
  format: string;
}

function buildSrcset(variants: Record<string, { url: string }>): string {
  const parts: string[] = [];
  const order = ['thumb', 'medium', 'large'];
  const widths: Record<string, number> = { thumb: THUMB_WIDTH, medium: 900, large: 1600 };
  for (const key of order) {
    if (variants[key]) parts.push(`${variants[key].url} ${widths[key]}w`);
  }
  return parts.join(', ');
}

/**
 * Converts a raster image to WebP (quality 85, original dimensions preserved,
 * alpha/transparency preserved, metadata stripped). Animated GIFs are returned
 * untouched — they keep their native format.
 */
async function convertToWebp(buffer: Buffer, sourceMime: string, stem: string): Promise<ProcessedImage> {
  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new BadRequestError('Invalid image file — it does not appear to be a supported format');
  }
  if (!meta.width || !meta.height) throw new BadRequestError('The image file appears to be corrupted or unreadable');

  const isAnimated = sourceMime === 'image/gif' && (meta.pages ?? 1) > 1;
  if (isAnimated) {
    return { webp: null, width: meta.width, height: meta.height, isAnimated: true, variants: {}, storedPublicIds: [], format: 'gif' };
  }

  const encoded = await sharp(buffer)
    .rotate() // auto-orient so EXIF-rotated photos render correctly
    .toFormat('webp', { quality: WEBP_QUALITY, effort: 4, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });

  const base = sharp(encoded.data);
  const jobs: Array<{ name: string; width: number; quality: number }> = [{ name: 'thumb', width: THUMB_WIDTH, quality: 80 }];
  if (encoded.info.width > 900) jobs.push({ name: 'medium', width: 900, quality: 82 });
  if (encoded.info.width > 1600) jobs.push({ name: 'large', width: 1600, quality: WEBP_QUALITY });

  const variants: Record<string, StoredVariant> = {};
  const storedPublicIds: string[] = [];
  for (const job of jobs) {
    try {
      const out = await base
        .clone()
        .resize({ width: job.width, withoutEnlargement: true })
        .webp({ quality: job.quality, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      const stored = await storeBuffer(out.data, '.webp', job.name, `${stem}-${job.name}`);
      variants[job.name] = { url: stored.url, width: out.info.width, height: out.info.height, size: out.data.length, format: 'webp', publicId: stored.publicId };
      storedPublicIds.push(stored.publicId);
    } catch {
      // thumbnail/variant encoding is best-effort — the original WebP is always stored
    }
  }

  return {
    webp: encoded.data,
    width: encoded.info.width,
    height: encoded.info.height,
    isAnimated: false,
    variants,
    storedPublicIds,
    format: 'webp',
  };
}

/** Rasterized WebP preview for SVG originals (best-effort — SVG itself is always preserved). */
async function svgPreview(buffer: Buffer, stem: string): Promise<StoredVariant | null> {
  try {
    const out = await sharp(buffer, { density: 72 })
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    const stored = await storeBuffer(out.data, '.webp', 'thumb', `${stem}-thumb`);
    return { url: stored.url, width: out.info.width, height: out.info.height, size: out.data.length, format: 'webp', publicId: stored.publicId };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Usage tracker
// ---------------------------------------------------------------------------

interface UsageScope {
  scope: string;
  model: Model<any>;
  fields: string[];
  nameField?: string;
}

const USAGE_SCOPES: UsageScope[] = [
  { scope: 'products', model: ProductModel, fields: ['images.url', 'videos.thumbnail'], nameField: 'name' },
  { scope: 'categories', model: CategoryModel, fields: ['image', 'bannerImage'], nameField: 'name' },
  { scope: 'collections', model: CollectionModel, fields: ['image', 'bannerImage', 'bannerTablet', 'mobileBanner', 'icon', 'seo.image'], nameField: 'name' },
  { scope: 'hero', model: HeroBlockModel, fields: ['slides.image', 'slides.imageMobile', 'slides.video', 'slides.videoMobile', 'image', 'imageMobile', 'video', 'videoMobile'], nameField: 'name' },
  { scope: 'promotion', model: PromotionBannerModel, fields: ['desktopImage', 'tabletImage', 'mobileImage'], nameField: 'title' },
  { scope: 'blogs', model: BlogPostModel, fields: ['featuredImage', 'gallery'], nameField: 'title' },
  { scope: 'pages', model: PageModel, fields: ['featuredImage'], nameField: 'title' },
  { scope: 'reviews', model: ReviewModel, fields: ['images'], nameField: undefined },
  { scope: 'layouts', model: LayoutModel, fields: ['thumbnail'], nameField: 'name' },
];

const MAX_ITEMS_PER_SCOPE = 12;

export class MediaService {
  constructor(private readonly mediaRepo: MediaRepository) {}

  // -- Usage tracking -------------------------------------------------------

  /** Every URL belonging to a media doc (original, variants, derived, versions). */
  urlsOf(media: any): string[] {
    const urls = new Set<string>();
    if (media.url) urls.add(media.url);
    if (media.thumbnailUrl) urls.add(media.thumbnailUrl);
    if (media.variants) {
      for (const v of Object.values(media.variants) as any[]) {
        if (v?.url) urls.add(v.url);
      }
    }
    if (Array.isArray(media.derived)) {
      for (const d of media.derived) {
        if (d?.url) urls.add(d.url);
      }
    }
    if (Array.isArray(media.versions)) {
      for (const v of media.versions) {
        if (v?.url) urls.add(v.url);
      }
    }
    return [...urls];
  }

  /** Counts every storefront reference to the given URLs across all content models. */
  async computeUsage(urls: string[]): Promise<{ total: number; entries: MediaUsageEntry[]; matched: Set<string> }> {
    const entries: MediaUsageEntry[] = [];
    const matched = new Set<string>();
    let total = 0;
    if (!urls.length) return { total: 0, entries: [], matched };

    for (const scope of USAGE_SCOPES) {
      const $or = scope.fields.map((f) => ({ [f]: { $in: urls } }));
      const docs = await scope.model.find({ $or }, { [scope.nameField || 'name']: 1 }).limit(200).lean().exec();
      if (docs.length === 0) continue;
      const items = docs.slice(0, MAX_ITEMS_PER_SCOPE).map((d: any) => ({ id: String(d._id), name: d[scope.nameField || 'name'] }));
      const count = docs.length;
      total += count;
      entries.push({ scope: scope.scope, count, items });
      for (const u of urls) matched.add(u);
    }

    // Settings is a single doc with images nested arbitrarily (logo, favicon,
    // seo.defaultImage, homepageSections props...). Deep-scan it in JS.
    const settings = await SettingsModel.findOne({}).lean().exec();
    if (settings) {
      const json = JSON.stringify(settings);
      const matchedSettings = urls.filter((u) => u && json.includes(u));
      if (matchedSettings.length > 0) {
        total += matchedSettings.length;
        for (const u of matchedSettings) matched.add(u);
        entries.push({ scope: 'settings', count: matchedSettings.length, items: [{ id: String((settings as any)._id), name: 'Site settings' }] });
      }
    }

    return { total, entries: entries.filter((e) => e.count > 0), matched };
  }

  // -- Upload ---------------------------------------------------------------

  async upload(file: MulterFile, userId: string, options: any = {}) {
    if (!file?.buffer) throw new BadRequestError('A file is required');
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestError('File exceeds the 25 MB upload limit');
    if (file.size === 0) throw new BadRequestError('File is empty');

    const declaredMime = file.mimetype || '';
    if (!ALLOWED_MIMES[declaredMime]) {
      throw new BadRequestError('Unsupported file type. Allowed: jpg, jpeg, png, webp, svg, gif, avif, bmp, tiff, heic/heif');
    }

    // Real content check — the declared MIME header is client-controlled.
    const sniffed = sniffMime(file.buffer);
    if (!sniffed) throw new BadRequestError('File content does not match a supported image/video format');
    if (!ALLOWED_MIMES[sniffed]) throw new BadRequestError('Unsupported file content');
    const isVideo = sniffed.startsWith('video/');
    if (isVideo) {
      const videoReason = videoMagicReason(file.buffer);
      if (videoReason) throw new BadRequestError(`Invalid video file (${videoReason})`);
    }
    if (sniffed === 'image/svg+xml') {
      const reason = unsafeSvgReason(file.buffer);
      if (reason) throw new BadRequestError(`Unsafe SVG file rejected (contains ${reason})`);
    }

    const checksum = crypto.createHash('md5').update(file.buffer).digest('hex');

    // Duplicate detection: if the exact same bytes are already in the library,
    // return the existing file so admins can reuse it without duplicates.
    if (!options.allowDuplicate) {
      const existing = await this.mediaRepo.findOne({ checksum } as any);
      if (existing) {
        const doc = (existing as any).toObject ? (existing as any).toObject() : existing;
        return { ...doc, duplicated: true, reusedId: doc._id };
      }
    }

    const stem = safeStem(file.originalname);
    const storedPublicIds: string[] = [];

    let stored: { url: string; publicId: string };
    let mimeType = sniffed;
    let format = sniffed.split('/')[1] || '';
    let width = 0;
    let height = 0;
    let thumbnailUrl = '';
    let variants: Record<string, any> = {};
    let optimization: any = {};

    try {
      if (sniffed === 'image/svg+xml') {
        // Vector assets stay SVG — never rasterized into the record.
        stored = await storeBuffer(file.buffer, '.svg', 'original', stem);
        const preview = await svgPreview(file.buffer, stem);
        if (preview) {
          variants.thumb = preview;
          storedPublicIds.push(preview.publicId);
        }
        try {
          const meta = await sharp(file.buffer).metadata();
          width = meta.width ?? 0;
          height = meta.height ?? 0;
        } catch {
          // SVG dimensions are informational — not required.
        }
        thumbnailUrl = variants.thumb?.url ?? stored.url;
      } else if (isVideo) {
        stored = await storeBuffer(file.buffer, ALLOWED_MIMES[sniffed], 'original', stem);
        thumbnailUrl = stored.url;
        format = sniffed.split('/')[1] || '';
      } else {
        // Raster pipeline: convert to WebP, store WebP as the original.
        const processed = await convertToWebp(file.buffer, sniffed, stem);
        width = processed.width;
        height = processed.height;
        variants = processed.variants;
        storedPublicIds.push(...processed.storedPublicIds);
        if (processed.isAnimated) {
          stored = await storeBuffer(file.buffer, '.gif', 'original', stem);
          mimeType = 'image/gif';
          format = 'gif';
          thumbnailUrl = stored.url;
        } else {
          stored = await storeBuffer(processed.webp!, '.webp', 'original', stem);
          mimeType = 'image/webp';
          format = 'webp';
          thumbnailUrl = variants.thumb?.url ?? stored.url;
          if (file.size > 0) {
            optimization = {
              originalSize: file.size,
              optimizedSize: processed.webp!.length,
              savingsPercent: Math.min(99, Math.round(((file.size - processed.webp!.length) / file.size) * 100)),
            };
          }
        }
      }

      storedPublicIds.push(stored.publicId);

      // Storage verification: never persist a record pointing at a missing file.
      await assertStored(stored);

      const tags = Array.isArray(options.tags)
        ? options.tags
        : typeof options.tags === 'string' && options.tags.trim()
          ? options.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : [];

      const doc = await this.mediaRepo.create({
        filename: stored.publicId,
        originalName: file.originalname,
        mimeType,
        format,
        size: file.size,
        url: stored.url,
        thumbnailUrl,
        width,
        height,
        ratio: detectRatio(width, height),
        duration: isVideo ? 0 : undefined,
        folder: options.folder || '/',
        altText: options.altText,
        title: options.title,
        caption: options.caption,
        tags,
        isPublic: options.isPublic !== false,
        uploadedBy: userId,
        checksum,
        variants: {
          thumb: variants.thumb,
          medium: variants.medium,
          large: variants.large,
          srcset: buildSrcset(variants),
        },
        optimization,
        metadata: {
          publicId: stored.publicId,
          resourceType: isVideo ? 'video' : 'image',
          storedPublicIds,
          sourceMimeType: sniffed,
          sourceFormat: sniffed.split('/')[1] || '',
          processing: format === 'webp' ? { converted: sniffed !== 'image/webp', quality: WEBP_QUALITY, width, height } : undefined,
        },
      } as any);

      return doc;
    } catch (error: any) {
      // Roll back anything stored on a failed upload so no orphan/broken file remains.
      deleteStored(storedPublicIds);
      throw error;
    }
  }

  async uploadMany(files: MulterFile[], userId: string, options: any = {}) {
    if (!Array.isArray(files) || files.length === 0) throw new BadRequestError('No files received');
    const results = [];
    for (const file of files.slice(0, 20)) {
      try {
        results.push(await this.upload(file, userId, options));
      } catch (error: any) {
        results.push({ error: error?.message || 'Upload failed', originalName: file.originalname });
      }
    }
    return results;
  }

  // -- Read -------------------------------------------------------------

  async get(id: string, userId?: string) {
    const media = await this.mediaRepo.findAccessible(id, userId);
    if (!media) throw new NotFoundError('Media file not found');
    return media;
  }

  async list(folder: string, options: any = {}) {
    const filter: any = {};
    if (folder && folder !== 'all') filter.folder = folder;
    if (options.search) {
      const re = new RegExp(String(options.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ originalName: re }, { altText: re }, { title: re }, { filename: re }, { tags: re }];
    }
    if (options.tag) filter.tags = String(options.tag).toLowerCase();
    if (options.type && options.type !== 'all') {
      filter.mimeType = options.type === 'video' ? /^video\// : /^image\//;
    }
    if (options.favorite === 'true' || options.favorite === true) filter.favorite = true;
    if (options.folder) filter.folder = options.folder;

    let sort: any = { createdAt: -1 };
    if (options.sort === 'oldest') sort = { createdAt: 1 };
    else if (options.sort === 'name') sort = { originalName: 1 };
    else if (options.sort === 'size') sort = { size: -1 };
    else if (options.sort === 'used') sort = { lastUsedAt: -1 };

    const page = Math.max(1, parseInt(options.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 50));

    let result = await this.mediaRepo.paginate(filter, { page, limit, sort });

    // Per-file usage counts for the library UI (usage=1).
    let usageMap: Record<string, number> = {};
    if (options.usage === 'true' || options.usage === true) {
      const usage = await this.computeUsage(result.data.flatMap((m: any) => this.urlsOf(m)));
      usageMap = Object.fromEntries(
        result.data.map((m: any) => [String(m._id), this.urlsOf(m).filter((u) => usage.matched.has(u)).length])
      );
      const usedIds = Object.entries(usageMap).filter(([, count]) => count > 0).map(([id]) => id);
      if (usedIds.length > 0) {
        await this.mediaRepo.updateMany({ _id: { $in: usedIds } } as any, { lastUsedAt: new Date() } as any);
      }
    }

    // "Unused only" filtering: usage is computed live, so we pull additional
    // pages until the current page is full of unused files (bounded).
    if (options.unused === 'true' || options.unused === true) {
      const pool: any[] = [];
      const poolTarget = Math.max(limit, limit * 3);
      let current = page;
      let pages = result.pages;
      let guard = 0;
      while (pool.length < poolTarget && current <= pages && guard < 6) {
        const p = await this.mediaRepo.paginate(filter, { page: current, limit, sort });
        pool.push(...p.data);
        pages = p.pages;
        current += 1;
        guard += 1;
      }
      const usage = await this.computeUsage(pool.flatMap((m: any) => this.urlsOf(m)));
      const usedUrls = usage.matched;
      const unused = pool.filter((m: any) => !this.urlsOf(m).some((u) => usedUrls.has(u)));
      result = { ...result, data: unused.slice(0, limit) as any, total: unused.length, page, pages: Math.max(1, Math.ceil(unused.length / limit)) };
    }

    return { result, usageMap };
  }

  async listFolders(): Promise<string[]> {
    const folders = await this.mediaRepo.aggregate([{ $group: { _id: '$folder' } }, { $sort: { _id: 1 } }, { $limit: 200 }]);
    return folders.map((f) => f._id).filter(Boolean);
  }

  // -- Update -------------------------------------------------------------

  async update(id: string, userId: string, data: any = {}) {
    const media: any = await this.get(id, userId);
    const patch: any = {};
    const allowed = ['altText', 'title', 'caption', 'tags', 'folder', 'favorite'];
    for (const key of allowed) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    if (patch.tags !== undefined) {
      patch.tags = Array.isArray(patch.tags)
        ? patch.tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean)
        : String(patch.tags).split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean);
    }
    if (Object.keys(patch).length === 0) return media;
    return this.mediaRepo.updateById(id, patch as any);
  }

  // -- Fit & crop (ratio-preserving derivations, never touch the original) --

  private async loadOriginal(media: any): Promise<Buffer> {
    const publicId = media.metadata?.publicId;
    if (!isCloudinary() && publicId) {
      const filePath = path.join(UPLOADS_DIR, path.basename(publicId));
      if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
    }
    if (media.url && (media.url.startsWith('http') || media.url.startsWith('/'))) {
      const absolute = media.url.startsWith('/') ? `${SERVER_BASE()}${media.url}` : media.url;
      try {
        const res = await fetch(absolute, { redirect: 'follow' });
        if (res.ok) return Buffer.from(await res.arrayBuffer());
      } catch {
        /* fall through */
      }
    }
    throw new BadRequestError('Original file is not available on the server for processing');
  }

  private assertProcessable(media: any) {
    if (!media.mimeType || !RASTER_IMAGE_MIMES.includes(media.mimeType)) {
      throw new BadRequestError('Only raster images (jpg, png, webp, gif, avif, bmp, tiff, heic) can be fitted or cropped');
    }
    if (media.mimeType === 'image/gif' && media.format === 'gif') {
      // animated gif — no derivations
      throw new BadRequestError('Animated GIFs cannot be cropped server-side');
    }
  }

  /** Attention-aware auto-fit: fills the exact frontend ratio with the subject centered. */
  async fit(id: string, ratio: { w: number; h: number }, userId: string) {
    const media: any = await this.get(id, userId);
    this.assertProcessable(media);
    const rw = Math.max(1, Math.round(Number(ratio.w) || 1));
    const rh = Math.max(1, Math.round(Number(ratio.h) || 1));
    const buffer = await this.loadOriginal(media);
    const targetWidth = 1200;
    const targetHeight = Math.max(1, Math.round((targetWidth * rh) / rw));

    const out = await sharp(buffer)
      .rotate()
      .resize({ width: targetWidth, height: targetHeight, fit: 'cover', position: 'attention', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    const stored = await storeBuffer(out.data, '.webp', 'fit', `${safeStem(media.originalName)}-fit`);
    const derived = (media.derived ?? []) as any[];
    derived.push({ url: stored.url, width: out.info.width, height: out.info.height, ratio: `${rw}:${rh}`, source: 'auto', createdAt: new Date() });
    await this.mediaRepo.updateById(id, { derived } as any);
    return { url: stored.url, width: out.info.width, height: out.info.height, ratio: `${rw}:${rh}`, media: { ...media, derived } };
  }

  /** Manual crop from the picker's canvas coordinates (in original-image pixels). */
  async crop(id: string, options: { x: number; y: number; width: number; height: number; ratio?: string }, userId: string) {
    const media: any = await this.get(id, userId);
    this.assertProcessable(media);
    const buffer = await this.loadOriginal(media);
    const meta = await sharp(buffer).metadata();
    const x = Math.max(0, Math.round(Number(options.x) || 0));
    const y = Math.max(0, Math.round(Number(options.y) || 0));
    const width = Math.min(meta.width!, Math.max(1, Math.round(Number(options.width) || 1)));
    const height = Math.min(meta.height!, Math.max(1, Math.round(Number(options.height) || 1)));
    if (x + width > meta.width! || y + height > meta.height!) {
      throw new BadRequestError('Crop region is outside the image bounds');
    }

    const out = await sharp(buffer)
      .rotate()
      .extract({ left: x, top: y, width, height })
      .resize({ width: Math.min(1600, width), withoutEnlargement: true })
      .webp({ quality: 88, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    const stored = await storeBuffer(out.data, '.webp', 'crop', `${safeStem(media.originalName)}-crop`);
    const derived = (media.derived ?? []) as any[];
    derived.push({ url: stored.url, width: out.info.width, height: out.info.height, ratio: options.ratio || `${width}:${height}`, source: 'manual', createdAt: new Date() });
    await this.mediaRepo.updateById(id, { derived } as any);
    return { url: stored.url, width: out.info.width, height: out.info.height, ratio: options.ratio || `${width}:${height}` };
  }

  // -- Replace & version history ------------------------------------------

  async replace(id: string, file: MulterFile, userId: string, options: any = {}) {
    const media: any = await this.get(id, userId);
    if (!file?.buffer) throw new BadRequestError('A replacement file is required');
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestError('File exceeds the 25 MB upload limit');

    const declaredMime = file.mimetype || '';
    if (!ALLOWED_MIMES[declaredMime]) throw new BadRequestError('Unsupported file type');
    const sniffed = sniffMime(file.buffer);
    if (!sniffed || !ALLOWED_MIMES[sniffed]) throw new BadRequestError('File content does not match a supported image/video format');
    const isVideo = sniffed.startsWith('video/');
    if (isVideo) {
      const videoReason = videoMagicReason(file.buffer);
      if (videoReason) throw new BadRequestError(`Invalid video file (${videoReason})`);
    }
    if (sniffed === 'image/svg+xml') {
      const reason = unsafeSvgReason(file.buffer);
      if (reason) throw new BadRequestError(`Unsafe SVG file rejected (contains ${reason})`);
    }

    // Push the current state into version history before swapping.
    const versions = (media.versions ?? []) as any[];
    versions.push({
      url: media.url,
      thumbnailUrl: media.thumbnailUrl,
      width: media.width,
      height: media.height,
      size: media.size,
      mimeType: media.mimeType,
      note: options.note || 'Previous version',
      createdAt: new Date(),
    });

    const stem = safeStem(file.originalname);
    const storedPublicIds = (media.metadata?.storedPublicIds ?? []) as string[];
    let stored: { url: string; publicId: string };
    let mimeType = sniffed;
    let format = sniffed.split('/')[1] || '';
    let width = 0;
    let height = 0;
    let thumbnailUrl = '';
    let variants: Record<string, any> = {};
    let optimization: any = {};

    try {
      if (sniffed === 'image/svg+xml') {
        stored = await storeBuffer(file.buffer, '.svg', 'original', stem);
        const preview = await svgPreview(file.buffer, stem);
        if (preview) {
          variants.thumb = preview;
          storedPublicIds.push(preview.publicId);
        }
        try {
          const meta = await sharp(file.buffer).metadata();
          width = meta.width ?? 0;
          height = meta.height ?? 0;
        } catch {
          /* informational */
        }
        thumbnailUrl = variants.thumb?.url ?? stored.url;
      } else if (isVideo) {
        stored = await storeBuffer(file.buffer, ALLOWED_MIMES[sniffed], 'original', stem);
        thumbnailUrl = stored.url;
        format = sniffed.split('/')[1] || '';
      } else {
        const processed = await convertToWebp(file.buffer, sniffed, stem);
        width = processed.width;
        height = processed.height;
        variants = processed.variants;
        storedPublicIds.push(...processed.storedPublicIds);
        if (processed.isAnimated) {
          stored = await storeBuffer(file.buffer, '.gif', 'original', stem);
          mimeType = 'image/gif';
          format = 'gif';
          thumbnailUrl = stored.url;
        } else {
          stored = await storeBuffer(processed.webp!, '.webp', 'original', stem);
          mimeType = 'image/webp';
          format = 'webp';
          thumbnailUrl = variants.thumb?.url ?? stored.url;
          if (file.size > 0) {
            optimization = {
              originalSize: file.size,
              optimizedSize: processed.webp!.length,
              savingsPercent: Math.min(99, Math.round(((file.size - processed.webp!.length) / file.size) * 100)),
            };
          }
        }
      }

      storedPublicIds.push(stored.publicId);
      await assertStored(stored);

      const patch: any = {
        filename: stored.publicId,
        originalName: file.originalname,
        mimeType,
        format,
        size: file.size,
        url: stored.url,
        thumbnailUrl,
        width,
        height,
        ratio: detectRatio(width, height),
        checksum: crypto.createHash('md5').update(file.buffer).digest('hex'),
        variants: { thumb: variants.thumb, medium: variants.medium, large: variants.large, srcset: buildSrcset(variants) },
        optimization,
        derived: [], // derived crops belonged to the old bytes
        versions,
        metadata: {
          ...(media.metadata ?? {}),
          publicId: stored.publicId,
          resourceType: isVideo ? 'video' : 'image',
          storedPublicIds,
          sourceMimeType: sniffed,
          sourceFormat: sniffed.split('/')[1] || '',
          processing: format === 'webp' ? { converted: sniffed !== 'image/webp', quality: WEBP_QUALITY, width, height } : undefined,
        },
      };
      return this.mediaRepo.updateById(id, patch as any);
    } catch (error: any) {
      deleteStored(storedPublicIds.filter((pid) => !(media.metadata?.storedPublicIds ?? []).includes(pid)));
      throw error;
    }
  }

  async restoreVersion(id: string, versionId: string, userId: string) {
    const media: any = await this.get(id, userId);
    const versions = (media.versions ?? []) as any[];
    const version = versions.find((v: any) => String(v._id) === versionId);
    if (!version) throw new NotFoundError('Version not found');

    versions.push({ url: media.url, thumbnailUrl: media.thumbnailUrl, width: media.width, height: media.height, size: media.size, mimeType: media.mimeType, note: 'Current version', createdAt: new Date() });
    const patch: any = {
      url: version.url,
      thumbnailUrl: version.thumbnailUrl ?? media.thumbnailUrl,
      width: version.width ?? media.width,
      height: version.height ?? media.height,
      ratio: detectRatio(version.width ?? media.width, version.height ?? media.height),
      size: version.size ?? media.size,
      mimeType: version.mimeType ?? media.mimeType,
      format: version.mimeType?.split('/')[1] ?? media.format,
      versions,
    };
    return this.mediaRepo.updateById(id, patch as any);
  }

  // -- Replace everywhere (safe-delete helper) ------------------------------

  /**
   * Applies a url->newUrl replacement map across every content model and the
   * settings document. Returns the number of documents modified.
   */
  private async replaceUrlMap(replacements: Map<string, string>): Promise<number> {
    if (replacements.size === 0) return 0;
    let replaced = 0;

    const setValue = (cur: any, pathParts: string[], oldUrl: string, newUrl: string): boolean => {
      const [head, ...rest] = pathParts;
      const target = cur?.[head];
      if (target === undefined) return false;
      if (rest.length === 0) {
        if (Array.isArray(target)) {
          let changed = false;
          for (let i = 0; i < target.length; i++) {
            if (typeof target[i] === 'string' && target[i] === oldUrl) {
              target[i] = newUrl;
              changed = true;
            }
          }
          return changed;
        }
        if (target === oldUrl) {
          cur[head] = newUrl;
          return true;
        }
        return false;
      }
      if (Array.isArray(target)) {
        let changed = false;
        for (const item of target) {
          if (item && typeof item === 'object') {
            if (setValue(item, rest, oldUrl, newUrl)) changed = true;
          }
        }
        return changed;
      }
      if (target && typeof target === 'object') {
        return setValue(target, rest, oldUrl, newUrl);
      }
      return false;
    };

    for (const [oldUrl, newUrl] of replacements) {
      for (const scope of USAGE_SCOPES) {
        const $or = scope.fields.map((f) => ({ [f]: oldUrl }));
        const docs = await scope.model.find({ $or }).exec();
        for (const doc of docs as any[]) {
          let changed = false;
          for (const field of scope.fields) {
            if (setValue(doc, field.split('.'), oldUrl, newUrl)) changed = true;
          }
          if (changed) {
            await doc.save();
            replaced += 1;
          }
        }
      }
    }

    // Settings deep-replace. The walk runs over a plain toObject() clone —
    // mongoose documents carry circular internals ($__, _doc) that would
    // recurse forever — then each changed path is applied via document.set()
    // so mongoose dirty-tracking picks it up for save().
    const settings = await SettingsModel.findOne({}).exec();
    if (settings) {
      const plain: any = settings.toObject();
      const changes = new Map<string, unknown>();
      const visited = new WeakSet<object>();
      const walk = (node: any, path: string): void => {
        if (typeof node === 'string') {
          const replacement = replacements.get(node);
          if (replacement !== undefined) changes.set(path, replacement);
          return;
        }
        if (!node || typeof node !== 'object') return;
        if (visited.has(node)) return;
        visited.add(node);
        if (Array.isArray(node)) {
          for (let i = 0; i < node.length; i++) {
            const item = node[i];
            if (typeof item === 'string' && replacements.has(item)) {
              changes.set(`${path}.${i}`, replacements.get(item)!);
            } else if (item && typeof item === 'object') {
              walk(item, `${path}.${i}`);
            }
          }
          return;
        }
        for (const key of Object.keys(node)) {
          const value = node[key];
          if (typeof value === 'string' && replacements.has(value)) {
            changes.set(path ? `${path}.${key}` : key, replacements.get(value)!);
          } else if (value && typeof value === 'object') {
            walk(value, path ? `${path}.${key}` : key);
          }
        }
      };
      walk(plain, '');
      for (const [changePath, value] of changes) {
        settings.set(changePath, value);
      }
      if (changes.size > 0) {
        await settings.save();
        replaced += 1;
      }
    }

    return replaced;
  }

  /** Replaces every reference to this media's URLs with `newUrl` across all content models. */
  async replaceEverywhere(id: string, newUrl: string, userId: string) {
    const media: any = await this.get(id, userId);
    if (!newUrl || !/^https?:\/\//i.test(newUrl)) {
      throw new BadRequestError('newUrl must be an absolute http(s) URL');
    }
    const urls = this.urlsOf(media);
    const replacements = new Map(urls.map((u) => [u, newUrl]));
    const replaced = await this.replaceUrlMap(replacements);
    return { replaced };
  }

  // -- Reprocess / repair ---------------------------------------------------

  /**
   * Reprocesses an existing raster media record: reloads the stored bytes,
   * converts to WebP (quality 85), stores the new file, verifies it, updates
   * the media record and rewrites every storefront reference from the old
   * URLs to the new ones. Old files are only removed when deleteOriginal is
   * explicitly set — the new file must be verified first.
   */
  async reprocess(id: string, userId: string, options: { deleteOriginal?: boolean } = {}) {
    const media: any = await this.get(id, userId);
    const mimeType = media.mimeType || '';
    const isVideo = mimeType.startsWith('video/');
    if (isVideo) throw new BadRequestError('Video files cannot be reprocessed');
    if (mimeType === 'image/svg+xml') {
      // SVG stays SVG; only (re)generate the raster preview thumbnail.
      const buffer = await this.loadOriginal(media);
      const preview = await svgPreview(buffer, safeStem(media.originalName || media.filename));
      if (!preview) throw new BadRequestError('Unable to generate a preview for this SVG');
      const patch: any = {
        thumbnailUrl: preview.url,
        variants: { ...(media.variants ?? {}), thumb: preview, srcset: buildSrcset({ thumb: preview }) },
        metadata: { ...(media.metadata ?? {}), storedPublicIds: [...new Set([...(media.metadata?.storedPublicIds ?? []), preview.publicId])], reprocessedAt: new Date().toISOString() },
      };
      await this.mediaRepo.updateById(id, patch as any);
      return { media: await this.get(id, userId), replaced: 0, note: 'SVG preserved — preview thumbnail regenerated' };
    }
    if (!RASTER_IMAGE_MIMES.includes(mimeType)) {
      throw new BadRequestError('Only raster images can be reprocessed to WebP');
    }

    const buffer = await this.loadOriginal(media);
    const sniffed = sniffMime(buffer) || mimeType;
    if (!RASTER_IMAGE_MIMES.includes(sniffed)) {
      throw new BadRequestError('Stored file does not appear to be a supported raster image');
    }

    const stem = safeStem(media.originalName || media.filename || 'image');
    const processed = await convertToWebp(buffer, sniffed, stem);
    if (processed.isAnimated) {
      throw new BadRequestError('Animated GIFs are stored as-is and cannot be reprocessed');
    }

    const stored = await storeBuffer(processed.webp!, '.webp', 'original', stem);
    await assertStored(stored);

    const oldPublicIds = [...new Set([...(media.metadata?.storedPublicIds ?? []), media.metadata?.publicId].filter(Boolean))];

    // Map every old URL to its new equivalent (main url, thumbnail, variants).
    const variants = processed.variants;
    const replacements = new Map<string, string>();
    if (media.url && media.url !== stored.url) replacements.set(media.url, stored.url);
    const newThumb = variants.thumb?.url ?? stored.url;
    if (media.thumbnailUrl && media.thumbnailUrl !== newThumb) replacements.set(media.thumbnailUrl, newThumb);
    const variantNames: Array<keyof typeof variants> = ['thumb', 'medium', 'large'];
    for (const name of variantNames) {
      const oldV = (media.variants ?? {})[name];
      const newV = variants[name];
      if (oldV?.url && newV?.url && oldV.url !== newV.url) replacements.set(oldV.url, newV.url);
    }

    const replaced = await this.replaceUrlMap(replacements);

    const patch: any = {
      filename: stored.publicId,
      mimeType: 'image/webp',
      format: 'webp',
      size: processed.webp!.length,
      url: stored.url,
      thumbnailUrl: newThumb,
      width: processed.width,
      height: processed.height,
      ratio: detectRatio(processed.width, processed.height),
      variants: {
        thumb: variants.thumb ?? null,
        medium: variants.medium ?? null,
        large: variants.large ?? null,
        srcset: buildSrcset(variants),
      },
      optimization: {
        originalSize: media.size || 0,
        optimizedSize: processed.webp!.length,
        savingsPercent: media.size ? Math.min(99, Math.round(((media.size - processed.webp!.length) / media.size) * 100)) : 0,
      },
      metadata: {
        ...(media.metadata ?? {}),
        publicId: stored.publicId,
        resourceType: 'image',
        storedPublicIds: (() => {
          const ids = [...oldPublicIds, stored.publicId];
          if (variants.thumb?.publicId) ids.push(variants.thumb.publicId);
          if (variants.medium?.publicId) ids.push(variants.medium.publicId);
          if (variants.large?.publicId) ids.push(variants.large.publicId);
          return [...new Set(ids)];
        })(),
        sourceMimeType: sniffed,
        sourceFormat: sniffed.split('/')[1] || '',
        processing: { converted: sniffed !== 'image/webp', quality: WEBP_QUALITY, width: processed.width, height: processed.height },
        reprocessedAt: new Date().toISOString(),
      },
    };
    await this.mediaRepo.updateById(id, patch as any);

    // Only after the new file is stored, verified and the record updated:
    // optionally remove the old original (variants/derived are left intact for
    // version history and existing derived crops that may still be referenced).
    if (options.deleteOriginal && media.metadata?.publicId && media.metadata.publicId !== stored.publicId) {
      deleteStored([media.metadata.publicId]);
    }

    return { media: await this.get(id, userId), replaced, note: `Converted ${sniffed} to WebP` };
  }

  // -- Verify batch ---------------------------------------------------------

  /** Verifies each media URL; returns per-file results (ok / status / error). */
  async verifyBatch(ids: string[]): Promise<Array<{ id: string; ok: boolean; status?: number; error?: string; url?: string }>> {
    const unique = [...new Set(ids.filter(Boolean))].slice(0, 200);
    const results: Array<{ id: string; ok: boolean; status?: number; error?: string; url?: string }> = [];
    for (const id of unique) {
      const media: any = await this.mediaRepo.findById(id);
      if (!media) {
        results.push({ id, ok: false, error: 'Media record not found' });
        continue;
      }
      const url = media.url || '';
      if (!url || !/^https?:\/\//i.test(url)) {
        results.push({ id, ok: false, error: 'Missing or invalid URL', url });
        continue;
      }
      // Locally stored files are checked on disk; everything else via HEAD.
      const publicId = media.metadata?.publicId;
      if (!isCloudinary() && publicId) {
        const filePath = path.join(UPLOADS_DIR, path.basename(publicId));
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
          results.push({ id, ok: true, url });
          continue;
        }
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
        clearTimeout(timer);
        results.push({ id, ok: res.ok, status: res.status, url });
      } catch {
        results.push({ id, ok: false, status: 0, error: 'Unreachable', url });
      }
    }
    return results;
  }

  // -- Delete & bulk --------------------------------------------------------

  async remove(id: string, userId: string, isAdmin = false, force = false) {
    const media: any = await this.mediaRepo.findById(id);
    if (!media) throw new NotFoundError('Media file not found');
    if (!isAdmin && String(media.uploadedBy) !== userId) throw new NotFoundError('Media file not found');

    const usage = await this.computeUsage(this.urlsOf(media));
    if (usage.total > 0 && !force) {
      const error: any = new ConflictError(`This image is used in ${usage.total} places. Replace everywhere, or delete anyway.`);
      error.usage = usage;
      throw error;
    }

    if (media.metadata?.storedPublicIds?.length) {
      deleteStored(media.metadata.storedPublicIds);
    } else {
      deleteStored([media.metadata?.publicId]);
      if (media.thumbnailUrl && media.thumbnailUrl !== media.url) {
        try {
          const thumbName = path.basename(new URL(media.thumbnailUrl).pathname);
          deleteStored([thumbName]);
        } catch {
          /* best effort */
        }
      }
    }
    await this.mediaRepo.deleteById(id);
    return { removed: true, usage: usage.total };
  }

  async bulkDelete(ids: string[], userId: string, isAdmin = false, force = false) {
    const results = { deleted: 0, blocked: [] as any[] };
    for (const id of ids) {
      try {
        await this.remove(id, userId, isAdmin, force);
        results.deleted += 1;
      } catch (error: any) {
        if (error?.usage) {
          results.blocked.push({ id, usage: error.usage });
        } else {
          results.blocked.push({ id, error: error?.message || 'Delete failed' });
        }
      }
    }
    return results;
  }

  async bulkMove(ids: string[], folder: string, userId: string, isAdmin = false) {
    const ownable = await this.mediaRepo.findMany({ _id: { $in: ids } } as any);
    const allowedIds = ownable
      .filter((m: any) => isAdmin || String(m.uploadedBy) === userId)
      .map((m: any) => m._id);
    const result = await this.mediaRepo.updateMany({ _id: { $in: allowedIds } } as any, { folder } as any);
    return { moved: result.modifiedCount ?? allowedIds.length };
  }

  // -- URL verification ------------------------------------------------------

  async verifyUrl(url: string) {
    if (!url || !/^https?:\/\//i.test(url)) return { ok: false, error: 'Invalid URL', url };
    try {
      await assertPublicUrl(url);
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Unreachable', url };
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'bristi-media-verifier' } });
      clearTimeout(timer);
      const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const size = Number(res.headers.get('content-length')) || 0;
      const ok =
        res.ok &&
        (type.startsWith('image/') || /\.(jpe?g|png|webp|svg|gif|avif)(\?|#|$)/i.test(url));
      return { ok, status: res.status, mimeType: type, size, url };
    } catch {
      return { ok: false, status: 0, mimeType: '', size: 0, url, error: 'Unreachable' };
    }
  }
}