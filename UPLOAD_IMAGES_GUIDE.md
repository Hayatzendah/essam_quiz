# دليل رفع الصور على السيرفر

## المشكلة
الصور موجودة محلياً فقط (`F:\quiz-backend\uploads\images\questions\`) لكن غير موجودة على السيرفر (`/app/uploads/images/questions/`).

## الحل

### ✅ الخطوة 1: رفع الصور على السيرفر

#### الطريقة A: استخدام السكريبت (موصى به)

1. **الحصول على JWT Token:**
   ```bash
   # Login كـ teacher/admin
   POST https://api.deutsch-tests.com/auth/login
   {
     "email": "teacher@deutsch-tests.com",
     "password": "your-password"
   }
   # انسخ الـ token من الـ response
   ```

2. **تشغيل السكريبت:**
   ```bash
   # Set environment variables
   export JWT_TOKEN="your-jwt-token-here"
   export API_BASE_URL="https://api.deutsch-tests.com"
   
   # Run the script
   npm run upload-images-to-server
   ```

#### الطريقة B: رفع يدوي عبر Postman

1. **Endpoint:** `POST https://api.deutsch-tests.com/uploads/image`
2. **Headers:**
   - `Authorization: Bearer YOUR_JWT_TOKEN`
3. **Body → form-data:**
   - Key: `file` (type: File)
   - Value: اختر الصورة من جهازك
4. **Send**

#### الطريقة C: رفع يدوي عبر cURL

```bash
curl -X POST https://api.deutsch-tests.com/uploads/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@uploads/images/questions/سؤال130عام.jpeg"
```

### ✅ الخطوة 2: التحقق من الصور

بعد رفع الصور، يجب أن تكون متاحة على:
```
https://api.deutsch-tests.com/uploads/images/questions/سؤال130عام.jpeg
```

### ✅ الخطوة 3: تحديث MongoDB

بعد رفع الصور، قم بتحديث URLs في MongoDB:

```bash
# Set PUBLIC_BASE_URL
export PUBLIC_BASE_URL="https://api.deutsch-tests.com"

# Update MongoDB with correct URLs
npm run add-images-to-mongodb
```

## ملاحظات مهمة

### ⚠️ Railway/Render/Heroku (Ephemeral Filesystem)

**مشكلة:** في Railway/Render/Heroku، الـ filesystem **ephemeral** (مؤقت):
- ✅ ترفع صورة → تشتغل
- ❌ بعد Redeploy/Reboot → تختفي

**الحل النهائي (للمستقبل):**
- استخدام **S3 / Cloudinary / Supabase Storage**
- تخزين URLs في MongoDB
- الصور تبقى دائمة حتى بعد Redeploy

### ✅ الإعدادات الحالية

1. **التخزين:** `./uploads/images/questions` (مطلق: `/app/uploads/images/questions/`)
2. **Static Serving:** `process.cwd() + '/uploads'` → `/uploads`
3. **URLs:** `PUBLIC_BASE_URL/uploads/images/questions/...`

### 📋 قائمة الصور المطلوبة

```
سؤال21عام.jpeg
سؤال21عام.jpeg2.jpeg
سؤال21عام.jpeg3.jpeg
سؤال21عام.jpeg4.jpeg
سؤال55عام.jpeg
سؤال70عام.jpeg
سؤال130عام.jpeg
سؤال176عام.jpeg
سؤال181عام.jpeg
سؤال187عام.jpeg
سؤال209عام.jpeg1.jpeg
سؤال209عام.jpeg2.jpeg
سؤال209عام.jpeg3.jpeg
سؤال209عام.jpeg4.jpeg
سؤال216عام.jpeg
1سؤال226عام.jpeg
سؤال226عام.jpeg2.jpeg
سؤال226عام.jpeg3.jpeg
سؤال226عام.jpeg4.jpeg
سؤال235عام.jpeg
```

## اختبارات

### 1. التحقق من وجود المجلدات على السيرفر

```bash
# في Railway Shell أو SSH
ls -la /app/uploads/images/questions/
```

### 2. اختبار رفع صورة جديدة

```bash
# Postman
POST https://api.deutsch-tests.com/uploads/image
# مع JWT token و file
```

### 3. اختبار الوصول للصورة

افتح في المتصفح:
```
https://api.deutsch-tests.com/uploads/images/questions/سؤال130عام.jpeg
```

إذا ظهرت الصورة → ✅ نجح
إذا ظهر 404 → ❌ الصورة غير موجودة على السيرفر






