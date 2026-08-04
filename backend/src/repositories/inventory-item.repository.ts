// @ts-nocheck
import { InventoryItemModel } from '../models/InventoryItem';
import { BaseRepository } from './base.repository';
import { IInventoryItem } from 'shared/types';

export class InventoryItemRepository extends BaseRepository<IInventoryItem> {
  constructor() {
    super(InventoryItemModel);
  }

  async findByProductId(productId: string): Promise<IInventoryItem[]> {
    return this.findMany({ productId });
  }

  async findByProductAndVariant(productId: string, variantId?: string): Promise<IInventoryItem | null> {
    const filter: any = { productId };
    if (variantId) {
      filter.variantId = variantId;
    }
    return this.findOne(filter);
  }

  async upsertByProduct(product: any, session?: any): Promise<IInventoryItem> {
    const totalStock = product.variants && product.variants.length > 0
      ? product.variants.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0)
      : product.stock;

    const existing = await this.findOne({ productId: product._id });
    if (existing) {
      return this.updateById(existing._id.toString(), {
        sku: product.sku,
        quantity: Math.max(0, totalStock),
        reserved: Math.min(existing.reserved ?? 0, totalStock),
        reorderPoint: product.lowStockThreshold ?? 5,
        cost: product.costPrice ?? existing.cost,
        lastUpdated: new Date(),
      }, session);
    }

    return this.create({
      productId: product._id,
      sku: product.sku,
      quantity: Math.max(0, totalStock),
      reserved: 0,
      reorderPoint: product.lowStockThreshold ?? 5,
      cost: product.costPrice,
      location: { warehouse: 'Main' },
      lastUpdated: new Date(),
    } as any, session);
  }

  async applyOrderItem(productId: string, variantId: string | undefined, quantity: number, orderId: string, session?: any): Promise<IInventoryItem | null> {
    const item = await this.findOne({ productId, variantId: variantId ?? null });
    if (!item) return null;

    const newQuantity = Math.max(0, (item.quantity ?? 0) - quantity);
    const newReserved = Math.max(0, (item.reserved ?? 0) + quantity);

    return this.updateById(item._id.toString(), {
      quantity: newQuantity,
      reserved: Math.min(newReserved, newQuantity),
      lastUpdated: new Date(),
      $push: {
        history: {
          type: 'order',
          quantity: -quantity,
          reason: 'Stock deducted by order',
          orderId,
          date: new Date(),
        },
      },
    }, session);
  }

  async setHistoryOrderId(productId: string, variantId: string | undefined, orderId: string, session?: any): Promise<void> {
    await this.updateMany(
      { productId, variantId: variantId ?? null, 'history.orderId': null },
      { $set: { 'history.$[].orderId': orderId } },
      session
    );
  }

  async restoreOrderItem(productId: string, variantId: string | undefined, quantity: number, orderId: string, reason: string, session?: any): Promise<IInventoryItem | null> {
    const item = await this.findOne({ productId, variantId: variantId ?? null });
    if (!item) return null;

    const newQuantity = (item.quantity ?? 0) + quantity;
    const newReserved = Math.max(0, (item.reserved ?? 0) - quantity);

    return this.updateById(item._id.toString(), {
      quantity: newQuantity,
      reserved: newReserved,
      lastUpdated: new Date(),
      $push: {
        history: {
          type: reason === 'refund' ? 'refund' : 'cancel',
          quantity,
          reason: reason === 'refund' ? 'Stock restored by refund' : 'Stock restored by order cancellation',
          orderId,
          date: new Date(),
        },
      },
    }, session);
  }

  async adjustStock(id: string, quantity: number, reason: string, session?: any): Promise<IInventoryItem | null> {
    const item = await this.findById(id);
    if (!item) return null;

    const oldQuantity = item.quantity ?? 0;
    const newQuantity = Math.max(0, quantity);

    return this.updateById(id, {
      quantity: newQuantity,
      reserved: Math.min(item.reserved ?? 0, newQuantity),
      lastUpdated: new Date(),
      $push: {
        history: {
          type: 'adjustment',
          quantity: newQuantity - oldQuantity,
          reason,
          date: new Date(),
        },
      },
    }, session);
  }

  async updateStock(productId: string, variantId: string | undefined, quantityChange: number, type: 'add' | 'subtract'): Promise<IInventoryItem | null> {
    const item = await this.findByProductAndVariant(productId, variantId);
    if (!item) {
      return null;
    }

    const newQuantity = type === 'add'
      ? item.quantity + quantityChange
      : item.quantity - quantityChange;

    return this.updateById(item._id.toString(), {
      quantity: Math.max(0, newQuantity),
      lastUpdated: new Date(),
    });
  }
}
