# 🧪 Smoke Tests - Quick API Testing Guide

دليل سريع لاختبار جميع واجهات API باستخدام cURL.

---

## 📋 المتطلبات

- **Base URL**: استبدلي `YOUR-DOMAIN` برابط API الخاص بك
- **cURL**: مثبت على النظام
- **JWT Token**: ستحصلين عليه بعد تسجيل الدخول

---

## 🔐 1. Authentication

### Register (مرة واحدة)

```bash
curl -X POST https://YOUR-DOMAIN/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Teacher",
    "email": "teacher@example.com",
    "password": "P@ssw0rd!",
    "role": "teacher"
  }'
```

**الاستجابة المتوقعة:**
```json
{
  "message": "registered",
  "user": {
    "_id": "...",
    "email": "teacher@example.com",
    "role": "teacher"
  }
}
```

### Register Student

```bash
curl -X POST https://YOUR-DOMAIN/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Student",
    "email": "student@example.com",
    "password": "P@ssw0rd!",
    "role": "student"
  }'
```

### Login (Teacher)

```bash
curl -X POST https://YOUR-DOMAIN/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "P@ssw0rd!"
  }'
```

**الاستجابة:**
```json
{
  "user": { ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**خزّني `accessToken` في متغير:**
```bash
TOKEN="PASTE_ACCESS_TOKEN_HERE"
```

### Login (Student)

```bash
curl -X POST https://YOUR-DOMAIN/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "P@ssw0rd!"
  }'
```

**خزّني token الطالب:**
```bash
TOKEN_S="PASTE_STUDENT_ACCESS_TOKEN_HERE"
```

### Refresh Token

```bash
curl -X POST https://YOUR-DOMAIN/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "PASTE_REFRESH_TOKEN_HERE"
  }'
```

### Logout

```bash
curl -X POST https://YOUR-DOMAIN/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 2. Questions (Teacher/Admin Only)

### Create Question (MCQ)

```bash
curl -X POST https://YOUR-DOMAIN/questions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "ما هي عاصمة ألمانيا؟",
    "qType": "mcq",
    "level": "A1",
    "provider": "DTZ",
    "section": "General",
    "difficulty": "easy",
    "options": [
      {"text": "برلين", "isCorrect": true},
      {"text": "ميونخ", "isCorrect": false},
      {"text": "هامبورغ", "isCorrect": false}
    ],
    "status": "published"
  }'
```

**خزّني `_id` من الاستجابة:**
```bash
QUESTION_ID="PASTE_QUESTION_ID_HERE"
```

### Create Question (True/False)

```bash
curl -X POST https://YOUR-DOMAIN/questions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "برلين هي عاصمة ألمانيا",
    "qType": "true_false",
    "level": "A1",
    "provider": "DTZ",
    "answerKeyBoolean": true,
    "status": "published"
  }'
```

### Create Question (Fill)

```bash
curl -X POST https://YOUR-DOMAIN/questions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "عاصمة ألمانيا هي _____",
    "qType": "fill",
    "level": "A1",
    "provider": "DTZ",
    "fillExact": "برلين",
    "regexList": ["^برلين$", "^berlin$"],
    "status": "published"
  }'
```

### Get Questions (with filters)

```bash
curl -X GET "https://YOUR-DOMAIN/questions?level=A1&status=published&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Update Question

```bash
curl -X PATCH https://YOUR-DOMAIN/questions/$QUESTION_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published"
  }'
```

---

## 📋 3. Exams

### Create Exam (Random with Quota)

```bash
curl -X POST https://YOUR-DOMAIN/exams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "امتحان A1 - الفصل الأول",
    "level": "A1",
    "provider": "DTZ",
    "sections": [
      {
        "name": "General",
        "quota": 5,
        "difficultyDistribution": {
          "easy": 3,
          "medium": 2,
          "hard": 0
        }
      }
    ],
    "randomizeQuestions": true,
    "attemptLimit": 2,
    "timeLimitMin": 20,
    "resultsPolicy": "correct_with_scores",
    "status": "draft"
  }'
