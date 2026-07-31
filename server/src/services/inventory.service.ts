import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { ProductRepository } from '../repositories/product.repository';
import { IInventoryItem } from 'shared/types';

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
    return this.inventoryRepo.updateById(id, data);
  }
}