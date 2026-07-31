import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.middleware';
import { MediaRepository } from '../repositories/media.repository';
import { MediaService } from '../services/media.service';
import { MediaController } from '../controllers/media.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
const mediaRepo = new MediaRepository();
const mediaService = new MediaService(mediaRepo);
const controller = new MediaController(mediaService);
const router = Router();

router.get('/', protect, controller.list);
router.get('/:id', protect, controller.get);
router.post('/', protect, upload.single('file'), controller.upload);
router.delete('/:id', protect, controller.remove);

export default router;
