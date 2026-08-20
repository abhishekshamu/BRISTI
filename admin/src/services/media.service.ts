import api from '../lib/api';
import type { MediaFile, MediaUsageEntry } from '@shared/types';

export interface MediaListParams {
  folder?: string;
  search?: string;
  tag?: string;
  type?: 'all' | 'image' | 'video';
  sort?: 'newest' | 'oldest' | 'name' | 'size' | 'used';
  favorite?: boolean;
  unused?: boolean;
  usage?: boolean;
  page?: number;
  limit?: number;
}

export interface MediaListResult {
  data: MediaFile[];
  pagination: { total: number; page: number; limit: number; pages: number };
  usage: Record<string, number>;
}

export interface UploadOptions {
  folder?: string;
  altText?: string;
  title?: string;
  caption?: string;
  tags?: string[];
  onProgress?: (percent: number) => void;
}

export async function fetchMedia(params: MediaListParams = {}): Promise<MediaListResult> {
  const res = await api.get('/media', { params });
  return {
    data: (res.data.data ?? []) as MediaFile[],
    pagination: (res.data.pagination ?? { total: 0, page: 1, limit: 50, pages: 1 }) as MediaListResult['pagination'],
    usage: (res.data.usage ?? {}) as Record<string, number>,
  };
}

export async function fetchMediaById(id: string): Promise<MediaFile> {
  const res = await api.get(`/media/${id}`);
  return res.data.data as MediaFile;
}

export async function fetchFolders(): Promise<string[]> {
  const res = await api.get('/media/folders');
  return res.data.data as string[];
}

export async function fetchUsage(id: string): Promise<{ total: number; entries: MediaUsageEntry[] }> {
  const res = await api.get(`/media/${id}/usage`);
  return res.data.data;
}

export async function uploadFiles(files: File[], options: UploadOptions = {}): Promise<MediaFile[]> {
  const form = new FormData();
  for (const file of files) form.append('files', file);
  if (options.folder) form.append('folder', options.folder);
  if (options.altText) form.append('altText', options.altText);
  if (options.title) form.append('title', options.title);
  if (options.caption) form.append('caption', options.caption);
  if (options.tags?.length) form.append('tags', options.tags.join(','));

  const res = await api.post('/media', form, {
    onUploadProgress: (e) => {
      if (options.onProgress && e.total) {
        options.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  const data = res.data.data;
  return Array.isArray(data) ? (data as MediaFile[]) : [data as MediaFile];
}

export async function updateMedia(id: string, patch: Partial<MediaFile>): Promise<MediaFile> {
  const res = await api.patch(`/media/${id}`, patch);
  return res.data.data as MediaFile;
}

export async function deleteMedia(id: string, force = false): Promise<void> {
  await api.delete(`/media/${id}`, { params: force ? { force: true } : undefined });
}

export async function fitMedia(id: string, ratio: { w: number; h: number }): Promise<{ url: string; width: number; height: number; ratio: string }> {
  const res = await api.post(`/media/${id}/fit`, { ratio });
  return res.data.data;
}

export async function cropMedia(id: string, region: { x: number; y: number; width: number; height: number; ratio?: string }): Promise<{ url: string; width: number; height: number; ratio: string }> {
  const res = await api.post(`/media/${id}/crop`, region);
  return res.data.data;
}

export async function replaceMedia(id: string, file: File, note?: string): Promise<MediaFile> {
  const form = new FormData();
  form.append('files', file);
  if (note) form.append('note', note);
  const res = await api.post(`/media/${id}/replace`, form);
  return res.data.data as MediaFile;
}

export async function restoreMediaVersion(id: string, versionId: string): Promise<MediaFile> {
  const res = await api.post(`/media/${id}/restore-version`, { versionId });
  return res.data.data as MediaFile;
}

export async function replaceEverywhere(id: string, newUrl: string): Promise<{ replaced: number }> {
  const res = await api.post(`/media/${id}/replace-everywhere`, { newUrl });
  return res.data.data;
}

export async function bulkDeleteMedia(ids: string[], force = false): Promise<{ deleted: number; blocked: Array<{ id: string; usage?: { total: number; entries: MediaUsageEntry[] }; error?: string }> }> {
  const res = await api.post('/media/bulk-delete', { ids, force });
  return res.data.data;
}

export async function bulkMoveMedia(ids: string[], folder: string): Promise<{ moved: number }> {
  const res = await api.post('/media/bulk-move', { ids, folder });
  return res.data.data;
}

export async function verifyUrl(url: string): Promise<{ ok: boolean; status: number; mimeType: string; size: number; error?: string }> {
  const res = await api.post('/media/verify-url', { url });
  return res.data.data;
}

export interface MediaVerifyResult {
  id: string;
  ok: boolean;
  status?: number;
  error?: string;
  url?: string;
}

export async function verifyMediaBatch(ids: string[]): Promise<MediaVerifyResult[]> {
  const res = await api.post('/media/verify', { ids });
  return res.data.data as MediaVerifyResult[];
}

export async function reprocessMedia(
  id: string,
  deleteOriginal = false
): Promise<{ media: MediaFile; replaced: number; note?: string }> {
  const res = await api.post(`/media/${id}/reprocess`, { deleteOriginal });
  return res.data.data;
}

export const ACCEPTED_IMAGE_EXTENSIONS = 'jpg,jpeg,png,webp,svg,gif,avif,bmp,tiff,heic,heif';
export const ACCEPTED_IMAGE_ACCEPT =
  '.jpg,.jpeg,.png,.webp,.svg,.gif,.avif,.bmp,.tiff,.heic,.heif,image/jpeg,image/png,image/webp,image/svg+xml,image/gif,image/avif,image/bmp,image/tiff,image/heic,image/heif';
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function fileExtension(name?: string): string {
  return (name ?? '').split('.').pop()?.toLowerCase() ?? '';
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isRasterMime(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif'].includes(mimeType);
}

export function generateAltFromFilename(name: string): string {
  const base = name.replace(/\.(jpe?g|png|webp|svg|gif|avif)$/i, '');
  return base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function generateTitleFromFilename(name: string): string {
  const base = generateAltFromFilename(name);
  return base.length > 0 ? base.charAt(0).toUpperCase() + base.slice(1) : base;
}

export function totalUsageOf(file: MediaFile, usageMap?: Record<string, number>): number {
  if (usageMap && usageMap[String(file._id)] !== undefined) return usageMap[String(file._id)];
  if (file.usage) return file.usage.reduce((sum, e) => sum + e.count, 0);
  return 0;
}

export function isSvgMime(mimeType: string): boolean {
  return mimeType === 'image/svg+xml';
}
