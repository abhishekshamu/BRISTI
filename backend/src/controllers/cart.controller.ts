import { Request, Response } from 'express';
import { CartService } from '../services/cart.service';
import { asyncHandler } from '../middleware/async';
import { ValidationError, BadRequestException } from '../utils/exceptions';

export class CartController {
  constructor(private cartService: CartService) {}

  getCart = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] as string;
    
    let cart;
    if (userId) {
      cart = await this.cartService.getCartByUserId(userId);
    } else if (sessionId) {
      cart = await this.cartService.getCartBySessionId(sessionId);
    } else {
      // Guest user - return an empty cart (no crash, no temp product lookup)
      cart = {
        _id: null,
        items: [],
        totalItems: 0,
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        couponCode: undefined,
        couponDiscount: 0,
      };
    }
    
    res.status(200).json({
      success: true,
      data: cart
    });
  });

  addToCart = asyncHandler(async (req: Request, res: Response) => {
    const { productId, variantId, quantity, selectedOptions } = req.body;
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] as string;
    
    if (!productId || !quantity) {
      throw new ValidationError('Please provide productId and quantity');
    }
    
    try {
      const cartItem = await this.cartService.addToCart({
        userId,
        sessionId,
        productId,
        variantId,
        quantity: parseInt(quantity as string),
        selectedOptions
      });
      
      res.status(200).json({
        success: true,
        data: cartItem
      });
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to add item to cart');
    }
  });

  updateCartItem = asyncHandler(async (req: Request, res: Response) => {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] as string;
    
    if (!itemId) {
      throw new ValidationError('Please provide itemId');
    }
    
    if (quantity === undefined) {
      throw new ValidationError('Please provide quantity');
    }
    
    try {
      const updatedItem = await this.cartService.updateCartItemQuantity(
        itemId, 
        parseInt(quantity as string),
        userId,
        sessionId
      );
      
      res.status(200).json({
        success: true,
        data: updatedItem
      });
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to update cart item');
    }
  });

  removeFromCart = asyncHandler(async (req: Request, res: Response) => {
    const { itemId } = req.params;
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] as string;
    
    if (!itemId) {
      throw new ValidationError('Please provide itemId');
    }
    
    await this.cartService.removeFromCart(itemId, userId, sessionId);
    
    res.status(200).json({
      success: true,
      message: 'Item removed from cart'
    });
  });

  clearCart = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] as string;
    
    await this.cartService.clearCart(userId, sessionId);
    
    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully'
    });
  });

  applyCoupon = asyncHandler(async (req: Request, res: Response) => {
    const { couponCode } = req.body;
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] as string;
    
    if (!couponCode) {
      throw new ValidationError('Please provide coupon code');
    }
    
    try {
      const cart = await this.cartService.applyCoupon(couponCode, userId, sessionId);
      res.status(200).json({
        success: true,
        data: cart
      });
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to apply coupon');
    }
  });
}