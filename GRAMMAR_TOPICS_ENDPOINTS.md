# Grammar Topics Endpoints مع ContentBlocks

## Base URL
```
/grammar/topics
```

## Authentication
جميع الـ endpoints تحتاج JWT Bearer Token:
```
Authorization: Bearer <token>
```

---

## 1. GET /grammar/topics
**جلب قائمة جميع المواضيع (مع فلترة حسب level)**

**Request:**
```
GET /grammar/topics?level=A1
```

**Response:**
```json
{
  "items": [
    {
      "_id": "69218b1bcdedded1d2b5ebbb",
      "title": "Present Tense",
      "slug": "present-tense",
      "level": "A1",
      "shortDescription": "Learn about present tense",
      "tags": ["tense", "present"],
      "contentHtml": null,
      "contentBlocks": [
        {
          "id": "block-1",
          "type": "intro",
          "data": {
            "text": "The present tense is used to describe..."
          }
        },
        {
          "id": "block-2",
          "type": "image",
          "data": {
            "url": "https://example.com/image.jpg",
            "alt": "Present tense examples",
            "caption": "Examples of present tense"
          }
        },
        {
          "id": "block-3",
          "type": "table",
          "data": {
            "title": "Present Tense Conjugation",
            "headers": ["Pronoun", "Verb"],
            "rows": [
              ["I", "am"],
              ["You", "are"],
              ["He/She", "is"]
            ]
          }
        },
        {
          "id": "block-4",
          "type": "youtube",
          "data": {
            "videoId": "dQw4w9WgXcQ",
            "title": "Present Tense Tutorial"
          }
        }
      ],
      "examId": null,
      "sectionTitle": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 2. GET /grammar/topics/:slug
**جلب موضوع محدد بالـ slug**

**Request:**
```
GET /grammar/topics/present-tense?level=A1
```

**Response:**
```json
{
  "_id": "69218b1bcdedded1d2b5ebbb",
  "title": "Present Tense",
  "slug": "present-tense",
  "level": "A1",
  "contentBlocks": [
    // ... نفس البنية أعلاه
  ]
}
```

---

## 3. POST /grammar/topics
**إنشاء موضوع جديد**

**Request:**
```json
{
  "title": "Present Tense",
  "slug": "present-tense",  // اختياري - يتم توليده تلقائياً من title
  "level": "A1",
  "shortDescription": "Learn about present tense",
  "tags": ["tense", "present"],
  "contentBlocks": [
    {
      "id": "block-1",
      "type": "intro",
      "data": {
        "text": "The present tense is used to describe current actions..."
      }
    },
    {
      "id": "block-2",
      "type": "image",
      "data": {
        "url": "https://example.com/image.jpg",
        "alt": "Present tense examples",
        "caption": "Examples of present tense"
      }
    },
    {
      "id": "block-3",
      "type": "table",
      "data": {
        "title": "Present Tense Conjugation",
        "headers": ["Pronoun", "Verb"],
        "rows": [
          ["I", "am"],
          ["You", "are"],
          ["He/She", "is"]
        ]
      }
    },
    {
      "id": "block-4",
      "type": "youtube",
      "data": {
        "videoId": "dQw4w9WgXcQ",
        "title": "Present Tense Tutorial"
      }
    }
  ]
}
```

**Response:**
```json
{
  "_id": "69218b1bcdedded1d2b5ebbb",
  "title": "Present Tense",
  "slug": "present-tense",
  "level": "A1",
  "contentBlocks": [
    // ... نفس الـ blocks المرسلة
  ]
}
```

---

## 4. PATCH /grammar/topics/:id
**تحديث موضوع موجود**

**Request:**
```json
{
  "title": "Updated Title",
  "contentBlocks": [
    {
      "id": "block-1",
      "type": "intro",
      "data": {
        "text": "Updated text..."
      }
    }
  ]
}
```

**Response:**
```json
{
  "_id": "69218b1bcdedded1d2b5ebbb",
  "title": "Updated Title",
  // ... باقي الحقول
}
```

---

## ContentBlock Types

### 1. Intro Block
```json
{
  "id": "block-1",
  "type": "intro",
  "data": {
    "text": "النص هنا..."
  }
}
```

### 2. Image Block
```json
{
  "id": "block-2",
  "type": "image",
  "data": {
    "url": "https://example.com/image.jpg",
    "alt": "نص بديل للصورة",  // اختياري
    "caption": "عنوان الصورة"  // اختياري
  }
}
```

### 3. Table Block
```json
{
  "id": "block-3",
  "type": "table",
  "data": {
    "title": "عنوان الجدول",  // اختياري
    "headers": ["العمود 1", "العمود 2"],
    "rows": [
      ["صف 1 - عمود 1", "صف 1 - عمود 2"],
      ["صف 2 - عمود 1", "صف 2 - عمود 2"]
    ]
  }
}
```

### 4. Youtube Block
```json
{
  "id": "block-4",
  "type": "youtube",
  "data": {
    "videoId": "dQw4w9WgXcQ",  // معرف الفيديو فقط (بدون URL كامل)
    "title": "عنوان الفيديو"  // اختياري
  }
}
```

---

## ملاحظات مهمة:

1. **ترتيب ContentBlocks:**
   - الترتيب محفوظ حسب ترتيب الـ array
   - عند الإرجاع، يتم إرجاع نفس الترتيب

2. **ID Generation:**
   - إذا لم ترسل `id` في الـ block، يتم توليده تلقائياً
   - يُفضل إرسال `id` فريد لكل block

3. **Validation:**
   - كل block type له validation خاص:
     - `intro`: يجب أن يحتوي `data.text`
     - `image`: يجب أن يحتوي `data.url`
     - `table`: يجب أن يحتوي `data.headers` و `data.rows`
     - `youtube`: يجب أن يحتوي `data.videoId`

4. **Legacy Support:**
   - `contentHtml` لا يزال مدعوم للتوافق مع البيانات القديمة
   - لكن يُفضل استخدام `contentBlocks` للبنية الجديدة

---

## مثال كامل للاستخدام:

```javascript
// إنشاء موضوع جديد
const response = await fetch('/grammar/topics', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    title: "Present Tense",
    level: "A1",
    contentBlocks: [
      {
        id: "intro-1",
        type: "intro",
        data: { text: "Introduction text..." }
      },
      {
        id: "img-1",
        type: "image",
        data: { url: "https://example.com/img.jpg" }
      },
      {
        id: "table-1",
        type: "table",
        data: {
          headers: ["A", "B"],
          rows: [["1", "2"]]
        }
      },
      {
        id: "yt-1",
        type: "youtube",
        data: { videoId: "dQw4w9WgXcQ" }
      }
    ]
  })
});
```
