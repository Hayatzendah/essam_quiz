import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ListeningClip, ListeningClipDocument } from './schemas/listening-clip.schema';
import { CreateListeningClipDto } from './dto/create-listening-clip.dto';

@Injectable()
export class ListeningClipsService {
  constructor(
    @InjectModel(ListeningClip.name)
    private readonly model: Model<ListeningClipDocument>,
  ) {}

  async create(dto: CreateListeningClipDto): Promise<ListeningClipDocument> {
    const doc = new this.model({
      ...dto,
      skill: dto.skill || 'hoeren', // Default to hoeren if not provided
    });
    return doc.save();
  }

  async findById(id: string): Promise<ListeningClipDocument | null> {
    if (!id) return null;
    return this.model.findById(id).exec();
  }

  async findAll(filters?: {
    provider?: string;
    level?: string;
    skill?: string;
    teil?: number;
  }) {
    const query: any = {};
    if (filters?.provider) {
      // استخدام regex للبحث case-insensitive (لأن provider قد يكون "Goethe" أو "goethe" أو "GOETHE")
      const escapedProvider = filters.provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.provider = { $regex: `^${escapedProvider}$`, $options: 'i' };
    }
    if (filters?.level) query.level = filters.level;
    if (filters?.skill) query.skill = filters.skill;
    if (filters?.teil) query.teil = filters.teil;

    return this.model.find(query).sort({ provider: 1, level: 1, teil: 1 }).exec();
  }

  async findOneOrFail(id: string): Promise<ListeningClipDocument> {
    const clip = await this.findById(id);
    if (!clip) {
      throw new NotFoundException(`ListeningClip with ID ${id} not found`);
    }
    return clip;
  }
}

