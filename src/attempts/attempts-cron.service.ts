import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attempt, AttemptDocument, AttemptStatus } from './schemas/attempt.schema';
import { AttemptsService } from './attempts.service';

@Injectable()
export class AttemptsCronService {
  private readonly logger = new Logger(AttemptsCronService.name);

  constructor(
    @InjectModel(Attempt.name) private readonly AttemptModel: Model<AttemptDocument>,
    private readonly attemptsService: AttemptsService,
  ) {}

  // كل دقيقة: تحقق من المحاولات المنتهية الوقت
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredAttempts() {
    const now = new Date();
    const expiredAttempts = await this.AttemptModel.find({
      status: AttemptStatus.IN_PROGRESS,
      expiresAt: { $lte: now },
    }).exec();

    if (expiredAttempts.length === 0) {
      return;
    }

    this.logger.log(`Found ${expiredAttempts.length} expired attempt(s), auto-submitting...`);

    for (const attempt of expiredAttempts) {
      try {
        // استخراج userId من studentId
        const userId = attempt.studentId.toString();
        const user = { userId, role: 'student' as const };

        // تسليم المحاولة تلقائياً
        const attemptId = (attempt as any)._id?.toString() || (attempt as any).id?.toString();
        if (attemptId) {
          await this.attemptsService.submitAttempt(user, attemptId);
          this.logger.log(`Auto-submitted attempt ${attemptId}`);
        }
      } catch (error: any) {
        const attemptId = (attempt as any)._id?.toString() || (attempt as any).id?.toString();
        this.logger.error(`Failed to auto-submit attempt ${attemptId}: ${error?.message || 'Unknown error'}`);
      }
    }
  }
}

