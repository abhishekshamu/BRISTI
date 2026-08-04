import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { ProductRepository } from '../repositories/product.repository';
import { IInventoryItem } from 'shared/types';
import { NotFoundException } from '../utils/exceptions';

export class InventoryService {
  constructor(
    private inventoryRepo: InventoryItemRepository,
    private productRepo: ProductRepository
  ) {}

  async getAllInventory(options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.inventoryRepo.findMany({}, { skip, limit, sort: { lastUpdated: -1 } }),
      this.inventoryRepo.count({})
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  }

  async getInventoryByProduct(productId: string) {
    return this.inventoryRepo.findByProductId(productId);
  }

  async getLowStock() {
    const all = await this.inventoryRepo.findMany({});
    return all.filter((item: any) => item.quantity <= item.reorderPoint && item.quantity > 0);
  }

  async getOutOfStock() {
    const all = await this.inventoryRepo.findMany({});
    return all.filter((item: any) => item.quantity === 0);
  }

  async updateInventory(id: string, data: Partial<IInventoryItem>) {
    const current = await this.inventoryRepo.findById(id);
    if (!current) {
      throw new NotFoundException('Inventory item not found');
    }

    const newQuantity = data.quantity as number | undefined;
    if (typeof newQuantity === 'number' && newQuantity !== current.quantity) {
      await this.inventoryRepo.adjustStock(id, newQuantity, (data as any).reason || 'Admin adjustment');
      const items = await this.inventoryRepo.findByProductId(String(current.productId));
      const total = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
      await this.productRepo.findByIdAndUpdate(current.productId, { $set: { stock: total } });
    }

    const updateData: any = {};
    if (typeof newQuantity === 'number' && newQuantity === current.quantity) {
      updateData.quantity = newQuantity;
    }
    if (typeof data.reorderPoint === 'number') updateData.reorderPoint = data.reorderPoint;
    if (typeof data.maxStockLevel === 'number') updateData.maxStockLevel = data.maxStockLevel;
    updateData.lastUpdated = new Date();

    return this.inventoryRepo.updateById(id, updateData);
  }
}