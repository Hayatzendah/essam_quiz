# 📚 وثائق API - نظام تعلم اللغة الألمانية

**نظام شامل لتعلم اللغة الألمانية يتضمن:**
- 🇩🇪 Deutschland in Leben Test (اختبار الحياة في ألمانيا)
- 📝 Prüfungen (6 مزودي امتحانات: telc, Goethe, ÖSD, ECL, DTB, DTZ)
- 📖 Grammatik (القواعد النحوية)
- 📚 Wortschatz (المفردات)

## 📋 جدول المحتويات

1. [Authentication (المصادقة)](#authentication-المصادقة)
2. [Users (المستخدمون)](#users-المستخدمون)
3. [Exams (الامتحانات)](#exams-الامتحانات)
4. [Questions (الأسئلة)](#questions-الأسئلة)
5. [Attempts (المحاولات)](#attempts-المحاولات)
6. [Analytics (التحليلات)](#analytics-التحليلات)
7. [Media (الوسائط)](#media-الوسائط)
8. [Health & App (الصحة والتطبيق)](#health--app-الصحة-والتطبيق)

---

## 🔐 Authentication (المصادقة)

### `GET /auth`
**الوصف:** يعرض معلومات عن جميع endpoints الخاصة بالمصادقة  
**المصادقة:** غير مطلوبة  
**الاستخدام:** للحصول على قائمة بجميع endpoints المتاحة في قسم المصادقة

**Response:**
```json
{
  "message": "Auth API Endpoints",
  "baseUrl": "https://api.deutsch-tests.com",
  "endpoints": {
    "register": { ... },
    "login": { ... },
    "refresh": { ... },
    "logout": { ... }
  }
}
```

---

### `GET /auth/test`
**الوصف:** صفحة HTML بسيطة لاختبار endpoints المصادقة  
**المصادقة:** غير مطلوبة  
**الاستخدام:** للاختبار السريع لـ register, login, refresh token من المتصفح

---

### `POST /auth/register`
**الوصف:** تسجيل مستخدم جديد  
**المصادقة:** غير مطلوبة  
**الأدوار المسموحة:** الجميع

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "student", // اختياري: student | teacher | admin (افتراضي: student)
  "state": "Bayern" // اختياري: الولاية الألمانية (Bundesland) - مطلوب للطلاب
}
```

**الولايات المدعومة:**
- Baden-Württemberg
- Bayern
- Berlin
- Brandenburg
- Bremen
- Hamburg
- Hessen
- Mecklenburg-Vorpommern
- Niedersachsen
- Nordrhein-Westfalen (NRW)
- Rheinland-Pfalz
- Saarland
- Sachsen
- Sachsen-Anhalt
- Schleswig-Holstein
- Thüringen

**Response (201):**
```json
{
  "message": "registered",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "role": "student",
    "state": "Bayern"
  }
}
```

**الاستخدام:** عند إنشاء حساب جديد لأي مستخدم (طالب، معلم، أو أدمن)

---

### `POST /auth/login`
**الوصف:** تسجيل الدخول والحصول على tokens  
**المصادقة:** غير مطلوبة  
**الأدوار المسموحة:** الجميع

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "role": "student"
  }
}
```

**الاستخدام:** عند تسجيل الدخول - احفظ `accessToken` و `refreshToken` للاستخدام لاحقاً

---

### `POST /auth/refresh`
**الوصف:** تجديد access token باستخدام refresh token  
**المصادقة:** غير مطلوبة (لكن يحتاج refresh token)

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**الاستخدام:** عندما ينتهي صلاحية `accessToken`، استخدم `refreshToken` للحصول على token جديد

---

### `POST /auth/logout`
**الوصف:** تسجيل الخروج (إبطال refresh token)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** الجميع

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**الاستخدام:** عند تسجيل الخروج - احذف tokens من التخزين المحلي

---

### `GET /auth/check/:email`
**الوصف:** التحقق من وجود مستخدم بالبريد الإلكتروني  
**المصادقة:** غير مطلوبة  
**الاستخدام:** للتحقق من وجود حساب قبل التسجيل

**Response:**
```json
{
  "exists": true,
  "email": "user@example.com"
}
```

---

### `GET /auth/debug/users`
**الوصف:** عرض جميع المستخدمين (للتطوير فقط)  
**المصادقة:** غير مطلوبة  
**الاستخدام:** للتطوير والاختبار فقط

---

### `GET /auth/debug/user/:email`
**الوصف:** عرض معلومات مستخدم محدد (للتطوير فقط)  
**المصادقة:** غير مطلوبة  
**الاستخدام:** للتطوير والاختبار فقط

---

## 👥 Users (المستخدمون)

### `GET /users/me`
**الوصف:** الحصول على معلومات المستخدم الحالي  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** الجميع (student, teacher, admin)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "id": "...",
  "email": "user@example.com",
  "role": "student",
  "name": "John Doe",
  "state": "Bayern", // الولاية الألمانية (إن وجدت)
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**الاستخدام:** للحصول على معلومات المستخدم المسجل دخوله حالياً (لعرض الملف الشخصي)

---

### `PATCH /users/me`
**الوصف:** تحديث الملف الشخصي (الاسم، الولاية)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** الجميع (student, teacher, admin)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "name": "John Doe", // اختياري
  "state": "Bayern" // اختياري: الولاية الألمانية (Bundesland)
}
```

**الولايات المدعومة:**
- Baden-Württemberg
- Bayern
- Berlin
- Brandenburg
- Bremen
- Hamburg
- Hessen
- Mecklenburg-Vorpommern
- Niedersachsen
- Nordrhein-Westfalen (NRW)
- Rheinland-Pfalz
- Saarland
- Sachsen
- Sachsen-Anhalt
- Schleswig-Holstein
- Thüringen

**Response (200):**
```json
{
  "id": "...",
  "email": "user@example.com",
  "role": "student",
  "name": "John Doe",
  "state": "Bayern",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**الاستخدام:** للطلاب لتحديث الولاية (Bundesland) في ملفهم الشخصي - مطلوب لاختبارات "Deutschland in Leben"

---

### `PATCH /users/me/state`
**الوصف:** تحديث الولاية فقط (اختصار)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** الجميع (student, teacher, admin)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "state": "Bayern"
}
```

**Response (200):**
```json
{
  "id": "...",
  "email": "user@example.com",
  "role": "student",
  "state": "Bayern",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**الاستخدام:** تحديث سريع للولاية فقط (بدون تحديث الاسم)

---

### `PATCH /users/role/:id`
**الوصف:** تغيير دور مستخدم (admin فقط)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** admin فقط

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "role": "teacher" // student | teacher | admin
}
```

**Response (200):**
```json
{
  "message": "Role updated successfully",
  "user": {
    "id": "...",
    "email": "...",
    "role": "teacher"
  }
}
```

**الاستخدام:** للأدمن لتغيير دور أي مستخدم (مثلاً ترقية طالب إلى معلم)

---

## 📝 Exams (الامتحانات)

### `POST /exams`
**الوصف:** إنشاء امتحان جديد  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "title": "امتحان اللغة الألمانية",
  "level": "B1", // اختياري: A1, A2, B1, B2, C1
  "provider": "telc", // اختياري: telc, Goethe, ÖSD, ECL, DTB, DTZ, Deutschland-in-Leben, Grammatik, Wortschatz
  "sections": [
    {
      "name": "Hören - Teil 1",
      "quota": 3, // عدد الأسئلة العشوائية
      "tags": ["Hören", "Teil-1"], // اختياري: للفلترة
      "difficultyDistribution": { // اختياري
        "easy": 1,
        "medium": 1,
        "hard": 1
      }
    },
    {
      "name": "Bayern Fragen",
      "quota": 3,
      "tags": ["Bayern"] // للفلترة حسب الولاية
    }
  ],
  "randomizeQuestions": true, // خلط ترتيب الأسئلة
  "attemptLimit": 3, // عدد المحاولات المسموحة (0 = غير محدود)
  "timeLimitMin": 60, // الوقت بالدقائق (0 = غير محدود)
  "status": "draft" // draft | published | archived
}
```

**Response (201):**
```json
{
  "id": "...",
  "title": "امتحان اللغة الألمانية",
  "level": "B1",
  "provider": "telc",
  "status": "draft",
  "sections": [
    {
      "name": "Hören - Teil 1",
      "quota": 3,
      "tags": ["Hören", "Teil-1"]
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 3,
  "timeLimitMin": 60,
  "ownerId": "teacherId",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**الاستخدام:** للمعلمين والأدمن لإنشاء امتحان جديد

---

### `GET /exams`
**الوصف:** الحصول على قائمة الامتحانات  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `status`: فلترة حسب الحالة (draft/published/archived)
- `level`: فلترة حسب المستوى (A1, A2, B1, B2, C1)
- `provider`: فلترة حسب المزود (telc, Goethe, ÖSD, etc.)

**Response (200):**
```json
{
  "items": [
    {
      "id": "...",
      "title": "...",
      "level": "B1",
      "provider": "telc",
      "status": "published",
      ...
    }
  ],
  "count": 50
}
```

**الاستخدام:** 
- **المعلم:** يرى امتحاناته فقط
- **الأدمن:** يرى جميع الامتحانات

---

### `GET /exams/available`
**الوصف:** الحصول على قائمة الامتحانات المتاحة للطلاب  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student فقط

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `level`: فلترة حسب المستوى (A1, A2, B1, B2, C1)
- `provider`: فلترة حسب المزود (telc, Goethe, ÖSD, etc.)

**Response (200):**
```json
{
  "items": [
    {
      "id": "...",
      "title": "...",
      "level": "B1",
      "provider": "telc",
      "status": "published",
      "attemptLimit": 3,
      "timeLimitMin": 60,
      ...
    }
  ],
  "count": 25
}
```

**الاستخدام:** للطالب لرؤية جميع الامتحانات المتاحة له (منشورة وغير مخصصة أو مخصصة له، ولم يتجاوز حد المحاولات)

---

### `GET /exams/:id`
**الوصف:** الحصول على تفاصيل امتحان محدد  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student, teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "id": "...",
  "title": "...",
  "description": "...",
  "questions": [
    {
      "id": "...",
      "text": "...",
      "type": "multiple-choice",
      ...
    }
  ],
  "attemptLimit": 3,
  "timeLimitMin": 60,
  "isPublished": true,
  ...
}
```

**الاستخدام:** 
- **الطالب:** لرؤية تفاصيل الامتحان قبل البدء
- **المعلم/الأدمن:** لمراجعة الامتحان

---

### `PATCH /exams/:id`
**الوصف:** تحديث امتحان  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin (المالك فقط أو الأدمن)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:** (جميع الحقول اختيارية)
```json
{
  "title": "عنوان محدث",
  "level": "B1",
  "provider": "telc",
  "sections": [
    {
      "name": "Hören - Teil 1",
      "quota": 3,
      "tags": ["Hören", "Teil-1"]
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 5,
  "timeLimitMin": 90,
  "status": "published"
}
```

**Response (200):**
```json
{
  "id": "...",
  "title": "عنوان محدث",
  ...
}
```

**الاستخدام:** لتعديل امتحان موجود (يمكن تعديل الأسئلة، الوقت، الحدود، إلخ)

---

### `POST /exams/:id/assign`
**الوصف:** إسناد امتحان لطلاب محددين  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "studentIds": ["studentId1", "studentId2", "studentId3"],
  "classId": "classId123" // اختياري: بدلاً من studentIds
}
```

**ملاحظة:** يمكن استخدام `studentIds` أو `classId` أو كليهما

**Response (200):**
```json
{
  "message": "Exam assigned successfully",
  "assignedCount": 3
}
```

**الاستخدام:** لإسناد امتحان لطلاب محددين (بدلاً من جعله متاحاً للجميع)

---

## ❓ Questions (الأسئلة)

### `POST /questions`
**الوصف:** إنشاء سؤال جديد  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "prompt": "ما هي عاصمة ألمانيا؟",
  "qType": "mcq", // mcq | true_false | fill | match | reorder
  "options": [
    { "text": "برلين", "isCorrect": true },
    { "text": "ميونخ", "isCorrect": false },
    { "text": "هامبورغ", "isCorrect": false }
  ],
  "provider": "telc", // اختياري: telc, Goethe, ÖSD, ECL, DTB, DTZ, Deutschland-in-Leben, Grammatik, Wortschatz
  "section": "Hören", // اختياري: Hören, Lesen, Schreiben, Sprechen
  "level": "B1", // اختياري: A1, A2, B1, B2, C1
  "tags": ["Bayern", "Hören", "Teil-1"], // اختياري: للولايات، المواضيع، المجالات
  "media": { // اختياري
    "type": "audio", // audio | image | video
    "key": "questions/audio123.mp3",
    "mime": "audio/mpeg"
  },
  "status": "published" // اختياري: draft | published | archived (افتراضي: draft)
}
```

**ملاحظات:**
- للحقول النصية (fill): استخدم `fillExact` أو `regexList`
- للحقول true/false: استخدم `answerKeyBoolean`
- للحقول matching: استخدم `answerKeyMatch` (مصفوفة من الأزواج)
- للحقول reorder: استخدم `answerKeyReorder` (مصفوفة من النصوص)
- للصعوبة: استخدم `tags: ["easy"]` أو `tags: ["medium"]` أو `tags: ["hard"]`

**Response (201):**
```json
{
  "id": "...",
  "prompt": "ما هي عاصمة ألمانيا؟",
  "qType": "mcq",
  "options": [
    { "text": "برلين", "isCorrect": true },
    { "text": "ميونخ", "isCorrect": false }
  ],
  "provider": "telc",
  "section": "Hören",
  "level": "B1",
  "tags": ["Hören", "Teil-1"],
  "status": "published",
  "createdBy": "teacherId",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**الاستخدام:** للمعلمين لإنشاء أسئلة جديدة (يمكن إضافة وسائط مثل صوت أو صورة)

---

### `GET /questions`
**الوصف:** الحصول على قائمة الأسئلة  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `page`: رقم الصفحة (افتراضي: 1)
- `limit`: عدد النتائج (افتراضي: 10)
- `qType`: فلترة حسب نوع السؤال (mcq, true_false, fill, match, reorder)
- `provider`: فلترة حسب المزود (telc, Goethe, ÖSD, etc.)
- `section`: فلترة حسب القسم (Hören, Lesen, Schreiben, Sprechen)
- `level`: فلترة حسب المستوى (A1, A2, B1, B2, C1)
- `state`: فلترة حسب الولاية الألمانية (Bayern, Berlin, etc.) - يتم البحث في tags
- `tags`: فلترة حسب Tags (مفصولة بفواصل: "Bayern,Hören")
- `text`: بحث نصي في نص السؤال
- `status`: فلترة حسب الحالة (draft, published, archived)

**Response (200):**
```json
{
  "data": [
    {
      "id": "...",
      "text": "...",
      "type": "multiple-choice",
      "points": 10,
      ...
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

**الاستخدام:** للمعلمين لتصفح وإدارة الأسئلة

---

### `PATCH /questions/:id`
**الوصف:** تحديث سؤال  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:** (جميع الحقول اختيارية)
```json
{
  "prompt": "نص محدث",
  "qType": "mcq",
  "options": [
    { "text": "خيار 1", "isCorrect": true },
    { "text": "خيار 2", "isCorrect": false }
  ],
  "provider": "telc",
  "section": "Hören",
  "level": "B1",
  "tags": ["Hören", "Teil-1"],
  "status": "published"
}
```

**Response (200):**
```json
{
  "id": "...",
  "text": "نص محدث",
  ...
}
```

**الاستخدام:** لتعديل سؤال موجود (ملاحظة: التعديلات لا تؤثر على المحاولات السابقة بسبب snapshot)

---

### `DELETE /questions/:id`
**الوصف:** حذف سؤال  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `hard`: إذا كان `true`، يحذف السؤال نهائياً (افتراضي: `false` = soft delete)

**Response (200):**
```json
{
  "message": "Question deleted successfully"
}
```

**الاستخدام:** 
- **Soft delete (افتراضي):** يخفي السؤال لكن يحتفظ به في قاعدة البيانات
- **Hard delete:** يحذف السؤال نهائياً (استخدم بحذر!)

---

## 📊 Attempts (المحاولات)

### `GET /attempts`
**الوصف:** الحصول على قائمة محاولات الطالب  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student فقط

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `examId`: (اختياري) فلترة حسب امتحان محدد

**Response (200):**
```json
[
  {
    "id": "attemptId123",
    "examId": "examId123",
    "examTitle": "telc B1 - Hören",
    "examLevel": "B1",
    "examProvider": "telc",
    "status": "submitted",
    "score": 75,
    "totalPoints": 100,
    "startedAt": "2024-01-01T10:00:00.000Z",
    "submittedAt": "2024-01-01T10:45:00.000Z",
    "attemptCount": 1
  }
]
```

**الاستخدام:** للطالب لرؤية جميع محاولاته (أو محاولاته لامتحان محدد)

---

### `POST /attempts`
**الوصف:** بدء محاولة امتحان جديدة  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student فقط

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "examId": "examId123"
}
```

**Response (201):**
```json
{
  "attemptId": "attemptId123",
  "examId": "examId123",
  "status": "in-progress",
  "attemptCount": 1,
  "expiresAt": "2024-01-01T11:00:00.000Z",
  "items": [
    {
      "questionId": "...",
      "qType": "mcq",
      "points": 1,
      "prompt": "...",
      "options": ["خيار 1", "خيار 2", "خيار 3"],
      "mediaType": "audio",
      "mediaUrl": "https://...",
      "mediaMime": "audio/mpeg"
    }
  ]
}
```

**ملاحظات:**
- الأسئلة لا تحتوي على `isCorrect` (لحماية الإجابات)
- ترتيب الخيارات مختلط عشوائياً إذا كان `randomizeQuestions: true`
- الأسئلة مختلطة عشوائياً إذا كان `randomizeQuestions: true`
- **للاختبارات "Deutschland-in-Leben":** يتم استخدام `student.state` (الولاية) تلقائياً لفلترة أسئلة الولاية
  - إذا كان `provider = "Deutschland-in-Leben"` و `student.state = "Bayern"`
  - يتم استبدال tags الولاية في section بـ `student.state` تلقائياً
  - مثال: section مع `tags: ["Bayern"]` → يتم استخدام `student.state` بدلاً منه

**الاستخدام:** للطالب لبدء محاولة جديدة (يتم حفظ snapshot من الأسئلة في هذه اللحظة)

---

### `PATCH /attempts/:attemptId/answer`
**الوصف:** حفظ إجابة لسؤال أثناء المحاولة  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student فقط

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "itemIndex": 0, // رقم السؤال في الامتحان (0-based)
  "questionId": "questionId123",
  "studentAnswerIndexes": [0, 2], // للإجابات المتعددة (multiple-choice)
  "studentAnswerText": "إجابة نصية", // للأسئلة النصية (fill-blank)
  "studentAnswerBoolean": true, // للأسئلة true/false
  "studentAnswerMatch": { "0": "1", "1": "0" }, // للأسئلة matching
  "studentAnswerReorder": [2, 0, 1] // للأسئلة reorder
}
```

**Response (200):**
```json
{
  "id": "attemptId123",
  "answers": [
    {
      "itemIndex": 0,
      "questionId": "questionId123",
      "studentAnswerIndexes": [0, 2],
      "answeredAt": "2024-01-01T10:05:00.000Z"
    }
  ],
  ...
}
```

**الاستخدام:** للطالب لحفظ إجابته أثناء المحاولة (يمكن تحديث الإجابة عدة مرات)

---

### `POST /attempts/:attemptId/submit`
**الوصف:** تسليم المحاولة (إنهاء الامتحان)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student فقط

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{} // فارغ
```

**Response (200):**
```json
{
  "id": "attemptId123",
  "status": "submitted",
  "submittedAt": "2024-01-01T10:45:00.000Z",
  "score": 75, // إذا كان التصحيح تلقائي
  "totalPoints": 100,
  "items": [
    {
      "questionId": "...",
      "studentAnswer": {...},
      "correctAnswer": {...},
      "isCorrect": true,
      "points": 10,
      "maxPoints": 10
    }
  ],
  ...
}
```

**الاستخدام:** للطالب لتسليم المحاولة (يتم التصحيح التلقائي للأسئلة الموضوعية)

---

### `GET /attempts/:attemptId`
**الوصف:** عرض محاولة (النتائج والإجابات)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student, teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "id": "attemptId123",
  "examId": "examId123",
  "studentId": "studentId123",
  "status": "submitted",
  "score": 75,
  "totalPoints": 100,
  "startedAt": "2024-01-01T10:00:00.000Z",
  "submittedAt": "2024-01-01T10:45:00.000Z",
  "items": [
    {
      "question": {
        "id": "...",
        "text": "...",
        "type": "multiple-choice",
        "options": [...]
      },
      "studentAnswer": {...},
      "correctAnswer": {...},
      "isCorrect": true,
      "points": 10,
      "maxPoints": 10
    }
  ],
  "exam": {
    "title": "...",
    ...
  }
}
```

**الاستخدام:** 
- **الطالب:** لرؤية نتائجه بعد التسليم
- **المعلم/الأدمن:** لمراجعة إجابات الطالب

---

### `POST /attempts/:attemptId/grade`
**الوصف:** إدخال درجات يدوية للأسئلة (للأسئلة النصية أو التي تحتاج تصحيح يدوي)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin (المعلم المالك للامتحان أو الأدمن)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "items": [
    {
      "itemIndex": 0,
      "questionId": "questionId123",
      "points": 8, // الدرجة الممنوحة (من 0 إلى maxPoints)
      "feedback": "إجابة جيدة لكن ناقصة بعض التفاصيل" // اختياري
    },
    {
      "itemIndex": 1,
      "questionId": "questionId456",
      "points": 5,
      "feedback": "إجابة خاطئة"
    }
  ]
}
```

**Response (200):**
```json
{
  "id": "attemptId123",
  "score": 83, // يتم إعادة حساب النتيجة الإجمالية
  "totalPoints": 100,
  "items": [
    {
      "itemIndex": 0,
      "points": 8,
      "maxPoints": 10,
      "feedback": "إجابة جيدة لكن ناقصة بعض التفاصيل"
    },
    ...
  ],
  ...
}
```

**الاستخدام:** للمعلمين لتصحيح الأسئلة النصية أو إعادة تصحيح أي سؤال يدوياً

---

## 📈 Analytics (التحليلات)

### `GET /analytics/overview`
**الوصف:** نظرة عامة على الإحصائيات  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "totalExams": 25,
  "totalQuestions": 150,
  "totalAttempts": 500,
  "averageScore": 72.5,
  "recentActivity": [...],
  "examsByStatus": {
    "published": 20,
    "draft": 5
  }
}
```

**الاستخدام:** للمعلمين والأدمن للحصول على إحصائيات عامة عن النظام

---

### `GET /analytics/exam/:examId`
**الوصف:** تحليلات امتحان محدد  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin (المعلم المالك أو الأدمن)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "examId": "examId123",
  "examTitle": "...",
  "totalAttempts": 50,
  "averageScore": 75.5,
  "completionRate": 0.95,
  "questionStats": [
    {
      "questionId": "...",
      "questionText": "...",
      "correctRate": 0.8,
      "averageTime": 120 // بالثواني
    }
  ],
  "studentStats": [
    {
      "studentId": "...",
      "studentEmail": "...",
      "score": 85,
      "completedAt": "..."
    }
  ]
}
```

**الاستخدام:** للمعلمين لتحليل أداء الطلاب في امتحان معين

---

### `GET /analytics/question/:questionId`
**الوصف:** تحليلات سؤال محدد  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "questionId": "questionId123",
  "questionText": "...",
  "totalAttempts": 200,
  "correctCount": 150,
  "incorrectCount": 50,
  "correctRate": 0.75,
  "averageTime": 45,
  "commonMistakes": [...]
}
```

**الاستخدام:** للمعلمين لتحليل صعوبة السؤال وأداء الطلاب فيه

---

## 🎤 Media (الوسائط)

### `POST /media/upload`
**الوصف:** رفع ملف وسائط (صوت، صورة، فيديو)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Body (FormData):**
```
file: <File>
```

**Response (200):**
```json
{
  "key": "questions/audio123.mp3",
  "mime": "audio/mpeg",
  "url": "https://s3.amazonaws.com/...",
  "private": true
}
```

**الاستخدام:** للمعلمين لرفع ملفات وسائط (صوت، صورة، فيديو) لاستخدامها في الأسئلة

**ملاحظات:**
- الحد الأقصى لحجم الملف: 50MB
- الأنواع المدعومة: audio/*, image/*, video/*
- استخدم الـ `key` في حقل `media.key` عند إنشاء السؤال

---

### `POST /media/upload/student`
**الوصف:** للطلاب - رفع تسجيل صوتي (لأسئلة Sprechen)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student فقط

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Body (FormData):**
```
file: <Audio File>
```

**Response (200):**
```json
{
  "key": "student-recordings/1234567890-abc123.webm",
  "mime": "audio/webm",
  "url": "https://s3.amazonaws.com/...",
  "private": true
}
```

**الاستخدام:** للطلاب لرفع تسجيلاتهم الصوتية في أسئلة Sprechen (المحادثة)

**ملاحظات:**
- الحد الأقصى لحجم الملف: 10MB
- الأنواع المدعومة: audio/* فقط
- استخدم الـ `key` في حقل `studentAnswerAudioKey` عند حفظ الإجابة
- الملفات تُحفظ في مجلد `student-recordings/` منفصل

**مثال الاستخدام:**
1. الطالب يسجل صوته في الفرونت إند
2. يرفع الملف عبر `POST /media/upload/student`
3. يحصل على `key`
4. يحفظ الإجابة عبر `PATCH /attempts/:attemptId/answer` مع `studentAnswerAudioKey`

---

### `GET /media/test`
**الوصف:** صفحة HTML لاختبار رفع الوسائط  
**المصادقة:** غير مطلوبة  
**الاستخدام:** للاختبار السريع لرفع الملفات من المتصفح

---

### `GET /media/mock/:key`
**الوصف:** في وضع Mock، يعيد رسالة توضيحية بدل الملف الفعلي  
**المصادقة:** غير مطلوبة  
**الاستخدام:** للتطوير فقط (عند عدم تكوين S3)

---

## 🏥 Health & App (الصحة والتطبيق)

### `GET /health`
**الوصف:** فحص صحة الخادم  
**المصادقة:** غير مطلوبة  
**الاستخدام:** للتحقق من أن الخادم يعمل بشكل صحيح

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

---

### `GET /`
**الوصف:** معلومات أساسية عن API  
**المصادقة:** غير مطلوبة  
**الاستخدام:** للتحقق من أن API يعمل

**Response (200):**
```json
{
  "ok": true,
  "service": "quiz-backend"
}
```

---

### `GET /protected`
**الوصف:** endpoint محمي للاختبار  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "ok": true,
  "message": "This is a protected route"
}
```

**الاستخدام:** للاختبار فقط - للتحقق من أن المصادقة تعمل بشكل صحيح

---

## 🔑 المصادقة (Authentication)

جميع الـ endpoints المحمية تتطلب:
1. **Bearer Token** في header:
   ```
   Authorization: Bearer <accessToken>
   ```
2. الحصول على `accessToken` من `/auth/login`
3. تجديد `accessToken` من `/auth/refresh` عند انتهاء الصلاحية

---

## 📝 ملاحظات مهمة

### الأدوار (Roles):
- **student:** الطالب - يمكنه بدء المحاولات والإجابة
- **teacher:** المعلم - يمكنه إنشاء وتعديل الامتحانات والأسئلة
- **admin:** الأدمن - جميع الصلاحيات

### Snapshots:
- عند بدء محاولة، يتم حفظ snapshot من الأسئلة
- التعديلات اللاحقة على الأسئلة لا تؤثر على المحاولات السابقة

### التصحيح التلقائي:
- الأسئلة الموضوعية (mcq, true_false, match, reorder) يتم تصحيحها تلقائياً
- الأسئلة النصية (fill) تحتاج تصحيح يدوي من المعلم

### نظام الفلترة:
- **Provider:** للتمييز بين المزودين (telc, Goethe, etc.)
- **Level:** للتمييز بين المستويات (A1-C1)
- **Section:** للتمييز بين الأقسام (Hören, Lesen, etc.)
- **Tags:** للفلترة المتقدمة (الولايات، Teil، المواضيع، المجالات)

### Deutschland in Leben Test:
- كل اختبار يحتوي على قسمين:
  1. أسئلة الولاية (3 أسئلة) - `tags: ["Bayern"]`
  2. أسئلة الـ300 (30 سؤال) - `tags: ["300-Fragen"]`
- الأسئلة عشوائية في كل محاولة

### Prüfungen:
- كل مزود له مستويات مختلفة
- كل مستوى يحتوي على 4 أقسام: Hören, Lesen, Schreiben, Sprechen
- كل قسم يحتوي على عدة Teil (أجزاء فرعية)
- استخدم `tags: ["Hören", "Teil-1"]` للفلترة

### Cron Jobs:
- يتم إغلاق المحاولات المنتهية تلقائياً كل دقيقة
- حتى لو لم يرسل الطالب submit

---

## 📚 Swagger Documentation

إذا كان Swagger مفعّل (`ENABLE_SWAGGER=true`):
- **Development:** `http://localhost:4000/docs`
- **Production:** `http://your-domain.com/docs` (محمي بـ Basic Auth)

---

## 🔗 Base URL

- **Development:** `http://localhost:4000`
- **Production:** حسب إعدادات `CORS_ORIGIN` أو `WEB_APP_ORIGIN`

---

---

## 📚 أمثلة عملية لنظام اللغة الألمانية

### مثال 1: Deutschland in Leben Test - Bayern

**إنشاء Exam:**
```json
POST /exams
{
  "title": "Deutschland in Leben - Bayern",
  "provider": "Deutschland-in-Leben",
  "level": "B1",
  "sections": [
    {
      "name": "Bayern Fragen",
      "quota": 3,
      "tags": ["Bayern"],
      "difficultyDistribution": {
        "easy": 1,    // أسئلة مع tags: ["easy"]
        "medium": 1,  // أسئلة مع tags: ["medium"]
        "hard": 1     // أسئلة مع tags: ["hard"]
      }
    },
    {
      "name": "300 Fragen Pool",
      "quota": 30,
      "tags": ["300-Fragen"]
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 0,
  "timeLimitMin": 60,
  "status": "published"
}
```

**إنشاء سؤال للولاية:**
```json
POST /questions
{
  "prompt": "ما هي عاصمة ولاية بايرن؟",
  "qType": "mcq",
  "options": [
    { "text": "ميونخ", "isCorrect": true },
    { "text": "برلين", "isCorrect": false },
    { "text": "هامبورغ", "isCorrect": false }
  ],
  "provider": "Deutschland-in-Leben",
  "level": "B1",
  "tags": ["Bayern"],
  "status": "published"
}
```

**إنشاء سؤال من الـ300:**
```json
POST /questions
{
  "prompt": "ما هي عاصمة ألمانيا؟",
  "qType": "mcq",
  "options": [
    { "text": "برلين", "isCorrect": true },
    { "text": "ميونخ", "isCorrect": false }
  ],
  "provider": "Deutschland-in-Leben",
  "level": "B1",
  "tags": ["300-Fragen"],
  "status": "published"
}
```

---

### مثال 2: Prüfungen - telc B1 Hören

**إنشاء Exam:**
```json
POST /exams
{
  "title": "telc B1 - Hören",
  "provider": "telc",
  "level": "B1",
  "sections": [
    {
      "name": "Hören - Teil 1",
      "quota": 3,
      "tags": ["Hören", "Teil-1"]
    },
    {
      "name": "Hören - Teil 2",
      "quota": 4,
      "tags": ["Hören", "Teil-2"]
    },
    {
      "name": "Hören - Teil 3",
      "quota": 3,
      "tags": ["Hören", "Teil-3"]
    }
  ],
  "randomizeQuestions": false,
  "attemptLimit": 3,
  "timeLimitMin": 30,
  "status": "published"
}
```

**إنشاء سؤال Hören:**
```json
POST /questions
{
  "prompt": "استمع إلى المحادثة وأجب على السؤال",
  "qType": "mcq",
  "options": [
    { "text": "الإجابة الأولى", "isCorrect": true },
    { "text": "الإجابة الثانية", "isCorrect": false }
  ],
  "provider": "telc",
  "section": "Hören",
  "level": "B1",
  "tags": ["Hören", "Teil-1"],
  "media": {
    "type": "audio",
    "key": "questions/telc-b1-hoeren-1.mp3",
    "mime": "audio/mpeg"
  },
  "status": "published"
}
```

---

### مثال 3: Grammatik - Präsens

**إنشاء سؤال قواعد:**
```json
POST /questions
{
  "prompt": "Ergänzen Sie: Ich ___ gestern nach Hause.",
  "qType": "fill",
  "fillExact": "bin gegangen",
  "provider": "Grammatik",
  "level": "A2",
  "tags": ["Präsens", "Perfekt", "Hilfsverb"],
  "status": "published"
}
```

---

### مثال 4: Wortschatz - Leben

**إنشاء سؤال مفردات:**
```json
POST /questions
{
  "prompt": "ما معنى كلمة 'Haus'؟",
  "qType": "mcq",
  "options": [
    { "text": "بيت", "isCorrect": true },
    { "text": "سيارة", "isCorrect": false },
    { "text": "كتاب", "isCorrect": false }
  ],
  "provider": "Wortschatz",
  "level": "A1",
  "tags": ["Leben", "Wohnen"],
  "status": "published"
}
```

---

### مثال 5: استخدام الطالب

**1. الحصول على الامتحانات المتاحة:**
```http
GET /exams/available?provider=telc&level=B1
Authorization: Bearer <accessToken>
```

**2. بدء محاولة:**
```http
POST /attempts
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "examId": "examId123"
}
```

**3. حفظ إجابة:**
```http
PATCH /attempts/attemptId123/answer
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "itemIndex": 0,
  "questionId": "questionId123",
  "studentAnswerIndexes": [0]
}
```

**4. تسليم المحاولة:**
```http
POST /attempts/attemptId123/submit
Authorization: Bearer <accessToken>
Content-Type: application/json

{}
```

**5. عرض المحاولات:**
```http
GET /attempts?examId=examId123
Authorization: Bearer <accessToken>
```

---

## 🎯 Providers المدعومة

- **telc** - TestDaF-Institut
- **Goethe** - Goethe-Institut
- **ÖSD** - Österreichisches Sprachdiplom
- **ECL** - European Consortium for the Certificate of Attainment
- **DTB** - Deutsch-Test für den Beruf (A2-C1)
- **DTZ** - Deutsch-Test für Zuwanderer (B1 فقط)
- **Deutschland-in-Leben** - اختبار الحياة في ألمانيا
- **Grammatik** - القواعد النحوية
- **Wortschatz** - المفردات

---

## 🎯 Sections المدعومة

- **Hören** - الاستماع
- **Lesen** - القراءة
- **Schreiben** - الكتابة
- **Sprechen** - التحدث

---

## 🎯 Levels المدعومة

- **A1** - المبتدئ
- **A2** - المبتدئ المتقدم
- **B1** - المتوسط
- **B2** - المتوسط المتقدم
- **C1** - المتقدم

---

**آخر تحديث:** 2024

