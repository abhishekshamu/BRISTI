import { PageRepository } from '../repositories/page.repository';
import { IPage } from 'shared/types';
import { NotFoundError, BadRequestException } from '../utils/exceptions';
import { slugify } from 'shared/utils';
import { normalizeSeo } from '../utils/seo';
import { sanitizeRichText } from '../utils/sanitize';

export class PageService {
  constructor(private pageRepo: PageRepository) {}

  async createPage(data: Partial<IPage>): Promise<IPage> {
    data = normalizeSeo(data);
    if (data.content && typeof data.content === 'string') data.content = sanitizeRichText(data.content);
    if (!data.title) {
      throw new BadRequestException('Title is required');
    }

    if (!data.slug) {
      data.slug = slugify(data.title);
    }

    const existing = await this.pageRepo.findBySlug(data.slug);
    if (existing) {
      throw new BadRequestException('Page with this slug already exists');
    }

    return this.pageRepo.create(data);
  }

  async getPageById(id: string): Promise<IPage> {
    const page = await this.pageRepo.findById(id);
    if (!page) {
      throw new NotFoundError('Page not found');
    }
    return page;
  }

  async getPageBySlug(slug: string): Promise<IPage> {
    const page = await this.pageRepo.findBySlug(slug);
    if (!page) {
      throw new NotFoundError('Page not found');
    }
    return page;
  }

  async getPageBySlugAndStatus(slug: string, status: string): Promise<IPage> {
    const page = await this.pageRepo.findBySlugAndStatus(slug, status);
    if (!page) {
      throw new NotFoundError('Page not found');
    }
    return page;
  }

  async updatePage(id: string, updateData: Partial<IPage>): Promise<IPage> {
    updateData = normalizeSeo(updateData);
    if (updateData.content && typeof updateData.content === 'string') updateData.content = sanitizeRichText(updateData.content);
    if (updateData.title && !updateData.slug) {
      updateData.slug = slugify(updateData.title);
    }

    const updated = await this.pageRepo.updateById(id, updateData);
    if (!updated) {
      throw new NotFoundError('Page not found');
    }
    return updated;
  }

  async deletePage(id: string): Promise<boolean> {
    const page = await this.pageRepo.findById(id);
    if (!page) {
      throw new NotFoundError('Page not found');
    }
    return this.pageRepo.deleteById(id);
  }

  async getAllPages(filter: any = {}, options: any = {}): Promise<any> {
    return this.pageRepo.paginate(filter, options);
  }

  async getPublishedPages(options: any = {}): Promise<IPage[]> {
    return this.pageRepo.findPublished(options);
  }

  async getMenuPages(): Promise<IPage[]> {
    return this.pageRepo.findForMenu();
  }

  async getPagesByStatus(status: string, options: any = {}): Promise<IPage[]> {
    return this.pageRepo.getPagesByStatus(status, options);
  }

  async updateBuilder(id: string, sections: any[]): Promise<IPage> {
    const updated = await this.pageRepo.updateById(id, { builderSections: sections });
    if (!updated) {
      throw new NotFoundError('Page not found');
    }
    return updated;
  }
}

