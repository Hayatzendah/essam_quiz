# 📚 وثائق API - نظام تعلم اللغة الألمانية

**نظام شامل لتعلم اللغة الألمانية يتضمن:**
- 🇩🇪 Deutschland in Leben Test (اختبار الحياة في ألمانيا)
- 📝 Prüfungen (6 مزودي امتحانات: telc, Goethe, ÖSD, ECL, DTB, DTZ)
- 📖 Grammatik (القواعد النحوية)
- 📚 Wortschatz (المفردات)

---

## 🌐 Base URL

```
https://api.deutsch-tests.com
```

**⚠️ مهم للتطوير المحلي:**
- في التطوير المحلي، **يجب** استخدام:
```
http://localhost:4000
```
- لا تستخدم `api.deutsch-tests.com` في التطوير المحلي (سيسبب ERR_NAME_NOT_RESOLVED)
- تأكد من أن الـ Backend يعمل على `http://localhost:4000` قبل إجراء الطلبات

---

## 🔧 إعدادات مهمة للفرونت

### 1. Headers المطلوبة

جميع الطلبات المحمية تتطلب:
```javascript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <accessToken>"
}
```

### 2. CORS

الـ API يدعم الطلبات من:
- `http://localhost:5177` (التطوير المحلي)
- `https://deutsch-tests.com` (الإنتاج)
- `https://www.deutsch-tests.com` (الإنتاج مع www)

### 3. Authentication Flow

1. **تسجيل الدخول:** `POST /auth/login` → يحصل على `accessToken` و `refreshToken`
2. **استخدام Token:** أضف `Authorization: Bearer <accessToken>` في جميع الطلبات
3. **تجديد Token:** عند انتهاء `accessToken`، استخدم `POST /auth/refresh` مع `refreshToken`
4. **تسجيل الخروج:** `POST /auth/logout` لمسح الـ tokens

### 4. إعداد Axios (مهم جدًا)

⚠️ **استخدمي `params` في Axios بدل التجميع اليدوي للـ URLs** لتجنب مشاكل URL breaking والترميز.

