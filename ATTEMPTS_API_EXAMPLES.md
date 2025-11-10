# Attempts API - Postman Examples

## Base URL
```
https://api.deutsch-tests.com/attempts
```

---

## 1. بدء محاولة امتحان (POST /attempts)

**Method:** `POST`  
**URL:** `https://api.deutsch-tests.com/attempts`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "examId": "6911024eedc6fd66631427d3"
}
```

**Response (201 Created):**
```json
{
  "attemptId": "69110f74a37deee18fb662c44",
  "examId": "6911024eedc6fd66631427d3",
  "status": "in_progress",
  "attemptCount": 1,
  "expiresAt": "2025-11-09T21:30:00.000Z",
  "items": [
    {
      "questionId": "6910ca7f8d98cac22e8c8c47",
      "qType": "mcq",
      "points": 1,
      "prompt": "What is 2 + 2?",
      "options": ["3", "4", "5"]
    }
  ]
}
```

**ملاحظات:**
- ✅ للطالب فقط
- ✅ الامتحان يجب أن يكون `published`
- ✅ لا يتجاوز `attemptLimit` (إن وجد)
- ✅ يتم اختيار الأسئلة تلقائياً حسب تعريف الامتحان

---

## 2. حفظ إجابة (PATCH /attempts/:attemptId/answer)

**Method:** `PATCH`  
**URL:** `https://api.deutsch-tests.com/attempts/69110f74a37deee18fb662c44/answer`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body (MCQ):**
```json
{
  "itemIndex": 0,
  "studentAnswerIndexes": [1]
}
```

**أو:**
```json
{
  "questionId": "6910ca7f8d98cac22e8c8c47",
  "studentAnswerIndexes": [1]
}
```

**Body (TRUE/FALSE):**
```json
{
  "itemIndex": 0,
  "studentAnswerBoolean": true
}
```

**Body (FILL):**
```json
{
  "itemIndex": 0,
  "studentAnswerText": "Berlin"
}
```

**Response (200 OK):**
```json
{
  "ok": true
}
```

**ملاحظات:**
- ✅ للطالب فقط
- ✅ المحاولة يجب أن تكون `in_progress`
- ✅ الوقت لم ينته بعد (`expiresAt`)

---

## 3. تسليم المحاولة (POST /attempts/:attemptId/submit)

**Method:** `POST`  
**URL:** `https://api.deutsch-tests.com/attempts/69110f74a37deee18fb662c44/submit`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body:**
```json
{}
```

**Response (200 OK):**
```json
{
  "attemptId": "69110f74a37deee18fb662c44",
  "status": "submitted",
  "totalAutoScore": 8.5,
  "totalMaxScore": 10,
  "finalScore": 8.5
}
```

**ملاحظات:**
- ✅ للطالب فقط
- ✅ يتم التصحيح الآلي تلقائياً
- ✅ يتم حساب `totalAutoScore` و `finalScore`

---

## 4. عرض محاولة (GET /attempts/:attemptId)

**Method:** `GET`  
**URL:** `https://api.deutsch-tests.com/attempts/69110f74a37deee18fb662c44`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response (200 OK):**
```json
{
  "attemptId": "69110f74a37deee18fb662c44",
  "examId": "6911024eedc6fd66631427d3",
  "status": "submitted",
  "startedAt": "2025-11-09T21:00:00.000Z",
  "submittedAt": "2025-11-09T21:15:00.000Z",
  "timeUsedSec": 900,
  "totalMaxScore": 10,
  "totalAutoScore": 8.5,
  "totalManualScore": 0,
  "finalScore": 8.5,
  "items": [...]
}
```

**ملاحظات:**
- ✅ للطالب: يرى محاولاته فقط
- ✅ للمعلم: يرى محاولات امتحاناته فقط
- ✅ للأدمن: يرى جميع المحاولات

---

## 5. تصحيح يدوي (POST /attempts/:attemptId/grade)

**Method:** `POST`  
**URL:** `https://api.deutsch-tests.com/attempts/69110f74a37deee18fb662c44/grade`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "items": [
    {
      "questionId": "6910ca7f8d98cac22e8c8c47",
      "score": 0.5
    },
    {
      "questionId": "6910ca7f8d98cac22e8c8c48",
      "score": 1
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "attemptId": "69110f74a37deee18fb662c44",
  "finalScore": 9.5,
  "status": "graded"
}
```

**ملاحظات:**
- ✅ للمعلم/الأدمن فقط
- ✅ المحاولة يجب أن تكون `submitted` أو `graded`
- ✅ يتم تحديث `totalManualScore` و `finalScore`

---

## ترتيب التجربة الموصى به

### المرحلة 1: بدء المحاولة
1. POST /attempts — بدء محاولة امتحان

### المرحلة 2: الإجابة على الأسئلة
2. PATCH /attempts/:attemptId/answer — حفظ إجابة (MCQ)
3. PATCH /attempts/:attemptId/answer — حفظ إجابة (TRUE/FALSE)
4. PATCH /attempts/:attemptId/answer — حفظ إجابة (FILL)

### المرحلة 3: تسليم المحاولة
5. POST /attempts/:attemptId/submit — تسليم المحاولة

### المرحلة 4: عرض النتائج
6. GET /attempts/:attemptId — عرض المحاولة

### المرحلة 5: التصحيح اليدوي (اختياري)
7. POST /attempts/:attemptId/grade — تصحيح يدوي

---

## أمثلة Body حسب نوع السؤال

### MCQ (اختيار من متعدد)
```json
{
  "itemIndex": 0,
  "studentAnswerIndexes": [1, 3]
}
```

### TRUE/FALSE (صح/خطأ)
```json
{
  "itemIndex": 0,
  "studentAnswerBoolean": true
}
```

### FILL (أكمل الفراغ)
```json
{
  "itemIndex": 0,
  "studentAnswerText": "Berlin"
}
```

---

## ملاحظات مهمة

### 1. بدء المحاولة
- الامتحان يجب أن يكون `published`
- لا يتجاوز `attemptLimit` (إن وجد)
- يتم اختيار الأسئلة تلقائياً حسب تعريف الامتحان

### 2. حفظ الإجابة
- يمكن استخدام `itemIndex` أو `questionId`
- نوع الإجابة يجب أن يطابق `qType`:
  - `mcq` → `studentAnswerIndexes`
  - `true_false` → `studentAnswerBoolean`
  - `fill` → `studentAnswerText`

### 3. تسليم المحاولة
- يتم التصحيح الآلي تلقائياً
- يتم حساب `totalAutoScore` و `finalScore`

### 4. التصحيح اليدوي
- للمعلم/الأدمن فقط
- يتم تحديث `totalManualScore` و `finalScore`

---

## أخطاء شائعة

### خطأ: "Exam is not published"
**الحل:** تأكد أن الامتحان `status=published`

### خطأ: "Attempt limit reached"
**الحل:** تم الوصول إلى الحد الأقصى للمحاولات

### خطأ: "Time is over"
**الحل:** انتهى الوقت المحدد للمحاولة

### خطأ: "Attempt is not in progress"
**الحل:** المحاولة تم تسليمها بالفعل

---

## الخلاصة

- ✅ بدء محاولة: POST /attempts
- ✅ حفظ إجابة: PATCH /attempts/:attemptId/answer
- ✅ تسليم محاولة: POST /attempts/:attemptId/submit
- ✅ عرض محاولة: GET /attempts/:attemptId
- ✅ تصحيح يدوي: POST /attempts/:attemptId/grade

