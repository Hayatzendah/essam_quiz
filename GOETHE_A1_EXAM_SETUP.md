# 📝 دليل إضافة امتحان Goethe-Institut A1 مع أسئلة

## 🎯 الهدف
إضافة امتحان Goethe-Institut A1 يظهر في صفحة Prüfungen في الفرونت.

---

## 📋 الخطوات

### الخطوة 1: تسجيل الدخول والحصول على Token

```
POST https://api.deutsch-tests.com/auth/login
```

**Body:**
```json
{
  "email": "your-teacher-email@example.com",
  "password": "your-password"
}
```

**احفظ `accessToken` من الـ Response**

---

### الخطوة 2: إضافة أسئلة للقسم الأول (Hören - Teil 1)

#### سؤال 1:
```
POST https://api.deutsch-tests.com/questions
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "prompt": "Hören Sie und wählen Sie die richtige Antwort. Was hören Sie?",
  "qType": "mcq",
  "options": [
    { "text": "Guten Morgen", "isCorrect": true },
    { "text": "Guten Abend", "isCorrect": false },
    { "text": "Gute Nacht", "isCorrect": false },
    { "text": "Auf Wiedersehen", "isCorrect": false }
  ],
  "provider": "goethe",
  "section": "Hören",
  "level": "A1",
  "tags": ["Hören", "A1", "Goethe", "Teil-1"],
  "status": "published"
}
```

**احفظ `id` من الـ Response (مثلاً: `"69262594a15c6ab8ea5b2752"`)**

#### سؤال 2:
```json
{
  "prompt": "Hören Sie und wählen Sie die richtige Antwort. Wie heißt die Person?",
  "qType": "mcq",
  "options": [
    { "text": "Anna", "isCorrect": true },
    { "text": "Maria", "isCorrect": false },
    { "text": "Lisa", "isCorrect": false },
    { "text": "Sara", "isCorrect": false }
  ],
  "provider": "goethe",
  "section": "Hören",
  "level": "A1",
  "tags": ["Hören", "A1", "Goethe", "Teil-1"],
  "status": "published"
}
```

#### سؤال 3:
```json
{
  "prompt": "Hören Sie und wählen Sie die richtige Antwort. Wo ist die Person?",
  "qType": "mcq",
  "options": [
    { "text": "Im Supermarkt", "isCorrect": true },
    { "text": "Im Restaurant", "isCorrect": false },
    { "text": "Im Park", "isCorrect": false },
    { "text": "Zu Hause", "isCorrect": false }
  ],
  "provider": "goethe",
  "section": "Hören",
  "level": "A1",
  "tags": ["Hören", "A1", "Goethe", "Teil-1"],
  "status": "published"
}
```

#### سؤال 4:
```json
{
  "prompt": "Hören Sie und wählen Sie die richtige Antwort. Was macht die Person?",
  "qType": "mcq",
  "options": [
    { "text": "Sie kauft ein", "isCorrect": true },
    { "text": "Sie isst", "isCorrect": false },
    { "text": "Sie schläft", "isCorrect": false },
    { "text": "Sie arbeitet", "isCorrect": false }
  ],
  "provider": "goethe",
  "section": "Hören",
  "level": "A1",
  "tags": ["Hören", "A1", "Goethe", "Teil-1"],
  "status": "published"
}
```

#### سؤال 5:
```json
{
  "prompt": "Hören Sie und wählen Sie die richtige Antwort. Wie viel kostet es?",
  "qType": "mcq",
  "options": [
    { "text": "5 Euro", "isCorrect": true },
    { "text": "10 Euro", "isCorrect": false },
    { "text": "15 Euro", "isCorrect": false },
    { "text": "20 Euro", "isCorrect": false }
  ],
  "provider": "goethe",
  "section": "Hören",
  "level": "A1",
  "tags": ["Hören", "A1", "Goethe", "Teil-1"],
  "status": "published"
}
```

**⚠️ مهم:** احفظ جميع الـ IDs من الأسئلة (مثلاً: `q1_id`, `q2_id`, `q3_id`, `q4_id`, `q5_id`)

---

### الخطوة 3: إضافة أسئلة للقسم الثاني (Lesen - Teil 1)

#### سؤال 6:
```json
{
  "prompt": "Lesen Sie den Text und wählen Sie die richtige Antwort. Was steht im Text?",
  "qType": "mcq",
  "options": [
    { "text": "Der Text ist über Familie", "isCorrect": true },
    { "text": "Der Text ist über Arbeit", "isCorrect": false },
    { "text": "Der Text ist über Urlaub", "isCorrect": false },
    { "text": "Der Text ist über Schule", "isCorrect": false }
  ],
  "provider": "goethe",
  "section": "Lesen",
  "level": "A1",
  "tags": ["Lesen", "A1", "Goethe", "Teil-1"],
  "status": "published"
}
```

