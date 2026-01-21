import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VocabularyWord, VocabularyWordDocument } from './schemas/vocabulary-word.schema';
import { VocabularyTopic, VocabularyTopicDocument } from './schemas/vocabulary-topic.schema';
import { CreateVocabularyWordDto } from './dto/create-vocabulary-word.dto';
import { UpdateVocabularyWordDto } from './dto/update-vocabulary-word.dto';
import { QueryVocabularyWordDto } from './dto/query-vocabulary-word.dto';
import { CreateBulkVocabularyWordsDto } from './dto/create-bulk-vocabulary-words.dto';

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
   * تحويل meaning string إلى meanings array
   * مثال: "بيت / house / maison" → [{text: "بيت", language: "ar"}, {text: "house", language: "en"}, {text: "maison", language: "fr"}]
   */
  private parseMeaningString(meaning: string): Array<{ text: string; language: string }> {
    if (!meaning || typeof meaning !== 'string') {
      return [];
    }

    const parts = meaning.split('/').map((part) => part.trim()).filter((part) => part.length > 0);
    
    // محاولة تخمين اللغة بناءً على النص (يمكن تحسينها لاحقاً)
    const languageMap: Record<string, string> = {
      ar: 'ar', // العربية
      en: 'en', // الإنجليزية
      fr: 'fr', // الفرنسية
      de: 'de', // الألمانية
    };

    return parts.map((text, index) => {
      // محاولة تخمين اللغة من النص (يمكن تحسينها)
      let language = 'unknown';
      
      // إذا كان النص يحتوي على أحرف عربية
      if (/[\u0600-\u06FF]/.test(text)) {
        language = 'ar';
      } else if (/^[a-zA-Z\s]+$/.test(text)) {
        // إذا كان النص إنجليزي فقط
        language = 'en';
      } else {
        // افتراض اللغة حسب الترتيب (يمكن تحسينها)
        language = index === 0 ? 'ar' : index === 1 ? 'en' : 'fr';
      }

      return { text, language };
    });
  }

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

    // معالجة meanings: إذا كان meanings موجوداً استخدمه، وإلا حول meaning string إلى meanings array
    let meanings = dto.meanings || [];
    if (meanings.length === 0 && dto.meaning) {
      meanings = this.parseMeaningString(dto.meaning);
    }

    // التحقق من وجود meanings على الأقل
    if (meanings.length === 0) {
      throw new BadRequestException('Either meaning or meanings must be provided');
    }

    const word = new this.wordModel({
      topicId: new Types.ObjectId(dto.topicId),
      word: dto.word.trim(),
      meaning: dto.meaning?.trim(), // للتوافق مع البيانات القديمة
      meanings: meanings, // الصيغة الجديدة
      exampleSentence: dto.exampleSentence?.trim(),
      order: dto.order !== undefined ? dto.order : null,
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

    // ترتيب حسب order ASC إذا كان موجوداً، وإلا حسب createdAt DESC
    // استخدم ترتيب مختلط: order ASC أولاً (الكلمات مع order تأتي أولاً)، ثم createdAt DESC للكلمات بدون order
    // في MongoDB، null values تأتي في النهاية عند الترتيب ASC
    return this.wordModel.find(filter).sort({ order: 1, createdAt: -1 }).exec();
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

    // معالجة meanings: إذا كان meanings موجوداً استخدمه، وإذا كان meaning string موجوداً حوله
    if (dto.meanings && dto.meanings.length > 0) {
      updateData.meanings = dto.meanings;
    } else if (dto.meaning) {
      updateData.meanings = this.parseMeaningString(dto.meaning);
      updateData.meaning = dto.meaning.trim(); // للتوافق مع البيانات القديمة
    }

    // تنظيف البيانات
    if (updateData.word) {
      updateData.word = updateData.word.trim();
    }
    if (updateData.exampleSentence) {
      updateData.exampleSentence = updateData.exampleSentence.trim();
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

  /**
   * إضافة عدة كلمات دفعة واحدة
   */
  async createBulk(dto: CreateBulkVocabularyWordsDto): Promise<{ insertedCount: number; ids: string[] }> {
    // التحقق من وجود الموضوع
    if (!Types.ObjectId.isValid(dto.topicId)) {
      throw new BadRequestException(`Invalid topicId: ${dto.topicId}`);
    }

    const topic = await this.topicModel.findById(dto.topicId).exec();
    if (!topic) {
      throw new NotFoundException(`Topic with ID ${dto.topicId} not found`);
    }

    // التحقق من وجود كلمات
    if (!dto.words || dto.words.length === 0) {
      throw new BadRequestException('Words array cannot be empty');
    }

    // تحضير البيانات للإدراج
    const wordsToInsert = dto.words.map((wordItem) => {
      // معالجة meanings: إذا كان meanings موجوداً استخدمه، وإلا حول meaning string إلى meanings array
      let meanings = wordItem.meanings || [];
      if (meanings.length === 0 && wordItem.meaning) {
        meanings = this.parseMeaningString(wordItem.meaning);
      }

      // التحقق من وجود meanings على الأقل
      if (meanings.length === 0) {
        throw new BadRequestException(`Word "${wordItem.word}" must have either meaning or meanings`);
      }

      return {
        topicId: new Types.ObjectId(dto.topicId),
        word: wordItem.word.trim(),
        meaning: wordItem.meaning?.trim(), // للتوافق مع البيانات القديمة
        meanings: meanings, // الصيغة الجديدة
        exampleSentence: wordItem.exampleSentence?.trim(),
        order: wordItem.order !== undefined ? wordItem.order : null,
        isActive: true,
      };
    });

    // إدراج الكلمات دفعة واحدة
    const result = await this.wordModel.insertMany(wordsToInsert);

    return {
      insertedCount: result.length,
      ids: result.map((doc: any) => doc._id.toString()),
    };
  }
}

