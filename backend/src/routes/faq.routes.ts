import { Router } from 'express';
import { FAQController } from '../controllers/faq.controller';
import { FAQService } from '../services/faq.service';
import { FAQRepository } from '../repositories/faq.repository';
import { protect, authorize } from '../middleware/auth.middleware';

const faqRepo = new FAQRepository();
const faqService = new FAQService(faqRepo);
const faqController = new FAQController(faqService);

const router = Router();

router.get('/', faqController.getFaqs);
router.get('/:id', faqController.getFaqById);

router.post('/', protect, authorize('admin'), faqController.createFaq);
router.put('/:id', protect, authorize('admin'), faqController.updateFaq);
router.delete('/:id', protect, authorize('admin'), faqController.deleteFaq);

export default router;