import { FAQRepository } from '../repositories/faq.repository';
import { IFAQ } from 'shared/types';

export class FAQService {
  constructor(private faqRepo: FAQRepository) {}

  async getAllFaqs(options: any = {}) {
    return this.faqRepo.paginate({}, options);
  }

  async getFaqById(id: string) {
    return this.faqRepo.findById(id);
  }

  async getFaqsByCategory(category: string) {
    return this.faqRepo.findByCategory(category);
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