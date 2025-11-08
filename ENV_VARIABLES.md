# Environment Variables Required

## Required Variables (يجب إضافتها في Railway)

### 1. MongoDB Connection

لديك خياران لاستخدام MongoDB:

#### الخيار 1: MongoDB على Railway (موصى به - أسهل) ✅

إذا كان لديك MongoDB service على Railway (كما يظهر في الصورة):

1. اذهب إلى MongoDB service في Railway
2. اضغط على تبويب **Database** → **Credentials**
3. انسخ **MONGO_URL** أو **Connection String**
4. أضفه في Variables كـ `MONGO_URI`

**مثال:**
```
MONGO_URI=mongodb://mongo:27017/quiz-db
```
أو
```
MONGO_URI=mongodb://username:password@mongo.railway.internal:27017/quiz-db
```

**✅ المميزات:**
- لا تحتاج إعداد Network Access
- الاتصال أسرع (داخل نفس الشبكة)
- أسهل في الإعداد

---

#### الخيار 2: MongoDB Atlas (من cloud.mongodb.com)

إذا كنت تستخدم MongoDB Atlas:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/quiz-db?retryWrites=true&w=majority
```

**📝 مثال على MONGO_URI الصحيح:**
```
mongodb+srv://essamhammamlmu_db_user:zgCKwKYkXUkauilv@cluster0.z9puqka.mongodb.net/quiz-db?retryWrites=true&w=majority
```

**⚠️ ملاحظة مهمة:**
- يجب إضافة اسم قاعدة البيانات بعد الـ `/` وقبل الـ `?`
- في المثال أعلاه، اسم قاعدة البيانات هو: `quiz-db`
- يمكنك استخدام أي اسم تريده مثل: `quiz-db`, `deutsch-tests-db`, `deutsch-quiz-db`
- بدون اسم قاعدة البيانات، التطبيق قد لا يعمل بشكل صحيح!

**⚠️ مهم جداً - MongoDB Atlas Network Access:**
- يجب السماح بالاتصال من Railway في MongoDB Atlas
- اذهب إلى **Network Access** في MongoDB Atlas
- اضغط على **Add IP Address**
- اختر **Allow Access from Anywhere** (0.0.0.0/0) للسماح من أي IP
- أو أضف Railway IP addresses يدوياً
- بدون هذا الإعداد، التطبيق لن يستطيع الاتصال بقاعدة البيانات!

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

