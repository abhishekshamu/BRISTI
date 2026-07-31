import { CartModel } from '../models/Cart';
import { BaseRepository } from './base.repository';
import { ICart } from 'shared/types';

export class CartRepository extends BaseRepository<ICart> {
  constructor() {
    super(CartModel);
  }

  async getCartByUserId(userId: string): Promise<ICart> {
    let cart = await this.findOne({ userId });
    if (!cart) {
      cart = await this.create({ userId });
    }
    return cart;
  }

  async getCartBySessionId(sessionId: string): Promise<ICart> {
    let cart = await this.findOne({ sessionId });
    if (!cart) {
      cart = await this.create({ sessionId });
    }
    return cart;
  }

  async clearByUserId(userId: string, session?: any): Promise<boolean> {
    return this.deleteMany({ userId }, session);
  }

  async clearBySessionId(sessionId: string): Promise<boolean> {
    return this.deleteMany({ sessionId });
  }

  async updateItemQuantity(itemId: string, quantity: number): Promise<ICart | null> {
    if (quantity <= 0) {
      return this.findOneAndUpdate(
        { 'items._id': itemId },
        { $pull: { items: { _id: itemId } } }
      );
    }
    return this.findOneAndUpdate(
      { 'items._id': itemId },
      { $set: { 'items.$.quantity': quantity } }
    );
  }

  async removeItem(itemId: string): Promise<ICart | null> {
    return this.findOneAndUpdate(
      { 'items._id': itemId },
      { $pull: { items: { _id: itemId } } }
    );
  }
}
