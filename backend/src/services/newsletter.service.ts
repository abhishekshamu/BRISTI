import { NewsletterRepository } from '../repositories/newsletter.repository';
import { EmailService } from './email.service';
import { INewsletterSubscriber } from '../../shared/types';
import { BadRequestException, NotFoundError } from '../utils/exceptions';
import { isValidEmail } from '../../shared/utils';

export class NewsletterService {
  constructor(
    private newsletterRepo: NewsletterRepository,
    private emailService: EmailService
  ) {}

  async subscribe(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    source?: string;
    preferences?: any;
  }): Promise<INewsletterSubscriber> {
    if (!data.email) {
      throw new BadRequestException('Email is required');
    }

    if (!isValidEmail(data.email)) {
      throw new BadRequestException('Invalid email address');
    }

    const subscriber = await this.newsletterRepo.subscribe({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      source: data.source || 'homepage',
      isActive: true,
      subscribedAt: new Date()
    });

    if (subscriber.doubleOptIn && !subscriber.confirmationToken) {
      const confirmationToken = Math.random().toString(36).substring(2, 15) +
                                Math.random().toString(36).substring(2, 15);
      await this.newsletterRepo.updateById(subscriber._id.toString(), {
        confirmationToken,
        confirmationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      await this.emailService.sendNotificationEmail(
        subscriber.email,
        'Confirm your subscription',
        `Please confirm your subscription by clicking here: /newsletter/confirm/${confirmationToken}`
      );
    }

    return subscriber;
  }

  async unsubscribe(email: string): Promise<INewsletterSubscriber> {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const subscriber = await this.newsletterRepo.unsubscribe(email);
    if (!subscriber) {
      throw new NotFoundError('Subscriber not found');
    }
    return subscriber;
  }

  async confirmSubscription(token: string): Promise<{ message: string }> {
    const subscriber = await this.newsletterRepo.findOne({ confirmationToken: token });
    if (!subscriber) {
      throw new BadRequestException('Invalid or expired confirmation token');
    }

    if (subscriber.confirmationExpires && subscriber.confirmationExpires < new Date()) {
      throw new BadRequestException('Confirmation token has expired');
    }

    await this.newsletterRepo.updateById(subscriber._id.toString(), {
      confirmationToken: undefined,
      confirmationExpires: undefined
    });

    return { message: 'Subscription confirmed successfully' };
  }

  async getAllSubscribers(options: any = {}): Promise<any> {
    return this.newsletterRepo.paginate({}, options);
  }

  async getActiveSubscribers(options: any = {}): Promise<INewsletterSubscriber[]> {
    return this.newsletterRepo.findActive(options);
  }

  async getSubscriptionStats(): Promise<any> {
    return this.newsletterRepo.getSubscriptionStats();
  }

  async getGrowthStats(days: number = 30): Promise<any> {
    return this.newsletterRepo.getGrowthStats(days);
  }
}

