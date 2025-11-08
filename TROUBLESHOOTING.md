# 🔧 دليل استكشاف الأخطاء - Troubleshooting Guide

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
- [ ] التطبيق يبني بنجاح (`npm run build`)
- [ ] Deploy Logs تظهر "Application is running on"

