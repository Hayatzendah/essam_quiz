# Environment Variables Required

## Required Variables (يجب إضافتها في Railway)

### 1. MongoDB Connection
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-db?retryWrites=true&w=majority
```
- احصل على رابط الاتصال من [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) أو مزود MongoDB الخاص بك

### 2. JWT Secrets
```
JWT_ACCESS_SECRET=your-super-secret-access-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
```
- يمكنك توليد مفاتيح آمنة باستخدام: `openssl rand -base64 32`

### 3. Optional Variables (اختيارية - لها قيم افتراضية)
```
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

## كيفية إضافة المتغيرات في Railway:

1. اذهب إلى مشروعك في Railway
2. اضغط على **Variables** tab
3. أضف كل متغير من المتغيرات المطلوبة أعلاه
4. احفظ التغييرات

**ملاحظة:** Railway سيحدد `PORT` تلقائياً، لكن يمكنك إضافته يدوياً إذا أردت.

