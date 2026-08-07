import { CartRepository } from '../repositories/cart.repository';
import { ProductRepository } from '../repositories/product.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { ICart } from 'shared/types';
import { NotFoundException, BadRequestException } from '../utils/exceptions';

export class CartService {
  constructor(
    private cartRepo: CartRepository,
    private productRepo: ProductRepository,
    private couponRepo: CouponRepository
  ) {}

  async getCart(userId?: string, sessionId?: string): Promise<ICart> {
    let cart;
    if (userId) {
      cart = await this.cartRepo.getCartByUserId(userId);
    } else if (sessionId) {
      cart = await this.cartRepo.getCartBySessionId(sessionId);
    } else {
      return this.cartRepo.create({ items: [], totalItems: 0, subtotal: 0, tax: 0, shipping: 0, discount: 0, total: 0, couponCode: undefined, couponDiscount: 0 });
    }
    return this.healCart(cart);
  }

  async getCartByUserId(userId: string): Promise<ICart> {
    return this.healCart(await this.cartRepo.getCartByUserId(userId));
  }

  async getCartBySessionId(sessionId: string): Promise<ICart> {
    return this.healCart(await this.cartRepo.getCartBySessionId(sessionId));
  }

  // Recompute totals from items so stale/legacy carts always report correct math
  private async healCart(cart: any): Promise<ICart> {
    if (!cart || (!(cart.items ?? []).length && !cart.couponCode)) {
      return cart;
    }
    const before = cart.subtotal;
    await this.recalculateCart(cart);
    if (cart.subtotal !== before) {
      cart = (await this.cartRepo.updateById((cart as any)._id.toString(), cart)) || cart;
    }
    return cart;
  }

  async addToCart(data: {
    userId?: string;
    sessionId?: string;
    productId: string;
    variantId?: string;
    quantity: number;
    selectedOptions?: Record<string, string>;
  }): Promise<ICart> {
    const { userId, sessionId, productId, variantId, quantity, selectedOptions } = data;

    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.status !== 'active') {
      throw new BadRequestException(`${product.name} is not available for purchase`);
    }

    // Variant-aware stock check
    let unitPrice = product.price;
    if (variantId) {
      const variant = product.variants?.find((v: any) => String(v.id) === String(variantId));
      if (!variant) {
        throw new BadRequestException('Variant not found');
      }
      unitPrice = product.price + (variant.priceAdjustment ?? 0);
      if (product.trackQuantity && (variant.stock ?? 0) < quantity) {
        throw new BadRequestException('Insufficient stock for this variant');
      }
    } else if (product.trackQuantity && product.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    let cart;
    if (userId) {
      cart = await this.cartRepo.getCartByUserId(userId);
    } else if (sessionId) {
      cart = await this.cartRepo.getCartBySessionId(sessionId);
    } else {
      cart = await this.cartRepo.create({ items: [], totalItems: 0, subtotal: 0, total: 0, couponDiscount: 0 });
    }

    const existingItem = cart.items.find(item =>
      item.productId.toString() === productId &&
      (!variantId || (item.variantId && item.variantId.toString() === variantId))
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.trackQuantity) {
        const available = variantId
          ? (product.variants?.find((v: any) => String(v.id) === String(variantId))?.stock ?? 0)
          : product.stock;
        if (available < newQuantity) {
          throw new BadRequestException(`Only ${available} available in stock`);
        }
      }
      existingItem.quantity = newQuantity;
      existingItem.price = unitPrice;
    } else {
      const newItem: any = {
        productId: product._id,
        quantity,
        price: unitPrice,
        name: product.name,
        image: product.images?.[0]?.url || '',
        selectedOptions: selectedOptions || {}
      };
      if (variantId) {
        newItem.variantId = variantId;
      }
      cart.items.push(newItem);
    }

