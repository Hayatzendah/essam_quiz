# 📋 ملاحظات تحديث الفرونت إند

## 🔄 التغييرات الجديدة في API Response

### 1. `POST /attempts/:attemptId/submit` - Response محدث

**قبل التحديث:**
```json
{
  "attemptId": "...",
  "status": "submitted",
  "totalAutoScore": 2,
  "totalMaxScore": 3,
  "finalScore": 2,
  "percentage": 67
}
```

**بعد التحديث (الآن):**
```json
{
  "attemptId": "...",
  "status": "submitted",
  "totalAutoScore": 2,
  "totalMaxScore": 3,
  "finalScore": 2,
  "percentage": 67,
  "items": [
    {
      "questionId": "...",
      "itemIndex": 0,
      "qType": "mcq",
      "points": 1,
      "prompt": "Ich sehe ____ Mann",
      "autoScore": 1,
      "isCorrect": true,
      "studentAnswerIndexes": [1],
      "options": ["der", "den", "dem", "des"],
      "correctOptionIndexes": [1],
      "correctAnswer": "den"
    },
    {
      "questionId": "...",
      "itemIndex": 1,
      "qType": "true_false",
      "points": 1,
      "prompt": "الجملة التالية صحيحة: 'Ich sehe der Mann'",
      "autoScore": 0,
      "isCorrect": false,
      "studentAnswerBoolean": true,
      "correctAnswer": false
    },
    {
      "questionId": "...",
      "itemIndex": 2,
      "qType": "fill",
      "points": 1,
      "prompt": "أكمل الفراغ: Ich sehe ____ Mann",
      "autoScore": 1,
      "isCorrect": true,
      "studentAnswerText": "den",
      "correctAnswer": "den"
    }
  ]
}
```

---

## ✅ ما يحتاج تحديث في الفرونت إند:

### 1. عرض النتائج بعد Submit

**الآن يمكنك عرض:**
- ✅ `items[].isCorrect` - هل الإجابة صحيحة أم لا
- ✅ `items[].correctAnswer` - الإجابة الصحيحة (نص واضح)
- ✅ `items[].autoScore` - النقاط المحصل عليها
- ✅ `items[].studentAnswerIndexes` / `studentAnswerText` / `studentAnswerBoolean` - إجابة الطالب

**مثال على الاستخدام:**
```javascript
const response = await api.post(`/attempts/${attemptId}/submit`, {});
const { items, totalAutoScore, totalMaxScore, percentage } = response.data;

// عرض النتائج
items.forEach((item, index) => {
  console.log(`السؤال ${index + 1}:`);
  console.log(`  - صحيح: ${item.isCorrect ? 'نعم' : 'لا'}`);
  console.log(`  - إجابتك: ${getStudentAnswer(item)}`);
  console.log(`  - الإجابة الصحيحة: ${item.correctAnswer}`);
  console.log(`  - النقاط: ${item.autoScore}/${item.points}`);
});

function getStudentAnswer(item) {
  if (item.qType === 'mcq') {
    return item.options[item.studentAnswerIndexes[0]] || 'لم تجب';
  } else if (item.qType === 'true_false') {
    return item.studentAnswerBoolean ? 'صح' : 'خطأ';
  } else if (item.qType === 'fill') {
    return item.studentAnswerText || 'لم تجب';
  }
  return 'غير معروف';
}
```

---

### 2. إرسال الإجابات عند Submit

**الآن يمكنك إرسال الإجابات مع Submit:**

```javascript
// ✅ صحيح - إرسال النص مباشرة
await api.post(`/attempts/${attemptId}/submit`, {
  answers: [
    { itemId: "0", userAnswer: "den" },        // MCQ: نص
    { itemId: "1", userAnswer: "خطأ" },        // TRUE_FALSE: نص
    { itemId: "2", userAnswer: "den" }         // FILL: نص
  ]
});

// ✅ صحيح - إرسال index
await api.post(`/attempts/${attemptId}/submit`, {
  answers: [
    { itemId: "0", userAnswer: 1 },            // MCQ: index
    { itemId: "1", userAnswer: false },        // TRUE_FALSE: boolean
    { itemId: "2", userAnswer: "den" }         // FILL: نص
  ]
});
```

**ملاحظات مهمة:**
- ✅ يمكن إرسال النص ("den") أو index (1) لأسئلة MCQ
- ✅ يمكن إرسال "صح"/"خطأ" أو true/false لأسئلة TRUE_FALSE
- ✅ النظام سيقوم بالتحويل تلقائياً

---

### 3. عرض الإجابات الصحيحة

**مثال على عرض النتائج:**

