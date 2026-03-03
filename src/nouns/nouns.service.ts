import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Noun, NounDocument } from './schemas/noun.schema';
import { CreateNounDto } from './dto/create-noun.dto';
import { UpdateNounDto } from './dto/update-noun.dto';
import { CreateBulkNounsDto } from './dto/create-bulk-nouns.dto';
import { QueryNounDto } from './dto/query-noun.dto';

@Injectable()
export class NounsService {
  constructor(
    @InjectModel(Noun.name) private readonly nounModel: Model<NounDocument>,
  ) {}

  async create(dto: CreateNounDto): Promise<Noun> {
    const noun = new this.nounModel({
      article: dto.article,
      singular: dto.singular.trim(),
      plural: dto.plural.trim(),
      level: dto.level,
      order: dto.order !== undefined ? dto.order : null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    return noun.save();
  }

  async createBulk(dto: CreateBulkNounsDto): Promise<{ insertedCount: number; ids: string[] }> {
    if (!dto.nouns || dto.nouns.length === 0) {
      throw new BadRequestException('Nouns array cannot be empty');
    }

    const nounsToInsert = dto.nouns.map((item) => ({
      article: item.article,
      singular: item.singular.trim(),
      plural: item.plural.trim(),
      level: dto.level,
      isActive: true,
    }));

    const result = await this.nounModel.insertMany(nounsToInsert);
    return {
      insertedCount: result.length,
      ids: result.map((doc: any) => doc._id.toString()),
    };
  }

  async findAll(query: QueryNounDto): Promise<Noun[]> {
    const filter: any = {};

    if (query.level) {
      filter.level = query.level;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    return this.nounModel.find(filter).sort({ order: 1, createdAt: -1 }).lean();
  }

  async findOne(id: string): Promise<Noun> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Noun with ID ${id} not found`);
    }

    const noun = await this.nounModel.findById(id).lean();
    if (!noun) {
      throw new NotFoundException(`Noun with ID ${id} not found`);
    }
    return noun;
  }

  async update(id: string, dto: UpdateNounDto): Promise<Noun> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Noun with ID ${id} not found`);
    }

    const updateData: any = {};
    if (dto.article !== undefined) updateData.article = dto.article;
    if (dto.singular !== undefined) updateData.singular = dto.singular.trim();
    if (dto.plural !== undefined) updateData.plural = dto.plural.trim();
    if (dto.level !== undefined) updateData.level = dto.level;
    if (dto.order !== undefined) updateData.order = dto.order;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const noun = await this.nounModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!noun) {
      throw new NotFoundException(`Noun with ID ${id} not found`);
    }
    return noun;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Noun with ID ${id} not found`);
    }

    const result = await this.nounModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Noun with ID ${id} not found`);
    }
  }

  async countByLevel(): Promise<Record<string, number>> {
    const counts = await this.nounModel.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
    ]);
    const result: Record<string, number> = {};
    for (const item of counts) {
      result[item._id] = item.count;
    }
    return result;
  }

  async getRandomNouns(level: string, count: number): Promise<Noun[]> {
    if (!level) {
      throw new BadRequestException('Level is required');
    }
    if (!count || count < 1) {
      throw new BadRequestException('Count must be at least 1');
    }

    const nouns = await this.nounModel.aggregate([
      { $match: { level, isActive: true } },
      { $sample: { size: count } },
    ]);

    return nouns;
  }
}
