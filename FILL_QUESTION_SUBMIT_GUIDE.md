# دليل إرسال إجابات أسئلة Fill-in-the-Blank

## الحقول المدعومة لإرسال إجابة Fill

لأسئلة `qType="fill"`، يمكنك استخدام أي من الحقول التالية:

### 1. `answerText` (مُوصى به - الحقل الجديد)
```json
{
  "questionId": "507f1f77bcf86cd799439011",
  "answerText": "Paris"
}
```

### 2. `studentAnswerText` (للتوافق مع الكود القديم)
```json
{
  "questionId": "507f1f77bcf86cd799439011",
  "studentAnswerText": "Paris"
}
```

### 3. `fillAnswers` (للتوافق مع الكود القديم)
```json
{
  "questionId": "507f1f77bcf86cd799439011",
  "fillAnswers": "Paris"
}
```

## مثال Payload كامل لـ POST /attempts/:id/submit

```json
{
  "answers": [
    {
      "questionId": "507f1f77bcf86cd799439011",
      "answerText": "Paris"
    },
    {
      "questionId": "507f1f77bcf86cd799439012",
      "answerText": "Berlin"
    }
  ]
}
```

## مثال مع أنواع أسئلة مختلفة

```json
{
  "answers": [
    {
      "questionId": "507f1f77bcf86cd799439011",
      "qType": "fill",
      "answerText": "Paris"
    },
    {
      "questionId": "507f1f77bcf86cd799439012",
      "qType": "mcq",
      "selectedOptionIndexes": [1]
    },
    {
      "questionId": "507f1f77bcf86cd799439013",
      "qType": "true_false",
      "selectedOptionIndexes": [1]
    }
  ]
}
```

## ملاحظات مهمة

1. **الحقل الموصى به**: استخدم `answerText` للحصول على أفضل دعم
2. **الحقول القديمة**: `studentAnswerText` و `fillAnswers` مدعومة للتوافق مع الكود القديم
3. **الأولوية**: إذا أرسلت أكثر من حقل، الأولوية هي: `answerText` > `studentAnswerText` > `fillAnswers`
4. **التحقق**: يجب أن يكون الحقل موجوداً وغير فارغ (بعد trim)

## مثال من الكود

```typescript
// في submitAttempt، الكود يتحقق من:
if (!answer.answerText?.trim() && !answer.studentAnswerText?.trim() && !answer.fillAnswers?.trim()) {
  throw new BadRequestException(
    `answerText (or studentAnswerText or fillAnswers) is required for FILL question`
  );
}

// ثم يحفظ:
item.studentAnswerText = answer.answerText || answer.studentAnswerText || answer.fillAnswers || '';
```

