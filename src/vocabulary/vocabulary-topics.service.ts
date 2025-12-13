import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VocabularyTopic, VocabularyTopicDocument } from './schemas/vocabulary-topic.schema';
import { CreateVocabularyTopicDto } from './dto/create-vocabulary-topic.dto';
import { QueryVocabularyTopicDto } from './dto/query-vocabulary-topic.dto';

@Injectable()
export class VocabularyTopicsService {
  private readonly logger = new Logger(VocabularyTopicsService.name);

  constructor(
    @InjectModel(VocabularyTopic.name)
    private readonly topicModel: Model<VocabularyTopicDocument>,
  ) {}

  /**
   * إنشاء موضوع مفردات جديد
   */
  async create(dto: CreateVocabularyTopicDto): Promise<VocabularyTopic> {
    const topic = new this.topicModel({
      ...dto,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    return topic.save();
  }

  /**
   * البحث عن المواضيع مع إمكانية التصفية حسب المستوى
   */
  async findAll(query: QueryVocabularyTopicDto): Promise<VocabularyTopic[]> {
    const filter: any = {};

    if (query.level) {
      filter.level = query.level;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    return this.topicModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  /**
   * البحث عن موضوع واحد بالـ ID
   */
  async findOne(id: string): Promise<VocabularyTopic> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }

    const topic = await this.topicModel.findById(id).exec();
    if (!topic) {
      throw new NotFoundException(`Topic with ID ${id} not found`);
    }
    return topic;
  }
}

