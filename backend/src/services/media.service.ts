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
import { MediaUsageEntry } from 'shared/types';
import { detectRatio } from 'shared/utils';

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
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

const RASTER_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

const API_BASE = () => (process.env.API_URL ? process.env.API_URL.replace(/\/$/, '') : `http://localhost:${process.env.PORT || 5000}`);

const isCloudinary = () => Boolean(process.env.CLOUDINARY_URL);

// ---------------------------------------------------------------------------
// Storage helpers (Cloudinary when configured, local uploads/ otherwise)
// ---------------------------------------------------------------------------

async function storeBuffer(buffer: Buffer, ext: string, _tag: string): Promise<{ url: string; publicId: string }> {
  if (isCloudinary()) {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        { folder: 'bristi', use_filename: true, unique_filename: true, resource_type: 'auto' },
        (error, upload) => (error ? reject(error) : resolve(upload))
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, publicId: result.public_id };
  }
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const publicId = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
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

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

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

// Video magic-byte sniffing. The multipart `mimetype` header is client
// controlled, so we verify the payload actually looks like a video before
// persisting it, otherwise an HTML/script payload could be stored under a
// .mp4 / .webm name.
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
// Image processing (sharp): dimensions, WebP/AVIF responsive variants
// ---------------------------------------------------------------------------

interface ProcessedImage {
  width: number;
  height: number;
  isAnimated: boolean;
  variants: Record<string, { url: string; width: number; height: number; size: number; format: string }>;
  optimizedSize: number;
  storedPublicIds: string[];
}

