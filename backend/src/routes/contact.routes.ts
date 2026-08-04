import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { ContactService } from '../services/contact.service';
import { ContactRepository } from '../repositories/contact.repository';
import { protect, authorize } from '../middleware/auth.middleware';

const contactRepo = new ContactRepository();
const contactService = new ContactService(contactRepo);
const contactController = new ContactController(contactService);

const router = Router();

router.post('/', contactController.send);
router.get('/', protect, authorize('admin'), contactController.getAllMessages);
router.get('/stats', protect, authorize('admin'), contactController.getStats);
router.patch('/:id/status', protect, authorize('admin'), contactController.updateStatus);
router.delete('/:id', protect, authorize('admin'), contactController.deleteMessage);

export default router;
