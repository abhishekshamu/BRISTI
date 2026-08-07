import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { asyncHandler } from '../middleware/async';

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  createNotification = asyncHandler(async (req: Request, res: Response) => {
    const notification = await this.notificationService.createNotification(req.body);
    res.status(201).json({
      success: true,
      data: notification
    });
  });

  getUserNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const { page = 1, limit = 20 } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { createdAt: -1 }
    };
    const result = await this.notificationService.getUserNotifications(userId, options);
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    });
  });

  getUnreadNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const notifications = await this.notificationService.getUnreadNotifications(userId);
    res.status(200).json({
      success: true,
      data: notifications
    });
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const notification = await this.notificationService.markAsRead(userId, id);
    res.status(200).json({
      success: true,
      data: notification
    });
  });

  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    await this.notificationService.markAllAsRead(userId);
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  });

  deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    await this.notificationService.deleteNotification(userId, id);
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  });

  getNotificationCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const count = await this.notificationService.getNotificationCount(userId);
    res.status(200).json({
      success: true,
      data: count
    });
  });
}
