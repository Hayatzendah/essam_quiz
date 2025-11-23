export class SubmitAnswerDto {
  itemId?: string;
  userAnswer?: string | number | boolean | number[];
}

export class SubmitAttemptDto {
  // attemptId يأتي من URL parameter
  answers?: SubmitAnswerDto[]; // اختياري - إذا تم إرسال الإجابات هنا، سيتم حفظها قبل التصحيح
}