```

**خزّني `_id` من الاستجابة:**
```bash
EXAM_ID="PASTE_EXAM_ID_HERE"
```

### Create Exam (Fixed Questions)

```bash
curl -X POST https://YOUR-DOMAIN/exams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "امتحان ثابت",
    "level": "A1",
    "sections": [
      {
        "name": "General",
        "items": [
          {"questionId": "QUESTION_ID_1", "points": 2},
          {"questionId": "QUESTION_ID_2", "points": 3}
        ]
      }
    ],
    "randomizeQuestions": false,
    "attemptLimit": 1,
    "timeLimitMin": 30,
    "status": "draft"
  }'
```

### Publish Exam

```bash
curl -X PATCH https://YOUR-DOMAIN/exams/$EXAM_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published"
  }'
```

### Get Exams

```bash
curl -X GET "https://YOUR-DOMAIN/exams?status=published" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Exam Details

```bash
curl -X GET https://YOUR-DOMAIN/exams/$EXAM_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ 4. Attempts (Student)

### Start Attempt

```bash
curl -X POST https://YOUR-DOMAIN/attempts \
  -H "Authorization: Bearer $TOKEN_S" \
  -H "Content-Type: application/json" \
  -d '{
    "examId": "'$EXAM_ID'"
  }'
```

**الاستجابة:**
```json
{
  "attemptId": "...",
  "examId": "...",
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

**خزّني `attemptId`:**
```bash
ATTEMPT_ID="PASTE_ATTEMPT_ID_HERE"
```

### Answer Question (MCQ)

```bash
curl -X PATCH https://YOUR-DOMAIN/attempts/$ATTEMPT_ID/answer \
  -H "Authorization: Bearer $TOKEN_S" \
  -H "Content-Type: application/json" \
  -d '{
    "itemIndex": 0,
    "studentAnswerIndexes": [0]
  }'
```

### Answer Question (Fill)

```bash
curl -X PATCH https://YOUR-DOMAIN/attempts/$ATTEMPT_ID/answer \
  -H "Authorization: Bearer $TOKEN_S" \
  -H "Content-Type: application/json" \
  -d '{
    "itemIndex": 1,
    "studentAnswerText": "برلين"
  }'
```

### Answer Question (True/False)

```bash
curl -X PATCH https://YOUR-DOMAIN/attempts/$ATTEMPT_ID/answer \
  -H "Authorization: Bearer $TOKEN_S" \
  -H "Content-Type: application/json" \
  -d '{
    "itemIndex": 2,
    "studentAnswerBoolean": true
  }'
```

### Submit Attempt

```bash
curl -X POST https://YOUR-DOMAIN/attempts/$ATTEMPT_ID/submit \
  -H "Authorization: Bearer $TOKEN_S" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**الاستجابة:**
```json
{
  "attemptId": "...",
  "status": "submitted",
  "totalAutoScore": 8,
  "totalMaxScore": 10,
  "finalScore": 8
}
```

### Get Attempt (Student View)

```bash
curl -X GET https://YOUR-DOMAIN/attempts/$ATTEMPT_ID \
  -H "Authorization: Bearer $TOKEN_S"
```

---

## 👨‍🏫 5. Manual Grading (Teacher/Admin)

### Grade Attempt

```bash
curl -X POST https://YOUR-DOMAIN/attempts/$ATTEMPT_ID/grade \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "questionId": "QUESTION_ID_FOR_WRITING",
        "score": 3
      }
    ]
  }'
```

### Get Attempt (Teacher View - Full Details)

```bash
curl -X GET https://YOUR-DOMAIN/attempts/$ATTEMPT_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 6. Analytics (Teacher/Admin Only)

### Get Overview

```bash
curl -X GET https://YOUR-DOMAIN/analytics/overview \
  -H "Authorization: Bearer $TOKEN"
```

### Get Exam Analytics

```bash
curl -X GET https://YOUR-DOMAIN/analytics/exam/$EXAM_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Get Question Analytics

```bash
curl -X GET https://YOUR-DOMAIN/analytics/question/$QUESTION_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 7. Testing Policies

### Test `only_scores` Policy

1. أنشئي امتحان بـ `resultsPolicy: "only_scores"`
2. ابدئي محاولة وسلّميها
3. تحققي أن الاستجابة تحتوي فقط على الدرجات (بدون items)

