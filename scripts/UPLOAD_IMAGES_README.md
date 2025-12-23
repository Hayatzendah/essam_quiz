# رفع الصور على السيرفر

## المتطلبات

1. تثبيت الحزم المطلوبة:
```bash
npm install form-data axios
```

2. الحصول على JWT Token:
   - سجل دخول إلى API
   - انسخ الـ token من الـ response

## الاستخدام

### طريقة 1: استخدام السكريبت

```bash
# تعيين JWT token
export JWT_TOKEN=your_jwt_token_here

# تشغيل السكريبت
npx ts-node scripts/upload-images-to-server.ts
```

أو في Windows PowerShell:
```powershell
$env:JWT_TOKEN="your_jwt_token_here"
npx ts-node scripts/upload-images-to-server.ts
```

### طريقة 2: رفع يدوي عبر Postman

1. **لرفع صور الأسئلة العامة:**
   - Endpoint: `POST https://api.deutsch-tests.com/uploads/image`
   - Body: `form-data`
   - Key: `file` (Type: File)
   - Value: اختر الملف

2. **لرفع صور الولايات:**
   - Endpoint: `POST https://api.deutsch-tests.com/uploads/image?folder=ولايات`
   - Body: `form-data`
   - Key: `file` (Type: File)
   - Value: اختر الملف

## ملاحظات مهمة

⚠️ **تحذير**: على Railway، الملفات المحلية تضيع بعد redeploy. الحل الأفضل هو استخدام S3/R2.

✅ **الحل الموصى به**: إعداد S3/R2 في Railway environment variables:
- `S3_REGION`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`



