# 📚 Quiz Backend API

نظام إدارة الكويزات التعليمي - Backend API مبني باستخدام NestJS و TypeScript مع قاعدة بيانات MongoDB.

## 📋 المحتويات

- [المميزات](#المميزات)
- [المتطلبات](#المتطلبات)
- [التثبيت والتشغيل](#التثبيت-والتشغيل)
- [هيكلية قاعدة البيانات](#هيكلية-قاعدة-البيانات)
- [منطق التوليد العشوائي](#منطق-التوليد-العشوائي)
- [منطق التصحيح الآلي](#منطق-التصحيح-الآلي)
- [سياسات عرض النتائج](#سياسات-عرض-النتائج)
- [مثال تدفق عمل كامل](#مثال-تدفق-عمل-كامل)
- [الافتراضات والقرارات](#الافتراضات-والقرارات)
- [النشر على Railway](#النشر-على-railway)
- [الاختبارات](#الاختبارات)

---

## ✨ المميزات

- 🔐 **المصادقة**: JWT Authentication مع Access & Refresh Tokens
- 👥 **إدارة المستخدمين**: دعم أدوار Student, Teacher, Admin
- 📝 **إدارة الأسئلة**: دعم أنواع متعددة (MCQ, True/False, Fill, Match, Reorder)
- 📋 **إدارة الامتحانات**: إنشاء امتحانات مع أسئلة ثابتة أو عشوائية
- ✅ **تتبع المحاولات**: تتبع محاولات الطلاب مع snapshot للأسئلة
- 🎲 **توليد عشوائي حتمي**: نفس الأسئلة لنفس المحاولة
- 🤖 **تصحيح آلي**: تصحيح تلقائي لمعظم أنواع الأسئلة
- 📊 **تحليلات**: إحصائيات وأداء الامتحانات والأسئلة
- 🎯 **سياسات النتائج**: تحكم في ما يظهر للطالب بعد التسليم
- 🕐 **إدارة الوقت**: دعم زمن محدد للامتحانات مع إغلاق تلقائي
- 📁 **الوسائط**: دعم رفع الملفات (صوت، صورة، فيديو) مع S3

---

## 📦 المتطلبات

- **Node.js** >= 18.x
- **MongoDB** >= 5.0 (محلي أو Atlas)
- **npm** أو **yarn**

---

## 🚀 التثبيت والتشغيل

### 1. تثبيت الحزم

```bash
npm install
```

### 2. إعداد متغيرات البيئة

انسخ ملف `.env.example` إلى `.env` وعدّل القيم:

```bash
cp .env.example .env
```

عدّل القيم المطلوبة في `.env`:
- `MONGO_URI`: رابط قاعدة البيانات
- `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET`: مفاتيح JWT (يجب أن تكون قوية)
- `WEB_APP_ORIGIN`: رابط الواجهة الأمامية

### 3. تشغيل التطبيق

```bash
# وضع التطوير (مع auto-reload)
npm run start:dev

# وضع الإنتاج
npm run build
npm run start:prod
```

التطبيق سيعمل على `http://localhost:4000`

### 4. الوصول إلى Swagger (اختياري)

إذا كان `ENABLE_SWAGGER=true`:
- **Development**: `http://localhost:4000/docs`
- **Production**: محمي بـ Basic Auth (استخدم `SWAGGER_USER` و `SWAGGER_PASSWORD`)

---

## 🗄️ هيكلية قاعدة البيانات

### المجموعات (Collections)

#### 1. **users**
```typescript
{
  _id: ObjectId,
  name: string,
  email: string (unique, indexed),
  password: string (hashed),
  role: 'student' | 'teacher' | 'admin',
  refreshTokenHash?: string,
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. **questions**
```typescript
{
  _id: ObjectId,
  prompt: string,
  qType: 'mcq' | 'true_false' | 'fill' | 'match' | 'reorder',
  options?: [{ text: string, isCorrect: boolean }], // MCQ
  answerKeyBoolean?: boolean, // TRUE/FALSE
  fillExact?: string, // FILL
  regexList?: string[], // FILL
  answerKeyMatch?: [[string, string]], // MATCH
  answerKeyReorder?: string[], // REORDER
  provider?: string,
  section?: string,
  level?: string,
  difficulty?: 'easy' | 'medium' | 'hard',
  tags: string[],
  status: 'draft' | 'published' | 'archived',
  version: number,
  createdBy?: ObjectId,
  media?: { type, key, url, mime, provider },
  createdAt: Date,
  updatedAt: Date
}
```

**الفهارس:**
- `{ provider: 1, level: 1 }`
- `{ section: 1, level: 1 }`
- `{ status: 1, qType: 1 }`
- `{ prompt: 'text' }` (بحث نصي)
- `{ tags: 1 }`

#### 3. **exams**
```typescript
{
  _id: ObjectId,
  title: string,
  level?: string,
  status: 'draft' | 'published' | 'archived',
  sections: [{
    name: string,
    items?: [{ questionId: ObjectId, points: number }], // أسئلة ثابتة
    quota?: number, // عدد أسئلة عشوائية
    difficultyDistribution?: { easy: number, medium: number, hard: number },
    randomize?: boolean
  }],
  randomizeQuestions: boolean,
  attemptLimit: number (0 = غير محدود),
  timeLimitMin: number (0 = غير محدود),
  resultsPolicy: 'only_scores' | 'correct_with_scores' | 'explanations_with_scores' | 'release_delayed',
  ownerId: ObjectId (indexed),
  assignedClassId?: ObjectId,
  assignedStudentIds?: ObjectId[],
  createdAt: Date,
  updatedAt: Date
}
```

**الفهارس:**
- `{ ownerId: 1, status: 1 }`
- `{ status: 1, level: 1 }`

#### 4. **attempts**
```typescript
{
  _id: ObjectId,
  examId: ObjectId (indexed),
  studentId: ObjectId (indexed),
  status: 'in_progress' | 'submitted' | 'graded',
  attemptCount: number,
  randomSeed: number, // بذرة عشوائية حتمية
  startedAt: Date,
  submittedAt?: Date,
  expiresAt?: Date,
  timeUsedSec: number,
  items: [{
    questionId: ObjectId,
    qType: string,
    points: number,
    // Snapshot
    promptSnapshot?: string,
    optionsText?: string[],
    optionOrder?: number[],
    // Answer Keys (مخفية عن الطالب)
    answerKeyBoolean?: boolean,
    fillExact?: string,
    regexList?: string[],
    correctOptionIndexes?: number[],
    answerKeyMatch?: [[string, string]],
    answerKeyReorder?: string[],
    // Student Answers
    studentAnswerIndexes?: number[],
    studentAnswerText?: string,
    studentAnswerBoolean?: boolean,
    studentAnswerMatch?: [[string, string]],
    studentAnswerReorder?: string[],
    // Scores
    autoScore: number,
    manualScore: number
  }],
  totalAutoScore: number,
  totalManualScore: number,
  totalMaxScore: number,
  finalScore: number,
  released?: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**الفهارس:**
- `{ examId: 1, studentId: 1, status: 1 }`

### العلاقات

- `Exam.ownerId` → `User._id` (المعلم المالك)
- `Exam.sections[].items[].questionId` → `Question._id`
- `Attempt.examId` → `Exam._id`
- `Attempt.studentId` → `User._id`
- `Attempt.items[].questionId` → `Question._id` (snapshot)

---

## 🎲 منطق التوليد العشوائي

### البذرة (Seed)

يتم توليد بذرة عشوائية حتمية لكل محاولة باستخدام:

```typescript
seed = SHA256(examId + studentId + attemptCount + SECRET_RANDOM_SERVER)
```

هذا يضمن:
- ✅ نفس الطالب + نفس الامتحان + نفس رقم المحاولة = نفس الأسئلة
- ✅ طلاب مختلفون = أسئلة مختلفة
- ✅ محاولات مختلفة = أسئلة مختلفة

### اختيار الأسئلة

1. **تجميع المرشحين**: جلب جميع الأسئلة المنشورة التي تطابق:
   - `level` الامتحان
   - `provider` الامتحان
   - `section` المطلوب

2. **تطبيق Quotas**: لكل قسم:
   - إذا كان `quota` محدد: اختيار عشوائي لعدد الأسئلة المطلوب
   - إذا كان `difficultyDistribution` محدد: توزيع حسب الصعوبة

3. **الخلط**: إذا كان `randomizeQuestions = true`: خلط ترتيب الأسئلة

4. **خلط الخيارات**: إذا كان السؤال MCQ: خلط ترتيب الخيارات (لكن حفظ `correctOptionIndexes` الجديدة)

### المولد العشوائي

يستخدم **Mulberry32** algorithm:
- يأخذ seed (رقم 32-bit)
- يعيد دالة `rng()` تعطي أرقام عشوائية بين [0, 1)
- حتمي: نفس الـ seed = نفس التسلسل

---

## 🤖 منطق التصحيح الآلي

### 1. MCQ (اختيار متعدد)

**Single Choice** (خيار واحد صحيح):
- ✅ إجابة صحيحة = الدرجة الكاملة
- ❌ إجابة خاطئة = 0

**Multiple Choice** (عدة خيارات صحيحة):
- حساب نسبة الإجابات الصحيحة: `(عدد الإجابات الصحيحة المختارة) / (إجمالي الإجابات الصحيحة)`
- الدرجة = `points × النسبة`

**مثال**: سؤال 3 نقاط، 3 إجابات صحيحة، الطالب اختار 2 صحيحة:
- النسبة = 2/3 = 0.667
- الدرجة = 3 × 0.667 = 2

### 2. TRUE/FALSE

- ✅ تطابق = الدرجة الكاملة
- ❌ عدم تطابق = 0

### 3. FILL (ملء الفراغ)

1. **تطبيع الإجابة**: إزالة المسافات الزائدة، تحويل لحروف صغيرة، إزالة التشكيل العربي
2. **مقارنة مع `fillExact`**: تطابق تام = الدرجة الكاملة
3. **مقارنة مع `regexList`**: أي regex يطابق = الدرجة الكاملة
4. ❌ لا تطابق = 0

### 4. MATCH (المطابقة)

- لكل زوج `[left, right]` صحيح: `points / (عدد الأزواج الكلي)`
- **مثال**: 5 أزواج، 3 صحيحة، السؤال 5 نقاط:
  - الدرجة = 5 × (3/5) = 3

### 5. REORDER (إعادة الترتيب)

- حساب عدد العناصر في الموضع الصحيح
- النسبة = `(عدد المواضع الصحيحة) / (إجمالي العناصر)`
- الدرجة = `points × النسبة`

**مثال**: 5 عناصر، 3 في الموضع الصحيح، السؤال 5 نقاط:
- النسبة = 3/5 = 0.6
- الدرجة = 5 × 0.6 = 3

### 6. SHORT_ANSWER / WRITING / SPEAKING

- ❌ **لا تصحيح آلي**: `autoScore = 0`
- ✅ **يحتاج تقييم يدوي**: المدرس يدخل `manualScore`

---

## 📊 سياسات عرض النتائج

يتم تحديد السياسة في `Exam.resultsPolicy`:

### 1. `only_scores`
- يعرض للطالب: الدرجات فقط (finalScore, totalMaxScore)
- ❌ لا يعرض: الأسئلة، الإجابات، الإجابات الصحيحة

### 2. `correct_with_scores`
- يعرض: الدرجات + الأسئلة + إجابات الطالب + الإجابات الصحيحة
- ✅ يعرض: أي خيار كان صحيحاً، أي إجابة كانت صحيحة

### 3. `explanations_with_scores`
- يعرض: كل ما في `correct_with_scores` + الشروحات (explanation)
- ✅ يعرض: شرح لكل سؤال أو خيار

### 4. `release_delayed`
- ❌ لا يعرض أي شيء حتى يسمح المدرس
- يعرض رسالة: "سيتم إعلان النتائج لاحقًا"
- المدرس يمكنه تفعيل `attempt.released = true` لاحقاً

**ملاحظة**: المدرس/الإدمن يرى كل التفاصيل دائماً بغض النظر عن السياسة.

---

## 🔄 مثال تدفق عمل كامل

### 1. المدرس ينشئ سؤال

```http
POST /questions
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "prompt": "ما هي عاصمة ألمانيا؟",
  "qType": "mcq",
  "options": [
    { "text": "برلين", "isCorrect": true },
    { "text": "ميونخ", "isCorrect": false },
    { "text": "هامبورغ", "isCorrect": false }
  ],
  "level": "A1",
  "section": "General",
  "status": "published"
}
```

### 2. المدرس ينشئ امتحان

```http
POST /exams
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "title": "امتحان A1 - الفصل الأول",
  "level": "A1",
  "sections": [
    {
      "name": "General",
      "quota": 10,
      "difficultyDistribution": {
        "easy": 5,
        "medium": 3,
        "hard": 2
      }
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 2,
  "timeLimitMin": 60,
  "resultsPolicy": "correct_with_scores",
  "status": "published"
}
```

### 3. الطالب يبدأ محاولة

```http
POST /attempts
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "examId": "507f1f77bcf86cd799439011"
}
```

**الاستجابة:**
```json
{
  "attemptId": "507f191e810c19729de860ea",
  "examId": "507f1f77bcf86cd799439011",
  "status": "in_progress",
  "expiresAt": "2024-01-01T14:00:00Z",
  "items": [
    {
      "questionId": "...",
      "qType": "mcq",
      "points": 1,
      "prompt": "ما هي عاصمة ألمانيا؟",
      "options": ["برلين", "ميونخ", "هامبورغ"]
    }
  ]
}
```

### 4. الطالب يجيب على الأسئلة

```http
PATCH /attempts/507f191e810c19729de860ea/answer
Authorization: Bearer <student_token>
Content-Type: application/json

{
  "itemIndex": 0,
  "studentAnswerIndexes": [0]
}
```

### 5. الطالب يسلم الامتحان

```http
POST /attempts/507f191e810c19729de860ea/submit
Authorization: Bearer <student_token>
Content-Type: application/json

{}
```

**الاستجابة:**
```json
{
  "attemptId": "507f191e810c19729de860ea",
  "status": "submitted",
  "totalAutoScore": 8,
  "totalMaxScore": 10,
  "finalScore": 8
}
```

### 6. المدرس يرى النتائج (إذا كان هناك أسئلة كتابية)

```http
GET /attempts/507f191e810c19729de860ea
Authorization: Bearer <teacher_token>
```

### 7. المدرس يدخل درجات يدوية (إن لزم)

```http
POST /attempts/507f191e810c19729de860ea/grade
Authorization: Bearer <teacher_token>
Content-Type: application/json

{
  "items": [
    { "questionId": "...", "score": 2 }
  ]
}
```

### 8. الطالب يرى النتيجة النهائية

```http
GET /attempts/507f191e810c19729de860ea
Authorization: Bearer <student_token>
```

**الاستجابة** (حسب `resultsPolicy`):
```json
{
  "attemptId": "...",
  "finalScore": 10,
  "totalMaxScore": 10,
  "items": [
    {
      "questionId": "...",
      "prompt": "ما هي عاصمة ألمانيا؟",
      "options": ["برلين", "ميونخ", "هامبورغ"],
      "studentAnswerIndexes": [0],
      "correctOptionIndexes": [0],
      "autoScore": 1
    }
  ]
}
```

---

## ⚙️ الافتراضات والقرارات

### 1. التصحيح الجزئي

- **MCQ Multiple**: ✅ نعم (نسبة الإجابات الصحيحة)
- **MATCH**: ✅ نعم (نسبة الأزواج الصحيحة)
- **REORDER**: ✅ نعم (نسبة المواضع الصحيحة)
- **MCQ Single / TRUE_FALSE / FILL**: ❌ كل أو لا شيء

### 2. التعامل مع نقص الأسئلة

- إذا كان `quota = 10` لكن المتاح فقط 7:
  - ✅ نأخذ الـ 7 المتاحة
  - ⚠️ لا نمنع بدء المحاولة (لكن يمكن إضافة تحذير)

### 3. انتهاء الوقت

- ✅ **Cron Job**: يتحقق كل دقيقة ويغلق المحاولات المنتهية تلقائياً
- ✅ **Client-side**: يجب أن يرسل العميل `submit` عند انتهاء الوقت
- ⚠️ **Backup**: Cron Job كنسخة احتياطية

### 4. Snapshot

- ✅ **يتم حفظ snapshot** عند بدء المحاولة
- ✅ **لا يتأثر** بتعديلات لاحقة على السؤال
- ✅ **يضمن** أن التصحيح يعتمد على البيانات الأصلية

### 5. attemptLimit

- `0` أو `undefined` = غير محدود
- الطالب يمكنه بدء محاولات جديدة حتى يصل للحد

### 6. timeLimitMin

- `0` أو `undefined` = غير محدود
- إذا كان محدد: `expiresAt = startedAt + timeLimitMin`

---

## 🚂 النشر على Railway

راجع [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) للتفاصيل الكاملة.

### الخطوات السريعة:

1. اربطي GitHub repo مع Railway
2. أضيفي Environment Variables (راجع [ENV_VARIABLES.md](./ENV_VARIABLES.md))
3. Railway سيبني وينشر تلقائياً

### Build & Start Commands:
- **Build**: `npm ci && npm run build`
- **Start**: `node dist/main.js`

---

## 🧪 الاختبارات

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov

# CI (كل شيء)
npm run ci
```

---

## 📚 الوثائق الإضافية

- [ENV_VARIABLES.md](./ENV_VARIABLES.md) - مرجع متغيرات البيئة
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - دليل النشر على Railway

---

## 🔮 الخطوات المستقبلية (خارطة الطريق)

- [ ] ربط الامتحان بفصل دراسي (Class)
- [ ] إرسال تنبيهات (Notifications)
- [ ] دعم الذكاء الاصطناعي في تصحيح الكتابة
- [ ] تصدير النتائج (Excel/PDF)
- [ ] Dashboard للمدرسين
- [ ] تطبيق موبايل

---

## 📝 الترخيص

MIT License

---

## 👥 الدعم

للدعم والأسئلة، افتحي issue على GitHub.
