import { Request, Response } from 'express';
import { ContactService } from '../services/contact.service';
import { asyncHandler } from '../middleware/async';

export class ContactController {
  constructor(private contactService: ContactService) {}

  send = asyncHandler(async (req: Request, res: Response) => {
    const message = await this.contactService.send(req.body);
    res.status(201).json({
      success: true,
      data: message
    });
  });

  getAllMessages = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status } = req.query;
    const result = await this.contactService.getAllMessages({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as string | undefined
    });
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

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const message = await this.contactService.updateStatus(req.params.id, req.body.status);
    res.status(200).json({
      success: true,
      data: message
    });
  });

  deleteMessage = asyncHandler(async (req: Request, res: Response) => {
    await this.contactService.deleteMessage(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.contactService.getStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  });
}
