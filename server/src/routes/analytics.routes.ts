import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { protect, authorize } from '../middleware/auth.middleware';
import { trackEventValidation } from '../validators/analytics.validators';
import { validate } from '../validators/index';

const analyticsRepo = new AnalyticsRepository();
const analyticsService = new AnalyticsService(analyticsRepo);
const analyticsController = new AnalyticsController(analyticsService);

const router = Router();

router.post('/track', trackEventValidation, validate, analyticsController.trackEvent);
router.get('/', protect, authorize('admin'), analyticsController.getAllEvents);
router.get('/events/:eventName', protect, authorize('admin'), analyticsController.getEventsByEventName);
router.get('/user/:userId', protect, authorize('admin'), analyticsController.getEventsByUser);
router.get('/session/:sessionId', protect, authorize('admin'), analyticsController.getEventsBySession);
router.get('/stats', protect, authorize('admin'), analyticsController.getEventStats);
router.get('/page-views', protect, authorize('admin'), analyticsController.getPageViews);

export default router;
