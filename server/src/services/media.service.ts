import cloudinary from 'cloudinary';
import { MediaRepository } from '../repositories/media.repository';
import { NotFoundError, BadRequestError } from '../utils/exceptions';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export class MediaService {
  constructor(private readonly mediaRepo: MediaRepository) {}

  async upload(file: Express.Multer.File, userId: string, options: { folder?: string; altText?: string; caption?: string; isPublic?: boolean } = {}) {
    if (!file?.buffer) throw new BadRequestError('A file is required');
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestError('File exceeds the 25 MB upload limit');
    if (!/^image\/(jpeg|png|webp|gif|avif)$|^video\/(mp4|webm)$/.test(file.mimetype)) {
      throw new BadRequestError('Unsupported file type');
    }
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream({
        folder: options.folder || 'bristi', resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
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
    if (publicId) await cloudinary.v2.uploader.destroy(publicId, { resource_type: media.metadata?.resourceType || 'image' });
    await this.mediaRepo.deleteById(id);
  }

  async list(folder: string, options: { page: number; limit: number }) {
    const filter: any = folder && folder !== 'all' ? { folder } : {};
    return this.mediaRepo.paginate(filter, options);
  }
}
