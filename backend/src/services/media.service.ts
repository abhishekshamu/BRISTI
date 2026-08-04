import fs from 'fs';
import path from 'path';
import cloudinary from 'cloudinary';
import { MediaRepository } from '../repositories/media.repository';
import { NotFoundError, BadRequestError } from '../utils/exceptions';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const API_BASE = () => (process.env.API_URL ? process.env.API_URL.replace(/\/$/, '') : `http://localhost:${process.env.PORT || 5000}`);

export class MediaService {
  constructor(private readonly mediaRepo: MediaRepository) {}

  async upload(file: Express.Multer.File, userId: string, options: { folder?: string; altText?: string; caption?: string; isPublic?: boolean } = {}) {
    if (!file?.buffer) throw new BadRequestError('A file is required');
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestError('File exceeds the 25 MB upload limit');
    if (!/^image\/(jpeg|png|webp|gif|avif)$|^video\/(mp4|webm)$/.test(file.mimetype)) {
      throw new BadRequestError('Unsupported file type');
    }
    const isVideo = file.mimetype.startsWith('video/');

    if (!process.env.CLOUDINARY_URL) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      const ext = path.extname(file.originalname).toLowerCase() || (isVideo ? '.mp4' : '.jpg');
      const publicId = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const dest = path.join(UPLOADS_DIR, publicId);
      fs.writeFileSync(dest, file.buffer);
      const url = `${API_BASE()}/uploads/${publicId}`;
      return this.mediaRepo.create({
        filename: publicId, originalName: file.originalname, mimeType: file.mimetype, size: file.size,
        url, thumbnailUrl: url, width: 0, height: 0, duration: 0,
        folder: options.folder || '/', altText: options.altText, caption: options.caption,
        isPublic: options.isPublic !== false, uploadedBy: userId,
        metadata: { publicId, resourceType: isVideo ? 'video' : 'image' },
      } as any);
    }

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream({
        folder: options.folder || 'bristi', resource_type: isVideo ? 'video' : 'image',
        use_filename: true, unique_filename: true,
      }, (error, upload) => error ? reject(error) : resolve(upload));
      stream.end(file.buffer);
    });
    return this.mediaRepo.create({
      filename: result.public_id, originalName: file.originalname, mimeType: file.mimetype, size: file.size,
      url: result.secure_url, thumbnailUrl: result.secure_url, width: result.width, height: result.height,
      duration: result.duration, folder: options.folder || '/', altText: options.altText, caption: options.caption,
      isPublic: options.isPublic !== false, uploadedBy: userId, metadata: { publicId: result.public_id, resourceType: result.resource_type },
    } as any);
  }

  async get(id: string, userId?: string) {
    const media = await this.mediaRepo.findAccessible(id, userId);
    if (!media) throw new NotFoundError('Media file not found');
    return media;
  }

  async remove(id: string, userId: string, isAdmin = false) {
    const media: any = await this.mediaRepo.findById(id);
    if (!media) throw new NotFoundError('Media file not found');
    if (!isAdmin && String(media.uploadedBy) !== userId) throw new NotFoundError('Media file not found');
    const publicId = media.metadata?.publicId;
    if (process.env.CLOUDINARY_URL) {
      if (publicId) await cloudinary.v2.uploader.destroy(publicId, { resource_type: media.metadata?.resourceType || 'image' });
    } else if (publicId) {
      const filePath = path.join(UPLOADS_DIR, path.basename(publicId));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await this.mediaRepo.deleteById(id);
  }

  async list(folder: string, options: { page: number; limit: number }) {
    const filter: any = folder && folder !== 'all' ? { folder } : {};
    return this.mediaRepo.paginate(filter, options);
  }
}
