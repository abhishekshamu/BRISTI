import { Request, Response } from 'express';
import { NewsletterService } from '../services/newsletter.service';
import { asyncHandler } from '../middleware/async';

export class NewsletterController {
  constructor(private newsletterService: NewsletterService) {}

  subscribe = asyncHandler(async (req: Request, res: Response) => {
    const subscriber = await this.newsletterService.subscribe(req.body);
    res.status(201).json({
      success: true,
      data: subscriber
    });
  });

  unsubscribe = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    const result = await this.newsletterService.unsubscribe(email);
    res.status(200).json({
      success: true,
      data: result
    });
  });

  confirmSubscription = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const result = await this.newsletterService.confirmSubscription(token);
    res.status(200).json({
      success: true,
      data: result
    });
  });

  getAllSubscribers = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    const result = await this.newsletterService.getAllSubscribers(options);
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    });
  });

  getSubscriptionStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.newsletterService.getSubscriptionStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  });

  getGrowthStats = asyncHandler(async (req: Request, res: Response) => {
    const { days = 30 } = req.query;
    const stats = await this.newsletterService.getGrowthStats(parseInt(days as string));
    res.status(200).json({
      success: true,
      data: stats
    });
  });
}