```jsx
// React Component
function ResultsScreen({ submitResponse }) {
  const { items, totalAutoScore, totalMaxScore, percentage } = submitResponse;

  return (
    <div>
      <h2>النتيجة: {totalAutoScore} / {totalMaxScore} ({percentage}%)</h2>
      
      {items.map((item, index) => (
        <div key={index} className={item.isCorrect ? 'correct' : 'incorrect'}>
          <h3>سؤال {index + 1}</h3>
          <p>{item.prompt}</p>
          
          {/* إجابة الطالب */}
          <div>
            <strong>إجابتك:</strong> {getStudentAnswerDisplay(item)}
            {!item.isCorrect && (
              <span className="wrong"> ❌</span>
            )}
          </div>
          
          {/* الإجابة الصحيحة */}
          {!item.isCorrect && (
            <div>
              <strong>الإجابة الصحيحة:</strong> {getCorrectAnswerDisplay(item)}
            </div>
          )}
          
          {/* النقاط */}
          <div>النقاط: {item.autoScore} / {item.points}</div>
        </div>
      ))}
    </div>
  );
}

function getStudentAnswerDisplay(item) {
  if (item.qType === 'mcq') {
    const selectedIndex = item.studentAnswerIndexes?.[0];
    return selectedIndex !== undefined ? item.options[selectedIndex] : 'لم تجب';
  } else if (item.qType === 'true_false') {
    return item.studentAnswerBoolean ? 'صح' : 'خطأ';
  } else if (item.qType === 'fill') {
    return item.studentAnswerText || 'لم تجب';
  }
  return 'غير معروف';
}

function getCorrectAnswerDisplay(item) {
  if (item.qType === 'mcq') {
    return item.correctAnswer; // نص الإجابة الصحيحة
  } else if (item.qType === 'true_false') {
    return item.correctAnswer ? 'صح' : 'خطأ';
  } else if (item.qType === 'fill') {
    return item.correctAnswer;
  }
  return 'غير معروف';
}
```

---

## 🔧 ملاحظات تقنية:

### 1. MCQ - ترتيب الخيارات
- ⚠️ **مهم:** إذا كان `randomizeQuestions: true`، ترتيب الخيارات قد يكون مختلط
- ✅ استخدم `options` من response (بعد الخلط) لعرض الخيارات
- ✅ استخدم `studentAnswerIndexes` و `correctOptionIndexes` بناءً على الترتيب بعد الخلط

### 2. TRUE_FALSE - القيم المدعومة
- ✅ يمكن إرسال: `true`, `false`, `"صح"`, `"خطأ"`, `"true"`, `"false"`, `"richtig"`, `"falsch"`
- ✅ النظام سيقوم بالتحويل تلقائياً

### 3. FILL - تطبيع النص
- ✅ النظام يقوم بتطبيع النص تلقائياً (إزالة المسافات، تحويل لحروف صغيرة)
- ✅ يمكن إرسال: `"den"`, `" den "`, `"DEN"` - جميعها ستعمل

---

## 📝 ملخص التغييرات:

### ✅ ما تم إضافته:
1. `items` في response من `submitAttempt`
2. `isCorrect` لكل item
3. `correctAnswer` كنص واضح لكل item
4. دعم إرسال النص في `userAnswer` (بدلاً من index فقط)

### ⚠️ ما يحتاج تحديث في الفرونت:
1. **عرض النتائج:** استخدام `items` من response لعرض النتائج
2. **عرض الإجابات الصحيحة:** استخدام `correctAnswer` من كل item
3. **إرسال الإجابات:** يمكن إرسال النص مباشرة (أسهل من index)

---

## 🎯 مثال كامل:

```javascript
// 1. بدء المحاولة
const startResponse = await api.post('/attempts', { examId });
const { attemptId, items } = startResponse.data;

// 2. حفظ الإجابات (اختياري - يمكن إرسالها مع submit)
await api.patch(`/attempts/${attemptId}/answer`, {
  itemIndex: 0,
  studentAnswerIndexes: [1] // أو يمكن إرسال النص "den" مع submit
});

// 3. تسليم المحاولة
const submitResponse = await api.post(`/attempts/${attemptId}/submit`, {
  answers: [
    { itemId: "0", userAnswer: "den" },  // نص
    { itemId: "1", userAnswer: "خطأ" },  // نص
    { itemId: "2", userAnswer: "den" }   // نص
  ]
});

// 4. عرض النتائج
const { items: results, totalAutoScore, totalMaxScore, percentage } = submitResponse.data;

results.forEach((item, index) => {
  console.log(`السؤال ${index + 1}:`);
  console.log(`  صحيح: ${item.isCorrect}`);
  console.log(`  إجابتك: ${getStudentAnswer(item)}`);
  console.log(`  الإجابة الصحيحة: ${item.correctAnswer}`);
});
```

---

**آخر تحديث:** 2025-01-XX

