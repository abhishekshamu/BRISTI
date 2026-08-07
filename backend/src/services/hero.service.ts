import { HeroBlockModel, IHeroBlockDoc } from '../models/HeroBlock';
import { HeroBlock, HeroSlide } from 'shared/types';
import { heroBus, HERO_CHANGED } from '../events/heroBus';
import { NotFoundError } from '../utils/exceptions';

function slideIsLive(slide: HeroSlide | undefined, now: Date): boolean {
  if (!slide) return false;
  if (slide.status !== 'published' || slide.isActive === false) return false;
  if (slide.scheduledStart && new Date(slide.scheduledStart) > now) return false;
  if (slide.scheduledEnd && new Date(slide.scheduledEnd) < now) return false;
  return true;
}

function normalizeBlock(doc: any): HeroBlock {
  const now = new Date();
  if (Array.isArray(doc.slides) && doc.slides.length > 0) {
    const slides = (doc.slides as HeroSlide[]).filter((s) => slideIsLive(s, now));
    return { ...doc, slides };
  }
  if (Array.isArray(doc.panels) && doc.panels.length > 0) {
    const slides = (doc.panels as any[])
      .filter((p) => p.status === 'published' && p.isActive !== false)
      .flatMap((p) => (p.slides ?? []) as HeroSlide[])
      .filter((s) => slideIsLive(s, now));
    return { ...doc, slides };
  }
  const legacy = doc as any;
  const slide: HeroSlide = {
    image: legacy.image,
    imageMobile: legacy.imageMobile,
    video: legacy.video,
    videoMobile: legacy.videoMobile,
    eyebrow: legacy.badge,
    heading: legacy.title,
    headingColor: legacy.textColor ?? '#FFFFFF',
    showEyebrow: false,
    showCta: false,
    ctaText: legacy.primaryButton?.label,
    ctaLinkType: legacy.primaryButton?.linkType ?? 'custom',
    ctaLink: legacy.primaryButton?.link,
    description: legacy.description,
    secondaryButtonText: legacy.secondaryButton?.label,
    secondaryButtonLink: legacy.secondaryButton?.link,
    status: legacy.status ?? 'published',
    isActive: legacy.isActive ?? true,
    altText: legacy.altText,
  };
  return {
    ...doc,
    slides: slideIsLive(slide, now) ? [slide] : [],
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
      .filter((block) => block.slides.length > 0);
  }

  async getAllBlocks(filter: Record<string, unknown> = {}): Promise<IHeroBlockDoc[]> {
    return HeroBlockModel.find(filter).sort({ priority: 1, createdAt: -1 }).exec();
  }

  async getBlockById(id: string): Promise<IHeroBlockDoc> {
    const block = await HeroBlockModel.findById(id).exec();
    if (!block) throw new NotFoundError('Hero block not found');
    return block;
  }

  async createBlock(data: Partial<HeroBlock>): Promise<IHeroBlockDoc> {
    const maxPriority = await HeroBlockModel.findOne().sort({ priority: -1 }).select('priority').lean().exec();
    const block = await HeroBlockModel.create({ ...data, priority: data.priority ?? (maxPriority ? maxPriority.priority + 1 : 0) });
    heroBus.emit(HERO_CHANGED);
    return block;
  }

  async updateBlock(id: string, data: Partial<HeroBlock>): Promise<IHeroBlockDoc> {
    const updated = await HeroBlockModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
    if (!updated) throw new NotFoundError('Hero block not found');
    heroBus.emit(HERO_CHANGED);
    return updated;
  }

  async deleteBlock(id: string): Promise<void> {
    const deleted = await HeroBlockModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundError('Hero block not found');
    heroBus.emit(HERO_CHANGED);
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
    const block = await HeroBlockModel.create(doc);
    heroBus.emit(HERO_CHANGED);
    return block;
  }

  async reorderBlocks(orderedIds: string[]): Promise<void> {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await HeroBlockModel.findByIdAndUpdate(orderedIds[index], { priority: index }).exec();
    }
    heroBus.emit(HERO_CHANGED);
  }
}
