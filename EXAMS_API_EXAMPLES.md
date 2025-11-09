# Exams API - Postman Examples

## Base URL
```
https://api.deutsch-tests.com/exams
```

---

## 1. إنشاء امتحان — وضع الأسئلة اليدوي

**Method:** `POST`  
**URL:** `https://api.deutsch-tests.com/exams`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Math Midterm",
  "level": "G6",
  "sections": [
    {
      "name": "MCQ Basics",
      "items": [
        { "questionId": "671fc2b4c7e54e0d8f7d12f1", "points": 1 },
        { "questionId": "671fc2b4c7e54e0d8f7d12f2", "points": 2 }
      ],
      "randomize": true
    }
  ],
  "randomizeQuestions": false,
  "attemptLimit": 1
}
```

**Response (201 Created):**
```json
{
  "id": "6910ca7f8d98cac22e8c8c47",
  "title": "Math Midterm",
  "level": "G6",
  "status": "draft",
  "sections": [...],
  "randomizeQuestions": false,
  "attemptLimit": 1,
  "ownerId": "6910c9478d98cac22e8c8c43",
  "createdAt": "2025-11-09T17:08:15.721Z"
}
```

---

## 2. إنشاء امتحان — وضع القواعد العشوائية (مع توزيع صعوبة)

**Method:** `POST`  
**URL:** `https://api.deutsch-tests.com/exams`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Science Quiz",
  "level": "G7",
  "sections": [
    {
      "name": "Physics",
      "quota": 5,
      "difficultyDistribution": { "easy": 2, "medium": 2, "hard": 1 }
    },
    {
      "name": "Chemistry",
      "quota": 3
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 0
}
```

**Note:** `attemptLimit: 0` يعني غير محدود

---

## 3. عرض قائمة الامتحانات

**Method:** `GET`  
**URL:** `https://api.deutsch-tests.com/exams`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response:**
```json
{
  "items": [
    {
      "_id": "6910ca7f8d98cac22e8c8c47",
      "title": "Math Midterm",
      "level": "G6",
      "status": "draft",
      "sections": [...],
      "ownerId": "6910c9478d98cac22e8c8c43",
      "createdAt": "2025-11-09T17:08:15.721Z"
    }
  ],
  "count": 1
}
```

**ملاحظة:** 
- للمعلم: يرجّع امتحاناته فقط
- للأدمن: يرجّع جميع الامتحانات

---

## 4. فلترة الامتحانات حسب الحالة

**Method:** `GET`  
**URL:** `https://api.deutsch-tests.com/exams?status=published`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Query Parameters:**
- `status`: `draft` | `published` | `archived`
- `level`: مستوى الامتحان (مثل `G6`, `G7`)

**مثال:**
```
GET https://api.deutsch-tests.com/exams?status=published&level=G6
```

---

## 5. تفاصيل امتحان

**Method:** `GET`  
**URL:** `https://api.deutsch-tests.com/exams/6910ca7f8d98cac22e8c8c47`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response:**
```json
{
  "_id": "6910ca7f8d98cac22e8c8c47",
  "title": "Math Midterm",
  "level": "G6",
  "status": "published",
  "sections": [...],
  "randomizeQuestions": false,
  "attemptLimit": 1,
  "ownerId": "6910c9478d98cac22e8c8c43",
  "createdAt": "2025-11-09T17:08:15.721Z",
  "updatedAt": "2025-11-09T17:08:15.721Z"
}
```

**ملاحظة:**
- **الطالب:** يُسمح له فقط إذا كان `status=published`، وتُخفى التفاصيل الحساسة في السكاشن العشوائية
- **المعلم/الأدمن:** يرى جميع التفاصيل

---

## 6. تحديث امتحان

**Method:** `PATCH`  
**URL:** `https://api.deutsch-tests.com/exams/6910ca7f8d98cac22e8c8c47`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Math Midterm - V2",
  "status": "published"
}
```

**ملاحظة:** 
- إذا كان الامتحان منشوراً بالفعل (`published`): التعديلات الجذرية على السكاشن ممنوعة (إلا للأدمن)
- يمكن تغيير `title`, `status`, `attemptLimit` فقط بعد النشر

---

## 7. إسناد امتحان

**Method:** `POST`  
**URL:** `https://api.deutsch-tests.com/exams/6910ca7f8d98cac22e8c8c47/assign`  
**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "classId": "671fc2b4c7e54e0d8f7d13000",
  "studentIds": ["671fc2b4c7e54e0d8f7d12001", "671fc2b4c7e54e0d8f7d12002"]
}
```

**أو إسناد لصف:**
```json
{
  "classId": "671fc2b4c7e54e0d8f7d13000"
}
```

**أو إسناد لطلاب محددين:**
```json
{
  "studentIds": ["671fc2b4c7e54e0d8f7d12001", "671fc2b4c7e54e0d8f7d12002"]
}
```

---

## 8. تحققات منطق

### كل سكشن يجب أن يحتوي على:
- **إما** `items` (أسئلة ثابتة)
- **أو** `quota` (عدد أسئلة عشوائية)
- **وليس الاثنين معاً**

### إذا وُجد `difficultyDistribution`:
- يجب أن يساوي مجموعُه قيمة `quota`
- مثال: `quota: 5` → `difficultyDistribution: { easy: 2, medium: 2, hard: 1 }` ✅

### `attemptLimit`:
- `0` = غير محدود
- `1` = محاولة واحدة فقط
- `> 1` = عدد محاولات محدود

### عند التحويل إلى `published`:
- تأكدي من صلاحية البنية (التحقق موجود في Service)

---

## 9. صلاحيات الوصول

### إنشاء امتحان:
- ✅ `admin`
- ✅ `teacher`
- ❌ `student`

### عرض قائمة الامتحانات:
- ✅ `admin` (جميع الامتحانات)
- ✅ `teacher` (امتحاناته فقط)
- ❌ `student`

### عرض تفاصيل امتحان:
- ✅ `admin` (جميع الامتحانات)
- ✅ `teacher` (امتحاناته فقط)
- ✅ `student` (فقط `published`)

### تحديث امتحان:
- ✅ `admin` (جميع الامتحانات)
- ✅ `teacher` (امتحاناته فقط)
- ❌ `student`

### إسناد امتحان:
- ✅ `admin` (جميع الامتحانات)
- ✅ `teacher` (امتحاناته فقط)
- ❌ `student`

---

## 10. أمثلة أخطاء شائعة

### خطأ: Section يحتوي على items و quota معاً
```json
{
  "statusCode": 400,
  "message": "Section \"Physics\" cannot have both items and quota"
}
```

### خطأ: difficultyDistribution لا يساوي quota
```json
{
  "statusCode": 400,
  "message": "Section \"Physics\" difficultyDistribution must sum to quota"
}
```

### خطأ: محاولة تعديل امتحان منشور
```json
{
  "statusCode": 400,
  "message": "Cannot change sections after publish (admin only if allowed)"
}
```

### خطأ: طالب يحاول عرض امتحان draft
```json
{
  "statusCode": 403,
  "message": "Students can view published exams only"
}
```

