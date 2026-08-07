// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { IReview } from 'shared/types';

export interface IReviewDoc extends Omit<IReview, '_id'>, Document {}

const ReviewSchema: Schema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  comment: {
    type: String,
    required: true,
  },
  images: [{
    type: String, // URL to image
  }],
  verifiedPurchase: {
    type: Boolean,
    default: false,
  },
  helpfulVotes: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  // For tracking helpful/unhelpful votes
  helpfulBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  notHelpfulBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

// Indexes
ReviewSchema.index({ productId: 1 });
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ status: 1 });
ReviewSchema.index({ createdAt: -1 });
ReviewSchema.index({ rating: -1 });

// Virtual for helpfulness percentage
ReviewSchema.virtual('helpfulnessPercentage').get(function() {
  const totalVotes = this.helpfulBy.length + this.notHelpfulBy.length;
  if (totalVotes === 0) return 0;
  return Math.round((this.helpfulBy.length / totalVotes) * 100);
});

// Pre-save hook to set userName from user if not provided
ReviewSchema.pre('save', function(next) {
  if (this.isNew && this.userId && !this.userName) {
    // In a real app, we'd populate the user to get their name
    // For now, we'll leave it as is and expect it to be set
  }
  
  next();
});

// Static method to update product rating
ReviewSchema.statics.updateProductRating = async function(productId: string) {
  const Review = mongoose.model('Review');
  
  const stats = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId), status: 'approved' } },
    {
      $group: {
        _id: '$productId',
        averageRating: { $avg: '$rating' },
        ratingCount: { $sum: 1 }
      }
    }
  ]);
  
  const Product = mongoose.model('Product');
  if (stats.length > 0) {
    await Product.updateOne(
      { _id: new mongoose.Types.ObjectId(productId) },
      {
        'rating.average': parseFloat(stats[0].averageRating.toFixed(1)),
        'rating.count': stats[0].ratingCount
      }
    );
  } else {
    await Product.updateOne(
      { _id: new mongoose.Types.ObjectId(productId) },
      {
        'rating.average': 0,
        'rating.count': 0
      }
    );
  }
};

// Post-save hook to update product rating
ReviewSchema.post('save', async function() {
  await this.constructor.updateProductRating(this.productId.toString());
});

// Post-remove hook to update product rating
ReviewSchema.post('remove', async function() {
  await this.constructor.updateProductRating(this.productId.toString());
});

export const ReviewModel = mongoose.model<IReviewDoc>('Review', ReviewSchema);



