// @ts-nocheck
import mongoose, { Schema, Document } from 'mongoose';
import { ISiteSettings } from 'shared/types';

export interface ISettingsDoc extends Omit<ISiteSettings, '_id'>, Document {}

const SettingsSchema: Schema = new Schema({
  brandName: {
    type: String,
    required: true,
    default: 'BRISTI',
  },
  logo: {
    type: String, // URL to logo image
    default: '/logo.png',
  },
  favicon: {
    type: String, // URL to favicon
    default: '/favicon.svg',
  },
  slogan: {
    type: String,
    default: 'Luxury Redefined',
  },
  colors: {
    primary: {
      type: String,
      default: '#000000',
    },
    secondary: {
      type: String,
      default: '#FFFFFF',
    },
    background: {
      type: String,
      default: '#FFFFFF',
    },
    text: {
      type: String,
      default: '#000000',
    },
    accent: {
      type: String,
      default: '#C9A227',
    },
  },
  typography: {
    headingFont: {
      type: String,
      default: 'Cormorant Garamond',
    },
    bodyFont: {
      type: String,
      default: 'Inter',
    },
    baseSize: {
      type: String,
      default: '16px',
    },
  },
  layout: {
    headerStyle: {
      type: String,
      enum: ['classic', 'modern', 'minimal', 'transparent'],
      default: 'classic',
    },
    footerStyle: {
      type: String,
      enum: ['classic', 'modern', 'minimal'],
      default: 'classic',
    },
  },
  contactInfo: {
    email: {
      type: String,
      required: true,
      default: 'hello@bristi.com',
    },
    phone: {
      type: String,
      default: '+1 (555) 123-4567',
    },
    address: {
      type: String,
      default: '123 Luxury Avenue, Fashion District, New York, NY 10001',
    },
  },
  socialLinks: [{
    platform: {
      type: String,
      enum: ['facebook', 'instagram', 'twitter', 'pinterest', 'tiktok', 'youtube', 'linkedin'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
    },
  }],
  policies: {
    privacy: {
      type: String,
      default: '/privacy',
    },
    terms: {
      type: String,
      default: '/terms',
    },
    refund: {
      type: String,
      default: '/refund',
    },
    shipping: {
      type: String,
      default: '/shipping',
    },
  },
  seo: {
    defaultTitle: {
      type: String,
      default: 'BRISTI - Luxury Clothing Brand',
    },
    defaultDescription: {
      type: String,
      default: 'Discover timeless elegance and modern sophistication with BRISTI luxury clothing.',
    },
    defaultImage: {
      type: String,
      default: '/og-image.jpg',
    },
  },
  currency: {
    type: String,
    default: 'USD',
  },
  taxRate: {
    type: Number,
    default: 0.1, // 10%
    min: 0,
    max: 1,
  },
  freeShippingThreshold: {
    type: Number,
    default: 100, // $100
    min: 0,
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  maintenanceMessage: {
    type: String,
    default: 'We are currently undergoing maintenance. Please check back soon.',
  },
  announcement: {
    enabled: {
      type: Boolean,
      default: true,
    },
    messages: [{
      type: String,
    }],
  },
  orderSettings: {
    orderNumberPrefix: {
      type: String,
      default: 'BRS',
    },
    orderNumberLength: {
      type: Number,
      default: 8,
    },
    allowGuestCheckout: {
      type: Boolean,
      default: true,
    },
    requirePhoneForShipping: {
      type: Boolean,
      default: true,
    },
    autoFulfillDigital: {
      type: Boolean,
      default: true,
    },
  },
  emailSettings: {
    fromName: {
      type: String,
      default: 'BRISTI',
    },
    fromEmail: {
      type: String,
      default: 'hello@bristi.com',
    },
    replyTo: {
      type: String,
      default: 'hello@bristi.com',
    },
    smtpHost: {
      type: String,
    },
    smtpPort: {
      type: Number,
    },
    smtpUser: {
      type: String,
    },
    smtpPass: {
      type: String,
    },
    sendgridApiKey: {
      type: String,
    },
    mailgunApiKey: {
      type: String,
    },
    mailgunDomain: {
      type: String,
    },
  },
  securitySettings: {
    rateLimitApi: {
      type: Number,
      default: 100,
    },
    rateLimitAuth: {
      type: Number,
      default: 5,
    },
    passwordMinLength: {
      type: Number,
      default: 8,
    },
    requirePasswordComplexity: {
      type: Boolean,
      default: true,
    },
    sessionTimeout: {
      type: Number,
      default: 30,
    },
    requireEmailVerification: {
      type: Boolean,
      default: true,
    },
  },
  navbar: {
    items: [{
      label: String,
      url: String,
      sortOrder: Number,
      isActive: { type: Boolean, default: true },
    }],
  },
  footer: {
    sections: [{
      type: String,
      title: String,
      content: String,
      links: [{
        label: String,
        url: String,
      }],
      sortOrder: Number,
      isActive: { type: Boolean, default: true },
    }],
  },
  homepageSections: [{
    type: Schema.Types.Mixed,
    props: { type: Schema.Types.Mixed },
    sortOrder: Number,
    isActive: { type: Boolean, default: true },
  }],
}, {
  timestamps: true,
});

// Indexes
SettingsSchema.index({ updatedAt: -1 });

// Ensure only one settings document exists
SettingsSchema.statics.findOneOrCreate = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export const SettingsModel = mongoose.model<ISettingsDoc>('Settings', SettingsSchema);



