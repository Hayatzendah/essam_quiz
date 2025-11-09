# 🔧 دليل استكشاف الأخطاء - Troubleshooting Guide

## 📝 ملخص سريع - Quick Summary

هذا الدليل يشرح كيفية حل المشاكل الشائعة في تطبيق Quiz Backend عند النشر على Railway.

### المشاكل الأكثر شيوعاً:

1. **مشكلة JWT Token منتهي الصلاحية** ⏰
   - **السبب:** Access Token ينتهي بعد 15 دقيقة (هذا طبيعي للأمان)
   - **الحل:** استخدم Refresh Token للحصول على Access Token جديد عبر `/auth/refresh`
   - **الوقاية:** تأكد أن Frontend يستخدم Refresh Token تلقائياً عند انتهاء Access Token

2. **مشكلة متغيرات البيئة** 🔐
   - **السبب:** متغيرات البيئة المطلوبة غير موجودة في Railway
   - **الحل:** أضف `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` في Railway → Variables

3. **مشكلة اتصال MongoDB** 🗄️
   - **السبب:** MongoDB Atlas لا يسمح بالاتصال من Railway
   - **الحل:** أضف `0.0.0.0/0` في MongoDB Atlas → Network Access

---

## مشكلة: Application failed to respond على Railway

إذا كان التطبيق لا يستجيب على Railway، اتبع الخطوات التالية:

### 1. ✅ تحقق من متغيرات البيئة (Environment Variables)

اذهب إلى Railway → Variables tab وتأكد من وجود جميع المتغيرات المطلوبة:

#### المتغيرات الإجبارية (Required):
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-db?retryWrites=true&w=majority
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
```

#### المتغيرات الاختيارية (Optional):
```
PORT=4000  (Railway يحددها تلقائياً، لكن يمكنك إضافتها)
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
```

**⚠️ مهم:** بدون `MONGO_URI`, `JWT_ACCESS_SECRET`, و `JWT_REFRESH_SECRET` التطبيق لن يعمل!

---

### 2. 📋 تحقق من سجلات النشر (Deploy Logs)

1. اذهب إلى Railway → Deployments
2. اضغط على آخر deployment
3. افحص الـ logs للبحث عن أخطاء مثل:
   - `Missing required environment variables`
   - `MongoDB connection error`
   - `Failed to start application`

---

### 3. 🔌 تحقق من اتصال MongoDB

#### إذا كنت تستخدم MongoDB Atlas:
1. اذهب إلى [MongoDB Atlas](https://cloud.mongodb.com)
2. اضغط على **Network Access**
3. تأكد من وجود `0.0.0.0/0` في القائمة (للسماح من أي IP)
4. إذا لم يكن موجوداً، اضغط **Add IP Address** → **Allow Access from Anywhere**

#### إذا كنت تستخدم MongoDB على Railway:
1. تأكد من أن MongoDB service يعمل
2. انسخ `MONGO_URL` من MongoDB service → Database → Credentials
3. أضفه في Variables كـ `MONGO_URI`

---

### 4. 🔄 إعادة النشر (Redeploy)

بعد إضافة/تعديل متغيرات البيئة:
1. اذهب إلى Railway → Deployments
2. اضغط على **Redeploy** أو **Deploy Latest**
3. انتظر حتى يكتمل النشر
4. تحقق من الـ logs للتأكد من نجاح البدء

---

### 5. 🧪 اختبار Health Endpoint

بعد النشر، اختبر الـ endpoint:
```
GET https://api.deutsch-tests.com/health
```

يجب أن تحصل على:
```json
{
  "ok": true,
  "time": "2025-01-XX..."
}
```

---

### 6. 🐛 أخطاء شائعة وحلولها

#### خطأ: "Missing required environment variables"
**الحل:** أضف جميع المتغيرات المطلوبة في Railway → Variables

#### خطأ: "MongoDB connection error"
**الحل:** 
- تحقق من `MONGO_URI` صحيح
- تأكد من Network Access في MongoDB Atlas
- تحقق من username/password صحيحين

#### خطأ: "Application failed to respond"
**الحل:**
- تحقق من Deploy Logs
- تأكد من أن التطبيق بدأ بنجاح (ابحث عن "Application is running on")
- تحقق من أن PORT صحيح

#### خطأ: "Cannot find module"
**الحل:**
- تأكد من أن `npm run build` يعمل بنجاح
- تحقق من أن جميع dependencies موجودة في `package.json`

#### خطأ: "jwt expired" أو "Authentication failed: jwt expired"
**الحل:**
- هذا **سلوك طبيعي ومتوقع** - توكنات الوصول (Access Tokens) تنتهي صلاحيتها بعد 15 دقيقة افتراضياً
- عندما ينتهي توكن الوصول، يجب استخدام **Refresh Token** للحصول على توكن جديد
- استخدم endpoint `/auth/refresh` مع Refresh Token للحصول على Access Token جديد

**مثال:**
```bash
POST /auth/refresh
Body: { "refreshToken": "your-refresh-token-here" }
Response: { "accessToken": "new-access-token", "refreshToken": "new-refresh-token" }
```

**لتغيير مدة صلاحية التوكنات:**
أضف متغيرات البيئة التالية في Railway:
```
JWT_ACCESS_EXPIRES_IN=1h    # مدة صلاحية Access Token (افتراضي: 15m)
JWT_REFRESH_EXPIRES_IN=30d  # مدة صلاحية Refresh Token (افتراضي: 7d)
```

**ملاحظة:** في السجلات (Logs)، قد ترى:
```
[WARN] Authentication failed: jwt expired
[ERROR] POST /questions - 401 - Authentication failed: jwt expired
```
هذا يعني أن المستخدم حاول استخدام توكن منتهي الصلاحية. يجب على Frontend استخدام Refresh Token للحصول على توكن جديد.

---

### 7. 📞 الحصول على المساعدة

إذا استمرت المشكلة:
1. افحص Deploy Logs بالتفصيل
2. انسخ رسالة الخطأ الكاملة
3. تحقق من أن جميع الخطوات أعلاه تمت بشكل صحيح

---

## ✅ Checklist قبل النشر

- [ ] جميع متغيرات البيئة المطلوبة موجودة في Railway
- [ ] `MONGO_URI` صحيح ويحتوي على اسم قاعدة البيانات
- [ ] MongoDB Network Access يسمح بالاتصال من Railway (0.0.0.0/0)
- [ ] `JWT_ACCESS_SECRET` و `JWT_REFRESH_SECRET` موجودان
- [ ] (اختياري) `JWT_ACCESS_EXPIRES_IN` و `JWT_REFRESH_EXPIRES_IN` مضبوطان إذا أردت تغيير المدة الافتراضية
- [ ] التطبيق يبني بنجاح (`npm run build`)
- [ ] Deploy Logs تظهر "Application is running on"
- [ ] Frontend يستخدم Refresh Token عند انتهاء صلاحية Access Token