**إعداد Axios Instance:**
```javascript
import axios from 'axios';

// ⚠️ مهم: في التطوير المحلي، استخدم http://localhost:4000
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://api.deutsch-tests.com' 
    : 'http://localhost:4000', // للتطوير المحلي
  headers: { 'Content-Type': 'application/json' },
});

// إضافة Authorization header تلقائيًا في جميع الطلبات
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// معالجة الأخطاء (اختياري)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // التوكن منتهي - إعادة توجيه للـ login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**✅ استخدام صحيح (مع params):**
```javascript
// صحيح - Axios يرمّز الـ query parameters تلقائيًا
api.get('/questions', {
  params: {
    provider: 'Deutschland-in-Leben',
    state: 'Bayern',
    page: 1,
    limit: 20,
  },
});
// النتيجة: /questions?provider=Deutschland-in-Leben&state=Bayern&page=1&limit=20
```

**❌ استخدام خاطئ (تجميع يدوي):**
```javascript
// خطأ - قد يسبب URL breaking ومشاكل في الترميز
const url = `https://api.deutsch-tests.com/questions?provider=LiD&state=${state}`;
axios.get(url); // ❌ قد ينتج: api.deutsch-tests.co_eben&state=Bayern
```

### 5. Error Handling

جميع الأخطاء تعيد:
```json
{
  "status": "error",
  "code": 400,
  "message": "Error message",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

### 6. Response Format

**نجاح:**
```json
{
  "status": "success",
  "data": { ... }
}
```

**خطأ:**
```json
{
  "status": "error",
  "code": 400,
  "message": "Error message"
}
```

---

## 📋 جدول المحتويات

1. [Authentication (المصادقة)](#authentication-المصادقة)
2. [Users (المستخدمون)](#users-المستخدمون)
3. [Exams (الامتحانات)](#exams-الامتحانات)
4. [Questions (الأسئلة)](#questions-الأسئلة)
5. [Grammar Topics (مواضيع القواعد النحوية)](#-grammar-topics-مواضيع-القواعد-النحوية)
6. [Attempts (المحاولات)](#attempts-المحاولات)
7. [Analytics (التحليلات)](#analytics-التحليلات)
8. [Media (الوسائط)](#media-الوسائط)
9. [Health & App (الصحة والتطبيق)](#health--app-الصحة-والتطبيق)

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

**مثال استخدام (JavaScript/Axios):**
```javascript
const response = await axios.get('https://api.deutsch-tests.com/auth');
console.log(response.data);
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
  "user": {
    "id": "...",
    "name": "",
    "email": "user@example.com",
    "role": "student"
  }
}
```

**ملاحظات مهمة:**
- **للمعلمين:** إذا كان الإيميل = `TEACHER_EMAIL` من Environment Variables والباسورد = `TEACHER_PASSWORD`، النظام سينشئ حساب المعلم تلقائياً إذا لم يكن موجوداً
- **للطلاب:** التحقق العادي من الباسورد في الداتابيس

**الاستخدام:** عند تسجيل الدخول - احفظ `accessToken` للاستخدام لاحقاً

**مثال استخدام (JavaScript/Axios):**
```javascript
const response = await axios.post('https://api.deutsch-tests.com/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

// احفظ tokens
localStorage.setItem('accessToken', response.data.accessToken);
localStorage.setItem('refreshToken', response.data.refreshToken);
```

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

**مثال استخدام (JavaScript/Axios):**
```javascript
const refreshToken = localStorage.getItem('refreshToken');
const response = await axios.post('https://api.deutsch-tests.com/auth/refresh', {
  refreshToken: refreshToken
});

// احفظ accessToken الجديد
localStorage.setItem('accessToken', response.data.accessToken);
```

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

**مثال استخدام (JavaScript/Axios):**
```javascript
const accessToken = localStorage.getItem('accessToken');
await axios.post('https://api.deutsch-tests.com/auth/logout', {}, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// احذف tokens
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

---

### `GET /auth/me`
**الوصف:** الحصول على معلومات المستخدم الحالي من الـ token  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** الجميع

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "id": "...",
  "name": "",
  "email": "user@example.com",
  "role": "student"
}
```

**الاستخدام:** للحصول على معلومات المستخدم الحالي من الـ token

---

### `GET /auth/check-teacher`
**الوصف:** التحقق من حالة حساب المعلم (للتطوير والتصحيح)  
**المصادقة:** غير مطلوبة  
**الاستخدام:** للتحقق من إعدادات حساب المعلم في Environment Variables والداتابيس

**Response (200):**
```json
{
  "teacherEmail": "teacher@deutsch-tests.com",
  "teacherPasswordSet": true,
  "teacherPasswordLength": 25,
  "userExists": true,
  "userRole": "teacher",
  "message": "Teacher account exists and is ready"
}
```

**الحالات المحتملة:**
- `userExists: false` - حساب المعلم غير موجود في الداتابيس (سيتم إنشاؤه تلقائياً عند Login)
- `userRole !== "teacher"` - المستخدم موجود لكن role مختلف (سيتم تحديثه تلقائياً عند Login)
- `teacherPasswordSet: false` - `TEACHER_PASSWORD` غير موجود في Environment Variables

**الاستخدام:** للتحقق من إعدادات حساب المعلم قبل محاولة Login

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

### 📋 هيكل Deutschland in Leben Test (مهم للفورم)

**⚠️ كل امتحان "Deutschland in Leben Test" يجب أن يحتوي على قسمين إجباريين:**

1. **قسم الولاية:** 3 أسئلة من الولاية المختارة
   - `name`: `"{اسم الولاية} Fragen"` (مثال: "Bayern Fragen")
   - `quota`: `3` (ثابت)
   - `tags`: `["{اسم الولاية}"]` (مثال: `["Bayern"]`)
   - `difficultyDistribution`: اختياري (easy, medium, hard)

2. **قسم الـ300:** 30 سؤال من مجموعة الـ300 سؤال
   - `name`: `"300 Fragen Pool"` (ثابت)
   - `quota`: `30` (ثابت)
   - `tags`: `["300-Fragen"]` (ثابت)

**القيم الثابتة:**
- `provider`: `"Deutschland-in-Leben"` (ثابت)
- `level`: `"B1"` (ثابت)
- `randomizeQuestions`: `true` (مفضل)

**الولايات المدعومة (16 ولاية):**
- Baden-Württemberg
- Bayern
- Berlin
- Brandenburg
- Bremen
- Hamburg
- Hessen
- Mecklenburg-Vorpommern
- Niedersachsen
- Nordrhein-Westfalen (أو NRW)
- Rheinland-Pfalz
- Saarland
- Sachsen
- Sachsen-Anhalt
- Schleswig-Holstein
- Thüringen

---

### `POST /exams`
**الوصف:** إنشاء امتحان جديد  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin  
**⚠️ مهم:** هذا الـ endpoint محصور بـ **admin** و **teacher** فقط. إذا كان role المستخدم = **student**، سيتم رفض الطلب بـ 403 Forbidden.  
**للطلاب:** استخدم `POST /exams/practice` بدلاً من هذا الـ endpoint.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body (مثال Goethe A1 - للظهور في الفرونت):**
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
      "quota": 5,
      "tags": ["Hören", "A1", "Goethe"],
      "difficultyDistribution": {
        "easy": 3,
        "medium": 2,
        "hard": 0
      }
    },
    {
      "name": "Lesen - Teil 1",
      "skill": "LESEN",
      "label": "القراءة - الجزء الأول",
      "durationMin": 25,
      "partsCount": 4,
      "quota": 6,
      "tags": ["Lesen", "A1", "Goethe"],
      "difficultyDistribution": {
        "easy": 4,
        "medium": 2,
        "hard": 0
      }
    },
    {
      "name": "Schreiben - Teil 1",
      "skill": "SCHREIBEN",
      "label": "الكتابة - الجزء الأول",
      "durationMin": 20,
      "partsCount": 2,
      "quota": 3,
      "tags": ["Schreiben", "A1", "Goethe"],
      "difficultyDistribution": {
        "easy": 2,
        "medium": 1,
        "hard": 0
      }
    },
    {
      "name": "Sprechen - Teil 1",
      "skill": "SPRECHEN",
      "label": "المحادثة - الجزء الأول",
      "durationMin": 15,
      "partsCount": 2,
      "quota": 2,
      "tags": ["Sprechen", "A1", "Goethe"],
      "difficultyDistribution": {
        "easy": 1,
        "medium": 1,
        "hard": 0
      }
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 3,
  "timeLimitMin": 80,
  "status": "published"
}
```

**Body (مثال عام - مع items بدلاً من quota):**
```json
{
  "title": "امتحان اللغة الألمانية",
  "description": "وصف الامتحان",
  "level": "B1",
  "provider": "telc",
  "sections": [
    {
      "name": "Hören - Teil 1",
      "skill": "HOEREN",
      "label": "Hören - Teil 1",
      "durationMin": 20,
      "partsCount": 3,
      "items": [
        {
          "questionId": "QUESTION_ID_1",
          "points": 1
        },
        {
          "questionId": "QUESTION_ID_2",
          "points": 1
        }
      ],
      "tags": ["Hören", "Teil-1"]
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 3,
  "timeLimitMin": 60,
  "status": "published"
}
```

**Body (مثال Deutschland in Leben Test - Bayern):**
```json
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
        "easy": 1,
        "medium": 1,
        "hard": 1
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

**📌 ملاحظة مهمة جداً - لجعل الامتحان يظهر في الفرونت:**
1. **يجب أن يكون `"status": "published"`** (ليس `"draft"`)
2. الفرونت يستخدم `GET /exams/public?level=A1&provider=goethe` الذي يعرض فقط الامتحانات المنشورة
3. إذا كان `status: "draft"`، لن يظهر في الفرونت
4. بعد إنشاء الامتحان بـ `status: "published"`، سيظهر تلقائياً في:
   - `GET /exams/public?level=A1&provider=goethe`
   - `GET /exams/{examId}/public`

---

### `POST /exams/practice`
**الوصف:** إنشاء امتحان تمرين ديناميكي (للطلاب - للتمارين)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student, admin, teacher

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "title": "تمرين اللغة الألمانية",
  "description": "وصف التمرين", // اختياري
  "level": "B1", // اختياري
  "provider": "telc", // اختياري
  "sections": [
    {
      "name": "Exercises",
      "skill": "HOEREN", // اختياري: HOEREN | LESEN | SCHREIBEN | SPRECHEN
      "label": "Exercises", // اختياري: تسمية القسم (افتراضي: name)
      "durationMin": 20, // اختياري: مدة القسم بالدقائق
      "partsCount": 2, // اختياري: عدد الأجزاء (يُحسب تلقائياً من items/quota إذا لم يتم تحديده)
      "items": [
        { "questionId": "...", "points": 1 },
        { "questionId": "...", "points": 2 }
      ]
    }
  ],
  "randomizeQuestions": true, // اختياري
  "attemptLimit": 0, // اختياري (0 = غير محدود)
  "timeLimitMin": 60 // اختياري (0 = غير محدود)
}
```

**ملاحظات مهمة:**
- يجب أن تحتوي كل section على `items` (أسئلة محددة) - لا يمكن استخدام `quota`
- الحالة (`status`) تكون `published` تلقائياً
- للطلاب فقط: يجب استخدام `items` بدلاً من `quota`

**Response (201):**
```json
{
  "id": "...",
  "title": "تمرين اللغة الألمانية",
  "level": "B1",
  "status": "published",
  "sections": [
    {
      "name": "Exercises",
      "items": [
        { "questionId": "...", "points": 1 }
      ]
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 0,
  "ownerId": "userId",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**الاستخدام:** للطلاب لإنشاء امتحان تمرين ديناميكي مع أسئلة محددة

---

### `GET /exams`
**الوصف:** الحصول على قائمة الامتحانات  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin, **student**

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `status`: فلترة حسب الحالة (draft/published/archived) - **للطلاب: يتم تجاهل هذا الحقل وفرض 'published'**
- `level`: فلترة حسب المستوى (A1, A2, B1, B2, C1)
- `provider`: فلترة حسب المزود (telc, Goethe, ÖSD, Deutschland-in-Leben, etc.)
- `state`: فلترة حسب الولاية الألمانية (Bayern, Berlin, etc.) - يتم البحث في sections.tags

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
- **الطالب:** يرى الامتحانات المنشورة المتاحة له فقط (غير مخصصة أو مخصصة له، ولم يتجاوز حد المحاولات)
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

### `GET /exams/public`
**الوصف:** عرض قائمة الامتحانات المنشورة للطلاب (Public endpoint)  
**المصادقة:** غير مطلوبة (Public endpoint)  
**الأدوار المسموحة:** جميع المستخدمين (طلاب ومعلمين)

**Headers:**
```
Content-Type: application/json
```

**ملاحظة:** هذا endpoint Public - لا يحتاج JWT Token

**Query Parameters:**
- `level`: فلترة حسب المستوى (A1, A2, B1, B2, C1, C2) - اختياري
- `provider`: فلترة حسب المزود (goethe, telc, oesd, dtb, dtz, ecl) - اختياري

**Response (200):**
```json
{
  "items": [
    {
      "id": "69262594a15c6ab8ea5b2751",
      "title": "Goethe-Zertifikat A1 - Start Deutsch 1",
      "level": "A1",
      "provider": "goethe",
      "timeLimitMin": 80,
      "sections": [
        {
          "skill": "HOEREN",
          "label": "Hören - Teil 1",
          "durationMin": 20,
          "partsCount": 5
        },
        {
          "skill": "LESEN",
          "label": "Lesen - Teil 1",
          "durationMin": 25,
          "partsCount": 4
        },
        {
          "skill": "SCHREIBEN",
          "label": "Schreiben - Teil 1",
          "durationMin": 20,
          "partsCount": 2
        },
        {
          "skill": "SPRECHEN",
          "label": "Sprechen - Teil 1",
          "durationMin": 15,
          "partsCount": 2
        }
      ]
    }
  ],
  "count": 1
}
```

**ملاحظات على الـ Response:**
- `sections[]` يحتوي على: `skill`, `label`, `durationMin`, `partsCount`
- `label` يستخدم `name` كقيمة افتراضية إذا لم يتم تحديد `label`
- `partsCount` يُحسب تلقائياً من `items.length` أو `quota` إذا لم يتم تحديده
- `durationMin` و `partsCount` قد يكونان `undefined` إذا لم يتم تحديدهما في Exam

**ملاحظات:**
- يعرض فقط الامتحانات المنشورة (status = published)
- يفلتر حسب `level` و `provider` إذا تم إرسالهما
- لا يعرض الأسئلة، فقط هيكل الأقسام
- `partsCount` يُحسب تلقائياً من `items` أو `quota` إذا لم يتم تحديده
- `label` يستخدم `name` كقيمة افتراضية إذا لم يتم تحديده

**أمثلة على الاستخدام:**

**1. جلب جميع الامتحانات المنشورة:**
```javascript
api.get('/exams/public');
```

**2. فلترة حسب المستوى:**
```javascript
api.get('/exams/public', {
  params: {
    level: 'B1'
  }
});
```

**3. فلترة حسب المستوى والمزود:**
```javascript
api.get('/exams/public', {
  params: {
    level: 'B1',
    provider: 'goethe'
  }
});
```

**4. استخدام في React/Vue:**
```javascript
// جلب الامتحانات المنشورة مع الفلترة
useEffect(() => {
  api.get('/exams/public', {
    params: {
      level: selectedLevel, // 'A1', 'A2', 'B1', etc.
      provider: selectedProvider // 'goethe', 'telc', etc.
    }
  })
    .then(res => {
      setExams(res.data.items);
    })
    .catch(err => {
      console.error('Error loading exams:', err);
    });
}, [selectedLevel, selectedProvider]);
```

**⚠️ مهم للتطوير المحلي:**
- في التطوير المحلي، تأكد من استخدام `http://localhost:4000` كـ baseURL
- مثال: `const api = axios.create({ baseURL: 'http://localhost:4000' });`
- لا تستخدم `api.deutsch-tests.com` في التطوير المحلي (سيسبب ERR_NAME_NOT_RESOLVED)

**الاستخدام:**
- **لصفحة Prüfungen في الفرونت:** عرض قائمة الامتحانات المنشورة مع إمكانية الفلترة
- **للفلترة:** فلترة الامتحانات حسب المستوى والمزود

---

### `GET /exams/:examId/public`
**الوصف:** عرض تفاصيل امتحان معين للطالب (Public endpoint)  
**المصادقة:** غير مطلوبة (Public endpoint)  
**الأدوار المسموحة:** جميع المستخدمين

**Headers:**
```
Content-Type: application/json
```

**ملاحظة:** هذا endpoint Public - لا يحتاج JWT Token

**Path Parameters:**
- `examId`: معرف الامتحان (MongoDB ObjectId)

**Response (200):**
```json
{
  "id": "examId123",
  "title": "telc B1 - Hören",
  "description": "امتحان telc B1 للاستماع",
  "level": "B1",
  "provider": "telc",
  "timeLimitMin": 60,
  "attemptLimit": 3,
  "sections": [
    {
      "skill": "HOEREN",
      "label": "Hören - Teil 1",
      "durationMin": 20,
      "partsCount": 3
    },
    {
      "skill": "LESEN",
      "label": "Lesen - Teil 1",
      "durationMin": 30,
      "partsCount": 5
    }
  ]
}
```

**Response (404):**
```json
{
  "statusCode": 404,
  "message": "Exam not found",
  "error": "Not Found"
}
```

**ملاحظات:**
- يعرض فقط الامتحانات المنشورة (status = published)
- لا يعرض الأسئلة نفسها، فقط هيكل الأقسام
- `partsCount` يُحسب تلقائياً من `items` أو `quota` إذا لم يتم تحديده
- `label` يستخدم `name` كقيمة افتراضية إذا لم يتم تحديده

**أمثلة على الاستخدام:**

**1. جلب تفاصيل امتحان محدد:**
```javascript
api.get('/exams/examId123/public');
```

**2. استخدام في React/Vue:**
```javascript
// جلب تفاصيل امتحان محدد
const fetchExamDetails = async (examId) => {
  try {
    const res = await api.get(`/exams/${examId}/public`);
    setExamDetails(res.data);
    setSections(res.data.sections);
  } catch (err) {
    console.error('Error loading exam details:', err);
  }
};
```

**الاستخدام:**
- **لصفحة تفاصيل الامتحان:** عرض تفاصيل الامتحان قبل البدء
- **لربط زر "ابدأ الامتحان":** عرض معلومات الامتحان قبل بدء المحاولة

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

### `POST /exams/:id/attempts`
**الوصف:** بدء محاولة على exam موجود (للطلاب)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student فقط

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `id`: معرف الامتحان (MongoDB ObjectId)

**⚠️ ملاحظات مهمة:**
- Exam يجب أن يكون منشور (published) ومتاح للطلاب
- إذا كان Exam غير موجود أو غير منشور، ستحصل على `400 Bad Request`
- إذا تجاوزت حد المحاولات المسموحة، ستحصل على `400 Bad Request`
- **هذا الـ endpoint هو البديل الصحيح لـ POST /exams للطلاب عند بدء محاولة على exam موجود**

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

**Response (400):**
```json
{
  "code": "EXAM_NOT_FOUND",
  "message": "Exam not found",
  "examId": "examId123"
}
```

أو

```json
{
  "code": "EXAM_NOT_AVAILABLE",
  "message": "Exam is not published or not found",
  "examId": "examId123",
  "examStatus": "draft"
}
```

**أمثلة على الاستخدام:**

**1. بدء محاولة على exam موجود:**
```javascript
api.post('/exams/examId123/attempts');
```

**2. استخدام في React/Vue:**
```javascript
// بدء محاولة على exam موجود
const startExamAttempt = async (examId) => {
  try {
    const res = await api.post(`/exams/${examId}/attempts`);
    // حفظ attemptId للاستخدام لاحقاً
    setAttemptId(res.data.attemptId);
    setQuestions(res.data.items);
    setStatus(res.data.status);
  } catch (err) {
    console.error('Error starting exam attempt:', err);
  }
};
```

**الاستخدام:**
- **لصفحة التمارين:** بدء محاولة على exam جاهز (مجهز من المعلم)
- **بديل لـ POST /exams:** للطلاب عند بدء محاولة على exam موجود

---

**أمثلة على استخدام POST /attempts:**

**1. بدء محاولة عادية (exam mode):**
```javascript
api.post('/attempts', {
  examId: 'examId123',
  mode: 'exam'
});
```

**2. بدء محاولة تمرين (training mode):**
```javascript
api.post('/attempts', {
  examId: 'examId123',
  mode: 'training'
});
```

**3. استخدام في React/Vue:**
```javascript
// بدء محاولة على exam مع تحديد mode
const startAttempt = async (examId, mode = 'exam') => {
  try {
    const res = await api.post('/attempts', {
      examId,
      mode
    });
    // حفظ attemptId و timeLimitMin للاستخدام لاحقاً
    setAttemptId(res.data.attemptId);
    setQuestions(res.data.items);
    setTimeLimitMin(res.data.timeLimitMin);
    setStatus(res.data.status);
  } catch (err) {
    console.error('Error starting attempt:', err);
  }
};

// ربط زر "ابدأ امتحان تجريبي"
const handleStartExam = () => {
  startAttempt(selectedExamId, 'exam');
};

// ربط زر "ابدأ تمرين"
const handleStartTraining = () => {
  startAttempt(selectedExamId, 'training');
};
```

**الاستخدام:**
- **لصفحة Prüfungen:** ربط زر "ابدأ الامتحان" مع الـ Attempts
- **لصفحة التمارين:** بدء محاولة تمرين على exam موجود

---

### `POST /exams/:id/fix-sections`
**الوصف:** إصلاح الامتحان تلقائياً - إضافة quota للأقسام الفارغة  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** admin فقط

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `id`: معرف الامتحان (MongoDB ObjectId)

**الوصف:**
- يفحص كل section في الامتحان
- إذا كان section فارغاً (لا `items` ولا `quota`): يضيف `quota: 5` تلقائياً
- إذا كان section `null`: ينشئ section جديد مع `quota: 5`
- مفيد لإصلاح الامتحانات التي لا يمكن بدءها بسبب sections فارغة

**Response (200):**
```json
{
  "success": true,
  "message": "Exam sections fixed successfully",
  "examId": "6926380f721cf4b27545857e",
  "sections": [
    {
      "name": "Section 1",
      "quota": 5,
      "tags": []
    }
  ],
  "fixedSections": [
    {
      "name": "Section 1",
      "quota": 5
    }
  ]
}
```

**Response (200) - إذا كان الامتحان صحيح:**
```json
{
  "success": true,
  "message": "Exam is already valid - no empty sections found",
  "examId": "6926380f721cf4b27545857e",
  "sections": [...]
}
```

**Response (403):**
```json
{
  "statusCode": 403,
  "message": "Only admin can fix exams"
}
```

**Response (404):**
```json
{
  "statusCode": 404,
  "message": "Exam not found"
}
```

**أمثلة على الاستخدام:**

**1. إصلاح امتحان:**
```javascript
// إصلاح امتحان تلقائياً
const fixExam = async (examId) => {
  try {
    const response = await api.post(`/exams/${examId}/fix-sections`);
    console.log('Exam fixed:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fixing exam:', error.response?.data);
    throw error;
  }
};

// استخدام
await fixExam('6926380f721cf4b27545857e');
```

**2. استخدام في React/Vue:**
```javascript
const handleFixExam = async (examId) => {
  try {
    const response = await api.post(`/exams/${examId}/fix-sections`);
    if (response.data.success) {
      alert('تم إصلاح الامتحان بنجاح!');
      // تحديث قائمة الامتحانات
      fetchExams();
    }
  } catch (error) {
    if (error.response?.status === 403) {
      alert('ليس لديك صلاحية لإصلاح الامتحانات');
    } else {
      alert('حدث خطأ أثناء إصلاح الامتحان');
    }
  }
};
```

**الاستخدام:**
- **لإصلاح الامتحانات التي sections فارغة:** استخدم هذا الـ endpoint لإصلاح الامتحانات تلقائياً
- **للمسؤولين فقط:** يتطلب role: admin

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

### `DELETE /exams/:id`
**الوصف:** حذف أو أرشفة امتحان  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin (المالك فقط أو الأدمن)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `hard`: إذا كان `true`، يحذف الامتحان نهائياً (افتراضي: `false` = soft delete/archive)

**Response (200):**
```json
{
  "message": "Exam archived successfully",
  "id": "examId123",
  "status": "archived"
}
```

أو (إذا كان `hard=true`):
```json
{
  "message": "Exam deleted permanently",
  "id": "examId123"
}
```

**Response (400):**
```json
{
  "code": "EXAM_HAS_ATTEMPTS",
  "message": "Cannot delete exam with 5 attempt(s). Use hard=true to force delete.",
  "attemptCount": 5
}
```

**الاستخدام:** 
- **Soft delete (افتراضي):** يغير حالة الامتحان إلى `archived` - يحتفظ بالامتحان في قاعدة البيانات
- **Hard delete:** يحذف الامتحان نهائياً (استخدم بحذر!)
- إذا كان الامتحان يحتوي على محاولات، يجب استخدام `hard=true` للحذف النهائي

**مثال:**
```javascript
// Soft delete (archive)
await api.delete('/exams/examId123');

// Hard delete (permanent)
await api.delete('/exams/examId123?hard=true');
```

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

**ملاحظات مهمة:**
- **للطلاب:** يجب استخدام `POST /attempts` لبدء محاولة والحصول على الأسئلة من خلال المحاولة
- **للمعلمين/الأدمن:** يمكنهم رؤية جميع الأسئلة (draft/published/archived) حسب `status` parameter

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `page`: رقم الصفحة (افتراضي: 1)
- `limit`: عدد النتائج (افتراضي: 10)
- `qType`: فلترة حسب نوع السؤال (mcq, true_false, fill, match, reorder)
- `provider`: فلترة حسب المزود (telc, Goethe, ÖSD, Deutschland-in-Leben, etc.)
- `section`: فلترة حسب القسم (Hören, Lesen, Schreiben, Sprechen)
- `level`: فلترة حسب المستوى (A1, A2, B1, B2, C1)
- `state`: فلترة حسب الولاية الألمانية (Bayern, Berlin, etc.) - يتم البحث في tags
  - عند تحديد `state`: يتم إرجاع الأسئلة العامة (بدون tags للولايات) + أسئلة الولاية المحددة
- `tags`: فلترة حسب Tags (مفصولة بفواصل: "Bayern,Hören")
- `text`: بحث نصي في نص السؤال
- `status`: فلترة حسب الحالة (draft, published, archived)

**Response (200):**
```json
{
  "page": 1,
  "limit": 20,
  "total": 100,
  "items": [
    {
      "id": "...",
      "prompt": "...",
      "qType": "mcq",
      "status": "published",
      "provider": "Deutschland-in-Leben",
      "level": "B1",
      "tags": ["Bayern"],
      ...
    }
  ]
}
```

**مثال على الاستخدام في الفرونت إند (Axios):**

⚠️ **مهم جدًا:** استخدمي `params` في Axios بدل التجميع اليدوي للـ URLs لتجنب مشاكل الترميز والـ URL breaking.

```javascript
import axios from 'axios';

// إعداد Axios instance
const api = axios.create({
  baseURL: 'https://api.deutsch-tests.com', // بدون /api
  headers: { 'Content-Type': 'application/json' },
});

// إضافة Authorization header تلقائيًا
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ صحيح - استخدام params
export function fetchLidQuestions({ state, page = 1, limit = 20 }) {
  return api.get('/questions', {
    params: {
      provider: 'Deutschland-in-Leben',
      state,               // مثال: 'Bayern'
      status: 'published', // للطلاب: الـ backend يفرضها تلقائيًا
      page,
      limit,
    },
  });
}

// ❌ خطأ - تجميع يدوي (يسبب URL breaking)
// const url = `https://api.deutsch-tests.com/questions?provider=LiD&state=${state}`;
// axios.get(url) // ❌ قد يسبب مشاكل في الترميز
```

**مثال على الاستخدام في React/Vue:**
```javascript
useEffect(() => {
  fetchLidQuestions({ state: 'Bayern' })
    .then(res => {
      console.log('Questions:', res.data);
      setQuestions(res.data.items);
    })
    .catch(err => {
      console.error('Error loading questions:', err);
      // معالجة الخطأ (مثلاً: 403 = مشكلة صلاحيات، 401 = token منتهي)
    });
}, [selectedState]);
```

**الاستخدام:**
- **للطلاب:** تصفح الأسئلة المنشورة فقط (مثلاً: أسئلة LiD لولاية معينة)
- **للمعلمين/الأدمن:** تصفح وإدارة جميع الأسئلة

---

### `GET /questions/vocab`
**الوصف:** البحث عن أسئلة المفردات (Wortschatz)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** جميع المستخدمين (طلاب ومعلمين) - فقط الأسئلة المنشورة

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `level`: فلترة حسب المستوى (A1, A2, B1, B2, C1) - اختياري
- `search`: بحث نصي في نص السؤال (prompt) - اختياري
- `tags`: tags للفلترة حسب الموضوع - اختياري
  - يمكن استخدام string واحد: `tags=daily-life`
  - أو array format: `tags[]=daily-life&tags[]=food`
  - أو multiple values: `tags=daily-life&tags=family`
  - جميع الصيغ مدعومة ✅
- `page`: رقم الصفحة (افتراضي: 1) - اختياري
- `limit`: عدد النتائج (افتراضي: 20) - اختياري

**ملاحظات:**
- هذا الـ endpoint مخصص فقط لأسئلة المفردات (`section: "wortschatz"`)
- يرجع فقط الأسئلة المنشورة (`status: "published"`)
- متاح للطلاب والمعلمين على حد سواء

**Response (200):**
```json
{
  "page": 1,
  "limit": 20,
  "total": 50,
  "items": [
    {
      "_id": "...",
      "prompt": "ما معنى كلمة 'Haus'؟",
      "qType": "mcq",
      "options": [
        { "text": "بيت", "isCorrect": true },
        { "text": "سيارة", "isCorrect": false },
        { "text": "شجرة", "isCorrect": false }
      ],
      "section": "wortschatz",
      "level": "A1",
      "tags": ["daily-life"],
      "status": "published",
      "createdAt": "2025-11-21T16:54:26.400Z",
      "updatedAt": "2025-11-21T16:54:26.400Z"
    }
  ]
}
```

**أمثلة على الاستخدام:**

**1. جلب جميع أسئلة المفردات:**
```javascript
api.get('/questions/vocab');
```

**2. فلترة حسب المستوى:**
```javascript
api.get('/questions/vocab', {
  params: {
    level: 'A1'
  }
});
```

**3. البحث عن كلمة:**
```javascript
api.get('/questions/vocab', {
  params: {
    search: 'Haus'
  }
});
```

**4. فلترة حسب الموضوع (string واحد):**
```javascript
api.get('/questions/vocab', {
  params: {
    tags: 'daily-life'
  }
});
```

**4b. فلترة حسب الموضوع (array):**
```javascript
api.get('/questions/vocab', {
  params: {
    tags: ['daily-life', 'food']
  }
});
```

**5. دمج الفلاتر:**
```javascript
api.get('/questions/vocab', {
  params: {
    level: 'B1',
    search: 'Haus',
    tags: ['daily-life'],
    page: 1,
    limit: 10
  }
});
```

**مثال على الاستخدام في React/Vue:**
```javascript
// جلب أسئلة المفردات حسب المستوى والموضوع
useEffect(() => {
  api.get('/questions/vocab', {
    params: {
      level: selectedLevel, // 'A1', 'A2', etc.
      tags: selectedTags,   // ['daily-life', 'food']
      page: currentPage,
      limit: 20
    }
  })
    .then(res => {
      setVocabQuestions(res.data.items);
      setTotalPages(Math.ceil(res.data.total / res.data.limit));
    })
    .catch(err => {
      console.error('Error loading vocabulary questions:', err);
    });
}, [selectedLevel, selectedTags, currentPage]);
```

**الاستخدام:**
- **لصفحة Wortschatz في الفرونت:** عرض أسئلة المفردات حسب المستوى والموضوع
- **للبحث:** البحث عن كلمات ألمانية محددة
- **للفلترة:** فلترة حسب الموضوع (daily-life, food, transport, etc.)

---

### `GET /questions/grammar`
**الوصف:** البحث عن أسئلة القواعد النحوية (Grammatik)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** جميع المستخدمين (طلاب ومعلمين) - فقط الأسئلة المنشورة

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `level`: فلترة حسب المستوى (A1, A2, B1, B2, C1) - اختياري
- `search`: بحث نصي في نص السؤال (prompt) - اختياري
- `tags`: tags للفلترة حسب الموضوع - اختياري
  - يمكن استخدام string واحد: `tags=verb`
  - أو array format: `tags[]=verb&tags[]=noun`
  - أو multiple values: `tags=verb&tags=adjective`
  - جميع الصيغ مدعومة ✅
- `page`: رقم الصفحة (افتراضي: 1) - اختياري
- `limit`: عدد النتائج (افتراضي: 20) - اختياري

**ملاحظات:**
- هذا الـ endpoint مخصص فقط لأسئلة القواعد النحوية (`section: "grammar"`)
- يرجع فقط الأسئلة المنشورة (`status: "published"`)
- متاح للطلاب والمعلمين على حد سواء

**Response (200):**
```json
{
  "page": 1,
  "limit": 20,
  "total": 45,
  "items": [
    {
      "_id": "65f1234567890abcdef12345",
      "prompt": "Ergänzen Sie: Ich ___ gestern ins Kino gegangen.",
      "qType": "FILL",
      "section": "grammar",
      "level": "A2",
      "tags": ["verb", "perfekt"],
      "status": "published",
      "provider": "Goethe",
      "options": null,
      "fillExact": "bin",
      "regexList": ["bin", "war"],
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "65f1234567890abcdef12346",
      "prompt": "Wählen Sie die richtige Form: Der Mann, ___ ich gesehen habe, ist mein Lehrer.",
      "qType": "MCQ",
      "section": "grammar",
      "level": "B1",
      "tags": ["relative-pronoun", "dativ"],
      "status": "published",
      "provider": "telc",
      "options": [
        { "text": "den", "isCorrect": true },
        { "text": "der", "isCorrect": false },
        { "text": "dem", "isCorrect": false },
        { "text": "die", "isCorrect": false }
      ],
      "createdAt": "2024-01-14T09:20:00.000Z"
    }
  ]
}
```

**أمثلة على الاستخدام:**

**1. جلب جميع أسئلة القواعد النحوية:**
```javascript
api.get('/questions/grammar');
```

**2. فلترة حسب المستوى:**
```javascript
api.get('/questions/grammar', {
  params: {
    level: 'A2'
  }
});
```

**3. البحث عن موضوع:**
```javascript
api.get('/questions/grammar', {
  params: {
    search: 'Perfekt'
  }
});
```

**4. فلترة حسب الموضوع (string واحد):**
```javascript
api.get('/questions/grammar', {
  params: {
    tags: 'verb'
  }
});
```

**4b. فلترة حسب الموضوع (array):**
```javascript
api.get('/questions/grammar', {
  params: {
    tags: ['verb', 'perfekt']
  }
});
```

**5. دمج الفلاتر:**
```javascript
api.get('/questions/grammar', {
  params: {
    level: 'B1',
    search: 'Pronomen',
    tags: ['relative-pronoun'],
    page: 1,
    limit: 10
  }
});
```

**مثال على الاستخدام في React/Vue:**
```javascript
// جلب أسئلة القواعد النحوية حسب المستوى والموضوع
useEffect(() => {
  api.get('/questions/grammar', {
    params: {
      level: selectedLevel, // 'A1', 'A2', etc.
      tags: selectedTags,   // ['verb', 'perfekt']
      page: currentPage,
      limit: 20
    }
  })
    .then(res => {
      setGrammarQuestions(res.data.items);
      setTotalPages(Math.ceil(res.data.total / res.data.limit));
    })
    .catch(err => {
      console.error('Error loading grammar questions:', err);
    });
}, [selectedLevel, selectedTags, currentPage]);
```

**الاستخدام:**
- **لصفحة Grammatik في الفرونت:** عرض أسئلة القواعد النحوية حسب المستوى والموضوع
- **للبحث:** البحث عن مواضيع قواعدية محددة (Perfekt, Dativ, etc.)
- **للفلترة:** فلترة حسب الموضوع (verb, noun, adjective, relative-pronoun, etc.)

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

## 📖 Grammar Topics (مواضيع القواعد النحوية)

### `GET /grammar/topics`
**الوصف:** جلب قائمة مواضيع القواعد النحوية، مع إمكانية الفلترة حسب المستوى  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** جميع المستخدمين

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `level`: فلترة حسب المستوى (A1, A2, B1, B2, C1) - اختياري

**Response (200):**
```json
{
  "items": [
    {
      "_id": "69218b1bcddedde1d2b5ebbb",
      "title": "الحالة المنصوبة - Akkusativ",
      "slug": "akkusativ",
      "level": "A1",
      "shortDescription": "تعلم استخدام الحالة المنصوبة في الألمانية",
      "tags": ["akkusativ", "cases"],
      "contentHtml": "<h1>Akkusativ</h1><p>...</p>",
      "createdAt": "2025-11-22T10:06:19.251Z",
      "updatedAt": "2025-11-22T10:21:49.264Z"
    }
  ]
}
```

**أمثلة على الاستخدام:**

**1. جلب جميع المواضيع:**
```javascript
api.get('/grammar/topics');
```

**2. جلب مواضيع مستوى محدد:**
```javascript
api.get('/grammar/topics', {
  params: {
    level: 'A1'
  }
});
```

**3. استخدام في React/Vue:**
```javascript
// جلب مواضيع القواعد لمستوى معين
useEffect(() => {
  api.get('/grammar/topics', {
    params: {
      level: selectedLevel // 'A1', 'A2', etc.
    }
  })
    .then(res => {
      setGrammarTopics(res.data.items);
    })
    .catch(err => {
      console.error('Error loading grammar topics:', err);
    });
}, [selectedLevel]);
```

**الاستخدام:**
- **لصفحة Grammatik في الفرونت:** عرض قائمة مواضيع القواعد حسب المستوى
- **للتنقل:** استخدام `slug` للوصول إلى صفحة الموضوع المحدد

---

### `GET /grammar/topics/:slug`
**الوصف:** جلب موضوع قواعد نحوية محدد حسب slug  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** جميع المستخدمين

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `slug`: معرف الموضوع (مثل: `akkusativ`, `sein-haben`)

**Query Parameters:**
- `level`: المستوى (A1, A2, B1, B2, C1) - اختياري (مستحسن لتجنب التكرار)

**Response (200):**
```json
{
  "_id": "69218b1bcddedde1d2b5ebbb",
  "title": "الحالة المنصوبة - Akkusativ",
  "slug": "akkusativ",
  "level": "A1",
  "shortDescription": "تعلم استخدام الحالة المنصوبة في الألمانية",
  "tags": ["akkusativ", "cases"],
  "contentHtml": "<h1>Akkusativ</h1><h2>ما هي الحالة المنصوبة (Akkusativ)؟</h2><p>الحالة المنصوبة هي إحدى الحالات الأربع في اللغة الألمانية...</p>",
  "createdAt": "2025-11-22T10:06:19.251Z",
  "updatedAt": "2025-11-22T10:21:49.264Z"
}
```

**Response (404):**
```json
{
  "statusCode": 404,
  "message": "Grammar topic with slug \"akkusativ\" and level \"A1\" not found",
  "error": "Not Found"
}
```

**أمثلة على الاستخدام:**

**1. جلب موضوع محدد:**
```javascript
api.get('/grammar/topics/akkusativ', {
  params: {
    level: 'A1'
  }
});
```

**2. استخدام في React/Vue:**
```javascript
// جلب محتوى موضوع محدد
const fetchGrammarTopic = async (slug, level) => {
  try {
    const res = await api.get(`/grammar/topics/${slug}`, {
      params: { level }
    });
    setTopicContent(res.data.contentHtml);
    setTopicTitle(res.data.title);
  } catch (err) {
    console.error('Error loading grammar topic:', err);
  }
};
```

**الاستخدام:**
- **لصفحة شرح القاعدة:** عرض محتوى HTML للموضوع
- **للربط مع الأسئلة:** استخدام `tags` للبحث عن أسئلة متعلقة

---

### `POST /grammar/topics/:slug/attempts`
**الوصف:** بدء محاولة تمرين على موضوع قواعد نحوية (للطلاب)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student فقط

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `slug`: معرف الموضوع (مثل: `akkusativ`, `sein-haben`)

**Query Parameters:**
- `level`: المستوى (A1, A2, B1, B2, C1) - اختياري (مستحسن لتجنب التكرار)
- `questionsCount`: عدد الأسئلة المطلوبة (افتراضي: 20) - اختياري

**ملاحظات مهمة:**
- يتم البحث عن أسئلة مرتبطة بـ topic tags تلقائياً
- يتم إنشاء exam ديناميكي من هذه الأسئلة
- يتم بدء attempt تلقائياً على هذا exam
- **هذا الـ endpoint هو البديل الصحيح لـ POST /exams للطلاب عند بدء تمرين قواعد نحوية**

**Response (201):**
```json
{
  "attemptId": "attemptId123",
  "examId": "examId123",
  "status": "in-progress",
  "attemptCount": 1,
  "items": [
    {
      "questionId": "...",
      "qType": "mcq",
      "points": 1,
      "prompt": "...",
      "options": ["خيار 1", "خيار 2", "خيار 3"]
    }
  ]
}
```

**Response (400):**
```json
{
  "code": "NO_QUESTIONS_FOUND",
  "message": "No questions found for grammar topic \"الحالة المنصوبة - Akkusativ\" with tags: akkusativ, cases",
  "topic": "الحالة المنصوبة - Akkusativ",
  "level": "A1",
  "tags": ["akkusativ", "cases"]
}
```

**أمثلة على الاستخدام:**

**1. بدء تمرين على موضوع محدد:**
```javascript
api.post('/grammar/topics/akkusativ/attempts', null, {
  params: {
    level: 'A1',
    questionsCount: 10
  }
});
```

**2. استخدام في React/Vue:**
```javascript
// بدء تمرين على موضوع قواعد نحوية
const startGrammarExercise = async (slug, level) => {
  try {
    const res = await api.post(`/grammar/topics/${slug}/attempts`, null, {
      params: { level, questionsCount: 10 }
    });
    // حفظ attemptId للاستخدام لاحقاً
    setAttemptId(res.data.attemptId);
    setQuestions(res.data.items);
  } catch (err) {
    console.error('Error starting grammar exercise:', err);
  }
};
```

**الاستخدام:**
- **لصفحة التمارين النحوية:** بدء تمرين على موضوع قواعد نحوية محدد
- **بديل لـ POST /exams:** للطلاب عند بدء تمرين قواعد نحوية

---

### `POST /grammar/topics`
**الوصف:** إنشاء موضوع قواعد نحوية جديد  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**
```json
{
  "title": "الحالة المنصوبة - Akkusativ",
  "slug": "akkusativ",
  "level": "A1",
  "shortDescription": "تعلم استخدام الحالة المنصوبة في الألمانية",
  "tags": ["akkusativ", "cases"],
  "contentHtml": "<h1>Akkusativ</h1><p>محتوى HTML...</p>"
}
```

**ملاحظات:**
- `title`: مطلوب (الحد الأدنى 3 أحرف)
- `slug`: اختياري (إذا لم يتم توفيره، سيتم توليده تلقائياً من العنوان)
- `level`: مطلوب (A1, A2, B1, B2, C1)
- `shortDescription`: اختياري
- `tags`: اختياري (مصفوفة من strings)
- `contentHtml`: اختياري (محتوى HTML للموضوع)

**Response (201):**
```json
{
  "_id": "69218b1bcddedde1d2b5ebbb",
  "title": "الحالة المنصوبة - Akkusativ",
  "slug": "akkusativ",
  "level": "A1",
  "shortDescription": "تعلم استخدام الحالة المنصوبة في الألمانية",
  "tags": ["akkusativ", "cases"],
  "contentHtml": "<h1>Akkusativ</h1><p>محتوى HTML...</p>",
  "createdAt": "2025-11-22T10:06:19.251Z",
  "updatedAt": "2025-11-22T10:06:19.251Z"
}
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": "A grammar topic with slug \"akkusativ\" already exists for level \"A1\"",
  "error": "Bad Request"
}
```

**أمثلة على الاستخدام:**

**1. إنشاء موضوع مع slug:**
```javascript
api.post('/grammar/topics', {
  title: "الحالة المنصوبة - Akkusativ",
  slug: "akkusativ",
  level: "A1",
  shortDescription: "تعلم استخدام الحالة المنصوبة في الألمانية",
  tags: ["akkusativ", "cases"],
  contentHtml: "<h1>Akkusativ</h1><p>...</p>"
});
```

**2. إنشاء موضوع بدون slug (سيتم توليده تلقائياً):**
```javascript
api.post('/grammar/topics', {
  title: "الحالة المنصوبة - Akkusativ",
  level: "A1",
  shortDescription: "تعلم استخدام الحالة المنصوبة في الألمانية",
  tags: ["akkusativ", "cases"]
});
```

---

### `PATCH /grammar/topics/:id`
**الوصف:** تحديث موضوع قواعد نحوية موجود  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** teacher, admin

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Path Parameters:**
- `id`: معرف الموضوع (MongoDB ObjectId)

**Body:** (جميع الحقول اختيارية)
```json
{
  "title": "الحالة المنصوبة - Akkusativ (محدث)",
  "shortDescription": "وصف محدث",
  "tags": ["akkusativ", "cases", "grammar"],
  "contentHtml": "<h1>Akkusativ</h1><h2>محتوى محدث...</h2>"
}
```

**ملاحظات:**
- يمكن تحديث حقل واحد أو أكثر
- الحقول غير المرسلة لن تتغير
- إذا تم تحديث `slug`، يجب التأكد من عدم التكرار مع موضوع آخر في نفس المستوى

**Response (200):**
```json
{
  "_id": "69218b1bcddedde1d2b5ebbb",
  "title": "الحالة المنصوبة - Akkusativ (محدث)",
  "slug": "akkusativ",
  "level": "A1",
  "shortDescription": "وصف محدث",
  "tags": ["akkusativ", "cases", "grammar"],
  "contentHtml": "<h1>Akkusativ</h1><h2>محتوى محدث...</h2>",
  "createdAt": "2025-11-22T10:06:19.251Z",
  "updatedAt": "2025-11-22T10:21:49.264Z"
}
```

**Response (404):**
```json
{
  "statusCode": 404,
  "message": "Grammar topic with id \"69218b1bcddedde1d2b5ebbb\" not found",
  "error": "Not Found"
}
```

**أمثلة على الاستخدام:**

**1. تحديث محتوى HTML فقط:**
```javascript
api.patch('/grammar/topics/69218b1bcddedde1d2b5ebbb', {
  contentHtml: "<h1>Akkusativ</h1><p>محتوى محدث...</p>"
});
```

**2. تحديث عدة حقول:**
```javascript
api.patch('/grammar/topics/69218b1bcddedde1d2b5ebbb', {
  title: "عنوان محدث",
  shortDescription: "وصف محدث",
  tags: ["akkusativ", "cases", "updated"]
});
```

**الاستخدام:**
- **للوحة تحكم المعلم:** تحديث محتوى المواضيع
- **لتصحيح الأخطاء:** تحديث محتوى HTML أو الوصف

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
  "examId": "examId123",  // ⚠️ مهم: يجب أن يكون MongoId صحيح (24 حرف hex)
  "mode": "exam"  // اختياري: "exam" | "training" (افتراضي: "exam")
}
```

**⚠️ ملاحظات مهمة:**
- `examId` **مطلوب** ويجب أن يكون MongoId صحيح (مثل: `"6759a0c0..."`)
- `mode` اختياري: يمكن أن يكون `"exam"` أو `"training"` (افتراضي: `"exam"`)
- إذا كان `examId` غير موجود أو غير صحيح، ستحصل على `400 Bad Request`
- تأكد من أن الـ Frontend يرسل `examId` وليس `id` أو `exam` أو أي اسم آخر
- يستخدم منطق AttemptsModule لاختيار الأسئلة وإنشاء Attempt جديد

**Response (201):**
```json
{
  "attemptId": "attemptId123",
  "examId": "examId123",
  "status": "in-progress",
  "attemptCount": 1,
  "expiresAt": "2024-01-01T11:00:00.000Z",
  "timeLimitMin": 60,
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
- Response يحتوي على `attemptId + items + timeLimitMin` ليتم عرض الأسئلة للطالب
- الأسئلة لا تحتوي على `isCorrect` (لحماية الإجابات)
- ترتيب الخيارات مختلط عشوائياً إذا كان `randomizeQuestions: true`
- الأسئلة مختلطة عشوائياً إذا كان `randomizeQuestions: true`
- **للاختبارات "Deutschland-in-Leben":** يتم استخدام `student.state` (الولاية) تلقائياً لفلترة أسئلة الولاية

**ملاحظات:**
- الأسئلة لا تحتوي على `isCorrect` (لحماية الإجابات)
- ترتيب الخيارات مختلط عشوائياً إذا كان `randomizeQuestions: true`
- الأسئلة مختلطة عشوائياً إذا كان `randomizeQuestions: true`
- **للاختبارات "Deutschland-in-Leben":** يتم استخدام `student.state` (الولاية) تلقائياً لفلترة أسئلة الولاية

**⚠️ للتمارين النحوية (Grammar Exercises):**
- **استخدم `POST /grammar/topics/:slug/attempts` بدلاً من هذا الـ endpoint**
- هذا الـ endpoint مخصص للامتحانات الجاهزة (exams موجودة مسبقاً)
- للتمارين النحوية الديناميكية، استخدم `POST /grammar/topics/:slug/attempts` الذي يبحث عن الأسئلة تلقائياً
  - إذا كان `provider = "Deutschland-in-Leben"` و `student.state = "Bayern"`
  - يتم استبدال tags الولاية في section بـ `student.state` تلقائياً
  - مثال: section مع `tags: ["Bayern"]` → يتم استخدام `student.state` بدلاً منه

**الاستخدام:** للطالب لبدء محاولة جديدة (يتم حفظ snapshot من الأسئلة في هذه اللحظة)

---

### `PATCH /attempts/:attemptId/answer/:itemIndex`
**الوصف:** حفظ إجابة لسؤال أثناء المحاولة (مع `itemIndex` في URL)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student فقط

**Headers:**
```
Authorization: Bearer <accessToken>
```

**URL Parameters:**
- `attemptId`: معرف المحاولة
- `itemIndex`: رقم السؤال في الامتحان (0-based)

**Body:**
```json
{
  "questionId": "questionId123",
  "studentAnswerIndexes": [0, 2], // للإجابات المتعددة (multiple-choice)
  "studentAnswerText": "إجابة نصية", // للأسئلة النصية (fill-blank)
  "studentAnswerBoolean": true, // للأسئلة true/false
  "studentAnswerMatch": { "0": "1", "1": "0" }, // للأسئلة matching
  "studentAnswerReorder": [2, 0, 1] // للأسئلة reorder
}
```

**ملاحظة:** `itemIndex` في URL سيتم استخدامه تلقائياً حتى لو كان موجوداً في Body.

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

**الاستخدام:** للطالب لحفظ إجابته أثناء المحاولة مع `itemIndex` في URL

---

### `PATCH /attempts/:attemptId/answer`
**الوصف:** حفظ إجابة لسؤال أثناء المحاولة (مع `itemIndex` في Body)  
**المصادقة:** مطلوبة (Bearer Token)  
**الأدوار المسموحة:** student فقط

**Headers:**
```
Authorization: Bearer <accessToken>
```

**URL Parameters:**
- `attemptId`: معرف المحاولة

**Body:**
```json
{
  "itemIndex": 0, // رقم السؤال في الامتحان (0-based) - مطلوب في هذا المسار
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

**⚠️ مهم للفورم:** كل امتحان "Deutschland in Leben Test" يجب أن يحتوي على **قسمين إجباريين**:
1. **قسم الولاية:** 3 أسئلة من الولاية المختارة
2. **قسم الـ300:** 30 سؤال من مجموعة الـ300 سؤال

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
        "easy": 1,    // أسئلة مع tags: ["Bayern", "easy"]
        "medium": 1,  // أسئلة مع tags: ["Bayern", "medium"]
        "hard": 1     // أسئلة مع tags: ["Bayern", "hard"]
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

**📋 هيكل الفورم المطلوب:**

```javascript
// مثال على بيانات الفورم
const formData = {
  // معلومات أساسية
  title: "Deutschland in Leben - Bayern",  // تلقائي: "Deutschland in Leben - {اسم الولاية}"
  provider: "Deutschland-in-Leben",         // ثابت
  level: "B1",                              // ثابت
  
  // القسم الأول: أسئلة الولاية (إجباري)
  sections: [
    {
      name: "Bayern Fragen",                // تلقائي: "{اسم الولاية} Fragen"
      quota: 3,                             // ثابت: 3
      tags: ["Bayern"],                     // تلقائي: [اسم الولاية المختارة]
      difficultyDistribution: {
        easy: 1,                            // اختياري: توزيع الصعوبة
        medium: 1,
        hard: 1
      }
    },
    // القسم الثاني: أسئلة الـ300 (إجباري)
    {
      name: "300 Fragen Pool",              // ثابت
      quota: 30,                            // ثابت: 30
      tags: ["300-Fragen"]                  // ثابت
    }
  ],
  
  // إعدادات عامة
  randomizeQuestions: true,                 // مفضل: true
  attemptLimit: 0,                          // 0 = غير محدود
  timeLimitMin: 60,                         // بالدقائق
  status: "published"                       // أو "draft"
}
```

**🔧 القيم الافتراضية للفورم:**
- `provider`: `"Deutschland-in-Leben"` (ثابت)
- `level`: `"B1"` (ثابت)
- `sections[0].quota`: `3` (ثابت - أسئلة الولاية)
- `sections[1].quota`: `30` (ثابت - أسئلة الـ300)
- `sections[1].name`: `"300 Fragen Pool"` (ثابت)
- `sections[1].tags`: `["300-Fragen"]` (ثابت)
- `randomizeQuestions`: `true` (مفضل)
- `attemptLimit`: `0` (غير محدود)
- `timeLimitMin`: `60` (دقيقة)

**📝 الحقول التي يملأها المستخدم:**
- `title`: اسم الامتحان (أو توليد تلقائي: "Deutschland in Leben - {الولاية}")
- `sections[0].tags[0]`: اسم الولاية (Bayern, Berlin, Baden-Württemberg, إلخ)
- `sections[0].difficultyDistribution`: توزيع الصعوبة (اختياري)
- `timeLimitMin`: مدة الامتحان بالدقائق
- `attemptLimit`: عدد المحاولات المسموحة (0 = غير محدود)
- `status`: حالة الامتحان (draft/published)

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

## 📊 أمثلة MongoDB Documents

### 1️⃣ Deutschland in Leben Test

#### مثال 1: Exam - Bayern (33 سؤال: 3 من الولاية + 30 من الـ300)

```json
{
  "_id": ObjectId("6911013cedc6fd66631427cc"),
  "title": "Deutschland in Leben - Bayern",
  "provider": "Deutschland-in-Leben",
  "level": "B1",
  "status": "published",
  "sections": [
    {
      "name": "Bayern Fragen",
      "quota": 3,
      "tags": ["Bayern"],
      "difficultyDistribution": {
        "easy": 1,
        "medium": 1,
        "hard": 1
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
  "ownerId": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T21:01:48.694Z"),
  "updatedAt": ISODate("2025-01-09T21:01:48.694Z"),
  "__v": 0
}
```

#### مثال 2: Exam - Berlin

```json
{
  "_id": ObjectId("6911013cedc6fd66631427cd"),
  "title": "Deutschland in Leben - Berlin",
  "provider": "Deutschland-in-Leben",
  "level": "B1",
  "status": "published",
  "sections": [
    {
      "name": "Berlin Fragen",
      "quota": 3,
      "tags": ["Berlin"]
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
  "ownerId": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T21:01:48.694Z"),
  "updatedAt": ISODate("2025-01-09T21:01:48.694Z")
}
```

#### مثال 3: Question - سؤال من ولاية Bayern

```json
{
  "_id": ObjectId("6912013cedc6fd66631427aa"),
  "prompt": "ما هي عاصمة ولاية بايرن؟",
  "qType": "mcq",
  "options": [
    { "text": "ميونخ", "isCorrect": true },
    { "text": "برلين", "isCorrect": false },
    { "text": "هامبورغ", "isCorrect": false },
    { "text": "فرانكفورت", "isCorrect": false }
  ],
  "provider": "Deutschland-in-Leben",
  "level": "B1",
  "tags": ["Bayern", "easy"],
  "status": "published",
  "createdBy": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T20:00:00.000Z"),
  "updatedAt": ISODate("2025-01-09T20:00:00.000Z")
}
```

#### مثال 4: Question - سؤال من الـ300 Fragen

```json
{
  "_id": ObjectId("6912013cedc6fd66631427bb"),
  "prompt": "ما هي عاصمة ألمانيا؟",
  "qType": "mcq",
  "options": [
    { "text": "برلين", "isCorrect": true },
    { "text": "ميونخ", "isCorrect": false },
    { "text": "هامبورغ", "isCorrect": false }
  ],
  "provider": "Deutschland-in-Leben",
  "level": "B1",
  "tags": ["300-Fragen", "medium"],
  "status": "published",
  "createdBy": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T20:00:00.000Z"),
  "updatedAt": ISODate("2025-01-09T20:00:00.000Z")
}
```

---

### 2️⃣ Prüfungen - telc B1

#### مثال 5: Exam - telc B1 (جميع الأقسام: Hören, Lesen, Schreiben, Sprechen)

```json
{
  "_id": ObjectId("6913013cedc6fd66631427dd"),
  "title": "telc B1 - Vollständiger Test",
  "provider": "telc",
  "level": "B1",
  "status": "published",
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
    },
    {
      "name": "Lesen - Teil 1",
      "quota": 4,
      "tags": ["Lesen", "Teil-1"]
    },
    {
      "name": "Lesen - Teil 2",
      "quota": 3,
      "tags": ["Lesen", "Teil-2"]
    },
    {
      "name": "Lesen - Teil 3",
      "quota": 4,
      "tags": ["Lesen", "Teil-3"]
    },
    {
      "name": "Lesen - Teil 4",
      "quota": 3,
      "tags": ["Lesen", "Teil-4"]
    },
    {
      "name": "Schreiben - Teil 1",
      "quota": 1,
      "tags": ["Schreiben", "Teil-1"]
    },
    {
      "name": "Schreiben - Teil 2",
      "quota": 1,
      "tags": ["Schreiben", "Teil-2"]
    },
    {
      "name": "Sprechen - Teil 1",
      "quota": 1,
      "tags": ["Sprechen", "Teil-1"]
    },
    {
      "name": "Sprechen - Teil 2",
      "quota": 1,
      "tags": ["Sprechen", "Teil-2"]
    },
    {
      "name": "Sprechen - Teil 3",
      "quota": 1,
      "tags": ["Sprechen", "Teil-3"]
    }
  ],
  "randomizeQuestions": false,
  "attemptLimit": 3,
  "timeLimitMin": 150,
  "ownerId": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T21:01:48.694Z"),
  "updatedAt": ISODate("2025-01-09T21:01:48.694Z")
}
```

#### مثال 6: Exam - telc B1 Hören فقط

```json
{
  "_id": ObjectId("6913013cedc6fd66631427ee"),
  "title": "telc B1 - Hören",
  "provider": "telc",
  "level": "B1",
  "status": "published",
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
  "ownerId": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T21:01:48.694Z"),
  "updatedAt": ISODate("2025-01-09T21:01:48.694Z")
}
```

#### مثال 7: Question - telc B1 Hören Teil 1

```json
{
  "_id": ObjectId("6914013cedc6fd66631427ff"),
  "prompt": "استمع إلى المحادثة وأجب: ما هو موضوع المحادثة؟",
  "qType": "mcq",
  "options": [
    { "text": "حجز فندق", "isCorrect": true },
    { "text": "حجز رحلة", "isCorrect": false },
    { "text": "حجز مطعم", "isCorrect": false }
  ],
  "provider": "telc",
  "section": "Hören",
  "level": "B1",
  "tags": ["Hören", "Teil-1"],
  "status": "published",
  "media": {
    "type": "audio",
    "key": "questions/telc-b1-hoeren-teil1-001.mp3",
    "mime": "audio/mpeg",
    "provider": "s3"
  },
  "createdBy": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T20:00:00.000Z"),
  "updatedAt": ISODate("2025-01-09T20:00:00.000Z")
}
```

#### مثال 8: Exam - Goethe B2

```json
{
  "_id": ObjectId("6915013cedc6fd6663142800"),
  "title": "Goethe B2 - Lesen",
  "provider": "Goethe",
  "level": "B2",
  "status": "published",
  "sections": [
    {
      "name": "Lesen - Teil 1",
      "quota": 4,
      "tags": ["Lesen", "Teil-1"]
    },
    {
      "name": "Lesen - Teil 2",
      "quota": 3,
      "tags": ["Lesen", "Teil-2"]
    },
    {
      "name": "Lesen - Teil 3",
      "quota": 4,
      "tags": ["Lesen", "Teil-3"]
    },
    {
      "name": "Lesen - Teil 4",
      "quota": 3,
      "tags": ["Lesen", "Teil-4"]
    }
  ],
  "randomizeQuestions": false,
  "attemptLimit": 3,
  "timeLimitMin": 60,
  "ownerId": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T21:01:48.694Z"),
  "updatedAt": ISODate("2025-01-09T21:01:48.694Z")
}
```

#### مثال 9: Exam - DTZ (Deutsch-Test für Zuwanderer) - B1 فقط

```json
{
  "_id": ObjectId("6916013cedc6fd6663142801"),
  "title": "DTZ - Deutsch-Test für Zuwanderer",
  "provider": "DTZ",
  "level": "B1",
  "status": "published",
  "sections": [
    {
      "name": "Hören - Teil 1",
      "quota": 5,
      "tags": ["Hören", "Teil-1"]
    },
    {
      "name": "Hören - Teil 2",
      "quota": 5,
      "tags": ["Hören", "Teil-2"]
    },
    {
      "name": "Lesen - Teil 1",
      "quota": 5,
      "tags": ["Lesen", "Teil-1"]
    },
    {
      "name": "Lesen - Teil 2",
      "quota": 5,
      "tags": ["Lesen", "Teil-2"]
    },
    {
      "name": "Schreiben",
      "quota": 1,
      "tags": ["Schreiben"]
    },
    {
      "name": "Sprechen",
      "quota": 1,
      "tags": ["Sprechen"]
    }
  ],
  "randomizeQuestions": false,
  "attemptLimit": 3,
  "timeLimitMin": 120,
  "ownerId": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T21:01:48.694Z"),
  "updatedAt": ISODate("2025-01-09T21:01:48.694Z")
}
```

---

### 3️⃣ Grammatik (القواعد النحوية)

#### مثال 10: Exam - Grammatik B1

```json
{
  "_id": ObjectId("6917013cedc6fd6663142802"),
  "title": "Grammatik B1 - Präsens und Perfekt",
  "provider": "Grammatik",
  "level": "B1",
  "status": "published",
  "sections": [
    {
      "name": "Präsens",
      "quota": 10,
      "tags": ["Präsens"]
    },
    {
      "name": "Perfekt",
      "quota": 10,
      "tags": ["Perfekt"]
    },
    {
      "name": "Präteritum",
      "quota": 10,
      "tags": ["Präteritum"]
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 0,
  "timeLimitMin": 45,
  "ownerId": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T21:01:48.694Z"),
  "updatedAt": ISODate("2025-01-09T21:01:48.694Z")
}
```

#### مثال 11: Question - Grammatik B1 Präsens

```json
{
  "_id": ObjectId("6918013cedc6fd6663142803"),
  "prompt": "Ergänzen Sie: Ich ___ jeden Tag Deutsch.",
  "qType": "fill",
  "fillExact": "lerne",
  "regexList": ["lerne", "lernt", "lernen"],
  "provider": "Grammatik",
  "level": "B1",
  "tags": ["Präsens", "Verbkonjugation"],
  "status": "published",
  "createdBy": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T20:00:00.000Z"),
  "updatedAt": ISODate("2025-01-09T20:00:00.000Z")
}
```

#### مثال 12: Question - Grammatik B1 Perfekt

```json
{
  "_id": ObjectId("6918013cedc6fd6663142804"),
  "prompt": "Ergänzen Sie: Ich ___ gestern nach Hause ___.",
  "qType": "fill",
  "fillExact": "bin gegangen",
  "regexList": ["bin gegangen", "ist gegangen", "sind gegangen"],
  "provider": "Grammatik",
  "level": "B1",
  "tags": ["Perfekt", "Hilfsverb", "Partizip II"],
  "status": "published",
  "createdBy": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T20:00:00.000Z"),
  "updatedAt": ISODate("2025-01-09T20:00:00.000Z")
}
```

#### مثال 13: Exam - Grammatik A1 - Satzbau

```json
{
  "_id": ObjectId("6919013cedc6fd6663142805"),
  "title": "Grammatik A1 - Satzbau",
  "provider": "Grammatik",
  "level": "A1",
  "status": "published",
  "sections": [
    {
      "name": "Satzbau - Grundlagen",
      "quota": 15,
      "tags": ["Satzbau"]
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 0,
  "timeLimitMin": 30,
  "ownerId": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T21:01:48.694Z"),
  "updatedAt": ISODate("2025-01-09T21:01:48.694Z")
}
```

---

### 4️⃣ Wortschatz (المفردات)

#### مثال 14: Exam - Wortschatz A1 - Leben

```json
{
  "_id": ObjectId("6920013cedc6fd6663142806"),
  "title": "Wortschatz A1 - Leben",
  "provider": "Wortschatz",
  "level": "A1",
  "status": "published",
  "sections": [
    {
      "name": "Leben - Grundlagen",
      "quota": 20,
      "tags": ["Leben", "Wohnen"]
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 0,
  "timeLimitMin": 30,
  "ownerId": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T21:01:48.694Z"),
  "updatedAt": ISODate("2025-01-09T21:01:48.694Z")
}
```

#### مثال 15: Question - Wortschatz A1 Leben

```json
{
  "_id": ObjectId("6921013cedc6fd6663142807"),
  "prompt": "ما معنى كلمة 'Haus'؟",
  "qType": "mcq",
  "options": [
    { "text": "بيت", "isCorrect": true },
    { "text": "سيارة", "isCorrect": false },
    { "text": "كتاب", "isCorrect": false },
    { "text": "شجرة", "isCorrect": false }
  ],
  "provider": "Wortschatz",
  "level": "A1",
  "tags": ["Leben", "Wohnen"],
  "status": "published",
  "createdBy": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T20:00:00.000Z"),
  "updatedAt": ISODate("2025-01-09T20:00:00.000Z")
}
```

#### مثال 16: Exam - Wortschatz B1 - Arbeit

```json
{
  "_id": ObjectId("6922013cedc6fd6663142808"),
  "title": "Wortschatz B1 - Arbeit",
  "provider": "Wortschatz",
  "level": "B1",
  "status": "published",
  "sections": [
    {
      "name": "Arbeit - Berufe",
      "quota": 10,
      "tags": ["Arbeit", "Berufe"]
    },
    {
      "name": "Arbeit - Büro",
      "quota": 10,
      "tags": ["Arbeit", "Büro"]
    },
    {
      "name": "Arbeit - Kommunikation",
      "quota": 10,
      "tags": ["Arbeit", "Kommunikation"]
    }
  ],
  "randomizeQuestions": true,
  "attemptLimit": 0,
  "timeLimitMin": 45,
  "ownerId": ObjectId("6910e7918d98cac22e8c8c4c"),
  "createdAt": ISODate("2025-01-09T21:01:48.694Z"),
  "updatedAt": ISODate("2025-01-09T21:01:48.694Z")
}
```

---

## 📋 ملخص الهيكل

### Deutschland in Leben Test
- **18 نافذة:** 300 Fragen + Tests + 16 ولاية
- **كل اختبار:** 33 سؤال (3 من الولاية + 30 من الـ300)
- **Tags للأسئلة:** `["Bayern"]` للولاية، `["300-Fragen"]` للـ300

### Prüfungen (6 مزودين)
- **telc, Goethe, ÖSD, ECL, DTB, DTZ**
- **كل مزود:** مستويات مختلفة (A1-C1 حسب المزود)
- **كل مستوى:** 4 أقسام (Hören, Lesen, Schreiben, Sprechen)
- **كل قسم:** عدة Teil (مثل: Teil-1, Teil-2, Teil-3)
- **Tags:** `["Hören", "Teil-1"]` أو `["Lesen", "Teil-2"]`

### Grammatik
- **مستويات:** A1, A2, B1, B2, C1
- **مواضيع:** Präsens, Perfekt, Präteritum, Satzbau, Nebensätze, Passiv, Konjunktiv, Modalverben, Konjunktionen
- **Tags:** `["Präsens"]`, `["Perfekt", "Hilfsverb"]`, إلخ

### Wortschatz
- **مستويات:** A1, A2, B1, B2, C1
- **مجالات:** Leben, Arbeit, Reisen, Familie, Gesundheit, Umwelt, Politik, Gesellschaft
- **Tags:** `["Leben", "Wohnen"]`, `["Arbeit", "Berufe"]`, إلخ

---

**آخر تحديث:** 2025

