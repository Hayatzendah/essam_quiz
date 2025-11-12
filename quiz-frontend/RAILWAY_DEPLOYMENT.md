# 🚂 دليل نشر الفرونت إند على Railway

دليل شامل لنشر الفرونت إند على Railway (نفس منصة الباك إند).

---

## 📋 متطلبات ما قبل النشر

- ✅ حساب Railway (https://railway.app)
- ✅ GitHub repository للمشروع
- ✅ الباك إند منشور على Railway

---

## 🚀 خطوات النشر على Railway

### 1. ربط المشروع بـ Railway

1. اذهب إلى [Railway Dashboard](https://railway.app/dashboard)
2. اضغط على **"New Project"**
3. اختر **"Deploy from GitHub repo"**
4. اربط المستودع الخاص بك
5. اختر مجلد `quiz-frontend` كـ **Root Directory**

---

### 2. إعداد Environment Variables

في Railway Project Settings → **Variables** tab، أضف:

```bash
# API Base URL (مهم جداً!)
VITE_API_URL=https://api.deutsch-tests.com

# أو إذا كان الباك إند على Railway:
# VITE_API_URL=https://your-backend.railway.app
```

**ملاحظة مهمة:** Railway يحتاج `VITE_` prefix للـ environment variables في Vite.

---

### 3. إعداد Build & Deploy

Railway سيتعرف تلقائياً على `railway.json`:

- **Build Command:** `npm ci && npm run build`
- **Start Command:** `npx serve -s dist -l $PORT`
- **Root Directory:** `quiz-frontend` (إذا كان المشروع في مجلد فرعي)

---

### 4. إعداد Custom Domain

1. اذهب إلى **Settings** → **Networking**
2. اضغط **"Generate Domain"** للحصول على رابط Railway
   - مثال: `quiz-frontend-production.up.railway.app`
3. أو أضف دومين مخصص:
   - اضغط **"Custom Domain"**
   - أضف دومينك (مثل: `deutsch-tests.com` أو `www.deutsch-tests.com`)
   - Railway سيوفر HTTPS تلقائياً

---

### 5. تحديث CORS في الباك إند

**مهم جداً:** يجب تحديث CORS في الباك إند ليقبل الطلبات من دومين الفرونت إند.

في Railway → Backend Project → **Variables**:

```bash
WEB_APP_ORIGIN=https://deutsch-tests.com,https://www.deutsch-tests.com
```

أو إذا كنت تستخدم Railway domain:
```bash
WEB_APP_ORIGIN=https://quiz-frontend-production.up.railway.app
```

---

## ✅ Checklist قبل النشر

- [ ] تم رفع الكود على GitHub
- [ ] تم ربط المشروع في Railway
- [ ] تم إضافة `VITE_API_URL` في Environment Variables
- [ ] تم تحديث `WEB_APP_ORIGIN` في الباك إند
- [ ] تم ربط الدومين المخصص (اختياري)

---

## 🧪 اختبار بعد النشر

### 1. افتح الرابط

افتح رابط Railway أو الدومين المخصص:
- `https://quiz-frontend-production.up.railway.app`
- أو `https://deutsch-tests.com`

### 2. اختبر Login/Register

- جرب تسجيل حساب جديد
- جرب تسجيل الدخول
- تأكد من أن الطلبات تصل للباك إند

### 3. تحقق من Console

افتح Developer Tools (F12) → Console
- تأكد من عدم وجود أخطاء CORS
- تأكد من أن API calls تنجح

---

## 🐛 Troubleshooting

### المشكلة: CORS errors

**الحل:**
1. تأكد من أن `WEB_APP_ORIGIN` في الباك إند يحتوي على رابط الفرونت إند
2. تأكد من أن الرابط يبدأ بـ `https://`
3. أعد تشغيل الباك إند بعد تحديث CORS

### المشكلة: 404 عند فتح صفحات

**الحل:**
- تأكد من أن `serve` package موجود في `package.json`
- تأكد من أن `railway.json` موجود وصحيح

### المشكلة: API calls تفشل

**الحل:**
1. تأكد من أن `VITE_API_URL` مضبوط بشكل صحيح
2. تأكد من أن الباك إند يعمل
3. تحقق من Network tab في Developer Tools

---

## 📝 ملاحظات مهمة

1. **Environment Variables:**
   - في Vite، يجب أن تبدأ بـ `VITE_` لتكون متاحة في الكود
   - Railway يحتاج إعادة build بعد تغيير Environment Variables

2. **Build:**
   - Railway سيبني المشروع تلقائياً عند كل push
   - يمكنك رؤية Build logs في Railway Dashboard

3. **HTTPS:**
   - Railway يوفر HTTPS تلقائياً
   - لا حاجة لإعداد SSL certificates

---

## 🔗 روابط مفيدة

- [Railway Documentation](https://docs.railway.app)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Railway Custom Domains](https://docs.railway.app/deploy/custom-domains)

---

**آخر تحديث:** 2024

