import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationService } from '../services/notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { protect, authorize } from '../middleware/auth.middleware';
import { createNotificationValidation, markReadValidation } from '../validators/notification.validators';
import { validate } from '../validators/index';

const notificationRepo = new NotificationRepository();
const notificationService = new NotificationService(notificationRepo);
const notificationController = new NotificationController(notificationService);

const router = Router();

router.get('/', protect, notificationController.getUserNotifications);
router.get('/unread', protect, notificationController.getUnreadNotifications);
router.get('/count', protect, notificationController.getNotificationCount);
router.post('/', protect, authorize('admin'), createNotificationValidation, validate, notificationController.createNotification);
router.put('/read/:id', protect, markReadValidation, validate, notificationController.markAsRead);
router.put('/read-all', protect, notificationController.markAllAsRead);
router.delete('/:id', protect, notificationController.deleteNotification);

export default router;
