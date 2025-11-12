# 🚀 دليل نشر الفرونت إند

دليل شامل لنشر الفرونت إند على دومين حقيقي.

---

## 📋 خيارات النشر

### 1. Vercel (موصى به) ⭐

#### الخطوات:

1. **تثبيت Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **تسجيل الدخول:**
   ```bash
   vercel login
   ```

3. **النشر:**
   ```bash
   cd quiz-frontend
   vercel
   ```

4. **إضافة دومين مخصص:**
   - اذهب إلى [Vercel Dashboard](https://vercel.com/dashboard)
   - اختر المشروع
   - Settings → Domains
   - أضف دومينك (مثل: `deutsch-tests.com`)

5. **إعداد Environment Variables:**
   - Settings → Environment Variables
   - أضف: `VITE_API_URL=https://api.deutsch-tests.com`

---

### 2. Netlify

#### الخطوات:

1. **تثبيت Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **تسجيل الدخول:**
   ```bash
   netlify login
   ```

3. **النشر:**
   ```bash
   cd quiz-frontend
   netlify deploy --prod
   ```

4. **إضافة دومين مخصص:**
   - اذهب إلى [Netlify Dashboard](https://app.netlify.com)
   - Domain settings → Add custom domain

5. **إعداد Environment Variables:**
   - Site settings → Environment variables
   - أضف: `VITE_API_URL=https://api.deutsch-tests.com`

---

### 3. Railway

#### الخطوات:

1. **إنشاء ملف `railway.json`:**
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm run build"
     },
     "deploy": {
       "startCommand": "npx serve -s dist -l 3000",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. **النشر على Railway:**
   - اربط المشروع من GitHub
   - أضف Environment Variable: `VITE_API_URL=https://api.deutsch-tests.com`
   - Railway سيبني ويشغل المشروع تلقائياً

---

## ⚙️ إعدادات Environment Variables

قبل النشر، تأكد من إضافة:

```env
VITE_API_URL=https://api.deutsch-tests.com
```

---

## 🔧 Build Command

```bash
npm run build
```

سيتم إنشاء مجلد `dist` يحتوي على الملفات الجاهزة للنشر.

---

## 📝 ملاحظات مهمة

1. **CORS:** تأكد من أن الباك إند مضبوط على قبول الطلبات من دومين الفرونت إند:
   ```env
   WEB_APP_ORIGIN=https://deutsch-tests.com
   ```

2. **HTTPS:** تأكد من استخدام HTTPS في الإنتاج.

3. **Environment Variables:** يجب إضافة `VITE_API_URL` في منصة النشر.

---

## ✅ Checklist قبل النشر

- [ ] تم بناء المشروع بنجاح (`npm run build`)
- [ ] تم إضافة `VITE_API_URL` في Environment Variables
- [ ] تم إعداد CORS في الباك إند
- [ ] تم ربط الدومين المخصص
- [ ] تم تفعيل HTTPS

---

## 🔗 روابط مفيدة

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Railway Documentation](https://docs.railway.app)

