// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';

export interface IWishlistDoc extends Document {
  userId: Schema.Types.ObjectId;
  productIds: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const WishlistSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  productIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
  }],
}, {
  timestamps: true,
});

// Indexes
WishlistSchema.index({ productIds: 1 });

// Virtual for product count
WishlistSchema.virtual('productCount').get(function() {
  return this.productIds.length;
});

// Method to add product to wishlist
WishlistSchema.methods.addProduct = function(productId: string) {
  if (!this.productIds.some(id => id.toString() === productId)) {
    this.productIds.push(productId);
  }
  
  return this.save();
};

// Method to remove product from wishlist
WishlistSchema.methods.removeProduct = function(productId: string) {
  this.productIds = this.productIds.filter(id => id.toString() !== productId);
  
  return this.save();
};

// Method to check if product is in wishlist
WishlistSchema.methods.hasProduct = function(productId: string): boolean {
  return this.productIds.some(id => id.toString() === productId);
};

export const WishlistModel = mongoose.model<IWishlistDoc>('Wishlist', WishlistSchema);

