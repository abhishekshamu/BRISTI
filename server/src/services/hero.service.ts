import { HeroBlockModel, IHeroBlockDoc } from '../models/HeroBlock';
import { HeroBlock, HeroPanel, HeroSlide } from 'shared/types';

function slideIsLive(slide: HeroSlide | undefined, now: Date): boolean {
  if (!slide) return false;
  if (slide.status !== 'published' || slide.isActive === false) return false;
  if (slide.scheduledStart && new Date(slide.scheduledStart) > now) return false;
  if (slide.scheduledEnd && new Date(slide.scheduledEnd) < now) return false;
  return true;
}

function normalizePanel(panel: HeroPanel | undefined, now: Date): HeroPanel | null {
  if (!panel) return null;
  if (panel.status !== 'published' || panel.isActive === false) return null;
  const slides = (panel.slides ?? []).filter((s) => slideIsLive(s, now));
  if (slides.length === 0) return null;
  return { ...panel, slides };
}

function normalizeBlock(doc: any): HeroBlock {
  const now = new Date();
  if (Array.isArray(doc.panels) && doc.panels.length > 0) {
    const panels = (doc.panels as HeroPanel[]).map((p) => normalizePanel(p, now)).filter((p): p is HeroPanel => p !== null);
    return { ...doc, panels };
  }
  const legacy = doc as any;
  const slide: HeroSlide = {
    image: legacy.image,
    imageMobile: legacy.imageMobile,
    video: legacy.video,
    videoMobile: legacy.videoMobile,
    eyebrow: legacy.badge,
    heading: legacy.title,
    ctaText: legacy.primaryButton?.label,
    ctaLinkType: legacy.primaryButton?.linkType ?? 'custom',
    ctaLink: legacy.primaryButton?.link,
    status: legacy.status ?? 'published',
    isActive: legacy.isActive ?? true,
    altText: legacy.altText,
  };
  const panel: HeroPanel = {
    label: legacy.title,
    slides: slideIsLive(slide, now) ? [slide] : [],
    status: legacy.status ?? 'published',
    isActive: legacy.isActive ?? true,
  };
  return {
    ...doc,
    panels: panel.slides.length ? [panel] : [],
  };
}

export class HeroService {
  async getActiveBlocks(): Promise<HeroBlock[]> {
    const now = new Date();
    const docs = await HeroBlockModel.find({
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
      .lean<IHeroBlockDoc[]>();
    return docs
      .map(normalizeBlock)
      .filter((block) => block.panels.length > 0);
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
    (doc as any).name = `${doc.name ?? doc.title ?? 'Hero set'} (Copy)`;
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
