# تنفيذ قسم Prüfungen (امتحانات Goethe / TELC / ÖSD / ECL / DTB / DTZ)

## ملخص التعديلات

تم إضافة دعم كامل لقسم Prüfungen في الـ Backend باستخدام نفس ExamsModule الموجود، مع إضافة الحقول والواجهات المطلوبة.

---

## 1. تعديلات Exam Schema

### الحقول المضافة:

#### في Exam:
- **`examCategory`**: نوع الامتحان
  - القيم: `'provider_exam' | 'grammar_exam' | 'vocab_exam' | 'lid_exam' | 'other'`
  - مفهرس للبحث السريع
  - قسم Prüfungen يعرض فقط `examCategory = 'provider_exam'`

- **`mainSkill`**: تغطية الامتحان
  - القيم: `'mixed' | 'hoeren' | 'lesen' | 'schreiben' | 'sprechen'`
  - `mixed` = امتحان كامل (كل المهارات)
  - مفهرس للبحث السريع

- **`provider`**: تم توسيع enum لدعم:
  - `'goethe' | 'telc' | 'osd' | 'ecl' | 'dtb' | 'dtz'`
  - بالإضافة للقيم القديمة: `'General' | 'DTZ' | 'Other'`

#### في ExamSection:
- **`key`**: مفتاح فريد للقسم (مثال: `'hoeren_teil1'`)
- **`title`**: عنوان القسم (مثال: `'Hören – Teil 1'`)
- **`skill`**: المهارة (يدعم lowercase و uppercase للتوافق)
  - `'hoeren' | 'lesen' | 'schreiben' | 'sprechen'`
  - أو `'HOEREN' | 'LESEN' | 'SCHREIBEN' | 'SPRECHEN'`
- **`teilNumber`**: رقم الـ Teil (1, 2, 3...)
- **`timeLimitMin`**: وقت هذا القسم بالدقائق (اختياري)

### الفهارس المضافة:
```typescript
ExamSchema.index({ examCategory: 1, provider: 1, level: 1, status: 1 });
ExamSchema.index({ examCategory: 1, mainSkill: 1, status: 1 });
```

---

## 2. تعديلات QueryExamDto

تمت إضافة فلاتر جديدة:

```typescript
@IsOptional()
@IsEnum(['provider_exam', 'grammar_exam', 'vocab_exam', 'lid_exam', 'other'])
examCategory?: 'provider_exam' | 'grammar_exam' | 'vocab_exam' | 'lid_exam' | 'other';

@IsOptional()
@IsEnum(['mixed', 'hoeren', 'lesen', 'schreiben', 'sprechen'])
mainSkill?: 'mixed' | 'hoeren' | 'lesen' | 'schreiben' | 'sprechen';
```

---

## 3. Endpoints الجديدة والمحدثة

### A) GET /exams/providers (جديد)

**الوصف**: إرجاع قائمة مزوّدي الامتحانات المتاحة + مستوياتهم

**المصادقة**: غير مطلوبة (Public endpoint)

**Response**:
```json
[
  {
    "provider": "goethe",
    "levels": ["A1", "A2", "B1", "B2"]
  },
  {
    "provider": "telc",
    "levels": ["A1", "B1", "B2"]
  }
]
```

**الاستخدام**: لبناء كروت المعاهد في صفحة Prüfungen الرئيسية

---

### B) GET /exams (محدث)

**الفلاتر الجديدة المدعومة**:
- `examCategory` - فلترة حسب نوع الامتحان
- `mainSkill` - فلترة حسب المهارة
- `provider` - فلترة حسب المزوّد (موجود مسبقاً)
- `level` - فلترة حسب المستوى (موجود مسبقاً)
- `status` - فلترة حسب الحالة (موجود مسبقاً)

**أمثلة**:

1. جلب كل امتحانات Goethe B1 (full + skills):
```
GET /exams?examCategory=provider_exam&provider=goethe&level=B1&status=published
```

2. جلب امتحانات الاستماع فقط لـ Goethe B1:
```
GET /exams?examCategory=provider_exam&provider=goethe&level=B1&mainSkill=hoeren&status=published
```

3. جلب كل الامتحانات الرسمية المنشورة لأي مزوّد:
```
GET /exams?examCategory=provider_exam&status=published
```

**الصلاحيات**:
- **الطالب**: يشوف فقط الامتحانات المنشورة (`status=published`)
- **المعلم**: يشوف امتحاناته فقط
- **الأدمن**: يشوف كل الامتحانات

---

### C) GET /exams/:id (محدث)

**الوصف**: عرض تفاصيل امتحان معيّن