#### سؤال 7:
```json
{
  "prompt": "Lesen Sie den Text und wählen Sie die richtige Antwort. Wer ist die Hauptperson?",
  "qType": "mcq",
  "options": [
    { "text": "Ein Kind", "isCorrect": true },
    { "text": "Ein Lehrer", "isCorrect": false },
    { "text": "Ein Arzt", "isCorrect": false },
    { "text": "Ein Student", "isCorrect": false }
  ],
  "provider": "goethe",
  "section": "Lesen",
  "level": "A1",
  "tags": ["Lesen", "A1", "Goethe", "Teil-1"],
  "status": "published"
}
```

**⚠️ أضف المزيد من الأسئلة حسب الحاجة (مثلاً 6 أسئلة للقراءة)**

---

### الخطوة 4: إنشاء الامتحان مع الأسئلة

```
POST https://api.deutsch-tests.com/exams
Authorization: Bearer <accessToken>
```

**Body (استبدل `questionId1`, `questionId2`, إلخ بـ IDs الحقيقية من الخطوة 2 و 3):**
```json
{
  "title": "Goethe-Zertifikat A1 - Start Deutsch 1",
  "description": "امتحان Goethe A1 الرسمي - يتضمن جميع المهارات الأربع",
  "level": "A1",
  "provider": "goethe",
  "sections": [
    {
      "name": "Hören - Teil 1",
      "skill": "HOEREN",
      "label": "الاستماع - الجزء الأول",
      "durationMin": 20,
      "partsCount": 5,
      "items": [
        {
          "questionId": "questionId1",
          "points": 1
        },
        {
          "questionId": "questionId2",
          "points": 1
        },
        {
          "questionId": "questionId3",
          "points": 1
        },
        {
          "questionId": "questionId4",
          "points": 1
        },
        {
          "questionId": "questionId5",
          "points": 1
        }
      ]
    },
    {
      "name": "Lesen - Teil 1",
      "skill": "LESEN",
      "label": "القراءة - الجزء الأول",
      "durationMin": 25,
      "partsCount": 4,
      "items": [
        {
          "questionId": "questionId6",
          "points": 1
        },
        {
          "questionId": "questionId7",
          "points": 1
        }
      ]
    }
  ],
  "randomizeQuestions": false,
  "attemptLimit": 3,
  "timeLimitMin": 80,
  "status": "published"
}
```

**⚠️ مهم جداً:**
- استبدل `questionId1`, `questionId2`, إلخ بـ IDs الحقيقية من الخطوة 2 و 3
- تأكد من `"status": "published"` حتى يظهر الامتحان في الفرونت
- `"level": "A1"` و `"provider": "goethe"` يجب أن يطابقا ما في الفرونت

---

### الخطوة 5: التحقق من ظهور الامتحان

```
GET https://api.deutsch-tests.com/exams/public?level=A1&provider=goethe&page=1&limit=20
```

**يجب أن يظهر الامتحان في القائمة!**

---

## ✅ ملخص سريع

1. **تسجيل الدخول** → احصل على `accessToken`
2. **إضافة أسئلة** → احفظ `id` لكل سؤال
3. **إنشاء الامتحان** → استخدم `items` مع `questionId` لكل سؤال
4. **تأكد من `status: "published"`** → حتى يظهر في الفرونت
5. **اختبر** → استخدم `GET /exams/public`

---

## 🔧 نصائح

- **للإضافة السريعة:** استخدم Postman Collection أو أداة مشابهة
- **لإضافة أسئلة كثيرة:** يمكنك استخدام `quota` بدلاً من `items`، لكن يجب أن تكون الأسئلة موجودة في قاعدة البيانات بنفس الـ tags
- **للاختبار:** استخدم `status: "draft"` أولاً، ثم غيره إلى `"published"` بعد التأكد

---

## 📝 مثال كامل (جاهز للنسخ)

إذا أضفت 5 أسئلة وحصلت على IDs:
- `69262594a15c6ab8ea5b2752`
- `69262594a15c6ab8ea5b2753`
- `69262594a15c6ab8ea5b2754`
- `69262594a15c6ab8ea5b2755`
- `69262594a15c6ab8ea5b2756`

**Body للامتحان:**
```json
{
  "title": "Goethe-Zertifikat A1 - Start Deutsch 1",
  "description": "امتحان Goethe A1 الرسمي",
  "level": "A1",
  "provider": "goethe",
  "sections": [
    {
      "name": "Hören - Teil 1",
      "skill": "HOEREN",
      "label": "الاستماع - الجزء الأول",
      "durationMin": 20,
      "partsCount": 5,
      "items": [
        { "questionId": "69262594a15c6ab8ea5b2752", "points": 1 },
        { "questionId": "69262594a15c6ab8ea5b2753", "points": 1 },
        { "questionId": "69262594a15c6ab8ea5b2754", "points": 1 },
        { "questionId": "69262594a15c6ab8ea5b2755", "points": 1 },
        { "questionId": "69262594a15c6ab8ea5b2756", "points": 1 }
      ]
    }
  ],
  "randomizeQuestions": false,
  "attemptLimit": 3,
  "timeLimitMin": 80,
  "status": "published"
}
```


