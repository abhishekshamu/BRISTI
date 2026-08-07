import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { asyncHandler } from '../middleware/async';

export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  trackEvent = asyncHandler(async (req: Request, res: Response) => {
    const { userId: _ignored, ...safeBody } = req.body;
    const event = await this.analyticsService.createEvent({
      ...safeBody,
      sessionId: req.body.sessionId || req.headers['x-session-id'],
      url: req.body.url || req.originalUrl,
      userAgent: req.headers['user-agent'],
      // Identity comes from the authenticated principal only; a spoofed
      // body userId is never trusted.
      userId: req.user?.id
    });
    res.status(201).json({
      success: true,
      data: event
    });
  });

  getEventsByEventName = asyncHandler(async (req: Request, res: Response) => {
    const { eventName } = req.params;
    const events = await this.analyticsService.getEventsByEventName(eventName);
    res.status(200).json({
      success: true,
      data: events
    });
  });

  getEventsByUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const events = await this.analyticsService.getEventsByUser(userId);
    res.status(200).json({
      success: true,
      data: events
    });
  });

  getEventsBySession = asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const events = await this.analyticsService.getEventsBySession(sessionId);
    res.status(200).json({
      success: true,
      data: events
    });
  });

  getAllEvents = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 50 } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    const result = await this.analyticsService.getAllEvents(options);
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

  getEventStats = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const stats = await this.analyticsService.getEventStats(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.status(200).json({
      success: true,
      data: stats
    });
  });

  getPageViews = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const views = await this.analyticsService.getPageViews(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.status(200).json({
      success: true,
      data: views
    });
  });
}
