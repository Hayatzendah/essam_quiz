import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SchreibenTask,
  SchreibenTaskDocument,
} from './schemas/schreiben-task.schema';
import {
  SchreibenBlockType,
  FormFieldType,
} from './schemas/schreiben-content-block.schema';
import { CreateSchreibenTaskDto } from './dto/create-schreiben-task.dto';
import { UpdateSchreibenTaskDto } from './dto/update-schreiben-task.dto';

@Injectable()
export class SchreibenTasksService {
  constructor(
    @InjectModel(SchreibenTask.name)
    private readonly model: Model<SchreibenTaskDocument>,
  ) {}

  // إنشاء مهمة كتابة جديدة
  async create(dto: CreateSchreibenTaskDto): Promise<SchreibenTask> {
    // التحقق من بلوكات المحتوى
    if (dto.contentBlocks && dto.contentBlocks.length > 0) {
      this.validateContentBlocks(dto.contentBlocks);
    }

    // الحصول على أعلى position في نفس المستوى
    const maxPosition = await this.model
      .findOne({ level: dto.level })
      .sort({ position: -1 })
      .select('position')
      .lean();

    const task = new this.model({
      ...dto,
      position: maxPosition ? maxPosition.position + 1 : 0,
    });

    return task.save();
  }

  // الحصول على جميع مهام الكتابة
  async findAll(query?: {
    level?: string;
    provider?: string;
    status?: string;
  }): Promise<SchreibenTask[]> {
    const filter: any = {};

    if (query?.level) filter.level = query.level;
    if (query?.provider) filter.provider = query.provider;
    if (query?.status) filter.status = query.status;

    return this.model
      .find(filter)
      .sort({ level: 1, position: 1, title: 1 })
      .lean();
  }

  // الحصول على مهمة واحدة
  async findOne(id: string): Promise<SchreibenTask> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف غير صالح');
    }

    const task = await this.model.findById(id).lean();
    if (!task) {
      throw new NotFoundException('المهمة غير موجودة');
    }

    return task;
  }

  // تحديث مهمة
  async update(id: string, dto: UpdateSchreibenTaskDto): Promise<SchreibenTask> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف غير صالح');
    }

    // التحقق من بلوكات المحتوى
    if (dto.contentBlocks && dto.contentBlocks.length > 0) {
      this.validateContentBlocks(dto.contentBlocks);
    }

    const task = await this.model
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();

    if (!task) {
      throw new NotFoundException('المهمة غير موجودة');
    }

    return task;
  }

  // حذف مهمة
  async remove(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف غير صالح');
    }

    const result = await this.model.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('المهمة غير موجودة');
    }

    return { message: 'تم حذف المهمة بنجاح' };
  }

  // إعادة ترتيب المهام
  async reorderTasks(
    taskIds: string[],
  ): Promise<{ success: boolean; message: string; count: number }> {
    // التحقق من صحة المعرفات
    for (const id of taskIds) {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`معرف غير صالح: ${id}`);
      }
    }

    const bulkOps = taskIds.map((id, index) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(id) },
        update: { $set: { position: index } },
      },
    }));

    await this.model.bulkWrite(bulkOps);

    return {
      success: true,
      message: 'تم إعادة ترتيب المهام بنجاح',
      count: taskIds.length,
    };
  }

  // تحديث بلوكات المحتوى فقط
  async updateContentBlocks(
    id: string,
    contentBlocks: any[],
  ): Promise<SchreibenTask> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف غير صالح');
    }

    this.validateContentBlocks(contentBlocks);

    const task = await this.model
      .findByIdAndUpdate(id, { contentBlocks }, { new: true })
      .lean();

    if (!task) {
      throw new NotFoundException('المهمة غير موجودة');
    }

    return task;
  }

  // التحقق من صحة بلوكات المحتوى
  private validateContentBlocks(blocks: any[]): void {
    const blockIds = new Set<string>();

    for (const block of blocks) {
      // التحقق من تكرار المعرفات
      if (blockIds.has(block.id)) {
        throw new BadRequestException(`معرف البلوك مكرر: ${block.id}`);
      }
      blockIds.add(block.id);

      // التحقق حسب نوع البلوك
      switch (block.type) {
        case SchreibenBlockType.TEXT:
          if (!block.data?.content || typeof block.data.content !== 'string') {
            throw new BadRequestException(
              `بلوك النص ${block.id} يجب أن يحتوي على محتوى`,
            );
          }
          break;

        case SchreibenBlockType.FORM:
          this.validateFormBlock(block);
          break;

        case SchreibenBlockType.IMAGE:
          if (!block.data?.src || typeof block.data.src !== 'string') {
            throw new BadRequestException(
              `بلوك الصورة ${block.id} يجب أن يحتوي على رابط`,
            );
          }
          break;

        default:
          throw new BadRequestException(`نوع بلوك غير معروف: ${block.type}`);
      }
    }
  }

  // التحقق من صحة بلوك الاستمارة
  private validateFormBlock(block: any): void {
    if (!block.data?.title || typeof block.data.title !== 'string') {
      throw new BadRequestException(
        `بلوك الاستمارة ${block.id} يجب أن يحتوي على عنوان`,
      );
    }

    if (!Array.isArray(block.data?.fields) || block.data.fields.length === 0) {
      throw new BadRequestException(
        `بلوك الاستمارة ${block.id} يجب أن يحتوي على حقول`,
      );
    }

    const fieldIds = new Set<string>();

    for (const field of block.data.fields) {
      // التحقق من تكرار معرفات الحقول
      if (fieldIds.has(field.id)) {
        throw new BadRequestException(
          `معرف الحقل مكرر في الاستمارة ${block.id}: ${field.id}`,
        );
      }
      fieldIds.add(field.id);

      // التحقق من الحقول المطلوبة
      if (!field.label || typeof field.label !== 'string') {
        throw new BadRequestException(
          `الحقل ${field.id} يجب أن يحتوي على عنوان (label)`,
        );
      }

      // التحقق حسب نوع الحقل
      switch (field.fieldType) {
        case FormFieldType.TEXT_INPUT:
          // حقل نصي - الإجابة الصحيحة في value
          if (field.isStudentField !== false && !field.value) {
            // إذا كان حقل الطالب، value هي الإجابة الصحيحة (اختياري)
          }
          break;

        case FormFieldType.PREFILLED:
          // حقل معبأ مسبقاً - يجب أن يكون له قيمة
          if (!field.value || typeof field.value !== 'string') {
            throw new BadRequestException(
              `الحقل المعبأ مسبقاً ${field.id} يجب أن يحتوي على قيمة`,
            );
          }
          break;

        case FormFieldType.SELECT:
        case FormFieldType.MULTISELECT:
          // حقل اختيار - يجب أن يكون له خيارات
          if (!Array.isArray(field.options) || field.options.length < 2) {
            throw new BadRequestException(
              `حقل الاختيار ${field.id} يجب أن يحتوي على خيارين على الأقل`,
            );
          }
          // إذا كان حقل الطالب، يجب أن يكون له إجابات صحيحة
          if (
            field.isStudentField !== false &&
            (!Array.isArray(field.correctAnswers) ||
              field.correctAnswers.length === 0)
          ) {
            throw new BadRequestException(
              `حقل الاختيار ${field.id} يجب أن يحتوي على إجابات صحيحة`,
            );
          }
          break;

        default:
          throw new BadRequestException(
            `نوع حقل غير معروف: ${field.fieldType}`,
          );
      }
    }
  }
}
