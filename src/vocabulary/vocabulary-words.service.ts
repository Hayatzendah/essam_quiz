import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VocabularyWord, VocabularyWordDocument } from './schemas/vocabulary-word.schema';
import { VocabularyTopic, VocabularyTopicDocument } from './schemas/vocabulary-topic.schema';
import { CreateVocabularyWordDto } from './dto/create-vocabulary-word.dto';
import { UpdateVocabularyWordDto } from './dto/update-vocabulary-word.dto';
import { QueryVocabularyWordDto } from './dto/query-vocabulary-word.dto';

@Injectable()
export class VocabularyWordsService {
  private readonly logger = new Logger(VocabularyWordsService.name);

  constructor(
    @InjectModel(VocabularyWord.name)
    private readonly wordModel: Model<VocabularyWordDocument>,
    @InjectModel(VocabularyTopic.name)
    private readonly topicModel: Model<VocabularyTopicDocument>,
  ) {}

  /**
   * إنشاء كلمة مفردات جديدة
   */
  async create(dto: CreateVocabularyWordDto): Promise<VocabularyWord> {
    // التحقق من وجود الموضوع
    if (!Types.ObjectId.isValid(dto.topicId)) {
      throw new BadRequestException(`Invalid topicId: ${dto.topicId}`);
    }

    const topic = await this.topicModel.findById(dto.topicId).exec();
    if (!topic) {
      throw new NotFoundException(`Topic with ID ${dto.topicId} not found`);
    }

    const word = new this.wordModel({
      ...dto,
      topicId: new Types.ObjectId(dto.topicId),
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    return word.save();
  }

  /**
   * البحث عن الكلمات مع إمكانية التصفية حسب الموضوع
   */
  async findAll(query: QueryVocabularyWordDto): Promise<VocabularyWord[]> {
    const filter: any = {};

    if (query.topicId) {
      if (!Types.ObjectId.isValid(query.topicId)) {
        throw new BadRequestException(`Invalid topicId: ${query.topicId}`);
      }
      filter.topicId = new Types.ObjectId(query.topicId);
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    return this.wordModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  /**
   * البحث عن كلمة واحدة بالـ ID
   */
  async findOne(id: string): Promise<VocabularyWord> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Word with ID ${id} not found`);
    }

    const word = await this.wordModel.findById(id).exec();
    if (!word) {
      throw new NotFoundException(`Word with ID ${id} not found`);
    }
    return word;
  }

  /**
   * تحديث كلمة مفردات
   */
  async update(id: string, dto: UpdateVocabularyWordDto): Promise<VocabularyWord> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Word with ID ${id} not found`);
    }

    // التحقق من وجود الموضوع إذا تم تحديث topicId
    if (dto.topicId) {
      if (!Types.ObjectId.isValid(dto.topicId)) {
        throw new BadRequestException(`Invalid topicId: ${dto.topicId}`);
      }

      const topic = await this.topicModel.findById(dto.topicId).exec();
      if (!topic) {
        throw new NotFoundException(`Topic with ID ${dto.topicId} not found`);
      }
    }

    const updateData: any = { ...dto };
    if (dto.topicId) {
      updateData.topicId = new Types.ObjectId(dto.topicId);
    }

    const word = await this.wordModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    if (!word) {
      throw new NotFoundException(`Word with ID ${id} not found`);
    }
    return word;
  }

  /**
   * حذف كلمة مفردات
   */
  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Word with ID ${id} not found`);
    }

    const result = await this.wordModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Word with ID ${id} not found`);
    }
  }
}

