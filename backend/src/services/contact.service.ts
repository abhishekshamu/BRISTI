import { ContactRepository } from '../repositories/contact.repository';
import { ContactMessage } from 'shared/types';
import { BadRequestException, NotFoundError } from '../utils/exceptions';
import { isValidEmail } from 'shared/utils';

const MESSAGE_STATUSES = ['pending', 'read', 'responded', 'archived'] as const;

export class ContactService {
  constructor(private contactRepo: ContactRepository) {}

  async send(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }): Promise<ContactMessage> {
    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Name is required');
    }
    if (!data.email) {
      throw new BadRequestException('Email is required');
    }
    if (!isValidEmail(data.email)) {
      throw new BadRequestException('Invalid email address');
    }
    if (!data.subject || !data.subject.trim()) {
      throw new BadRequestException('Subject is required');
    }
    if (!data.message || !data.message.trim()) {
      throw new BadRequestException('Message is required');
    }

    return this.contactRepo.create({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim(),
      subject: data.subject.trim(),
      message: data.message.trim(),
      status: 'pending',
    });
  }

  async getAllMessages(options: { page?: number; limit?: number; status?: string } = {}): Promise<any> {
    const filter: any = {};
    if (options.status && options.status !== 'all') {
      if (!MESSAGE_STATUSES.includes(options.status as any)) {
        throw new BadRequestException('Invalid status');
      }
      filter.status = options.status;
    }
    return this.contactRepo.paginate(filter, {
      page: options.page ?? 1,
      limit: options.limit ?? 20,
      sort: { createdAt: -1 },
    });
  }

  async updateStatus(id: string, status: string): Promise<ContactMessage> {
    if (!MESSAGE_STATUSES.includes(status as any)) {
      throw new BadRequestException('Invalid status');
    }
    const message = await this.contactRepo.updateById(id, { status });
    if (!message) {
      throw new NotFoundError('Message not found');
    }
    return message;
  }

  async deleteMessage(id: string): Promise<void> {
    const deleted = await this.contactRepo.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('Message not found');
    }
  }

  async getStats(): Promise<any> {
    const counts = await this.contactRepo.getStatusStats();
    const stats: Record<string, number> = { total: 0 };
    for (const status of MESSAGE_STATUSES) {
      stats[status] = 0;
    }
    for (const row of counts) {
      stats[row._id] = row.count;
      stats.total += row.count;
    }
    return stats;
  }
}
