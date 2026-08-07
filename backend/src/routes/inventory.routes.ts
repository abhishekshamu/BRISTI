import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { InventoryService } from '../services/inventory.service';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { ProductRepository } from '../repositories/product.repository';
import { protect, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { updateInventoryValidation, transferInventoryValidation } from '../validators/inventory.validators';
import { validate } from '../validators/index';

const inventoryRepo = new InventoryItemRepository();
const productRepo = new ProductRepository();
const inventoryService = new InventoryService(inventoryRepo, productRepo);
const inventoryController = new InventoryController(inventoryService);

const router = Router();

router.get('/', protect, authorize('admin'), inventoryController.getAllInventory);
router.get('/product/:productId', protect, authorize('admin'), inventoryController.getInventoryByProduct);
router.get('/low-stock', protect, authorize('admin'), inventoryController.getLowStock);
router.get('/out-of-stock', protect, authorize('admin'), inventoryController.getOutOfStock);
router.put('/:id', protect, authorize('admin'), auditLog('inventory', 'update'), updateInventoryValidation, validate, inventoryController.updateInventory);
router.put('/:id/transfer', protect, authorize('admin'), auditLog('inventory', 'transfer'), transferInventoryValidation, validate, inventoryController.transferInventory);

export default router;