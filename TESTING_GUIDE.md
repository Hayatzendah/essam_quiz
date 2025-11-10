# دليل الاختبار - Testing Guide

## Base URL
```
https://api.deutsch-tests.com
```

---

## المرحلة 1: التسجيل وتسجيل الدخول

### 1. Register - تسجيل مستخدم جديد

**Method:** `POST`  
**URL:** `https://api.deutsch-tests.com/auth/register`  
**Headers:**
```
Content-Type: application/json
```

**Body (طالب):**
```json
{
  "email": "student1@example.com",
  "password": "password123",
  "role": "student"
}
```

**Body (معلم):**
```json
{
  "email": "teacher1@example.com",
  "password": "password123",
  "role": "teacher"
}
```

**Body (أدمن):**
```json
{
  "email": "admin1@example.com",
  "password": "password123",
  "role": "admin"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "69110f74a37deee18fb662c44",
    "email": "student1@example.com",
    "role": "student"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2. Login - تسجيل الدخول

**Method:** `POST`  
**URL:** `https://api.deutsch-tests.com/auth/login`  
**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "student1@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "69110f74a37deee18fb662c44",
    "email": "student1@example.com",
    "role": "student"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**ملاحظات:**
- ✅ احفظي `accessToken` و `refreshToken` للاستخدام لاحقاً
- ✅ `accessToken` صالح لمدة 15 دقيقة (أو حسب الإعدادات)
- ✅ `refreshToken` صالح لمدة 7 أيام

---

## المرحلة 2: اختبار AttemptsModule

بعد الحصول على `accessToken`، يمكنك اختبار endpoints المحاولات:

### 1. بدء محاولة امتحان
**POST** `/attempts`
- يحتاج: `accessToken` (طالب)
- Body: `{ "examId": "..." }`

### 2. حفظ إجابة
**PATCH** `/attempts/:attemptId/answer`
- يحتاج: `accessToken` (طالب)
- Body: حسب نوع السؤال

### 3. تسليم المحاولة
**POST** `/attempts/:attemptId/submit`
- يحتاج: `accessToken` (طالب)

### 4. عرض المحاولة
**GET** `/attempts/:attemptId`
- يحتاج: `accessToken` (طالب/معلم/أدمن)

### 5. تصحيح يدوي
**POST** `/attempts/:attemptId/grade`
- يحتاج: `accessToken` (معلم/أدمن)

---

## أمثلة Postman سريعة

### Register (طالب)
```
POST https://api.deutsch-tests.com/auth/register
Content-Type: application/json

{
  "email": "student1@example.com",
  "password": "password123",
  "role": "student"
}
```

### Login
```
POST https://api.deutsch-tests.com/auth/login
Content-Type: application/json

{
  "email": "student1@example.com",
  "password": "password123"
}
```

### بدء محاولة (بعد Login)
```
POST https://api.deutsch-tests.com/attempts
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "examId": "6911024eedc6fd66631427d3"
}
```

---

## ترتيب الاختبار الموصى به

1. ✅ **Register** - سجلي مستخدمين (طالب، معلم، أدمن)
2. ✅ **Login** - سجلي دخول لكل مستخدم واحفظي الـ tokens
3. ✅ **Create Exam** (معلم/أدمن) - أنشئي امتحان
4. ✅ **Start Attempt** (طالب) - ابدئي محاولة
5. ✅ **Save Answer** (طالب) - احفظي إجابات
6. ✅ **Submit Attempt** (طالب) - سلمي المحاولة
7. ✅ **View Attempt** (طالب/معلم) - شوفي النتائج
8. ✅ **Grade Attempt** (معلم/أدمن) - صححي يدوياً

---

## ملاحظات مهمة

- ✅ جميع الـ endpoints المحمية تحتاج `Authorization: Bearer <token>`
- ✅ الـ tokens تنتهي صلاحيتها، استخدمي `/auth/refresh` لتجديدها
- ✅ تأكدي أن الامتحان `status=published` قبل بدء المحاولة

