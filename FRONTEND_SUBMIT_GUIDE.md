# دليل الفرونت إند: كيفية الحصول على نتائج الامتحان

## المشكلة الحالية
الفرونت يرسل الإجابات لكن النتيجة تظهر صفر. هذا لأن الـ DTO والـ Service لا يتطابقان.

## الحل: كيفية إرسال الإجابات بشكل صحيح

### 1. Endpoint للتسليم
```
POST /attempts/:attemptId/submit
```

### 2. Headers
```javascript
{
  "Authorization": "Bearer <accessToken>",
  "Content-Type": "application/json"
}
```

### 3. Body Structure

#### للأسئلة من نوع MCQ (اختيار متعدد):
```json
{
  "answers": [
    {
      "questionId": "questionId123",
      "selectedOptionIds": ["0", "2"]  // indexes كـ strings (0-based)
    }
  ]
}
```

#### للأسئلة من نوع Fill (ملء الفراغ):
```json
{
  "answers": [
    {
      "questionId": "questionId456",
      "studentAnswerText": "الإجابة النصية"
    }
  ]
}
```

#### للأسئلة من نوع True/False:
```json
{
  "answers": [
    {
      "questionId": "questionId789",
      "studentAnswerBoolean": true
    }
  ]
}
```

### 4. Response Structure (ما سيرجعه الباك)

```json
{
  "attemptId": "attemptId123",
  "examId": "examId123",
  "status": "submitted",
  "attemptCount": 1,
  "startedAt": "2024-01-01T10:00:00.000Z",
  "submittedAt": "2024-01-01T10:45:00.000Z",
  "finalScore": 75,              // ⭐ النتيجة النهائية
  "totalMaxScore": 100,          // ⭐ مجموع النقاط الكلي
  "totalAutoScore": 75,          // ⭐ النقاط من التصحيح الآلي
  "totalManualScore": 0,         // ⭐ النقاط من التصحيح اليدوي
  "items": [
    {
      "questionId": "questionId123",
      "qType": "mcq",            // نوع السؤال: mcq, fill, true_false, match, reorder
      "promptSnapshot": "ما هي عاصمة فرنسا؟",
      "optionsText": ["باريس", "لندن", "برلين", "مدريد"],
      "points": 10,              // ⭐ نقاط السؤال
      "autoScore": 10,           // ⭐ النقاط المحصلة (من التصحيح الآلي)
      "manualScore": 0,          // ⭐ النقاط المحصلة (من التصحيح اليدوي)
      "studentAnswerIndexes": [0],  // إجابة الطالب (indexes)
      "correctOptionIndexes": [0],  // الإجابة الصحيحة (إذا كان policy يسمح)
      "isCorrect": true          // ⭐ هل الإجابة صحيحة (في correct_with_scores policy)
    },
    {
      "questionId": "questionId456",
      "qType": "fill",
      "promptSnapshot": "اكمل: عاصمة مصر هي _____",
      "points": 10,
      "autoScore": 0,
      "manualScore": 0,
      "studentAnswerText": "القاهرة",
      "fillExact": "القاهرة",    // الإجابة الصحيحة (إذا كان policy يسمح)
      "isCorrect": false
    },
    {
      "questionId": "questionId789",
      "qType": "true_false",
      "promptSnapshot": "2 + 2 = 4",
      "points": 5,
      "autoScore": 5,
      "manualScore": 0,
      "studentAnswerBoolean": true,
      "answerKeyBoolean": true,  // الإجابة الصحيحة (إذا كان policy يسمح)
      "isCorrect": true
    }
  ]
}
```

## كيفية استخدام البيانات في الفرونت

### 1. عرض النتيجة الإجمالية:
```javascript
const response = await submitAttempt(attemptId, answers);

// النتيجة الإجمالية
const finalScore = response.finalScore;        // 75
const totalMaxScore = response.totalMaxScore;  // 100
const percentage = (finalScore / totalMaxScore) * 100; // 75%

console.log(`النتيجة: ${finalScore}/${totalMaxScore}`);
console.log(`النسبة: ${percentage}%`);
```

