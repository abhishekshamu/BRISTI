import { WishlistModel } from '../models/Wishlist';
import { BaseRepository } from './base.repository';
import { IWishlist } from '../../shared/types';

export class WishlistRepository extends BaseRepository<IWishlist> {
  constructor() {
    super(WishlistModel);
  }

  async findByUserId(userId: string): Promise<IWishlist | null> {
    return this.findOne({ userId });
  }

  async createOrGet(userId: string): Promise<IWishlist> {
    let wishlist = await this.findByUserId(userId);
    if (!wishlist) {
      wishlist = await this.create({ userId, productIds: [] });
    }
    return wishlist;
  }

  async addProduct(userId: string, productId: string): Promise<IWishlist> {
    const wishlist = await this.createOrGet(userId);
    if (!wishlist.productIds.some(id => id.toString() === productId)) {
      wishlist.productIds.push(productId as any);
    }
    return this.updateById(wishlist._id.toString(), { productIds: wishlist.productIds });
  }

  async removeProduct(userId: string, productId: string): Promise<IWishlist> {
    const wishlist = await this.createOrGet(userId);
    wishlist.productIds = wishlist.productIds.filter(id => id.toString() !== productId);
    return this.updateById(wishlist._id.toString(), { productIds: wishlist.productIds });
  }

  async hasProduct(userId: string, productId: string): Promise<boolean> {
    const wishlist = await this.findByUserId(userId);
    if (!wishlist) return false;
    return wishlist.productIds.some(id => id.toString() === productId);
  }

  async getProductIds(userId: string): Promise<string[]> {
    const wishlist = await this.findByUserId(userId);
    if (!wishlist) return [];
    return wishlist.productIds.map(id => id.toString());
  }
}

