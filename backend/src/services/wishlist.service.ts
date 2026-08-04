import { WishlistRepository } from '../repositories/wishlist.repository';
import { ProductRepository } from '../repositories/product.repository';
import { UserRepository } from '../repositories/user.repository';
import { IWishlist } from 'shared/types';
import { NotFoundException } from '../utils/exceptions';

export class WishlistService {
  constructor(
    private wishlistRepo: WishlistRepository,
    private productRepo: ProductRepository,
    private userRepo: UserRepository
  ) {}

  async getWishlistByUserId(userId: string): Promise<IWishlist> {
    let wishlist = await this.wishlistRepo.findByUserId(userId);

    if (!wishlist) {
      wishlist = await this.wishlistRepo.create({ userId, productIds: [] });
    }

    return wishlist;
  }

  async addToWishlist(userId: string, productId: string): Promise<IWishlist> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const wishlist = await this.wishlistRepo.findByUserId(userId);
    if (!wishlist) {
      return this.wishlistRepo.create({ userId, productIds: [productId as any] });
    }

    const exists = wishlist.productIds.some(id => id.toString() === productId);
    if (!exists) {
      wishlist.productIds.push(productId as any);
      return this.wishlistRepo.updateById(wishlist._id.toString(), { productIds: wishlist.productIds });
    }

    return wishlist;
  }

  async removeFromWishlist(userId: string, productId: string): Promise<IWishlist> {
    const wishlist = await this.wishlistRepo.findByUserId(userId);
    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    wishlist.productIds = wishlist.productIds.filter(id => id.toString() !== productId);
    return this.wishlistRepo.updateById(wishlist._id.toString(), { productIds: wishlist.productIds });
  }

  async clearWishlist(userId: string): Promise<boolean> {
    const wishlist = await this.wishlistRepo.findByUserId(userId);
    if (!wishlist) {
      return false;
    }

    await this.wishlistRepo.updateById(wishlist._id.toString(), { productIds: [] });
    return true;
  }

  async checkInWishlist(userId: string, productId: string): Promise<boolean> {
    return this.wishlistRepo.hasProduct(userId, productId);
  }

  async getWishlistProducts(userId: string, options: any = {}): Promise<any> {
    const wishlist = await this.getWishlistByUserId(userId);

    if (wishlist.productIds.length === 0) {
      return {
        data: [],
        total: 0,
        page: 1,
        pages: 0
      };
    }

    return this.productRepo.paginate(
      { _id: { $in: wishlist.productIds }, status: 'active' },
      options
    );
  }

  async getWishlistCount(userId: string): Promise<number> {
    const wishlist = await this.wishlistRepo.findByUserId(userId);
    return wishlist ? wishlist.productIds.length : 0;
  }
}

