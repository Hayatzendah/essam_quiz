import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Level, LevelDocument } from './schemas/level.schema';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { Exam } from '../exams/schemas/exam.schema';
import { VocabularyTopic } from '../vocabulary/schemas/vocabulary-topic.schema';
import { GrammarTopic } from '../modules/grammar/schemas/grammar-topic.schema';
import { SchreibenTask } from '../modules/schreiben/schemas/schreiben-task.schema';
import { ListeningClip } from '../listening-clips/schemas/listening-clip.schema';
import { Question } from '../questions/schemas/question.schema';
import { Noun } from '../nouns/schemas/noun.schema';

const ALL_SECTIONS = ['grammatik', 'wortschatz', 'pruefungen', 'leben_in_deutschland', 'derdiedas'];

const DEFAULT_LEVELS = [
  { name: 'A1', label: 'A1 - Anfänger', position: 0, isDefault: true, isActive: true, sections: ALL_SECTIONS },
  {
    name: 'A2',
    label: 'A2 - Grundlegende Kenntnisse',
    position: 1,
    isDefault: true,
    isActive: true,
    sections: ALL_SECTIONS,
  },
  {
    name: 'B1',
    label: 'B1 - Fortgeschrittene Sprachverwendung',
    position: 2,
    isDefault: true,
    isActive: true,
    sections: ALL_SECTIONS,
  },
  {
    name: 'B2',
    label: 'B2 - Selbständige Sprachverwendung',
    position: 3,
    isDefault: true,
    isActive: true,
    sections: ALL_SECTIONS,
  },
  {
    name: 'C1',
    label: 'C1 - Fachkundige Sprachkenntnisse',
    position: 4,
    isDefault: true,
    isActive: true,
    sections: ALL_SECTIONS,
  },
  {
    name: 'C2',
    label: 'C2 - Annähernd muttersprachliche Kenntnisse',
    position: 5,
    isDefault: true,
    isActive: true,
    sections: ALL_SECTIONS,
  },
];

@Injectable()
export class LevelsService implements OnModuleInit {
  private readonly logger = new Logger(LevelsService.name);

  constructor(
    @InjectModel(Level.name) private readonly levelModel: Model<LevelDocument>,
    @InjectModel(Exam.name) private readonly examModel: Model<any>,
    @InjectModel(VocabularyTopic.name) private readonly vocabTopicModel: Model<any>,
    @InjectModel(GrammarTopic.name) private readonly grammarTopicModel: Model<any>,
    @InjectModel(SchreibenTask.name) private readonly schreibenTaskModel: Model<any>,
    @InjectModel(ListeningClip.name) private readonly listeningClipModel: Model<any>,
    @InjectModel(Question.name) private readonly questionModel: Model<any>,
    @InjectModel(Noun.name) private readonly nounModel: Model<any>,
  ) {}

  async onModuleInit() {
    const count = await this.levelModel.countDocuments();
    if (count === 0) {
      this.logger.log('Seeding default levels...');
      await this.levelModel.insertMany(DEFAULT_LEVELS);
      this.logger.log(`Seeded ${DEFAULT_LEVELS.length} default levels`);
    }

    // Migration: fix levels with missing, null, or empty sections
    // (previous buggy Object.assign could wipe sections to null/undefined)
    const migrated = await this.levelModel.updateMany(
      { $or: [{ sections: { $exists: false } }, { sections: null }, { sections: { $size: 0 } }] },
      { $set: { sections: ALL_SECTIONS } },
    );
    if (migrated.modifiedCount > 0) {
      this.logger.log(`Migrated ${migrated.modifiedCount} levels with default sections`);
    }

    // Seed C2 level if missing
    const c2Exists = await this.levelModel.findOne({ name: 'C2' });
    if (!c2Exists) {
      await this.levelModel.create({
        name: 'C2',
        label: 'C2 - Annähernd muttersprachliche Kenntnisse',
        position: 5,
        isDefault: true,
        isActive: true,
        sections: ALL_SECTIONS,
      });
      this.logger.log('Seeded C2 level');
    }

    // Add 'derdiedas' section to existing levels that don't have it
    const addedSection = await this.levelModel.updateMany(
      { sections: { $exists: true, $not: { $elemMatch: { $eq: 'derdiedas' } } } },
      { $push: { sections: 'derdiedas' } },
    );
    if (addedSection.modifiedCount > 0) {
      this.logger.log(`Added 'derdiedas' section to ${addedSection.modifiedCount} levels`);
    }
  }