async function processImage(buffer: Buffer, mimeType: string): Promise<ProcessedImage> {
  const empty: ProcessedImage = { width: 0, height: 0, isAnimated: false, variants: {}, optimizedSize: 0, storedPublicIds: [] };
  if (mimeType === 'image/svg+xml') return empty;
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new BadRequestError('Invalid image file — it does not appear to be a supported format');
  }
  if (!meta.width || !meta.height) throw new BadRequestError('The image file appears to be corrupted or unreadable');
  if (mimeType === 'image/gif' && (meta.pages ?? 1) > 1) {
    return { ...empty, width: meta.width, height: meta.height, isAnimated: true };
  }

  const base = sharp(buffer).rotate(); // auto-orient so EXIF-rotated photos render correctly
  const jobs: Array<{ name: string; width: number; format: 'webp' | 'avif'; quality: number }> = [];
  if (meta.width > 320) jobs.push({ name: 'thumb', width: 320, format: 'webp', quality: 78 });
  if (meta.width > 900) jobs.push({ name: 'medium', width: 900, format: 'webp', quality: 82 });
  if (meta.width > 1600) jobs.push({ name: 'large', width: 1600, format: 'webp', quality: 85 });
  if (meta.width > 900) jobs.push({ name: 'avif', width: 900, format: 'avif', quality: 70 });

  const variants: Record<string, { url: string; width: number; height: number; size: number; format: string }> = {};
  const storedPublicIds: string[] = [];
  let optimizedSize = 0;
  for (const job of jobs) {
    try {
      const out = await base
        .clone()
        .resize({ width: job.width, withoutEnlargement: true })
        .toFormat(job.format, { quality: job.quality, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      const stored = await storeBuffer(out.data, `.${job.format}`, job.name);
      variants[job.name] = { url: stored.url, width: out.info.width, height: out.info.height, size: out.data.length, format: job.format };
      storedPublicIds.push(stored.publicId);
      optimizedSize += out.data.length;
    } catch {
      // AVIF/WebP encoding can fail on exotic inputs — variants are best-effort,
      // the original is always stored.
    }
  }
  return { width: meta.width, height: meta.height, isAnimated: false, variants, optimizedSize, storedPublicIds };
}

function buildSrcset(variants: Record<string, { url: string }>): string {
  const parts: string[] = [];
  const order = ['thumb', 'medium', 'large', 'avif'];
  const widths: Record<string, number> = { thumb: 320, medium: 900, large: 1600, avif: 900 };
  for (const key of order) {
    if (variants[key]) parts.push(`${variants[key].url} ${widths[key]}w`);
  }
  return parts.join(', ');
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

  async upload(file: Express.Multer.File, userId: string, options: any = {}) {
    if (!file?.buffer) throw new BadRequestError('A file is required');
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestError('File exceeds the 25 MB upload limit');
    const ext = ALLOWED_MIMES[file.mimetype];
    if (!ext) {
      throw new BadRequestError('Unsupported file type. Allowed: jpg, jpeg, png, webp, svg, gif, avif');
    }
    const isVideo = file.mimetype.startsWith('video/');
    if (isVideo) {
      const videoReason = videoMagicReason(file.buffer);
      if (videoReason) throw new BadRequestError(`Invalid video file (${videoReason})`);
    }

    const checksum = crypto.createHash('md5').update(file.buffer).digest('hex');

    if (file.mimetype === 'image/svg+xml') {
      const reason = unsafeSvgReason(file.buffer);
      if (reason) throw new BadRequestError(`Unsafe SVG file rejected (contains ${reason})`);
    }

    // Duplicate detection: if the exact same bytes are already in the library,
    // return the existing file so admins can reuse it without duplicates.
    if (!options.allowDuplicate) {
      const existing = await this.mediaRepo.findOne({ checksum } as any);
      if (existing) {
        const doc = (existing as any).toObject ? (existing as any).toObject() : existing;
        return { ...doc, duplicated: true, reusedId: doc._id };
      }
    }

    const stored: any = { original: null };
    let width = 0;
    let height = 0;
    let thumbnailUrl = '';
    let variants: Record<string, any> = {};
    let optimization: any = {};
    const storedPublicIds: string[] = [];

    if (!isVideo) {
      const processed = await processImage(file.buffer, file.mimetype);
      width = processed.width;
      height = processed.height;
      variants = processed.variants;
      storedPublicIds.push(...processed.storedPublicIds);
      const totalVariantBytes = processed.optimizedSize;
      optimization =
        totalVariantBytes > 0 && file.size > 0
          ? { originalSize: file.size, optimizedSize: totalVariantBytes, savingsPercent: Math.min(99, Math.round(((file.size - totalVariantBytes) / file.size) * 100)) }
          : {};
    }

    stored.original = await storeBuffer(file.buffer, ext, 'original');
    storedPublicIds.push(stored.original.publicId);
    thumbnailUrl = variants.thumb?.url ?? stored.original.url;

    const tags = Array.isArray(options.tags)
      ? options.tags
      : typeof options.tags === 'string' && options.tags.trim()
        ? options.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [];

    const doc = await this.mediaRepo.create({
      filename: stored.original.publicId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: stored.original.url,
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
        avif: variants.avif,
        srcset: buildSrcset(variants),
      },
      optimization,
      metadata: { publicId: stored.original.publicId, resourceType: isVideo ? 'video' : 'image', storedPublicIds },
    } as any);

    return doc;
  }

  async uploadMany(files: Express.Multer.File[], userId: string, options: any = {}) {
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
      const absolute = media.url.startsWith('/') ? `${API_BASE()}${media.url}` : media.url;
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
      throw new BadRequestError('Only raster images (jpg, png, webp, gif, avif) can be fitted or cropped');
    }
    if (media.mimeType === 'image/gif' && (media.variants && Object.keys(media.variants).length === 0)) {
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
      .webp({ quality: 85, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    const stored = await storeBuffer(out.data, '.webp', 'fit');
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

    const stored = await storeBuffer(out.data, '.webp', 'crop');
    const derived = (media.derived ?? []) as any[];
    derived.push({ url: stored.url, width: out.info.width, height: out.info.height, ratio: options.ratio || `${width}:${height}`, source: 'manual', createdAt: new Date() });
    await this.mediaRepo.updateById(id, { derived } as any);
    return { url: stored.url, width: out.info.width, height: out.info.height, ratio: options.ratio || `${width}:${height}` };
  }

  // -- Replace & version history ------------------------------------------

  async replace(id: string, file: Express.Multer.File, userId: string, options: any = {}) {
    const media: any = await this.get(id, userId);
    if (!file?.buffer) throw new BadRequestError('A replacement file is required');
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestError('File exceeds the 25 MB upload limit');
    const ext = ALLOWED_MIMES[file.mimetype];
    if (!ext) throw new BadRequestError('Unsupported file type');
    if (file.mimetype.startsWith('video/')) {
      const videoReason = videoMagicReason(file.buffer);
      if (videoReason) throw new BadRequestError(`Invalid video file (${videoReason})`);
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

    if (file.mimetype === 'image/svg+xml') {
      const reason = unsafeSvgReason(file.buffer);
      if (reason) throw new BadRequestError(`Unsafe SVG file rejected (contains ${reason})`);
    }

    let width = 0;
    let height = 0;
    let thumbnailUrl = '';
    let variants: Record<string, any> = {};
    let optimization: any = {};
    const storedPublicIds = (media.metadata?.storedPublicIds ?? []) as string[];

    if (!file.mimetype.startsWith('video/')) {
      try {
        const processed = await processImage(file.buffer, file.mimetype);
        width = processed.width;
        height = processed.height;
        variants = processed.variants;
        storedPublicIds.push(...processed.storedPublicIds);
        optimization = processed.optimizedSize > 0 ? { originalSize: file.size, optimizedSize: processed.optimizedSize, savingsPercent: Math.min(99, Math.round(((file.size - processed.optimizedSize) / file.size) * 100)) } : {};
      } catch (error: any) {
        if (error instanceof BadRequestError) throw error;
        // best effort: keep original only
      }
    }

    const stored = await storeBuffer(file.buffer, ext, 'original');
    storedPublicIds.push(stored.publicId);
    thumbnailUrl = variants.thumb?.url ?? stored.url;

    const patch: any = {
      filename: stored.publicId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: stored.url,
      thumbnailUrl,
      width,
      height,
      ratio: detectRatio(width, height),
      checksum: crypto.createHash('md5').update(file.buffer).digest('hex'),
      variants: { thumb: variants.thumb, medium: variants.medium, large: variants.large, avif: variants.avif, srcset: variants.thumb || variants.medium || variants.large ? [variants.thumb?.url && `${variants.thumb.url} 320w`, variants.medium?.url && `${variants.medium.url} 900w`, variants.large?.url && `${variants.large.url} 1600w`].filter(Boolean).join(', ') : '' },
      optimization,
      derived: [], // derived crops belonged to the old bytes
      versions,
      metadata: { ...(media.metadata ?? {}), publicId: stored.publicId, storedPublicIds },
    };
    return this.mediaRepo.updateById(id, patch as any);
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
      versions,
    };
    return this.mediaRepo.updateById(id, patch as any);
  }

  // -- Replace everywhere (safe-delete helper) ------------------------------

  /** Replaces every reference to this media's URLs with `newUrl` across all content models. */
  async replaceEverywhere(id: string, newUrl: string, userId: string) {
    const media: any = await this.get(id, userId);
    if (!newUrl || !/^https?:\/\//i.test(newUrl)) {
      throw new BadRequestError('newUrl must be an absolute http(s) URL');
    }
    const urls = this.urlsOf(media);
    const replacements = new Map(urls.map((u) => [u, newUrl]));
    let replaced = 0;

    const setValue = (cur: any, pathParts: string[], oldUrl: string): boolean => {
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
            if (setValue(item, rest, oldUrl)) changed = true;
          }
        }
        return changed;
      }
      if (target && typeof target === 'object') {
        return setValue(target, rest, oldUrl);
      }
      return false;
    };

    for (const scope of USAGE_SCOPES) {
      const $or = scope.fields.map((f) => ({ [f]: { $in: urls } }));
      const docs = await scope.model.find({ $or }).exec();
      for (const doc of docs as any[]) {
        let changed = false;
        for (const field of scope.fields) {
          const parts = field.split('.');
          for (const url of urls) {
            if (setValue(doc, parts, url)) changed = true;
          }
        }
        if (changed) {
          await doc.save();
          replaced += 1;
        }
      }
    }

    // Settings deep-replace
    const settings = await SettingsModel.findOne({}).exec();
    if (settings) {
      const walk = (node: any): boolean => {
        if (typeof node === 'string') return false;
        if (!node || typeof node !== 'object') return false;
        let changed = false;
        if (Array.isArray(node)) {
          for (let i = 0; i < node.length; i++) {
            const item = node[i];
            if (typeof item === 'string' && replacements.has(item)) {
              node[i] = newUrl;
              changed = true;
            } else if (item && typeof item === 'object' && walk(item)) {
              changed = true;
            }
          }
        } else {
          for (const key of Object.keys(node)) {
            const value = node[key];
            if (typeof value === 'string' && replacements.has(value)) {
              node[key] = newUrl;
              changed = true;
            } else if (value && typeof value === 'object' && walk(value)) {
              changed = true;
            }
          }
        }
        return changed;
      };
      if (walk(settings)) {
        await settings.save();
        replaced += 1;
      }
    }

    return { replaced };
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
