import { NotificationService } from './notification.service';
import { AdminRepository } from '../repositories/admin.repository';

export async function notifyAdmins(
  notificationService: NotificationService,
  data: {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'success' | 'error';
    relatedId?: any;
    relatedType?: 'Order' | 'Product' | 'User' | 'Review' | 'BlogPost' | 'Message';
  }
): Promise<void> {
  try {
    const adminRepo = new AdminRepository();
    const admins = await adminRepo.findMany({ isActive: true }, {});
    for (const admin of admins) {
      await notificationService.createNotification({
        userId: (admin as any)._id,
        title: data.title,
        message: data.message,
        type: data.type ?? 'info',
        relatedId: data.relatedId,
        relatedType: data.relatedType,
      });
    }
  } catch (err) {
    console.error('notifyAdmins failed:', err);
  }
}
