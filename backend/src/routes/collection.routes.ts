import { Router } from 'express';
import { CollectionController } from '../controllers/collection.controller';
import { CollectionService } from '../services/collection.service';
import { CollectionRepository } from '../repositories/collection.repository';
import { ProductRepository } from '../repositories/product.repository';
import { protect, authorize } from '../middleware/auth.middleware';
import { createCollectionValidation, updateCollectionValidation } from '../validators/collection.validators';
import { validate } from '../validators/index';

const collectionRepo = new CollectionRepository();
const collectionService = new CollectionService(collectionRepo, new ProductRepository());
const collectionController = new CollectionController(collectionService);

const router = Router();

router.get('/', collectionController.getCollections);
router.get('/featured', collectionController.getFeaturedCollections);
router.get('/current', collectionController.getCurrentCollections);
router.get('/:id', collectionController.getCollectionById);
router.get('/slug/:slug', collectionController.getCollectionBySlug);
router.get('/:collectionId/products', collectionController.getCollectionProducts);

router.post('/', protect, authorize('admin'), createCollectionValidation, validate, collectionController.createCollection);
router.put('/:id', protect, authorize('admin'), updateCollectionValidation, validate, collectionController.updateCollection);
router.delete('/:id', protect, authorize('admin'), collectionController.deleteCollection);

export default router;
