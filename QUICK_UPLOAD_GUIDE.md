# دليل سريع لرفع الصور على السيرفر 🚀

## المشكلة الحالية
الصور موجودة محلياً لكن غير موجودة على السيرفر → خطأ 404

## الحل السريع (Postman)

### الخطوة 1: الحصول على JWT Token

**Request:**
```
POST https://api.deutsch-tests.com/auth/login
Content-Type: application/json

{
  "email": "teacher@deutsch-tests.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  ...
}
```
**انسخ الـ `accessToken`**

---

### الخطوة 2: رفع الصور واحدة تلو الأخرى

**Request:**
```
POST https://api.deutsch-tests.com/uploads/image
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
```

**Body → form-data:**
- Key: `file` (اختر type: **File**)
- Value: اختر الصورة من جهازك (مثلاً: `سؤال21عام.jpeg`)

**Send** → يجب أن ترى:
```json
{
  "imageUrl": "https://api.deutsch-tests.com/uploads/images/questions/سؤال21عام.jpeg",
  "filename": "سؤال21عام.jpeg",
  "mime": "image/jpeg"
}
```

---

### الخطوة 3: كرر للصور المتبقية

**قائمة الصور (20 صورة):**
1. سؤال21عام.jpeg
2. سؤال21عام.jpeg2.jpeg
3. سؤال21عام.jpeg3.jpeg
4. سؤال21عام.jpeg4.jpeg
5. سؤال55عام.jpeg
6. سؤال70عام.jpeg
7. سؤال130عام.jpeg
8. سؤال176عام.jpeg
9. سؤال181عام.jpeg
10. سؤال187عام.jpeg
11. سؤال209عام.jpeg1.jpeg
12. سؤال209عام.jpeg2.jpeg
13. سؤال209عام.jpeg3.jpeg
14. سؤال209عام.jpeg4.jpeg
15. سؤال216عام.jpeg
16. 1سؤال226عام.jpeg
17. سؤال226عام.jpeg2.jpeg
18. سؤال226عام.jpeg3.jpeg
19. سؤال226عام.jpeg4.jpeg
20. سؤال235عام.jpeg

---

### الخطوة 4: التحقق من الصور

افتح في المتصفح:
```
https://api.deutsch-tests.com/uploads/images/questions/سؤال21عام.jpeg
```

إذا ظهرت الصورة → ✅ نجح!

---

## طريقة بديلة: cURL

```bash
# Set your token
TOKEN="your-jwt-token-here"

# Upload one image
curl -X POST https://api.deutsch-tests.com/uploads/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@uploads/images/questions/سؤال21عام.jpeg"
```

---

## بعد رفع جميع الصور

### تحديث MongoDB مع URLs الصحيحة:

```bash
export PUBLIC_BASE_URL="https://api.deutsch-tests.com"
npm run add-images-to-mongodb
```

---

## ملاحظات مهمة ⚠️

1. **Railway/Render/Heroku:** الـ filesystem مؤقت (ephemeral)
   - بعد Redeploy قد تختفي الصور
   - الحل النهائي: استخدام S3/Cloudinary

2. **التحقق:** تأكد من أن الصور موجودة على السيرفر قبل تحديث MongoDB

3. **الأسماء:** يجب أن تطابق أسماء الملفات في MongoDB تماماً

---

## نصائح

- استخدم Postman Collection لحفظ الطلبات
- يمكنك رفع عدة صور في نفس الوقت (لكن Postman يدعم واحدة فقط)
- تأكد من أن JWT Token صالح (غير منتهي)




