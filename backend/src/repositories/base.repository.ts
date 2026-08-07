import { Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

function stripUndefined(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export abstract class BaseRepository<T> {
  constructor(protected model: Model<any>) {}

  async create(data: Partial<T>, session?: any): Promise<T> {
    const doc = new this.model(data);
    return (await doc.save({ session })) as T;
  }

  async findById(id: string, session?: any): Promise<T | null> {
    return (await this.model.findById(id).session(session ?? null).exec()) as T | null;
  }

  async findOne(filter: FilterQuery<T>, session?: any): Promise<T | null> {
    return (await this.model.findOne(stripUndefined(filter)).session(session ?? null).exec()) as T | null;
  }

  async findMany(
    filter: FilterQuery<T> = {},
    options: QueryOptions = {},
    session?: any
  ): Promise<T[]> {
    return (await this.model.find(stripUndefined(filter), {}, { ...options, session }).exec()) as T[];
  }

  async updateById(id: string, data: UpdateQuery<T>, session?: any): Promise<T | null> {
    return (await this.model.findByIdAndUpdate(id, data, { new: true }).session(session ?? null).exec()) as T | null;
  }

  async findByIdAndUpdate(id: string, data: UpdateQuery<T>, options: any = { new: true }, session?: any): Promise<T | null> {
    return (await this.model.findByIdAndUpdate(id, data, options).session(session ?? null).exec()) as T | null;
  }

  async updateOne(filter: FilterQuery<T>, data: UpdateQuery<T>, session?: any): Promise<T | null> {
    return (await this.model.findOneAndUpdate(filter, data, { new: true }).session(session ?? null).exec()) as T | null;
  }

  async updateMany(filter: FilterQuery<T>, data: UpdateQuery<T>, session?: any): Promise<any> {
    return this.model.updateMany(filter, data).session(session ?? null).exec();
  }

  async deleteById(id: string, session?: any): Promise<boolean> {
    const result = await this.model.deleteOne({ _id: id }).session(session ?? null);
    return result.deletedCount > 0;
  }

  async deleteOne(filter: FilterQuery<T>, session?: any): Promise<boolean> {
    const result = await this.model.deleteOne(filter).session(session ?? null);
    return result.deletedCount > 0;
  }

  async deleteMany(filter: FilterQuery<T>, session?: any): Promise<boolean> {
    const result = await this.model.deleteMany(filter).session(session ?? null);
    return result.deletedCount > 0;
  }

  async findOneAndUpdate(filter: FilterQuery<T>, data: UpdateQuery<T>, options: any = { new: true }, session?: any): Promise<T | null> {
    return (await this.model.findOneAndUpdate(filter, data, options).session(session ?? null).exec()) as T | null;
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(stripUndefined(filter));
  }

  async paginate(
    filterRaw: FilterQuery<T> = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
      populate?: string | string[];
    } = {}
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const filter = stripUndefined(filterRaw);

    // Clamp page/limit to sane ranges (negative or zero values would produce
    // invalid skip/limit values downstream).
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
    const skip = (page - 1) * limit;
    
    const sort = options.sort || { createdAt: -1 };
    
    let query = this.model.find(filter);
    
    if (options.populate) {
      if (Array.isArray(options.populate)) {
        for (const path of options.populate) {
          query = query.populate(path);
        }
      } else {
        query = query.populate(options.populate);
      }
    }
    
    const [data, total] = await Promise.all([
      query.skip(skip).limit(limit).sort(sort).exec() as Promise<T[]>,
      this.model.countDocuments(filter)
    ]);
    
    const pages = Math.ceil(total / limit);
    
    return {
      data,
      total,
      page,
      limit,
      pages
    };
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    return Boolean(await this.model.exists(filter));
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.model.aggregate(pipeline).exec();
  }
}
