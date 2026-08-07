import { Request, Response } from 'express';
import { WishlistService } from '../services/wishlist.service';
import { asyncHandler } from '../middleware/async';
import { ValidationError } from '../utils/exceptions';

export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  getWishlist = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new ValidationError('User must be logged in to view wishlist');
    }
    
    const wishlist = await this.wishlistService.getWishlistByUserId(userId);
    
    res.status(200).json({
      success: true,
      data: wishlist
    });
  });

  addToWishlist = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      throw new ValidationError('User must be logged in to use wishlist');
    }
    
    if (!productId) {
      throw new ValidationError('Please provide productId');
    }
    
    const wishlist = await this.wishlistService.addToWishlist(userId, productId);
    
    res.status(200).json({
      success: true,
      data: wishlist
    });
  });

  removeFromWishlist = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      throw new ValidationError('User must be logged in to use wishlist');
    }
    
    if (!productId) {
      throw new ValidationError('Please provide productId');
    }
    
    const wishlist = await this.wishlistService.removeFromWishlist(userId, productId);
    
    res.status(200).json({
      success: true,
      data: wishlist
    });
  });

  checkInWishlist = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      throw new ValidationError('User must be logged in to check wishlist');
    }
    
    if (!productId) {
      throw new ValidationError('Please provide productId');
    }
    
    const isInWishlist = await this.wishlistService.checkInWishlist(userId, productId);
    
    res.status(200).json({
      success: true,
      data: { inWishlist: isInWishlist }
    });
  });

  clearWishlist = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new ValidationError('User must be logged in to clear wishlist');
    }
    
    const cleared = await this.wishlistService.clearWishlist(userId);
    
    res.status(200).json({
      success: true,
      message: cleared ? 'Wishlist cleared' : 'Wishlist already empty',
      data: cleared
    });
  });
}