import { MediaFileModel } from '../models/MediaFile';
import { BaseRepository } from './base.repository';
import { IMediaFile } from 'shared/types';

export class MediaRepository extends BaseRepository<IMediaFile> {
  constructor() { super(MediaFileModel as any); }

  async findAccessible(id: string, userId?: string) {
    return this.model.findOne({ _id: id, $or: [{ isPublic: true }, ...(userId ? [{ uploadedBy: userId }] : [])] }).exec();
  }
}
