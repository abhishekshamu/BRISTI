import { FAQRepository } from '../repositories/faq.repository';
import { IFAQ } from 'shared/types';

export class FAQService {
  constructor(private faqRepo: FAQRepository) {}

  async getAllFaqs(filter: any = {}, options: any = {}) {
    return this.faqRepo.paginate(filter, options);
  }

  async getFaqById(id: string, activeOnly = true) {
    const faq = await this.faqRepo.findById(id);
    if (!faq) return null;
    if (activeOnly && faq.isActive === false) return null;
    return faq;
  }

  async getFaqsByCategory(category: string) {
    // Storefront-facing: only serve active FAQs.
    return this.faqRepo.findMany({ category, isActive: true }, { sort: { sortOrder: 1 } });
  }

  async createFaq(data: Partial<IFAQ>) {
    return this.faqRepo.create(data);
  }

  async updateFaq(id: string, data: Partial<IFAQ>) {
    return this.faqRepo.updateById(id, data);
  }

  async deleteFaq(id: string) {
    return this.faqRepo.deleteById(id);
  }
}