### 2. عرض نتيجة كل سؤال:
```javascript
response.items.forEach((item, index) => {
  const questionNumber = index + 1;
  const isCorrect = item.autoScore + item.manualScore >= item.points;
  const score = item.autoScore + item.manualScore;
  
  console.log(`سؤال ${questionNumber}: ${isCorrect ? 'صحيح' : 'خطأ'}`);
  console.log(`النقاط: ${score}/${item.points}`);
  
  // عرض الإجابة الصحيحة (إذا كانت متاحة)
  if (item.correctOptionIndexes) {
    console.log(`الإجابة الصحيحة: ${item.correctOptionIndexes.map(idx => item.optionsText[idx]).join(', ')}`);
  } else if (item.fillExact) {
    console.log(`الإجابة الصحيحة: ${item.fillExact}`);
  } else if (item.answerKeyBoolean !== undefined) {
    console.log(`الإجابة الصحيحة: ${item.answerKeyBoolean ? 'صحيح' : 'خطأ'}`);
  }
});
```

### 3. مثال كامل:
```javascript
async function submitExam(attemptId, answers) {
  try {
    const response = await fetch(`/api/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ answers })
    });
    
    const data = await response.json();
    
    // عرض النتيجة الإجمالية
    displayTotalScore(data.finalScore, data.totalMaxScore);
    
    // عرض نتائج كل سؤال
    data.items.forEach((item, index) => {
      displayQuestionResult(index + 1, item);
    });
    
    return data;
  } catch (error) {
    console.error('Error submitting exam:', error);
  }
}

function displayTotalScore(finalScore, totalMaxScore) {
  const percentage = Math.round((finalScore / totalMaxScore) * 100);
  document.getElementById('score').textContent = `${finalScore}/${totalMaxScore}`;
  document.getElementById('percentage').textContent = `${percentage}%`;
}

function displayQuestionResult(questionNumber, item) {
  const isCorrect = (item.autoScore || 0) + (item.manualScore || 0) >= item.points;
  const score = (item.autoScore || 0) + (item.manualScore || 0);
  
  // عرض حالة السؤال (صحيح/خطأ)
  const status = isCorrect ? 'صحيح' : 'خطأ';
  const statusIcon = isCorrect ? '✓' : '✗';
  
  console.log(`سؤال ${questionNumber}: ${statusIcon} ${status} (${score}/${item.points})`);
}
```

## ملاحظات مهمة

1. **selectedOptionIds**: يجب أن تكون indexes (0-based) كـ strings
   - مثال: `["0", "2"]` يعني الخيار الأول والثالث

2. **questionId**: يجب أن يكون ID السؤال من الـ attempt items

3. **finalScore**: هذا هو الحقل الرئيسي للنتيجة الإجمالية
   - `finalScore = totalAutoScore + totalManualScore`

4. **isCorrect**: يظهر فقط في `correct_with_scores` policy
   - يمكنك حسابها بنفسك: `(autoScore + manualScore) >= points`

5. **الإجابات الصحيحة**: تظهر فقط في `explanations_with_scores` policy أو للمعلم/الأدمن

## مثال كامل للـ Body (جميع أنواع الأسئلة):

```json
{
  "answers": [
    {
      "questionId": "questionId1",
      "selectedOptionIds": ["0"]
    },
    {
      "questionId": "questionId2",
      "studentAnswerText": "القاهرة"
    },
    {
      "questionId": "questionId3",
      "studentAnswerBoolean": true
    }
  ]
}
```

## Troubleshooting

### المشكلة: النتيجة صفر رغم أن الإجابات صحيحة
**الحل**: تأكد من:
1. إرسال `questionId` بشكل صحيح
2. إرسال `selectedOptionIds` كـ indexes (0-based) وليس IDs
3. للأسئلة Fill: استخدام `studentAnswerText` وليس `selectedOptionIds`
4. للأسئلة True/False: استخدام `studentAnswerBoolean` وليس `selectedOptionIds`

### المشكلة: الإجابات لا تُحفظ
**الحل**: تأكد من:
1. الـ `questionId` موجود في الـ attempt items
2. الـ attempt status هو `in_progress`
3. الـ token صحيح والصلاحيات موجودة

