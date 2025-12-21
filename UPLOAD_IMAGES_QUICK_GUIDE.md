# دليل سريع لرفع الصور على السيرفر

## الطريقة السريعة (Postman)

### الخطوة 1: الحصول على JWT Token

1. افتح Postman
2. `POST https://api.deutsch-tests.com/auth/login`
3. Body (JSON):
```json
{
  "email": "your_email@example.com",
  "password": "your_password"
}
```
4. انسخ الـ `accessToken` من الـ response

### الخطوة 2: رفع الصور

#### لرفع صور الأسئلة العامة:

1. **Endpoint**: `POST https://api.deutsch-tests.com/uploads/image`
2. **Headers**:
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`
3. **Body**: 
   - Type: `form-data`
   - Key: `file` (اختر Type: `File`)
   - Value: اختر الملف من `src/uploads/images/questions/`

#### لرفع صور الولايات:

1. **Endpoint**: `POST https://api.deutsch-tests.com/uploads/image?folder=ولايات`
2. **Headers**:
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`
3. **Body**: 
   - Type: `form-data`
   - Key: `file` (اختر Type: `File`)
   - Value: اختر الملف من `src/uploads/images/ولايات/`

### الملفات المطلوبة:

**صور الأسئلة العامة** (20 ملف):
- `src/uploads/images/questions/سؤال21عام.jpeg` + 3 صور إضافية
- `src/uploads/images/questions/سؤال55عام.jpeg`
- `src/uploads/images/questions/سؤال70عام.jpeg`
- `src/uploads/images/questions/سؤال130عام.jpeg`
- `src/uploads/images/questions/سؤال176عام.jpeg`
- `src/uploads/images/questions/سؤال181عام.jpeg`
- `src/uploads/images/questions/سؤال187عام.jpeg`
- `src/uploads/images/questions/سؤال209عام.jpeg1.jpeg` + 3 صور إضافية
- `src/uploads/images/questions/سؤال216عام.jpeg`
- `src/uploads/images/questions/1سؤال226عام.jpeg` + 3 صور إضافية
- `src/uploads/images/questions/سؤال235عام.jpeg`

**صور الولايات** (100 ملف):
- كل ولاية: 4 صور للسؤال الأول + 1 صورة للسؤال الثامن
- المجموع: 16 ولاية × 5 صور = 80 ملف
- الموقع: `src/uploads/images/ولايات/`

## ملاحظة مهمة

⚠️ **على Railway، الملفات المحلية تضيع بعد redeploy!**

الحل الدائم: إعداد S3/R2 في Railway environment variables:
- `S3_REGION`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `S3_BUCKET`

