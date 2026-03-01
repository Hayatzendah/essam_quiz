# Learn/Practice Endpoints للطلاب

## Endpoints المتاحة:

### 1. GET /learn/general/questions
**للأسئلة العامة (300 سؤال)**

**Request:**
```
GET /learn/general/questions?page=1&limit=500
```

**Response:**
```json
{
  "page": 1,
  "limit": 500,
  "total": 300,
  "items": [
    {
      "id": "...",
      "prompt": "...",
      "qType": "mcq",
      "options": [...],
      "correctAnswer": "...",
      "correctOptionId": "...",
      "explanation": "...",
      "images": [...],
      "description": "..."
    }
  ]
}
```

### 2. GET /learn/state/questions
**لأسئلة الولاية (10 لكل ولاية)**

**Request:**
```
GET /learn/state/questions?state=Berlin&page=1&limit=50
```

**Response:**
```json
{
  "page": 1,
  "limit": 50,
  "total": 10,
  "state": "Berlin",
  "items": [...]
}
```

### 3. POST /exams/practice (Learn Mode)
**للطلاب - يرجع الأسئلة مع الإجابات**

**Request:**
```json
{
  "mode": "general"  // أو "state"
}
```

**أو للولاية:**
```json
{
  "mode": "state",
  "state": "Berlin"
}
```

**Response:**
```json
{
  "mode": "general",
  "totalQuestions": 300,
  "questions": [...]
}
```

## ملاحظات مهمة:

1. **للحصول على كل الأسئلة بدون pagination:**
   - استخدم `limit=500` أو أكبر
   - أو لا ترسل `limit` (سيُرجع كل الأسئلة)

2. **General Questions:**
   - يجب أن يكون `state` غير موجود أو `null` أو `''`
   - يجب أن يكون `usageCategory='common'` أو `category='general'`

3. **State Questions:**
   - يجب أن يكون `state` محدد (مثل "Berlin")
   - يجب أن يكون `usageCategory='state_specific'` أو `category='state'`

4. **Logging:**
   - تحقق من logs السيرفر لمعرفة عدد الأسئلة المُرجعة
   - ستجد رسائل مثل: `[getLearnGeneralQuestions] Found X general questions`

