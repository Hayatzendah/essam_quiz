import {
  Injectable,
  Logger,
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
  private readonly logger = new Logger(SchreibenTasksService.name);

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

    // تحويل الـ DTO إلى plain object لتجنب مشاكل class instances مع Mongoose
    const updateData = JSON.parse(JSON.stringify(dto));

    // التحقق من بلوكات المحتوى
    if (updateData.contentBlocks && updateData.contentBlocks.length > 0) {
      this.validateContentBlocks(updateData.contentBlocks);
    }

    const task = await this.model
      .findByIdAndUpdate(id, updateData, { new: true })
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

  // ربط مهمة الكتابة بامتحان
  async linkExam(
    id: string,
    examId: string,
  ): Promise<{ success: boolean; message: string; taskId: string; examId: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف المهمة غير صالح');
    }
    if (!Types.ObjectId.isValid(examId)) {
      throw new BadRequestException('معرف الامتحان غير صالح');
    }

    const task = await this.model.findByIdAndUpdate(
      id,
      { examId: new Types.ObjectId(examId) },
      { new: true },
    );

    if (!task) {
      throw new NotFoundException('المهمة غير موجودة');
    }

    return {
      success: true,
      message: 'تم ربط المهمة بالامتحان بنجاح',
      taskId: id,
      examId: examId,
    };
  }

  // إلغاء ربط مهمة الكتابة بامتحان
  async unlinkExam(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف المهمة غير صالح');
    }

    const task = await this.model.findByIdAndUpdate(
      id,
      { $unset: { examId: 1 } },
      { new: true },
    );

    if (!task) {
      throw new NotFoundException('المهمة غير موجودة');
    }

    return {
      success: true,
      message: 'تم إلغاء ربط المهمة بالامتحان',
    };
  }

  // عرض كل حقول النموذج مع الإجابات الصحيحة
  async getFieldsWithAnswers(taskId: string) {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('معرف المهمة غير صالح');
    }

    const task = await this.model.findById(taskId).lean();
    if (!task) {
      throw new NotFoundException('المهمة غير موجودة');
    }

    const fields: any[] = [];
    let formBlockCounter = 0;
    for (const block of task.contentBlocks || []) {
      if (block.type === 'form' && (block.data as any)?.fields) {
        formBlockCounter++;
        const blockFields = (block.data as any).fields;
        for (let fi = 0; fi < blockFields.length; fi++) {
          const field = blockFields[fi];
          fields.push({
            id: field.id,
            number: field.number,
            label: field.label,
            fieldType: field.fieldType,
            isStudentField: field.isStudentField,
            value: field.value || null,
            correctAnswers: field.correctAnswers || null,
            hasCorrectAnswer: !!(field.value || (field.correctAnswers && field.correctAnswers.length > 0)),
            frontendId: `field_${formBlockCounter}_${fi}`, // الـ ID اللي بيستخدمه الفرونت
          });
        }
      }
    }

    return { taskId, fields };
  }

  // تحديث الإجابات الصحيحة لكل الحقول دفعة واحدة
  async updateAllCorrectAnswers(
    taskId: string,
    answers: Array<{ fieldId: string; value?: string; correctAnswers?: string[] }>,
  ) {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('معرف المهمة غير صالح');
    }

    const task = await this.model.findById(taskId);
    if (!task) {
      throw new NotFoundException('المهمة غير موجودة');
    }

    let updatedCount = 0;
    for (const ans of answers) {
      let formBlockCounter = 0;
      for (const block of task.contentBlocks || []) {
        if (block.type === 'form' && (block.data as any)?.fields) {
          formBlockCounter++;
          const fields = (block.data as any).fields;
          for (let fi = 0; fi < fields.length; fi++) {
            const field = fields[fi];
            const matchesById =
              String(field.id) === String(ans.fieldId) ||
              String(field.number) === String(ans.fieldId) ||
              field.label === ans.fieldId ||
              (field._id && String(field._id) === String(ans.fieldId));

            let matchesByPosition = false;
            const posMatch = String(ans.fieldId).match(/^field_(\d+)_(\d+)$/);
            if (posMatch) {
              matchesByPosition =
                formBlockCounter === parseInt(posMatch[1], 10) &&
                fi === parseInt(posMatch[2], 10);
            }

            if (matchesById || matchesByPosition) {
              if (ans.value !== undefined) field.value = ans.value;
              if (ans.correctAnswers !== undefined) field.correctAnswers = ans.correctAnswers;
              updatedCount++;
            }
          }
        }
      }
    }

    task.markModified('contentBlocks');
    await task.save();

    return {
      success: true,
      message: `تم تحديث ${updatedCount} حقل`,
      updatedCount,
    };
  }

  // تحديث الإجابة الصحيحة لحقل معين
  async updateFieldCorrectAnswer(
    taskId: string,
    fieldId: string,
    body: { value?: string; correctAnswers?: string[] },
  ) {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('معرف المهمة غير صالح');
    }

    const task = await this.model.findById(taskId);
    if (!task) {
      throw new NotFoundException('المهمة غير موجودة');
    }

    // البحث عن الحقل في كل بلوكات النموذج (بأكثر من طريقة)
    let found = false;
    let formBlockCounter = 0;
    for (const block of task.contentBlocks || []) {
      if (block.type === 'form' && (block.data as any)?.fields) {
        formBlockCounter++;
        const fields = (block.data as any).fields;
        for (let fi = 0; fi < fields.length; fi++) {
          const field = fields[fi];
          const matchesById =
            String(field.id) === String(fieldId) ||
            String(field.number) === String(fieldId) ||
            field.label === fieldId ||
            (field._id && String(field._id) === String(fieldId));

          // دعم صيغة field_X_Y
          let matchesByPosition = false;
          const posMatch = String(fieldId).match(/^field_(\d+)_(\d+)$/);
          if (posMatch) {
            matchesByPosition =
              formBlockCounter === parseInt(posMatch[1], 10) &&
              fi === parseInt(posMatch[2], 10);
          }

          if (matchesById || matchesByPosition) {
            // تحديث الإجابة الصحيحة
            if (body.value !== undefined) {
              field.value = body.value;
            }
            if (body.correctAnswers !== undefined) {
              field.correctAnswers = body.correctAnswers;
            }
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    if (!found) {
      throw new NotFoundException(`الحقل ${fieldId} غير موجود في المهمة`);
    }

    task.markModified('contentBlocks');
    await task.save();

    return {
      success: true,
      message: 'تم تحديث الإجابة الصحيحة',
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

    // تحويل لـ plain objects لتجنب مشاكل class instances
    const plainBlocks = JSON.parse(JSON.stringify(contentBlocks));

    // Logging لمعرفة ما يرسله الفرونت (خاصة قيم الحقول والإجابات الصحيحة)
    for (const block of plainBlocks) {
      if (block?.type === 'form' && block?.data?.fields) {
        this.logger.warn(
          `[updateContentBlocks] Form block "${block.data.title}" fields: ${JSON.stringify(
            block.data.fields.map((f: any) => ({
              id: f.id,
              number: f.number,
              label: f.label,
              fieldType: f.fieldType,
              value: f.value,
              correctAnswers: f.correctAnswers,
              isStudentField: f.isStudentField,
            })),
          )}`,
        );
      }
    }

    this.validateContentBlocks(plainBlocks);

    const task = await this.model
      .findByIdAndUpdate(id, { contentBlocks: plainBlocks }, { new: true })
      .lean();

    if (!task) {
      throw new NotFoundException('المهمة غير موجودة');
    }

    return task;
  }

  // التحقق من صحة بلوكات المحتوى (مرن - يسمح بالمحتوى الفارغ)
  private validateContentBlocks(blocks: any[]): void {
    if (!blocks || !Array.isArray(blocks)) {
      return; // السماح بعدم وجود بلوكات
    }

    const blockIds = new Set<string>();

    for (const block of blocks) {
      // تجاهل البلوكات الفارغة
      if (!block || !block.id || !block.type) {
        continue;
      }

      // التحقق من تكرار المعرفات
      if (blockIds.has(block.id)) {
        throw new BadRequestException(`معرف البلوك مكرر: ${block.id}`);
      }
      blockIds.add(block.id);

      // التحقق حسب نوع البلوك (مرن)
      switch (block.type) {
        case SchreibenBlockType.TEXT:
          // السماح بالنص الفارغ - فقط تأكد إن data موجود
          if (!block.data) {
            block.data = { content: '' };
          }
          break;

        case SchreibenBlockType.FORM:
          this.validateFormBlock(block);
          break;

        case SchreibenBlockType.IMAGE:
          // السماح بالصورة الفارغة
          if (!block.data) {
            block.data = { src: '' };
          }
          break;

        default:
          // تجاهل الأنواع غير المعروفة بدل رمي خطأ
          break;
      }
    }
  }

  // التحقق من صحة بلوك الاستمارة (مرن)
  private validateFormBlock(block: any): void {
    // تأكد إن data موجود
    if (!block.data) {
      block.data = { title: '', fields: [] };
      return;
    }

    // السماح بعنوان فارغ
    if (!block.data.title) {
      block.data.title = '';
    }

    // السماح بحقول فارغة
    if (!Array.isArray(block.data.fields)) {
      block.data.fields = [];
      return;
    }

    const fieldIds = new Set<string>();

    for (const field of block.data.fields) {
      if (!field || !field.id) {
        continue; // تجاهل الحقول الفارغة
      }

      // التحقق من تكرار معرفات الحقول
      if (fieldIds.has(field.id)) {
        throw new BadRequestException(
          `معرف الحقل مكرر في الاستمارة ${block.id}: ${field.id}`,
        );
      }
      fieldIds.add(field.id);

      // التحقق من الحقول - مرن (السماح بالقيم الفارغة)
      if (!field.label) {
        field.label = '';
      }

      // التحقق حسب نوع الحقل - مرن
      switch (field.fieldType) {
        case FormFieldType.TEXT_INPUT:
          // حقل نصي - السماح بقيمة فارغة
          break;

        case FormFieldType.PREFILLED:
          // حقل معبأ مسبقاً - السماح بقيمة فارغة
          if (!field.value) {
            field.value = '';
          }
          break;

        case FormFieldType.SELECT:
        case FormFieldType.MULTISELECT:
          // حقل اختيار - السماح بخيارات فارغة
          if (!Array.isArray(field.options)) {
            field.options = [];
          }
          if (!Array.isArray(field.correctAnswers)) {
            field.correctAnswers = [];
          }
          break;

        default:
          // تجاهل الأنواع غير المعروفة
          break;
      }
    }
  }
}
