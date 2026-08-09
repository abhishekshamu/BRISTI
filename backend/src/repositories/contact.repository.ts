import { ContactMessageModel } from '../models/ContactMessage';
import { BaseRepository } from './base.repository';
import { ContactMessage } from '../../shared/types';

export class ContactRepository extends BaseRepository<ContactMessage> {
  constructor() {
    super(ContactMessageModel);
  }

  async getStatusStats(): Promise<any> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).exec();
  }
}