    await this.recalculateCart(cart);
    cart = await this.cartRepo.updateById(cart._id.toString(), cart);
    return cart;
  }

  // Recompute cart totals from items and re-validate any applied coupon
  private async recalculateCart(cart: any): Promise<void> {
    const items = cart.items ?? [];
    const subtotal = items.reduce((sum: number, i: any) => sum + (i.price ?? 0) * (i.quantity ?? 0), 0);
    const totalItems = items.reduce((sum: number, i: any) => sum + (i.quantity ?? 0), 0);

    let discount = 0;
    let couponCode: string | undefined = undefined;
    if (cart.couponCode && subtotal > 0) {
      const coupon = await this.couponRepo.findByCode(cart.couponCode);
      if (coupon && coupon.isValid) {
        const cartItems = items.map((i: any) => ({ productId: i.productId, variantId: i.variantId }));
        const scoped = cartItems.length === 0 || (await this.couponRepo.validateScopes(coupon, cartItems)).valid;
        if (scoped) {
          discount = coupon.calculateDiscount(subtotal, cart.shipping || 0);
          couponCode = coupon.code;
        }
      }
    }

    cart.subtotal = subtotal;
    cart.totalItems = totalItems;
    cart.couponCode = couponCode;
    cart.couponDiscount = discount;
    cart.discount = discount;
    cart.total = Math.max(0, subtotal - discount) + (cart.tax || 0) + (cart.shipping || 0);
  }

  async updateCartItemQuantity(itemId: string, quantity: number, userId?: string, sessionId?: string): Promise<ICart> {
    const cart: any = await this.resolveCart(userId, sessionId);
    const updated = await this.cartRepo.updateItemQuantity(cart._id.toString(), itemId, quantity);
    if (!updated) {
      throw new NotFoundException('Cart item not found');
    }
    await this.recalculateCart(updated);
    return this.cartRepo.updateById((updated as any)._id.toString(), updated) as unknown as ICart;
  }

  async removeFromCart(itemId: string, userId?: string, sessionId?: string): Promise<ICart> {
    const cart: any = await this.resolveCart(userId, sessionId);
    const updated = await this.cartRepo.removeItem(cart._id.toString(), itemId);
    if (!updated) {
      throw new NotFoundException('Cart item not found');
    }
    await this.recalculateCart(updated);
    return this.cartRepo.updateById((updated as any)._id.toString(), updated) as unknown as ICart;
  }

  private async resolveCart(userId?: string, sessionId?: string): Promise<ICart> {
    if (userId) {
      return this.cartRepo.getCartByUserId(userId);
    }
    if (sessionId) {
      return this.cartRepo.getCartBySessionId(sessionId);
    }
    throw new BadRequestException('User or session required');
  }

  async clearCart(userId?: string, sessionId?: string): Promise<boolean> {
    if (userId) {
      return this.cartRepo.clearByUserId(userId);
    }
    if (sessionId) {
      return this.cartRepo.clearBySessionId(sessionId);
    }
    return false;
  }

  async applyCoupon(couponCode: string, userId?: string, sessionId?: string): Promise<ICart> {
    const coupon = await this.couponRepo.findByCode(couponCode);
    if (!coupon || !coupon.isValid) {
      throw new BadRequestException('Invalid or expired coupon code');
    }

    let cart;
    if (userId) {
      cart = await this.cartRepo.getCartByUserId(userId);
    } else if (sessionId) {
      cart = await this.cartRepo.getCartBySessionId(sessionId);
    } else {
      throw new BadRequestException('User or session required');
    }

    if (coupon.perCustomerLimit && userId) {
      const customerUses = (coupon.customersUsed ?? []).filter((id: any) => String(id) === String(userId)).length;
      if (customerUses >= coupon.perCustomerLimit) {
        throw new BadRequestException('You have already used this coupon');
      }
    }

    // Enforce coupon scope against cart contents
    const cartItems = (cart.items ?? []).map((i: any) => ({ productId: i.productId, variantId: i.variantId }));
    if (cartItems.length > 0) {
      const scoped = await this.couponRepo.validateScopes(coupon, cartItems);
      if (!scoped.valid) {
        throw new BadRequestException(scoped.message || 'Coupon does not apply to items in your cart');
      }
    }

    const discount = coupon.calculateDiscount(cart.subtotal || 0, cart.shipping || 0);
    cart.couponCode = coupon.code;
    cart.couponDiscount = discount;
    cart.discount = discount;
    cart.total = Math.max(0, (cart.subtotal || 0) - discount) + (cart.tax || 0) + (cart.shipping || 0);
    cart = await this.cartRepo.updateById(cart._id.toString(), cart);
    return cart;
  }
}

