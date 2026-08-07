import mongoose from 'mongoose';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { ProductRepository } from '../repositories/product.repository';
import { IInventoryItem } from 'shared/types';
import { NotFoundException, BadRequestException } from '../utils/exceptions';

interface TransferPayload {
  quantity: number;
  targetWarehouse: string;
  note?: string;
}

export class InventoryService {
  constructor(
    private inventoryRepo: InventoryItemRepository,
    private productRepo: ProductRepository
  ) {}

  async getAllInventory(options: { page: number; limit: number }) {
    const { page, limit } = options;

    // Populate `productId` so the admin inventory list can render product
    // names/skus instead of "Unknown Product".
    return this.inventoryRepo.paginate({}, {
      page,
      limit,
      sort: { lastUpdated: -1 },
      populate: 'productId',
    });
  }

  async getInventoryByProduct(productId: string) {
    if (!mongoose.isValidObjectId(productId)) {
      throw new BadRequestException('Invalid product ID');
    }
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
    if (!mongoose.isValidObjectId(id)) {
      throw new BadRequestException('Invalid inventory item ID');
    }
    const current = await this.inventoryRepo.findById(id);
    if (!current) {
      throw new NotFoundException('Inventory item not found');
    }

    const newQuantity = data.quantity as number | undefined;
    const reason = (data as any).reason || 'Admin adjustment';

    if (typeof newQuantity === 'number' && newQuantity !== current.quantity) {
      await this.inventoryRepo.adjustStock(id, newQuantity, reason);
      await this.syncProductStock(current);
    }

    const updateData: any = {
      lastUpdated: new Date(),
    };
    if (typeof data.reorderPoint === 'number') updateData.reorderPoint = data.reorderPoint;
    if (typeof data.maxStockLevel === 'number') updateData.maxStockLevel = data.maxStockLevel;

    return this.inventoryRepo.updateById(id, updateData);
  }

  /**
   * Transfer stock between warehouses: reduces `quantity` on the source item
   * and records an outgoing transaction; increases the target item's quantity
   * (creating it if needed) and records an incoming transaction.
   */
  async transfer(id: string, payload: TransferPayload) {
    if (!mongoose.isValidObjectId(id)) {
      throw new BadRequestException('Invalid inventory item ID');
    }
    const { quantity, targetWarehouse, note } = payload;
    if (!targetWarehouse || !targetWarehouse.trim()) {
      throw new BadRequestException('Target warehouse is required');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Transfer quantity must be a positive integer');
    }

    const source = await this.inventoryRepo.findById(id);
    if (!source) {
      throw new NotFoundException('Inventory item not found');
    }
    const warehouse = this.warehouseOf(source);
    if (warehouse.toLowerCase() === targetWarehouse.trim().toLowerCase()) {
      throw new BadRequestException('Source and target warehouse are the same');
    }
    if ((source.quantity ?? 0) < quantity) {
      throw new BadRequestException(
        `Insufficient stock to transfer: ${source.quantity} available in ${warehouse}`
      );
    }

    const sourceWarehouse = warehouse;
    const target = await this.inventoryRepo.findOne({ productId: source.productId, 'location.warehouse': targetWarehouse.trim() });
    const reason = note?.trim() || `Transferred from ${sourceWarehouse} to ${targetWarehouse.trim()}`;

    if (target) {
      await this.inventoryRepo.updateById(target._id.toString(), {
        quantity: (target.quantity ?? 0) + quantity,
        lastUpdated: new Date(),
        $push: {
          history: {
            type: 'restock',
            quantity,
            reason: `Incoming transfer from ${sourceWarehouse}`,
            date: new Date(),
          },
        },
      });
    } else {
      await this.inventoryRepo.create({
        productId: source.productId,
        variantId: (source as any).variantId,
        sku: `${source.sku}-${targetWarehouse.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
        quantity,
        reserved: 0,
        location: { warehouse: targetWarehouse.trim() },
        reorderPoint: source.reorderPoint,
        cost: source.cost,
        history: [{
          type: 'restock',
          quantity,
          reason: `Incoming transfer from ${sourceWarehouse}`,
          date: new Date(),
        }],
        lastUpdated: new Date(),
      } as any);
    }

    await this.inventoryRepo.updateById(id, {
      quantity: (source.quantity ?? 0) - quantity,
      reserved: Math.min(source.reserved ?? 0, Math.max(0, (source.quantity ?? 0) - quantity)),
      lastUpdated: new Date(),
      $push: {
        history: {
          type: 'order',
          quantity: -quantity,
          reason,
          date: new Date(),
        },
      },
    });

    await this.syncProductStock(source);

    return this.inventoryRepo.findById(id);
  }

  private warehouseOf(item: any): string {
    const location = item?.location;
    if (location && typeof location === 'object' && typeof location.warehouse === 'string') {
      return location.warehouse;
    }
    return 'Main';
  }

  private async syncProductStock(current: any) {
    if (!mongoose.isValidObjectId(String(current.productId))) return;
    const items = await this.inventoryRepo.findByProductId(String(current.productId));
    const total = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
    await this.productRepo.findByIdAndUpdate(current.productId, { $set: { stock: total } });
  }
}