### Test `correct_with_scores` Policy

1. أنشئي امتحان بـ `resultsPolicy: "correct_with_scores"`
2. ابدئي محاولة وسلّميها
3. تحققي أن الاستجابة تحتوي على items مع الإجابات الصحيحة

### Test `explanations_with_scores` Policy

1. أنشئي امتحان بـ `resultsPolicy: "explanations_with_scores"`
2. ابدئي محاولة وسلّميها
3. تحققي أن الاستجابة تحتوي على explanations

---

## 🔍 8. Testing Snapshot

### اختبار Snapshot

1. أنشئي سؤال
2. ابدئي محاولة (سيتم حفظ snapshot)
3. عدّلي السؤال الأصلي (غيّري prompt أو options)
4. سلّمي المحاولة
5. تحققي أن التصحيح يعتمد على البيانات الأصلية (من snapshot)

---

## 🧪 9. Complete Flow Test

### سيناريو كامل من البداية للنهاية:

```bash
# 1. Register Teacher
curl -X POST https://YOUR-DOMAIN/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Teacher","email":"t@test.com","password":"12345678","role":"teacher"}'

# 2. Login Teacher
TOKEN=$(curl -s -X POST https://YOUR-DOMAIN/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"t@test.com","password":"12345678"}' | jq -r '.accessToken')

# 3. Create Question
QUESTION_ID=$(curl -s -X POST https://YOUR-DOMAIN/questions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"2+2=?","qType":"mcq","level":"A1","options":[{"text":"3","isCorrect":false},{"text":"4","isCorrect":true}],"status":"published"}' | jq -r '._id')

# 4. Create Exam
EXAM_ID=$(curl -s -X POST https://YOUR-DOMAIN/exams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Exam","level":"A1","sections":[{"name":"General","quota":1}],"status":"published"}' | jq -r '._id')

# 5. Register Student
curl -X POST https://YOUR-DOMAIN/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Student","email":"s@test.com","password":"12345678","role":"student"}'

# 6. Login Student
TOKEN_S=$(curl -s -X POST https://YOUR-DOMAIN/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"s@test.com","password":"12345678"}' | jq -r '.accessToken')

# 7. Start Attempt
ATTEMPT_ID=$(curl -s -X POST https://YOUR-DOMAIN/attempts \
  -H "Authorization: Bearer $TOKEN_S" \
  -H "Content-Type: application/json" \
  -d "{\"examId\":\"$EXAM_ID\"}" | jq -r '.attemptId')

# 8. Answer
curl -X PATCH https://YOUR-DOMAIN/attempts/$ATTEMPT_ID/answer \
  -H "Authorization: Bearer $TOKEN_S" \
  -H "Content-Type: application/json" \
  -d '{"itemIndex":0,"studentAnswerIndexes":[1]}'

# 9. Submit
curl -X POST https://YOUR-DOMAIN/attempts/$ATTEMPT_ID/submit \
  -H "Authorization: Bearer $TOKEN_S" \
  -H "Content-Type: application/json" \
  -d '{}'

# 10. View Results
curl -X GET https://YOUR-DOMAIN/attempts/$ATTEMPT_ID \
  -H "Authorization: Bearer $TOKEN_S"
```

---

## ⚠️ ملاحظات

- استبدلي `YOUR-DOMAIN` برابط API الخاص بك
- استخدمي `jq` لاستخراج القيم من JSON (أو استخرجيها يدوياً)
- تأكدي من أن الأسئلة موجودة قبل إنشاء الامتحان
- تأكدي من أن الامتحان `published` قبل بدء المحاولة

---

## ✅ Checklist

- [ ] Register & Login يعمل
- [ ] Create Question يعمل
- [ ] Create Exam يعمل
- [ ] Publish Exam يعمل
- [ ] Start Attempt يعمل
- [ ] Answer Question يعمل
- [ ] Submit Attempt يعمل
- [ ] View Results يعمل (حسب policy)
- [ ] Manual Grading يعمل
- [ ] Analytics يعمل

---

**🎉 إذا كل الاختبارات نجحت، الباك إند جاهز!**

