import { NotificationRepository } from '../repositories/notification.repository';
import { INotification } from 'shared/types';

export class NotificationService {
  constructor(private notificationRepo: NotificationRepository) {}

  async createNotification(notificationData: Partial<INotification>): Promise<INotification> {
    return this.notificationRepo.create(notificationData);
  }

  async getUserNotifications(userId: string, options: any = {}): Promise<any> {
    return this.notificationRepo.paginate({ userId }, { sort: { createdAt: -1 }, ...options });
  }

  async getUnreadNotifications(userId: string): Promise<INotification[]> {
    return this.notificationRepo.findMany({ userId, isRead: false }, { sort: { createdAt: -1 } });
  }

  async markAsRead(userId: string, notificationId: string): Promise<INotification | null> {
    return this.notificationRepo.updateOne(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() }
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.notificationRepo.findMany({ userId, isRead: false });
    for (const notification of notifications) {
      await this.notificationRepo.updateById(notification._id.toString(), { isRead: true, readAt: new Date() });
    }
  }

  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    return this.notificationRepo.deleteOne({ _id: notificationId, userId });
  }

  async getNotificationCount(userId: string): Promise<{ total: number; unread: number }> {
    const total = await this.notificationRepo.count({ userId });
    const unread = await this.notificationRepo.count({ userId, isRead: false });
    return { total, unread };
  }
}

