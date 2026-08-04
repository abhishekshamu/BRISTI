import { Request, Response } from 'express';
import { FAQService } from '../services/faq.service';
import { asyncHandler } from '../middleware/async';

export class FAQController {
  constructor(private faqService: FAQService) {}

  getFaqs = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, category } = req.query;
    let result;
    if (category) {
      const data = await this.faqService.getFaqsByCategory(category as string);
      result = { data, total: data.length, page: 1, limit: data.length, pages: 1 };
    } else {
      result = await this.faqService.getAllFaqs({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sort: { sortOrder: 1 }
      });
    }
    res.status(200).json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, pages: result.pages } });
  });

  getFaqById = asyncHandler(async (req: Request, res: Response) => {
    const faq = await this.faqService.getFaqById(req.params.id);
    res.status(200).json({ success: true, data: faq });
  });

  createFaq = asyncHandler(async (req: Request, res: Response) => {
    const faq = await this.faqService.createFaq(req.body);
    res.status(201).json({ success: true, data: faq });
  });

  updateFaq = asyncHandler(async (req: Request, res: Response) => {
    const faq = await this.faqService.updateFaq(req.params.id, req.body);
    res.status(200).json({ success: true, data: faq });
  });

  deleteFaq = asyncHandler(async (req: Request, res: Response) => {
    await this.faqService.deleteFaq(req.params.id);
    res.status(200).json({ success: true, message: 'FAQ deleted successfully' });
  });
}