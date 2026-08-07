import { PageModel } from '../models/Page';
import { BaseRepository } from './base.repository';
import { IPage } from 'shared/types';

export class PageRepository extends BaseRepository<IPage> {
  constructor() {
    super(PageModel);
  }

  async findBySlug(slug: string): Promise<IPage | null> {
    return this.findOne({ slug });
  }

  async findBySlugAndStatus(slug: string, status: string): Promise<IPage | null> {
    return this.findOne({ slug, status });
  }

  async findForMenu(options: any = {}): Promise<IPage[]> {
    return this.findMany(
      { isInMenu: true, status: 'published' },
      { sort: { menuOrder: 1, title: 1 }, ...options }
    );
  }

  async findPublished(options: any = {}): Promise<IPage[]> {
    return this.findMany({ status: 'published' }, options);
  }

  async getPageWithContent(pageId: string): Promise<any> {
    return this.findById(pageId);
  }

  async getPageBySlugWithContent(slug: string): Promise<any> {
    return this.findOne({ slug });
  }

  async updatePageContent(pageId: string, content: any): Promise<IPage | null> {
    return this.updateById(pageId, { content });
  }

  async toggleMenuStatus(pageId: string): Promise<IPage | null> {
    const page = await this.findById(pageId);
    if (!page) return null;
    
    return this.updateById(pageId, {
      isInMenu: !page.isInMenu
    });
  }

  async updateMenuOrder(pageId: string, order: number): Promise<IPage | null> {
    return this.updateById(pageId, { menuOrder: order });
  }

  async getPagesByStatus(status: string, options: any = {}): Promise<IPage[]> {
    return this.findMany({ status }, options);
  }

  async getPageCountByStatus(): Promise<any> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).exec();
  }
}
