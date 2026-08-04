import { Router } from 'express';
import { NewsletterController } from '../controllers/newsletter.controller';
import { NewsletterService } from '../services/newsletter.service';
import { NewsletterRepository } from '../repositories/newsletter.repository';
import { EmailService } from '../services/email.service';
import { protect, authorize } from '../middleware/auth.middleware';

const newsletterRepo = new NewsletterRepository();
const emailService = new EmailService();
const newsletterService = new NewsletterService(newsletterRepo, emailService);
const newsletterController = new NewsletterController(newsletterService);

const router = Router();

router.post('/subscribe', newsletterController.subscribe);
router.post('/unsubscribe', newsletterController.unsubscribe);
router.get('/confirm/:token', newsletterController.confirmSubscription);
router.get('/', protect, authorize('admin'), newsletterController.getAllSubscribers);
router.get('/stats', protect, authorize('admin'), newsletterController.getSubscriptionStats);
router.get('/growth-stats', protect, authorize('admin'), newsletterController.getGrowthStats);

export default router;
