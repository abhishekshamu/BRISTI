// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { ICartItem } from '../../shared/types';

export interface ICartItemDoc extends Omit<ICartItem, '_id'>, Document {}

const CartItemSchema: Schema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  variantId: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  selectedOptions: {
    type: Map,
    of: String,
  },
}, {
  _id: true, // Subdocument IDs needed for item-level cart operations
});

export interface ICartDoc extends Document {
  userId?: Schema.Types.ObjectId;
  sessionId?: string;
  items: ICartItemDoc[];
  totalItems: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string;
  couponDiscount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CartSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  sessionId: {
    type: String,
  },
  items: [CartItemSchema],
  totalItems: {
    type: Number,
    default: 0,
  },
  subtotal: {
    type: Number,
    default: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  shipping: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  couponCode: {
    type: String,
  },
  couponDiscount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes
CartSchema.index({ userId: 1 }, { unique: true, sparse: true });
CartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });
CartSchema.index({ updatedAt: -1 });

// Virtual for item count
CartSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Pre-save hook to calculate totals
CartSchema.pre('save', function(next) {
  // Calculate totals from items
  const subtotal = this.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  this.subtotal = parseFloat(subtotal.toFixed(2));
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Apply coupon discount if exists
  this.total = parseFloat((this.subtotal + this.tax + this.shipping - this.discount - this.couponDiscount).toFixed(2));
  
  // Ensure total doesn't go below 0
  if (this.total < 0) {
    this.total = 0;
  }
  
  next();
});

// Method to add item to cart
CartSchema.methods.addItem = function(item: any) {
  // Check if item already exists in cart
  const existingItemIndex = this.items.findIndex(
    (cartItem: any) => 
      cartItem.productId.equals(item.productId) && 
((!cartItem.variantId && !item.variantId) || 
        (cartItem.variantId && item.variantId && String(cartItem.variantId) === String(item.variantId)))
  );
  
  if (existingItemIndex > -1) {
    // Increase quantity
    this.items[existingItemIndex].quantity += item.quantity;
  } else {
    // Add new item
    this.items.push(item);
  }
  
  return this.save();
};

// Method to remove item from cart
CartSchema.methods.removeItem = function(productId: string, variantId?: string) {
  this.items = this.items.filter(item => {
    const productMatch = item.productId.toString() === productId;
    const variantMatch = !variantId && !item.variantId || 
                         (item.variantId && variantId && item.variantId.toString() === variantId);
    return !(productMatch && variantMatch);
  });
  
  return this.save();
};

// Method to update item quantity
CartSchema.methods.updateItemQuantity = function(productId: string, quantity: number, variantId?: string) {
  const itemIndex = this.items.findIndex(item => {
    const productMatch = item.productId.toString() === productId;
    const variantMatch = !variantId && !item.variantId || 
                         (item.variantId && variantId && item.variantId.toString() === variantId);
    return productMatch && variantMatch;
  });
  
  if (itemIndex > -1) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
    }
    
    return this.save();
  }
  
  return this;
};

// Method to clear cart
CartSchema.methods.clear = function() {
  this.items = [];
  this.totalItems = 0;
  this.subtotal = 0;
  this.tax = 0;
  this.shipping = 0;
  this.discount = 0;
  this.couponCode = undefined;
  this.couponDiscount = 0;
  this.total = 0;
  
  return this.save();
};

export const CartModel = mongoose.model<ICartDoc>('Cart', CartSchema);



