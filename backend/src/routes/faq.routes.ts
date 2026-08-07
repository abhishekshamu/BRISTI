import { Router } from 'express';
import { FAQController } from '../controllers/faq.controller';
import { FAQService } from '../services/faq.service';
import { FAQRepository } from '../repositories/faq.repository';
import { protect, authorize, optionalAuth } from '../middleware/auth.middleware';
import { createFaqValidation, updateFaqValidation } from '../validators/faq.validators';
import { validateRequest } from '../validators';

const faqRepo = new FAQRepository();
const faqService = new FAQService(faqRepo);
const faqController = new FAQController(faqService);

const router = Router();

router.get('/', optionalAuth, faqController.getFaqs);
router.get('/:id', optionalAuth, faqController.getFaqById);

router.post('/', protect, authorize('admin'), createFaqValidation, validateRequest, faqController.createFaq);
router.put('/:id', protect, authorize('admin'), updateFaqValidation, validateRequest, faqController.updateFaq);
router.delete('/:id', protect, authorize('admin'), faqController.deleteFaq);

export default router;