// @ts-nocheck
import { FAQModel } from '../models/FAQ';
import { BaseRepository } from './base.repository';
import { IFAQ } from '../../shared/types';

export class FAQRepository extends BaseRepository<IFAQ> {
  constructor() {
    super(FAQModel);
  }

  async findByCategory(category: string) {
    return this.findMany({ category, isActive: true }, { sort: { sortOrder: 1 } });
  }

  async findAllActive() {
    return this.findMany({ isActive: true }, { sort: { sortOrder: 1 } });
  }
}