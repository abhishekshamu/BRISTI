import { NotificationModel } from '../models/Notification';
import { BaseRepository } from './base.repository';
import { INotification } from 'shared/types';

export class NotificationRepository extends BaseRepository<INotification> {
  constructor() {
    super(NotificationModel);
  }

  async findByUser(userId: string, options: any = {}): Promise<INotification[]> {
    return this.findMany({ userId }, { sort: { createdAt: -1 }, ...options });
  }

  async findUnreadByUser(userId: string): Promise<INotification[]> {
    return this.findMany({ userId, isRead: false }, { sort: { createdAt: -1 } });
  }

  async markAsRead(notificationId: string): Promise<INotification | null> {
    return this.updateById(notificationId, { isRead: true, readAt: new Date() });
  }
}

