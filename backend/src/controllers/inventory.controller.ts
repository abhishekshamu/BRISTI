import { Request, Response } from 'express';
import { InventoryService } from '../services/inventory.service';
import { asyncHandler } from '../middleware/async';

export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  getAllInventory = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const result = await this.inventoryService.getAllInventory({
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
    res.status(200).json({ success: true, data: result.data, pagination: result });
  });

  getInventoryByProduct = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const inventory = await this.inventoryService.getInventoryByProduct(productId);
    res.status(200).json({ success: true, data: inventory });
  });

  getLowStock = asyncHandler(async (req: Request, res: Response) => {
    const inventory = await this.inventoryService.getLowStock();
    res.status(200).json({ success: true, data: inventory });
  });

  getOutOfStock = asyncHandler(async (req: Request, res: Response) => {
    const inventory = await this.inventoryService.getOutOfStock();
    res.status(200).json({ success: true, data: inventory });
  });

  updateInventory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const inventory = await this.inventoryService.updateInventory(id, req.body);
    res.status(200).json({ success: true, data: inventory });
  });

  transferInventory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const inventory = await this.inventoryService.transfer(id, req.body);
    res.status(200).json({ success: true, data: inventory });
  });
}