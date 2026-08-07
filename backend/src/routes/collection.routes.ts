import { Router } from 'express';
import { CollectionController } from '../controllers/collection.controller';
import { CollectionService } from '../services/collection.service';
import { CollectionRepository } from '../repositories/collection.repository';
import { ProductRepository } from '../repositories/product.repository';
import { protect, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createCollectionValidation, updateCollectionValidation } from '../validators/collection.validators';
import { validate } from '../validators/index';

const collectionRepo = new CollectionRepository();
const collectionService = new CollectionService(collectionRepo, new ProductRepository());
const collectionController = new CollectionController(collectionService);

const router = Router();

router.get('/', collectionController.getCollections);
router.get('/featured', collectionController.getFeaturedCollections);
router.get('/current', collectionController.getCurrentCollections);
router.get('/slug/:slug/products', collectionController.getCollectionProductsBySlug);
router.get('/slug/:slug', collectionController.getCollectionBySlug);
router.get('/:id', collectionController.getCollectionById);
router.get('/:collectionId/products', collectionController.getCollectionProducts);

router.post('/', protect, authorize('admin'), auditLog('collection', 'create'), createCollectionValidation, validate, collectionController.createCollection);
router.put('/:id', protect, authorize('admin'), auditLog('collection', 'update'), updateCollectionValidation, validate, collectionController.updateCollection);
router.delete('/:id', protect, authorize('admin'), auditLog('collection', 'delete'), collectionController.deleteCollection);

export default router;
