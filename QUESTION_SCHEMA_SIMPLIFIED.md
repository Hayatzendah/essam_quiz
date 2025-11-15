# 📋 بنية السؤال المبسطة - نظام اللغة الألمانية

## ✅ **الحقول الأساسية المطلوبة:**

```typescript
{
  _id: ObjectId,                    // تلقائي من MongoDB
  prompt: string,                   // ✅ نص السؤال (مطلوب)
  qType: string,                    // ✅ نوع السؤال: mcq | true_false | fill | match | reorder (مطلوب)
  
  // الإجابات حسب النوع:
  options?: [{                      // ✅ للـ MCQ
    text: string,
    isCorrect: boolean
  }],
  answerKeyBoolean?: boolean,       // ✅ للـ TRUE_FALSE
  fillExact?: string,               // ✅ للـ FILL
  regexList?: string[],             // ✅ للـ FILL (بديل)
  answerKeyMatch?: [[string, string]], // ✅ للـ MATCH
  answerKeyReorder?: string[],      // ✅ للـ REORDER
  
  // الفلترة (لنظامك الألماني):
  provider?: string,                // ✅ telc, Goethe, ÖSD, ECL, DTB, DTZ, Deutschland-in-Leben, Grammatik, Wortschatz
  section?: string,                 // ✅ Hören, Lesen, Schreiben, Sprechen
  level?: string,                   // ✅ A1, A2, B1, B2, C1
  tags?: string[],                  // ✅ للولايات، Teil، المواضيع، المجالات
  
  // الحالة:
  status?: string,                  // ✅ draft | published | archived (افتراضي: draft)
  
  // الوسائط:
  media?: {                         // ✅ اختياري
    type: 'audio' | 'image' | 'video',
    key: string,
    url?: string,
    mime?: string
  },
  
  // تلقائي من MongoDB:
  createdAt: Date,                  // تلقائي
  updatedAt: Date                   // تلقائي
}
```

---

## ❌ **الحقول التي تم إزالتها:**

### 1. `version` ❌
- **السبب:** غير ضروري - نستخدم snapshots في Attempt
- **البديل:** Snapshots تحفظ نسخة من السؤال عند بدء المحاولة

### 2. `difficulty` ❌
- **السبب:** يمكن استخدام tags بدلاً منه
- **البديل:** استخدم `tags: ["easy"]` أو `tags: ["medium"]` أو `tags: ["hard"]`
- **ملاحظة:** إذا كنت تريد استخدام `difficultyDistribution` في ExamSection، يمكن إضافة difficulty كـ tag

### 3. `createdBy` ⚠️
- **الحالة:** اختياري (يبقى في Schema لكن غير مطلوب في DTO)
- **السبب:** للتحكم في الصلاحيات (يمكن للمعلم رؤية أسئلته فقط)

---

## 📝 **مثال مبسط:**

```json
{
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
  "status": "published"
}
```

---

## 🎯 **البنية النهائية:**

### **الحقول المطلوبة:**
- ✅ `prompt` - نص السؤال
- ✅ `qType` - نوع السؤال

### **الحقول حسب النوع:**
- ✅ `options` - للـ MCQ
- ✅ `answerKeyBoolean` - للـ TRUE_FALSE
- ✅ `fillExact` / `regexList` - للـ FILL
- ✅ `answerKeyMatch` - للـ MATCH
- ✅ `answerKeyReorder` - للـ REORDER

### **الحقول للفلترة:**
- ✅ `provider` - المزود
- ✅ `section` - القسم
- ✅ `level` - المستوى
- ✅ `tags` - Tags (للولايات، Teil، المواضيع)

### **الحقول الاختيارية:**
- ✅ `status` - الحالة (افتراضي: draft)
- ✅ `media` - الوسائط
- ⚠️ `createdBy` - المنشئ (اختياري)

---

**النتيجة:** بنية مبسطة ومناسبة تماماً لنظامك الألماني! 🎉


