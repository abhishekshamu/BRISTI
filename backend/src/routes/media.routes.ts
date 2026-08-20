import { Router } from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { MediaRepository } from '../repositories/media.repository';
import { MediaService } from '../services/media.service';
import { MediaController } from '../controllers/media.controller';

const ALLOWED_UPLOAD_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml',
  'image/gif', 'image/avif', 'image/bmp', 'image/tiff', 'image/heic', 'image/heif',
  'video/mp4', 'video/webm',
]);

// Boundary-level filtering: multer rejects non-allowed MIME types before the
// controller runs; the media service still re-validates content/extension.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_UPLOAD_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error(`Unsupported file type: ${file.mimetype}`) as Error & { statusCode: number };
      err.statusCode = 400;
      cb(err);
    }
  },
});
const mediaRepo = new MediaRepository();
const mediaService = new MediaService(mediaRepo);
const controller = new MediaController(mediaService);
const router = Router();

// Order matters: static/bulk paths must be registered before '/:id'.
router.post('/verify-url', protect, authorize('admin'), controller.verifyUrl);
router.post('/verify', protect, authorize('admin'), controller.verifyBatch);
router.get('/folders', protect, authorize('admin'), controller.listFolders);
router.post('/bulk-delete', protect, authorize('admin'), auditLog('media', 'delete'), controller.bulkDelete);
router.post('/bulk-move', protect, authorize('admin'), auditLog('media', 'update'), controller.bulkMove);

router.get('/', protect, authorize('admin'), controller.list);
router.get('/:id', protect, authorize('admin'), controller.get);
router.get('/:id/usage', protect, authorize('admin'), controller.usage);
router.patch('/:id', protect, authorize('admin'), auditLog('media', 'update'), controller.update);
router.post('/:id/fit', protect, authorize('admin'), auditLog('media', 'update'), controller.fit);
router.post('/:id/crop', protect, authorize('admin'), auditLog('media', 'update'), controller.crop);
router.post('/:id/replace', protect, authorize('admin'), auditLog('media', 'update'), upload.any(), controller.replace);
router.post('/:id/reprocess', protect, authorize('admin'), auditLog('media', 'update'), controller.reprocess);
router.post('/:id/restore-version', protect, authorize('admin'), auditLog('media', 'update'), controller.restoreVersion);
router.post('/:id/replace-everywhere', protect, authorize('admin'), auditLog('media', 'update'), controller.replaceEverywhere);
router.post('/', protect, authorize('admin'), auditLog('media', 'create'), upload.any(), controller.upload);
router.delete('/:id', protect, authorize('admin'), auditLog('media', 'delete'), controller.remove);

export default router;