  async findAll(): Promise<Level[]> {
    return this.levelModel.find().sort({ position: 1 }).lean();
  }

  async findActive(): Promise<Level[]> {
    return this.levelModel.find({ isActive: true }).sort({ position: 1 }).lean();
  }

  async findOne(id: string): Promise<Level> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف غير صالح');
    }
    const level = await this.levelModel.findById(id).lean();
    if (!level) {
      throw new NotFoundException('المستوى غير موجود');
    }
    return level;
  }

  async create(dto: CreateLevelDto): Promise<Level> {
    const existing = await this.levelModel.findOne({ name: dto.name });
    if (existing) {
      throw new ConflictException(`المستوى "${dto.name}" موجود بالفعل`);
    }

    if (dto.position === undefined || dto.position === null) {
      const maxDoc = await this.levelModel.findOne().sort({ position: -1 }).lean();
      dto.position = maxDoc ? maxDoc.position + 1 : 0;
    }

    const level = new this.levelModel(dto);
    return level.save();
  }

  async update(id: string, dto: UpdateLevelDto): Promise<Level> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف غير صالح');
    }

    const level = await this.levelModel.findById(id);
    if (!level) {
      throw new NotFoundException('المستوى غير موجود');
    }

    if (level.isDefault && dto.name && dto.name !== level.name) {
      throw new BadRequestException('لا يمكن تغيير اسم المستوى الافتراضي');
    }

    if (dto.name && dto.name !== level.name) {
      const existing = await this.levelModel.findOne({ name: dto.name, _id: { $ne: id } });
      if (existing) {
        throw new ConflictException(`المستوى "${dto.name}" موجود بالفعل`);
      }
    }

    const cleanDto = Object.fromEntries(
      Object.entries(dto).filter(([_, v]) => v !== undefined),
    );
    Object.assign(level, cleanDto);
    return level.save();
  }

  async reorder(levelIds: string[]): Promise<void> {
    const ops = levelIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id) },
        update: { $set: { position: index } },
      },
    }));
    await this.levelModel.bulkWrite(ops);
  }

  async deleteWithReassignment(id: string, reassignToId: string): Promise<void> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(reassignToId)) {
      throw new BadRequestException('معرف غير صالح');
    }

    const level = await this.levelModel.findById(id);
    if (!level) {
      throw new NotFoundException('المستوى غير موجود');
    }

    if (level.isDefault) {
      throw new BadRequestException('لا يمكن حذف المستوى الافتراضي');
    }

    const reassignTo = await this.levelModel.findById(reassignToId);
    if (!reassignTo) {
      throw new NotFoundException('المستوى البديل غير موجود');
    }

    const oldName = level.name;
    const newName = reassignTo.name;

    // Reassign across all collections
    await Promise.all([
      this.examModel.updateMany({ level: oldName }, { $set: { level: newName } }),
      this.examModel.updateMany({ grammarLevel: oldName }, { $set: { grammarLevel: newName } }),
      this.vocabTopicModel.updateMany({ level: oldName }, { $set: { level: newName } }),
      this.grammarTopicModel.updateMany({ level: oldName }, { $set: { level: newName } }),
      this.schreibenTaskModel.updateMany({ level: oldName }, { $set: { level: newName } }),
      this.listeningClipModel.updateMany({ level: oldName }, { $set: { level: newName } }),
      this.questionModel.updateMany({ level: oldName }, { $set: { level: newName } }),
      this.nounModel.updateMany({ level: oldName }, { $set: { level: newName } }),
    ]);

    await this.levelModel.findByIdAndDelete(id);
    this.logger.log(`Deleted level "${oldName}" and reassigned items to "${newName}"`);
  }

  async getItemCounts(levelName: string): Promise<number> {
    const counts = await Promise.all([
      this.examModel.countDocuments({ level: levelName }),
      this.examModel.countDocuments({ grammarLevel: levelName }),
      this.vocabTopicModel.countDocuments({ level: levelName }),
      this.grammarTopicModel.countDocuments({ level: levelName }),
      this.schreibenTaskModel.countDocuments({ level: levelName }),
      this.listeningClipModel.countDocuments({ level: levelName }),
      this.questionModel.countDocuments({ level: levelName }),
      this.nounModel.countDocuments({ level: levelName }),
    ]);
    return counts.reduce((sum, c) => sum + c, 0);
  }

  async getAllLevelNames(): Promise<string[]> {
    const levels = await this.findActive();
    return levels.map((l) => l.name);
  }
}
