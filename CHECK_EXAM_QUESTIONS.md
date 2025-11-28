# 🔍 كيفية التحقق من الأسئلة المتاحة للامتحان

## المشكلة:
الامتحان لا يجد أسئلة متاحة (`NO_QUESTIONS_AVAILABLE`)

## الحلول:

### 1. التحقق من حالة الأسئلة (Status)

**المشكلة الأكثر شيوعاً:** الأسئلة غير منشورة (`status: draft`)

**الحل:** تأكد من أن جميع الأسئلة لها `status: "published"`

```
GET https://api.deutsch-tests.com/questions?provider=goethe&level=A1&status=published
Authorization: Bearer <accessToken>
```

**إذا كانت الأسئلة `draft`، قم بتحديثها:**

```
PATCH https://api.deutsch-tests.com/questions/<questionId>
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "status": "published"
}
```

---

### 2. التحقق من الأسئلة في الامتحان (إذا كان يستخدم `items`)

**إذا كان الامتحان يستخدم `items`:**

```
GET https://api.deutsch-tests.com/exams/6926380f721cf4b27545857e
Authorization: Bearer <accessToken>
```

**تحقق من:**
- هل `sections[].items[].questionId` موجودة؟
- هل هذه الأسئلة موجودة في قاعدة البيانات؟
- هل هذه الأسئلة `status: published`؟

**للتحقق من سؤال محدد:**

```
GET https://api.deutsch-tests.com/questions/<questionId>
Authorization: Bearer <accessToken>
```

---

### 3. التحقق من الأسئلة (إذا كان يستخدم `quota`)

**إذا كان الامتحان يستخدم `quota`:**

النظام يبحث عن أسئلة تطابق:
- `level`: يجب أن يطابق `exam.level` (مثلاً: `A1`)
- `provider`: يجب أن يطابق `exam.provider` (مثلاً: `goethe`)
- `tags`: يجب أن تحتوي على tags من `sections[].tags`
- `status`: يجب أن يكون `published`

**للتحقق من الأسئلة المتاحة:**

```
GET https://api.deutsch-tests.com/questions?provider=goethe&level=A1&tags=Hören&status=published
Authorization: Bearer <accessToken>
```

---

## خطوات التشخيص:

### الخطوة 1: احصل على تفاصيل الامتحان

```
GET https://api.deutsch-tests.com/exams/6926380f721cf4b27545857e
Authorization: Bearer <accessToken>
```

**تحقق من:**
- `sections[].items` - هل موجودة؟
- `sections[].quota` - هل موجودة؟
- `sections[].tags` - ما هي الـ tags المطلوبة؟

### الخطوة 2: تحقق من الأسئلة في قاعدة البيانات

**إذا كان يستخدم `items`:**
- تحقق من كل `questionId` في `items`
- تأكد من أن الأسئلة موجودة و `status: published`

**إذا كان يستخدم `quota`:**
- ابحث عن أسئلة تطابق `level`, `provider`, و `tags`
- تأكد من أن الأسئلة `status: published`

### الخطوة 3: قم بتحديث الأسئلة إذا لزم الأمر

**لنشر سؤال:**

```
PATCH https://api.deutsch-tests.com/questions/<questionId>
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "status": "published"
}
```

---

## مثال كامل:

### 1. احصل على تفاصيل الامتحان:

```
GET https://api.deutsch-tests.com/exams/6926380f721cf4b27545857e
```

**Response:**
```json
{
  "_id": "6926380f721cf4b27545857e",
  "title": "Goethe-Zertifikat A1",
  "level": "A1",
  "provider": "goethe",
  "sections": [
    {
      "name": "Hören - Teil 1",
      "items": [
        { "questionId": "69262594a15c6ab8ea5b2752", "points": 1 }
      ]
    }
  ]
}
```

### 2. تحقق من السؤال:

```
GET https://api.deutsch-tests.com/questions/69262594a15c6ab8ea5b2752
```

**إذا كان `status: "draft"`:**

### 3. قم بنشر السؤال:

```
PATCH https://api.deutsch-tests.com/questions/69262594a15c6ab8ea5b2752
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "status": "published"
}
```

---

## نصائح:

1. **استخدم `status: "published"` دائماً** عند إنشاء أسئلة جديدة
2. **تحقق من `questionId`** إذا كان الامتحان يستخدم `items`
3. **تحقق من `tags`** إذا كان الامتحان يستخدم `quota`
4. **استخدم Postman Collection** لإضافة عدة أسئلة دفعة واحدة