**Response يتضمن**:
- `provider` - المزوّد
- `level` - المستوى
- `examCategory` - نوع الامتحان
- `mainSkill` - المهارة الرئيسية
- `sections` - مع الحقول الجديدة:
  - `key` - مفتاح القسم
  - `title` - عنوان القسم
  - `skill` - المهارة
  - `teilNumber` - رقم الـ Teil
  - `timeLimitMin` - وقت القسم

**الصلاحيات**:
- **الطالب**: يستطيع الوصول فقط للامتحانات المنشورة من نوع `provider_exam`
- **المعلم/الأدمن**: يمكنهم رؤية كل الامتحانات حسب صلاحياتهم

---

## 4. ربط مع Attempts Module

**لا يوجد تعديلات مطلوبة** في AttemptsModule!

- عند `startAttempt` يتم احترام `examCategory` و `provider` و `level` كما هو مخزّن في الامتحان
- نفس منطق بناء attempt (اختيار الأسئلة بالـ sections / quotas) يعمل بشكل طبيعي

**الاستخدام من الفرونت**:
```javascript
POST /attempts
{
  "examId": "..."
}
```

يعمل مع جميع الامتحانات بما فيها `provider_exam`.

---

## 5. بنية Sections للامتحانات الرسمية

### مثال لامتحان Goethe B1:

```json
{
  "title": "Goethe-Zertifikat B1",
  "provider": "goethe",
  "level": "B1",
  "examCategory": "provider_exam",
  "mainSkill": "mixed",
  "sections": [
    {
      "key": "hoeren_teil1",
      "title": "Hören – Teil 1",
      "skill": "hoeren",
      "teilNumber": 1,
      "timeLimitMin": 20,
      "quota": 5
    },
    {
      "key": "hoeren_teil2",
      "title": "Hören – Teil 2",
      "skill": "hoeren",
      "teilNumber": 2,
      "timeLimitMin": 15,
      "quota": 5
    },
    {
      "key": "lesen_teil1",
      "title": "Lesen – Teil 1",
      "skill": "lesen",
      "teilNumber": 1,
      "timeLimitMin": 30,
      "quota": 10
    }
  ]
}
```

---

## 6. التوافق مع الكود القديم

✅ **جميع التعديلات متوافقة مع الكود القديم**:
- الحقول الجديدة كلها اختيارية (`optional`)
- `skill` يدعم uppercase و lowercase
- `sections` تدعم الحقول القديمة (`name`, `label`, `durationMin`) بالإضافة للحقول الجديدة
- الفلاتر القديمة (`level`, `provider`, `status`) تعمل كما هي

---

## 7. ملاحظات مهمة

1. **examCategory**: يجب تعيينه عند إنشاء امتحان من نوع `provider_exam`
2. **mainSkill**: `mixed` للامتحانات الكاملة، أو مهارة محددة للتدريبات
3. **sections**: يمكن استخدام `key` و `title` و `teilNumber` لتنظيم أفضل
4. **الفهارس**: تمت إضافة فهارس لتحسين أداء البحث

---

## 8. أمثلة استخدام من الفرونت

### جلب قائمة المعاهد:
```javascript
const providers = await fetch('/api/exams/providers');
// [{ provider: 'goethe', levels: ['A1', 'A2', 'B1'] }, ...]
```

### جلب امتحانات معينة:
```javascript
// كل امتحانات Goethe B1
const exams = await fetch('/api/exams?examCategory=provider_exam&provider=goethe&level=B1&status=published');

// امتحانات الاستماع فقط
const hoerenExams = await fetch('/api/exams?examCategory=provider_exam&provider=goethe&level=B1&mainSkill=hoeren&status=published');
```

### بدء محاولة:
```javascript
const attempt = await fetch('/api/attempts', {
  method: 'POST',
  body: JSON.stringify({ examId: '...' })
});
```

---

## 9. الخطوات التالية (اختياري)

يمكن إضافة Collection `exam_providers` لاحقاً إذا احتجنا:
- معلومات إضافية عن كل مزوّد
- شعارات ديناميكية
- وصف لكل مزوّد

لكن حالياً يمكن استخدام `/exams/providers` للحصول على المعلومات الأساسية.

---

## الخلاصة

✅ تم تنفيذ جميع المتطلبات:
- ✅ تعديل Exam Schema
- ✅ إضافة examCategory و mainSkill
- ✅ تعديل sections لدعم key, title, skill, teilNumber
- ✅ إضافة endpoint /exams/providers
- ✅ توسيع فلاتر GET /exams
- ✅ التوافق مع الكود القديم
- ✅ ربط مع Attempts Module (لا يحتاج تعديل)

الفرونت الآن جاهز لاستخدام قسم Prüfungen! 🎉

