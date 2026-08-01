import { HeroBlockModel, IHeroBlockDoc } from '../models/HeroBlock';
import { HeroBlock } from 'shared/types';

export class HeroService {
  async getActiveBlocks(): Promise<HeroBlock[]> {
    const now = new Date();
    return HeroBlockModel.find({
      status: 'published',
      isActive: true,
      $or: [{ scheduledStart: { $exists: false } }, { scheduledStart: { $lte: now } }],
      $and: [
        {
          $or: [{ scheduledEnd: { $exists: false } }, { scheduledEnd: { $gte: now } }],
        },
      ],
    })
      .sort({ priority: 1, createdAt: 1 })
      .lean<HeroBlock[]>();
  }

  async getAllBlocks(filter: Record<string, unknown> = {}): Promise<IHeroBlockDoc[]> {
    return HeroBlockModel.find(filter).sort({ priority: 1, createdAt: -1 }).exec();
  }

  async getBlockById(id: string): Promise<IHeroBlockDoc> {
    const block = await HeroBlockModel.findById(id).exec();
    if (!block) throw new Error('Hero block not found');
    return block;
  }

  async createBlock(data: Partial<HeroBlock>): Promise<IHeroBlockDoc> {
    const maxPriority = await HeroBlockModel.findOne().sort({ priority: -1 }).select('priority').lean().exec();
    return HeroBlockModel.create({ ...data, priority: data.priority ?? (maxPriority ? maxPriority.priority + 1 : 0) });
  }

  async updateBlock(id: string, data: Partial<HeroBlock>): Promise<IHeroBlockDoc> {
    const updated = await HeroBlockModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
    if (!updated) throw new Error('Hero block not found');
    return updated;
  }

  async deleteBlock(id: string): Promise<void> {
    const deleted = await HeroBlockModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new Error('Hero block not found');
  }

  async duplicateBlock(id: string): Promise<IHeroBlockDoc> {
    const source = await this.getBlockById(id);
    const maxPriority = await HeroBlockModel.findOne().sort({ priority: -1 }).select('priority').lean().exec();
    const doc = source.toObject();
    delete (doc as any)._id;
    delete (doc as any).__v;
    (doc as any).title = `${doc.title} (Copy)`;
    (doc as any).priority = maxPriority ? maxPriority.priority + 1 : 0;
    (doc as any).status = 'draft';
    return HeroBlockModel.create(doc);
  }

  async reorderBlocks(orderedIds: string[]): Promise<void> {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await HeroBlockModel.findByIdAndUpdate(orderedIds[index], { priority: index }).exec();
    }
  }
}
